import mongoose from 'mongoose'

const campaignSchema = new mongoose.Schema(
  {
    campaignName: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    productFocus: {
      type: String,
      required: [true, 'Product focus is required'],
      enum: [
        'Paytm Soundbox 4.0',
        'Paytm EDC Card Machine',
        'Paytm Merchant Loan',
        'General Upgrade',
      ],
    },
    channel: {
      type: String,
      required: [true, 'Campaign channel is required'],
      enum: ['WhatsApp', 'Voice Call', 'SMS', 'Omnichannel'],
    },
    targetAudience: {
      city: { type: String, trim: true },
      category: { type: String, trim: true },
      minDailyTransactions: { type: Number, default: 0, min: 0 },
    },
    totalContacts: {
      type: Number,
      default: 0,
      min: 0,
    },
    messagesSent: {
      type: Number,
      default: 0,
      min: 0,
    },
    responses: {
      type: Number,
      default: 0,
      min: 0,
    },
    interestedCustomers: {
      type: Number,
      default: 0,
      min: 0,
    },
    campaignStatus: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Active', 'Completed', 'Paused'],
      default: 'Draft',
      index: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

export const Campaign = mongoose.model('Campaign', campaignSchema)
export default Campaign
