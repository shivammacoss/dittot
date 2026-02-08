import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import metaApiPriceService from '../services/metaApiPriceService.js'

const router = express.Router()

// Popular instruments per category (shown by default - 15 max)
const POPULAR_INSTRUMENTS = {
  Forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'EURAUD', 'AUDCAD', 'AUDJPY', 'CADJPY'],
  Metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'XAUEUR', 'XAUAUD', 'XAUGBP', 'XAUCHF', 'XAUJPY', 'XAGEUR'],
  Energy: ['USOIL', 'UKOIL', 'NGAS', 'BRENT', 'WTI', 'GASOLINE', 'HEATING'],
  Crypto: ['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'MATICUSD', 'LTCUSD', 'AVAXUSD', 'LINKUSD', 'SHIBUSD', 'UNIUSD', 'ATOMUSD'],
  Stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD']
}

// Use MetaAPI service for categorization
function categorizeSymbol(symbol) {
  return metaApiPriceService.categorizeSymbol(symbol)
}

// Default instruments fallback (minimal)
function getDefaultInstruments() {
  return [
    { symbol: 'EURUSD', name: 'EUR/USD', category: 'Forex', digits: 5 },
    { symbol: 'GBPUSD', name: 'GBP/USD', category: 'Forex', digits: 5 },
    { symbol: 'USDJPY', name: 'USD/JPY', category: 'Forex', digits: 3 },
    { symbol: 'XAUUSD', name: 'Gold', category: 'Metals', digits: 2 },
    { symbol: 'BTCUSD', name: 'Bitcoin', category: 'Crypto', digits: 2 },
  ]
}

// All default instruments (comprehensive list for when no API key)
function getAllDefaultInstruments() {
  const instruments = []
  
  // Forex pairs
  const forexPairs = [
    { symbol: 'EURUSD', name: 'EUR/USD' }, { symbol: 'GBPUSD', name: 'GBP/USD' },
    { symbol: 'USDJPY', name: 'USD/JPY' }, { symbol: 'USDCHF', name: 'USD/CHF' },
    { symbol: 'AUDUSD', name: 'AUD/USD' }, { symbol: 'NZDUSD', name: 'NZD/USD' },
    { symbol: 'USDCAD', name: 'USD/CAD' }, { symbol: 'EURGBP', name: 'EUR/GBP' },
    { symbol: 'EURJPY', name: 'EUR/JPY' }, { symbol: 'GBPJPY', name: 'GBP/JPY' },
    { symbol: 'EURCHF', name: 'EUR/CHF' }, { symbol: 'EURAUD', name: 'EUR/AUD' },
    { symbol: 'EURCAD', name: 'EUR/CAD' }, { symbol: 'AUDCAD', name: 'AUD/CAD' },
    { symbol: 'AUDJPY', name: 'AUD/JPY' }, { symbol: 'CADJPY', name: 'CAD/JPY' },
    { symbol: 'CHFJPY', name: 'CHF/JPY' }, { symbol: 'NZDJPY', name: 'NZD/JPY' },
    { symbol: 'GBPAUD', name: 'GBP/AUD' }, { symbol: 'GBPCAD', name: 'GBP/CAD' },
  ]
  forexPairs.forEach(p => instruments.push({
    symbol: p.symbol, name: p.name, category: 'Forex', digits: p.symbol.includes('JPY') ? 3 : 5,
    contractSize: 100000, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, popular: true
  }))
  
  // Metals
  const metals = [
    { symbol: 'XAUUSD', name: 'Gold', digits: 2 },
    { symbol: 'XAGUSD', name: 'Silver', digits: 3 },
    { symbol: 'XPTUSD', name: 'Platinum', digits: 2 },
    { symbol: 'XPDUSD', name: 'Palladium', digits: 2 },
  ]
  metals.forEach(m => instruments.push({
    symbol: m.symbol, name: m.name, category: 'Metals', digits: m.digits,
    contractSize: 100, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, popular: true
  }))
  
  // Energy
  const energy = [
    { symbol: 'USOIL', name: 'US Oil' },
    { symbol: 'UKOIL', name: 'UK Oil' },
    { symbol: 'NGAS', name: 'Natural Gas' },
  ]
  energy.forEach(e => instruments.push({
    symbol: e.symbol, name: e.name, category: 'Energy', digits: 3,
    contractSize: 1000, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, popular: true
  }))
  
  // Crypto
  const crypto = [
    { symbol: 'BTCUSD', name: 'Bitcoin' }, { symbol: 'ETHUSD', name: 'Ethereum' },
    { symbol: 'BNBUSD', name: 'BNB' }, { symbol: 'SOLUSD', name: 'Solana' },
    { symbol: 'XRPUSD', name: 'XRP' }, { symbol: 'ADAUSD', name: 'Cardano' },
    { symbol: 'DOGEUSD', name: 'Dogecoin' }, { symbol: 'DOTUSD', name: 'Polkadot' },
    { symbol: 'MATICUSD', name: 'Polygon' }, { symbol: 'LTCUSD', name: 'Litecoin' },
    { symbol: 'AVAXUSD', name: 'Avalanche' }, { symbol: 'LINKUSD', name: 'Chainlink' },
  ]
  crypto.forEach(c => instruments.push({
    symbol: c.symbol, name: c.name, category: 'Crypto', digits: 2,
    contractSize: 1, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, popular: true
  }))
  
  // Stocks
  const stocks = [
    { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'GOOGL', name: 'Google' }, { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'NVDA', name: 'NVIDIA' }, { symbol: 'META', name: 'Meta' },
    { symbol: 'TSLA', name: 'Tesla' }, { symbol: 'JPM', name: 'JPMorgan' },
    { symbol: 'V', name: 'Visa' }, { symbol: 'JNJ', name: 'Johnson & Johnson' },
  ]
  stocks.forEach(s => instruments.push({
    symbol: s.symbol, name: s.name, category: 'Stocks', digits: 2,
    contractSize: 1, minVolume: 0.01, maxVolume: 100, volumeStep: 0.01, popular: true
  }))
  
  return instruments
}

