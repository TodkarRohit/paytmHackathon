import mongoose from 'mongoose'

const shopkeeperSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Shopkeeper name is required'],
      trim: true,
    },
    shopName: {
      type: String,
      required: [true, 'Shop/Business name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'Kirana / Grocery',
        'Electronics',
        'Restaurant / Cafe',
        'Clothing / Retail',
        'Pharmacy',
        'Automobile / Hardware',
        'Other',
      ],
      default: 'Kirana / Grocery',
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true, index: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    currentDevices: {
      type: [
        {
          type: String,
          enum: ['Paytm QR', 'Paytm Soundbox', 'Paytm Card Machine (EDC)', 'Paytm POS'],
        },
      ],
      default: [],
    },
    preferredLanguage: {
      type: String,
      enum: [
        'Hindi',
        'English',
        'Hinglish',
        'Gujarati',
        'Marathi',
        'Bengali',
        'Tamil',
        'Telugu',
        'Kannada',
      ],
      default: 'Hindi',
    },
    dailyTransactionsEstimate: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Interested', 'Follow Up', 'Not Interested', 'Converted'],
      default: 'New',
      index: true,
    },
    whatsappOptIn: {
      type: Boolean,
      default: false,
    },
    consentAt: {
      type: Date,
    },
    optOutAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    passwordSalt: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['Shopkeeper'],
      default: 'Shopkeeper',
    },
  },
  {
    timestamps: true,
  }
)

export const Shopkeeper = mongoose.model('Shopkeeper', shopkeeperSchema)
export default Shopkeeper
