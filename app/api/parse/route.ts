import { NextRequest, NextResponse, after } from "next/server"
import { supabase } from "@/lib/supabase"
import { scrapeUrl } from "@/lib/scrapfly"
import { parseTrustpilotPage } from "@/lib/parser"

export const maxDuration = 300 // 5 min for Vercel Pro

interface ParseRequestBody {
    urls: string[]
}

function normalizeTrustpilotUrl(raw: string): string | null {
    let url = raw.trim()
    if (!url) return null

    // If user pasted just domain like "example.com" -> build trustpilot URL
    if (!url.includes("trustpilot.com")) {
        // Remove protocol if present
        url = url.replace(/^https?:\/\//, "").replace(/^www\./, "")
        url = `https://www.trustpilot.com/review/${url}`
    }

    // Ensure protocol
    if (!url.startsWith("http")) {
        url = `https://${url}`
    }

    try {
        const parsed = new URL(url)
        // Add languages=all for comprehensive count
        if (!parsed.searchParams.has("languages")) {
            parsed.searchParams.set("languages", "all")
        }
        return parsed.toString()
    } catch {
        return null
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: ParseRequestBody = await request.json()

        if (!body.urls || !Array.isArray(body.urls) || body.urls.length === 0) {
            return NextResponse.json(
                { error: "Укажите массив URL-ов" },
                { status: 400 }
            )
        }

        // Normalize and validate URLs
        const normalizedUrls = body.urls
            .map((u) => ({ original: u.trim(), normalized: normalizeTrustpilotUrl(u) }))
            .filter((u) => u.original.length > 0)

        // Create job
        const { data: job, error: jobError } = await supabase
            .from("parse_jobs")
            .insert({
                status: "running",
                total_urls: normalizedUrls.length,
            })
            .select()
            .single()

        if (jobError || !job) {
            console.error("[Parse] Job creation error:", jobError)
            return NextResponse.json(
                { error: "Не удалось создать задачу" },
                { status: 500 }
            )
        }

        // Create result rows
        const resultRows = normalizedUrls.map((u) => ({
            job_id: job.id,
            url: u.original,
            normalized_url: u.normalized,
            status: u.normalized ? "pending" : "failed",
            error_message: u.normalized ? null : "Некорректный URL",
        }))

        await supabase.from("parse_results").insert(resultRows)

        // Process in background — after() keeps the function alive on Vercel
        after(async () => {
            try {
                await processJob(job.id)
            } catch (err) {
                console.error("[Parse] Background processing error:", err)
            }
        })

        return NextResponse.json({ jobId: job.id })
    } catch (error) {
        console.error("[Parse] Error:", error)
        return NextResponse.json(
            { error: "Внутренняя ошибка сервера" },
            { status: 500 }
        )
    }
}

async function processJob(jobId: string) {
    // Get all pending results for this job
    const { data: results } = await supabase
        .from("parse_results")
        .select("*")
        .eq("job_id", jobId)
        .eq("status", "pending")
        .order("created_at")

    if (!results || results.length === 0) {
        await supabase
            .from("parse_jobs")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", jobId)
        return
    }

    let completedCount = 0
    let failedCount = 0

    // Process in batches of 5
    const batchSize = 5
    for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize)

        await Promise.all(
            batch.map(async (result) => {
                try {
                    // Update status to processing
                    await supabase
                        .from("parse_results")
                        .update({ status: "processing" })
                        .eq("id", result.id)

                    // Scrape the page
                    const scrapeResult = await scrapeUrl(result.normalized_url)

                    if (!scrapeResult.success) {
                        failedCount++
                        await supabase
                            .from("parse_results")
                            .update({
                                status: "failed",
                                error_message: scrapeResult.error,
                                completed_at: new Date().toISOString(),
                            })
                            .eq("id", result.id)
                        return
                    }

                    // Parse the HTML
                    const parsed = parseTrustpilotPage(scrapeResult.html)

                    completedCount++
                    await supabase
                        .from("parse_results")
                        .update({
                            status: "completed",
                            service_name: parsed.serviceName,
                            review_count: parsed.reviewCount,
                            email: parsed.email,
                            completed_at: new Date().toISOString(),
                        })
                        .eq("id", result.id)
                } catch (error) {
                    failedCount++
                    await supabase
                        .from("parse_results")
                        .update({
                            status: "failed",
                            error_message:
                                error instanceof Error ? error.message : "Unknown error",
                            completed_at: new Date().toISOString(),
                        })
                        .eq("id", result.id)
                }
            })
        )

        // Update job progress
        await supabase
            .from("parse_jobs")
            .update({
                completed_urls: completedCount,
                failed_urls: failedCount,
            })
            .eq("id", jobId)

        // Delay between batches
        if (i + batchSize < results.length) {
            await new Promise((resolve) => setTimeout(resolve, 1500))
        }
    }

    // Complete job
    await supabase
        .from("parse_jobs")
        .update({
            status: "completed",
            completed_urls: completedCount,
            failed_urls: failedCount,
            completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
}
