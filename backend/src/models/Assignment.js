import mongoose from 'mongoose'

const assignmentSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead reference is required'],
      // Note: No inline index: true to prevent duplicate index warning with partialFilterExpression below
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'Agent reference is required'],
      index: true,
    },
    assignedBy: {
      type: String,
      enum: ['AI Auto-Router', 'Admin', 'Manual'],
      default: 'AI Auto-Router',
    },
    priority: {
      type: String,
      enum: ['Urgent', 'High', 'Standard'],
      default: 'Standard',
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'In Progress', 'Completed', 'Reassigned'],
      default: 'Pending',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Partial unique index preventing concurrent active assignments for the same lead
assignmentSchema.index(
  { leadId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
)

/**
 * Reassign a lead to a new agent using a MongoDB transaction.
 * Guarantees that marking the old assignment inactive and creating the new active assignment
 * occur atomically. If any error occurs or transactions are unsupported, the operation is rolled back.
 */
assignmentSchema.statics.reassignLead = async function ({
  leadId,
  newAgentId,
  assignedBy = 'Admin',
  priority = 'Standard',
  notes,
}) {
  const session = await mongoose.startSession()

  try {
    let newAssignmentDoc = null

    await session.withTransaction(async () => {
      // 1. Mark existing active assignment as inactive and status 'Reassigned'
      await this.updateMany(
        { leadId, isActive: true },
        {
          $set: {
            isActive: false,
            status: 'Reassigned',
            completedAt: new Date(),
          },
        },
        { session }
      )

      // 2. Create the new active assignment within the same transaction
      const [created] = await this.create(
        [
          {
            leadId,
            agentId: newAgentId,
            assignedBy,
            priority,
            status: 'Pending',
            isActive: true,
            notes,
          },
        ],
        { session }
      )

      newAssignmentDoc = created
    })

    return newAssignmentDoc
  } catch (error) {
    // Graceful error check for transaction support (e.g. standalone MongoDB vs Atlas Replica Set)
    if (
      error.message &&
      (error.message.includes('Transactions are not supported') ||
        error.message.includes('replica set'))
    ) {
      throw new Error(
        'Transaction support is unavailable on this MongoDB deployment. A replica set (such as MongoDB Atlas) is required for atomic lead reassignment.'
      )
    }
    throw error
  } finally {
    // Always end the session to avoid connection leaks
    await session.endSession()
  }
}

export const Assignment = mongoose.model('Assignment', assignmentSchema)
export default Assignment
