import Table from 'cli-table3'
import chalk from 'chalk'
import { getSummary, getRecentTrades, getOpenPositions } from '../portfolio/tracker.js'
import { isStockMarketOpen, nowET } from '../utils/marketHours.js'

const AGENT_COLORS = {
  claude:   chalk.cyan,
  gpt:      chalk.green,
  strategy: chalk.yellow,
}

export function render(pricesSnapshot, cycleCount, nextCron, apiCosts) {
  process.stdout.write('\x1Bc')  // clear terminal

  const now = nowET().toFormat('HH:mm:ss')
  const stockStatus = isStockMarketOpen() ? chalk.green('OPEN') : chalk.red('CLOSED')
  const market = `Stock: ${stockStatus} | Crypto: ${chalk.green('24/7')}`
  const fetchedAt = pricesSnapshot?.fetchedAt
    ? new Date(pricesSnapshot.fetchedAt).toISOString().replace('T', ' ').substring(11, 19)
    : 'N/A'
  const nextStr = nextCron ? chalk.dim(`Next: ${nextCron} UTC`) : ''

  console.log(chalk.bold.white(`  Paper Trader  |  Cycle: #${cycleCount}  |  Last fetch: ${fetchedAt} ET  |  Market: ${market}  |  ${now} ET  |  ${nextStr}`))
  console.log()

  // --- API Cost Summary ---
  if (apiCosts) {
    const claudeCost = apiCosts.claude
    const gptCost = apiCosts.gpt
    const claudeStr = claudeCost?.calls > 0
      ? `${chalk.cyan('claude')} $${claudeCost.cost.toFixed(4)} (${claudeCost.calls} calls, ${claudeCost.inputTokens + claudeCost.outputTokens} tokens)`
      : `${chalk.cyan('claude')} $0.0000`
    const gptStr = gptCost?.calls > 0
      ? `${chalk.green('gpt')}    $${gptCost.cost.toFixed(4)} (${gptCost.calls} calls, ${gptCost.inputTokens + gptCost.outputTokens} tokens)`
      : `${chalk.green('gpt')}    $0.0000`
    console.log(chalk.bold(' API Usage (this session)') + `   ${claudeStr}   ${gptStr}`)
    console.log()
  }

  // --- Table 1: Agent Performance ---
  const summary = getSummary(pricesSnapshot)
  const perfTable = new Table({
    head: ['Agent', 'Portfolio Value', 'P&L $', 'P&L %', 'Open Pos', 'Trades', 'Win Rate'],
    colAligns: ['left', 'right', 'right', 'right', 'center', 'center', 'center'],
    style: { head: ['bold'] },
  })

  for (const s of summary) {
    const color = AGENT_COLORS[s.agentId] ?? chalk.white
    const pnlColor = s.pnl >= 0 ? chalk.green : chalk.red
    perfTable.push([
      color(s.agentId.padEnd(8)),
      `$${s.totalValue.toFixed(2)}`,
      pnlColor(`${s.pnl >= 0 ? '+' : ''}$${s.pnl.toFixed(2)}`),
      pnlColor(`${s.pnlPct >= 0 ? '+' : ''}${s.pnlPct.toFixed(2)}%`),
      s.openPositions,
      s.totalTrades,
      s.winRate === 'N/A' ? '-' : `${s.winRate}%`,
    ])
  }
  console.log(chalk.bold(' Performance Summary'))
  console.log(perfTable.toString())
  console.log()

  // --- Table 2: Open Positions ---
  const positions = getOpenPositions(pricesSnapshot)
  const posTable = new Table({
    head: ['Agent', 'Symbol', 'Shares', 'Cost', 'Now', 'P&L $', 'P&L %'],
    colAligns: ['left', 'left', 'right', 'right', 'right', 'right', 'right'],
    style: { head: ['bold'] },
  })

  let hasPositions = false
  for (const [agentId, posList] of Object.entries(positions)) {
    const color = AGENT_COLORS[agentId] ?? chalk.white
    for (const pos of posList) {
      hasPositions = true
      const pnlColor = pos.pnl >= 0 ? chalk.green : chalk.red
      posTable.push([
        color(agentId),
        chalk.white(pos.symbol),
        pos.shares.toFixed(4),
        `$${pos.avgCostBasis.toFixed(2)}`,
        `$${pos.currentPrice.toFixed(2)}`,
        pnlColor(`${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`),
        pnlColor(`${pos.pnlPct >= 0 ? '+' : ''}${pos.pnlPct}%`),
      ])
    }
  }
  if (!hasPositions) {
    posTable.push([{ content: chalk.dim('No open positions'), colSpan: 7, hAlign: 'center' }])
  }
  console.log(chalk.bold(' Open Positions'))
  console.log(posTable.toString())
  console.log()

  // --- Table 3: Recent Trades ---
  const trades = getRecentTrades(12)
  const tradeTable = new Table({
    head: ['Agent', 'Action', 'Symbol', 'Shares', 'Price', 'Value', 'P&L', 'Reasoning'],
    colAligns: ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'left'],
    style: { head: ['bold'] },
    colWidths: [10, 6, 8, 8, 9, 9, 9, 35],
  })

  if (trades.length === 0) {
    tradeTable.push([{ content: chalk.dim('No trades yet'), colSpan: 8, hAlign: 'center' }])
  } else {
    for (const t of trades) {
      const color = AGENT_COLORS[t.agentId] ?? chalk.white
      const actionColor = t.action === 'BUY' ? chalk.green : chalk.red
      const pnlStr = t.pnl != null
        ? (t.pnl >= 0 ? chalk.green(`+$${t.pnl.toFixed(2)}`) : chalk.red(`-$${Math.abs(t.pnl).toFixed(2)}`))
        : '-'
      const reasoning = t.reasoning?.substring(0, 33) ?? ''
      tradeTable.push([
        color(t.agentId),
        actionColor(t.action),
        t.symbol,
        t.shares.toFixed(4),
        `$${t.priceAtExecution.toFixed(2)}`,
        `$${t.totalValue.toFixed(2)}`,
        pnlStr,
        reasoning,
      ])
    }
  }
  console.log(chalk.bold(' Recent Trades (last 12)'))
  console.log(tradeTable.toString())
}
