-- Trustpilot Review Counter — Database Schema
-- Запустить в новом Supabase проекте

-- Таблица задач парсинга
CREATE TABLE IF NOT EXISTS parse_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    total_urls INT DEFAULT 0,
    completed_urls INT DEFAULT 0,
    failed_urls INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Таблица результатов
CREATE TABLE IF NOT EXISTS parse_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES parse_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    normalized_url TEXT,
    service_name TEXT,
    review_count INT,
    email TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_parse_results_job_id ON parse_results(job_id);
CREATE INDEX IF NOT EXISTS idx_parse_results_status ON parse_results(status);

-- RLS (отключаем для простоты, т.к. используем service_role_key)
ALTER TABLE parse_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parse_results ENABLE ROW LEVEL SECURITY;

-- Политики: разрешить всё через service_role (обход RLS)
-- Для публичного доступа без авторизации:
CREATE POLICY "Allow all for parse_jobs" ON parse_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for parse_results" ON parse_results FOR ALL USING (true) WITH CHECK (true);
