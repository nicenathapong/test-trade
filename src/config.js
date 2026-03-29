export const STOCK_WATCHLIST = [
  // Mega-cap Tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  // Semiconductors
  'AMD', 'INTC', 'AVGO',
  // Finance
  'JPM', 'BAC', 'GS',
  // Healthcare
  'JNJ', 'UNH', 'PFE',
  // Consumer / Retail
  'WMT', 'HD', 'NKE',
  // Energy
  'XOM', 'CVX',
  // ETFs
  'SPY', 'QQQ', 'IWM',
  // High-volatility
  'PLTR',
]

export const CRYPTO_WATCHLIST = [
  // Large-cap
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
  // Mid-cap
  'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT', 'LINK/USDT',
  // DeFi
  'UNI/USDT', 'AAVE/USDT', 'MKR/USDT',
  // AI/Infra
  'FET/USDT', 'RENDER/USDT', 'AR/USDT',
  // High-volatility
  'DOGE/USDT', 'SHIB/USDT', 'PEPE/USDT', 'WIF/USDT',
]

// Combined watchlist — agents pick from both stock + crypto
export const WATCHLIST = [...STOCK_WATCHLIST, ...CRYPTO_WATCHLIST]

export const AGENTS = ['claude', 'gpt', 'strategy']

export const STARTING_CASH = parseFloat(process.env.STARTING_CASH_USD || '2800')

export const PORTFOLIO_RULES = {
  maxOpenPositions: 5,
  maxPositionUSD: 600,
  minPositionUSD: 100,
  stopLossPct: 0.03,
  cooldownMinutes: 30,
}

export const INDICATORS = {
  rsiPeriod: 14,
  smaPeriods: [20, 50],
  emaPeriod: 9,
  candlesNeeded: 60,
}

export const MARKET_HOURS = {
  timezone: 'America/New_York',
  open: { hour: 9, minute: 35 },
  close: { hour: 16, minute: 0 },
  holidays: [
    '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18',
    '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01',
    '2025-11-27', '2025-12-25',
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03',
    '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07',
    '2026-11-26', '2026-12-25',
  ],
}
