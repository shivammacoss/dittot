// MetaAPI Price Service - Real-time market data via MetaAPI REST API
// Docs: https://metaapi.cloud/docs/client/restApi/api/retrieveMarketData/readSymbolPrice/

import dotenv from 'dotenv'

dotenv.config()

const METAAPI_TOKEN = process.env.METAAPI_TOKEN || ''
const METAAPI_ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID || ''
const METAAPI_REGION = process.env.METAAPI_REGION || 'new-york'

// MetaAPI REST base URL (region-specific)
const API_BASE = `https://mt-client-api-v1.${METAAPI_REGION}.agiliumtrade.ai`

// Price cache
const priceCache = new Map()

// Callbacks
let onPriceUpdate = null
let onConnectionChange = null

// Connection state
let isConnected = false
let pollInterval = null
let reconnectTimeout = null

// Symbol lists - symbols to fetch prices for
const FOREX_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'AUDCAD',
  'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY', 'AUDNZD', 'CADCHF', 'GBPCHF',
  'GBPNZD', 'EURNZD', 'NZDCAD', 'NZDCHF', 'AUDCHF', 'GBPAUD', 'GBPCAD'
]

const CRYPTO_SYMBOLS = [
  'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD',
  'TRXUSD', 'LINKUSD', 'MATICUSD', 'DOTUSD', 'SHIBUSD', 'LTCUSD', 'BCHUSD',
  'AVAXUSD', 'XLMUSD', 'UNIUSD', 'ATOMUSD', 'ETCUSD', 'FILUSD'
]

const METAL_SYMBOLS = ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD']

const ENERGY_SYMBOLS = ['USOIL', 'UKOIL', 'NGAS']

const STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD'
]

const ALL_SYMBOLS = [...FOREX_SYMBOLS, ...CRYPTO_SYMBOLS, ...METAL_SYMBOLS, ...ENERGY_SYMBOLS, ...STOCK_SYMBOLS]

// Priority symbols to fetch first (most used)
const PRIORITY_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD',
  'USDCHF', 'AUDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'USOIL'
]

// Fetch single symbol price from MetaAPI
async function fetchSymbolPrice(symbol) {
  const url = `${API_BASE}/users/current/accounts/${METAAPI_ACCOUNT_ID}/symbols/${symbol}/current-price`
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'auth-token': METAAPI_TOKEN
    }
  })
  
  if (!response.ok) {
    if (response.status === 404) return null // Symbol not available on broker
    throw new Error(`HTTP ${response.status} for ${symbol}`)
  }
  
  return await response.json()
}

