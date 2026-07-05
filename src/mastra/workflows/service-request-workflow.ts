import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { extractionAgent } from '../agents/extraction-agent';
import { responseAgent } from '../agents/response-agent';
import { loadParts, loadServiceCases } from '../../lib/data';
import { matchServiceCase } from '../../lib/match';
import { enrichWithParts, type RecommendedPart } from '../../lib/enrich';

const recommendedPartSchema = z.object({
  part_number: z.string(),
  name: z.string(),
  stock: z.number(),
  price: z.number(),
});

const extractOutputSchema = z.object({
  message: z.string(),
  machine: z.string().nullable(),
  error_code: z.string().nullable(),
  symptoms: z.array(z.string()),
});

const matchOutputSchema = z.object({
  message: z.string(),
  machine: z.string().nullable(),
  error_code: z.string().nullable(),
  matchedCaseId: z.string().nullable(),
  caseMachine: z.string().nullable(),
  probableCauses: z.array(z.string()),
  recommendedChecks: z.array(z.string()),
  likelyPartNames: z.array(z.string()),
});

const enrichOutputSchema = matchOutputSchema.extend({
  recommendedParts: z.array(recommendedPartSchema),
});

const finalOutputSchema = z.object({
  detected_machine: z.string().nullable(),
  detected_error_code: z.string().nullable(),
  matched_case_id: z.string().nullable(),
  probable_causes: z.array(z.string()),
  recommended_checks: z.array(z.string()),
  recommended_parts: z.array(recommendedPartSchema),
  answer_for_employee: z.string(),
});

const extractStep = createStep({
  id: 'extract-machine-and-error-code',
  description: 'Extracts machine model, error code, and symptom from the free-text service request via an LLM',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: extractOutputSchema,
  execute: async ({ inputData }) => {
    console.log('\n[1/4] extract: asking the model for machine + error code + symptoms...');
    const result = await extractionAgent.generate(inputData.message, {
      structuredOutput: {
        schema: z.object({
          machine: z
            .string()
            .nullable()
            .describe('Machine model exactly as written in the text, e.g. "R-500", or null if none is mentioned'),
          error_code: z
            .string()
            .nullable()
            .describe('Error code exactly as written in the text, e.g. "E42", or null if none is mentioned'),
          // Short, individual symptom phrases (independent of machine/error_code), e.g. ["fährt nicht zur
          // Ladestation", "Navigation ungenau"]. Kept so the match step still has a clean signal to fall
          // back on when the error code is missing/unrecognized or the machine model doesn't exist in
          // service_cases.json.
          symptoms: z
            .array(z.string())
            .describe('Short individual phrases describing the observed symptoms/problems, or [] if none are described'),
        }),
      },
    });
    console.log(
      `       -> machine=${result.object.machine ?? 'null'}, error_code=${result.object.error_code ?? 'null'}, symptoms=${JSON.stringify(result.object.symptoms)}`,
    );
    return {
      message: inputData.message,
      machine: result.object.machine,
      error_code: result.object.error_code,
      symptoms: result.object.symptoms,
    };
  },
});

const matchStep = createStep({
  id: 'match-service-case',
  description: 'Matches the extraction against service_cases.json (mocked OpenSearch-style match query)',
  inputSchema: extractOutputSchema,
  outputSchema: matchOutputSchema,
  execute: async ({ inputData }) => {
    console.log('[2/4] match: scoring against known service cases...');
    const cases = loadServiceCases();
    const { matchedCase, score, matchedTerms, reason } = matchServiceCase(
      {
        machine: inputData.machine,
        errorCode: inputData.error_code,
        // Prefer the extracted symptom phrases for the text-match fallback; they're a cleaner
        // signal than the raw message when machine/error_code weren't confidently detected.
        message: inputData.symptoms.length > 0 ? inputData.symptoms.join(' ') : inputData.message,
      },
      cases,
    );
    console.log(
      `       -> ${matchedCase ? `matched ${matchedCase.id}` : 'no match'} (score=${score.toFixed(2)}, terms=[${matchedTerms.join(', ')}])`,
    );
    console.log(`       -> reason: ${reason}`);
    return {
      message: inputData.message,
      machine: inputData.machine,
      error_code: inputData.error_code,
      matchedCaseId: matchedCase?.id ?? null,
      caseMachine: matchedCase?.machine ?? null,
      probableCauses: matchedCase?.known_causes ?? [],
      recommendedChecks: matchedCase?.recommended_checks ?? [],
      likelyPartNames: matchedCase?.likely_parts ?? [],
    };
  },
});

