import React, { useState } from 'react'
import {
  X,
  Store,
  Phone,
  MapPin,
  Languages,
  Volume2,
  Flame,
  Target,
  UserCheck,
  Copy,
  Check,
} from 'lucide-react'

// Helper to format date
function formatDate(dateStr) {
  if (!dateStr) return 'Not available'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Not available'
  }
}

export default function MerchantInfoPanel({
  isOpen = true,
  onClose,
  merchant = null,
  conversation = null,
}) {
  const [copiedId, setCopiedId] = useState(false)

  if (!isOpen) return null

  const shopName = merchant?.shopName || 'Not available'
  const contactName = merchant?.name || 'Not available'
  const phoneNumber = merchant?.phoneNumber || 'Not available'
  const category = merchant?.category || 'Not available'
  const preferredLanguage = merchant?.preferredLanguage || 'Not available'
  const currentDevices = merchant?.currentDevices || []
  const dailyTxns = merchant?.dailyTransactionsEstimate
    ? `~${merchant.dailyTransactionsEstimate} txns/day`
    : 'Not available'

  // Address
  const address = merchant?.address || {}
  const fullAddress = [
    address.street,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(', ') || 'Not available'

  // Sales / Lead info from real backend models
  const lead = conversation?.leadId
  const leadStatus = lead?.leadStatus
  const stage = lead?.stage
  const priority = lead?.priority
  const confidenceScore = lead?.confidenceScore

  // Assignment info from real backend Assignment model
  const assignment = conversation?.assignment
  const assignedAgent = assignment?.agentId
  const assignmentStatus = assignment?.status

  // Conversation metadata
  const convId = conversation?._id || ''
  const channel = conversation?.channel || 'Web Chat'
  const convStatus = conversation?.status || 'Active'
  const messageCount = Array.isArray(conversation?.messages)
    ? conversation.messages.length
    : 0
  const createdAt = formatDate(conversation?.createdAt)
  const updatedAt = formatDate(conversation?.updatedAt)
  const aiSummary = conversation?.aiSummary || 'Active sales dialogue'

  const handleCopyId = () => {
    if (!convId) return
    try {
      navigator.clipboard.writeText(convId)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch {}
  }

  return (
    <aside
      className="w-[285px] shrink-0 bg-white border-l border-slate-200/90 h-full flex flex-col select-none overflow-hidden shadow-xs"
      aria-label="Merchant Details Panel"
    >
      {/* Panel Top Header */}
      <div className="h-14 px-3.5 border-b border-slate-200/90 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-1.5 min-w-0">
          <Store className="w-4 h-4 text-[#002e6e] shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
            Merchant Details
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Close merchant information panel"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Independently Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">
        {/* SECTION 1: MERCHANT PROFILE */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
              1. Merchant Profile
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              {shopName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 text-xs truncate" title={shopName}>
                {shopName}
              </h4>
              <p className="text-slate-500 text-[11px] truncate" title={contactName}>
                {contactName}
              </p>
              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {category}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Phone Number
              </span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{phoneNumber}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Store Location
              </span>
              <span className="font-medium text-slate-800 flex items-start gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-snug break-words">{fullAddress}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Preferred Language
              </span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Languages className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{preferredLanguage}</span>
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Paytm Hardware Status
              </span>
              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                {currentDevices.length > 0 ? (
                  currentDevices.map((dev, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                    >
                      <Volume2 className="w-2.5 h-2.5 text-emerald-600" />
                      {dev}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">No Soundbox deployed</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">
                Daily Transactions
              </span>
              <span className="font-medium text-slate-800">{dailyTxns}</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: SALES LEAD STATUS */}
        <section className="pt-3 border-t border-slate-200/90 space-y-2.5">
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-[#002e6e]" />
              2. Sales Lead Status
            </span>
            {leadStatus && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold border shrink-0 ${
                  leadStatus === 'Hot'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : leadStatus === 'Warm'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                <Flame className="w-2.5 h-2.5" />
                {leadStatus}
              </span>
            )}
          </div>

          {lead ? (
            <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Pipeline Stage</span>
                  <span className="font-semibold text-slate-800 truncate block">{stage || 'Identified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Priority</span>
                  <span className="font-semibold text-slate-800 truncate block">{priority || 'Medium'}</span>
                </div>
              </div>

              {typeof confidenceScore === 'number' && (
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                    <span>AI Confidence Score</span>
                    <span className="font-bold text-slate-800">{confidenceScore}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#002e6e] h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, confidenceScore))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-slate-500 text-center text-[11px]">
              No CRM lead linked
            </div>
          )}
        </section>

        {/* SECTION 3: ASSIGNED FIELD AGENT */}
        <section className="pt-3 border-t border-slate-200/90 space-y-2">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
              3. Assigned Field Agent
            </span>
          </div>

          {assignedAgent ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-emerald-950 truncate">
                  {assignedAgent.name}
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                  {assignmentStatus || 'Active'}
                </span>
              </div>
              {assignedAgent.territory && (
                <p className="text-[11px] text-emerald-900 truncate">
                  Territory: {assignedAgent.territory}
                </p>
              )}
              {assignedAgent.phone && (
                <p className="text-[11px] text-emerald-900 font-mono truncate">
                  Phone: {assignedAgent.phone}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-slate-500 text-center text-[11px]">
              Not assigned to a human agent yet
            </div>
          )}
        </section>

        {/* SECTION 4: CONVERSATION INFORMATION */}
        <section className="pt-3 border-t border-slate-200/90 space-y-2">
          <span className="font-bold text-xs uppercase tracking-wider text-slate-900 block">
            4. Conversation Details
          </span>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Conversation ID</span>
              <div className="flex items-center justify-between gap-1 bg-slate-50 p-1.5 rounded border border-slate-200/60 font-mono text-[10px] text-slate-700">
                <span className="truncate">{convId || 'Not available'}</span>
                {convId && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
                    title="Copy Conversation ID"
                  >
                    {copiedId ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded border border-slate-200/60 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Channel</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">{channel}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Status</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">{convStatus}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Msgs</span>
                <span className="font-semibold text-slate-800 text-[11px] block">{messageCount}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Started At</span>
                <span className="text-slate-700 text-[11px]">{createdAt}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Last Activity</span>
                <span className="text-slate-700 text-[11px]">{updatedAt}</span>
              </div>
            </div>

            {aiSummary && (
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">AI Summary</span>
                <p className="text-[11px] text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200/60 leading-relaxed break-words">
                  "{aiSummary}"
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </aside>
  )
}
