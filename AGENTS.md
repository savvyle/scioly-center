<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Architecture
- Question removal updates only its soft-delete status; the event-filtered Removed queue restores to review without touching content, attempts, or closed reports, and both editors can reset unsaved changes (why: accidental removal must be recoverable without publishing unreviewed edits).
- Explanations store Markdown as a complete feedback entry and render with React Markdown and deduplicated KaTeX/mhchem without raw HTML (why: preserve paragraphs and scientific formulas safely, with chemistry macros registered on the same renderer).
- The coach queue shares an event filter across Needs review and Reported tabs (why: staff can focus on an event without loading the full question bank).
- Sign-in uses username mapped to `<username>@kls.local`; public signup is disabled and accounts are created by coach-only server functions (why: no student PII).
- Leaderboard and weekly windows are computed from attempts in SQL (`weekly_leaderboard`, `week_bounds`), not snapshotted by a cron job (why: no recurring job needed, history is always exact).
- Spaced repetition state is updated by a database trigger on attempts (why: drill and mock answers both feed it consistently).
- Test PDFs are parsed by an AI server function (`src/lib/parse.functions.ts`); low-confidence or image-dependent questions go to the review queue.
- Original answer formats and points are stored per question; authenticated check-answer functions grade and save committed answers, with AI grading and reference answers confined to server modules (why: consistent scoring and uncommitted selections never count).
- Aggregate team SQL excludes coach roles while personal reports retain their practice (why: coach testing must not distort student progress).
- Practice lives at /practice; legacy /drill and /mock URLs redirect there (why: preserve published links after renaming Practice and removing the archive page).
- Division defaults share one constant, while Practice scopes Division C candidates against the bundled Division B syllabus before displaying them (why: defaults do not block relevant cross-division practice).
- New uploads identify metadata from the PDF and source names before syllabus-based parsing; only missing division defaults, while unknown year/tournament/level stay empty (why: one-input uploads must not invent archive filters).
- Explicit parent question numbers are combined after extraction; merged legacy rows retain a replacement pointer so answer history is not deleted.
- Saved questions are owner-scoped persistent bookmarks with RLS; competition years remain numeric end-years and share a school-year display formatter.
- Practice starts with explicit filter configuration requiring at least one event; skips only exclude a question for the current pass and never write attempts or review state (why: practice must stay event-scoped and skipped work must stay due without distorting scores).
- Source question numbers/pages are stored independently of display stems; mastery reads the existing review-state boxes with box four mastered (why: preserve source citations and reuse the authoritative spaced-repetition schedule).
- Practice event/topic filters are multi-select, with event-qualified topic values and topics derived only from selected events (why: unrelated or stale topics must not enter practice).
- Question-card editing uses authenticated staff-checked server functions and school-scoped RLS; staff-supplied feedback is saved as both reusable bullets and explanation, with empty feedback clearing both (why: students cannot edit keys and feedback corrections must persist consistently).
- Archive PDF buttons reserve a tab synchronously, fetch the private file with the authenticated storage client, and open an app-origin blob URL (why: avoid blocked external storage navigation without making files public).
- Render the weekly leaderboard on the dashboard and redirect the legacy /leaderboard URL there (why: consolidate personal and team progress without breaking old links).
- Dashboard event progress joins owner-scoped student event selections to existing topic totals, preserving zero-activity selections (why: selected events must remain visible before practice starts).
- Reports attempt source-backed AI repair before unresolved coach review, with validated high-confidence corrections and an audit record (why: automate clear defects without guessing missing context).
- Choice grading is deterministic and reuses stored feedback or explanations; generated instructional feedback is persisted separately from student-specific scores (why: avoid repeat AI calls and unsafe feedback reuse).
