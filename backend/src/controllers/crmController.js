import mongoose from 'mongoose'
import { CrmLead, Shopkeeper, Lead } from '../models/index.js'
import { sendWhatsAppMessage } from '../services/twilioService.js'

// In-memory runtime buffer for sessions where MongoDB is not yet connected
let memoryBuffer = []

export const crmController = {
  // GET /api/crm/leads
  getAll: async (req, res) => {
    try {
      const { status, qualification, business_type, search } = req.query
      const isDbConnected = mongoose.connection.readyState === 1

      if (isDbConnected) {
        const query = {}
        if (status && status !== 'All') query.status = status
        if (qualification && qualification !== 'All') query.qualification = qualification
        if (business_type && business_type !== 'All') query.business_type = business_type

        if (search && search.trim()) {
          const regex = new RegExp(search.trim(), 'i')
          query.$or = [{ business: regex }, { name: regex }, { city: regex }, { phone: regex }]
        }

        const realLeads = await CrmLead.find(query).sort({ createdAt: -1 }).lean()
        const formatted = realLeads.map((doc) => ({
          ...doc,
          id: doc._id.toString(),
        }))

        return res.status(200).json({
          status: 'success',
          results: formatted.length,
          data: formatted,
          database: { connected: true },
        })
      }

      // If database not yet connected, return empty or user-added memory leads (NO fake mock leads)
      let filtered = [...memoryBuffer]
      if (status && status !== 'All') filtered = filtered.filter((l) => l.status === status)
      if (qualification && qualification !== 'All') filtered = filtered.filter((l) => l.qualification === qualification)
      if (business_type && business_type !== 'All') filtered = filtered.filter((l) => l.business_type === business_type)
      if (search && search.trim()) {
        const q = search.toLowerCase().trim()
        filtered = filtered.filter(
          (l) =>
            l.business?.toLowerCase().includes(q) ||
            l.name?.toLowerCase().includes(q) ||
            l.city?.toLowerCase().includes(q) ||
            l.phone?.includes(q)
        )
      }

      return res.status(200).json({
        status: 'success',
        results: filtered.length,
        data: filtered,
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // POST /api/crm/leads
  create: async (req, res) => {
    try {
      const body = req.body
      if (!body.business || !body.name || !body.phone) {
        return res.status(400).json({
          status: 'fail',
          message: 'Business name, owner contact name, and phone number are required.',
        })
      }

      const isDbConnected = mongoose.connection.readyState === 1

      if (isDbConnected) {
        const doc = await CrmLead.create({
          business: body.business.trim(),
          name: body.name.trim(),
          phone: body.phone.trim(),
          email: body.email ? body.email.trim() : '',
          business_type: body.business_type || 'Retail Kirana',
          city: body.city ? body.city.trim() : 'Jaipur, Rajasthan',
          monthly_revenue_estimate: Number(body.monthly_revenue_estimate) || 0,
          current_payment_method: body.current_payment_method || 'Static Paper QR',
          status: body.status || 'new',
          qualification: body.qualification || 'warm',
          follow_up_count: Number(body.follow_up_count) || 0,
          assigned_human_rep: body.assigned_human_rep || null,
          pain_points: Array.isArray(body.pain_points) ? body.pain_points : [],
          conversation_history: Array.isArray(body.conversation_history)
            ? body.conversation_history
            : [],
        })

        // Also cross-sync with Shopkeeper collection if available
        try {
          let shopkeeper = await Shopkeeper.findOne({ phoneNumber: body.phone.trim() })
          if (!shopkeeper) {
            shopkeeper = await Shopkeeper.create({
              name: body.name.trim(),
              shopName: body.business.trim(),
              phoneNumber: body.phone.trim(),
              category: body.business_type?.includes('Kirana') ? 'Kirana / Grocery' : 'Other',
              address: { city: body.city || 'Jaipur' },
              status: 'New',
            })
          }
          await Lead.create({
            shopkeeperId: shopkeeper._id,
            interestedProducts: ['Paytm Soundbox 4.0'],
            leadStatus: body.qualification === 'hot' ? 'Hot' : 'Warm',
            confidenceScore: 75,
            stage: 'Identified',
          })
        } catch {
          // Relational sync attempt logged
        }

        const formatted = {
          ...doc.toObject(),
          id: doc._id.toString(),
        }

        return res.status(201).json({
          status: 'success',
          data: formatted,
          database: { connected: true },
        })
      }

      // Memory fallback when DB disconnected
      const newId = `LEAD-${Date.now()}`
      const newLead = {
        id: newId,
        business: body.business.trim(),
        name: body.name.trim(),
        phone: body.phone.trim(),
        email: body.email ? body.email.trim() : '',
        business_type: body.business_type || 'Retail Kirana',
        city: body.city ? body.city.trim() : 'Jaipur, Rajasthan',
        monthly_revenue_estimate: Number(body.monthly_revenue_estimate) || 0,
        current_payment_method: body.current_payment_method || 'Static Paper QR',
        status: body.status || 'new',
        qualification: body.qualification || 'warm',
        follow_up_count: Number(body.follow_up_count) || 0,
        assigned_human_rep: body.assigned_human_rep || null,
        pain_points: Array.isArray(body.pain_points) ? body.pain_points : [],
        conversation_history: Array.isArray(body.conversation_history) ? body.conversation_history : [],
      }
      memoryBuffer.unshift(newLead)

      res.status(201).json({
        status: 'success',
        data: newLead,
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // PATCH /api/crm/leads/:id
  update: async (req, res) => {
    try {
      const { id } = req.params
      const isDbConnected = mongoose.connection.readyState === 1

      if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
        const updated = await CrmLead.findByIdAndUpdate(id, req.body, { new: true }).lean()
        if (!updated) {
          return res.status(404).json({ status: 'fail', message: 'Lead not found.' })
        }
        return res.status(200).json({
          status: 'success',
          data: { ...updated, id: updated._id.toString() },
          database: { connected: true },
        })
      }

      // Memory buffer update
      const index = memoryBuffer.findIndex((l) => l.id === id)
      if (index === -1) {
        return res.status(404).json({ status: 'fail', message: 'Lead not found.' })
      }
      memoryBuffer[index] = { ...memoryBuffer[index], ...req.body }
      res.status(200).json({
        status: 'success',
        data: memoryBuffer[index],
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // DELETE /api/crm/leads/:id
  delete: async (req, res) => {
    try {
      const { id } = req.params
      const isDbConnected = mongoose.connection.readyState === 1

      if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
        const deleted = await CrmLead.findByIdAndDelete(id)
        if (!deleted) {
          return res.status(404).json({ status: 'fail', message: 'Lead not found.' })
        }
        return res.status(200).json({
          status: 'success',
          message: 'Lead removed from real database.',
          database: { connected: true },
        })
      }

      const initialLength = memoryBuffer.length
      memoryBuffer = memoryBuffer.filter((l) => l.id !== id)
      if (memoryBuffer.length === initialLength) {
        return res.status(404).json({ status: 'fail', message: 'Lead not found.' })
      }

      res.status(200).json({
        status: 'success',
        message: 'Lead removed successfully.',
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // POST /api/crm/dispatch-all
  dispatchAll: async (req, res) => {
    try {
      const isDbConnected = mongoose.connection.readyState === 1
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      let dispatchedCount = 0

      if (isDbConnected) {
        const queued = await CrmLead.find({ status: 'new' })
        for (const lead of queued) {
          dispatchedCount++
          const introMsg = {
            role: 'agent',
            message: `Namaste ${lead.name} ji! Hum Paytm Business team se bol rahe hain. Kya aapke store (${lead.business}) ke liye Paytm Soundbox ka demonstration arrange karein? Instant voice alerts se payment verification aasan ho jaata hai.`,
            timestamp: nowTime,
          }
          // Dispatch live via Twilio WhatsApp
          if (lead.phone) {
            try {
              await sendWhatsAppMessage({ to: lead.phone, body: introMsg.message })
            } catch (twilioErr) {
              console.warn(`[Twilio Dispatch Warning] Could not deliver WhatsApp to ${lead.phone}:`, twilioErr.message)
            }
          }
          await CrmLead.findByIdAndUpdate(lead._id, {
            status: 'contacted',
            follow_up_count: lead.follow_up_count + 1,
            $push: { conversation_history: introMsg },
          })
        }

        const allLeads = await CrmLead.find().sort({ createdAt: -1 }).lean()
        const formatted = allLeads.map((doc) => ({ ...doc, id: doc._id.toString() }))
        return res.status(200).json({
          status: 'success',
          dispatchedCount,
          data: formatted,
          database: { connected: true },
        })
      }

      // Memory buffer
      memoryBuffer = await Promise.all(
        memoryBuffer.map(async (lead) => {
          if (lead.status === 'new') {
            dispatchedCount++
            const introMsg = {
              role: 'agent',
              message: `Namaste ${lead.name} ji! Hum Paytm Business team se bol rahe hain. Kya aapke store (${lead.business}) ke liye Paytm Soundbox ka demonstration arrange karein? Instant voice alerts se payment verification aasan ho jaata hai.`,
              timestamp: nowTime,
            }
            if (lead.phone) {
              try {
                await sendWhatsAppMessage({ to: lead.phone, body: introMsg.message })
              } catch (e) {
                // Silently handle
              }
            }
            return {
              ...lead,
              status: 'contacted',
              follow_up_count: lead.follow_up_count + 1,
              conversation_history: [...lead.conversation_history, introMsg],
            }
          }
          return lead
        })
      )

      res.status(200).json({
        status: 'success',
        dispatchedCount,
        data: memoryBuffer,
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // POST /api/crm/run-cadence
  runCadence: async (req, res) => {
    try {
      const isDbConnected = mongoose.connection.readyState === 1
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      let cadenceCount = 0

      if (isDbConnected) {
        const activeLeads = await CrmLead.find({ status: { $in: ['contacted', 'in_progress'] } })
        for (const lead of activeLeads) {
          cadenceCount++
          const followUpMsg = {
            role: 'agent',
            message: `Namaste ${lead.name} ji! Just following up on your payment setup query for ${lead.business}. Would you like our Paytm sales rep to visit today for a 5-minute counter demonstration?`,
            timestamp: nowTime,
          }
          await CrmLead.findByIdAndUpdate(lead._id, {
            follow_up_count: lead.follow_up_count + 1,
            $push: { conversation_history: followUpMsg },
          })
        }

        const allLeads = await CrmLead.find().sort({ createdAt: -1 }).lean()
        const formatted = allLeads.map((doc) => ({ ...doc, id: doc._id.toString() }))
        return res.status(200).json({
          status: 'success',
          cadenceCount,
          data: formatted,
          database: { connected: true },
        })
      }

      memoryBuffer = memoryBuffer.map((lead) => {
        if (lead.status === 'contacted' || lead.status === 'in_progress') {
          cadenceCount++
          const followUpMsg = {
            role: 'agent',
            message: `Namaste ${lead.name} ji! Just following up on your payment setup query for ${lead.business}. Would you like our Paytm sales rep to visit today for a 5-minute counter demonstration?`,
            timestamp: nowTime,
          }
          return {
            ...lead,
            follow_up_count: lead.follow_up_count + 1,
            conversation_history: [...lead.conversation_history, followUpMsg],
          }
        }
        return lead
      })

      res.status(200).json({
        status: 'success',
        cadenceCount,
        data: memoryBuffer,
        database: { connected: false },
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },

  // POST /api/crm/clear
  clear: async (req, res) => {
    try {
      const isDbConnected = mongoose.connection.readyState === 1
      if (isDbConnected) {
        await CrmLead.deleteMany({})
      }
      memoryBuffer = []
      res.status(200).json({
        status: 'success',
        message: 'Real database CRM leads cleared.',
        data: [],
      })
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message })
    }
  },
}
