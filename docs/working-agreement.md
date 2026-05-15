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

The original working agreement reflected a careful mode appropriate for shared codebases with active users. GeoTrenza is pre-launch with no live fleet, no real customer data, and feature-branch work where regressions get caught by tests in seconds. The original agreement's verification discipline was over-applied and added hours of friction without catching real problems.

This section updates the operating mode to match the actual risk profile.

### Principles

1. **Pre-launch risk tolerance.** Cost of breaking something on a feature branch is "fix forward in 10 minutes." Cost of constant verification is hours adding up to days. Move fast. Trust tests.

2. **Trust the tests.** If tests pass, ship. If they break, fix forward. Don't add verification steps that duplicate what tests already cover.

3. **No mid-stream approval gates within a sub-step.** Claude Code reads, writes, tests, commits, and pushes in one prompt cycle. Approval only at architectural decision points where there are real consequences I (Claude in conversation) can't predict.

4. **Act on known information, don't double-check.** If something is established in the conversation, in committed docs, or in memory, use it. Don't ask Claude Code to re-verify what's already known.

5. **Answers are direct.** When I'm answering questions, I give the answer plus key reasoning. Not exhaustive analysis of every angle. If Ishar wants more depth, he asks.

### Exceptions where the old discipline still applies

These contexts retain the original verification rigor because "fix forward" is harder:

1. **Production-touching changes.** Migrations against gps_services, EC2 deploys, anything that mutates state the team can't easily roll back. Verify state before, after, and with care.

2. **Cutover work (Phase D).** The transition from legacy ingestion to v2 ingestion in production. One-way door.

3. **Session resume.** First action of a new session always verifies filesystem state to catch drift (commits, branch state, working tree). Cheap, catches real surprises.

4. **Genuinely unknown territory.** When a decision involves something I don't actually know — e.g., how a third-party library behaves, what a specific Postgres error code class includes — ask once, not repeatedly.

### What this changes in practice

- Claude Code's reads, writes, tests, commits within a single sub-step happen without pause for Ishar approval. Approval comes at sub-step boundaries (or when a real design question surfaces), not at every Bash call.
- I (Claude in conversation) stop demanding Claude Code "show me before commit" / "verify before edit" / "let's pause and check X" unless there's a real reason. The default is "go."
- Documentation pauses are still valuable at logical checkpoints (end of sub-step, end of step, end of session). Those stay.
- The session log discipline stays — end-of-session log captures the day's work durably.

### What this does NOT change

- The "anything substantive goes to docs/" principle. Decisions, design rationale, and learnings still land in docs.
- The per-commit-per-sub-step granularity for bisect/revert.
- The end-of-session log discipline.
- The bigint-as-string convention and other established code patterns.

### Original agreement remains valid

The original working agreement above remains the foundation. This revision changes the operating mode (how fast we move within the agreement) without changing the underlying values (verify when stakes are high, write down what matters, treat each other with care).
