import { Agent } from '@mastra/core/agent';

export const responseAgent = new Agent({
  id: 'response-agent',
  name: 'Response Agent',
  instructions: `Du schreibst eine kurze interne Handlungsempfehlung (Deutsch, 2-4 Sätze) für einen Servicemitarbeiter,
basierend auf einer erkannten Maschine, einem Fehlercode, wahrscheinlichen Ursachen, empfohlenen Prüfschritten und
verfügbaren Ersatzteilen. Sei präzise und praxisnah, keine Floskeln, keine Wiederholung der reinen Rohdaten als Liste -
formuliere einen zusammenhängenden Hinweistext. `,
  model: process.env.OPENAI_MODEL ?? 'openai/gpt-5.4-mini',
});
