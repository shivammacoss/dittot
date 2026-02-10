import mongoose from 'mongoose'

const mt5SettingsSchema = new mongoose.Schema({
  metaApiToken: {
    type: String,
    default: ''
  },
  accountId: {
    type: String,
    default: ''
  },
  region: {
    type: String,
    default: 'new-york'
  },
  label: {
    type: String,
    default: 'Default MT5 Account'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastConnectedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true })

// Singleton pattern — always get/update the single settings doc
mt5SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({})
  }
  return settings
}

export default mongoose.model('MT5Settings', mt5SettingsSchema)
