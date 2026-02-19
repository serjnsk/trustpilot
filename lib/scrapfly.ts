const SCRAPFLY_API_URL = "https://api.scrapfly.io/scrape"

interface ScrapflyResponse {
    success: boolean
    html: string
    error?: string
}

export async function scrapeUrl(url: string): Promise<ScrapflyResponse> {
    const apiKey = process.env.SCRAPFLY_API_KEY
    if (!apiKey) {
        return { success: false, html: "", error: "SCRAPFLY_API_KEY не настроен" }
    }

    const params = new URLSearchParams({
        key: apiKey,
        url,
        asp: "false",
        render_js: "true",
        proxy_pool: "public_datacenter_pool",
        country: "us",
        rendering_wait: "2000",
        format: "raw",
    })

    try {
        const response = await fetch(`${SCRAPFLY_API_URL}?${params.toString()}`)

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
                success: false,
                html: "",
                error: errorData.message || `HTTP ${response.status}`,
            }
        }

        const data = await response.json()
        const html = data.result?.content || ""

        return { success: true, html }
    } catch (error) {
        return {
            success: false,
            html: "",
            error: error instanceof Error ? error.message : "Ошибка запроса",
        }
    }
}

export async function checkScrapflyBalance(): Promise<{
    success: boolean
    balance?: number
    error?: string
}> {
    const apiKey = process.env.SCRAPFLY_API_KEY
    if (!apiKey) {
        return { success: false, error: "SCRAPFLY_API_KEY не настроен" }
    }

    try {
        const response = await fetch(
            `https://api.scrapfly.io/account?key=${apiKey}`,
            { cache: "no-store" }
        )

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` }
        }

        const data = await response.json()
        const balance =
            data.subscription?.usage?.scrape?.remaining ??
            data.subscription?.usage?.scrape_api_credit_remaining ??
            null

        return { success: true, balance }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Ошибка подключения",
        }
    }
}
