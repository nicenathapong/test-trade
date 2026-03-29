import { buildPrompt, validateActions, parseActions } from './baseAgent.js'
import { decideActions as mockDecide } from './mockAgent.js'
import { recordUsage } from '../utils/apiBalance.js'
import { log } from '../utils/logger.js'

const AGENT_ID = 'claude'

export async function decideActions(portfolio, pricesSnapshot) {
  if (!process.env.ANTHROPIC_API_KEY) {
    log.warn('[claude] No API key — using mock agent')
    return mockDecide(AGENT_ID, portfolio, pricesSnapshot)
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = buildPrompt(AGENT_ID, portfolio, pricesSnapshot)

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    recordUsage(AGENT_ID, message.usage.input_tokens, message.usage.output_tokens)
    const text = message.content[0].text
    const raw = parseActions(text)
    return validateActions(raw, portfolio, pricesSnapshot)
  } catch (err) {
    log.error('[claude] API error:', err.message)
    return []
  }
}