// GET /api/prices/instruments - Get all available instruments
router.get('/instruments', async (req, res) => {
  try {
    console.log('[MetaAPI] Returning supported instruments')
    
    // Get price cache from MetaAPI service
    const priceCache = metaApiPriceService.getPriceCache()
    
    // Get symbols that have actual price data
    const symbolsWithPrices = Array.from(priceCache.keys())
    
    // If no live prices available, return all default instruments
    if (symbolsWithPrices.length === 0) {
      console.log('[MetaAPI] No live prices, returning all default instruments')
      const allInstruments = getAllDefaultInstruments()
      return res.json({ success: true, instruments: allInstruments })
    }
    
    const instruments = symbolsWithPrices.map(symbol => {
      const category = categorizeSymbol(symbol)
      const isPopular = POPULAR_INSTRUMENTS[category]?.includes(symbol) || false
      return {
        symbol,
        name: getInstrumentName(symbol),
        category,
        digits: getDigits(symbol),
        contractSize: getContractSize(symbol),
        minVolume: 0.01,
        maxVolume: 100,
        volumeStep: 0.01,
        popular: isPopular
      }
    })
    
    console.log('[MetaAPI] Returning', instruments.length, 'instruments with live prices')
    res.json({ success: true, instruments })
  } catch (error) {
    console.error('[MetaAPI] Error fetching instruments:', error)
    res.json({ success: true, instruments: getAllDefaultInstruments() })
  }
})

