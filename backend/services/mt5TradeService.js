// MT5 Trade Service - Push/close trades on MT5 via MetaApi REST API
// Credentials loaded dynamically from DB (MT5Settings), with .env fallback

import dotenv from 'dotenv'
import Trade from '../models/Trade.js'
import User from '../models/User.js'
import MT5Settings from '../models/MT5Settings.js'

dotenv.config()

// Credential cache (refreshed from DB periodically)
let credCache = null
let credCacheTime = 0
const CRED_CACHE_TTL = 30000 // 30 seconds

// Get active MT5 credentials (DB first, then .env fallback)
async function getCredentials() {
  if (credCache && (Date.now() - credCacheTime) < CRED_CACHE_TTL) {
    return credCache
  }

  try {
    const settings = await MT5Settings.getSettings()
    if (settings.isActive && settings.metaApiToken && settings.accountId) {
      credCache = {
        token: settings.metaApiToken,
        accountId: settings.accountId,
        region: settings.region || 'new-york',
        source: 'database'
      }
      credCacheTime = Date.now()
      return credCache
    }
  } catch (e) {
    console.error('[MT5Trade] Error loading DB credentials:', e.message)
  }

  // Fallback to .env
  const token = process.env.MT5_TRADE_TOKEN || process.env.METAAPI_TOKEN || ''
  const accountId = process.env.MT5_TRADE_ACCOUNT_ID || process.env.METAAPI_ACCOUNT_ID || ''
  const region = process.env.METAAPI_REGION || 'new-york'

  credCache = { token, accountId, region, source: 'env' }
  credCacheTime = Date.now()
  return credCache
}

// Build API base URL from region
function getApiBase(region) {
  return `https://mt-client-api-v1.${region}.agiliumtrade.ai`
}

// Clear credential cache (called when settings are updated)
function clearCredentialCache() {
  credCache = null
  credCacheTime = 0
  cachedStatus = null
  cachedStatusTime = 0
}

// Push a trade to MT5 (non-blocking, called after trade creation)
async function pushTradeToMT5(trade) {
  try {
    const creds = await getCredentials()
    if (!creds.token || !creds.accountId) {
      console.log('[MT5Trade] Skipping push - MetaApi not configured')
      await updateTradeStatus(trade._id, 'FAILED', null, 'MetaApi not configured')
      return null
    }

    // Check if user is A Book
    const user = await User.findById(trade.userId)
    if (!user || user.bookType !== 'A') {
      return null // Not an A Book user, skip
    }

    console.log(`[MT5Trade] Pushing trade ${trade.tradeId} to MT5: ${trade.side} ${trade.quantity} ${trade.symbol}`)

    // Mark as pending
    await updateTradeStatus(trade._id, 'PENDING')

    // Build MetaApi trade request
    const actionType = trade.side === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL'
    
    const tradeRequest = {
      actionType,
      symbol: trade.symbol,
      volume: trade.quantity
    }

    // Add SL/TP if set
    if (trade.stopLoss) tradeRequest.stopLoss = trade.stopLoss
    if (trade.takeProfit) tradeRequest.takeProfit = trade.takeProfit
    
    // Add comment for tracking
    tradeRequest.comment = `AB-${trade.tradeId}`

    const API_BASE = getApiBase(creds.region)
    const url = `${API_BASE}/users/current/accounts/${creds.accountId}/trade`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'auth-token': creds.token
      },
      body: JSON.stringify(tradeRequest)
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}`
      console.error(`[MT5Trade] Push failed for ${trade.tradeId}: ${errorMsg}`)
      await updateTradeStatus(trade._id, 'FAILED', null, errorMsg)
      return null
    }

    // MetaApi returns: { numericCode, stringCode, message, orderId, positionId }
    const positionId = data.positionId || data.orderId || null
    
    console.log(`[MT5Trade] Trade ${trade.tradeId} pushed to MT5. Position: ${positionId}, Response: ${data.stringCode}`)
    
    await updateTradeStatus(trade._id, 'PUSHED', positionId ? String(positionId) : null)
    
    return { positionId, response: data }
  } catch (error) {
    console.error(`[MT5Trade] Error pushing trade ${trade.tradeId}:`, error.message)
    await updateTradeStatus(trade._id, 'FAILED', null, error.message)
    return null
  }
}

// Close an MT5 position (called when A Book trade is closed on platform)
async function closeMT5Trade(trade) {
  try {
    const creds = await getCredentials()
    if (!creds.token || !creds.accountId) {
      console.log('[MT5Trade] Skipping close - MetaApi not configured')
      return null
    }

    if (!trade.mt5PositionId) {
      console.log(`[MT5Trade] No MT5 position ID for trade ${trade.tradeId}, skipping close`)
      return null
    }

    console.log(`[MT5Trade] Closing MT5 position ${trade.mt5PositionId} for trade ${trade.tradeId}`)

    const tradeRequest = {
      actionType: 'POSITION_CLOSE_ID',
      positionId: trade.mt5PositionId
    }

    const API_BASE = getApiBase(creds.region)
    const url = `${API_BASE}/users/current/accounts/${creds.accountId}/trade`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'auth-token': creds.token
      },
      body: JSON.stringify(tradeRequest)
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}`
      console.error(`[MT5Trade] Close failed for ${trade.tradeId}: ${errorMsg}`)
      await updateTradeStatus(trade._id, 'CLOSE_FAILED', trade.mt5PositionId, errorMsg)
      return null
    }

    console.log(`[MT5Trade] MT5 position ${trade.mt5PositionId} closed. Response: ${data.stringCode}`)
    
    await updateTradeStatus(trade._id, 'CLOSED', trade.mt5PositionId)
    
    return data
  } catch (error) {
    console.error(`[MT5Trade] Error closing MT5 trade ${trade.tradeId}:`, error.message)
    return null
  }
}

