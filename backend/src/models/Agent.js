import mongoose from 'mongoose'

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sales agent name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Sales agent email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Sales agent phone number is required'],
      trim: true,
    },
    territory: {
      type: String,
      trim: true,
      index: true,
    },
    activeLeadsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Available', 'Busy', 'Offline'],
      default: 'Available',
      index: true,
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
      enum: ['Agent', 'Admin'],
      default: 'Agent',
    },
  },
  {
    timestamps: true,
  }
)

export const Agent = mongoose.model('Agent', agentSchema)
export default Agent
