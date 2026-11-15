import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Send,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  MessageSquare,
  Trash2,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Flame,
  Snowflake,
  ShieldAlert,
  Zap,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Bot,
  User,
  ArrowUpRight,
  Check,
  RotateCcw,
} from 'lucide-react'
import { crmService } from '../services/crmService'
import TwilioWhatsAppModal from '../components/TwilioWhatsAppModal'

// Semantic Color Mappings for Badges
const STATUS_CONFIG = {
  new: { label: 'New', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  contacted: { label: 'Contacted', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  converted: { label: 'Converted', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  escalated: { label: 'Escalated', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  closed_lost: { label: 'Closed Lost', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const QUALIFICATION_CONFIG = {
  hot: { label: 'Hot Deal', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: Flame },
  warm: { label: 'Warm Inquiry', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Zap },
  cold: { label: 'Cold Nurture', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Snowflake },
  unqualified: { label: 'Unqualified', bg: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: AlertTriangle },
}

const VERTICAL_OPTIONS = [
  'All Verticals',
  'Retail Kirana',
  'Restaurant / Cafe',
  'Pharmacy',
  'Electronics',
  'Clothing / Retail',
  'Automobile / Hardware',
  'Other',
]

const PAYMENT_METHODS = [
  'Static Paper QR',
  'Cash & Static QR',
  'Competitor Soundbox',
  'Paytm Soundbox 2.0',
  'Legacy Bank POS',
  'Bank POS & Static QR',
  'Personal UPI QR',
  'None / Cash Only',
]

const COMMON_PAIN_POINTS = [
  'Peak-hour queue delays',
  'Fake screenshot payment fraud',
  'Manual SMS confirmation delays',
  'Card machine transaction failure',
  'Frequent device rebooting',
  'High MDR transaction fee',
  'Delayed end-of-day reconciliation',
  'Low digital adoption by local contractors',
  'Outdated older soundbox volume',
  'Credit card EMI options needed',
]

export default function EnterpriseCRM({ onRecordMutated }) {
  // State
  const [leads, setLeads] = useState([])
  const [dataSource, setDataSource] = useState('api')
  const [databaseConnected, setDatabaseConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVertical, setSelectedVertical] = useState('All Verticals')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedQualification, setSelectedQualification] = useState('All')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedDossierLead, setSelectedDossierLead] = useState(null)
  const [deletingLead, setDeletingLead] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Interactive Chat State in Dossier
  const [newDossierMsg, setNewDossierMsg] = useState('')
  const [dossierSenderRole, setDossierSenderRole] = useState('agent') // 'agent' | 'user'

  // Twilio WhatsApp Integration Modal State
  const [isTwilioModalOpen, setIsTwilioModalOpen] = useState(false)

  // Toasts Notification Queue
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((iconType, title, message) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    const newToast = { id, iconType, title, message, timestamp: new Date() }
    setToasts((prev) => [newToast, ...prev].slice(0, 5))

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Load Leads from Real Database
  const loadPipeline = useCallback(async () => {
    setIsSyncing(true)
    try {
      const res = await crmService.loadLeads()
      setLeads(res.leads || [])
      setDataSource(res.source)
      setDatabaseConnected(!!res.databaseConnected)
    } catch {
      setLeads([])
      setDataSource('local')
      setDatabaseConnected(false)
    } finally {
      setIsSyncing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPipeline()
  }, [loadPipeline])

  // Real-time dense KPI calculations
  const kpis = useMemo(() => {
    const total = leads.length
    const hot = leads.filter((l) => l.qualification === 'hot').length
    const warm = leads.filter((l) => l.qualification === 'warm').length
    const cold = leads.filter((l) => l.qualification === 'cold').length
    const escalated = leads.filter((l) => l.status === 'escalated').length
    const contacted = leads.filter((l) => l.status === 'contacted').length
    const converted = leads.filter((l) => l.status === 'converted').length
    const closedLost = leads.filter((l) => l.status === 'closed_lost').length
    const pendingNew = leads.filter((l) => l.status === 'new').length
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'

    return [
      {
        id: 'total',
        label: 'Total Ingested Leads',
        value: total,
        accent: 'border-slate-200 bg-white text-slate-900',
        badge: 'Directory',
        badgeColor: 'bg-slate-100 text-slate-700',
      },
      {
        id: 'hot',
        label: 'High-Intent (Hot Deals)',
        value: hot,
        accent: 'border-rose-200 bg-rose-50/50 text-rose-900',
        badge: 'Priority Closing',
        badgeColor: 'bg-rose-100 text-rose-700',
      },
      {
        id: 'warm',
        label: 'Active Discovery (Warm)',
        value: warm,
        accent: 'border-amber-200 bg-amber-50/50 text-amber-900',
        badge: 'Objection Phase',
        badgeColor: 'bg-amber-100 text-amber-700',
      },
      {
        id: 'cold',
        label: 'Low Intent (Cold)',
        value: cold,
        accent: 'border-slate-200 bg-slate-50 text-slate-800',
        badge: 'Nurture Cadence',
        badgeColor: 'bg-slate-200 text-slate-700',
      },
      {
        id: 'escalated',
        label: 'Field Rep Escalations',
        value: escalated,
        accent: 'border-indigo-200 bg-indigo-50/50 text-indigo-900',
        badge: 'Human Closers',
        badgeColor: 'bg-indigo-100 text-indigo-700',
      },
      {
        id: 'contacted',
        label: 'Outreach Contacted',
        value: contacted,
        accent: 'border-blue-200 bg-blue-50/50 text-blue-900',
        badge: 'Active Comms',
        badgeColor: 'bg-blue-100 text-blue-700',
      },
      {
        id: 'converted',
        label: 'Closed Won / Converted',
        value: converted,
        accent: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
        badge: 'Live Merchants',
        badgeColor: 'bg-emerald-100 text-emerald-700',
      },
      {
        id: 'closed_lost',
        label: 'Closed Lost',
        value: closedLost,
        accent: 'border-slate-200 bg-slate-50 text-slate-700',
        badge: 'Disqualified',
        badgeColor: 'bg-slate-200 text-slate-600',
      },
      {
        id: 'pending',
        label: 'Pending Outreach',
        value: pendingNew,
        accent: 'border-sky-200 bg-sky-50/50 text-sky-900',
        badge: 'Queued',
        badgeColor: 'bg-sky-100 text-sky-700',
      },
      {
        id: 'conversion',
        label: 'Pipeline Conversion Rate',
        value: `${conversionRate}%`,
        accent: 'border-teal-200 bg-teal-50/50 text-teal-900',
        badge: 'vs 15.0% Target',
        badgeColor: 'bg-teal-100 text-teal-800',
      },
    ]
  }, [leads])

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesSearch =
          lead.business?.toLowerCase().includes(q) ||
          lead.name?.toLowerCase().includes(q) ||
          lead.city?.toLowerCase().includes(q) ||
          lead.phone?.includes(q)
        if (!matchesSearch) return false
      }

      // Vertical
      if (selectedVertical !== 'All Verticals' && lead.business_type !== selectedVertical) {
        return false
      }

      // Status
      if (selectedStatus !== 'All' && lead.status !== selectedStatus) {
        return false
      }

      // Qualification
      if (selectedQualification !== 'All' && lead.qualification !== selectedQualification) {
        return false
      }

      return true
    })
  }, [leads, searchQuery, selectedVertical, selectedStatus, selectedQualification])

  // Paginated leads
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize))
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLeads.slice(start, start + pageSize)
  }, [filteredLeads, currentPage, pageSize])

  // Global Action: Dispatch All Outreach
  const handleDispatchAll = async () => {
    const pendingLeads = leads.filter((l) => l.status === 'new')
    if (pendingLeads.length === 0) {
      showToast('info', 'Queue Up-To-Date', 'No pending new leads currently waiting in dispatch queue.')
      return
    }

    setIsSyncing(true)
    showToast('send', 'Outreach Initiated', `Beginning automated dispatch for ${pendingLeads.length} queued merchants...`)

    // Staggered notifications to simulate real-world queuing
    pendingLeads.forEach((lead, idx) => {
      setTimeout(() => {
        showToast(
          'send',
          'Outreach Dispatched',
          `WhatsApp intro sent to ${lead.business} (${lead.name}) via +91 98-Enterprise Gateway.`
        )
      }, (idx + 1) * 350)
    })

    try {
      const res = await crmService.dispatchAll()
      setLeads(res.leads)
      if (onRecordMutated) onRecordMutated()

      setTimeout(() => {
        showToast(
          'check',
          'Dispatch Complete',
          `Successfully reached ${res.dispatchedCount} merchants. State updated to "Contacted".`
        )
      }, (pendingLeads.length + 1) * 350)
    } catch {
      showToast('alert', 'Dispatch Error', 'Failed to complete outreach batch dispatch.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Global Action: Run Follow-Up Cadence
  const handleRunCadence = async () => {
    const activeLeads = leads.filter((l) => l.status === 'contacted' || l.status === 'in_progress')
    if (activeLeads.length === 0) {
      showToast('info', 'Cadence Idle', 'No active merchants in "Contacted" or "In Progress" stage to follow up.')
      return
    }

    setIsSyncing(true)
    try {
      const res = await crmService.runCadence()
      setLeads(res.leads)
      if (onRecordMutated) onRecordMutated()
      showToast(
        'clock',
        'Cadence Executed',
        `Follow-up cadence triggered for ${res.cadenceCount} active merchants. Conversation turns updated.`
      )
    } catch {
      showToast('alert', 'Cadence Error', 'Could not run follow-up cadence.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Single Lead Dispatch
  const handleSingleDispatch = async (lead) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const introMsg = {
      role: 'agent',
      message: `Namaste ${lead.name} ji! Hum MerchantConnect AI team se bol rahe hain. Kya aapke store (${lead.business}) ke liye smart payment soundbox ka demonstration arrange karein? Instant voice alerts se payment verification aasan ho jaata hai.`,
      timestamp: nowTime,
    }

    const updates = {
      status: 'contacted',
      follow_up_count: (lead.follow_up_count || 0) + 1,
      conversation_history: [...(lead.conversation_history || []), introMsg],
    }

    const res = await crmService.updateLead(lead.id, updates)
    if (res.lead) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? res.lead : l)))
      if (selectedDossierLead?.id === lead.id) setSelectedDossierLead(res.lead)
      showToast('send', 'Outreach Dispatched', `Intro message dispatched to ${lead.business} (${lead.phone}).`)
      if (onRecordMutated) onRecordMutated()
    }
  }

  // Delete Lead
  const confirmDeleteLead = async () => {
    if (!deletingLead) return
    const id = deletingLead.id
    const business = deletingLead.business
    await crmService.deleteLead(id)
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setDeletingLead(null)
    showToast('trash', 'Lead Removed', `${business} removed from outbound pipeline.`)
    if (onRecordMutated) onRecordMutated()
  }

  // Clear All
  const confirmClearAll = async () => {
    await crmService.clearAll()
    setLeads([])
    setShowClearConfirm(false)
    showToast('trash', 'Pipeline Cleared', 'All merchant records have been cleared from the pipeline.')
    if (onRecordMutated) onRecordMutated()
  }

  // Add Lead Form State
  const [addForm, setAddForm] = useState({
    business: '',
    name: '',
    phone: '',
    email: '',
    business_type: 'Retail Kirana',
    city: 'Jaipur, Rajasthan',
    monthly_revenue_estimate: 250000,
    current_payment_method: 'Static Paper QR',
    status: 'new',
    qualification: 'warm',
    assigned_human_rep: '',
    pain_points: ['Peak-hour queue delays', 'Fake screenshot payment fraud'],
  })

  const handleCreateLead = async (e) => {
    e.preventDefault()
    if (!addForm.business || !addForm.name || !addForm.phone) {
      showToast('alert', 'Validation Incomplete', 'Please fill in Business Name, Contact Person, and Phone.')
      return
    }

    const payload = {
      ...addForm,
      assigned_human_rep: addForm.assigned_human_rep ? addForm.assigned_human_rep.trim() : null,
      conversation_history: [],
      follow_up_count: 0,
    }

    const res = await crmService.addLead(payload)
    if (res.lead) {
      setLeads((prev) => [res.lead, ...prev])
      setIsAddModalOpen(false)
      showToast('check', 'Lead Added', `${res.lead.business} has been enrolled in the outbound directory.`)
      // Reset form
      setAddForm({
        business: '',
        name: '',
        phone: '',
        email: '',
        business_type: 'Retail Kirana',
        city: 'Jaipur, Rajasthan',
        monthly_revenue_estimate: 250000,
        current_payment_method: 'Static Paper QR',
        status: 'new',
        qualification: 'warm',
        assigned_human_rep: '',
        pain_points: ['Peak-hour queue delays'],
      })
      if (onRecordMutated) onRecordMutated()
    }
  }

  // Interactive Message in Dossier Modal
  const handleSendDossierMessage = async () => {
    if (!selectedDossierLead || !newDossierMsg.trim()) return

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newMsgObj = {
      role: dossierSenderRole,
      message: newDossierMsg.trim(),
      timestamp: nowTime,
    }

    const nextTurns = [...(selectedDossierLead.conversation_history || []), newMsgObj]
    let nextStatus = selectedDossierLead.status
    if (nextStatus === 'new') nextStatus = 'contacted'

    const updates = {
      conversation_history: nextTurns,
      status: nextStatus,
    }

    const res = await crmService.updateLead(selectedDossierLead.id, updates)
    if (res.lead) {
      setSelectedDossierLead(res.lead)
      setLeads((prev) => prev.map((l) => (l.id === res.lead.id ? res.lead : l)))
      setNewDossierMsg('')
      showToast(
        dossierSenderRole === 'agent' ? 'send' : 'check',
        dossierSenderRole === 'agent' ? 'Agent Message Sent' : 'Merchant Reply Simulated',
        `Logged in transcript for ${selectedDossierLead.business}.`
      )
    }
  }

  // Format currency helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let IconComponent = CheckCircle2
          let iconColor = 'text-emerald-500'
          let borderAccent = 'border-l-4 border-l-emerald-500'

          if (toast.iconType === 'send') {
            IconComponent = Send
            iconColor = 'text-blue-500'
            borderAccent = 'border-l-4 border-l-blue-500'
          } else if (toast.iconType === 'clock') {
            IconComponent = Clock
            iconColor = 'text-amber-500'
            borderAccent = 'border-l-4 border-l-amber-500'
          } else if (toast.iconType === 'alert') {
            IconComponent = AlertTriangle
            iconColor = 'text-rose-500'
            borderAccent = 'border-l-4 border-l-rose-500'
          } else if (toast.iconType === 'trash') {
            IconComponent = Trash2
            iconColor = 'text-slate-600'
            borderAccent = 'border-l-4 border-l-slate-600'
          } else if (toast.iconType === 'refresh') {
            IconComponent = RefreshCw
            iconColor = 'text-orange-500'
            borderAccent = 'border-l-4 border-l-orange-500'
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-white rounded-lg shadow-lg border border-slate-200 p-3.5 flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-right-4 ${borderAccent}`}
              role="status"
            >
              <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900">{toast.title}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* 1. Header & Quick Action Controls */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
          <span className="hover:text-slate-700">Ecosystem</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="hover:text-slate-700">Outbound Operations</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-200/60">
            {selectedVertical}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                databaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {databaseConnected ? 'MongoDB Atlas: Connected (Real DB)' : 'MongoDB: Setup Pending (Configure in backend/.env)'}
          </span>
        </div>

        {/* Title & Global Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-orange-600" />
              Merchant Directory & Live Outreach Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Autonomous B2B outbound campaign engine, lifecycle tracking, and field representative escalation handoffs.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDispatchAll}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
              title="Iterates through all queued 'new' leads and dispatches automated intro messages via WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch All Outreach
            </button>

            <button
              type="button"
              onClick={handleRunCadence}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
              title="Triggers follow-up messages for active leads in follow-up states"
            >
              <Clock className="w-3.5 h-3.5" />
              Run Follow-Up Cadence
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Add Merchant Lead
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dense 10-Card Operational KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className={`rounded-xl border p-3.5 transition-all shadow-xs flex flex-col justify-between ${kpi.accent}`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-medium leading-tight text-slate-600 truncate">
                {kpi.label}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${kpi.badgeColor} shrink-0`}>
                {kpi.badge}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Merchant Directory Table Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Active Merchants Count Badge */}
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white shadow-xs">
                {filteredLeads.length} {filteredLeads.length === 1 ? 'Profile' : 'Profiles'}
              </span>

              {/* Active Channel Indicators */}
              <button
                type="button"
                onClick={() => setIsTwilioModalOpen(true)}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[11px] font-medium cursor-pointer transition-colors shadow-2xs"
                title="Click to view Twilio WhatsApp Hub, simulate incoming merchant messages, or send outbound alerts"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                WhatsApp API: <span className="font-semibold">Twilio Connected</span>
              </button>

              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Corporate Email: <span className="font-semibold">Connected</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={loadPipeline}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-60"
                title="Refresh from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {leads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Clear all leads from pipeline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Search Bar & Multi-Dimensional Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search business, owner, city, phone..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Vertical Filter */}
            <div>
              <select
                value={selectedVertical}
                onChange={(e) => {
                  setSelectedVertical(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full py-2 px-3 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 cursor-pointer"
              >
                {VERTICAL_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    Vertical: {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Lifecycle Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full py-2 px-3 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 cursor-pointer"
              >
                <option value="All">All Lifecycle States</option>
                <option value="new">New (Queued)</option>
                <option value="contacted">Contacted</option>
                <option value="in_progress">In Progress</option>
                <option value="converted">Converted (Won)</option>
                <option value="escalated">Escalated (Field Rep)</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>

            {/* Qualification Filter */}
            <div>
              <select
                value={selectedQualification}
                onChange={(e) => {
                  setSelectedQualification(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full py-2 px-3 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 cursor-pointer"
              >
                <option value="All">All Qualification Tiers</option>
                <option value="hot">Hot Deals</option>
                <option value="warm">Warm Inquiries</option>
                <option value="cold">Cold Nurture</option>
                <option value="unqualified">Unqualified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enterprise Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Store & Contact</th>
                <th className="py-3 px-4">Category & City</th>
                <th className="py-3 px-4">Est. Monthly Volume</th>
                <th className="py-3 px-4">Current Method</th>
                <th className="py-3 px-4">Lifecycle State</th>
                <th className="py-3 px-4">Qualification</th>
                <th className="py-3 px-4 text-center">Turns</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading outbound pipeline...
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="max-w-sm mx-auto text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {leads.length === 0 ? 'No Merchant Leads in Database' : 'No matching merchants found'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {leads.length === 0
                          ? 'Your pipeline has no mock profiles. Click below to add a real merchant store or connect your MongoDB database in backend/.env.'
                          : 'Try adjusting your search query or filters to find merchant accounts.'}
                      </p>
                      {leads.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Add Merchant Lead
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const statusInfo = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                  const qualInfo = QUALIFICATION_CONFIG[lead.qualification] || QUALIFICATION_CONFIG.unqualified
                  const QualIcon = qualInfo.icon
                  const turnsCount = lead.conversation_history ? lead.conversation_history.length : 0

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 transition-colors duration-150 group"
                    >
                      {/* 1. Store & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {lead.business}
                          </span>
                          <span className="text-slate-600 font-medium text-[11px] mt-0.5">
                            {lead.name}
                          </span>
                          <span className="text-slate-400 text-[10px] flex items-center gap-1 font-mono">
                            <Phone className="w-2.5 h-2.5" />
                            {lead.phone}
                          </span>
                        </div>
                      </td>

                      {/* 2. Category & City */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-800">{lead.business_type}</span>
                          <span className="text-slate-400 text-[11px] flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {lead.city}
                          </span>
                        </div>
                      </td>

                      {/* 3. Est. Monthly Volume */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {formatCurrency(lead.monthly_revenue_estimate)}
                      </td>

                      {/* 4. Current Channel / Method */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {lead.current_payment_method}
                        </span>
                      </td>

                      {/* 5. Lifecycle State Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* 6. Qualification Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${qualInfo.bg}`}
                        >
                          <QualIcon className="w-3 h-3" />
                          {qualInfo.label}
                        </span>
                      </td>

                      {/* 7. Turns Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                            turnsCount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {turnsCount} turns
                        </span>
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dispatch (only if new) */}
                          {lead.status === 'new' && (
                            <button
                              type="button"
                              onClick={() => handleSingleDispatch(lead)}
                              className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Send automated initial WhatsApp intro message"
                            >
                              Dispatch
                            </button>
                          )}

                          {/* Transcript Dossier Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedDossierLead(lead)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            title="Open Conversation History & Lead Dossier"
                          >
                            <MessageSquare className="w-3 h-3 text-slate-500" />
                            Transcript
                          </button>

                          {/* Delete Lead */}
                          <button
                            type="button"
                            onClick={() => setDeletingLead(lead)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove lead from pipeline"
                            aria-label="Delete Lead"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Count Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{paginatedLeads.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{filteredLeads.length}</span> matching merchants (Total in Directory: {leads.length})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
            >
              Previous
            </button>
            <span className="text-slate-500 text-[11px] px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 4. Conversation Transcript & Lead Dossier Modal */}
      {selectedDossierLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    {selectedDossierLead.id}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {selectedDossierLead.business}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{selectedDossierLead.name}</span>
                  <span>•</span>
                  <span>{selectedDossierLead.city}</span>
                  <span>•</span>
                  <span className="font-mono">{selectedDossierLead.phone}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossierLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Strip */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-100/50 flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border mt-0.5 ${
                    STATUS_CONFIG[selectedDossierLead.status]?.bg || ''
                  }`}
                >
                  {STATUS_CONFIG[selectedDossierLead.status]?.label}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Qualification</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border mt-0.5 ${
                    QUALIFICATION_CONFIG[selectedDossierLead.qualification]?.bg || ''
                  }`}
                >
                  {QUALIFICATION_CONFIG[selectedDossierLead.qualification]?.label}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Est. Monthly GMV</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {formatCurrency(selectedDossierLead.monthly_revenue_estimate)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Solution</span>
                <span className="font-medium text-slate-700 block mt-0.5">
                  {selectedDossierLead.current_payment_method}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Follow-Up Count</span>
                <span className="font-mono font-bold text-slate-800 block mt-0.5">
                  {selectedDossierLead.follow_up_count || 0} times
                </span>
              </div>
            </div>

            {/* Routing Status Banner */}
            <div className="px-5 py-2.5 border-b border-slate-200 bg-amber-50/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-800">
                {selectedDossierLead.assigned_human_rep ? (
                  <>
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>
                      Escalated & Assigned to Human Closer:{' '}
                      <strong className="text-indigo-700">{selectedDossierLead.assigned_human_rep}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-emerald-600" />
                    <span>
                      Managed by <strong className="text-slate-900">Autonomous AI Sales Agent</strong> (MerchantConnect AI Grounded)
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={async () => {
                  const newRep = selectedDossierLead.assigned_human_rep
                    ? null
                    : 'Vikram Singh (Field Closer)'
                  const nextStatus = newRep ? 'escalated' : 'in_progress'
                  const res = await crmService.updateLead(selectedDossierLead.id, {
                    assigned_human_rep: newRep,
                    status: nextStatus,
                  })
                  if (res.lead) {
                    setSelectedDossierLead(res.lead)
                    setLeads((prev) => prev.map((l) => (l.id === res.lead.id ? res.lead : l)))
                    showToast(
                      'check',
                      'Routing Updated',
                      newRep
                        ? `Escalated to human closer: ${newRep}`
                        : 'Reverted back to Autonomous AI Agent.'
                    )
                  }
                }}
                className="text-[11px] font-semibold text-orange-700 hover:text-orange-800 underline cursor-pointer"
              >
                {selectedDossierLead.assigned_human_rep ? 'Reassign to AI Agent' : 'Escalate to Human Closer'}
              </button>
            </div>

            {/* Identified Pain Points */}
            {selectedDossierLead.pain_points && selectedDossierLead.pain_points.length > 0 && (
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Identified Pain Points:
                </span>
                {selectedDossierLead.pain_points.map((point, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-medium"
                  >
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                    {point}
                  </span>
                ))}
              </div>
            )}

            {/* Message Timeline / Chat Log */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-100/60 min-h-[260px] max-h-[380px]">
              {selectedDossierLead.conversation_history &&
              selectedDossierLead.conversation_history.length > 0 ? (
                selectedDossierLead.conversation_history.map((turn, idx) => {
                  const isAgent = turn.role === 'agent'
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-medium text-slate-500">
                        {isAgent ? (
                          <>
                            <Bot className="w-3 h-3 text-orange-600" />
                            <span>Paytm AI Sales Assistant</span>
                          </>
                        ) : (
                          <>
                            <span>{selectedDossierLead.name} (Merchant)</span>
                            <User className="w-3 h-3 text-emerald-600" />
                          </>
                        )}
                        <span>•</span>
                        <span>{turn.timestamp || 'Recent'}</span>
                      </div>

                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                          isAgent
                            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                            : 'bg-[#D9FDD3] text-slate-900 border border-[#b2e2aa] rounded-tr-xs'
                        }`}
                      >
                        {turn.message}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">No communications logged yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                      This lead is queued in initial state. Dispatch initial outreach or type a message below to log contact.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSingleDispatch(selectedDossierLead)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    Dispatch First Contact
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Dossier Message Input */}
            <div className="p-3.5 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-slate-500">Send turn as:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDossierSenderRole('agent')}
                    className={`px-2.5 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      dossierSenderRole === 'agent'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    AI Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setDossierSenderRole('user')}
                    className={`px-2.5 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      dossierSenderRole === 'user'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Merchant (Simulate Reply)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDossierMsg}
                  onChange={(e) => setNewDossierMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendDossierMessage()
                  }}
                  placeholder={
                    dossierSenderRole === 'agent'
                      ? 'Type an outbound agent message or objection rebuttal...'
                      : 'Simulate a merchant question or objection (e.g., "Price kitna hai?")...'
                  }
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleSendDossierMessage}
                  disabled={!newDossierMsg.trim()}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Merchant Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Merchant Lead Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enroll an enterprise merchant account into the autonomous outbound outreach engine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.business}
                    onChange={(e) => setAddForm({ ...addForm, business: e.target.value })}
                    placeholder="e.g. Ramesh Kirana Store"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Owner / Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="e.g. +91 98290-12345"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="e.g. store@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Vertical</label>
                  <select
                    value={addForm.business_type}
                    onChange={(e) => setAddForm({ ...addForm, business_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    {VERTICAL_OPTIONS.filter((v) => v !== 'All Verticals').map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    placeholder="e.g. Jaipur, Rajasthan"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Est. Monthly Revenue (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={addForm.monthly_revenue_estimate}
                    onChange={(e) =>
                      setAddForm({ ...addForm, monthly_revenue_estimate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Payment Method
                  </label>
                  <select
                    value={addForm.current_payment_method}
                    onChange={(e) =>
                      setAddForm({ ...addForm, current_payment_method: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="new">new (Queued for Dispatch)</option>
                    <option value="contacted">contacted</option>
                    <option value="in_progress">in_progress</option>
                    <option value="converted">converted</option>
                    <option value="escalated">escalated</option>
                    <option value="closed_lost">closed_lost</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Qualification Tier
                  </label>
                  <select
                    value={addForm.qualification}
                    onChange={(e) => setAddForm({ ...addForm, qualification: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="hot">hot (High Intent Closing)</option>
                    <option value="warm">warm (Active Discovery)</option>
                    <option value="cold">cold (Long-term Nurture)</option>
                    <option value="unqualified">unqualified</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Human Field Closer (Optional)
                </label>
                <input
                  type="text"
                  value={addForm.assigned_human_rep}
                  onChange={(e) => setAddForm({ ...addForm, assigned_human_rep: e.target.value })}
                  placeholder="e.g. Vikram Singh (Leave blank for Autonomous AI Agent)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Pain points selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Known Merchant Pain Points
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {COMMON_PAIN_POINTS.map((pt) => {
                    const isChecked = addForm.pain_points.includes(pt)
                    return (
                      <button
                        type="button"
                        key={pt}
                        onClick={() => {
                          if (isChecked) {
                            setAddForm({
                              ...addForm,
                              pain_points: addForm.pain_points.filter((p) => p !== pt),
                            })
                          } else {
                            setAddForm({
                              ...addForm,
                              pain_points: [...addForm.pain_points, pt],
                            })
                          }
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                          isChecked
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isChecked ? '✓ ' : '+ '}
                        {pt}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Create & Enroll Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deletingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Remove Merchant Lead?</h4>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong className="text-slate-900">{deletingLead.business}</strong> from the outbound pipeline?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLead(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLead}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Clear All Outbound Leads?</h4>
            </div>
            <p className="text-xs text-slate-600">
              This will remove all merchant profiles currently in the pipeline. You can reload mock sample leads at any time.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                Clear Entire Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Twilio WhatsApp Integration Hub Modal */}
      <TwilioWhatsAppModal
        isOpen={isTwilioModalOpen}
        onClose={() => {
          setIsTwilioModalOpen(false)
          loadPipeline()
        }}
      />
    </div>
  )
}
