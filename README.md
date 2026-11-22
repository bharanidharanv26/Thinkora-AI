# Thinkora AI

**Think Deeper. Learn Smarter.**

A full-stack adaptive learning application built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui source components (Radix Slot + CVA), Supabase Auth/PostgreSQL/Storage, Google Gemini API, React Flow and Recharts.

The application uses real services. **There is no demo account, simulated AI evaluation or in-memory substitute for saved student progress.** Without credentials, the application runs with a working sign-in landing page and an explicit setup screen; authenticated learning requires configuration below.

## Requirements

- Node.js **24 LTS** recommended and npm.
- A Supabase project (hosted is easiest; local Supabase requires Docker).
- A Google Cloud OAuth web client.
- A Google AI Studio API key with access to a Gemini model supporting **JSON-schema structured output, images and PDF input**. Default: `gemini-3.5-flash-lite`. Create one at [Google AI Studio](https://aistudio.google.com/apikey).
- Teacher/student connections are accepted directly in the app; no email service is required.

## Quick start

```powershell
npm install
Copy-Item .env.example .env.local
# Edit .env.local with your own credentials.
npm run dev
```

Open **http://localhost:3000**. The server listens on `0.0.0.0`. On a phone, use your computer's LAN address and configure the app URL and OAuth redirect allowlist accordingly. Do not disable browser zoom.

No secrets belong in source control. `.env.local` is ignored. `NEXT_PUBLIC_*` values are bundled for the browser, so **never** place a service role, Gemini or email API secret in a public variable. Restart after changing `.env.local`; rebuild production after changing public environment values.

## 1. Supabase initialization

Create a new Supabase project. In its SQL editor, run **every file in `supabase/migrations/` in filename order**, then run `supabase/seed.sql`:

1. `supabase/migrations/202611210001_initial.sql`
2. `supabase/migrations/202611210002_class10_light.sql`
3. `supabase/migrations/202611210003_class10_eye_magnetism.sql`
4. `supabase/migrations/202611210004_class11_12_foundations.sql`
5. `supabase/migrations/202611210005_teacher_ids_and_two_way_connections.sql`
6. `supabase/migrations/202611210006_default_courses_all_subjects.sql`
7. `supabase/migrations/202611210007_course_ownership_and_permissions.sql`
8. `supabase/migrations/202611220008_direct_teacher_student_connections.sql`
9. `supabase/seed.sql`

The migrations create all application tables, indexes, RLS policies, the private `syllabuses` storage bucket (10 MB limit and an explicit MIME allowlist), authorization helpers, rate limits and transactional RPCs. The seed is idempotent and adds the complete **Class 10 Physics — Electricity** course with 30 reviewed reference questions, while the catalogue migrations publish **18 default courses** covering Classes 10, 11 and 12 in Physics, Chemistry, Mathematics, Biology and English, with connected concept graphs. Remaining chapters are not published until their reviewed content is authored; they can be learned immediately through custom syllabus extraction.

For Supabase CLI-managed hosted projects, use `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, and `npx supabase db push`. Run the seed in the SQL editor after pushing migrations. Do not reset a hosted database containing user data.

For a disposable local database (requires Docker):

```powershell
npm run db:start
npm run db:reset
npx supabase status
```

`db:reset` destroys and recreates **local** data, applies migrations and loads the seed. Use the local project URL and keys shown by `supabase status`. Google OAuth must also be configured for the local GoTrue instance; the hosted flow below is recommended for initial setup.

Populate:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.com
```

`NEXT_PUBLIC_SUPPORT_EMAIL` is optional; when set, `/privacy` shows it as the operator contact for support and data-deletion requests. It is inlined at build time, so set it in Vercel and redeploy.

The public key is intentionally safe to expose: database and storage access is constrained by RLS. The service role key bypasses RLS and is imported **only from `server-only` modules**. Every privileged API operation independently verifies the current Google-authenticated user, their registered role and resource ownership/consent.

## 2. Google OAuth

1. In Google Cloud Console, create an OAuth consent screen. Add yourself and other initial users as test users if the app remains in testing mode.
2. Create an OAuth 2.0 **Web application** client.
3. Set its **authorized redirect URI** to the Supabase provider callback:
   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
4. In Supabase **Authentication → Sign In / Providers → Google**, enable Google and enter that client ID and secret.
5. In Supabase **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect allowlist: `http://localhost:3000/auth/callback`
6. Set `NEXT_PUBLIC_APP_URL` to exactly the origin used in your browser, without a trailing slash. OAuth uses the browser's current origin for the callback so the PKCE verifier cookie stays on the same host; `NEXT_PUBLIC_APP_URL` is used for mutation-origin checks.
7. Restart the app. Select **Sign in with Google**, choose Student or Teacher, and register.

The Google redirect URI and the application's callback are intentionally different. Google redirects to Supabase; Supabase redirects back to the application. The application exchanges the PKCE code using secure cookies, preserves those cookies on the final redirect, and routes existing users to their dashboard. New users complete registration. Roles cannot be changed from the browser after registration.

Use the production HTTPS URL for Site URL, the allowlist and `NEXT_PUBLIC_APP_URL` when deploying. Add every origin you actually use (localhost, LAN IP, preview URL) to the Supabase redirect allowlist. OAuth redirects and mutation origin checks will reject mismatched origins.

### Google sign-in troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Google returns to `/?error=setup` | The account authenticated, but the `profiles` table is missing or the public Supabase configuration is invalid | Apply the migration and seed to the project matching `NEXT_PUBLIC_SUPABASE_URL`; verify the public URL and anon key; restart |
| Google returns to `/?error=auth` | Code exchange failed, the callback URL is not allowlisted, or the Google client is misconfigured | Confirm the Supabase Site URL and redirect allowlist include the exact browser origin plus `/auth/callback`; confirm the Google redirect URI is the Supabase `/auth/v1/callback` |
| Signing in on Vercel sends the browser to `localhost` | Supabase rejected the production callback and fell back to its local Site URL | Set the hosted project's Site URL to `https://thinkora-new.vercel.app` and add `https://thinkora-new.vercel.app/auth/callback` to Redirect URLs; changing Vercel variables alone does not update Supabase |
| `PGRST205` or `Could not find the table 'public.profiles'` | The migration was applied to a different Supabase project or not applied at all | Run all files in `supabase/migrations/` in order, then `supabase/seed.sql`, in the project matching `NEXT_PUBLIC_SUPABASE_URL` |
| `42703` such as `column courses.course_kind does not exist` | The database has only the initial schema; later migrations were not applied | Apply all remaining migrations through `008` (or `npx supabase db push`) to the project matching `NEXT_PUBLIC_SUPABASE_URL` |
| Redirected to `/` and then immediately back to `/register` | An old production build statically cached the registration redirect | Rebuild and restart; `/register` is dynamic in the current code |
| Registration reports that the server is not configured | `SUPABASE_SERVICE_ROLE_KEY` is missing | Add the service-role key to `.env.local` and restart |
| OAuth works on one host but not another | The browser origin differs from the allowlisted callback | Use one origin consistently, or add each origin to the Supabase allowlist and `NEXT_PUBLIC_APP_URL` |
| Syllabus upload fails on Vercel with `413 FUNCTION_PAYLOAD_TOO_LARGE` | An older build sent the whole file through the Next.js API route | Redeploy the current build; uploads now go directly to Supabase Storage and only metadata reaches the API |
| Upload fails with `mime type application/octet-stream is not supported` | The browser reported an empty file type and the bucket allowlist rejected it | Redeploy the current build; the client now labels the upload with the validated extension MIME type |
| Upload processing says the file could not be found | The signed ticket expired (two hours) or an abandoned upload was cleaned up | Select the file and upload it again; processing retries after a lost response return the saved course |

## 3. AI service

```dotenv
GEMINI_API_KEY=your-server-only-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Google retires older models for new projects: `gemini-2.5-*` now returns 404 for newly created keys, so use a current model such as `gemini-3.5-flash-lite` or `gemini-3.8-flash`. The key is read only from the server environment (`GEMINI_API_KEY`), never from browser code, and is never logged or returned in API responses. The integration uses the official `@google/genai` SDK with `GEMINI_MODEL` required; there is no implicit fallback to another provider or model. Leave an existing key untouched when configuring a project.

All AI requests originate on the server. API responses use Zod-validated structured output (`responseJsonSchema`) and are re-validated locally. Student input and syllabus documents are explicitly treated as untrusted data, not instructions. The provider receives the selected curriculum and relevant learning evidence, not profile names or guardian contact information.

- **Syllabus extraction:** PDF and image content is processed using native Gemini inline file input. DOCX is checked for expanded archive size and extracted with Mammoth; TXT and pasted text are supported. A one- or two-word topic such as “Physics” or “Linear algebra” is enough to request a focused course; an unspecified level defaults to introductory and is stated in the draft description. Blank text still requires an upload. File size, signatures and supported extensions are validated. Extraction is independently reviewed for content accuracy and source alignment; prerequisite graphs are checked for missing references, duplicates and cycles. The result stays a draft until the student approves it.
- **Direct uploads:** the browser sends the file straight to the private Supabase Storage bucket using a short-lived signed upload URL. The app server issues that URL plus a signed ticket bound to the owner, path, exact byte size and a two-hour expiry. Processing downloads the stored file, re-checks the size, magic bytes, DOCX archive limits and allowed MIME type, then calls Gemini. Uploads therefore bypass the hosting provider's request-body limit; only small JSON metadata reaches the Next.js API. Files abandoned before processing are removed after 24 hours. Repeating a processing request after a lost response returns the already-saved course instead of creating a duplicate.
- **Question generation:** the approved concept, prerequisite content, prior reasoning, misconceptions, difficulty, previous lesson and question history inform each new question. Seeded reviewed questions provide calibration examples. A separate AI verification pass recomputes the solution and checks ambiguity, syllabus alignment, duplicates, options, lesson accuracy and answer leakage. Invalid questions are regenerated; failures do not advance a session.
- **Evaluation:** two separate AI calls evaluate the final answer and written reasoning. The answer grader does not receive the reasoning. The reasoning grader receives both but is instructed to assess understanding independently. Correct guesses with flawed reasoning receive limited evidence credit.
- **Failure behavior:** missing credentials, refusals, timeouts, invalid structured responses or failed verification return an actionable error. There is no fake grade or hardcoded AI response. Existing lessons, drafts and learning evidence remain intact.
- **Project without free-tier access:** a key can be valid while its Google project returns `403 PERMISSION_DENIED` (“The Gemini API free tier is not available for this project”). Enable billing for that project at [Google AI Studio billing](https://aistudio.google.com/billing) or use a key from a project that has Gemini access. This is a project-level limit, not a code or model problem.
- **Rate limits and quota:** HTTP 429 (`RESOURCE_EXHAUSTED`) returns an actionable message asking the learner to wait or to check the project's limits and quota in Google AI Studio. Requests are never retried indefinitely; only transient 5xx errors are retried once. A failed request never writes an answer, evaluation or mastery update.
- **Credential errors:** an invalid, expired or restricted key returns a specific key or project-permission message. An unknown `GEMINI_MODEL` returns a model-unavailable message. Errors include no raw provider text, key material or student content.
- **Provider storage:** Gemini requests set `store: false`. Provider processing/retention policies still apply.

## 4. Teacher/student connections

Both directions use the same acceptance flow, for every age group:

1. **Student sends:** enter a Teacher ID such as `THT-1234AB5678` on Home. The teacher sees an incoming request and can **Accept** or **Reject**.
2. **Teacher sends:** enter a Student ID such as `TH-1234AB5678` under Students. The student sees the invitation on Home and can **Accept** or **Reject**.
3. On acceptance, the teacher's **published** courses appear in the student's Courses page. The teacher can open the student's progress, answers/reasoning, mastery and misconceptions for predefined courses and that teacher's courses.
4. Pending and rejected requests grant neither course access nor progress access. The sender cannot accept their own request. Sending again preserves an active request; a rejected or disconnected request can be reopened for a fresh decision.
5. The student can withdraw a pending request or disconnect at any time. Disconnecting removes shared-course and teacher-progress access while preserving saved learning history.

Student-created courses, other teachers' courses, source uploads and private profile fields remain private. The server and PostgreSQL RLS enforce the same boundaries. ID lookup responses do not reveal unconnected accounts.

**Upgrading an existing installation:** apply migration `008` before deploying this version, after `005` and `007`. It converts old `pending_guardian` requests that already have both parties' agreement into approved connections, preserves requests still awaiting a recipient, and retires old email confirmation links. It does not fabricate guardian approval or delete learning progress. Guardian email is no longer collected during registration; previously stored profile values are preserved.

For a hosted installation still missing `teacher_code` or `course_kind`, run `node scripts/build-connection-upgrade.mjs`. Paste the generated `supabase/.temp/connection-flow-upgrade.sql` into the project's Supabase SQL editor and run it once. It applies `005`, `007` and `008` together in a transaction. The generated file is ignored by Git and Vercel; the migrations remain the source of truth.

## How adaptive learning works

### Mandatory diagnostic

Every new course enrollment starts in `diagnostic` status with its own persisted assessment and session. The initial check is only **3 short questions** focused on one idea each; they stay easy or medium and ask for a brief explanation, not multi-step work. The result is an initial estimate only: every later lesson answer continues to update mastery, misconceptions and difficulty. Unassessed concepts are never automatically labeled mastered.

Completion stores the diagnostic summary, starting concept and suggested mode. Re-enrolling or resuming returns the same enrollment and session; it cannot restart a completed diagnostic. A database guard prevents generating further diagnostic questions after completion.

### Two modes, one learner model

- **Learn from scratch:** short explanations, worked examples, checks, alternative explanations and targeted follow-ups.
- **I already know some concepts:** focused checks and gap-oriented instruction, skipping concepts with demonstrated mastery.

Both modes use the same saved evidence and prerequisite graph. The diagnostic suggests an initial approach. Switching modes preserves the current question, learner model and history and takes effect on subsequent steps.

### Explainable mastery

For each response:

```text
evidence = 0.35 × answer_score + 0.65 × reasoning_score
flawed reasoning → evidence capped at 0.40
incorrect answer → evidence capped at 0.50
partially correct answer → evidence capped at 0.70
explicit “I don't know” → zero evidence

question weight: easy 0.8, medium 1.2, hard 1.6
alpha = 1 + 0.95 × (previous_alpha − 1) + weight × evidence
beta  = 1 + 0.95 × (previous_beta  − 1) + weight × (1 − evidence)
mastery = alpha / (alpha + beta)
```

The Beta(1,1) prior and 5% decay of earlier evidence prevent one response from deciding mastery and allow later understanding to overcome earlier mistakes. Unassessed concepts have no score. A concept is **mastered** only at 80% or more, with at least three correct answers supported by sound reasoning and no active misconception. Dependent concepts unlock only after prerequisites meet these criteria.

Misconceptions have stable keys, quoted evidence, recurrence counts and persistent status. A directly relevant, correct answer with sound reasoning supplies one correction confirmation. **Two different later questions** must confirm it; recurrence resets confirmations and reactivates the misconception.

### Spaced repetition

Weak performance or active misconceptions schedules a one-day review. Developing understanding starts around three days; strong understanding around seven. Successful reviews multiply intervals using a bounded ease factor; lapses reset the interval. Intervals are bounded to 1–90 days. Ordinary practice cannot push an already due revision into the future. Each review updates mastery, misconception history and the revision schedule in the same transaction.

### Durable sessions

The database stores the exact current question, lesson, next teaching action, latest feedback, selected mode and unfinished answer/reasoning draft. Drafts are debounced to the server while typing. A per-enrollment lease prevents competing AI operations across tabs. `commit_answer` atomically writes the answer, evaluation, mastery, misconception changes, revision schedule, diagnostic state and session pointer. A unique question/attempt constraint makes submission retries idempotent. Any database failure rolls back the entire learning update.

## Screens and journeys

- `/` — Google login and configuration status.
- `/register` — student/teacher registration and unique Student ID creation.
- `/dashboard` — student profile, exact-session continuation, courses, mastery, weak concepts and revision schedule.
- `/courses` — search by class, subject, course and concept; enrolled/custom course filters.
- `/courses/upload` — real file/text extraction.
- `/courses/[id]` — syllabus content, prerequisites, graph, draft review/approval and enrollment.
- `/learn/[id]` — mandatory diagnostic, personalized teaching, answer + reasoning, AI feedback and automatic persistence.
- `/progress` — React Flow concept graph, Recharts charts, mastery criteria, misconceptions and answer history.
- `/revision` — prioritized due and upcoming reviews.
- `/connections` — student monitoring approvals and revocation.
- `/teacher` — actual stored class/student progress, class filters, gaps and common misconceptions.
- `/teacher/classes` — class creation and Student ID invitations.
- `/teacher/students/[id]` — authorized individual learning records.
- `/guardian/consent` — explains that old email links have been retired and directs users to the app.
- `/setup` — credential presence checklist; never displays secrets.
- `/privacy` — what is stored, what is sent to the AI provider, and how monitoring works.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
```

- **Learning tests** cover all five answer/reasoning cases, diagnostic adaptation/stopping, prerequisites, course completion criteria, misconception correction/recurrence, revision success/lapses, mandatory reasoning and connection authorization rules.
- **Connection/database tests** execute the shipped migration and seed in PGlite (actual PostgreSQL compiled to WASM), with minimal Supabase-owned `auth`/`storage` facade objects. They verify both request directions for adult and under-18 students, recipient-only acceptance, rejection/reopening, shared course and progress access, revocation, migration of existing requests, RLS/privileges, private uploads, atomic answer persistence/rollback, idempotency, leases, diagnostic resume, mode switching and rate limits. This validates application SQL, not live Supabase Auth/Storage integration.
- **Upload tests** cover signed-ticket issuance, tampering/expiry rejection, direct-storage processing, size-mismatch cleanup, missing-file recovery, lost-response idempotency, provider failure cleanup and the legacy multipart path.
- **Browser tests** run desktop and mobile Chromium checks on the actual public application: landing/setup/privacy layout, absence of horizontal overflow, protected-page redirects, OAuth callback error/cancellation handling and cross-origin mutation rejection. They do not simulate authenticated service success.

External Google OAuth, Supabase service connectivity, Gemini model responses and document extraction require configured accounts to verify end to end. Check `/setup` for presence, then run this real-service acceptance journey:

1. Student Google login → registration → Electricity course → diagnostic → answer with reasoning → feedback → reload and confirm the same saved step.
2. Finish the diagnostic → confirm no repeated diagnostic on resume → switch modes → teach/retest → observe mastery and misconception history.
3. Upload a real syllabus → review generated concepts and graph → approve → new-course diagnostic.
4. Complete a revision → verify mastery changes and the new review date.
5. In a different Google account, register as a teacher → publish a course → invite Student ID → verify the student sees Accept/Reject and neither side has shared access until acceptance.
6. Accept from the student account → verify the teacher's published course appears and the teacher can view progress → disconnect → verify shared access disappears.
7. Send a new request from the student using the Teacher ID → reject from the teacher account → resend → accept from the teacher account → verify both course access and progress sharing.

Mobile CSS includes 16px form inputs, dynamic viewport units, safe-area padding, touch-friendly targets, hover-capability-aware Tailwind styling, selectable content and reduced-motion handling. Browser emulation is checked; Safari keyboard, notch behavior and touch interactions still require testing on physical phones.

## Production run

### Vercel deployment

The public production address is **https://thinkora-new.vercel.app**. Use this address when sharing the app and starting Google sign-in.

1. In the Vercel `thinkora-ai` project, set the **Production** environment variable `NEXT_PUBLIC_APP_URL` to `https://thinkora-new.vercel.app`. Configure the Supabase and Gemini variables listed above in Vercel's environment settings.
2. Open the hosted project's [Supabase Authentication → URL Configuration](https://supabase.com/dashboard/project/usouptqhoqrbdqmieyph/auth/url-configuration):
   - **Site URL:** `https://thinkora-new.vercel.app`
   - **Redirect URLs:** add `https://thinkora-new.vercel.app/auth/callback`
   - Keep `http://localhost:3000/auth/callback` as an additional redirect only if you also use local development.
3. In Google Cloud, the web client's authorized redirect URI is `https://usouptqhoqrbdqmieyph.supabase.co/auth/v1/callback`. To accept users outside a test-user list, configure an **External** audience and publish the OAuth app to **Production**, completing any verification Google requires.
4. From the linked project directory, run `vercel --prod`. Vercel environment changes require a new deployment; Supabase URL configuration changes take effect separately and do not require rebuilding the app.
5. Open the public address in a private browser window and start a fresh sign-in. Confirm the final address stays on `thinkora-new.vercel.app` and that a new user reaches registration.

Supabase falls back to its Site URL when `redirect_to` is not allowed. If that Site URL is still `localhost`, the browser leaves Vercel before the application's callback can run. Both hosted Supabase settings above must be saved; editing the local `supabase/config.toml` alone does not change them.

`.vercelignore` excludes local environment files and generated artifacts from source uploads. Production credentials come from Vercel's environment settings.

### Launch checklist

- [ ] Apply migrations through `008` and the seed; `/setup` shows all three credentials as present.
- [ ] Confirm the private `syllabuses` bucket exists with a 10 MB limit and the PDF/PNG/JPEG/WebP/DOCX/TXT allowlist (created by migration `001`).
- [ ] Set the Supabase **Site URL** and **Redirect URLs** to the production origin and `/auth/callback`.
- [ ] In Google Cloud, publish the OAuth consent screen to **Production** with an **External** audience (or keep it in testing with an explicit test-user list).
- [ ] Set every Vercel **Production** environment variable and redeploy; environment changes do not affect an existing deployment.
- [ ] Confirm `/`, `/privacy` and `/setup` return 200, and `/dashboard` and `/teacher/students` redirect signed-out visitors to `/`.
- [ ] With two real Google accounts, send and accept a connection in both directions; verify the shared course and progress access, then disconnect.
- [ ] Create a course from pasted text and from a real PDF/DOCX/TXT upload; approve/publish it and start the diagnostic.
- [ ] Set `NEXT_PUBLIC_SUPPORT_EMAIL` in Vercel Production and redeploy so `/privacy` shows your support/data-deletion contact; enable Supabase backups and set Gemini/Vercel budget and quota alerts.
- [ ] Start with a small tester group before opening registration broadly.

### Other Node.js hosts

```powershell
npm run build
npm run start
```

Deploy to a Node.js host that supports Next.js 16 and up to 240 seconds for synchronous AI syllabus work. Syllabus files upload directly to Supabase Storage, so the app server only receives small JSON requests and does not need a large request-body limit. Add the same secrets to the host, set the HTTPS app URL, apply migrations/seed, configure OAuth, then rebuild and restart. Do not deploy `.env.local` or expose private API keys.

Database and storage operations are protected with RLS plus explicit server authorization. Mutations enforce same-origin requests. Question solutions and grading RPCs are inaccessible to browser roles. Privileged functions explicitly revoke `PUBLIC`, `anon` and `authenticated` execution. AI and invitation usage is rate-limited in PostgreSQL, so limits are shared across server instances. Cookie-backed pages and APIs use private/no-store caching; legacy guardian links retain a no-referrer policy.

The installation operator controls retention, deletion requests, backups and provider accounts. Publish your operator contact details and applicable policy before opening registration to your students.

## Architecture

```text
src/app/                  App Router pages, OAuth routes and authenticated API router
src/components/           Student/teacher experiences, charts, graph, shared UI
src/components/ui/        shadcn/ui reusable primitives
src/lib/learning/         Pure adaptive engine, schemas and graph validation
src/lib/auth-flow.ts      Pure profile-to-destination routing for OAuth and pages
src/lib/server/           Server-only auth, AI, data access, learning, uploads, consent
src/lib/supabase/         Browser/server Supabase clients and response-bound OAuth client
src/proxy.ts              Auth cookie refresh and private caching
supabase/migrations/      Schema, permissions, published catalogue and atomic transactions
supabase/seed.sql          Complete Electricity syllabus and reviewed question bank
scripts/                   Catalogue sources, migration generator and hosted seed/verification
tests/                    Learning rules and real SQL persistence/authorization tests
tests/e2e/                Public browser and route-protection checks
```

No payments, leaderboards, gamification or unrelated product features are included.
