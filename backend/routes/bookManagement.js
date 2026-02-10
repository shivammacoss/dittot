import express from 'express'
import User from '../models/User.js'
import Trade from '../models/Trade.js'
import TradingAccount from '../models/TradingAccount.js'
import mt5TradeService from '../services/mt5TradeService.js'
import MT5Settings from '../models/MT5Settings.js'

const router = express.Router()

// GET /api/book-management/users - Get all users with their book assignments
router.get('/users', async (req, res) => {
  try {
    const { bookType, search } = req.query
    let query = {}
    
    if (bookType === 'A') query.bookType = 'A'
    else if (bookType === 'B') query.bookType = 'B'
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }
    
    const users = await User.find(query)
      .select('firstName email phone bookType createdAt isBlocked')
      .sort({ createdAt: -1 })
    
    // Get stats
    const totalABook = await User.countDocuments({ bookType: 'A' })
    const totalBBook = await User.countDocuments({ bookType: { $in: ['B', null] } })
    
    res.json({
      success: true,
      users,
      stats: {
        totalABook,
        totalBBook,
        total: totalABook + totalBBook
      }
    })
  } catch (error) {
    console.error('Error fetching book management users:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/book-management/assign - Assign user to A or B book
router.put('/assign', async (req, res) => {
  try {
    const { userId, bookType } = req.body
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' })
    }
    
    if (!['A', 'B'].includes(bookType)) {
      return res.status(400).json({ success: false, message: 'Book type must be A or B' })
    }
    
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    user.bookType = bookType
    
    await user.save()
    
    res.json({
      success: true,
      message: `User ${user.firstName} assigned to ${bookType} Book`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
        bookType: user.bookType
      }
    })
  } catch (error) {
    console.error('Error assigning book:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/book-management/bulk-assign - Bulk assign users to a book
router.put('/bulk-assign', async (req, res) => {
  try {
    const { userIds, bookType } = req.body
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'User IDs array is required' })
    }
    
    if (!['A', 'B'].includes(bookType)) {
      return res.status(400).json({ success: false, message: 'Book type must be A or B' })
    }
    
    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { bookType } }
    )
    
    res.json({
      success: true,
      message: `${userIds.length} users assigned to ${bookType} Book`
    })
  } catch (error) {
    console.error('Error bulk assigning book:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/book-management/mt5-status - Get global MT5 connection status for A Book
router.get('/mt5-status', async (req, res) => {
  try {
    const status = await mt5TradeService.getConnectionStatus()
    
    // Get A Book trade push stats
    const totalPushed = await Trade.countDocuments({ mt5PushStatus: 'PUSHED' })
    const totalFailed = await Trade.countDocuments({ mt5PushStatus: 'FAILED' })
    const totalPending = await Trade.countDocuments({ mt5PushStatus: 'PENDING' })
    
    res.json({
      success: true,
      mt5: status,
      pushStats: {
        pushed: totalPushed,
        failed: totalFailed,
        pending: totalPending
      }
    })
  } catch (error) {
    console.error('Error fetching MT5 status:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/book-management/mt5-settings - Get current MT5 trade credentials
router.get('/mt5-settings', async (req, res) => {
  try {
    const settings = await MT5Settings.getSettings()
    res.json({
      success: true,
      settings: {
        metaApiToken: settings.metaApiToken ? '••••' + settings.metaApiToken.slice(-8) : '',
        accountId: settings.accountId || '',
        region: settings.region || 'new-york',
        label: settings.label || '',
        isActive: settings.isActive,
        lastConnectedAt: settings.lastConnectedAt,
        hasToken: !!settings.metaApiToken
      }
    })
  } catch (error) {
    console.error('Error fetching MT5 settings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/book-management/mt5-settings - Save MT5 trade credentials
router.put('/mt5-settings', async (req, res) => {
  try {
    const { metaApiToken, accountId, region, label, isActive } = req.body
    
    const settings = await MT5Settings.getSettings()
    
    if (metaApiToken !== undefined) settings.metaApiToken = metaApiToken
    if (accountId !== undefined) settings.accountId = accountId
    if (region !== undefined) settings.region = region
    if (label !== undefined) settings.label = label
    if (isActive !== undefined) settings.isActive = isActive
    
    if (isActive && metaApiToken && accountId) {
      settings.lastConnectedAt = new Date()
    }
    
    await settings.save()
    
    // Clear credential cache so new settings take effect immediately
    mt5TradeService.clearCredentialCache()
    
    res.json({
      success: true,
      message: 'MT5 settings saved successfully',
      settings: {
        metaApiToken: settings.metaApiToken ? '••••' + settings.metaApiToken.slice(-8) : '',
        accountId: settings.accountId || '',
        region: settings.region || 'new-york',
        label: settings.label || '',
        isActive: settings.isActive,
        lastConnectedAt: settings.lastConnectedAt,
        hasToken: !!settings.metaApiToken
      }
    })
  } catch (error) {
    console.error('Error saving MT5 settings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/book-management/mt5-test - Test MT5 connection with given credentials
router.post('/mt5-test', async (req, res) => {
  try {
    const { metaApiToken, accountId, region } = req.body
    
    if (!metaApiToken || !accountId) {
      return res.status(400).json({ success: false, message: 'Token and Account ID are required' })
    }
    
    const result = await mt5TradeService.testConnection(metaApiToken, accountId, region || 'new-york')
    
    res.json({
      success: result.connected,
      ...result
    })
  } catch (error) {
    console.error('Error testing MT5 connection:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/book-management/mt5-settings - Disconnect/remove MT5 credentials
router.delete('/mt5-settings', async (req, res) => {
  try {
    const settings = await MT5Settings.getSettings()
    settings.metaApiToken = ''
    settings.accountId = ''
    settings.isActive = false
    settings.lastConnectedAt = null
    await settings.save()
    
    mt5TradeService.clearCredentialCache()
    
    res.json({ success: true, message: 'MT5 connection removed' })
  } catch (error) {
    console.error('Error removing MT5 settings:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/book-management/mt5-positions - Get open positions from MT5
router.get('/mt5-positions', async (req, res) => {
  try {
    const positions = await mt5TradeService.getMT5Positions()
    res.json({ success: true, positions })
  } catch (error) {
    console.error('Error fetching MT5 positions:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/book-management/user/:userId - Get single user book details
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('firstName email phone bookType')
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    // Get user's trading accounts
    const accounts = await TradingAccount.find({ userId: user._id })
    
    // Get user's open trades count
    const openTrades = await Trade.countDocuments({ userId: user._id, status: 'OPEN' })
    const totalTrades = await Trade.countDocuments({ userId: user._id })
    
    res.json({
      success: true,
      user,
      accounts,
      tradeStats: { openTrades, totalTrades }
    })
  } catch (error) {
    console.error('Error fetching user book details:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/book-management/check-editable/:tradeId - Check if a trade is editable
router.get('/check-editable/:tradeId', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.tradeId)
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' })
    }
    
    const user = await User.findById(trade.userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    const isEditable = user.bookType !== 'A' // A Book trades cannot be edited
    
    res.json({
      success: true,
      isEditable,
      bookType: user.bookType,
      message: user.bookType === 'A' 
        ? 'This trade belongs to an A Book user and cannot be edited' 
        : 'This trade can be edited'
    })
  } catch (error) {
    console.error('Error checking trade editability:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
