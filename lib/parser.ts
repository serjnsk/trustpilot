export interface ParseResult {
    reviewCount: number | null
    email: string | null
    serviceName: string | null
}

/**
 * Парсит количество отзывов из HTML страницы Trustpilot.
 * 6 стратегий, от самой надёжной к наименее надёжной.
 * Извлечено из sborka-ai/lib/actions/trustpilot.ts
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
 * Парсит email со страницы Trustpilot.
 * 3 стратегии: mailto-ссылки, JSON-LD contactPoint, regex.
 */
export function parseEmail(html: string): string | null {
    // Strategy 1: mailto: links
    const mailtoMatch = html.match(/href=["']mailto:([^"'?]+)/i)
    if (mailtoMatch) {
        return mailtoMatch[1].trim().toLowerCase()
    }

    // Strategy 2: JSON-LD contactPoint email
    const contactEmailMatch = html.match(
        /"contactPoint"[^}]*"email"\s*:\s*"([^"]+)"/i
    )
    if (contactEmailMatch) {
        return contactEmailMatch[1].trim().toLowerCase()
    }

    // Strategy 3: email in JSON-LD (generic)
    const jsonLdEmailMatch = html.match(/"email"\s*:\s*"([^"]+@[^"]+)"/i)
    if (jsonLdEmailMatch) {
        return jsonLdEmailMatch[1].trim().toLowerCase()
    }

    // Strategy 4: Regex — find email patterns in text
    // Exclude common false positives (image filenames, CSS classes)
    const emailRegex =
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const allEmails = html.match(emailRegex) || []

    const filtered = allEmails.filter((email) => {
        const lower = email.toLowerCase()
        // Filter out obvious non-emails
        if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".svg")) return false
        if (lower.includes("sentry") || lower.includes("webpack")) return false
        if (lower.includes("example.com") || lower.includes("test.com")) return false
        if (lower.startsWith("2x") || lower.startsWith("3x")) return false
        return true
    })

    return filtered.length > 0 ? filtered[0].toLowerCase() : null
}

/**
 * Парсит название сервиса из HTML страницы Trustpilot.
 */
export function parseServiceName(html: string): string | null {
    // Strategy 1: og:title meta tag
    const ogTitleMatch = html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    )
    if (ogTitleMatch) {
        // Remove "Reviews" and similar suffixes
        return ogTitleMatch[1]
            .replace(/\s*(?:Reviews?|Отзывы)\s*$/i, "")
            .trim()
    }

    // Strategy 2: displayName in JSON-LD
    const displayNameMatch = html.match(/"displayName"\s*:\s*"([^"]+)"/i)
    if (displayNameMatch) {
        return displayNameMatch[1].trim()
    }

    // Strategy 3: title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
        return titleMatch[1]
            .replace(/\s*[\|·-]\s*Trustpilot.*$/i, "")
            .replace(/\s*(?:Reviews?|Отзывы)\s*$/i, "")
            .trim()
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
