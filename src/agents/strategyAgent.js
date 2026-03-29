import { WATCHLIST, PORTFOLIO_RULES, getRules } from '../config.js'
import { validateActions } from './baseAgent.js'
import { log } from '../utils/logger.js'

export async function decideActions(portfolio, pricesSnapshot) {
  const quotes = pricesSnapshot.quotes
  const { cash, positions } = portfolio
  const actions = []

  // Check stop-loss + overbought on existing positions (per-symbol rules)
  for (const [symbol, pos] of Object.entries(positions)) {
    const q = quotes[symbol]
    if (!q) continue
    const rules = getRules(symbol)
    const loss = (q.price - pos.avgCostBasis) / pos.avgCostBasis

    if (loss <= -rules.stopLoss) {
      actions.push({
        action: 'SELL',
        symbol,
        dollarAmount: pos.shares * q.price,
        reasoning: `Stop-loss (${(rules.stopLoss * 100).toFixed(1)}%): down ${(loss * 100).toFixed(2)}%`,
      })
      log.debug(`[strategy] Stop-loss triggered for ${symbol} (threshold: ${rules.stopLoss * 100}%)`)
      continue
    }

    if (q.rsi14 != null && q.rsi14 > rules.rsiSell) {
      actions.push({
        action: 'SELL',
        symbol,
        dollarAmount: pos.shares * q.price,
        reasoning: `RSI overbought at ${q.rsi14} (threshold: ${rules.rsiSell})`,
      })
    }
  }

  // Find BUY candidates using per-symbol rules
  const alreadySelling = new Set(actions.filter(a => a.action === 'SELL').map(a => a.symbol))
  const openSlots = PORTFOLIO_RULES.maxOpenPositions - Object.keys(positions).length + alreadySelling.size

  if (openSlots > 0 && cash >= PORTFOLIO_RULES.minPositionUSD) {
    const candidates = WATCHLIST
      .filter(sym => !positions[sym] && !alreadySelling.has(sym) && quotes[sym])
      .filter(sym => {
        const q = quotes[sym]
        const rules = getRules(sym)
        if (q.rsi14 == null || q.rsi14 >= rules.rsiBuy) return false
        if (q.aboveSma20 !== true) return false
        if (rules.volumeConfirm && q.volume != null && q.avgVolume != null) {
          if (q.volume < q.avgVolume) return false
        }
        return true
      })
      .sort((a, b) => (quotes[a].rsi14 ?? 50) - (quotes[b].rsi14 ?? 50))
      .slice(0, openSlots)

    for (const sym of candidates) {
      const rules = getRules(sym)
      const amount = Math.min(PORTFOLIO_RULES.maxPositionUSD, cash * 0.2)
      if (amount < PORTFOLIO_RULES.minPositionUSD) break
      const volNote = rules.volumeConfirm ? ', volume confirmed' : ''
      actions.push({
        action: 'BUY',
        symbol: sym,
        dollarAmount: parseFloat(amount.toFixed(2)),
        reasoning: `RSI oversold at ${quotes[sym].rsi14} (threshold: ${rules.rsiBuy}), above SMA20${volNote}`,
      })
    }
  }

  if (actions.length === 0) {
    actions.push({ action: 'HOLD', symbol: 'ALL', dollarAmount: 0, reasoning: 'No signal' })
  }

  log.debug(`[strategy] Actions: ${JSON.stringify(actions)}`)
  return validateActions(actions, portfolio, pricesSnapshot)
}
