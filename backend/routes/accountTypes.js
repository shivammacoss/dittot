import express from 'express'
import AccountType from '../models/AccountType.js'
import Charges from '../models/Charges.js'

const router = express.Router()

// GET /api/account-types - Get all active account types (for users)
router.get('/', async (req, res) => {
  try {
    const accountTypes = await AccountType.find({ isActive: true }).sort({ createdAt: -1 })
    
    // Fetch actual spread and commission from Charges for each account type
    const accountTypesWithCharges = await Promise.all(accountTypes.map(async (at) => {
      const atObj = at.toObject()
      
      // Find charges for this account type (both ACCOUNT_TYPE level and SEGMENT level with accountTypeId)
      const charges = await Charges.find({ 
        isActive: true, 
        accountTypeId: at._id
      })
      
      console.log(`[AccountTypes] Found ${charges.length} charges for ${at.name}:`, charges.map(c => ({
        segment: c.segment,
        spreadValue: c.spreadValue,
        commissionValue: c.commissionValue
      })))
      
      // Get the highest spread value from any charge (regardless of segment)
      let maxSpread = 0
      let maxCommission = 0
      
      for (const charge of charges) {
        if (charge.spreadValue > maxSpread) {
          maxSpread = charge.spreadValue
        }
        if (charge.commissionValue > maxCommission) {
          maxCommission = charge.commissionValue
        }
      }
      
      // Override minSpread and commission with values from Charges if found
      if (maxSpread > 0) {
        atObj.minSpread = maxSpread
        console.log(`[AccountTypes] Setting minSpread for ${at.name} to ${maxSpread}`)
      }
      if (maxCommission > 0) {
        atObj.commission = maxCommission
        console.log(`[AccountTypes] Setting commission for ${at.name} to ${maxCommission}`)
      }
      
      return atObj
    }))
    
    res.json({ success: true, accountTypes: accountTypesWithCharges })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching account types', error: error.message })
  }
})

// GET /api/account-types/all - Get all account types (for admin)
router.get('/all', async (req, res) => {
  try {
    const accountTypes = await AccountType.find().sort({ createdAt: -1 })
    res.json({ accountTypes })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching account types', error: error.message })
  }
})

// POST /api/account-types - Create account type (admin)
router.post('/', async (req, res) => {
  try {
    const { name, description, minDeposit, leverage, exposureLimit, minSpread, commission, isDemo, demoBalance } = req.body
    const accountType = new AccountType({
      name,
      description,
      minDeposit,
      leverage,
      exposureLimit,
      minSpread: minSpread || 0,
      commission: commission || 0,
      isDemo: isDemo || false,
      demoBalance: isDemo ? (demoBalance || 10000) : 0
    })
    await accountType.save()
    res.status(201).json({ message: 'Account type created', accountType })
  } catch (error) {
    res.status(500).json({ message: 'Error creating account type', error: error.message })
  }
})

// PUT /api/account-types/:id - Update account type (admin)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, minDeposit, leverage, exposureLimit, minSpread, commission, isActive, isDemo, demoBalance } = req.body
    const accountType = await AccountType.findByIdAndUpdate(
      req.params.id,
      { name, description, minDeposit, leverage, exposureLimit, minSpread, commission, isActive, isDemo, demoBalance },
      { new: true }
    )
    if (!accountType) {
      return res.status(404).json({ message: 'Account type not found' })
    }
    res.json({ message: 'Account type updated', accountType })
  } catch (error) {
    res.status(500).json({ message: 'Error updating account type', error: error.message })
  }
})

// DELETE /api/account-types/:id - Delete account type (admin)
router.delete('/:id', async (req, res) => {
  try {
    const accountType = await AccountType.findByIdAndDelete(req.params.id)
    if (!accountType) {
      return res.status(404).json({ message: 'Account type not found' })
    }
    res.json({ message: 'Account type deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account type', error: error.message })
  }
})

export default router
