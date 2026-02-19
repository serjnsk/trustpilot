"use client"

import { useState, useEffect, useCallback } from "react"

interface Result {
  id: string
  url: string
  service_name: string | null
  review_count: number | null
  email: string | null
  status: string
  error_message: string | null
}

interface Job {
  id: string
  status: string
  total_urls: number
  completed_urls: number
  failed_urls: number
  created_at: string
  completed_at: string | null
}

export default function HomePage() {
  const [urls, setUrls] = useState("")
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [error, setError] = useState<string | null>(null)

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/status?jobId=${id}`)
      const data = await res.json()

      if (data.job) setJob(data.job)
      if (data.results) setResults(data.results)

      // Continue polling if not done
      if (data.job?.status === "running" || data.job?.status === "pending") {
        setTimeout(() => pollStatus(id), 2000)
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (jobId) {
      pollStatus(jobId)
    }
  }, [jobId, pollStatus])

  const handleSubmit = async () => {
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0)

    if (urlList.length === 0) {
      setError("Введите хотя бы один URL")
      return
    }

    setError(null)
    setLoading(true)
    setResults([])
    setJob(null)

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Ошибка запуска")
        setLoading(false)
        return
      }

      setJobId(data.jobId)
    } catch {
      setError("Ошибка сети")
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (jobId) {
      window.open(`/api/export?jobId=${jobId}`, "_blank")
    }
  }

  const completedCount = results.filter((r) => r.status === "completed").length
  const failedCount = results.filter((r) => r.status === "failed").length
  const processingCount = results.filter(
    (r) => r.status === "processing" || r.status === "pending"
  ).length
  const progressPercent = results.length > 0
    ? Math.round(((completedCount + failedCount) / results.length) * 100)
    : 0

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-secondary)",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{ background: "var(--accent)" }}
          >
            ⭐
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Trustpilot Review Counter
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Парсинг количества отзывов и email
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Input Section */}
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              📋 Список URL
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Один URL на строку. Можно вставить как полный URL Trustpilot, так и просто домен.
            </span>
          </div>

          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={`https://www.trustpilot.com/review/example.com\nhttps://www.trustpilot.com/review/another-service.com\nthird-service.com`}
            rows={8}
            className="w-full rounded-lg border px-4 py-3 text-sm resize-y focus:outline-none transition-colors"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
            disabled={loading}
          />

          {error && (
            <div
              className="rounded-lg px-4 py-2 text-sm"
              style={{ background: "#ef444420", color: "var(--error)" }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || !urls.trim()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: loading ? "var(--border)" : "var(--accent)",
                color: "white",
              }}
            >
              {loading ? "⏳ Парсинг..." : "🚀 Начать парсинг"}
            </button>

            {job?.status === "completed" && (
              <button
                onClick={handleExport}
                className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: "#10b98120",
                  color: "var(--success)",
                  border: "1px solid #10b98140",
                }}
              >
                📥 Скачать XLSX
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {job && (
          <div
            className="rounded-xl border p-5 space-y-3"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                📊 Прогресс
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <span style={{ color: "var(--success)" }}>✅ {completedCount}</span>
                <span style={{ color: "var(--error)" }}>❌ {failedCount}</span>
                <span style={{ color: "var(--text-muted)" }}>⏳ {processingCount}</span>
              </div>
            </div>

            <div className="w-full rounded-full h-2" style={{ background: "var(--bg-secondary)" }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    job.status === "completed"
                      ? "var(--success)"
                      : "var(--accent)",
                }}
              />
            </div>

            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {job.status === "completed"
                ? `Завершено: ${completedCount + failedCount} из ${results.length}`
                : `Обработано: ${completedCount + failedCount} из ${results.length} (${progressPercent}%)`}
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                📋 Результаты ({results.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-secondary)" }}>
                    <th
                      className="text-left px-4 py-2.5 font-medium text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      URL
                    </th>
                    <th
                      className="text-left px-4 py-2.5 font-medium text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Сервис
                    </th>
                    <th
                      className="text-right px-4 py-2.5 font-medium text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Отзывы
                    </th>
                    <th
                      className="text-left px-4 py-2.5 font-medium text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Email
                    </th>
                    <th
                      className="text-center px-4 py-2.5 font-medium text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t transition-colors"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="px-4 py-3 max-w-[300px]">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate block text-xs"
                          style={{ color: "var(--accent)" }}
                        >
                          {r.url.replace("https://www.trustpilot.com/review/", "")}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-primary)" }}>
                        {r.service_name || "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono text-xs"
                        style={{
                          color: r.review_count !== null ? "var(--text-primary)" : "var(--text-muted)",
                        }}
                      >
                        {r.review_count !== null ? r.review_count.toLocaleString("ru-RU") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.email ? (
                          <a
                            href={`mailto:${r.email}`}
                            className="hover:underline"
                            style={{ color: "var(--accent)" }}
                          >
                            {r.email}
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>нет почты</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {r.status === "completed" && "✅"}
                        {r.status === "failed" && (
                          <span
                            title={r.error_message || ""}
                            className="cursor-help"
                          >
                            ❌
                          </span>
                        )}
                        {r.status === "processing" && (
                          <span className="animate-pulse">⏳</span>
                        )}
                        {r.status === "pending" && "🔵"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* History */}
        {!job && !loading && (
          <div
            className="rounded-xl border p-8 text-center"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="text-4xl mb-3">⭐</div>
            <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              Начните работу
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Вставьте URL-ы Trustpilot и нажмите «Начать парсинг»
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
