import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import WebSocket from 'ws'
import cron from 'node-cron'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import accountTypesRoutes from './routes/accountTypes.js'
import tradingAccountsRoutes from './routes/tradingAccounts.js'
import walletRoutes from './routes/wallet.js'
import paymentMethodsRoutes from './routes/paymentMethods.js'
import tradeRoutes from './routes/trade.js'
import walletTransferRoutes from './routes/walletTransfer.js'
import adminTradeRoutes from './routes/adminTrade.js'
import copyTradingRoutes from './routes/copyTrading.js'
import ibRoutes from './routes/ibNew.js'
import propTradingRoutes from './routes/propTrading.js'
import chargesRoutes from './routes/charges.js'
import pricesRoutes from './routes/prices.js'
import earningsRoutes from './routes/earnings.js'
import supportRoutes from './routes/support.js'
import kycRoutes from './routes/kyc.js'
import themeRoutes from './routes/theme.js'
import adminManagementRoutes from './routes/adminManagement.js'
import uploadRoutes from './routes/upload.js'
import emailTemplatesRoutes from './routes/emailTemplates.js'
import bonusRoutes from './routes/bonus.js'
import bannerRoutes from './routes/banner.js'
import employeeRoutes from './routes/employee.js'
import employeeManagementRoutes from './routes/employeeManagement.js'
import bookManagementRoutes from './routes/bookManagement.js'
import path from 'path'
import { fileURLToPath } from 'url'
import copyTradingEngine from './services/copyTradingEngine.js'
import tradeEngine from './services/tradeEngine.js'
import propTradingEngine from './services/propTradingEngine.js'
import metaApiPriceService from './services/metaApiPriceService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Store connected clients
const connectedClients = new Map()
const priceSubscribers = new Set()

// Price cache for real-time streaming (shared with MetaAPI service)
const priceCache = metaApiPriceService.getPriceCache()

// MetaAPI handles all asset classes: Forex, Crypto, Commodities

// MetaAPI price update handler - emit tick-to-tick updates
metaApiPriceService.setOnPriceUpdate((symbol, price) => {
  if (priceSubscribers.size > 0) {
    // Emit individual price update for tick-to-tick
    io.to('prices').emit('priceUpdate', { symbol, price })
    // Also emit as priceStream for compatibility (single symbol update)
    io.to('prices').emit('priceStream', {
      prices: { [symbol]: price },
      updated: { [symbol]: true },
      timestamp: Date.now()
    })
  }
})

// MetaAPI connection status handler
metaApiPriceService.setOnConnectionChange((connected) => {
  console.log(`[MetaAPI] ${connected ? 'Connected' : 'Disconnected'}`)
})

// Start MetaAPI price connections
metaApiPriceService.connect()

// Background stop-out check every 5 seconds
setInterval(async () => {
  try {
    if (priceCache.size === 0) return
    
    const currentPrices = {}
    priceCache.forEach((data, symbol) => {
      currentPrices[symbol] = { bid: data.bid, ask: data.ask }
    })
    
    const result = await tradeEngine.checkAllAccountsStopOut(currentPrices)
    if (result.stopOuts && result.stopOuts.length > 0) {
      console.log(`[STOP-OUT] ${result.stopOuts.length} accounts stopped out`)
    }
  } catch (error) {}
}, 5000)

