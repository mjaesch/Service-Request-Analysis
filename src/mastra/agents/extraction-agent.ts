import { Agent } from '@mastra/core/agent';

export const extractionAgent = new Agent({
  id: 'extraction-agent',
  name: 'Extraction Agent',
  instructions: `Du extrahierst strukturierte Daten aus einer internen Service-Anfrage (Deutsch).

Gib das Maschinenmodell exakt so zurück, wie es im Text steht (z. B. "R-500"), und den Fehlercode exakt so, wie er im Text steht (z. B. "E42").
Wenn eines der beiden Felder nicht eindeutig im Text vorkommt, gib für dieses Feld null zurück. Errate oder erfinde keine Werte, die nicht im Text stehen.`,
  model: process.env.OPENAI_MODEL ?? 'openai/gpt-5.4-mini',
});
