import { WATCHLIST, PORTFOLIO_RULES } from '../config.js'
import { validateActions } from './baseAgent.js'
import { log } from '../utils/logger.js'

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function decideActions(agentId, portfolio, pricesSnapshot) {
  log.debug(`[${agentId}] Mock agent deciding...`)
  const quotes = pricesSnapshot.quotes
  const { positions, cash } = portfolio
  const actions = []

  // Maybe sell a random position
  const held = Object.keys(positions)
  if (held.length > 0 && Math.random() < 0.3) {
    const sym = randomItem(held)
    const units = positions[sym].shares
    const price = quotes[sym]?.price ?? positions[sym].avgCostBasis
    actions.push({
      action: 'SELL',
      symbol: sym,
      dollarAmount: units * price,
      reasoning: 'Mock: random sell',
    })
  }

  // Only buy from symbols that have quotes right now (stocks may be unavailable after hours)
  const available = WATCHLIST.filter(s => !positions[s] && quotes[s])
  if (available.length > 0 && Math.random() < 0.4 && cash >= PORTFOLIO_RULES.minPositionUSD) {
    const sym = randomItem(available)
    const amount = Math.min(
      PORTFOLIO_RULES.maxPositionUSD,
      Math.floor(cash * 0.2 / 10) * 10
    )
    if (amount >= PORTFOLIO_RULES.minPositionUSD) {
      actions.push({
        action: 'BUY',
        symbol: sym,
        dollarAmount: amount,
        reasoning: 'Mock: random buy',
      })
    }
  }

  if (actions.length === 0) {
    actions.push({ action: 'HOLD', symbol: 'ALL', dollarAmount: 0, reasoning: 'Mock: hold' })
  }

  return validateActions(actions, portfolio, pricesSnapshot)
}
