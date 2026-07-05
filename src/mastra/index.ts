import { Mastra } from '@mastra/core/mastra';
import { serviceRequestWorkflow } from './workflows/service-request-workflow';

export const mastra = new Mastra({
  workflows: { serviceRequestWorkflow },
});
