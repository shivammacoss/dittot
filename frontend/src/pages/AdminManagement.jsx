import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Shield,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Key,
  Mail,
  Calendar,
  X,
  Wallet,
  Users,
  DollarSign,
  Link,
  Copy,
  Check,
  AlertCircle,
  Lock
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFundModal, setShowFundModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    sidebarPermissions: {
      overviewDashboard: true
    }
  })
  
  const [fundAmount, setFundAmount] = useState('')
  const [fundDescription, setFundDescription] = useState('')

  // Sidebar permissions matching the image layout
  const sidebarPermissions = [
    { key: 'overviewDashboard', label: 'Overview Dashboard' },
    { key: 'userManagement', label: 'User Management' },
    { key: 'tradeManagement', label: 'Trade Management' },
    { key: 'fundManagement', label: 'Fund Management' },
    { key: 'bankSettings', label: 'Bank Settings' },
    { key: 'ibManagement', label: 'IB Management' },
    { key: 'forexCharges', label: 'Forex Charges' },
    { key: 'earningsReport', label: 'Earnings Report' },
    { key: 'copyTrade', label: 'Copy Trade' },
    { key: 'propFirmChallenges', label: 'Prop Firm Challenges' },
    { key: 'accountTypes', label: 'Account Types' },
    { key: 'themeSettings', label: 'Theme Settings' },
    { key: 'emailTemplates', label: 'Email Templates' },
    { key: 'bonusManagement', label: 'Bonus Management' },
    { key: 'adminManagement', label: 'Admin Management' },
    { key: 'employeeManagement', label: 'Employee Management' },
    { key: 'kycVerification', label: 'KYC Verification' },
    { key: 'supportTickets', label: 'Support Tickets' },
  ]

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins`)
      const data = await res.json()
      if (data.success) {
        setAdmins(data.admins || [])
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
    setLoading(false)
  }

  const handleCreateAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      })
      const data = await res.json()
      if (data.success) {
        alert('Employee created successfully!')
        setShowAddModal(false)
        setNewAdmin({ email: '', password: '', firstName: '', lastName: '', phone: '', sidebarPermissions: { overviewDashboard: true } })
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to create employee')
      }
    } catch (error) {
      alert('Error creating employee')
    }
  }

  const handleUpdateAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${selectedAdmin._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: selectedAdmin.firstName,
          lastName: selectedAdmin.lastName,
          phone: selectedAdmin.phone,
          status: selectedAdmin.status
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Employee updated successfully!')
        setShowEditModal(false)
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to update employee')
      }
    } catch (error) {
      alert('Error updating employee')
    }
  }

  const handleUpdatePermissions = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${selectedAdmin._id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sidebarPermissions: selectedAdmin.sidebarPermissions })
      })
      const data = await res.json()
      if (data.success) {
        alert('Permissions updated successfully!')
        setShowPermissionsModal(false)
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to update permissions')
      }
    } catch (error) {
      alert('Error updating permissions')
    }
  }

  const handleFundAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/wallet/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: selectedAdmin._id,
          amount: parseFloat(fundAmount),
          description: fundDescription
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setShowFundModal(false)
        setFundAmount('')
        setFundDescription('')
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to fund admin')
      }
    } catch (error) {
      alert('Error funding admin')
    }
  }

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${admin._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        fetchAdmins()
      }
    } catch (error) {
      alert('Error updating status')
    }
  }

  const handleDeleteAdmin = async (admin) => {
    if (!confirm(`Are you sure you want to delete ${admin.firstName} ${admin.lastName}?`)) return
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${admin._id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        alert('Employee deleted successfully!')
        fetchAdmins()
      } else {
        alert(data.message || 'Failed to delete employee')
      }
    } catch (error) {
      alert('Error deleting employee')
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/admins/${selectedAdmin._id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      })
      const data = await res.json()
      if (data.success) {
        alert('Password reset successfully!')
        setShowPasswordModal(false)
        setNewPassword('')
      } else {
        alert(data.message || 'Failed to reset password')
      }
    } catch (error) {
      alert('Error resetting password')
    }
  }

  const selectAllPermissions = () => {
    const allSelected = {}
    sidebarPermissions.forEach(p => allSelected[p.key] = true)
    if (showAddModal) {
      setNewAdmin({ ...newAdmin, sidebarPermissions: allSelected })
    } else if (selectedAdmin) {
      setSelectedAdmin({ ...selectedAdmin, sidebarPermissions: allSelected })
    }
  }

  const deselectAllPermissions = () => {
    const noneSelected = { overviewDashboard: true } // Dashboard always enabled
    if (showAddModal) {
      setNewAdmin({ ...newAdmin, sidebarPermissions: noneSelected })
    } else if (selectedAdmin) {
      setSelectedAdmin({ ...selectedAdmin, sidebarPermissions: noneSelected })
    }
  }

  const filteredAdmins = admins.filter(admin => 
    admin.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPermissionCount = (sidebarPerms) => {
    if (!sidebarPerms) return 0
    return Object.values(sidebarPerms).filter(v => v === true).length
  }

  return (
    <AdminLayout title="Employee Management" subtitle="Manage employees and their sidebar permissions">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Employees</p>
              <p className="text-white text-xl font-bold">{admins.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Employees</p>
              <p className="text-white text-xl font-bold">{admins.filter(a => a.status === 'ACTIVE').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Suspended</p>
              <p className="text-white text-xl font-bold">{admins.filter(a => a.status === 'SUSPENDED').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Key size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Avg Permissions</p>
              <p className="text-white text-xl font-bold">{admins.length ? Math.round(admins.reduce((sum, a) => sum + getPermissionCount(a.sidebarPermissions), 0) / admins.length) : 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-dark-800 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Employees</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <Plus size={16} />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading employees...</div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-8 text-center">
            <Shield size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500">No employees found</p>
            <p className="text-gray-600 text-sm mt-1">Create your first employee to get started</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden p-4 space-y-3">
              {filteredAdmins.map((admin) => (
                <div key={admin._id} className="bg-dark-700 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-500 font-bold">{admin.firstName?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{admin.firstName} {admin.lastName}</p>
                        <p className="text-gray-500 text-sm">{admin.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      admin.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {admin.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Key size={14} />
                      <span>{getPermissionCount(admin.sidebarPermissions)} permissions</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar size={14} />
                      <span>Joined: {new Date(admin.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-600">
                    <button 
                      onClick={() => { setSelectedAdmin({...admin}); setShowPermissionsModal(true) }}
                      className="flex items-center justify-center gap-1 py-2 bg-purple-500/20 text-purple-500 rounded-lg text-xs"
                    >
                      <Key size={14} />
                    </button>
                    <button 
                      onClick={() => { setSelectedAdmin(admin); setShowPasswordModal(true) }}
                      className="flex items-center justify-center gap-1 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg text-xs"
                    >
                      <Lock size={14} />
                    </button>
                    <button 
                      onClick={() => { setSelectedAdmin({...admin}); setShowEditModal(true) }}
                      className="flex items-center justify-center gap-1 py-2 bg-blue-500/20 text-blue-500 rounded-lg text-xs"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAdmin(admin)}
                      className="flex items-center justify-center gap-1 py-2 bg-red-500/20 text-red-500 rounded-lg text-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Employee</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Permissions</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Joined</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Status</th>
                    <th className="text-left text-gray-500 text-sm font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin._id} className="border-b border-gray-800 hover:bg-dark-700/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-500 font-bold">{admin.firstName?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{admin.firstName} {admin.lastName}</p>
                            <p className="text-gray-500 text-sm">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-400">{getPermissionCount(admin.sidebarPermissions)} / {sidebarPermissions.length}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-400">{new Date(admin.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className={`px-3 py-1 rounded-full text-xs ${
                            admin.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {admin.status}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => { setSelectedAdmin({...admin}); setShowPermissionsModal(true) }}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-purple-500"
                            title="Permissions"
                          >
                            <Key size={16} />
                          </button>
                          <button 
                            onClick={() => { setSelectedAdmin(admin); setShowPasswordModal(true) }}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-yellow-500"
                            title="Reset Password"
                          >
                            <Lock size={16} />
                          </button>
                          <button 
                            onClick={() => { setSelectedAdmin({...admin}); setShowEditModal(true) }}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-blue-500"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteAdmin(admin)}
                            className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Create New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">First Name *</label>
                  <input
                    type="text"
                    value={newAdmin.firstName}
                    onChange={(e) => setNewAdmin({...newAdmin, firstName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Last Name *</label>
                  <input
                    type="text"
                    value={newAdmin.lastName}
                    onChange={(e) => setNewAdmin({...newAdmin, lastName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Email *</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="employee@example.com"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Password *</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Phone</label>
                <input
                  type="text"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="+1234567890"
                />
              </div>
              
              {/* Sidebar Permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-sm">Sidebar Permissions</label>
                  <div className="flex gap-2 text-sm">
                    <button 
                      type="button"
                      onClick={selectAllPermissions}
                      className="text-blue-500 hover:text-blue-400"
                    >
                      Select All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button 
                      type="button"
                      onClick={deselectAllPermissions}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-dark-700 rounded-lg p-4">
                  {sidebarPermissions.map(perm => (
                    <label key={perm.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAdmin.sidebarPermissions?.[perm.key] || false}
                        onChange={(e) => setNewAdmin({
                          ...newAdmin,
                          sidebarPermissions: {...newAdmin.sidebarPermissions, [perm.key]: e.target.checked}
                        })}
                        disabled={perm.key === 'overviewDashboard'}
                        className="rounded bg-dark-600 border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                      <span className={`${perm.key === 'overviewDashboard' ? 'text-gray-500' : 'text-gray-300'}`}>
                        {perm.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAdmin}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Create Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Edit Employee</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">First Name</label>
                  <input
                    type="text"
                    value={selectedAdmin.firstName}
                    onChange={(e) => setSelectedAdmin({...selectedAdmin, firstName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={selectedAdmin.lastName}
                    onChange={(e) => setSelectedAdmin({...selectedAdmin, lastName: e.target.value})}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Phone</label>
                <input
                  type="text"
                  value={selectedAdmin.phone || ''}
                  onChange={(e) => setSelectedAdmin({...selectedAdmin, phone: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Status</label>
                <select
                  value={selectedAdmin.status}
                  onChange={(e) => setSelectedAdmin({...selectedAdmin, status: e.target.value})}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAdmin}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fund Admin Modal */}
      {showFundModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Fund Admin Wallet</h3>
              <button onClick={() => setShowFundModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-dark-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Admin</p>
                <p className="text-white font-medium">{selectedAdmin.firstName} {selectedAdmin.lastName}</p>
                <p className="text-gray-500 text-sm">{selectedAdmin.email}</p>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Current Balance</p>
                <p className="text-green-500 text-2xl font-bold">${selectedAdmin.walletBalance?.toLocaleString() || 0}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Amount to Add ($)</label>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="1000"
                  min="0"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Description (optional)</label>
                <input
                  type="text"
                  value={fundDescription}
                  onChange={(e) => setFundDescription(e.target.value)}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Monthly allocation"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowFundModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleFundAdmin}
                disabled={!fundAmount || parseFloat(fundAmount) <= 0}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
              >
                Add Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Sidebar Permissions</h3>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 text-sm">
                  <button 
                    type="button"
                    onClick={selectAllPermissions}
                    className="text-blue-500 hover:text-blue-400"
                  >
                    Select All
                  </button>
                  <span className="text-gray-600">|</span>
                  <button 
                    type="button"
                    onClick={deselectAllPermissions}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 bg-dark-700 rounded-lg p-4">
                {sidebarPermissions.map(perm => (
                  <label key={perm.key} className="flex items-center gap-3 text-sm cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedAdmin.sidebarPermissions?.[perm.key] || false}
                      onChange={(e) => setSelectedAdmin({
                        ...selectedAdmin,
                        sidebarPermissions: {...selectedAdmin.sidebarPermissions, [perm.key]: e.target.checked}
                      })}
                      disabled={perm.key === 'overviewDashboard'}
                      className="w-4 h-4 rounded bg-dark-600 border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className={`${perm.key === 'overviewDashboard' ? 'text-gray-500' : 'text-gray-300'}`}>
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Reset Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setNewPassword('') }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-dark-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Admin</p>
                <p className="text-white font-medium">{selectedAdmin.firstName} {selectedAdmin.lastName}</p>
                <p className="text-gray-500 text-sm">{selectedAdmin.email}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <p className="text-yellow-500/80 text-sm mt-1">This will immediately change the admin's password. They will need to use the new password to login.</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => { setShowPasswordModal(false); setNewPassword('') }}
                className="flex-1 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPassword || newPassword.length < 6}
                className="flex-1 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminManagement
