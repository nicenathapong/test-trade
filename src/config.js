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
  stopLossPct: 0.03,   // default fallback
  cooldownMinutes: 30,
}

// Per-symbol trading rules — overrides PORTFOLIO_RULES defaults
// volumeConfirm: true = ต้องการ volume > avgVolume ก่อน BUY
export const SYMBOL_RULES = {
  // ETFs — volatile ต่ำ, threshold กว้าง, ไม่ต้อง volume confirm
  SPY:  { stopLoss: 0.02, rsiBuy: 38, rsiSell: 62, volumeConfirm: false },
  QQQ:  { stopLoss: 0.02, rsiBuy: 38, rsiSell: 62, volumeConfirm: false },
  IWM:  { stopLoss: 0.02, rsiBuy: 38, rsiSell: 62, volumeConfirm: false },

  // Mega-cap Tech — ปานกลาง
  AAPL: { stopLoss: 0.03, rsiBuy: 32, rsiSell: 68, volumeConfirm: true },
  MSFT: { stopLoss: 0.03, rsiBuy: 32, rsiSell: 68, volumeConfirm: true },
  GOOGL:{ stopLoss: 0.03, rsiBuy: 32, rsiSell: 68, volumeConfirm: true },
  AMZN: { stopLoss: 0.03, rsiBuy: 32, rsiSell: 68, volumeConfirm: true },
  META: { stopLoss: 0.03, rsiBuy: 32, rsiSell: 68, volumeConfirm: true },

  // High-volatility Tech — threshold แคบ, stop-loss กว้าง
  NVDA: { stopLoss: 0.05, rsiBuy: 28, rsiSell: 72, volumeConfirm: true },
  TSLA: { stopLoss: 0.05, rsiBuy: 28, rsiSell: 72, volumeConfirm: true },
  PLTR: { stopLoss: 0.05, rsiBuy: 28, rsiSell: 72, volumeConfirm: true },
  AMD:  { stopLoss: 0.05, rsiBuy: 28, rsiSell: 72, volumeConfirm: true },

  // Semiconductors
  INTC: { stopLoss: 0.03, rsiBuy: 32, rsiSell: 68, volumeConfirm: true },
  AVGO: { stopLoss: 0.03, rsiBuy: 32, rsiSell: 68, volumeConfirm: true },

  // Finance — ขยับช้า, threshold กว้าง
  JPM:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
  BAC:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
  GS:   { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },

  // Healthcare
  JNJ:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
  UNH:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
  PFE:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },

  // Consumer / Retail
  WMT:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
  HD:   { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
  NKE:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },

  // Energy
  XOM:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
  CVX:  { stopLoss: 0.025, rsiBuy: 35, rsiSell: 65, volumeConfirm: false },
}

// Crypto default rules — volatile สูง, ไม่มี volume confirm (volume crypto ไม่ reliable)
export const CRYPTO_RULES = {
  stopLoss: 0.06,
  rsiBuy: 28,
  rsiSell: 72,
  volumeConfirm: false,
}

// Helper — คืน rules ของ symbol นั้น
export function getRules(symbol) {
  if (SYMBOL_RULES[symbol]) return SYMBOL_RULES[symbol]
  if (symbol.includes('/')) return CRYPTO_RULES
  // fallback สำหรับ stock ที่ไม่ได้กำหนด
  return { stopLoss: PORTFOLIO_RULES.stopLossPct, rsiBuy: 30, rsiSell: 70, volumeConfirm: false }
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
