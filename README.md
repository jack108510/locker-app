# Locker — Crowdsourced past-test database

Mobile-first web app where students scan old assignments, quizzes, and exams into a school-specific searchable database available to students from that school.

## Live data

Locker now uses Supabase for:

- public material feed
- submission counts
- alias/school profiles
- scan submissions
- reports and votes

Local seed data remains only as a fallback if Supabase env vars are missing or the database is unreachable.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run build:pages` | Static GitHub Pages export |
| `npm run lint` | Run ESLint |
| `npm start` | Start production server after build |

## Tech Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase REST/PostgREST via `@supabase/supabase-js`
- Client-side image OCR via `tesseract.js`
- GitHub Pages deployment

## Product Boundary

Locker is a school-specific social experiment / crowdsourced test bank.

Allowed:

- old assignments
- old assignments with answers
- old quizzes
- old quizzes with answers
- old exams
- old exams with answers
- worksheets with or without answers
- class and teacher tags for finding relevant past material

Blocked or queued for review:

- active/current tests
- teacher-only answer keys
- teacher-only copies
- student grades or personal info

## Supabase schema

The database schema is in:

```bash
supabase/locker_schema.sql
```

It creates:

- `locker_profiles`
- `locker_materials`
- `locker_reports`
- `locker_votes`
- `locker_stats` view

RLS is enabled with low-friction public insert/read policies for this launch prototype.

## iOS / Apple prep

Capacitor has been added for iOS packaging.

```bash
npm run build:ios
npm run ios:open
```

Native iOS project:

```bash
ios/App/App.xcworkspace
```

Bundle ID:

```bash
com.jswenterprises.locker
```

App Store preparation docs live in:

```bash
app-store/AppStore.md
```

Required Apple review support added:

- Privacy policy page: `/privacy`
- Terms/content policy page: `/terms`
- Camera/photo permission strings in `ios/App/App/Info.plist`
- Supabase Storage bucket for submitted scan images
- Report flow with reasons
- Local source-blocking control
- Moderation queue/report database objects
