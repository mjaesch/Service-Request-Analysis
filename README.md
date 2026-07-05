# Service-Request-Analysis
Prototype
### AI Usage
Claude Code to help with Planning, DevOps and Programming
OpenAI API for the LLM Processing steps

## Design
Dont use a real opensearch with indexes, but mock it with a basic match
Do use mastra for a basic starting point, claude helps with expediting the setup

## Next Steps for real implementation
first: ist aufnahme, wie wird aktuell gematcht. und testdaten sammeln gegen die man optimieren kann. (evtl etwas automatisches einrichten) use case genau definieren. das ist extrem wichtig für projekterfolg.

replace mocks with real applications
use more features of mastra such as caching to improve response time for real world use
add the logging features with langfuse to be able to keep track of responses and optimize
depending on the requirements replace the zod schemas with json schemas out of a db (useful if schemas change more often or reuse/reconfiguration of the same steps is needed)