// Helper to get instrument display name
function getInstrumentName(symbol) {
  const names = {
    // Forex Majors & Crosses
    'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD', 'USDJPY': 'USD/JPY', 'USDCHF': 'USD/CHF',
    'AUDUSD': 'AUD/USD', 'NZDUSD': 'NZD/USD', 'USDCAD': 'USD/CAD', 'EURGBP': 'EUR/GBP',
    'EURJPY': 'EUR/JPY', 'GBPJPY': 'GBP/JPY', 'EURCHF': 'EUR/CHF', 'EURAUD': 'EUR/AUD',
    'EURCAD': 'EUR/CAD', 'GBPAUD': 'GBP/AUD', 'GBPCAD': 'GBP/CAD', 'AUDCAD': 'AUD/CAD',
    'AUDJPY': 'AUD/JPY', 'CADJPY': 'CAD/JPY', 'CHFJPY': 'CHF/JPY', 'NZDJPY': 'NZD/JPY',
    'AUDNZD': 'AUD/NZD', 'CADCHF': 'CAD/CHF', 'GBPCHF': 'GBP/CHF', 'GBPNZD': 'GBP/NZD',
    'EURNZD': 'EUR/NZD', 'NZDCAD': 'NZD/CAD', 'NZDCHF': 'NZD/CHF', 'AUDCHF': 'AUD/CHF',
    // Exotics
    'USDSGD': 'USD/SGD', 'EURSGD': 'EUR/SGD', 'GBPSGD': 'GBP/SGD', 'USDZAR': 'USD/ZAR',
    'USDTRY': 'USD/TRY', 'EURTRY': 'EUR/TRY', 'USDMXN': 'USD/MXN', 'USDPLN': 'USD/PLN',
    'USDSEK': 'USD/SEK', 'USDNOK': 'USD/NOK', 'USDDKK': 'USD/DKK', 'USDCNH': 'USD/CNH',
    // Metals
    'XAUUSD': 'Gold', 'XAGUSD': 'Silver', 'XPTUSD': 'Platinum', 'XPDUSD': 'Palladium',
    // Commodities
    'USOIL': 'US Oil', 'UKOIL': 'UK Oil', 'NGAS': 'Natural Gas', 'COPPER': 'Copper',
    // Crypto
    'BTCUSD': 'Bitcoin', 'ETHUSD': 'Ethereum', 'BNBUSD': 'BNB', 'SOLUSD': 'Solana',
    'XRPUSD': 'XRP', 'ADAUSD': 'Cardano', 'DOGEUSD': 'Dogecoin', 'TRXUSD': 'TRON',
    'LINKUSD': 'Chainlink', 'MATICUSD': 'Polygon', 'DOTUSD': 'Polkadot',
    'SHIBUSD': 'Shiba Inu', 'LTCUSD': 'Litecoin', 'BCHUSD': 'Bitcoin Cash', 'AVAXUSD': 'Avalanche',
    'XLMUSD': 'Stellar', 'UNIUSD': 'Uniswap', 'ATOMUSD': 'Cosmos', 'ETCUSD': 'Ethereum Classic',
    'FILUSD': 'Filecoin', 'ICPUSD': 'Internet Computer', 'VETUSD': 'VeChain',
    'NEARUSD': 'NEAR Protocol', 'GRTUSD': 'The Graph', 'AAVEUSD': 'Aave', 'MKRUSD': 'Maker',
    'ALGOUSD': 'Algorand', 'FTMUSD': 'Fantom', 'SANDUSD': 'The Sandbox', 'MANAUSD': 'Decentraland',
    'AXSUSD': 'Axie Infinity', 'THETAUSD': 'Theta Network', 'XMRUSD': 'Monero', 'FLOWUSD': 'Flow',
    'SNXUSD': 'Synthetix', 'EOSUSD': 'EOS', 'CHZUSD': 'Chiliz', 'ENJUSD': 'Enjin Coin',
    'PEPEUSD': 'Pepe', 'ARBUSD': 'Arbitrum', 'OPUSD': 'Optimism', 'SUIUSD': 'Sui',
    'APTUSD': 'Aptos', 'INJUSD': 'Injective', 'TONUSD': 'Toncoin', 'HBARUSD': 'Hedera',
    // Commodities
    'GASOLINE': 'Gasoline', 'CATTLE': 'Live Cattle', 'COCOA': 'Cocoa', 'COFFEE': 'Coffee', 'CORN': 'Corn', 'COTTON': 'Cotton', 'ALUMINUM': 'Aluminum',
    // Indices
    'AEX': 'AEX Index', 'AUS200': 'Australia 200', 'CAC40': 'CAC 40', 'CAN60': 'Canada 60',
    'CN50': 'China 50', 'DAX': 'DAX German', 'DXY': 'US Dollar Index', 'EU50': 'Euro Stoxx 50',
    'EURX': 'Euro Index', 'GERMID50': 'MDAX 50',
    // Stocks
    'AAPL': 'Apple Inc', 'MSFT': 'Microsoft', 'GOOGL': 'Alphabet', 'AA': 'Alcoa Corp',
    'AAL': 'American Airlines', 'AAP': 'Advance Auto Parts', 'ABBV': 'AbbVie Inc',
    'ADBE': 'Adobe Inc', 'AIG': 'American Intl Group', 'AMD': 'AMD'
  }
  return names[symbol] || symbol
}

