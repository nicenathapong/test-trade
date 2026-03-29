import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_DIR = path.resolve(__dirname, '../../data')

function filePath(name) {
  return path.join(DB_DIR, `${name}.json`)
}

export function read(name) {
  const fp = filePath(name)
  if (!fs.existsSync(fp)) return null
  return JSON.parse(fs.readFileSync(fp, 'utf8'))
}

export function write(name, data) {
  fs.mkdirSync(DB_DIR, { recursive: true })
  const tmp = filePath(name) + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, filePath(name))
}

export function append(name, item) {
  const existing = read(name) || []
  existing.push(item)
  write(name, existing)
}
