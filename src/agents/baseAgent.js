import { WATCHLIST, STOCK_WATCHLIST, CRYPTO_WATCHLIST, PORTFOLIO_RULES, getRules } from '../config.js'
import { getRecentCandles } from '../data/history.js'
import { log } from '../utils/logger.js'

function isCryptoSymbol(sym) {
  return sym.includes('/')
}

function fmtPrice(price) {
  if (price == null) return 'N/A'
  if (price >= 1000) return `$${price.toFixed(2)}`
  if (price >= 1)    return `$${price.toFixed(4)}`
  return `$${price.toFixed(6)}`
}

export function buildPrompt(agentId, portfolio, pricesSnapshot) {
  const { cash, positions } = portfolio
  const quotes = pricesSnapshot.quotes

  // Portfolio state
  const positionRows = Object.values(positions).map(p => {
    const current = quotes[p.symbol]?.price ?? p.avgCostBasis
    const pnl = (current - p.avgCostBasis) * p.shares
    const pnlPct = ((current - p.avgCostBasis) / p.avgCostBasis * 100).toFixed(2)
    const type = isCryptoSymbol(p.symbol) ? 'crypto' : 'stock'
    return `${p.symbol} (${type}): ${p.shares} units @ ${fmtPrice(p.avgCostBasis)} | now ${fmtPrice(current)} | P&L $${pnl.toFixed(2)} (${pnlPct}%)`
  }).join('\n') || 'No open positions'

  const unrealisedPnl = Object.values(positions).reduce((sum, p) => {
    const current = quotes[p.symbol]?.price ?? p.avgCostBasis
    return sum + (current - p.avgCostBasis) * p.shares
  }, 0)

  // Split available quotes into stock and crypto sections
  const stockRows = STOCK_WATCHLIST
    .filter(sym => quotes[sym])
    .map(sym => formatRow(sym, quotes[sym]))
    .join('\n')

  const cryptoRows = CRYPTO_WATCHLIST
    .filter(sym => quotes[sym])
    .map(sym => formatRow(sym, quotes[sym]))
    .join('\n')

  const stockSection = stockRows
    ? `--- US STOCKS (market hours only) ---\n${stockRows}`
    : '--- US STOCKS (market closed) ---'

  const cryptoSection = cryptoRows
    ? `--- CRYPTO 24/7 ---\n${cryptoRows}`
    : ''

  // 12 candles สำหรับ: positions ที่ถืออยู่ + top 3 oversold candidates
  const held = Object.keys(positions)
  const oversoldCandidates = [...STOCK_WATCHLIST, ...CRYPTO_WATCHLIST]
    .filter(s => quotes[s] && !positions[s] && quotes[s].rsi14 != null)
    .sort((a, b) => quotes[a].rsi14 - quotes[b].rsi14)
    .slice(0, 3)

  const candleSymbols = [...held, ...oversoldCandidates]
    .filter((s, i, arr) => arr.indexOf(s) === i)  // unique

  const candleSection = candleSymbols.map(sym => {
    const candles = getRecentCandles(sym, 12)
    if (candles.length === 0) return null
    const rows = candles.map(c =>
      `  ${c.time.substring(11, 16)} | ${fmtPrice(c.close).padStart(12)} | RSI ${c.rsi14?.toFixed(1) ?? 'N/A'}`
    ).join('\n')
    return `${sym}:\n${rows}`
  }).filter(Boolean).join('\n')

  return `You are a disciplined short-term paper trader managing a $${(PORTFOLIO_RULES.maxPositionUSD * PORTFOLIO_RULES.maxOpenPositions).toFixed(0)} portfolio.
You can trade BOTH US stocks (when market is open) AND crypto (always available), using 5-minute data.
Return ONLY valid JSON, no commentary.

=== PORTFOLIO (${agentId}) ===
Cash available: $${cash.toFixed(2)}
Open positions (${Object.keys(positions).length}/${PORTFOLIO_RULES.maxOpenPositions} max):
${positionRows}
Unrealised P&L: $${unrealisedPnl.toFixed(2)}

=== MARKET SNAPSHOT (${pricesSnapshot.fetchedAt}) ===
Symbol         |        Price |   Chg%  | RSI14 | SMA20 | Volume | Rules
${stockSection}
${cryptoSection}

=== RECENT CANDLES (5m, last 12 candles) ===
${candleSection || 'No history yet (first cycle)'}

=== RULES ===
- Max ${PORTFOLIO_RULES.maxOpenPositions} open positions at once
- Max $${PORTFOLIO_RULES.maxPositionUSD} per position, min $${PORTFOLIO_RULES.minPositionUSD}
- Each symbol has its own stop-loss (SL), RSI buy (B) and sell (S) thresholds shown in the snapshot
- VOL+ means current volume is above average (stronger signal). VOL- means below average (weaker)
- For stocks with VOL- consider waiting for volume confirmation before buying
- Stocks: use ticker (AAPL, NVDA). Crypto: use COIN/USDT format (BTC/USDT, ETH/USDT)
- Only trade stocks that appear in the snapshot (market may be closed)

=== TASK ===
Decide 0–3 actions. Return a JSON array only:
[
  { "action": "BUY"|"SELL"|"HOLD", "symbol": "TICKER", "dollarAmount": 250.00, "reasoning": "one sentence" }
]
For no action: [{ "action": "HOLD", "symbol": "ALL", "dollarAmount": 0, "reasoning": "reason" }]`
}

