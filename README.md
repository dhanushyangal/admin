# Hydrilla Admin

Internal dashboard at [admin.hydrilla.ai](https://admin.hydrilla.ai) for users, credits, support, GPU, usage, Water, and blog.

Lives at `hydrilla/admin` (sibling of `frontend/` and `backend/`).

## Getting started

```bash
cd hydrilla/admin
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3001
```

Use the same Clerk application as the main frontend (or a dedicated admin instance). Add these origins in Clerk:

- `https://admin.hydrilla.ai`
- `http://localhost:3001`

Point the admin API client at the backend (`NEXT_PUBLIC_API_URL` / backend URL in `.env.example`).

## Features

| Area | Route | Backend |
|------|-------|---------|
| Overview | `/` | Admin aggregates |
| Users | `/users`, `/users/[id]` | `/api/admin/users` — profile, grant/remove credits, ledger, usage |
| Credit claims | `/credits` | `/api/admin/...` claim-link create/list — emails claim URLs users open on `/claim/[token]` in the frontend |
| Support | `/support` | `/api/admin/support` — tickets from the main app Help modal |
| Usage | `/usage` | `/api/admin/usage` |
| GPU | `/gpu` | `/api/admin/gpu` |
| Water | `/water` | Water / BYOK admin |
| Image keys | `/image-keys` | Platform image provider keys |
| Blog | `/blog`, `/blog/new`, `/blog/[id]` | `/api/admin/blog` |
| Login | `/login` | Clerk sign-in |

## SQL migrations (backend)

Run on Supabase when enabling related features (from `../backend/sql/`):

- `006_platform_api_keys.sql` — platform API keys
- `018_support_feedback.sql` — support / feedback tickets
- `024_credit_ledger_and_claims.sql` — credit ledger + claim links

## Stack

Next.js · React · TypeScript · Tailwind · Clerk · shadcn/ui

## Deploy

Deploy this folder as its own Vercel project. Set Clerk keys and the backend API URL. Do not expose this app publicly without Clerk protection.

## License

Private — Hydrilla Platform
