import type { ServiceCase } from './types';

/**
 * Mocked OpenSearch-style matching, in lieu of a real OpenSearch index/query for this
 * prototype. Mirrors a `bool` query with `filter` clauses on exact fields (machine,
 * error_code) plus a `should` clause running a `match` query against `symptoms`,
 * scored by query-term coverage rather than full BM25 (no term/doc frequency stats
 * available over a 3-row dataset).
 */

const MACHINE_FIELD_BOOST = 3;
const ERROR_CODE_FIELD_BOOST = 3;

function tokenize(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(tokens);
}

function symptomsScore(queryTokens: Set<string>, symptoms: string[]): { score: number; matchedTerms: string[] } {
  const docTokens = tokenize(symptoms.join(' '));
  const matchedTerms = [...queryTokens].filter((t) => docTokens.has(t));
  const score = queryTokens.size === 0 ? 0 : matchedTerms.length / queryTokens.size;
  return { score, matchedTerms };
}

export interface CaseMatchResult {
  matchedCase: ServiceCase | null;
  score: number;
  matchedTerms: string[];
  reason: string;
}

export function matchServiceCase(
  params: { machine: string | null; errorCode: string | null; message: string },
  cases: ServiceCase[],
): CaseMatchResult {
  const queryTokens = tokenize(params.message);

  const exactCandidates =
    params.machine && params.errorCode
      ? cases.filter((c) => c.machine === params.machine && c.error_code === params.errorCode)
      : [];

  if (exactCandidates.length > 0) {
    const scored = exactCandidates
      .map((c) => ({ case: c, ...symptomsScore(queryTokens, c.symptoms) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    return {
      matchedCase: best.case,
      score: 1 + best.score,
      matchedTerms: best.matchedTerms,
      reason: `exact filter match on machine="${params.machine}" + error_code="${params.errorCode}"`,
    };
  }

  const scored = cases
    .map((c) => {
      const { score: symScore, matchedTerms } = symptomsScore(queryTokens, c.symptoms);
      const machineBoost = params.machine && c.machine === params.machine ? MACHINE_FIELD_BOOST : 0;
      const errorCodeBoost = params.errorCode && c.error_code === params.errorCode ? ERROR_CODE_FIELD_BOOST : 0;
      return { case: c, score: symScore + machineBoost + errorCodeBoost, matchedTerms };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) {
    return {
      matchedCase: null,
      score: 0,
      matchedTerms: [],
      reason: 'no service case matched machine, error_code, or symptom terms above the relevance threshold',
    };
  }

  return {
    matchedCase: best.case,
    score: best.score,
    matchedTerms: best.matchedTerms,
    reason: 'fallback should-clause match (partial field/symptom overlap, no exact machine+error_code pair found)',
  };
}
