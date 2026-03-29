import { read } from '../db/store.js'
import { computeValue } from './portfolio.js'
import { AGENTS } from '../config.js'

// Get summary stats for all agents
export function getSummary(pricesSnapshot) {
  const portfolios = read('portfolios')
  const trades = read('trades') || []

  return AGENTS.map(agentId => {
    const portfolio = portfolios[agentId]
    const totalValue = computeValue(agentId, pricesSnapshot)
    const pnl = totalValue - portfolio.startingCash
    const pnlPct = (pnl / portfolio.startingCash) * 100

    const agentTrades = trades.filter(t => t.agentId === agentId)
    const closedTrades = agentTrades.filter(t => t.action === 'SELL')
    const wins = closedTrades.filter(t => t.pnl > 0).length
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length * 100).toFixed(0) : 'N/A'

    return {
      agentId,
      totalValue: parseFloat(totalValue.toFixed(2)),
      cash: parseFloat(portfolio.cash.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(2)),
      pnlPct: parseFloat(pnlPct.toFixed(2)),
      openPositions: Object.keys(portfolio.positions).length,
      totalTrades: agentTrades.length,
      winRate,
    }
  })
}

// Get recent trades across all agents (last N)
export function getRecentTrades(n = 15) {
  const trades = read('trades') || []
  return trades.slice(-n).reverse()
}

// Get open positions for all agents
export function getOpenPositions(pricesSnapshot) {
  const portfolios = read('portfolios')
  const quotes = pricesSnapshot.quotes
  const result = {}

  for (const agentId of AGENTS) {
    result[agentId] = Object.values(portfolios[agentId].positions).map(pos => {
      const price = quotes[pos.symbol]?.price ?? pos.avgCostBasis
      const pnl = (price - pos.avgCostBasis) * pos.shares
      const pnlPct = ((price - pos.avgCostBasis) / pos.avgCostBasis * 100).toFixed(2)
      return { ...pos, currentPrice: price, pnl: parseFloat(pnl.toFixed(2)), pnlPct }
    })
  }
  return result
}
