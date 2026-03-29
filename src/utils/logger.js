const LEVEL = process.env.LOG_LEVEL || 'info'
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 99 }

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}

function shouldLog(level) {
  return (LEVELS[level] ?? 1) >= (LEVELS[LEVEL] ?? 1)
}

export const log = {
  debug: (...args) => shouldLog('debug') && console.log(`[${ts()}] DEBUG`, ...args),
  info:  (...args) => shouldLog('info')  && console.log(`[${ts()}] INFO `, ...args),
  warn:  (...args) => shouldLog('warn')  && console.warn(`[${ts()}] WARN `, ...args),
  error: (...args) => shouldLog('error') && console.error(`[${ts()}] ERROR`, ...args),
}
