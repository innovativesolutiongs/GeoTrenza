# Working Agreement — GeoTrenza Project

This document captures how the project owner (Ishar) and Claude work together. It is meant to prevent recurring confusion about project state, decisions, and process.

## Core Principle

**Anything that needs to survive a conversation must be written to a file in `docs/` or a tracking doc.** Chat history is ephemeral and cannot be relied on as a source of truth.

Specifically:
- Project roadmap → `docs/migration-plan.md`
- Architectural decisions → `docs/<topic>.md` (e.g., `docs/schema-v2.md`)
- Bug tracking → `backend/test/STAGE_2_KNOWN_BUGS.md`
- Protocol specs and external references → `docs/protocols/`
- Working agreement → this file (`docs/working-agreement.md`)
- Per-session work logs → `docs/session-logs/<date>.md` (new pattern starting today)

If a decision is made in chat and not written down, treat it as not decided.

## Claude's commitments

1. **Check `docs/migration-plan.md` at the start of every new session** to ground in current stage state. Do not reason about stages from memory alone.

2. **Verify project structure assumptions against the filesystem.** Before making claims about what exists in `docs/`, what bugs are tracked, what commits have landed — check.

3. **Write substantive decisions to disk immediately, not later.** When the user and I agree on something important, the next action is "write it to the appropriate doc," not "we'll capture this later."

4. **Surface uncertainty explicitly.** When I don't know something (a stage definition, a file's existence, the contents of memory), say so before making decisions that depend on it.

5. **No "side-gig" work without explicit user consent.** Per Ishar's direction: focus on actual development progress, not infrastructure tooling detours. Setup tasks that exceed ~5 minutes with no clear end get escalated, not pursued.

6. **Apply consistent principles across decisions.** The "don't invest in code being thrown away" principle that drove Bug 4, Bug 7, and Bug 8/9 deferral decisions should apply uniformly. If I'm tempted to make an exception, name it explicitly.

## Ishar's commitments

1. **Don't assume Claude saves chat history across sessions.** Claude's context is limited to what's in `docs/`, memory entries, and the current conversation. If something feels important, ask "is this written down?"

2. **Flag inconsistencies when noticed.** If Claude says something that contradicts a doc, the doc, or earlier context, surface it. Claude's reasoning gets sharper when checked.

3. **Approve each Claude Code action explicitly.** No blanket "yes to all edits during this session" — each change earns its own approval. This is the discipline that has prevented several near-mistakes in this project.

4. **Tell Claude when you don't remember something.** It's better to admit fuzzy recall and have Claude verify against `docs/` than to confidently misremember.

## Session ritual

**At the start of each session:**
1. Claude reads `docs/migration-plan.md` to confirm current stage status
2. Claude reads the most recent `docs/session-logs/*.md` entry to load context from last session
3. Claude reports current stage status to Ishar before proposing any work

**At the end of each session:**
1. Write a session log entry to `docs/session-logs/<YYYY-MM-DD>.md` capturing:
   - What got accomplished
   - What decisions were made (and why)
   - What's pending or in flight
   - What I'd start with next session
2. Commit and push the session log
3. Confirm Ishar has read or at least skimmed the log before closing out

## When working agreement is violated

If either of us breaks the agreement (Claude makes claims without checking, Ishar gives blanket approval, decisions made in chat that don't get written down), the other should call it out. The point isn't perfection — it's noticing when we slip and correcting course.

## Living document

This agreement is not fixed. As we learn what works and what doesn't, we update it. Changes go through commit history so we can see how the working pattern evolved.

---

## Operating Mode Revision — 2026-05-15

GeoTrenza is pre-launch. No live fleet, no customer data, structured logging in place. The cost of breaking something is "fix forward in 10 minutes" — including in production. The cost of pre-flight verification gates is hours that compound across the project.

This section replaces the original working agreement's verification discipline with a single principle.

### Principle

**Ship. Watch the logs. Fix what breaks.**

This applies to feature-branch work, production deploys, migrations, cutover — everything. The instrumentation we built (pino structured logs, handler error categorization, success metrics) is the verification. We don't need pre-flight gates because we have post-flight observability.

### What this means in practice

- Claude Code reads, writes, tests, commits, pushes, and deploys in one cycle. No mid-stream approval gates.
- I (Claude in conversation) stop demanding verification reads before edits, state checks before commits, or "let me confirm X before proceeding" pauses. The default is "go."
- Production deploys happen as soon as code is ready. We don't sit on changes "to be safe."
- Migrations run when ready. If they break, we revert (TypeORM migration:revert) or fix forward.
- When something breaks, the logs tell us what and where. We fix it. We don't add a verification gate to prevent that class of break in the future — we add an alert.

### Session resume

First action of a new session still verifies filesystem state (git status, last commit, test count). This is cheap and catches drift between sessions. Not a verification gate — just a "where did we leave off" pose.

### Documentation

The "anything substantive goes to docs/" principle stays. End-of-session logs stay. Per-commit granularity stays. Speed doesn't excuse losing track.

### Why the original agreement was wrong about this

The original agreement assumed verification catches problems cheaper than post-hoc fixes. For pre-launch work with structured logging, the opposite is true: post-hoc fixes are cheap, verification gates are expensive. We were optimizing the wrong side of the tradeoff.
