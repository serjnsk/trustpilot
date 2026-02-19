export interface ParseResult {
    reviewCount: number | null
    email: string | null
    serviceName: string | null
}

/**
 * Парсит количество отзывов из HTML страницы Trustpilot.
 * 6 стратегий, от самой надёжной к наименее надёжной.
 */
export function parseReviewCount(html: string): number | null {
    // Strategy 1: data-rating-count attribute (most reliable)
    const ratingCountMatch = html.match(/data-rating-count["\\s=]*["']?(\d+)/i)
    if (ratingCountMatch) {
        return parseInt(ratingCountMatch[1], 10)
    }

    // Strategy 2: numberOfReviews in JSON-LD
    const jsonLdMatch = html.match(/"numberOfReviews"\s*:\s*"?(\d+)/i)
    if (jsonLdMatch) {
        return parseInt(jsonLdMatch[1], 10)
    }

    // Strategy 3: reviewCount in JSON-LD
    const reviewCountMatch = html.match(/"reviewCount"\s*:\s*"?(\d+)/i)
    if (reviewCountMatch) {
        return parseInt(reviewCountMatch[1], 10)
    }

    // Strategy 4: data-reviews-count-typography
    const typographyMatch = html.match(
        /data-reviews-count-typography[^>]*>([0-9,.\s]+)/i
    )
    if (typographyMatch) {
        const numStr = typographyMatch[1].replace(/[,.\s]/g, "")
        return parseInt(numStr, 10)
    }

    // Strategy 5: "X reviews" pattern
    const reviewsMatch = html.match(
        /(\d{1,3}(?:[,.\s]\d{3})*)\s*reviews/i
    )
    if (reviewsMatch) {
        const numStr = reviewsMatch[1].replace(/[,.\s]/g, "")
        return parseInt(numStr, 10)
    }

    // Strategy 6: "Total X reviews"
    const totalMatch = html.match(
        /[Tt]otal\s*(?:of\s*)?(\d{1,3}(?:,\d{3})*)\s*reviews/i
    )
    if (totalMatch) {
        const numStr = totalMatch[1].replace(/,/g, "")
        return parseInt(numStr, 10)
    }

    return null
}

/**
 * Парсит email из блока "Contact info" на странице Trustpilot.
 * Ищет mailto-ссылку ТОЛЬКО внутри блока Contact info.
 * Если Contact info нет — возвращает null.
 */
export function parseEmail(html: string): string | null {
    // Ищем блок "Contact info" — после него идёт <ul> с контактами
    const contactIdx = html.indexOf("Contact info")
    if (contactIdx === -1) {
        return null // Нет блока Contact info — нет почты
    }

    // Берём ~6000 символов после "Contact info" — SVG-иконки занимают много места
    const contactBlock = html.substring(contactIdx, contactIdx + 6000)

    // Strategy 1: mailto: link inside Contact info block
    const mailtoMatch = contactBlock.match(/href=["']mailto:([^"'?]+)/i)
    if (mailtoMatch) {
        return mailtoMatch[1].trim().toLowerCase()
    }

    // Strategy 2: email pattern inside Contact info block
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = contactBlock.match(emailRegex) || []
    const filtered = emails.filter((email) => {
        const lower = email.toLowerCase()
        if (lower.includes("trustpilot.com")) return false
        if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".svg")) return false
        if (lower.includes("sentry") || lower.includes("webpack")) return false
        return true
    })

    return filtered.length > 0 ? filtered[0].toLowerCase() : null
}

/**
 * Парсит название сервиса из HTML страницы Trustpilot.
 * Приоритет:
 * 1. displayName CSS-класс (самый чистый — просто имя)
 * 2. <title> тег (обрезаем суффиксы)
 * 3. og:title (обрезаем рейтинг)
 */
export function parseServiceName(html: string): string | null {
    // Strategy 1: displayName CSS-класс — содержит чистое имя
    // Формат: displayName__XXXXX">ServiceName<!-- -->
    const displayNameMatch = html.match(
        /displayName[^"]*"[^>]*>([^<]+?)(?:\s*<!--)/i
    )
    if (displayNameMatch) {
        const name = displayNameMatch[1]
            .replace(/&nbsp;/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim()
        if (name.length > 0) {
            return name
        }
    }

    // Strategy 2: <title> tag — "ServiceName Reviews | Read Customer..."
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
        const cleaned = titleMatch[1]
            .replace(/\s*Reviews?\s*\|.*$/i, "")
            .replace(/\s*[\|·-]\s*Trustpilot.*$/i, "")
            .replace(/\s*(?:Reviews?|Отзывы)\s*$/i, "")
            .trim()
        if (cleaned.length > 0) {
            return cleaned
        }
    }

    // Strategy 3: og:title — "ServiceName is rated "X" with Y / 5 on Trustpilot"
    const ogTitleMatch = html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    )
    if (ogTitleMatch) {
        const cleaned = ogTitleMatch[1]
            .replace(/\s+is\s+rated\s+.*/i, "")
            .replace(/&quot;/g, '"')
            .trim()
        if (cleaned.length > 0) {
            return cleaned
        }
    }

    // Strategy 4: displayName in JSON-LD
    const jsonDisplayMatch = html.match(/"displayName"\s*:\s*"([^"]+)"/i)
    if (jsonDisplayMatch) {
        return jsonDisplayMatch[1].trim()
    }

    return null
}

/**
 * Полный парсинг страницы Trustpilot: review count + email + name.
 */
export function parseTrustpilotPage(html: string): ParseResult {
    return {
        reviewCount: parseReviewCount(html),
        email: parseEmail(html),
        serviceName: parseServiceName(html),
    }
}
