import { read, write, append } from '../db/store.js'
import { log } from '../utils/logger.js'

// Execute a list of validated actions for one agent
export function executeActions(agentId, actions, pricesSnapshot) {
  const portfolios = read('portfolios')
  const portfolio = portfolios[agentId]
  const quotes = pricesSnapshot.quotes

  for (const action of actions) {
    if (action.action === 'HOLD') continue
    if (action.action === 'BUY') executeBuy(agentId, action, portfolio, quotes)
    if (action.action === 'SELL') executeSell(agentId, action, portfolio, quotes)
  }

  portfolio.lastUpdated = new Date().toISOString()
  portfolios[agentId] = portfolio
  write('portfolios', portfolios)
}

function executeBuy(agentId, action, portfolio, quotes) {
  const { symbol, dollarAmount, reasoning } = action
  const price = quotes[symbol]?.price
  if (!price) return

  const shares = parseFloat((dollarAmount / price).toFixed(6))
  const actualCost = shares * price

  if (actualCost > portfolio.cash) {
    log.warn(`[${agentId}] BUY ${symbol} skipped: not enough cash`)
    return
  }

  // Average down if already holding
  if (portfolio.positions[symbol]) {
    const pos = portfolio.positions[symbol]
    const totalShares = pos.shares + shares
    const totalCost = pos.shares * pos.avgCostBasis + actualCost
    pos.shares = totalShares
    pos.avgCostBasis = totalCost / totalShares
  } else {
    portfolio.positions[symbol] = {
      symbol,
      shares,
      avgCostBasis: price,
      openedAt: new Date().toISOString(),
    }
  }

  portfolio.cash -= actualCost

  const trade = {
    tradeId: `trade_${agentId}_${Date.now()}_${symbol}`,
    agentId,
    symbol,
    action: 'BUY',
    shares,
    priceAtExecution: price,
    totalValue: actualCost,
    cashBefore: portfolio.cash + actualCost,
    cashAfter: portfolio.cash,
    reasoning,
    timestamp: new Date().toISOString(),
    pnl: null,
  }
  append('trades', trade)
  log.info(`[${agentId}] BUY  ${symbol} | ${shares.toFixed(4)} shares @ $${price.toFixed(2)} | cost $${actualCost.toFixed(2)}`)
}

function executeSell(agentId, action, portfolio, quotes) {
  const { symbol, reasoning } = action
  const pos = portfolio.positions[symbol]
  if (!pos) return

  const price = quotes[symbol]?.price ?? pos.avgCostBasis
  const proceeds = pos.shares * price
  const pnl = (price - pos.avgCostBasis) * pos.shares

  portfolio.cash += proceeds
  delete portfolio.positions[symbol]

  const trade = {
    tradeId: `trade_${agentId}_${Date.now()}_${symbol}`,
    agentId,
    symbol,
    action: 'SELL',
    shares: pos.shares,
    priceAtExecution: price,
    totalValue: proceeds,
    cashBefore: portfolio.cash - proceeds,
    cashAfter: portfolio.cash,
    reasoning,
    timestamp: new Date().toISOString(),
    pnl: parseFloat(pnl.toFixed(2)),
  }
  append('trades', trade)
  log.info(`[${agentId}] SELL ${symbol} | ${pos.shares.toFixed(4)} shares @ $${price.toFixed(2)} | P&L $${pnl.toFixed(2)}`)
}

// Compute total portfolio value (cash + open positions at current prices)
export function computeValue(agentId, pricesSnapshot) {
  const portfolios = read('portfolios')
  const portfolio = portfolios[agentId]
  const quotes = pricesSnapshot.quotes

  const positionsValue = Object.values(portfolio.positions).reduce((sum, pos) => {
    const price = quotes[pos.symbol]?.price ?? pos.avgCostBasis
    return sum + pos.shares * price
  }, 0)

  return portfolio.cash + positionsValue
}
