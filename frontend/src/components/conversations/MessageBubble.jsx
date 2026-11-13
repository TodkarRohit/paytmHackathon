import React from 'react'
import {
  User,
  UserCheck,
  CheckCheck,
  Tag,
  Sparkles,
} from 'lucide-react'

// Helper for message timestamp
function formatTime(timestamp) {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return ''
  }
}

// Helper for intent badge styling
function renderIntentBadge(intent) {
  if (!intent) return null

  const intentMap = {
    Purchase_Intent: { label: 'Purchase Intent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Pricing_Inquiry: { label: 'Pricing Inquiry', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    Product_Inquiry: { label: 'Product Info', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    Objection_Handling: { label: 'Objection Handled', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    Feature_Inquiry: { label: 'Features', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    Fraud_Protection: { label: 'Fraud Awareness', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    Language_Support: { label: 'Multilingual', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    Greeting: { label: 'Greeting', color: 'bg-slate-50 text-slate-600 border-slate-200' },
    General_Inquiry: { label: 'General Inquiry', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  }

  const normalized = intent.replace(/\s+/g, '_')
  const config = intentMap[normalized] || {
    label: intent.replace(/_/g, ' '),
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border shrink-0 ${config.color}`}
    >
      <Tag className="w-2.5 h-2.5" />
      {config.label}
    </span>
  )
}

// Helper for sentiment badge
function renderSentimentBadge(sentiment) {
  if (!sentiment) return null

  const sentimentMap = {
    Positive: { label: 'Positive', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '😊' },
    Neutral: { label: 'Neutral', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: '😐' },
    Negative: { label: 'Hesitant', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '😟' },
  }

  const config = sentimentMap[sentiment] || {
    label: sentiment,
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: '💬',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border shrink-0 ${config.color}`}
      title={`Merchant sentiment: ${config.label}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

export default function MessageBubble({
  message,
  merchantName = 'Merchant',
  agentName = 'Sales Representative',
}) {
  const isShopkeeper = message.sender === 'Shopkeeper'
  const isAI = message.sender === 'AI'
  const isAgent = message.sender === 'Agent'
  const isSystem = message.sender === 'System'

  // Centered System Notice
  if (isSystem) {
    return (
      <div className="flex justify-center my-2.5">
        <div className="bg-slate-100 text-slate-600 text-[11px] px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs max-w-md text-center">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex w-full my-1 ${
        isShopkeeper ? 'justify-start' : 'justify-end'
      }`}
    >
      <div
        className={`relative max-w-[82%] sm:max-w-[76%] md:max-w-[70%] px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl shadow-2xs text-xs sm:text-sm leading-relaxed ${
          isShopkeeper
            ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80'
            : isAI
            ? 'bg-[#e7f3ff] text-slate-900 rounded-tr-none border border-sky-200/70'
            : isAgent
            ? 'bg-amber-50 text-slate-900 rounded-tr-none border border-amber-200'
            : 'bg-slate-100 text-slate-800 rounded-tr-none border border-slate-200'
        }`}
      >
        {/* Sender Header */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5">
            {isShopkeeper ? (
              <span className="font-bold text-[11px] text-slate-700 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                {merchantName}
              </span>
            ) : isAI ? (
              <span className="font-bold text-[11px] text-[#002e6e] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-600" />
                Paytm AI Sales Teammate
              </span>
            ) : (
              <span className="font-bold text-[11px] text-amber-800 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-amber-600" />
                Sales Agent: {agentName}
              </span>
            )}
          </div>
        </div>

        {/* Message Content */}
        <p className="whitespace-pre-wrap break-words text-slate-800 text-xs sm:text-sm leading-relaxed">
          {message.text}
        </p>

        {/* Footer: Metadata & Timestamp with WhatsApp Delivery Checks */}
        <div className="flex items-center justify-between gap-2 mt-1 pt-0.5 border-t border-black/5">
          {/* Metadata badges (Intent & Sentiment) */}
          <div className="flex items-center gap-1 flex-wrap">
            {message.intentDetected && renderIntentBadge(message.intentDetected)}
            {isAI && message.sentiment && renderSentimentBadge(message.sentiment)}
          </div>

          {/* Time & Delivery Checkmarks */}
          <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0 ml-auto font-medium">
            <span>{formatTime(message.timestamp)}</span>
            {!isShopkeeper && (
              <CheckCheck className="w-3.5 h-3.5 text-[#002e6e]" aria-label="Delivered" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
