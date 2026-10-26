# Reliable academic authoring implementation plan

> **For agentic workers:** Use superpowers:executing-plans for owned tasks. The user approved proceeding without a separate design review.

**Goal:** Make the existing application dependable to start, enforce authenticated course access, and provide an auditable question approval workflow with a clearer repository UI.

**Architecture:** Keep FastAPI, SQLite and React. Add focused access, question-review, duplicate-detection and database-operations modules. Preserve existing question data and the Snap & Scan implementation.

**Spec:** User-approved priorities in this chat: access control, startup reliability, academic question quality, scan review, faculty approval, repository scale and regression coverage, plus restrained UI polish.

**Tech stack:** Python/FastAPI/SQLAlchemy/Pydantic, SQLite, React/Vite/Tailwind/KaTeX, Windows PowerShell.

## Global constraints

- Follow DEVELOPER_DANNY.md and ANTI_AI_CODE_RESTRICTIONS.md.
- No data loss, implicit approvals, fabricated answers, or production mock services.
- Keep zinc/slate academic styling and accessible forms, dialogs, loading/error states.
- Preserve existing API list responses; introduce a separate paginated endpoint.
- Existing questions become DRAFT rather than silently receiving academic approval.
- Only an administrator may approve; content edits invalidate previous approval.
- Existing local uncommitted work remains intact; no commits or deployment requested.

## Review focus

- Authentication applies to upload, batch mutations, paper download and AI endpoints as well as lists.
- Faculty cannot access unassigned courses through indirect question, unit, outcome or paper IDs.
- Review transitions and edits write history atomically; stale approval cannot survive content changes.
- Pagination/sort/search/counts refer to the same course, and changing filters clears stale selection.
- Startup dependencies use one local interpreter, show actionable errors and never claim success before health checks.

## Tasks

- [x] Write failing access-control tests; enforce authentication, admin registration, course assignments, strong secret configuration and explicit demo mode; integrate signed-in/out frontend behavior.
- [x] Write failing SQLite backup tests; implement local virtual-environment setup, startup preflight and health checks, online backup and guarded restore; document operations.
- [x] Write failing review/pagination/duplicate tests; add DRAFT/REVIEWED/APPROVED state, normalized history, validation, transitions and duplicate checks. Compose/swap only approved same-course questions.
- [x] Add paginated repository controls, review drawer/history, inline errors, accessible confirmations and better scan review. Wire duplicate feedback and authenticated PDF downloads.
- [x] Run backend regressions, frontend build/lint, browser checks and a fresh security-boundary review. Address confirmed issues and leave the application running with a health check.

## Delivery boundaries

Verified answer generation and semantic Bloom verification cannot guarantee correctness; retain explicit instructor review and identify template-based output. No automatic approval or inferred answer key. Backup restore is an explicit offline operation and is never run against the user's live repository as a test.
