import express from 'express'
import Banner from '../models/Banner.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = express.Router()

// Configure multer for banner image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/banners'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error('Only image files are allowed'))
  }
})

// Get all active banners (for users/app)
router.get('/active', async (req, res) => {
  try {
    const now = new Date()
    const banners = await Banner.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } }
      ]
    }).sort({ order: 1, createdAt: -1 })
    
    res.json({ success: true, banners })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get all banners (admin)
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 })
    res.json({ success: true, banners })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get single banner
router.get('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }
    res.json({ success: true, banner })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Create banner (admin)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, link, order, isActive, startDate, endDate } = req.body
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Banner image is required' })
    }
    
    const imageUrl = `/${req.file.path.replace(/\\/g, '/')}`
    
    const banner = await Banner.create({
      title,
      imageUrl,
      link: link || '',
      order: order ? parseInt(order) : 0,
      isActive: isActive !== 'false',
      startDate: startDate || null,
      endDate: endDate || null
    })
    
    res.status(201).json({ success: true, banner })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Update banner (admin)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, link, order, isActive, startDate, endDate } = req.body
    const banner = await Banner.findById(req.params.id)
    
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }
    
    // Update fields
    if (title) banner.title = title
    if (link !== undefined) banner.link = link
    if (order !== undefined) banner.order = parseInt(order)
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true
    if (startDate !== undefined) banner.startDate = startDate || null
    if (endDate !== undefined) banner.endDate = endDate || null
    
    // Update image if new one uploaded
    if (req.file) {
      // Delete old image
      if (banner.imageUrl) {
        const oldPath = banner.imageUrl.startsWith('/') ? banner.imageUrl.slice(1) : banner.imageUrl
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath)
        }
      }
      banner.imageUrl = `/${req.file.path.replace(/\\/g, '/')}`
    }
    
    await banner.save()
    res.json({ success: true, banner })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete banner (admin)
router.delete('/:id', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }
    
    // Delete image file
    if (banner.imageUrl) {
      const imagePath = banner.imageUrl.startsWith('/') ? banner.imageUrl.slice(1) : banner.imageUrl
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }
    
    await Banner.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Banner deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Toggle banner status (admin)
router.patch('/:id/toggle', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
    
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' })
    }
    
    banner.isActive = !banner.isActive
    await banner.save()
    
    res.json({ success: true, banner })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// Reorder banners (admin)
router.post('/reorder', async (req, res) => {
  try {
    const { bannerIds } = req.body
    
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({ success: false, message: 'bannerIds must be an array' })
    }
    
    // Update order for each banner
    const updates = bannerIds.map((id, index) => 
      Banner.findByIdAndUpdate(id, { order: index })
    )
    
    await Promise.all(updates)
    
    res.json({ success: true, message: 'Banners reordered successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