// Background SL/TP check every 1 second
setInterval(async () => {
  try {
    if (priceCache.size === 0) return
    
    const currentPrices = {}
    priceCache.forEach((data, symbol) => {
      currentPrices[symbol] = { bid: data.bid, ask: data.ask }
    })
    
    const closedRegularTrades = await tradeEngine.checkSlTpForAllTrades(currentPrices)
    const closedChallengeTrades = await propTradingEngine.checkSlTpForAllTrades(currentPrices)
    
    const allClosed = [...closedRegularTrades, ...closedChallengeTrades]
    if (allClosed.length > 0) {
      console.log(`[SL/TP AUTO] ${allClosed.length} trades closed by SL/TP`)
      allClosed.forEach(ct => {
        console.log(`[SL/TP AUTO] ${ct.trade?.symbol || 'Unknown'} closed by ${ct.trigger || ct.reason} - PnL: ${ct.pnl?.toFixed(2) || 0}`)
      })
    }
  } catch (error) {}
}, 1000)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('subscribePrices', () => {
    socket.join('prices')
    priceSubscribers.add(socket.id)
    socket.emit('priceStream', {
      prices: Object.fromEntries(priceCache),
      updated: {},
      timestamp: Date.now()
    })
    console.log(`Socket ${socket.id} subscribed to price stream`)
  })

  socket.on('unsubscribePrices', () => {
    socket.leave('prices')
    priceSubscribers.delete(socket.id)
  })

  socket.on('subscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.join(`account:${tradingAccountId}`)
      connectedClients.set(socket.id, tradingAccountId)
      console.log(`Socket ${socket.id} subscribed to account ${tradingAccountId}`)
    }
  })

  socket.on('unsubscribe', (data) => {
    const { tradingAccountId } = data
    if (tradingAccountId) {
      socket.leave(`account:${tradingAccountId}`)
      connectedClients.delete(socket.id)
    }
  })

  socket.on('priceUpdate', async (data) => {
    const { tradingAccountId, prices } = data
    if (tradingAccountId && prices) {
      io.to(`account:${tradingAccountId}`).emit('accountUpdate', {
        tradingAccountId,
        prices,
        timestamp: Date.now()
      })
    }
  })

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id)
    priceSubscribers.delete(socket.id)
    console.log('Client disconnected:', socket.id)
  })
})

// Make io accessible to routes
app.set('io', io)

// Middleware
app.use(compression())
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB')
    // Migrate existing users with null bookType to 'B'
    try {
      const result = await mongoose.model('User').updateMany(
        { $or: [{ bookType: null }, { bookType: { $exists: false } }] },
        { $set: { bookType: 'B' } }
      )
      if (result.modifiedCount > 0) {
        console.log(`[Migration] Set ${result.modifiedCount} users with null bookType to B Book`)
      }
    } catch (err) {
      console.error('[Migration] Error migrating bookType:', err)
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/account-types', accountTypesRoutes)
app.use('/api/trading-accounts', tradingAccountsRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/payment-methods', paymentMethodsRoutes)
app.use('/api/trade', tradeRoutes)
app.use('/api/wallet-transfer', walletTransferRoutes)
app.use('/api/admin/trade', adminTradeRoutes)
app.use('/api/copy', copyTradingRoutes)
app.use('/api/ib', ibRoutes)
app.use('/api/prop', propTradingRoutes)
app.use('/api/charges', chargesRoutes)
app.use('/api/prices', pricesRoutes)
app.use('/api/earnings', earningsRoutes)
app.use('/api/support', supportRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/api/theme', themeRoutes)
app.use('/api/admin-mgmt', adminManagementRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/email-templates', emailTemplatesRoutes)
app.use('/api/bonus', bonusRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/employee', employeeRoutes)
app.use('/api/employee-mgmt', employeeManagementRoutes)
app.use('/api/book-management', bookManagementRoutes)

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Serve APK download
app.get('/downloads/dittot.apk', (req, res) => {
  const apkPath = path.join(__dirname, 'apk', 'dittot.apk')
  res.download(apkPath, 'dittot.apk', (err) => {
    if (err) {
      console.error('APK download error:', err)
      res.status(404).json({ error: 'APK not found' })
    }
  })
})

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'dittot API is running' })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  
  // Schedule daily commission calculation for copy trading
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Running daily copy trade commission calculation...')
    try {
      const results = await copyTradingEngine.calculateDailyCommission()
      console.log(`[CRON] Daily commission calculated: ${results.length} commission records processed`)
    } catch (error) {
      console.error('[CRON] Error calculating daily commission:', error)
    }
  }, {
    timezone: 'UTC'
  })
  console.log('[CRON] Daily commission calculation scheduled for 23:59 UTC')
  
  // Schedule daily swap application for all open trades
  cron.schedule('0 22 * * *', async () => {
    console.log('[CRON] Applying daily swap to all open trades...')
    try {
      await tradeEngine.applySwap()
      console.log('[CRON] Swap applied successfully')
    } catch (error) {
      console.error('[CRON] Error applying swap:', error)
    }
  }, {
    timezone: 'UTC'
  })
  console.log('[CRON] Daily swap application scheduled for 22:00 UTC')
})
