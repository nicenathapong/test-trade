import ccxt from 'ccxt'
import { CRYPTO_WATCHLIST, INDICATORS } from '../config.js'
import { computeIndicators } from './indicators.js'
import { appendCandle } from './history.js'
import { write } from '../db/store.js'
import { log } from '../utils/logger.js'

const exchange = new ccxt.binance({ enableRateLimit: true })

export async function fetchAll() {
  log.info(`Fetching crypto quotes for ${CRYPTO_WATCHLIST.length} symbols...`)

  const results = await Promise.allSettled(
    CRYPTO_WATCHLIST.map(symbol => fetchSymbol(symbol))
  )

  const quotes = {}
  for (let i = 0; i < CRYPTO_WATCHLIST.length; i++) {
    const symbol = CRYPTO_WATCHLIST[i]
    const result = results[i]
    if (result.status === 'fulfilled' && result.value) {
      quotes[symbol] = result.value
    } else {
      log.warn(`Failed to fetch ${symbol}: ${result.reason?.message || 'unknown'}`)
    }
  }

  const snapshot = { fetchedAt: new Date().toISOString(), quotes, mode: 'crypto' }
  write('prices', snapshot)
  log.info(`Fetched ${Object.keys(quotes).length}/${CRYPTO_WATCHLIST.length} symbols`)
  return snapshot
}

async function fetchSymbol(symbol) {
  const ticker = await exchange.fetchTicker(symbol)
  const ohlcv = await exchange.fetchOHLCV(symbol, '5m', undefined, INDICATORS.candlesNeeded)

  const closes = ohlcv.map(c => c[4])
  const indicators = computeIndicators(closes)

  const price = ticker.last
  const sma20 = indicators.sma20
  const lastCandle = ohlcv[ohlcv.length - 1]

  // Save candle to history
  appendCandle(symbol, {
    time: new Date(lastCandle[0]).toISOString(),
    open: lastCandle[1],
    high: lastCandle[2],
    low: lastCandle[3],
    close: lastCandle[4],
    volume: lastCandle[5],
    ...indicators,
  })

  return {
    symbol,
    price,
    open: ticker.open,
    high: ticker.high,
    low: ticker.low,
    volume: ticker.baseVolume,
    change: ticker.change,
    changePct: ticker.percentage,
    ...indicators,
    aboveSma20: sma20 != null ? price > sma20 : null,
  }
}
