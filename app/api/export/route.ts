import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateXlsx } from "@/lib/xlsx-export"

export async function GET(request: NextRequest) {
    const jobId = request.nextUrl.searchParams.get("jobId")

    if (!jobId) {
        return NextResponse.json(
            { error: "Укажите jobId" },
            { status: 400 }
        )
    }

    // Get results
    const { data: results, error } = await supabase
        .from("parse_results")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at")

    if (error || !results) {
        return NextResponse.json(
            { error: "Результаты не найдены" },
            { status: 404 }
        )
    }

    // Generate XLSX
    const xlsxData = generateXlsx(results)

    return new Response(xlsxData.buffer as ArrayBuffer, {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="trustpilot_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
    })
}
