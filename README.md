# Hydrilla Admin

Internal app for `admin.hydrilla.ai`. Dev: `npm run dev` (port 3001). Copy `.env.example` to `.env.local` using the same Clerk keys as the main frontend.

Run `sql/006_platform_api_keys.sql` on Supabase, add `https://admin.hydrilla.ai` and `http://localhost:3001` in Clerk, then deploy this folder as its own Vercel project.
