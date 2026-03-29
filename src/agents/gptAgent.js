import { buildPrompt, validateActions, parseActions } from './baseAgent.js'
import { decideActions as mockDecide } from './mockAgent.js'
import { recordUsage } from '../utils/apiBalance.js'
import { log } from '../utils/logger.js'

const AGENT_ID = 'gpt'

export async function decideActions(portfolio, pricesSnapshot) {
  if (!process.env.OPENAI_API_KEY) {
    log.warn('[gpt] No API key — using mock agent')
    return mockDecide(AGENT_ID, portfolio, pricesSnapshot)
  }

  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const prompt = buildPrompt(AGENT_ID, portfolio, pricesSnapshot)

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-5.4',
      max_completion_tokens: 512,
      messages: [
        { role: 'system', content: 'You are a disciplined short-term paper trader. Return ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
    })
    const usage = response.usage
    recordUsage(AGENT_ID, usage.prompt_tokens, usage.completion_tokens)
    const text = response.choices[0].message.content
    const raw = parseActions(text)
    return validateActions(raw, portfolio, pricesSnapshot)
  } catch (err) {
    log.error('[gpt] API error:', err.message)
    return []
  }
}