// Get all open positions from MT5 account
async function getMT5Positions() {
  try {
    const creds = await getCredentials()
    if (!creds.token || !creds.accountId) return []

    const API_BASE = getApiBase(creds.region)
    const url = `${API_BASE}/users/current/accounts/${creds.accountId}/positions`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'auth-token': creds.token
      }
    })

    if (!response.ok) {
      console.error(`[MT5Trade] Failed to fetch positions: HTTP ${response.status}`)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('[MT5Trade] Error fetching MT5 positions:', error.message)
    return []
  }
}

// Cached connection status to avoid 429 rate limits
let cachedStatus = null
let cachedStatusTime = 0
const STATUS_CACHE_TTL = 60000 // 60 seconds

// Get MT5 connection status (cached to avoid rate limits)
async function getConnectionStatus() {
  try {
    const creds = await getCredentials()
    if (!creds.token || !creds.accountId) {
      return { connected: false, error: 'MetaApi not configured', source: creds.source }
    }

    // Return cached status if still fresh
    if (cachedStatus && (Date.now() - cachedStatusTime) < STATUS_CACHE_TTL) {
      return cachedStatus
    }

    const API_BASE = getApiBase(creds.region)
    const url = `${API_BASE}/users/current/accounts/${creds.accountId}/account-information`
    
    let response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'auth-token': creds.token
      }
    })

    // Retry once after delay if rate limited
    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 2000))
      response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'auth-token': creds.token
        }
      })
    }

    if (!response.ok) {
      if (response.status === 429 && cachedStatus) {
        return cachedStatus
      }
      return { connected: false, error: `HTTP ${response.status}`, source: creds.source }
    }

    const data = await response.json()
    
    cachedStatus = {
      connected: true,
      platform: data.platform || 'mt5',
      broker: data.broker || 'Unknown',
      server: data.server || 'Unknown',
      login: data.login || 'Unknown',
      name: data.name || 'Unknown',
      balance: data.balance || 0,
      equity: data.equity || 0,
      currency: data.currency || 'USD',
      source: creds.source
    }
    cachedStatusTime = Date.now()
    
    return cachedStatus
  } catch (error) {
    if (cachedStatus) return cachedStatus
    return { connected: false, error: error.message }
  }
}

// Test connection with given credentials (used by admin before saving)
async function testConnection(token, accountId, region = 'new-york') {
  try {
    if (!token || !accountId) {
      return { connected: false, error: 'Token and Account ID are required' }
    }

    const API_BASE = getApiBase(region)
    const url = `${API_BASE}/users/current/accounts/${accountId}/account-information`
    
    let response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'auth-token': token
      }
    })

    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 2000))
      response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'auth-token': token
        }
      })
    }

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    
    return {
      connected: true,
      platform: data.platform || 'mt5',
      broker: data.broker || 'Unknown',
      server: data.server || 'Unknown',
      login: data.login || 'Unknown',
      name: data.name || 'Unknown',
      balance: data.balance || 0,
      equity: data.equity || 0,
      currency: data.currency || 'USD'
    }
  } catch (error) {
    return { connected: false, error: error.message }
  }
}

// Helper: update trade MT5 status in DB
async function updateTradeStatus(tradeId, status, positionId = null, error = null) {
  try {
    const update = {
      mt5PushStatus: status,
      mt5PushError: error
    }
    if (positionId !== null) update.mt5PositionId = positionId
    if (status === 'PUSHED') update.mt5PushedAt = new Date()
    
    await Trade.findByIdAndUpdate(tradeId, update)
  } catch (e) {
    console.error('[MT5Trade] Error updating trade status:', e.message)
  }
}

export default {
  pushTradeToMT5,
  closeMT5Trade,
  getMT5Positions,
  getConnectionStatus,
  testConnection,
  clearCredentialCache
}