// Helper to get digits for symbol
function getDigits(symbol) {
  if (symbol.includes('JPY')) return 3
  if (symbol === 'XAUUSD') return 2
  if (symbol === 'XAGUSD') return 3
  const category = categorizeSymbol(symbol)
  if (category === 'Crypto') return 2
  if (category === 'Stocks') return 2
  return 5
}

// Helper to get contract size
function getContractSize(symbol) {
  const category = categorizeSymbol(symbol)
  if (category === 'Crypto') return 1
  if (category === 'Metals') return 100
  if (category === 'Energy') return 1000
  return 100000 // Forex default
}

// GET /api/prices/:symbol - Get single symbol price
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    const SYMBOL_MAP = metaApiPriceService.SYMBOL_MAP
    
    // Check if symbol is supported (allow any symbol, will return null if not available)
    if (!SYMBOL_MAP[symbol] && !symbol) {
      return res.status(404).json({ success: false, message: `Symbol ${symbol} not supported` })
    }
    
    // Try to get from cache first
    let price = metaApiPriceService.getPrice(symbol)
    
    // If not in cache, fetch via REST API
    if (!price) {
      price = await metaApiPriceService.fetchPriceREST(symbol)
    }
    
    if (price) {
      res.json({ success: true, price: { bid: price.bid, ask: price.ask } })
    } else {
      res.status(404).json({ success: false, message: 'Price not available' })
    }
  } catch (error) {
    console.error('[MetaAPI] Error fetching price:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/prices/batch - Get multiple symbol prices
router.post('/batch', async (req, res) => {
  try {
    const { symbols } = req.body
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ success: false, message: 'symbols array required' })
    }
    
    const SYMBOL_MAP = metaApiPriceService.SYMBOL_MAP
    const prices = {}
    const missingSymbols = []
    
    // Get prices from cache first
    for (const symbol of symbols) {
      // Allow any symbol, not just mapped ones
      
      const cached = metaApiPriceService.getPrice(symbol)
      if (cached) {
        prices[symbol] = { bid: cached.bid, ask: cached.ask }
      } else {
        missingSymbols.push(symbol)
      }
    }
    
    // Fetch missing prices via REST API
    if (missingSymbols.length > 0) {
      const batchPrices = await metaApiPriceService.fetchBatchPricesREST(missingSymbols)
      for (const [symbol, price] of Object.entries(batchPrices)) {
        prices[symbol] = { bid: price.bid, ask: price.ask }
      }
    }
    
    res.json({ success: true, prices })
  } catch (error) {
    console.error('[MetaAPI] Error fetching batch prices:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
