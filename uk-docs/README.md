# 🇬🇧 UK Docs — Sergii Palesika

Personal UK document wallet. Add, pin and track expiry of all UK documents.

## Stack
- Next.js 14 (App Router)
- TypeScript
- No external UI libraries — pure inline styles

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select this repo → Deploy (zero config needed)

## Project structure

```
uk-docs/
├── app/
│   ├── layout.tsx       # Root layout + metadata
│   ├── page.tsx         # Main page (list / detail / add)
│   └── globals.css      # Global reset styles
├── components/
│   ├── DocCard.tsx      # Document card in list
│   ├── DetailRow.tsx    # Row in detail view
│   ├── ExpiryBadge.tsx  # Coloured expiry badge
│   └── FormField.tsx    # Form field wrapper
├── lib/
│   ├── types.ts         # Doc and Category types
│   ├── data.ts          # Default docs + categories
│   └── utils.ts         # Date helpers
├── .gitignore
├── next.config.js
├── package.json
└── tsconfig.json
```

## Features
- EN / RU bilingual interface
- Pin important documents to the top
- Category filter (Immigration, Driving, Qualifications, Banking, Tax, Other)
- Expiry countdown badges (green → amber → red)
- Alert banner for documents expiring within 60 days
- Data saved in localStorage — persists between sessions
- Mobile-first, works on phone browser