function formatRow(sym, q) {
  const changePct = q.changePct ?? 0
  const rules = getRules(sym)
  const volStr = q.volumeAboveAvg != null
    ? (q.volumeAboveAvg ? 'VOL+' : 'VOL-')
    : '    '
  return [
    sym.padEnd(14),
    fmtPrice(q.price).padStart(12),
    `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`.padStart(8),
    (q.rsi14 != null ? q.rsi14.toFixed(1) : 'N/A').padStart(6),
    q.aboveSma20 != null ? (q.aboveSma20 ? 'YES' : 'NO ') : 'N/A',
    volStr,
    `SL:${(rules.stopLoss * 100).toFixed(0)}% B:${rules.rsiBuy} S:${rules.rsiSell}`,
  ].join(' | ')
}

export function validateActions(rawActions, portfolio, pricesSnapshot) {
  if (!Array.isArray(rawActions)) return []
  const quotes = pricesSnapshot.quotes
  const { cash, positions } = portfolio

  return rawActions.filter(a => {
    if (!a.action || !a.symbol || a.dollarAmount == null) return false
    if (a.action === 'HOLD') return true
    if (!WATCHLIST.includes(a.symbol) && a.symbol !== 'ALL') {
      log.warn(`Action rejected: ${a.symbol} not in watchlist`)
      return false
    }
    if (a.action === 'BUY') {
      if (a.dollarAmount < PORTFOLIO_RULES.minPositionUSD) return false
      if (a.dollarAmount > cash) {
        log.warn(`BUY ${a.symbol} rejected: insufficient cash ($${cash.toFixed(2)} < $${a.dollarAmount})`)
        return false
      }
      if (Object.keys(positions).length >= PORTFOLIO_RULES.maxOpenPositions) {
        log.warn(`BUY ${a.symbol} rejected: max positions reached`)
        return false
      }
      if (!quotes[a.symbol]) {
        log.warn(`BUY ${a.symbol} rejected: no quote available (market may be closed)`)
        return false
      }
    }
    if (a.action === 'SELL') {
      if (!positions[a.symbol]) {
        log.warn(`SELL ${a.symbol} rejected: not in positions`)
        return false
      }
    }
    return true
  })
}

export function parseActions(text) {
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (e) {
    log.error('Failed to parse LLM response:', text)
    return []
  }
}
