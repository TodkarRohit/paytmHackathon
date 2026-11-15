import mongoose from 'mongoose'

const crmLeadSchema = new mongoose.Schema(
  {
    business: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Owner/Contact name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    business_type: {
      type: String,
      default: 'Retail Kirana',
      trim: true,
    },
    city: {
      type: String,
      default: 'Jaipur, Rajasthan',
      trim: true,
    },
    monthly_revenue_estimate: {
      type: Number,
      default: 0,
      min: 0,
    },
    current_payment_method: {
      type: String,
      default: 'Static Paper QR',
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in_progress', 'converted', 'escalated', 'closed_lost'],
      default: 'new',
      index: true,
    },
    qualification: {
      type: String,
      enum: ['hot', 'warm', 'cold', 'unqualified'],
      default: 'warm',
      index: true,
    },
    follow_up_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    assigned_human_rep: {
      type: String,
      default: null,
      trim: true,
    },
    pain_points: {
      type: [String],
      default: [],
    },
    conversation_history: [
      {
        role: {
          type: String,
          enum: ['agent', 'user'],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

export const CrmLead = mongoose.models.CrmLead || mongoose.model('CrmLead', crmLeadSchema)
export default CrmLead
