import mongoose from 'mongoose'

const aiTrainingConfigSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      default: 'MerchantConnect AI',
      trim: true,
    },
    industryVertical: {
      type: String,
      default: 'Retail & Fintech Payment Solutions',
      trim: true,
    },
    salesPersona: {
      type: String,
      default: 'Consultative & Respectful Assistant',
      enum: [
        'Consultative & Respectful Assistant',
        'Direct & High-Velocity Closer',
        'Empathetic Shopkeeper Partner',
        'Technical Product Specialist',
      ],
    },
    primaryLanguages: {
      type: [String],
      default: ['Hindi', 'Hinglish', 'English'],
    },
    companyTagline: {
      type: String,
      default: 'Empowering local Indian merchants with seamless payment intelligence & smart business devices.',
      trim: true,
    },
    products: [
      {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        pitchSnippet: { type: String, default: '' },
      },
    ],
    valuePropositions: {
      type: [String],
      default: [
        'Instant audio payment confirmation in local languages',
        'Protects against fake payment screenshots and digital payment fraud',
        'Zero manual SMS checking during busy counter rush hours',
        'All-in-one payment reconciliation via business app',
      ],
    },
    objectionPlaybook: [
      {
        objection: { type: String, required: true },
        rebuttal: { type: String, required: true },
      },
    ],
    complianceRules: {
      type: [String],
      default: [
        'Never invent unverified monthly rental fees or hardware costs without official rate card.',
        'Never make absolute fraud prevention claims (explain that audio alert helps verify receipt immediately).',
        'Always address shopkeepers respectfully with [Name] ji.',
        'If customer requests an on-site visit or customized commercial quote, assign to a field representative.',
      ],
    },
  },
  {
    timestamps: true,
  }
)

export const AiTrainingConfig =
  mongoose.models.AiTrainingConfig || mongoose.model('AiTrainingConfig', aiTrainingConfigSchema)
export default AiTrainingConfig
