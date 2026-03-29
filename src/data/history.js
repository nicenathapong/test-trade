import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_DIR = path.resolve(__dirname, '../../data/history')
const MAX_CANDLES = 100  // เก็บสูงสุด 100 candles ต่อ symbol

function filePath(symbol) {
  // BTC/USDT → BTC-USDT.json (slash ใช้เป็น filename ไม่ได้)
  const safe = symbol.replace(/\//g, '-')
  return path.join(HISTORY_DIR, `${safe}.json`)
}

// อ่าน candles เก่าของ symbol นั้น
export function loadCandles(symbol) {
  const fp = filePath(symbol)
  if (!fs.existsSync(fp)) return []
  return JSON.parse(fs.readFileSync(fp, 'utf8'))
}

// เพิ่ม candle ใหม่เข้าไป แล้ว trim ให้ไม่เกิน MAX_CANDLES
export function appendCandle(symbol, candle) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true })
  const existing = loadCandles(symbol)

  // ไม่ซ้ำ timestamp
  const last = existing[existing.length - 1]
  if (last && last.time === candle.time) return existing

  existing.push(candle)
  const trimmed = existing.slice(-MAX_CANDLES)

  const tmp = filePath(symbol) + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(trimmed), 'utf8')
  fs.renameSync(tmp, filePath(symbol))
  return trimmed
}

// คืน N candles ล่าสุด สำหรับใส่ใน prompt
export function getRecentCandles(symbol, n = 5) {
  return loadCandles(symbol).slice(-n)
}
