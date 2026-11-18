# Haneen Khader — Creative Portfolio

A responsive photo/video portfolio with public browsing and a private creator dashboard. Built with Vite + Supabase.

## Features
- Public portfolio gallery; no visitor login required
- Private email/password admin sign-in
- Create, edit, and delete posts
- Multiple image/video uploads per post
- Title, caption, category, and location
- Persistent online media storage and database
- Responsive creative travel-journal design

## Before you start
You need:
- A free Supabase account: https://supabase.com/
- A free Vercel account: https://vercel.com/
- Node.js 20+ installed on your computer (for local development)

## 1. Create your Supabase backend
1. Create a new project at https://supabase.com/dashboard.
2. Choose a strong database password and save it privately.
3. Go to Authentication > Users and create your admin user using your own email and a strong password.
4. Open SQL Editor and run `supabase/schema.sql`.
5. IMPORTANT: Before running the SQL, replace both occurrences of `YOUR_ADMIN_EMAIL` with the exact email used for your admin account.
6. In Project Settings > API, copy the Project URL and the publishable/anon key. Never use or expose the `service_role` key.

## 2. Configure the website
1. Copy `.env.example` to a new file named `.env`.
2. Paste your Supabase Project URL into `VITE_SUPABASE_URL`.
3. Paste the Supabase publishable/anon key into `VITE_SUPABASE_ANON_KEY`.

## 3. Run locally
Open a terminal in this folder and run:

```bash
npm install
npm run dev
```

Open the local URL printed in your terminal. Use Creator login to sign in with the admin email/password you created in Supabase.

## 4. Publish for free with Vercel
1. Create a GitHub repository and upload this project (do not upload `.env`).
2. Sign in to https://vercel.com/ and import that GitHub repository.
3. Vercel detects Vite automatically. Build command: `npm run build`; output directory: `dist`.
4. In Vercel Project Settings > Environment Variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Vercel will give you a public URL you can share.
6. Whenever you change the code, push to GitHub and Vercel redeploys.

## Security notes
- The website uses Supabase Row Level Security policies. Public visitors can read posts, but only the configured admin email can create, update, or delete them.
- Public media is intentionally readable by anyone with the website link.
- Never share your Supabase database password, admin password, or service-role key.
- The free tiers have storage/bandwidth limits and may change. Large video files can use the quota quickly.
- For privacy, do not upload images/videos containing private information or people who have not agreed to public sharing.

## Customization
Edit `index.html` to change your intro, email, LinkedIn, and Qutrek links. Replace the hero image URL with one of your own photos when ready. Update the colors and layout in `src/style.css`.
