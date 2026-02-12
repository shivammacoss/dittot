// MetaAPI Price Service - Real-time market data via MetaAPI SDK Streaming WebSocket
// Uses metaapi.cloud-sdk for true tick-to-tick price streaming

import dotenv from 'dotenv'
import MetaApi, { SynchronizationListener } from 'metaapi.cloud-sdk/esm-node'

dotenv.config()

const METAAPI_TOKEN = process.env.METAAPI_TOKEN || ''
const METAAPI_ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID || ''

// Price cache
const priceCache = new Map()

// Callbacks
let onPriceUpdate = null
let onConnectionChange = null

// Connection state
let isConnected = false
let streamingConnection = null
let metaApiInstance = null
let pollInterval = null
let reconnectTimeout = null

// Symbol lists
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

// Priority symbols to subscribe first
const PRIORITY_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'USDJPY', 'ETHUSD',
  'USDCHF', 'AUDUSD', 'USDCAD', 'XAGUSD', 'USOIL', 'SOLUSD'
]

// Custom SynchronizationListener for real-time price updates
class PriceListener extends SynchronizationListener {
  async onSymbolPriceUpdated(instanceIndex, price) {
    if (!price || !price.symbol) return
    const symbol = price.symbol
    const bid = price.bid
    const ask = price.ask
    if (!bid && !ask) return

    const priceData = { bid, ask, mid: (bid + ask) / 2, time: Date.now() }
    const oldPrice = priceCache.get(symbol)
    priceCache.set(symbol, priceData)

    if (onPriceUpdate && (!oldPrice || oldPrice.bid !== bid || oldPrice.ask !== ask)) {
      onPriceUpdate(symbol, priceData)
    }
  }

  async onConnected(instanceIndex, replicas) {
    if (!isConnected) {
      console.log('[MetaAPI Stream] Connected to broker')
      isConnected = true
      if (onConnectionChange) onConnectionChange(true)
    }
  }

  async onDisconnected(instanceIndex) {
    if (isConnected) {
      console.log('[MetaAPI Stream] Disconnected from broker')
      isConnected = false
      if (onConnectionChange) onConnectionChange(false)
    }
  }

  async onBrokerConnectionStatusChanged(instanceIndex, connected) {
    if (isConnected !== connected) {
      console.log(`[MetaAPI Stream] Broker connection: ${connected}`)
      isConnected = connected
      if (onConnectionChange) onConnectionChange(connected)
    }
  }
}

// Connect using MetaApi SDK streaming
async function connect() {
  if (!METAAPI_TOKEN || !METAAPI_ACCOUNT_ID) {
    console.log('[MetaAPI] ERROR: Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in .env')
    startSimulatedPrices()
    return
  }

  console.log('[MetaAPI] Connecting via SDK streaming WebSocket...')
  console.log(`[MetaAPI] Account: ${METAAPI_ACCOUNT_ID}`)

  try {
    metaApiInstance = new MetaApi(METAAPI_TOKEN)
    const account = await metaApiInstance.metatraderAccountApi.getAccount(METAAPI_ACCOUNT_ID)

    // Deploy account if not deployed
    const state = account.state
    if (state !== 'DEPLOYED') {
      console.log(`[MetaAPI] Account state: ${state}, deploying...`)
      await account.deploy()
      console.log('[MetaAPI] Account deployed, waiting for connection...')
    }

    // Wait for account to connect to broker
    console.log('[MetaAPI] Waiting for API server connection...')
    await account.waitConnected()
    console.log('[MetaAPI] API server connected')

    // Get streaming connection
    streamingConnection = account.getStreamingConnection()

    // Add price listener BEFORE connecting
    const listener = new PriceListener()
    streamingConnection.addSynchronizationListener(listener)

    // Connect streaming
    await streamingConnection.connect()
    console.log('[MetaAPI] Streaming connection opened, waiting for sync...')

    // Wait for synchronization (with timeout)
    await streamingConnection.waitSynchronized({ timeoutInSeconds: 60 })
    console.log('[MetaAPI] Synchronized with terminal!')

    isConnected = true
    if (onConnectionChange) onConnectionChange(true)

    // Subscribe to market data for all symbols (in batches to avoid overwhelming)
    await subscribeSymbols()

    // Read initial prices from terminal state
    const terminalState = streamingConnection.terminalState
    for (const symbol of ALL_SYMBOLS) {
      const p = terminalState.price(symbol)
      if (p && (p.bid || p.ask)) {
        const priceData = { bid: p.bid, ask: p.ask, mid: ((p.bid || 0) + (p.ask || 0)) / 2, time: Date.now() }
        priceCache.set(symbol, priceData)
        if (onPriceUpdate) onPriceUpdate(symbol, priceData)
      }
    }
    console.log(`[MetaAPI] Initial prices loaded: ${priceCache.size} symbols`)

  } catch (error) {
    console.error(`[MetaAPI] SDK streaming connection failed: ${error.message}`)
    console.log('[MetaAPI] Falling back to simulated prices')
    startSimulatedPrices()
  }
}

// Subscribe to market data for symbols in batches
async function subscribeSymbols() {
  // Subscribe priority symbols first
  for (const symbol of PRIORITY_SYMBOLS) {
    try {
      await streamingConnection.subscribeToMarketData(symbol)
    } catch (e) {
      // Symbol may not be available on this broker — skip silently
    }
  }
  console.log(`[MetaAPI] Subscribed to ${PRIORITY_SYMBOLS.length} priority symbols`)

  // Subscribe remaining symbols in background (don't block)
  const remaining = ALL_SYMBOLS.filter(s => !PRIORITY_SYMBOLS.includes(s))
  ;(async () => {
    for (const symbol of remaining) {
      try {
        await streamingConnection.subscribeToMarketData(symbol)
      } catch (e) {
        // Skip unavailable symbols
      }
      // Small delay between subscriptions
      await new Promise(r => setTimeout(r, 50))
    }
    console.log(`[MetaAPI] Subscribed to all ${ALL_SYMBOLS.length} symbols`)
  })()
}

