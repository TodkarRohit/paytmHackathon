import React from 'react'
import { Flame } from 'lucide-react'

// Helper to format relative date/time like WhatsApp
function formatWhatsAppTime(timestamp) {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    }

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function ConversationCard({
  conversation,
  isSelected,
  onSelect,
}) {
  const shopkeeper = conversation.shopkeeperId || {}
  const shopName = shopkeeper.shopName || 'Merchant'
  const contactName = shopkeeper.name || 'Owner'
  const city = shopkeeper.address?.city || ''
  const status = conversation.status || 'Active'
  const lastUpdated = formatWhatsAppTime(conversation.updatedAt || conversation.createdAt)

  // Last message snippet
  let lastMessageText = conversation.aiSummary || 'Active sales dialogue'
  if (Array.isArray(conversation.messages) && conversation.messages.length > 0) {
    const lastMsg = conversation.messages[conversation.messages.length - 1]
    if (lastMsg?.text) {
      const prefix = lastMsg.sender === 'AI' ? 'AI: ' : lastMsg.sender === 'Shopkeeper' ? '' : 'Agent: '
      lastMessageText = `${prefix}${lastMsg.text}`
    }
  }

  // Lead temperature
  const leadStatus = conversation.leadId?.leadStatus

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className={`w-full text-left px-3 py-2.5 transition-all cursor-pointer border-b border-slate-100 flex items-start gap-2.5 relative overflow-hidden ${
        isSelected
          ? 'bg-blue-50/90 border-l-4 border-l-[#002e6e] text-slate-900 shadow-2xs'
          : 'hover:bg-slate-50/90 text-slate-800'
      }`}
      aria-selected={isSelected}
    >
      {/* Merchant Avatar */}
      <div className="relative shrink-0 mt-0.5">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
            isSelected
              ? 'bg-[#002e6e] text-white'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {shopName.charAt(0).toUpperCase()}
        </div>
        {/* Status indicator dot */}
        <span
          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-white ${
            status === 'Active'
              ? 'bg-emerald-500'
              : status === 'Escalated to Agent'
              ? 'bg-amber-500'
              : 'bg-slate-400'
          }`}
          title={`Status: ${status}`}
        />
      </div>

      {/* Conversation Details */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Shop Name & Timestamp */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h4
            className="text-xs sm:text-sm font-bold text-slate-900 truncate"
            title={shopName}
          >
            {shopName}
          </h4>
          <span
            className={`text-[10px] font-medium shrink-0 ${
              isSelected ? 'text-[#002e6e] font-semibold' : 'text-slate-400'
            }`}
          >
            {lastUpdated}
          </span>
        </div>

        {/* Row 2: Secondary text (Owner Name / Location) */}
        <p className="text-[11px] text-slate-500 truncate mb-1">
          {contactName} {city ? `• ${city}` : ''}
        </p>

        {/* Row 3: Single-line Last Message Preview + Lead Status badge */}
        <div className="flex items-center justify-between gap-1.5">
          <p
            className={`text-xs truncate flex-1 min-w-0 ${
              isSelected ? 'text-slate-700 font-medium' : 'text-slate-500'
            }`}
            title={lastMessageText}
          >
            {lastMessageText}
          </p>

          {leadStatus && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold border shrink-0 ${
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
      </div>
    </button>
  )
}