const enrichStep = createStep({
  id: 'enrich-with-parts',
  description: 'Looks up compatible spare parts from parts.json for the matched case',
  inputSchema: matchOutputSchema,
  outputSchema: enrichOutputSchema,
  execute: async ({ inputData }) => {
    console.log('[3/4] enrich: looking up spare parts...');
    if (!inputData.matchedCaseId || !inputData.caseMachine) {
      console.log('       -> skipped (no matched case)');
      return { ...inputData, recommendedParts: [] };
    }
    const parts = loadParts();
    const recommendedParts = enrichWithParts(inputData.caseMachine, inputData.likelyPartNames, parts);
    console.log(
      `       -> ${recommendedParts.length} part(s): ${recommendedParts.map((p: RecommendedPart) => p.part_number).join(', ')}`,
    );
    return { ...inputData, recommendedParts };
  },
});

const respondStep = createStep({
  id: 'draft-employee-recommendation',
  description: 'Drafts the internal recommendation text and assembles the final structured output',
  inputSchema: enrichOutputSchema,
  outputSchema: finalOutputSchema,
  execute: async ({ inputData }) => {
    console.log('[4/4] respond: drafting employee-facing recommendation...');

    if (!inputData.matchedCaseId) {
      const answer =
        `Für die Anfrage konnte kein passender Servicefall gefunden werden` +
        `${inputData.machine ? ` (Maschine: ${inputData.machine}` : ''}` +
        `${inputData.error_code ? `, Fehlercode: ${inputData.error_code})` : inputData.machine ? ')' : ''}. ` +
        `Bitte manuell prüfen oder an den zweiten Support-Level eskalieren.`;
      console.log('       -> no matched case, using deterministic fallback message (no LLM call)');
      return {
        detected_machine: inputData.machine,
        detected_error_code: inputData.error_code,
        matched_case_id: null,
        probable_causes: [],
        recommended_checks: [],
        recommended_parts: [],
        answer_for_employee: answer,
      };
    }

    const prompt = `Nachricht des Nutzers: ${inputData.message} Wenn bei der Nachricht des Nutzers die Maschine nicht angegeben ist, formuliere den Ersten Satz so: Falls es die Maschine (maschine des gefundenen Servicefalls) ist, dann...
    Maschine: ${inputData.caseMachine}
Fehlercode: ${inputData.error_code}
Wahrscheinliche Ursachen: ${inputData.probableCauses.join(', ')}
Empfohlene Prüfschritte: ${inputData.recommendedChecks.join(', ')}
Verfügbare Ersatzteile: ${
      inputData.recommendedParts.map((p: RecommendedPart) => `${p.name} (Lagerbestand: ${p.stock})`).join(', ') ||
      'keine passenden Ersatzteile auf Lager'
    }`;

    const result = await responseAgent.generate(prompt);
    console.log(`       -> ${result.text}`);

    return {
      detected_machine: inputData.machine,
      detected_error_code: inputData.error_code,
      matched_case_id: inputData.matchedCaseId,
      probable_causes: inputData.probableCauses,
      recommended_checks: inputData.recommendedChecks,
      recommended_parts: inputData.recommendedParts,
      answer_for_employee: result.text,
    };
  },
});

export const serviceRequestWorkflow = createWorkflow({
  id: 'service-request-workflow',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: finalOutputSchema,
})
  .then(extractStep)
  .then(matchStep)
  .then(enrichStep)
  .then(respondStep)
  .commit();
