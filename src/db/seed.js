import { read, write } from './store.js'
import { AGENTS, STARTING_CASH } from '../config.js'

function seed() {
  // portfolios.json
  if (!read('portfolios')) {
    const portfolios = {}
    for (const agentId of AGENTS) {
      portfolios[agentId] = {
        agentId,
        startingCash: STARTING_CASH,
        cash: STARTING_CASH,
        positions: {},
        lastUpdated: new Date().toISOString(),
      }
    }
    write('portfolios', portfolios)
    console.log('Seeded portfolios.json')
  } else {
    console.log('portfolios.json already exists — skipped')
  }

  // trades.json
  if (!read('trades')) {
    write('trades', [])
    console.log('Seeded trades.json')
  } else {
    console.log('trades.json already exists — skipped')
  }

  // prices.json
  if (!read('prices')) {
    write('prices', { fetchedAt: null, quotes: {} })
    console.log('Seeded prices.json')
  } else {
    console.log('prices.json already exists — skipped')
  }
}

seed()
