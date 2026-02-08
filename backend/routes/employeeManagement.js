import express from 'express'
import jwt from 'jsonwebtoken'
import Employee from '../models/Employee.js'
import Admin from '../models/Admin.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Middleware to verify admin token
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    if (!decoded.adminId) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    const admin = await Admin.findById(decoded.adminId)
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' })
    }

    if (admin.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Admin account is not active' })
    }

    req.admin = admin
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// Predefined role templates
const roleTemplates = {
  SUPPORT: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewSupport: true,
    canManageSupport: true,
    canReplySupport: true,
    canViewKYC: true
  },
  FINANCE: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewDeposits: true,
    canApproveDeposits: true,
    canRejectDeposits: true,
    canViewWithdrawals: true,
    canApproveWithdrawals: true,
    canRejectWithdrawals: true,
    canViewReports: true
  },
  KYC_OFFICER: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewKYC: true,
    canApproveKYC: true,
    canRejectKYC: true
  },
  TRADE_MANAGER: {
    canViewDashboard: true,
    canViewUsers: true,
    canViewAccounts: true,
    canViewTrades: true,
    canManageTrades: true,
    canCloseTrades: true
  },
  MANAGER: {
    canViewDashboard: true,
    canViewUsers: true,
    canManageUsers: true,
    canViewAccounts: true,
    canManageAccounts: true,
    canViewTrades: true,
    canManageTrades: true,
    canViewDeposits: true,
    canApproveDeposits: true,
    canRejectDeposits: true,
    canViewWithdrawals: true,
    canApproveWithdrawals: true,
    canRejectWithdrawals: true,
    canViewKYC: true,
    canApproveKYC: true,
    canRejectKYC: true,
    canViewIB: true,
    canViewCopyTrading: true,
    canViewPropTrading: true,
    canViewSupport: true,
    canManageSupport: true,
    canReplySupport: true,
    canViewReports: true,
    canExportReports: true
  },
  CUSTOM: {}
}

// GET /api/employee-mgmt/role-templates
router.get('/role-templates', verifyAdmin, async (req, res) => {
  try {
    res.json({ success: true, roleTemplates })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /api/employee-mgmt/employees
router.get('/employees', verifyAdmin, async (req, res) => {
  try {
    const employees = await Employee.find({ createdBy: req.admin._id })
      .select('-password')
      .sort({ createdAt: -1 })

    res.json({ success: true, employees })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /api/employee-mgmt/employees
router.post('/employees', verifyAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role, permissions } = req.body

    if (!email || !password || !firstName || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, first name, and role are required' 
      })
    }

    const existingEmployee = await Employee.findOne({ email: email.toLowerCase() })
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Email already exists' })
    }

    let employeePermissions = {}
    if (role === 'CUSTOM' && permissions) {
      employeePermissions = permissions
    } else if (roleTemplates[role]) {
      employeePermissions = roleTemplates[role]
    }

    const employee = await Employee.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName: lastName || '',
      phone: phone || '',
      role,
      permissions: employeePermissions,
      createdBy: req.admin._id
    })

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: {
        _id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        permissions: employee.permissions,
        status: employee.status
      }
    })
  } catch (error) {
    console.error('Create employee error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id
router.put('/employees/:id', verifyAdmin, async (req, res) => {
  try {
    const { firstName, lastName, phone, role, status } = req.body

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.admin._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    if (firstName) employee.firstName = firstName
    if (lastName !== undefined) employee.lastName = lastName
    if (phone !== undefined) employee.phone = phone
    if (role) employee.role = role
    if (status) employee.status = status

    await employee.save()

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: {
        _id: employee._id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        status: employee.status
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id/permissions
router.put('/employees/:id/permissions', verifyAdmin, async (req, res) => {
  try {
    const { permissions, role } = req.body

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.admin._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    if (role && role !== 'CUSTOM' && roleTemplates[role]) {
      employee.role = role
      employee.permissions = roleTemplates[role]
    } else if (permissions) {
      employee.role = 'CUSTOM'
      employee.permissions = permissions
    }

    await employee.save()

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      employee: {
        _id: employee._id,
        role: employee.role,
        permissions: employee.permissions
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id/password
router.put('/employees/:id/password', verifyAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      })
    }

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.admin._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    employee.password = newPassword
    employee.passwordChangedAt = new Date()
    await employee.save()

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /api/employee-mgmt/employees/:id
router.delete('/employees/:id', verifyAdmin, async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: req.admin._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    res.json({ success: true, message: 'Employee deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /api/employee-mgmt/employees/:id/status
router.put('/employees/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body

    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const employee = await Employee.findOne({ 
      _id: req.params.id, 
      createdBy: req.admin._id 
    })

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }

    employee.status = status
    await employee.save()

    res.json({ 
      success: true, 
      message: `Employee ${status.toLowerCase()} successfully`,
      employee: {
        _id: employee._id,
        status: employee.status
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
