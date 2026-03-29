import yahooFinance from 'yahoo-finance2'
import { STOCK_WATCHLIST, INDICATORS } from '../config.js'
import { computeIndicators } from './indicators.js'
import { appendCandle } from './history.js'
import { write } from '../db/store.js'
import { log } from '../utils/logger.js'

export async function fetchAll() {
  log.info(`Fetching quotes for ${STOCK_WATCHLIST.length} symbols...`)

  const results = await Promise.allSettled(
    STOCK_WATCHLIST.map(symbol => fetchSymbol(symbol))
  )

  const quotes = {}
  for (let i = 0; i < STOCK_WATCHLIST.length; i++) {
    const symbol = STOCK_WATCHLIST[i]
    const result = results[i]
    if (result.status === 'fulfilled' && result.value) {
      quotes[symbol] = result.value
    } else {
      log.warn(`Failed to fetch ${symbol}: ${result.reason?.message || 'unknown error'}`)
    }
  }

  const snapshot = { fetchedAt: new Date().toISOString(), quotes }
  write('prices', snapshot)
  log.info(`Fetched ${Object.keys(quotes).length}/${STOCK_WATCHLIST.length} symbols`)
  return snapshot
}

async function fetchSymbol(symbol) {
  const quote = await yahooFinance.quote(symbol)

  const chart = await yahooFinance.chart(symbol, {
    interval: '5m',
    range: '5d',
  })

  const candles = chart?.quotes || []
  const validCandles = candles.filter(c => c.close != null)
  const closes = validCandles.map(c => c.close).slice(-INDICATORS.candlesNeeded)
  const indicators = computeIndicators(closes)

  const price = quote.regularMarketPrice
  const sma20 = indicators.sma20
  const now = new Date().toISOString()

  // Save candle to history
  appendCandle(symbol, {
    time: now,
    open: quote.regularMarketOpen,
    high: quote.regularMarketDayHigh,
    low: quote.regularMarketDayLow,
    close: price,
    volume: quote.regularMarketVolume,
    ...indicators,
  })

  return {
    symbol,
    price,
    open: quote.regularMarketOpen,
    high: quote.regularMarketDayHigh,
    low: quote.regularMarketDayLow,
    volume: quote.regularMarketVolume,
    change: quote.regularMarketChange,
    changePct: quote.regularMarketChangePercent,
    ...indicators,
    aboveSma20: sma20 != null ? price > sma20 : null,
  }
}
