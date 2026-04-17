# ResumeChat

A full-stack web app that turns a resume into a shareable chatbot. Candidates upload a resume and share a link; recruiters chat with an AI that answers strictly from resume content.

Built with Next.js 14 (App Router), Supabase (Postgres + pgvector + Auth + Storage), Claude, and OpenAI embeddings.

## Features

- Google OAuth sign-in for candidates (Supabase Auth)
- PDF and DOCX resume parsing (`pdf-parse`, `mammoth`)
- Chunking + `text-embedding-3-small` embeddings stored in pgvector
- RAG retrieval against Supabase via `match_resume_chunks` RPC
- Claude integration with a strict system prompt — model auto-switches between `claude-haiku-4-5` and `claude-sonnet-4-6`
- Streaming chat responses (ReadableStream)
- Project link scraper (GitHub, Medium, Figma, generic sites)
- Candidate dashboard: upload, links, shareable link, analytics
- Recruiter chat page at `/chat/[username]` with split resume + chat layout
- Rate limiting (15 questions / session, 10 sessions / candidate / day)
- Low-confidence guardrail: if similarity < 0.75, returns canned "not in resume" response without calling Claude
- Anonymous recruiter sessions (localStorage token + DB row)
- Analytics: total views, total questions, most-asked question

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Auth + DB + Storage | Supabase |
| Vector store | pgvector (1536-dim, ivfflat cosine) |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | Anthropic Claude (Haiku 4.5 / Sonnet 4.6) |
| Parsing | `pdf-parse`, `mammoth` |
| Scraping | `cheerio` + GitHub API |
| Deployment | Vercel |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Create a Supabase project, then run the SQL in `supabase/schema.sql` inside the SQL editor. It will:

- enable `pgvector` + `uuid-ossp`
- create `profiles`, `resumes`, `project_links`, `resume_chunks`, `chat_sessions`, `chat_messages`, `resume_views`
- create the ivfflat cosine index
- create the `match_resume_chunks` RPC
- enable RLS with policies that allow public reads of active resumes but lock writes to the owner

Create a **Storage bucket** named `resumes` (private — we use signed URLs).

Enable the **Google OAuth provider** in Supabase Auth settings and set the redirect URL to `<APP_URL>/auth/callback`.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=          # for embeddings only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

## How it works

```
Candidate                                Recruiter
─────────                                ─────────
  ├─ Sign in (Google OAuth)                ├─ Visits /chat/[username]
  ├─ Upload resume (PDF/DOCX)              ├─ Sees rendered resume (60%)
  │     └── /api/upload-resume             │   + chat panel (40%)
  │          ├─ extractResumeText          ├─ Asks a question
  │          ├─ chunkText (500 tok + 50)   │     └── /api/chat
  │          ├─ OpenAI embeddings          │          ├─ load/create session
  │          └─ insert into resume_chunks  │          ├─ sanitize input
  ├─ Add project links                     │          ├─ RAG: match_resume_chunks RPC
  │     └── /api/scrape-link               │          ├─ if low confidence → canned
  │          ├─ fetch + cheerio            │          │   response, no Claude call
  │          └─ insert into project_links  │          ├─ build system prompt
  └─ Share link                            │          └─ Claude stream → client
                                           └─ next question…
```

## API routes

| Route | Purpose |
|---|---|
| `POST /api/upload-resume` | Extract → chunk → embed → store |
| `POST /api/scrape-link` | Scrape a URL and store it |
| `DELETE /api/scrape-link?id=` | Remove a project link |
| `PATCH /api/profile` | Update username, name, headline, linkedin |
| `POST /api/chat` | Streaming chat response |
| `GET /api/chat?sessionToken=` | Replay a chat session |
| `GET /api/analytics` | Candidate-side metrics |
| `POST /api/auth/signout` | Sign out |
| `GET /auth/callback` | OAuth callback + profile creation |

## Rate limits & guardrails

- **15** questions per chat session (`chat_sessions.question_count`)
- **10** sessions per candidate per rolling 24 hours
- Sessions expire after **24 h** of inactivity
- Similarity threshold: **0.75** — below that, Claude is skipped entirely
- File upload limit: **5 MB**, PDF or DOCX only
- All user input is sanitized and clipped to 1000 chars before hitting Claude
- Claude params: `temperature = 0`, `max_tokens = 500`

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import into Vercel. Add all env vars from `.env.example`.
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.
4. Update the Supabase Auth redirect URL to `<vercel-url>/auth/callback`.
5. `vercel.json` already sets longer `maxDuration` on the upload/chat routes.

## Project layout

```
app/
  page.tsx                 — landing
  dashboard/               — candidate (auth-protected)
    page.tsx
    settings/page.tsx
  chat/[username]/page.tsx — public recruiter page
  api/
    upload-resume/route.ts
    scrape-link/route.ts
    chat/route.ts
    analytics/route.ts
    profile/route.ts
    auth/signout/route.ts
  auth/callback/route.ts
lib/
  supabase.ts     — browser / server / service clients
  embeddings.ts   — OpenAI + chunk storage
  rag.ts          — vector retrieval + project summaries
  claude.ts       — system prompt, model selector, streaming
  extract.ts      — PDF / DOCX text + section parsing
  scraper.ts      — URL scrapers
  chunker.ts      — token-aware splitter
  utils.ts        — cn, session token, slug, validation
components/
  ui/             — Button, Card, Input, Toast
  auth/           — SignInButton
  dashboard/      — DashboardClient, ResumeUploader, ProjectLinkManager,
                    AnalyticsDashboard, ShareableLinkCard, ProfileSettings
  chat/           — ChatView, ChatPanel, ResumeViewer, PromptSuggestions,
                    MessageBubble
supabase/schema.sql
```

## License

MIT
