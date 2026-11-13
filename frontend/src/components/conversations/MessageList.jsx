import React, { useRef, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'

// Helper to determine if date changed between consecutive messages
function shouldShowDateDivider(currMsg, prevMsg) {
  if (!prevMsg) return true
  try {
    const currDate = new Date(currMsg.timestamp).toDateString()
    const prevDate = new Date(prevMsg.timestamp).toDateString()
    return currDate !== prevDate
  } catch {
    return false
  }
}

function formatDateDivider(timestamp) {
  if (!timestamp) return 'Recent'
  try {
    const d = new Date(timestamp)
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (d.toDateString() === today) return 'Today'
    if (d.toDateString() === yesterday) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Recent'
  }
}

export default function MessageList({
  messages = [],
  merchantName = 'Merchant',
  agentName = 'Sales Agent',
  loading = false,
  isSending = false,
}) {
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)
  const isNearBottomRef = useRef(true)

  // Track if user is near bottom
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    // Consider within 120px as "at bottom"
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120
  }

  // Auto-scroll when new messages arrive or when sending, only if user was near bottom
  useEffect(() => {
    if (isNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isSending])

  // Initial scroll when conversation changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [loading])

  if (loading) {
    return (
      <div className="flex-1 p-6 flex flex-col justify-center items-center space-y-3 bg-[#efeae2]/30">
        <Loader2 className="w-8 h-8 animate-spin text-[#002e6e]" />
        <p className="text-xs font-medium text-slate-600">
          Loading conversation history from MongoDB...
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 bg-slate-50/60 select-text"
    >
      {messages.length === 0 ? (
        /* Empty Dialogue State */
        <div className="h-full flex flex-col items-center justify-center p-4 text-center max-w-sm mx-auto my-auto text-slate-500">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-[#002e6e] mb-2">
            <Sparkles className="w-5 h-5 text-[#002e6e]" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-0.5">
            Dialogue ready for {merchantName}
          </h4>
          <p className="text-xs text-slate-500 max-w-xs">
            Send a message or select a prompt below to consult the AI Sales Teammate.
          </p>
        </div>
      ) : (
        /* Render message history with date dividers */
        messages.map((msg, index) => {
          const showDate = shouldShowDateDivider(msg, messages[index - 1])

          return (
            <React.Fragment key={index}>
              {showDate && (
                <div className="flex justify-center my-2">
                  <span className="bg-white/95 text-slate-500 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                    {formatDateDivider(msg.timestamp)}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                merchantName={merchantName}
                agentName={agentName}
              />
            </React.Fragment>
          )
        })
      )}

      {/* AI Drafting Response / Typing State */}
      {isSending && (
        <div className="flex justify-end my-2">
          <div className="bg-[#e7f3ff] text-slate-800 border border-sky-200/70 rounded-lg rounded-tr-none px-4 py-2.5 shadow-2xs flex items-center gap-2 max-w-md">
            <Sparkles className="w-4 h-4 text-[#002e6e] shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-700 font-medium">
                Paytm AI Teammate is typing
              </span>
              <span className="flex gap-1 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#002e6e] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#002e6e] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#002e6e] animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  )
}
