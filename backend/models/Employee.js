import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const employeeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    required: true,
    default: 'SUPPORT'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  permissions: {
    canViewDashboard: { type: Boolean, default: true },
    canViewUsers: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canCreateUsers: { type: Boolean, default: false },
    canEditUsers: { type: Boolean, default: false },
    canDeleteUsers: { type: Boolean, default: false },
    canViewAccounts: { type: Boolean, default: false },
    canManageAccounts: { type: Boolean, default: false },
    canCreateAccounts: { type: Boolean, default: false },
    canModifyLeverage: { type: Boolean, default: false },
    canViewTrades: { type: Boolean, default: false },
    canManageTrades: { type: Boolean, default: false },
    canCloseTrades: { type: Boolean, default: false },
    canModifyTrades: { type: Boolean, default: false },
    canViewDeposits: { type: Boolean, default: false },
    canApproveDeposits: { type: Boolean, default: false },
    canRejectDeposits: { type: Boolean, default: false },
    canViewWithdrawals: { type: Boolean, default: false },
    canApproveWithdrawals: { type: Boolean, default: false },
    canRejectWithdrawals: { type: Boolean, default: false },
    canViewKYC: { type: Boolean, default: false },
    canApproveKYC: { type: Boolean, default: false },
    canRejectKYC: { type: Boolean, default: false },
    canViewIB: { type: Boolean, default: false },
    canManageIB: { type: Boolean, default: false },
    canApproveIB: { type: Boolean, default: false },
    canViewCopyTrading: { type: Boolean, default: false },
    canManageCopyTrading: { type: Boolean, default: false },
    canApproveMasters: { type: Boolean, default: false },
    canViewPropTrading: { type: Boolean, default: false },
    canManagePropTrading: { type: Boolean, default: false },
    canViewSupport: { type: Boolean, default: false },
    canManageSupport: { type: Boolean, default: false },
    canReplySupport: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canExportReports: { type: Boolean, default: false },
    canViewSettings: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false },
    canManagePaymentMethods: { type: Boolean, default: false },
    canManageCharges: { type: Boolean, default: false },
    canManageTheme: { type: Boolean, default: false },
    canManageEmailTemplates: { type: Boolean, default: false },
    canManageBanners: { type: Boolean, default: false },
    canManageBonus: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
    default: 'ACTIVE'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

employeeSchema.methods.getAllowedRoutes = function() {
  const routes = []
  const p = this.permissions
  
  if (p.canViewDashboard) routes.push('/employee/dashboard')
  if (p.canViewUsers || p.canManageUsers) routes.push('/employee/users')
  if (p.canViewAccounts || p.canManageAccounts) routes.push('/employee/accounts')
  if (p.canViewTrades || p.canManageTrades) routes.push('/employee/trades')
  if (p.canViewDeposits || p.canApproveDeposits) routes.push('/employee/deposits')
  if (p.canViewWithdrawals || p.canApproveWithdrawals) routes.push('/employee/withdrawals')
  if (p.canViewKYC || p.canApproveKYC) routes.push('/employee/kyc')
  if (p.canViewIB || p.canManageIB) routes.push('/employee/ib')
  if (p.canViewCopyTrading || p.canManageCopyTrading) routes.push('/employee/copy-trading')
  if (p.canViewPropTrading || p.canManagePropTrading) routes.push('/employee/prop-trading')
  if (p.canViewSupport || p.canManageSupport) routes.push('/employee/support')
  if (p.canViewReports) routes.push('/employee/reports')
  
  return routes
}

export default mongoose.model('Employee', employeeSchema)
