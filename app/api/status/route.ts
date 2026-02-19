import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
    const jobId = request.nextUrl.searchParams.get("jobId")

    if (!jobId) {
        return NextResponse.json(
            { error: "Укажите jobId" },
            { status: 400 }
        )
    }

    // Get job
    const { data: job, error: jobError } = await supabase
        .from("parse_jobs")
        .select("*")
        .eq("id", jobId)
        .single()

    if (jobError || !job) {
        return NextResponse.json(
            { error: "Задача не найдена" },
            { status: 404 }
        )
    }

    // Get results
    const { data: results } = await supabase
        .from("parse_results")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at")

    return NextResponse.json({
        job,
        results: results || [],
    })
}
