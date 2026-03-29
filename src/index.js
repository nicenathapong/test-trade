import 'dotenv/config'
import cron from 'node-cron'
import { fetchAll as fetchStocks } from './data/fetcher.js'
import { fetchAll as fetchCrypto } from './data/cryptoFetcher.js'
import { decideActions as claudeDecide } from './agents/claudeAgent.js'
import { decideActions as gptDecide } from './agents/gptAgent.js'
import { decideActions as strategyDecide } from './agents/strategyAgent.js'
import { executeActions } from './portfolio/portfolio.js'
import { render } from './display/dashboard.js'
import { read, write } from './db/store.js'
import { isStockMarketOpen, nextStockOpenStr, nowET } from './utils/marketHours.js'
import { getAllSessionCosts } from './utils/apiBalance.js'
import { log } from './utils/logger.js'

// Bootstrap: ensure data files exist
import './db/seed.js'

let cycleCount = 0
let lastSnapshot = null

async function runCycle() {
  cycleCount++
  log.info(`=== Cycle #${cycleCount} ===`)

  // Fetch crypto always + stocks only when market is open
  const fetchTasks = [fetchCrypto()]
  if (isStockMarketOpen()) {
    fetchTasks.push(fetchStocks())
  } else {
    log.info(`Stock market closed. Next open: ${nextStockOpenStr()}`)
  }

  let snapshot
  try {
    const results = await Promise.allSettled(fetchTasks)

    const quotes = {}
    for (const r of results) {
      if (r.status === 'fulfilled') {
        Object.assign(quotes, r.value.quotes)
      } else {
        log.warn('Fetch partial failure:', r.reason?.message)
      }
    }

    if (Object.keys(quotes).length === 0) {
      log.error('No quotes fetched — skipping cycle')
      if (lastSnapshot) render(lastSnapshot, cycleCount, getNextCronTime(), getAllSessionCosts())
      return
    }

    snapshot = { fetchedAt: new Date().toISOString(), quotes }
    write('prices', snapshot)
    lastSnapshot = snapshot
    log.info(`Combined snapshot: ${Object.keys(quotes).length} symbols`)
  } catch (err) {
    log.error('Fetch failed — skipping cycle:', err.message)
    if (lastSnapshot) render(lastSnapshot, cycleCount, getNextCronTime(), getAllSessionCosts())
    return
  }

  // All three agents decide independently
  const portfolios = read('portfolios')
  const [claudeResult, gptResult, strategyResult] = await Promise.allSettled([
    claudeDecide(portfolios.claude, snapshot),
    gptDecide(portfolios.gpt, snapshot),
    strategyDecide(portfolios.strategy, snapshot),
  ])

  if (claudeResult.status === 'fulfilled') {
    executeActions('claude', claudeResult.value, snapshot)
  } else {
    log.error('Claude agent failed:', claudeResult.reason?.message)
  }

  if (gptResult.status === 'fulfilled') {
    executeActions('gpt', gptResult.value, snapshot)
  } else {
    log.error('GPT agent failed:', gptResult.reason?.message)
  }

  if (strategyResult.status === 'fulfilled') {
    executeActions('strategy', strategyResult.value, snapshot)
  } else {
    log.error('Strategy agent failed:', strategyResult.reason?.message)
  }

  render(snapshot, cycleCount, getNextCronTime(), getAllSessionCosts())
}

function getNextCronTime() {
  const now = new Date()
  const next = new Date(now)
  const minutes = now.getMinutes()
  const nextMinute = Math.ceil((minutes + 1) / 5) * 5
  if (nextMinute >= 60) {
    next.setHours(now.getHours() + 1, nextMinute - 60, 0, 0)
  } else {
    next.setMinutes(nextMinute, 0, 0)
  }
  return next.toISOString().replace('T', ' ').substring(11, 16)
}

// Run once immediately on start
await runCycle()

// Every 5 min, 7 days a week (crypto never stops; stock fetcher self-gates by market hours)
cron.schedule('*/5 * * * *', runCycle)
log.info(`Paper trader running. Time: ${nowET().toFormat('HH:mm')} ET`)
