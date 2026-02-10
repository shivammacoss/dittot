import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { API_URL } from '../config/api'
import { 
  Search, 
  BookOpen, 
  Users, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle, 
  Eye,
  Link,
  Unlink,
  ChevronDown,
  Filter,
  BookMarked,
  ArrowRightLeft,
  Server,
  Shield,
  Settings,
  Trash2,
  Plug,
  ChevronUp
} from 'lucide-react'

const AdminBookManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBook, setFilterBook] = useState('all')
  const [stats, setStats] = useState({ totalABook: 0, totalBBook: 0, total: 0 })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showUserDetailModal, setShowUserDetailModal] = useState(false)
  const [userDetail, setUserDetail] = useState(null)
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [bulkBookType, setBulkBookType] = useState('A')
  const [mt5Status, setMt5Status] = useState(null)
  const [mt5Loading, setMt5Loading] = useState(true)
  const [showMt5Settings, setShowMt5Settings] = useState(false)
  const [mt5Settings, setMt5Settings] = useState(null)
  const [mt5Form, setMt5Form] = useState({ metaApiToken: '', accountId: '', region: 'new-york', label: '' })
  const [mt5Testing, setMt5Testing] = useState(false)
  const [mt5TestResult, setMt5TestResult] = useState(null)
  const [mt5Saving, setMt5Saving] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchMT5Status()
    fetchMT5Settings()
  }, [filterBook])

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let url = `${API_URL}/book-management/users?`
      if (filterBook !== 'all') url += `bookType=${filterBook}&`
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setStats(data.stats || { totalABook: 0, totalBBook: 0, totalUnassigned: 0, total: 0 })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: 'Failed to fetch users' })
    }
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const assignBook = async (userId, bookType) => {
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/book-management/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bookType })
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        fetchUsers()
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to assign book' })
    }
    setActionLoading(false)
  }

  const handleBulkAssign = async () => {
    if (selectedUsers.length === 0) {
      setMessage({ type: 'error', text: 'No users selected' })
      return
    }
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/book-management/bulk-assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers, bookType: bulkBookType })
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setSelectedUsers([])
        setShowBulkAssignModal(false)
        fetchUsers()
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to bulk assign' })
    }
    setActionLoading(false)
  }

  const fetchMT5Status = async () => {
    setMt5Loading(true)
    try {
      const response = await fetch(`${API_URL}/book-management/mt5-status`)
      if (response.ok) {
        const data = await response.json()
        setMt5Status(data)
      }
    } catch (error) {
      console.error('Error fetching MT5 status:', error)
    }
    setMt5Loading(false)
  }

  const fetchMT5Settings = async () => {
    try {
      const response = await fetch(`${API_URL}/book-management/mt5-settings`)
      if (response.ok) {
        const data = await response.json()
        setMt5Settings(data.settings)
        if (data.settings?.accountId) {
          setMt5Form({
            metaApiToken: '',
            accountId: data.settings.accountId,
            region: data.settings.region || 'new-york',
            label: data.settings.label || ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching MT5 settings:', error)
    }
  }

  const testMT5Connection = async () => {
    if (!mt5Form.metaApiToken || !mt5Form.accountId) {
      setMessage({ type: 'error', text: 'MetaApi Token and Account ID are required' })
      return
    }
    setMt5Testing(true)
    setMt5TestResult(null)
    try {
      const response = await fetch(`${API_URL}/book-management/mt5-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mt5Form)
      })
      const data = await response.json()
      setMt5TestResult(data)
    } catch (error) {
      setMt5TestResult({ connected: false, error: 'Network error' })
    }
    setMt5Testing(false)
  }

  const saveMT5Settings = async () => {
    if (!mt5Form.metaApiToken || !mt5Form.accountId) {
      setMessage({ type: 'error', text: 'MetaApi Token and Account ID are required' })
      return
    }
    setMt5Saving(true)
    try {
      const response = await fetch(`${API_URL}/book-management/mt5-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mt5Form, isActive: true })
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setMt5Settings(data.settings)
        setMt5Form({ metaApiToken: '', accountId: data.settings.accountId, region: data.settings.region, label: data.settings.label })
        setShowMt5Settings(false)
        setMt5TestResult(null)
        fetchMT5Status()
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save MT5 settings' })
    }
    setMt5Saving(false)
  }

  const disconnectMT5 = async () => {
    if (!confirm('Are you sure you want to disconnect the MT5 account? A Book trades will no longer be pushed.')) return
    setActionLoading(true)
    try {
      const response = await fetch(`${API_URL}/book-management/mt5-settings`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        setMt5Settings(null)
        setMt5Form({ metaApiToken: '', accountId: '', region: 'new-york', label: '' })
        setMt5TestResult(null)
        fetchMT5Status()
        fetchMT5Settings()
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect MT5' })
    }
    setActionLoading(false)
  }

  const viewUserDetail = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/book-management/user/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUserDetail(data)
        setShowUserDetailModal(true)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch user details' })
    }
  }

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u._id))
    }
  }

  const getBookBadge = (bookType) => {
    if (bookType === 'A') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <BookMarked size={12} />
          A Book
        </span>
      )
    }
    if (bookType === 'B') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <BookOpen size={12} />
          B Book
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
        <BookOpen size={12} />
        B Book
      </span>
    )
  }

  return (
    <AdminLayout title="Book Management" subtitle="Manage A Book and B Book user assignments">
      {/* Message Toast */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
              <Users size={20} className="text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BookMarked size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{stats.totalABook}</p>
              <p className="text-xs text-gray-500">A Book Users</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <BookOpen size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{stats.totalBBook}</p>
              <p className="text-xs text-gray-500">B Book Users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <BookMarked size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-400">A Book</h4>
              <p className="text-xs text-gray-400 mt-1">Trades are <strong className="text-blue-300">read-only</strong> — admin cannot edit. All A Book trades are automatically pushed to MT5.</p>
            </div>
          </div>
          <div className="flex-1 flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <BookOpen size={20} className="text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-orange-400">B Book</h4>
              <p className="text-xs text-gray-400 mt-1">Trades are <strong className="text-orange-300">editable</strong> — admin can modify open price, SL, TP, close trades, etc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* MT5 Connection Status */}
      <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-gray-400" />
            <h4 className="text-sm font-semibold text-white">MT5 Connection (A Book Trade Push)</h4>
            {mt5Status?.mt5?.source === 'database' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">DB</span>
            )}
            {mt5Status?.mt5?.source === 'env' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">.env</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowMt5Settings(!showMt5Settings); setMt5TestResult(null) }} className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors" title="MT5 Settings">
              <Settings size={14} className="text-gray-400" />
            </button>
            <button onClick={() => { fetchMT5Status(); fetchMT5Settings() }} className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors" title="Refresh">
              <RefreshCw size={14} className={`text-gray-400 ${mt5Loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Connected Status */}
        {mt5Loading && !mt5Status ? (
          <div className="text-sm text-gray-500">Loading MT5 status...</div>
        ) : mt5Status?.mt5?.connected ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-400">Connected</span>
                </div>
                <button onClick={disconnectMT5} className="p-1 hover:bg-red-500/20 rounded transition-colors" title="Disconnect MT5">
                  <Trash2 size={12} className="text-gray-500 hover:text-red-400" />
                </button>
              </div>
              <div className="space-y-1">
                {mt5Settings?.label && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Label</span>
                    <span className="text-xs text-white font-medium">{mt5Settings.label}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Server</span>
                  <span className="text-xs text-white">{mt5Status.mt5.server}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Login</span>
                  <span className="text-xs text-white">{mt5Status.mt5.login}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Name</span>
                  <span className="text-xs text-white">{mt5Status.mt5.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Balance</span>
                  <span className="text-xs text-white">${mt5Status.mt5.balance?.toFixed(2)} {mt5Status.mt5.currency}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 p-3 bg-dark-700 rounded-lg">
              <p className="text-xs font-semibold text-gray-400 mb-2">Trade Push Stats</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-400">{mt5Status.pushStats?.pushed || 0}</p>
                  <p className="text-xs text-gray-500">Pushed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-400">{mt5Status.pushStats?.failed || 0}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-yellow-400">{mt5Status.pushStats?.pending || 0}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Unlink size={14} className="text-red-400" />
              <span className="text-sm text-red-400">MT5 Not Connected</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Click the <Settings size={12} className="inline" /> settings icon above to connect your MetaTrader 5 account for A Book trade pushing.</p>
            {mt5Status?.mt5?.error && (
              <p className="text-xs text-red-400 mt-1">Error: {mt5Status.mt5.error}</p>
            )}
          </div>
        )}

        {/* MT5 Settings Form (collapsible) */}
        {showMt5Settings && (
          <div className="mt-4 p-4 bg-dark-700 rounded-lg border border-gray-600 space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plug size={14} className="text-blue-400" />
                {mt5Status?.mt5?.connected ? 'Change MT5 Account' : 'Connect MT5 Account'}
              </h5>
              <button onClick={() => { setShowMt5Settings(false); setMt5TestResult(null) }} className="p-1 hover:bg-dark-600 rounded transition-colors">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">MetaApi Token</label>
                <input
                  type="password"
                  value={mt5Form.metaApiToken}
                  onChange={(e) => setMt5Form({ ...mt5Form, metaApiToken: e.target.value })}
                  placeholder={mt5Settings?.hasToken ? 'Enter new token to change (current: ' + mt5Settings.metaApiToken + ')' : 'Enter your MetaApi token'}
                  className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Account ID</label>
                <input
                  type="text"
                  value={mt5Form.accountId}
                  onChange={(e) => setMt5Form({ ...mt5Form, accountId: e.target.value })}
                  placeholder="MetaApi Account ID"
                  className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Region</label>
                <select
                  value={mt5Form.region}
                  onChange={(e) => setMt5Form({ ...mt5Form, region: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="new-york">New York</option>
                  <option value="london">London</option>
                  <option value="singapore">Singapore</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={mt5Form.label}
                  onChange={(e) => setMt5Form({ ...mt5Form, label: e.target.value })}
                  placeholder="e.g. My Demo Account"
                  className="w-full px-3 py-2 bg-dark-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Test Result */}
            {mt5TestResult && (
              <div className={`p-3 rounded-lg border ${mt5TestResult.connected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                {mt5TestResult.connected ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Check size={14} className="text-green-400" />
                      <span className="text-xs font-semibold text-green-400">Connection Successful</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Server</span>
                        <span className="text-xs text-white">{mt5TestResult.server}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Login</span>
                        <span className="text-xs text-white">{mt5TestResult.login}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Name</span>
                        <span className="text-xs text-white">{mt5TestResult.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Balance</span>
                        <span className="text-xs text-white">${mt5TestResult.balance?.toFixed(2)} {mt5TestResult.currency}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs text-red-400">Connection Failed: {mt5TestResult.error}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={testMT5Connection}
                disabled={mt5Testing || !mt5Form.metaApiToken || !mt5Form.accountId}
                className="flex-1 px-4 py-2 bg-dark-800 border border-gray-600 text-gray-300 rounded-lg text-sm font-medium hover:border-blue-500 hover:text-blue-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {mt5Testing ? <RefreshCw size={14} className="animate-spin" /> : <Plug size={14} />}
                Test Connection
              </button>
              <button
                onClick={saveMT5Settings}
                disabled={mt5Saving || !mt5Form.metaApiToken || !mt5Form.accountId}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {mt5Saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Save & Connect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              Search
            </button>
          </form>
          
          <div className="flex gap-2">
            <select
              value={filterBook}
              onChange={(e) => setFilterBook(e.target.value)}
              className="px-3 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="all">All Books</option>
              <option value="A">A Book</option>
              <option value="B">B Book</option>
            </select>
            
            <button
              onClick={fetchUsers}
              className="p-2.5 bg-dark-700 border border-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-dark-700 rounded-lg border border-gray-600">
            <span className="text-sm text-gray-400">
              <strong className="text-white">{selectedUsers.length}</strong> users selected
            </span>
            <button
              onClick={() => setShowBulkAssignModal(true)}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <ArrowRightLeft size={14} />
              Bulk Assign
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="px-3 py-1.5 bg-dark-600 text-gray-400 rounded-lg text-xs font-medium hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-dark-800 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-600 bg-dark-700 text-red-500 focus:ring-red-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade Edit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <RefreshCw size={24} className="animate-spin text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Loading users...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <Users size={32} className="text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-b border-gray-700/30 hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleSelectUser(user._id)}
                        className="w-4 h-4 rounded border-gray-600 bg-dark-700 text-red-500 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-gray-400">
                          {user.firstName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.firstName}</p>
                          <p className="text-xs text-gray-500">{user.phone || 'No phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {getBookBadge(user.bookType)}
                    </td>
                    <td className="px-4 py-3">
                      {user.bookType === 'A' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                          <Shield size={10} />
                          Read Only
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          <Check size={10} />
                          Editable
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => viewUserDetail(user._id)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        
                        {/* Assign to A Book */}
                        {user.bookType !== 'A' && (
                          <button
                            onClick={() => assignBook(user._id, 'A')}
                            disabled={actionLoading}
                            className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                            title="Assign to A Book"
                          >
                            A
                          </button>
                        )}
                        
                        {/* Assign to B Book */}
                        {user.bookType !== 'B' && (
                          <button
                            onClick={() => assignBook(user._id, 'B')}
                            disabled={actionLoading}
                            className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                            title="Assign to B Book"
                          >
                            B
                          </button>
                        )}
                        
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {showUserDetailModal && userDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-gray-700 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">User Book Details</h3>
                <button onClick={() => setShowUserDetailModal(false)} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-dark-600 flex items-center justify-center text-xl font-bold text-gray-400">
                  {userDetail.user?.firstName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{userDetail.user?.firstName}</p>
                  <p className="text-sm text-gray-400">{userDetail.user?.email}</p>
                  <div className="mt-1">{getBookBadge(userDetail.user?.bookType)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-xs text-gray-500">Open Trades</p>
                  <p className="text-lg font-bold text-white">{userDetail.tradeStats?.openTrades || 0}</p>
                </div>
                <div className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-xs text-gray-500">Total Trades</p>
                  <p className="text-lg font-bold text-white">{userDetail.tradeStats?.totalTrades || 0}</p>
                </div>
              </div>

              <div className="p-3 bg-dark-700 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Trading Accounts</p>
                {userDetail.accounts?.length > 0 ? (
                  <div className="space-y-2">
                    {userDetail.accounts.map(acc => (
                      <div key={acc._id} className="flex items-center justify-between p-2 bg-dark-600 rounded-lg">
                        <span className="text-sm text-white font-mono">{acc.accountId}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">${acc.balance?.toFixed(2)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            acc.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>{acc.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No trading accounts</p>
                )}
              </div>

              {userDetail.user?.bookType === 'A' && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-blue-400" />
                    <p className="text-xs text-blue-400">A Book user — trades are automatically pushed to the global MT5 account and are read-only for admin.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-700">
              <button
                onClick={() => setShowUserDetailModal(false)}
                className="w-full px-4 py-2.5 bg-dark-700 text-gray-400 rounded-lg text-sm font-medium hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-gray-700 rounded-2xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Bulk Assign Book</h3>
                <button onClick={() => setShowBulkAssignModal(false)} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">{selectedUsers.length} users selected</p>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-sm font-medium text-gray-400 mb-2">Assign to:</label>
              <div className="space-y-2">
                <button
                  onClick={() => setBulkBookType('A')}
                  className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                    bulkBookType === 'A' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-dark-700 hover:border-gray-500'
                  }`}
                >
                  <BookMarked size={18} className={bulkBookType === 'A' ? 'text-blue-400' : 'text-gray-500'} />
                  <div>
                    <p className={`text-sm font-medium ${bulkBookType === 'A' ? 'text-blue-400' : 'text-gray-300'}`}>A Book</p>
                    <p className="text-xs text-gray-500">Trades read-only, auto-pushed to MT5</p>
                  </div>
                </button>
                <button
                  onClick={() => setBulkBookType('B')}
                  className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                    bulkBookType === 'B' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-600 bg-dark-700 hover:border-gray-500'
                  }`}
                >
                  <BookOpen size={18} className={bulkBookType === 'B' ? 'text-orange-400' : 'text-gray-500'} />
                  <div>
                    <p className={`text-sm font-medium ${bulkBookType === 'B' ? 'text-orange-400' : 'text-gray-300'}`}>B Book</p>
                    <p className="text-xs text-gray-500">Trades editable by admin</p>
                  </div>
                </button>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="flex-1 px-4 py-2.5 bg-dark-700 text-gray-400 rounded-lg text-sm font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminBookManagement
