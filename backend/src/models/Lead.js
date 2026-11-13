import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema(
  {
    shopkeeperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shopkeeper',
      required: [true, 'Shopkeeper reference is required'],
      index: true,
    },
    interestedProducts: [
      {
        type: String,
        enum: [
          'Paytm Soundbox 4.0',
          'Paytm EDC Card Machine',
          'Paytm Merchant Loan',
          'Paytm Dynamic QR',
          'Paytm Soundbox Plus',
        ],
      },
    ],
    leadStatus: {
      type: String,
      enum: ['Hot', 'Warm', 'Cold'],
      default: 'Warm',
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: false,
      index: true,
    },
    aiSummary: {
      type: String,
      trim: true,
    },
    confidenceScore: {
      type: Number,
      min: [0, 'Confidence score cannot be less than 0'],
      max: [100, 'Confidence score cannot exceed 100'],
      default: 50,
    },
    stage: {
      type: String,
      enum: ['Identified', 'Agent Assigned', 'Demo Scheduled', 'Won', 'Lost'],
      default: 'Identified',
      index: true,
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    lastContactedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

export const Lead = mongoose.model('Lead', leadSchema)
export default Lead
