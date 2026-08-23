# Locker — School materials database

Mobile-first web app where students scan assignments, worksheets, quizzes, and past exams into a school-specific searchable database available to students from that school for studying.

## Live data

Locker now uses Supabase for:

- public material feed
- submission counts
- alias/school profiles
- multi-page scan submissions
- grade, unit/topic, year, teacher, and class metadata
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

## Scanner flow

Locker now supports:

- live camera scanning with a mobile frame
- multiple pages per material
- photo-library fallback with multiple images
- first-pass client-side OCR via `tesseract.js`
- AI OCR quality review through Supabase Edge Function `locker-ocr-pipeline`
- vision-model fallback when first-pass OCR is corrupted or low-confidence
- editable extracted text per page
- basic image quality hints for low light / blur
- auto-filled metadata suggestions for type, class, grade, unit/topic, teacher, year, and title

The upload path is intentionally scan-first: image pages first, OCR/AI extraction second, then labels unlock.

Backend files:

```bash
supabase/functions/locker-ocr-pipeline/index.ts
supabase/locker_ocr_pipeline.sql
```

The edge function expects `OPENAI_API_KEY` in Supabase function secrets for AI review + vision fallback. If the function is unavailable, the app falls back to the local OCR quality gate instead of blocking uploads.

## Product Boundary

Locker is a school-specific social experiment / crowdsourced school-materials database.

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
