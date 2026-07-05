# Service-Request-Analysis
Takes a short, free-text service request (German), extracts the machine model + error code + symptoms,
matches it against known service cases, enriches the result with spare-part info, and returns a
structured recommendation for an internal employee.

## Assumptions

- Input is a single free-text `message` string (no conversation history/multi-turn handling).
- `service_cases.json` and `parts.json` are small, static, local files — loaded fresh on every run rather
  than cached or indexed.

## Running instructions

```bash
npm install
cp .env.example .env   # then fill in your own OPENAI_API_KEY
npm run cli            # runs the example request + one unknown-input request
npm run cli -- "<your own service request text>" # auf das leerzeichen achten sonst klappt es nicht
# another example request: 
npm run cli -- "Mein Reinigungsroboter startet nicht seinen REinigungsdurchgang, kannst du mir weiterhelfen?"
```

Each step of the workflow logs to the console as it runs (extraction → match → enrich → respond)

## Architecture

A 4-step [Mastra](https://mastra.ai/) workflow (`src/mastra/workflows/service-request-workflow.ts`):

1. **extract** — an OpenAI-backed agent (`src/mastra/agents/extraction-agent.ts`) pulls `machine`,
   `error_code`, and a list of `symptoms` phrases out of the raw text as structured output.
2. **match** — `src/lib/match.ts` matches the extraction against `data/service_cases.json`.
3. **enrich** — `src/lib/enrich.ts` looks up compatible, in-stock spare parts from `data/parts.json`
   for the matched case.
4. **respond** — a second OpenAI-backed agent (`src/mastra/agents/response-agent.ts`) drafts the
   short internal recommendation text and the final structured JSON is assembled.

## Design Decisions
- **Framework**: Mastra can be used in a lightweight way to structure Typical AI Workflows, so it was decided to be fine for this prototype.
- **Deterministic**: matching against `service_cases.json` and enriching with `parts.json`. Real
  OpenSearch wasn't set up for this prototype (would've been overkill for a 3-4h exercise with a 3-row
  dataset) — instead `src/lib/match.ts` mocks an OpenSearch-style `bool` query: `filter` on exact
  `machine` + `error_code`, falling back to a `should`-style match-query score (query-term coverage) over
  `symptoms` when there's no exact field match. This is deliberately simple/inspectable rather than a
  real BM25 implementation.
- **AI/LLM**: extracting `machine`/`error_code`/`symptoms` from free text, and drafting the final
  `answer_for_employee` text. These are genuinely free-text/NLU problems that don't have a clean
  deterministic solution.
- **Unknown machine/error code**: if no service case matches, the enrich step is skipped and the respond
  step returns a deterministic fallback message (no LLM call) telling the employee to escalate manually —
  avoids the LLM inventing causes/checks for a case that doesn't exist.

### AI Usage
- Claude Code to help with Planning, DevOps and Programming
- OpenAI API for the LLM Processing steps


## Notes on current implementation
Symptoms aren't recognized correctly, "seit gestern" is not a Symptom. This can be fixed by a variable "timeSpan" or a Hint in the Prompt. (Fixed in a later commit) <br>
The recommendations are not really guided in a meaningfulway and the LLM just decides the order they should be done. If more concrete Instructions are given and saved to the service cases, that would improve the recommendations significantly.  <br>
z.B. "Für die Anfrage konnte kein passender Servicefall gefunden werden (Maschine: X-900, Fehlercode: E99). Bitte manuell prüfen oder an den zweiten Support-Level eskalieren." <br>
    - the "zweites Support Level" is something made up, the real procedure could be added to the Prompt for example.

## Next Steps for real implementation
- First: gather real intake data on how requests are currently matched manually by people and collect test cases to optimize
  against (ideally with some automated eval loop). Nail down the exact use case and also the willingness for users to adopt an AI solution — this matters a lot for
  project success, more than any implementation detail below.

- Replace the mocked matching with a real OpenSearch index once real data and query patterns are known.
- Use more of Mastra's features (e.g. caching) to improve response time for real-world use.
- Add logging/tracing (e.g. Langfuse) to track responses over time and optimize prompts.
- Depending on requirements, move the zod schemas to schemas sourced from a DB — useful if schemas change
  often or steps need to be reused/reconfigured without a code change.
- Add automated tests for `src/lib/match.ts` and `src/lib/enrich.ts` (pure functions, cheap to test) and a
  couple of fixture-based tests for the full workflow with a mocked agent response.

- add new features for example interactivity, if there is missing information such as the machine