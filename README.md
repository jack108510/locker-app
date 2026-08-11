# Locker — Your school's study stash.

A dark, mobile-first MVP prototype for an anonymous school-specific study-material sharing app.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm start` | Start production server (after build) |

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** — dark premium design system
- **Lucide React** — icons
- **All mock data** — no backend, no external credentials required

## Prototype Screens

1. **Landing page** — hero, how it works, what's allowed vs blocked, anonymous-by-default, built for test week
2. **Anonymous onboarding** — random pseudonym generator, school picker
3. **Browse feed** — search + filter by school, course, material type; upvote/save/report in local state
4. **Document viewer** — modal with paginated content, upvote/save/share actions
5. **Upload form** — "Drop study material" with type, school, course, teacher, title, file; automatic moderation simulation
6. **Admin dashboard** — aggregate analytics: approved count, pending queue, blocked log by category/school, no student identity

## Product Safety Boundary

Locker is an **anonymous study-material app**. The following rules are baked into the prototype and must be maintained in any real build:

**Allowed uploads:**
- Class notes, study guides, flashcards, summaries, chapter summaries
- Publicly released prep material (e.g., College Board released FRQs)
- Self-created practice questions (queued for review)

**Permanently blocked:**
- Current or recent exam questions
- Answer keys or teacher editions
- Graded student work
- Private teacher documents
- Files containing personal student information

**Privacy guarantees:**
- No accounts, emails, or real names required
- Pseudonyms are randomly generated and not linked to device identity
- IP addresses are never stored
- The admin dashboard shows only aggregate counts — no per-user data, no upload attribution beyond anonymous alias

Any feature that deanonymizes uploaders, exposes device/IP identity, or helps prohibited material spread violates the product boundary and must not be built.
