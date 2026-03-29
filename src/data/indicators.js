export function sma(prices, period) {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export function ema(prices, period) {
  if (prices.length < period) return null
  const k = 2 / (period + 1)
  let result = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    result = prices[i] * k + result * (1 - k)
  }
  return result
}

export function rsi(prices, period = 14) {
  if (prices.length < period + 1) return null
  const changes = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }
  const slice = changes.slice(-period)
  const gains = slice.filter(c => c > 0).reduce((a, b) => a + b, 0) / period
  const losses = slice.filter(c => c < 0).map(c => Math.abs(c)).reduce((a, b) => a + b, 0) / period
  if (losses === 0) return 100
  const rs = gains / losses
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2))
}

export function computeIndicators(closes) {
  return {
    rsi14: rsi(closes, 14),
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    ema9: ema(closes, 9),
  }
}
