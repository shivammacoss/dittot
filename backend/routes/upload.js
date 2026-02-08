import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads')
const screenshotsDir = path.join(uploadsDir, 'screenshots')
const profilesDir = path.join(uploadsDir, 'profiles')
const kycDir = path.join(uploadsDir, 'kyc')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true })
}
if (!fs.existsSync(kycDir)) {
  fs.mkdirSync(kycDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, screenshotsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `screenshot-${uniqueSuffix}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

// POST /api/upload/screenshot - Upload payment screenshot
router.post('/screenshot', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const fileUrl = `/uploads/screenshots/${req.file.filename}`
    
    res.json({
      success: true,
      message: 'Screenshot uploaded successfully',
      url: fileUrl,
      filename: req.file.filename
    })
  } catch (error) {
    console.error('Error uploading screenshot:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Configure multer for profile image uploads
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `profile-${uniqueSuffix}${ext}`)
  }
})

const profileUpload = multer({
  storage: profileStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

// POST /api/upload/profile-image - Upload profile image
router.post('/profile-image', profileUpload.single('profileImage'), async (req, res) => {
  try {
    console.log('[Profile Image] Upload request received')
    console.log('[Profile Image] File:', req.file)
    console.log('[Profile Image] Body:', req.body)
    
    if (!req.file) {
      console.log('[Profile Image] No file in request')
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const { userId } = req.body
    if (!userId) {
      console.log('[Profile Image] No userId in request')
      return res.status(400).json({ success: false, message: 'User ID is required' })
    }

    const fileUrl = `/uploads/profiles/${req.file.filename}`
    console.log('[Profile Image] File URL:', fileUrl)
    
    // Update user's profile image in database
    const User = (await import('../models/User.js')).default
    
    // First check if user exists
    const existingUser = await User.findById(userId)
    console.log('[Profile Image] Existing user found:', existingUser ? 'Yes' : 'No')
    
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    
    // Update the user
    existingUser.profileImage = fileUrl
    await existingUser.save()
    
    console.log('[Profile Image] User updated, new profileImage:', existingUser.profileImage)
    
    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      profileImage: fileUrl
    })
  } catch (error) {
    console.error('[Profile Image] Error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Configure multer for KYC document uploads
const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, kycDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `kyc-${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

const kycUpload = multer({
  storage: kycStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for KYC docs
  }
})

// POST /api/upload/kyc - Upload KYC documents
router.post('/kyc', kycUpload.fields([
  { name: 'frontImage', maxCount: 1 },
  { name: 'backImage', maxCount: 1 },
  { name: 'selfieImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files
    const result = {}

    if (files.frontImage) {
      result.frontImage = `/uploads/kyc/${files.frontImage[0].filename}`
    }
    if (files.backImage) {
      result.backImage = `/uploads/kyc/${files.backImage[0].filename}`
    }
    if (files.selfieImage) {
      result.selfieImage = `/uploads/kyc/${files.selfieImage[0].filename}`
    }

    res.json({
      success: true,
      message: 'KYC documents uploaded successfully',
      ...result
    })
  } catch (error) {
    console.error('Error uploading KYC documents:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' })
    }
    return res.status(400).json({ success: false, message: error.message })
  }
  next(error)
})

export default router