// Fetch prices for a batch of symbols (sequential with delay to respect rate limits)
async function fetchPricesBatch(symbols) {
  let fetched = 0
  let errors = 0
  
  for (const symbol of symbols) {
    try {
      const data = await fetchSymbolPrice(symbol)
      if (data && (data.bid || data.ask)) {
        const price = {
          bid: data.bid,
          ask: data.ask,
          mid: (data.bid + data.ask) / 2,
          time: Date.now()
        }
        
        const oldPrice = priceCache.get(symbol)
        priceCache.set(symbol, price)
        
        if (onPriceUpdate && (!oldPrice || oldPrice.bid !== price.bid || oldPrice.ask !== price.ask)) {
          onPriceUpdate(symbol, price)
        }
        fetched++
      }
    } catch (e) {
      errors++
      if (e.message.includes('429')) {
        // Rate limited - wait and continue
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    // Small delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 100))
  }
  
  return { fetched, errors }
}

// Connect to MetaAPI and start polling prices
async function connect() {
  if (!METAAPI_TOKEN || !METAAPI_ACCOUNT_ID) {
    console.log('[MetaAPI] ERROR: Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in .env')
    console.log('[MetaAPI] Using simulated prices as fallback')
    startSimulatedPrices()
    return
  }

  console.log(`[MetaAPI] Connecting to ${API_BASE}...`)
  console.log(`[MetaAPI] Account: ${METAAPI_ACCOUNT_ID}`)

  try {
    // Test connection with a single symbol
    const testPrice = await fetchSymbolPrice('EURUSD')
    if (testPrice) {
      console.log(`[MetaAPI] Connected! EURUSD bid: ${testPrice.bid} ask: ${testPrice.ask}`)
      isConnected = true
      if (onConnectionChange) onConnectionChange(true)
      
      // Fetch priority symbols first
      console.log(`[MetaAPI] Fetching ${PRIORITY_SYMBOLS.length} priority symbols...`)
      const result = await fetchPricesBatch(PRIORITY_SYMBOLS)
      console.log(`[MetaAPI] Got ${result.fetched} priority prices`)
      
      // Start polling cycle - fetch all symbols in rotation
      startPolling()
    } else {
      throw new Error('EURUSD test price returned null')
    }
  } catch (error) {
    console.error(`[MetaAPI] Connection failed: ${error.message}`)
    console.log('[MetaAPI] Falling back to simulated prices')
    startSimulatedPrices()
  }
}

// Poll prices in rotation
function startPolling() {
  let symbolIndex = 0
  const BATCH_SIZE = 10 // Fetch 10 symbols per cycle
  const POLL_INTERVAL = 2000 // Every 2 seconds
  
  pollInterval = setInterval(async () => {
    try {
      // Get next batch of symbols
      const batch = ALL_SYMBOLS.slice(symbolIndex, symbolIndex + BATCH_SIZE)
      if (batch.length === 0) {
        symbolIndex = 0
        return
      }
      
      await fetchPricesBatch(batch)
      symbolIndex += BATCH_SIZE
      
      if (symbolIndex >= ALL_SYMBOLS.length) {
        symbolIndex = 0
      }
    } catch (error) {
      console.error('[MetaAPI] Poll error:', error.message)
    }
  }, POLL_INTERVAL)
  
  console.log(`[MetaAPI] Polling ${ALL_SYMBOLS.length} symbols (${BATCH_SIZE} per ${POLL_INTERVAL}ms)`)
}

// Fallback: simulated prices
function startSimulatedPrices() {
  isConnected = true
  if (onConnectionChange) onConnectionChange(true)
  console.log('[MetaAPI] Simulated prices active')
  
  generateSimulatedPrices()
  pollInterval = setInterval(() => {
    generateSimulatedPrices()
  }, 500)
}

function generateSimulatedPrices() {
  const basePrices = {
    'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 149.50, 'USDCHF': 0.8850,
    'AUDUSD': 0.6550, 'NZDUSD': 0.6150, 'USDCAD': 1.3550, 'EURGBP': 0.8580,
    'EURJPY': 162.20, 'GBPJPY': 189.10, 'XAUUSD': 2025.50, 'XAGUSD': 23.15,
    'BTCUSD': 43500, 'ETHUSD': 2280, 'USOIL': 78.50, 'UKOIL': 82.30,
    'XRPUSD': 0.62, 'SOLUSD': 98.50, 'BNBUSD': 310, 'ADAUSD': 0.55,
    'DOGEUSD': 0.085, 'NGAS': 2.85, 'UKOIL': 82.30
  }
  
  for (const [symbol, basePrice] of Object.entries(basePrices)) {
    const spread = symbol.includes('JPY') ? 0.03 : (symbol === 'XAUUSD' ? 0.50 : 0.0003)
    const variation = (Math.random() - 0.5) * basePrice * 0.0001
    const bid = basePrice + variation
    const ask = bid + spread
    
    const price = { bid, ask, mid: (bid + ask) / 2, time: Date.now() }
    const oldPrice = priceCache.get(symbol)
    priceCache.set(symbol, price)
    
    if (onPriceUpdate && (!oldPrice || oldPrice.bid !== price.bid)) {
      onPriceUpdate(symbol, price)
    }
  }
}

function disconnect() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
  isConnected = false
  console.log('[MetaAPI] Disconnected')
}

function getPrice(symbol) {
  return priceCache.get(symbol) || null
}

function getAllPrices() {
  return Object.fromEntries(priceCache)
}

function getPriceCache() {
  return priceCache
}

async function fetchPriceREST(symbol) {
  return priceCache.get(symbol) || null
}

async function fetchBatchPricesREST(symbols) {
  const prices = {}
  for (const symbol of symbols) {
    const cached = priceCache.get(symbol)
    if (cached) prices[symbol] = cached
  }
  return prices
}

function setOnPriceUpdate(callback) {
  onPriceUpdate = callback
}

function setOnConnectionChange(callback) {
  onConnectionChange = callback
}

function isWebSocketConnected() {
  return isConnected
}

function getConnectionStatus() {
  return {
    isConnected,
    priceCount: priceCache.size
  }
}

// Categorize symbol
function categorizeSymbol(symbol) {
  if (FOREX_SYMBOLS.includes(symbol)) return 'Forex'
  if (METAL_SYMBOLS.includes(symbol)) return 'Metals'
  if (ENERGY_SYMBOLS.includes(symbol)) return 'Energy'
  if (CRYPTO_SYMBOLS.includes(symbol)) return 'Crypto'
  if (STOCK_SYMBOLS.includes(symbol)) return 'Stocks'
  
  // Pattern matching fallback
  if (symbol.startsWith('XAU') || symbol.startsWith('XAG') || symbol.startsWith('XPT') || symbol.startsWith('XPD')) return 'Metals'
  if (symbol.includes('OIL') || symbol === 'NGAS') return 'Energy'
  if (symbol.endsWith('USD') && symbol.length <= 6) return 'Forex'
  if (symbol.endsWith('USD') && symbol.length > 6) return 'Crypto'
  
  return 'Other'
}

function getSymbolName(symbol) {
  const names = {
    'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD', 'USDJPY': 'USD/JPY', 'USDCHF': 'USD/CHF',
    'AUDUSD': 'AUD/USD', 'NZDUSD': 'NZD/USD', 'USDCAD': 'USD/CAD', 'EURGBP': 'EUR/GBP',
    'EURJPY': 'EUR/JPY', 'GBPJPY': 'GBP/JPY', 'XAUUSD': 'Gold', 'XAGUSD': 'Silver',
    'BTCUSD': 'Bitcoin', 'ETHUSD': 'Ethereum', 'USOIL': 'US Oil', 'UKOIL': 'UK Oil'
  }
  return names[symbol] || symbol
}

function getDynamicSymbols() {
  return {
    forex: FOREX_SYMBOLS,
    crypto: CRYPTO_SYMBOLS,
    stocks: STOCK_SYMBOLS,
    metals: METAL_SYMBOLS,
    energy: ENERGY_SYMBOLS
  }
}

// Symbol mapping (identity for MetaAPI)
const SYMBOL_MAP = {}
ALL_SYMBOLS.forEach(s => { SYMBOL_MAP[s] = s })

export default {
  connect,
  disconnect,
  getPrice,
  getAllPrices,
  getPriceCache,
  fetchPriceREST,
  fetchBatchPricesREST,
  setOnPriceUpdate,
  setOnConnectionChange,
  isWebSocketConnected,
  getConnectionStatus,
  categorizeSymbol,
  getSymbolName,
  getDynamicSymbols,
  get SYMBOL_MAP() { return SYMBOL_MAP },
  get ALL_SYMBOLS() { return ALL_SYMBOLS },
  FOREX_SYMBOLS,
  CRYPTO_SYMBOLS,
  STOCK_SYMBOLS,
  METAL_SYMBOLS,
  ENERGY_SYMBOLS
}
