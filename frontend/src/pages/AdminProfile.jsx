import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Link,
  Copy,
  Check,
  Save,
  Lock,
  Eye,
  EyeOff,
  Key
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminProfile = () => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    brandName: ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      const parsed = JSON.parse(adminUser)
      setAdmin(parsed)
      setFormData({
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        phone: parsed.phone || '',
        brandName: parsed.brandName || ''
      })
    }
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.firstName.trim()) {
      setError('First name is required')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/admin-mgmt/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (data.success) {
        const updatedAdmin = { 
          ...admin, 
          firstName: formData.firstName, 
          lastName: formData.lastName, 
          phone: formData.phone,
          brandName: formData.brandName
        }
        localStorage.setItem('adminUser', JSON.stringify(updatedAdmin))
        setAdmin(updatedAdmin)
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/${admin?.urlSlug}/signup`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${API_URL}/admin-mgmt/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      const data = await res.json()

      if (data.success) {
        setPasswordSuccess('Password changed successfully!')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setPasswordSuccess(''), 3000)
      } else {
        setPasswordError(data.message || 'Failed to change password')
      }
    } catch (err) {
      setPasswordError('Connection error. Please try again.')
    }
    setPasswordLoading(false)
  }

  const getInitials = () => {
    const first = admin?.firstName?.charAt(0) || ''
    const last = admin?.lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'AD'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <AdminLayout title="Admin Profile" subtitle="Manage your account settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-dark-800 rounded-xl border border-gray-800 p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold mb-4">
                {getInitials()}
              </div>
              <h2 className="text-xl font-semibold text-white">
                {admin?.firstName} {admin?.lastName}
              </h2>
              <p className="text-gray-400 text-sm">{admin?.email}</p>
              <span className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${
                admin?.role === 'SUPER_ADMIN' 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {admin?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Employee'}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* Info Items */}
            <div className="space-y-4">
              {admin?.brandName && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Building2 size={18} />
                  <span>{admin.brandName}</span>
                </div>
              )}
              {admin?.urlSlug && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Link size={18} />
                  <span>/{admin.urlSlug}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-400">
                <Calendar size={18} />
                <span>Joined {formatDate(admin?.createdAt)}</span>
              </div>
            </div>

            {/* User Referral Link - Only for Super Admin */}
            {admin?.role === 'SUPER_ADMIN' && admin?.urlSlug && (
              <>
                <div className="border-t border-gray-700 my-6"></div>
                <div className="bg-dark-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Link size={16} />
                    <span className="font-medium">User Referral Link</span>
                  </div>
                  <p className="text-gray-500 text-xs mb-3">
                    Share this link with users to register under your brand
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/${admin?.urlSlug}/signup`}
                      className="flex-1 bg-dark-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 truncate"
                    />
                    <button
                      onClick={copyReferralLink}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                        copied 
                          ? 'bg-green-500 text-white' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-dark-800 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <User size={20} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Profile Details</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">Update your personal information</p>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">First Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="First Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Last Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Last Name"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={admin?.email || ''}
                    disabled
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              {/* Brand Name - Only for Super Admin */}
              {admin?.role === 'SUPER_ADMIN' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Brand Name</label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Your Brand Name"
                    />
                  </div>
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              {success && (
                <p className="text-green-500 text-sm">{success}</p>
              )}

              {/* Save Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="bg-dark-800 rounded-xl border border-gray-800 p-6 mt-6">
            <div className="flex items-center gap-3 mb-2">
              <Key size={20} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Change Password</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">Update your account password</p>

            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-12 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-12 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full bg-dark-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-green-500 text-sm">{passwordSuccess}</p>
              )}

              {/* Change Password Button */}
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <Key size={18} />
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminProfile
