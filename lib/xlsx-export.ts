import * as XLSX from "xlsx"

interface ExportRow {
    url: string
    service_name: string | null
    review_count: number | null
    email: string | null
    status: string
    error_message: string | null
}

export function generateXlsx(rows: ExportRow[]): Uint8Array {
    const data = rows.map((row) => ({
        "URL Trustpilot": row.url,
        "Название сервиса": row.service_name || "—",
        "Количество отзывов":
            row.review_count !== null ? row.review_count : "не найдено",
        "Email": row.email || "нет почты",
        "Статус": row.status === "completed" ? "✅" : row.status === "failed" ? "❌" : "⏳",
        "Ошибка": row.error_message || "",
    }))

    const ws = XLSX.utils.json_to_sheet(data)

    // Set column widths
    ws["!cols"] = [
        { wch: 50 }, // URL
        { wch: 30 }, // Service name
        { wch: 20 }, // Review count
        { wch: 35 }, // Email
        { wch: 10 }, // Status
        { wch: 40 }, // Error
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Trustpilot")

    return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }))
}
