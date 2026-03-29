import { DateTime } from 'luxon'
import { MARKET_HOURS } from '../config.js'

export function nowET() {
  return DateTime.now().setZone(MARKET_HOURS.timezone)
}

export function isStockMarketOpen() {
  const now = nowET()

  if (now.weekday > 5) return false

  const dateStr = now.toISODate()
  if (MARKET_HOURS.holidays.includes(dateStr)) return false

  const openMinutes  = MARKET_HOURS.open.hour  * 60 + MARKET_HOURS.open.minute
  const closeMinutes = MARKET_HOURS.close.hour * 60 + MARKET_HOURS.close.minute
  const nowMinutes   = now.hour * 60 + now.minute

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes
}

export function nextStockOpenStr() {
  const now = nowET()

  const openToday = now.set({
    hour: MARKET_HOURS.open.hour,
    minute: MARKET_HOURS.open.minute,
    second: 0,
  })

  if (now < openToday && now.weekday <= 5 && !MARKET_HOURS.holidays.includes(now.toISODate())) {
    return openToday.toFormat('HH:mm') + ' ET today'
  }

  let next = now.plus({ days: 1 })
  while (next.weekday > 5 || MARKET_HOURS.holidays.includes(next.toISODate())) {
    next = next.plus({ days: 1 })
  }
  return next.toFormat('EEE MMM d') + ` ${MARKET_HOURS.open.hour}:${String(MARKET_HOURS.open.minute).padStart(2, '0')} ET`
}
