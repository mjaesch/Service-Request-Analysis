import 'dotenv/config';
import { mastra } from './mastra/index';

const EXAMPLE_MESSAGE =
  'Unser Reinigungsroboter R-500 zeigt Fehlercode E42. Seit gestern fährt er nicht mehr korrekt zur Ladestation zurück. ' +
  'Welche Ursache könnte das haben und welches Ersatzteil brauchen wir vermutlich?';

const UNKNOWN_MESSAGE =
  'Unser Gerät X-900 zeigt Fehlercode E99 und macht komische Geräusche beim Starten.';

async function runOnce(message: string) {
  console.log('='.repeat(70));
  console.log(`Service request: "${message}"`);
  console.log('='.repeat(70));

  const workflow = mastra.getWorkflow('serviceRequestWorkflow');
  const run = await workflow.createRun();
  const result = await run.start({ inputData: { message } });

  if (result.status !== 'success') {
    console.error('\nWorkflow did not complete successfully:', result);
    process.exitCode = 1;
    return;
  }

  console.log('\nStructured output:');
  console.log(JSON.stringify(result.result, null, 2));
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Copy .env.example to .env and add your key before running.');
    process.exitCode = 1;
    return;
  }

  const arg = process.argv[2];
  if (arg) {
    await runOnce(arg);
    return;
  }

  await runOnce(EXAMPLE_MESSAGE);
  await runOnce(UNKNOWN_MESSAGE);
}

main();
