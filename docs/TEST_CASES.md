# ResumeChat — Test cases

Unit tests live in `tests/` and run with Node's built-in test runner:

```bash
npm test
```

The cases below mix end-to-end scenarios (to run manually against a live
Supabase project) and the pure-function tests they reduce to.

---

## TC1 — Happy path: recruiter asks a question that is in the resume

**Steps**

1. Candidate signs in, sets username `johndoe`, uploads a short PDF resume that
   mentions "Led a team of 5 engineers at Acme Corp".
2. Recruiter visits `/chat/johndoe` (no session token yet).
3. Recruiter asks: *"Do they have leadership experience?"*.

**Expected**

- `POST /api/chat` returns `200`, streams a response that references the Acme
  Corp leadership line, and sets `X-Session-Token` header.
- A new `chat_sessions` row is created; `chat_messages` contains both the user
  question and the assistant reply; `resume_views` has one row.
- Pure function check: `pickModel("Do they have leadership experience?")`
  returns `claude-haiku-4-5-20251001`.

**Tested by**

- `tests/claude.test.ts` → `pickModel` returns Haiku on short questions.
- `tests/chunker.test.ts` → ensures short resumes embed as a single chunk.

---

## TC2 — Low-confidence path: question isn't in the resume

**Steps**

1. Candidate has uploaded a SWE resume (no marathon content).
2. Recruiter asks: *"Did they run a marathon?"*

**Expected**

- `match_resume_chunks` returns nothing above 0.75 similarity.
- `POST /api/chat` responds `200` with body exactly:
  `This isn't mentioned in John Doe's resume.`
- Header `X-Low-Confidence: 1` is set.
- No Anthropic API call was made.
- The canned response is persisted as an assistant message so the next turn
  still sees valid role alternation.

**Tested by**

- `tests/rag.test.ts` → mocked `retrieveRelevantChunks` returns
  `lowConfidence: true` when the RPC yields zero rows.
- `tests/conversation.test.ts` → the canned-response turn keeps the
  user/assistant alternation clean on the next call.

---

## TC3 — Project link scraping

**Steps**

1. Candidate on `/dashboard` adds `https://github.com/torvalds`.
2. Scraper fetches GitHub profile + API.

**Expected**

- `POST /api/scrape-link` returns `200` with `{ link: { type: 'github', … } }`.
- `project_links.scraped_content` contains the profile bio and recent repo
  names.
- Subsequent chat calls include the scraped text in the `PROJECT LINKS
  SUMMARY` block of the system prompt.

**Tested by**

- `tests/scraper.test.ts` → `detectLinkType` classifies URLs correctly.

---

## EC1 — Empty / whitespace-only message

**Steps**

1. Recruiter POSTs `{ username: 'johndoe', message: '   ' }` to `/api/chat`.

**Expected**

- `400` with `{ error: 'Empty message' }`.
- No session is created, no Claude call is made.

**Tested by**

- `tests/claude.test.ts` → `sanitizeUserInput` collapses whitespace and
  returns empty string for whitespace-only input.

---

## EC2 — History has consecutive same-role turns (caused by a prior failure)

**Steps**

1. Assume a prior turn persisted a `user` message but the assistant insert
   failed.
2. Recruiter asks a second question, so history = `[user(Q1)]`.

**Expected**

- Without the fix, the Claude payload would be `[user(Q1), user(Q2)]` and
  Anthropic would return `400: messages must alternate`.
- With `buildConversationMessages`, the older user turn is dropped, payload
  becomes `[user(Q2)]`, and the request succeeds.
- The same function also trims leading `assistant` turns so the payload
  always starts with `user`.

**Tested by**

- `tests/conversation.test.ts` → covers:
  - consecutive `user` turns collapse to the newest
  - leading `assistant` turns are trimmed
  - empty history still yields a valid `[{role:'user', …}]`
  - alternating history is preserved

---

## Bugs found & fixed during this pass

| # | Bug | Fix |
|---|---|---|
| 1 | `POST /api/chat` had no top-level `try/catch` — every downstream failure surfaced as a bare `500` with no body. The user's live report of "500 on /api/chat" was almost certainly caused by `retrieveRelevantChunks` throwing (missing `match_resume_chunks` RPC, bad `OPENAI_API_KEY`, or unindexed resume). | Wrapped the whole handler in `try/catch`; returns `{ error }` with the real error message. Added explicit checks for missing `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`, and an early `404` when the candidate has no indexed resume chunks. |
| 2 | When a prior assistant reply failed to persist, the next turn sent Anthropic two consecutive `user` messages and Anthropic returned `400`. | New `lib/conversation.ts` + `buildConversationMessages` normalizes the history (collapse same-role runs, trim leading assistant turns, always end in the new user message). |
| 3 | `/api/analytics`, `/api/profile` PATCH, and `/auth/callback` had no outer `try/catch`, so an unexpected error crashed the route with an empty `500`. | Added `try/catch` wrappers that return real error messages (JSON for APIs, `?error=...` redirect for callback). |
| 4 | `/api/profile` PATCH also crashed on invalid JSON body. | Now returns `400` with a clear message. |
| 5 | `/auth/callback` username-dedup loop could theoretically spin forever if the DB returned stale results. | Bounded to 100 iterations then falls back to a timestamp suffix. |
