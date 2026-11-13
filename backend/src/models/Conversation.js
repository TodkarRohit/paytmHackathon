import mongoose from 'mongoose'

const messageSubSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['AI', 'Shopkeeper', 'Agent', 'System'],
      required: [true, 'Message sender is required'],
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    intentDetected: {
      type: String,
      trim: true,
    },
    sentiment: {
      type: String,
      enum: ['Positive', 'Neutral', 'Negative'],
      default: 'Neutral',
    },
  },
  { _id: false }
)

const conversationSchema = new mongoose.Schema(
  {
    shopkeeperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shopkeeper',
      required: [true, 'Shopkeeper reference is required'],
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: false,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: false,
      index: true,
    },
    channel: {
      type: String,
      required: [true, 'Conversation channel is required'],
      enum: ['WhatsApp', 'Voice Call', 'Web Chat'],
      default: 'WhatsApp',
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Escalated to Agent'],
      default: 'Active',
      index: true,
    },
    messages: [messageSubSchema],
    aiSummary: {
      type: String,
      trim: true,
    },
    detectedInterest: {
      type: Boolean,
      default: false,
    },
    escalatedToHuman: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

export const Conversation = mongoose.model('Conversation', conversationSchema)
export default Conversation
