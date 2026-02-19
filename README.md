# Trustpilot Review Counter

Парсинг количества отзывов и email компаний с Trustpilot.

## Стек

- **Next.js 16** (App Router)
- **Supabase** (PostgreSQL)
- **Scrapfly API** (рендеринг страниц)
- **xlsx** (генерация Excel файлов)

## Установка

```bash
pnpm install
```

## Настройка

1. Создайте новый проект в [Supabase](https://supabase.com)
2. Выполните миграцию `scripts/001_init.sql` в SQL Editor
3. Заполните `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SCRAPFLY_API_KEY=YOUR_SCRAPFLY_KEY
```

## Запуск

```bash
pnpm dev
```

## Использование

1. Откройте `http://localhost:3000`
2. Вставьте URL-ы Trustpilot (один на строку)
3. Нажмите «Начать парсинг»
4. Скачайте XLSX с результатами

## Деплой на Vercel

```bash
git init
git add .
git commit -m "init"
# Подключить к Vercel через GitHub
```
