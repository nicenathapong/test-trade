import { WATCHLIST, PORTFOLIO_RULES } from '../config.js'
import { validateActions } from './baseAgent.js'
import { log } from '../utils/logger.js'

export async function decideActions(portfolio, pricesSnapshot) {
  const quotes = pricesSnapshot.quotes
  const { cash, positions } = portfolio
  const actions = []

  // Check stop-loss + overbought on existing positions
  for (const [symbol, pos] of Object.entries(positions)) {
    const q = quotes[symbol]
    if (!q) continue
    const loss = (q.price - pos.avgCostBasis) / pos.avgCostBasis
    if (loss <= -PORTFOLIO_RULES.stopLossPct) {
      actions.push({
        action: 'SELL',
        symbol,
        dollarAmount: pos.shares * q.price,
        reasoning: `Stop-loss: down ${(loss * 100).toFixed(2)}% from cost basis`,
      })
      log.debug(`[strategy] Stop-loss triggered for ${symbol}`)
      continue
    }
    if (q.rsi14 != null && q.rsi14 > 70) {
      actions.push({
        action: 'SELL',
        symbol,
        dollarAmount: pos.shares * q.price,
        reasoning: `RSI overbought at ${q.rsi14}`,
      })
    }
  }

  // Find BUY candidates from all available quotes (stock + crypto)
  const alreadySelling = new Set(actions.filter(a => a.action === 'SELL').map(a => a.symbol))
  const openSlots = PORTFOLIO_RULES.maxOpenPositions - Object.keys(positions).length + alreadySelling.size

  if (openSlots > 0 && cash >= PORTFOLIO_RULES.minPositionUSD) {
    const candidates = WATCHLIST
      .filter(sym => !positions[sym] && !alreadySelling.has(sym) && quotes[sym])
      .filter(sym => {
        const q = quotes[sym]
        return q.rsi14 != null && q.rsi14 < 30 && q.aboveSma20 === true
      })
      .sort((a, b) => (quotes[a].rsi14 ?? 50) - (quotes[b].rsi14 ?? 50))
      .slice(0, openSlots)

    for (const sym of candidates) {
      const amount = Math.min(PORTFOLIO_RULES.maxPositionUSD, cash * 0.2)
      if (amount < PORTFOLIO_RULES.minPositionUSD) break
      actions.push({
        action: 'BUY',
        symbol: sym,
        dollarAmount: parseFloat(amount.toFixed(2)),
        reasoning: `RSI oversold at ${quotes[sym].rsi14}, price above SMA20`,
      })
    }
  }

  if (actions.length === 0) {
    actions.push({ action: 'HOLD', symbol: 'ALL', dollarAmount: 0, reasoning: 'No signal' })
  }

  log.debug(`[strategy] Actions: ${JSON.stringify(actions)}`)
  return validateActions(actions, portfolio, pricesSnapshot)
}
