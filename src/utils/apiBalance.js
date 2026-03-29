// Track API usage cost locally — both providers don't expose balance via secret key
// Anthropic: $3/1M input, $15/1M output (sonnet-4-6)
// OpenAI:    $2.5/1M input, $15/1M output (gpt-5.4)

const PRICING = {
  claude: { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
  gpt:    { input: 2.5 / 1_000_000, output: 15.0 / 1_000_000 },
}

const sessionUsage = {
  claude: { inputTokens: 0, outputTokens: 0, calls: 0 },
  gpt:    { inputTokens: 0, outputTokens: 0, calls: 0 },
}

export function recordUsage(agentId, inputTokens, outputTokens) {
  if (!sessionUsage[agentId]) return
  sessionUsage[agentId].inputTokens += inputTokens
  sessionUsage[agentId].outputTokens += outputTokens
  sessionUsage[agentId].calls++
}

export function getSessionCost(agentId) {
  const u = sessionUsage[agentId]
  if (!u) return null
  const p = PRICING[agentId]
  const cost = u.inputTokens * p.input + u.outputTokens * p.output
  return { cost: parseFloat(cost.toFixed(4)), calls: u.calls, inputTokens: u.inputTokens, outputTokens: u.outputTokens }
}

export function getAllSessionCosts() {
  return {
    claude: getSessionCost('claude'),
    gpt: getSessionCost('gpt'),
  }
}
