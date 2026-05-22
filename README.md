# 🇬🇧 UK Docs — Secure Document Wallet

Personal UK document wallet with **email auth**, **encrypted cloud storage** and **passport photo management**.

## Stack
- **Next.js 14** — App Router
- **Supabase** — Auth + PostgreSQL database + Row Level Security
- **TypeScript** — full type safety
- **Vercel** — hosting

---

## ⚡ Setup Guide (15 minutes)

### Step 1 — Create Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Give it a name: `uk-docs`
3. Set a database password (save it!)
4. Choose region: **EU West** (Ireland) — closest to UK
5. Wait ~2 min for project to spin up

### Step 2 — Run the SQL schema

1. In Supabase dashboard → **SQL Editor**
2. Click **New query**
3. Open file `supabase/schema.sql` from this project
4. Paste the entire contents → click **Run**
5. You should see "Success" — all tables created

### Step 3 — Get your API keys

In Supabase → **Settings → API**:
- Copy **Project URL** → `https://xxxx.supabase.co`
- Copy **anon public** key

### Step 4 — Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import repo
3. Before deploying, add **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
```

4. Click **Deploy**

### Step 5 — Configure Supabase Auth

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/reset`

---

## 🗂 Project structure

```
uk-docs/
├── app/
│   ├── page.tsx          # Main app (requires auth)
│   ├── layout.tsx        # Root layout + metadata
│   ├── globals.css       # Global styles
│   ├── auth/
│   │   ├── page.tsx      # Login / Register page
│   │   └── reset/
│   │       └── page.tsx  # Password reset page
│   ├── icon.tsx          # App favicon
│   └── apple-icon.tsx    # iOS home screen icon
├── components/           # Shared UI components
├── lib/
│   ├── supabase.ts       # Supabase browser client
│   ├── db.ts             # All database operations
│   ├── types.ts          # TypeScript interfaces
│   ├── data.ts           # Default data & categories
│   └── utils.ts          # Date helpers
├── middleware.ts          # Auth route protection
├── supabase/
│   └── schema.sql        # Database schema — run this first!
├── public/
│   ├── icon-192.png      # PWA icon
│   ├── icon-512.png      # PWA icon large
│   ├── apple-icon.png    # iOS icon
│   └── manifest.json     # PWA manifest
├── .env.local.example    # Copy to .env.local with your keys
├── package.json
├── tsconfig.json
└── next.config.js
```

## 🔒 Security

- **Row Level Security (RLS)** — Supabase enforces that users can only read/write their own data
- **JWT tokens** — managed automatically by Supabase
- **No data sharing** — each user is completely isolated
- **Password reset** — via email link
- **Email verification** — optional, configurable in Supabase dashboard

## ✨ Features

- Email + password auth (register / login / forgot password)
- Documents: add, pin, delete, search, filter by category, copy codes
- Passports: add with type/number/dates, upload photos of pages, full-screen viewer
- Action Plan: 15-task checklist for arriving in UK, progress bar, saves to cloud
- Profile: name (EN+RU), date of birth, nationality, avatar
- Bilingual UI: English / Russian toggle
- PWA: add to home screen as app with UK flag icon
- Expiry alerts: colour-coded badges, warning banner for docs expiring within 60 days