// Fallback: simulated prices
function startSimulatedPrices() {
  isConnected = true
  if (onConnectionChange) onConnectionChange(true)
  console.log('[MetaAPI] Simulated prices active (fallback)')

  generateSimulatedPrices()
  pollInterval = setInterval(() => {
    generateSimulatedPrices()
  }, 500)
}

function generateSimulatedPrices() {
  const basePrices = {
    // Forex
    'EURUSD': 1.0850, 'GBPUSD': 1.2650, 'USDJPY': 149.50, 'USDCHF': 0.8850,
    'AUDUSD': 0.6550, 'NZDUSD': 0.6150, 'USDCAD': 1.3550, 'EURGBP': 0.8580,
    'EURJPY': 162.20, 'GBPJPY': 189.10, 'EURCHF': 0.9350, 'EURAUD': 1.6550,
    'EURCAD': 1.4700, 'AUDCAD': 0.8880, 'AUDJPY': 97.90, 'CADJPY': 110.30,
    'CHFJPY': 168.80, 'NZDJPY': 91.80, 'AUDNZD': 1.0650, 'CADCHF': 0.6530,
    'GBPCHF': 1.1200, 'GBPNZD': 2.0550, 'EURNZD': 1.7600, 'NZDCAD': 0.8340,
    'NZDCHF': 0.5450, 'AUDCHF': 0.5800, 'GBPAUD': 1.9320, 'GBPCAD': 1.7130,
    // Metals
    'XAUUSD': 2025.50, 'XAGUSD': 23.15, 'XPTUSD': 920.50, 'XPDUSD': 1050.00,
    // Energy
    'USOIL': 78.50, 'UKOIL': 82.30, 'NGAS': 2.85,
    // Crypto
    'BTCUSD': 43500, 'ETHUSD': 2280, 'BNBUSD': 310, 'SOLUSD': 98.50,
    'XRPUSD': 0.62, 'ADAUSD': 0.55, 'DOGEUSD': 0.085, 'TRXUSD': 0.11,
    'LINKUSD': 15.20, 'MATICUSD': 0.85, 'DOTUSD': 7.50, 'SHIBUSD': 0.000010,
    'LTCUSD': 72.50, 'BCHUSD': 245.00, 'AVAXUSD': 36.50, 'XLMUSD': 0.12,
    'UNIUSD': 6.80, 'ATOMUSD': 9.50, 'ETCUSD': 19.80, 'FILUSD': 5.60,
    // Stocks
    'AAPL': 185.50, 'MSFT': 415.20, 'GOOGL': 142.80, 'AMZN': 178.50,
    'NVDA': 720.00, 'META': 485.30, 'TSLA': 195.80, 'JPM': 195.40,
    'V': 280.50, 'JNJ': 158.20, 'WMT': 170.30, 'PG': 162.50,
    'MA': 460.80, 'UNH': 530.20, 'HD': 370.50
  }

  for (const [symbol, basePrice] of Object.entries(basePrices)) {
    let spread
    if (symbol.includes('JPY')) spread = 0.03
    else if (symbol === 'XAUUSD') spread = 0.50
    else if (symbol === 'XAGUSD') spread = 0.03
    else if (['XPTUSD', 'XPDUSD'].includes(symbol)) spread = 1.50
    else if (['USOIL', 'UKOIL'].includes(symbol)) spread = 0.05
    else if (symbol === 'NGAS') spread = 0.005
    else if (symbol === 'BTCUSD') spread = 15
    else if (symbol === 'ETHUSD') spread = 1.5
    else if (['BNBUSD', 'SOLUSD'].includes(symbol)) spread = 0.15
    else if (basePrice > 100) spread = 0.15
    else if (basePrice > 1) spread = 0.01
    else if (basePrice > 0.01) spread = 0.0005
    else spread = 0.0003

    const variation = (Math.random() - 0.5) * basePrice * 0.0002
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

async function disconnect() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (streamingConnection) {
    try { await streamingConnection.close() } catch (e) {}
    streamingConnection = null
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

// Get account info from SDK streaming connection (no REST calls)
function getAccountInfo() {
  if (!streamingConnection || !isConnected) {
    return null
  }
  try {
    const ts = streamingConnection.terminalState
    if (!ts) return null
    const info = ts.accountInformation
    if (!info) return null
    return {
      connected: true,
      platform: info.platform || 'mt5',
      broker: info.broker || 'Unknown',
      server: info.server || 'Unknown',
      login: info.login || 'Unknown',
      name: info.name || 'Unknown',
      balance: info.balance || 0,
      equity: info.equity || 0,
      currency: info.currency || 'USD'
    }
  } catch (e) {
    return null
  }
}

// Categorize symbol
function categorizeSymbol(symbol) {
  if (FOREX_SYMBOLS.includes(symbol)) return 'Forex'
  if (METAL_SYMBOLS.includes(symbol)) return 'Metals'
  if (ENERGY_SYMBOLS.includes(symbol)) return 'Energy'
  if (CRYPTO_SYMBOLS.includes(symbol)) return 'Crypto'
  if (STOCK_SYMBOLS.includes(symbol)) return 'Stocks'

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
  getAccountInfo,
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
