import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  BookMarked,
  Shield,
  Link,
  Unlink,
  Server,
  Eye,
  X,
  Users,
  AlertTriangle
} from 'lucide-react'
import priceStreamService from '../services/priceStream'
import { API_URL } from '../config/api'

const AdminABookTrades = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [trades, setTrades] = useState([])
  const [stats, setStats] = useState({ total: 0, open: 0, volume: 0, pnl: 0, aBookUsers: 0 })
  const [loading, setLoading] = useState(true)
  const [livePrices, setLivePrices] = useState({})
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTrades, setTotalTrades] = useState(0)
  const tradesPerPage = 20

  useEffect(() => {
    fetchTrades()
  }, [filterStatus, currentPage])

  // Live price streaming
  useEffect(() => {
    const unsubscribe = priceStreamService.subscribe('adminABookTrades', (prices) => {
      if (!prices || Object.keys(prices).length === 0) return
      setLivePrices(prev => {
        const merged = { ...prev }
        Object.entries(prices).forEach(([symbol, price]) => {
          if (price && price.bid) {
            merged[symbol] = price
          }
        })
        return merged
      })
    })
    return () => unsubscribe()
  }, [])

  // Fallback price fetch
  useEffect(() => {
    const fetchPricesForTrades = async () => {
      const openTrades = trades.filter(t => t.status === 'OPEN')
      if (openTrades.length === 0) return
      const symbols = [...new Set(openTrades.map(t => t.symbol))]
      const missingSymbols = symbols.filter(s => !livePrices[s]?.bid)
      if (missingSymbols.length === 0) return
      try {
        const res = await fetch(`${API_URL}/prices/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols })
        })
        const data = await res.json()
        if (data.success && data.prices) {
          setLivePrices(prev => {
            const merged = { ...prev }
            Object.entries(data.prices).forEach(([symbol, price]) => {
              if (price && price.bid) merged[symbol] = price
            })
            return merged
          })
        }
      } catch (e) {
        console.error('Error fetching prices:', e)
      }
    }
    fetchPricesForTrades()
    const interval = setInterval(fetchPricesForTrades, 3000)
    return () => clearInterval(interval)
  }, [trades])

  const getDefaultContractSize = (symbol) => {
    if (symbol === 'XAUUSD') return 100
    if (symbol === 'XAGUSD') return 5000
    if (['BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BCHUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'DOTUSD', 'MATICUSD', 'AVAXUSD', 'LINKUSD'].includes(symbol)) return 1
    return 100000
  }

  const calculateFloatingPnl = (trade) => {
    if (trade.status !== 'OPEN') return trade.realizedPnl || 0
    const prices = livePrices[trade.symbol]
    if (!prices || !prices.bid) return trade._lastPnl || 0
    const currentPrice = trade.side === 'BUY' ? prices.bid : prices.ask
    if (!currentPrice || currentPrice <= 0) return trade._lastPnl || 0
    const contractSize = trade.contractSize || getDefaultContractSize(trade.symbol)
    const pnl = trade.side === 'BUY'
      ? (currentPrice - trade.openPrice) * trade.quantity * contractSize
      : (trade.openPrice - currentPrice) * trade.quantity * contractSize
    const finalPnl = pnl - (trade.commission || 0) - (trade.swap || 0)
    trade._lastPnl = finalPnl
    return finalPnl
  }

  const fetchTrades = async () => {
    setLoading(true)
    try {
      const offset = (currentPage - 1) * tradesPerPage
      const statusParam = filterStatus !== 'all' ? `&status=${filterStatus.toUpperCase()}` : ''
      const res = await fetch(`${API_URL}/admin/trade/a-book?limit=${tradesPerPage}&offset=${offset}${statusParam}`)
      const data = await res.json()
      if (data.trades) {
        setTrades(data.trades)
        setTotalTrades(data.total || data.trades.length)
        const openTrades = data.trades.filter(t => t.status === 'OPEN')
        const closedTrades = data.trades.filter(t => t.status === 'CLOSED')
        const totalVolume = data.trades.reduce((sum, t) => sum + (t.quantity * (t.contractSize || 100) * t.openPrice), 0)
        const totalPnl = closedTrades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0)
        setStats({
          total: data.total || data.trades.length,
          open: openTrades.length,
          volume: totalVolume,
          pnl: totalPnl,
          aBookUsers: data.totalABookUsers || 0
        })
      }
    } catch (error) {
      console.error('Error fetching A Book trades:', error)
    }
    setLoading(false)
  }

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'OPEN': return 'bg-green-500/20 text-green-500'
      case 'CLOSED': return 'bg-gray-500/20 text-gray-400'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-500'
      case 'CANCELLED': return 'bg-red-500/20 text-red-500'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'OPEN': return <CheckCircle size={14} />
      case 'CLOSED': return <XCircle size={14} />
      case 'PENDING': return <Clock size={14} />
      default: return null
    }
  }

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.tradeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.userId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <AdminLayout title="A Book Trades" subtitle="View all trades from A Book users (read-only)">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-blue-500/30">
          <p className="text-gray-500 text-sm mb-1">A Book Users</p>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-400" />
            <p className="text-blue-400 text-2xl font-bold">{stats.aBookUsers}</p>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-500 text-sm mb-1">Total Trades</p>
          <p className="text-white text-2xl font-bold">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-500 text-sm mb-1">Open Positions</p>
          <p className="text-white text-2xl font-bold">{stats.open}</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-500 text-sm mb-1">Total Volume</p>
          <p className="text-white text-2xl font-bold">${(stats.volume / 1000000).toFixed(2)}M</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <p className="text-gray-500 text-sm mb-1">A Book P&L</p>
          <p className={`text-2xl font-bold ${stats.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Shield size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-blue-400">A Book — Read Only</h4>
          <p className="text-xs text-gray-400 mt-1">These trades belong to A Book users and cannot be edited or closed by admin. Trades are automatically pushed to the global MT5 account.</p>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <BookMarked size={20} className="text-blue-400" />
            <h2 className="text-white font-semibold text-lg">A Book Trades</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
              className="bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="pending">Pending</option>
            </select>
            <button
              onClick={fetchTrades}
              className="p-2.5 bg-dark-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading A Book trades...</div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <BookMarked size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No A Book trades found</p>
            <p className="text-gray-600 text-sm mt-1">Assign users to A Book in Book Management to see their trades here</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden p-4 space-y-3">
              {filteredTrades.map((trade) => (
                <div key={trade._id} className="bg-dark-700 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{trade.symbol}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        trade.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {trade.side}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(trade.status)}`}>
                      {getStatusIcon(trade.status)}
                      {trade.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">User</p>
                      <p className="text-white truncate">{trade.userId?.firstName || trade.userId?.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Lots</p>
                      <p className="text-white">{trade.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Open Price</p>
                      <p className="text-white">${trade.openPrice?.toFixed(5)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Live P&L</p>
                      <p className={`font-semibold ${calculateFloatingPnl(trade) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {calculateFloatingPnl(trade) >= 0 ? '+' : ''}${calculateFloatingPnl(trade).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {/* MT5 Push Status */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-600">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <BookMarked size={10} /> A Book
                    </span>
                    {trade.mt5PushStatus === 'PUSHED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        <CheckCircle size={10} /> MT5 Pushed
                      </span>
                    ) : trade.mt5PushStatus === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30" title={trade.mt5PushError}>
                        <AlertTriangle size={10} /> MT5 Failed
                      </span>
                    ) : trade.mt5PushStatus === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <Clock size={10} /> MT5 Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-500 border border-gray-500/30">
                        <Unlink size={10} /> Not Pushed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Trade ID</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">User</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Symbol</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Side</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Lots</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Open Price</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Current Price</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">P&L</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">MT5</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade) => {
                    const prices = livePrices[trade.symbol]
                    const currentPrice = prices ? (trade.side === 'BUY' ? prices.bid : prices.ask) : null
                    return (
                      <tr key={trade._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                        <td className="py-4 px-4 text-white font-mono text-sm">{trade.tradeId}</td>
                        <td className="py-4 px-4">
                          <p className="text-white">{trade.userId?.firstName || trade.userId?.email}</p>
                          <p className="text-gray-500 text-xs font-mono">{trade.userId?._id || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4 text-white font-medium">{trade.symbol}</td>
                        <td className="py-4 px-4">
                          <span className={`flex items-center gap-1 ${trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.side === 'BUY' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-white">{trade.quantity}</td>
                        <td className="py-4 px-4 text-gray-400">${trade.openPrice?.toFixed(5)}</td>
                        <td className="py-4 px-4">
                          {trade.status === 'OPEN' && currentPrice ? (
                            <span className="text-white">${currentPrice.toFixed(5)}</span>
                          ) : trade.status === 'CLOSED' ? (
                            <span className="text-gray-400">${trade.closePrice?.toFixed(5) || '—'}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className={`py-4 px-4 font-medium ${calculateFloatingPnl(trade) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {calculateFloatingPnl(trade) >= 0 ? '+' : ''}${calculateFloatingPnl(trade).toFixed(2)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs w-fit ${getStatusColor(trade.status)}`}>
                              {getStatusIcon(trade.status)}
                              {trade.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {trade.mt5PushStatus === 'PUSHED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30" title={`Position: ${trade.mt5PositionId || 'N/A'}`}>
                              <CheckCircle size={10} /> Pushed
                            </span>
                          ) : trade.mt5PushStatus === 'FAILED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30" title={trade.mt5PushError || 'Unknown error'}>
                              <AlertTriangle size={10} /> Failed
                            </span>
                          ) : trade.mt5PushStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              <Clock size={10} /> Pending
                            </span>
                          ) : trade.mt5PushStatus === 'CLOSED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                              <XCircle size={10} /> Closed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-500 border border-gray-500/30">
                              <Unlink size={10} /> —
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => { setSelectedTrade(trade); setShowDetailModal(true) }}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-gray-400 hover:text-blue-500"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalTrades > tradesPerPage && (
              <div className="p-4 border-t border-gray-800 flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  Showing {((currentPage - 1) * tradesPerPage) + 1} - {Math.min(currentPage * tradesPerPage, totalTrades)} of {totalTrades} trades
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-white px-3">
                    Page {currentPage} of {Math.ceil(totalTrades / tradesPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalTrades / tradesPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(totalTrades / tradesPerPage)}
                    className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Trade Detail Modal */}
      {showDetailModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-dark-800">
              <div className="flex items-center gap-2">
                <BookMarked size={20} className="text-blue-400" />
                <h3 className="text-lg font-semibold text-white">A Book Trade Detail</h3>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Trade Info */}
              <div className="bg-dark-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Trade ID</p>
                  <p className="text-white font-mono text-sm">{selectedTrade.tradeId}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Symbol</p>
                  <p className="text-white font-medium">{selectedTrade.symbol}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Side</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedTrade.side === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {selectedTrade.side}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Quantity</p>
                  <p className="text-white">{selectedTrade.quantity} lots</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Open Price</p>
                  <p className="text-white">${selectedTrade.openPrice?.toFixed(5)}</p>
                </div>
                {selectedTrade.closePrice && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">Close Price</p>
                    <p className="text-white">${selectedTrade.closePrice?.toFixed(5)}</p>
                  </div>
                )}
                {selectedTrade.stopLoss && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">Stop Loss</p>
                    <p className="text-red-400">${selectedTrade.stopLoss?.toFixed(5)}</p>
                  </div>
                )}
                {selectedTrade.takeProfit && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">Take Profit</p>
                    <p className="text-green-400">${selectedTrade.takeProfit?.toFixed(5)}</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">P&L</p>
                  <p className={`font-semibold ${calculateFloatingPnl(selectedTrade) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {calculateFloatingPnl(selectedTrade) >= 0 ? '+' : ''}${calculateFloatingPnl(selectedTrade).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedTrade.status)}`}>
                    {getStatusIcon(selectedTrade.status)}
                    {selectedTrade.status}
                  </span>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-dark-700 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">User Info</h4>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white">{selectedTrade.userId?.firstName}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white text-sm">{selectedTrade.userId?.email}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Book Type</p>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <BookMarked size={10} /> A Book
                  </span>
                </div>
              </div>

              {/* MT5 Push Info */}
              <div className="bg-dark-700 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <Server size={14} /> MT5 Trade Push
                </h4>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Push Status</p>
                  {selectedTrade.mt5PushStatus === 'PUSHED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      <CheckCircle size={10} /> Pushed to MT5
                    </span>
                  ) : selectedTrade.mt5PushStatus === 'FAILED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      <AlertTriangle size={10} /> Failed
                    </span>
                  ) : selectedTrade.mt5PushStatus === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      <Clock size={10} /> Pending
                    </span>
                  ) : selectedTrade.mt5PushStatus === 'CLOSED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      <XCircle size={10} /> MT5 Closed
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Not pushed</span>
                  )}
                </div>
                {selectedTrade.mt5PositionId && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">MT5 Position ID</p>
                    <p className="text-white text-sm font-mono">{selectedTrade.mt5PositionId}</p>
                  </div>
                )}
                {selectedTrade.mt5PushedAt && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">Pushed At</p>
                    <p className="text-gray-400 text-xs">{new Date(selectedTrade.mt5PushedAt).toLocaleString()}</p>
                  </div>
                )}
                {selectedTrade.mt5PushError && (
                  <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400">Error: {selectedTrade.mt5PushError}</p>
                  </div>
                )}
              </div>

              {/* Read Only Notice */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center gap-2">
                <Shield size={16} className="text-blue-400 flex-shrink-0" />
                <p className="text-blue-400 text-sm">This trade is read-only. A Book trades cannot be edited or closed by admin.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminABookTrades
