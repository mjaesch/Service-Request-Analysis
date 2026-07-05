# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is currently just a skeleton (`README.md`, `LICENSE`, `.gitignore`) — no implementation exists yet. The actual task spec lives locally in `message.md` (gitignored, not committed — it's the take-home assignment brief) and working notes are in `todo.md` (also gitignored). Read both before starting implementation work; they are not visible in `git log`/`git show` since they were never tracked.

## The task (from `message.md`)

Build a small **Service Request Analysis** prototype: given a free-text service request (German), detect the machine model and error code, match against a local `service_cases.json`, enrich with spare-part info from a local `parts.json`, and return a structured recommendation.

Feature priority order (get earlier items right before later ones):
1. Input handling for a service request text
2. Extraction of machine model + error code (e.g. `R-500`, `E42`)
3. Matching against provided service cases
4. Spare part enrichment from parts data
5. Structured output (causes, checks, parts, short internal recommendation)
6. Graceful handling of missing/unknown machine or error code

Expected output shape (see `message.md` for the full example):
```json
{
  "detected_machine": "R-500",
  "detected_error_code": "E42",
  "matched_case_id": "case-001",
  "probable_causes": ["..."],
  "recommended_checks": ["..."],
  "recommended_parts": [{"part_number": "P-1001", "name": "...", "stock": 12, "price": 89.90}],
  "answer_for_employee": "..."
}
```

Constraints from the brief worth keeping in mind while implementing:
- Time-boxed exercise (3–4h) — favor a coherent, unfinished prototype over an over-engineered one.
- Stack is open (TypeScript/NestJS/Express/Mastra/n8n, Python/FastAPI/LangChain, or a plain script) — no stack has been chosen yet in this repo.
- LLM usage is optional; if used, the README must state where/why.
- Commit history should show incremental work, not a single squashed commit.
- The submission's own `README.md` must cover: running instructions, which parts are deterministic logic vs. AI/LLM logic, AI tooling usage, and a "next 4 hours" section.

## Notes for future sessions

- `KI_Profil.md` is the user's personal CV/profile summary (German) — unrelated to the codebase, gitignored, not part of the prototype.
- Once a stack is chosen and code exists, update this file with real build/lint/test commands and the actual architecture — don't leave the stale placeholder sections above once they're superseded by real code.
