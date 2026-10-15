<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install dependencies with `npm ci`. Node.js 22 and npm are on the default image; no extra system packages are required.
- Start the dev server with `npm run dev`. Next.js 16 listens on `0.0.0.0:3000` by default.
- `npm test` runs the camping-gear checks with `node:test` via `tsx`. `npm run lint` runs ESLint.
- Leave `MICROCMS_SERVICE_DOMAIN` and `MICROCMS_API_KEY` unset unless real credentials are available. `/` and `/blog/[id]` then render the microCMS setup guide. The placeholders in `env.local.example` are non-empty, so copying them makes those pages call microCMS and fail.
- `npm run build` and `/sitemap.xml` call microCMS unconditionally and fail until those two variables are set. `/api/cron/new-camping-gear` returns 500 until `CRON_SECRET` is set. `POST /api/revalidate` returns 500 until `MICROCMS_WEBHOOK_SECRET` is set.
