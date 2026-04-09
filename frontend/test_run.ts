import { AGENT_TOOL_DEFINITIONS } from './src/lib/dealCopilot/agentPrompt';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const API_KEY = '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';

async function test() {
  const result = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [{ role: 'user', content: 'Create a deal.' }],
      tools: AGENT_TOOL_DEFINITIONS,
      max_tokens: 50
    })
  });
  console.log(await result.text());
}
test();
