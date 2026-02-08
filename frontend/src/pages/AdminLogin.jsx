import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Mail, Lock, Eye, EyeOff, Shield, UserCog } from 'lucide-react'
import { API_URL } from '../config/api'

const AdminLogin = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch(`${API_URL}/admin-mgmt/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      if (data.success) {
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminUser', JSON.stringify(data.admin))
        navigate('/admin/dashboard')
      } else {
        setError(data.message || 'Invalid credentials')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-red-500/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-purple-500/20 via-red-500/20 to-transparent rounded-full blur-3xl" />
      
      <div className="relative bg-dark-700 rounded-2xl p-6 sm:p-8 w-full max-w-md border border-gray-800 mx-4 sm:mx-0">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 w-8 h-8 bg-dark-600 rounded-full flex items-center justify-center hover:bg-dark-500 transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-500">
            Super Admin Portal
          </div>
        </div>

        {/* Login Type Toggle - Navigate to different pages */}
        <div className="flex gap-2 mb-6 p-1 bg-dark-600 rounded-lg">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors bg-red-500 text-white"
          >
            <Shield size={16} />
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin-employee')}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-white"
          >
            <UserCog size={16} />
            Employee
          </button>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">Super Admin Login</h1>
        <p className="text-gray-500 text-sm mb-6">Full access to all features</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors focus:border-red-500/50"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-dark-600 border border-gray-700 rounded-lg pl-11 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors focus:border-red-500/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-medium py-3 rounded-lg transition-colors mt-2 disabled:opacity-50 bg-red-500 hover:bg-red-600"
          >
            {loading ? 'Signing in...' : 'Sign in as Super Admin'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Not an admin?{' '}
          <button onClick={() => navigate('/user/login')} className="text-white hover:underline">
            User Login
          </button>
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
