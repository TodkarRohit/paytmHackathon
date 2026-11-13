import React, { useRef, useEffect } from 'react'
import {
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  RotateCcw,
} from 'lucide-react'

const QUICK_PROMPTS = [
  {
    id: 'hinglish-benefit',
    language: 'Hinglish',
    label: 'Soundbox lene ka kya fayda hai?',
    text: 'Soundbox lene se meri dukaan me kya fayda hoga? Payment kaise confirm hoti hai?',
  },
  {
    id: 'hindi-upi',
    language: 'Hindi',
    label: 'क्या यह सभी UPI ऐप्स सपोर्ट करता है?',
    text: 'क्या Paytm Soundbox सभी UPI ऐप्स जैसे PhonePe और Google Pay की पेमेंट बोलता है?',
  },
  {
    id: 'english-pricing',
    language: 'English',
    label: 'Official pricing and plans',
    text: 'How can I check the official Paytm Soundbox rental plans and audible confirmation features for my shop?',
  },
  {
    id: 'hinglish-fraud',
    language: 'Hinglish',
    label: 'Audible confirmation kaise madad karta hai?',
    text: 'Dukaan par bheed ke waqt audible payment confirmation se payment kaise verify hoti hai?',
  },
  {
    id: 'hindi-languages',
    language: 'Hindi',
    label: 'कितनी भाषाओं में आवाज आती है?',
    text: 'Paytm Soundbox कितनी भाषाओं में पेमेंट की आवाज बोल सकता है?',
  },
  {
    id: 'hinglish-pricing',
    language: 'Hinglish',
    label: 'Official plan kahan se verify karein?',
    text: 'Dukaan ke liye official Soundbox plan aur pricing kahan se verify hoti hai?',
  },
]

export default function MessageComposer({
  inputText,
  setInputText,
  onSendMessage,
  isSending = false,
  error = null,
  onDismissError,
  cooldownSeconds = 0,
  disabled = false,
}) {
  const textareaRef = useRef(null)

  // Focus textarea when conversation is selected or error cleared
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && !isSending && cooldownSeconds === 0 && inputText.trim()) {
        onSendMessage()
      }
    }
  }

  const handleSelectQuickPrompt = (promptText) => {
    if (isSending || cooldownSeconds > 0 || disabled) return
    // Put prompt into text input and focus
    setInputText(promptText)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  const charCount = inputText.length
  const isOverLimit = charCount > 1000

  return (
    <div className="bg-white border-t border-slate-200/90 p-2 sm:px-3 sm:py-2.5 space-y-1.5 select-none shrink-0 shadow-2xs">
      {/* Rate-limit Cooldown Notification */}
      {cooldownSeconds > 0 && (
        <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>
              Rate limit cooldown active: Ready in <strong>{cooldownSeconds}s</strong>
            </span>
          </div>
          <span className="text-[10px] text-amber-700">10 requests/min maximum</span>
        </div>
      )}

      {/* Inline Error Alert with Retry */}
      {error && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2.5 ${
            error.status === 429
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{error.message || 'Failed to send message'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Your message has been preserved in the input box below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onSendMessage()}
              disabled={isSending || cooldownSeconds > 0}
              className="px-2 py-0.5 text-xs font-semibold bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={onDismissError}
              className="p-1 hover:bg-black/5 rounded cursor-pointer"
              aria-label="Dismiss error notification"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Multilingual Quick Prompts - One Compact Scrollable Row */}
      {!disabled && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-500" />
            Prompts:
          </span>
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.id}
              type="button"
              onClick={() => handleSelectQuickPrompt(qp.text)}
              disabled={isSending || cooldownSeconds > 0}
              className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-[#002e6e] hover:border-blue-200 border border-slate-200/80 text-slate-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <span className="text-[10px] text-slate-400 mr-1">[{qp.language}]</span>
              <span>{qp.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp-Style Compact Input Bar (~55-65px) */}
      <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#002e6e]/20 focus-within:border-[#002e6e] transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending || cooldownSeconds > 0}
          placeholder={
            disabled
              ? 'Select a conversation to compose a message...'
              : 'Type a message in English, Hindi, or Hinglish... (Enter to send)'
          }
          className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 p-0.5 min-h-[36px] max-h-[96px] leading-snug"
          maxLength={1000}
          aria-label="Message text"
        />

        {/* Character count */}
        <span
          className={`text-[10px] font-mono shrink-0 select-none ${
            charCount > 900
              ? 'text-rose-600 font-bold'
              : charCount > 750
              ? 'text-amber-600'
              : 'text-slate-400'
          }`}
        >
          {charCount}/1000
        </span>

        {/* Send Button */}
        <button
          type="button"
          onClick={() => onSendMessage()}
          disabled={
            disabled ||
            !inputText.trim() ||
            isSending ||
            cooldownSeconds > 0 ||
            isOverLimit
          }
          className="w-8 h-8 rounded-lg bg-[#002e6e] text-white flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs"
          aria-label="Send message"
          title="Send message (Enter)"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : (
            <Send className="w-3.5 h-3.5 text-white" />
          )}
        </button>
      </div>
    </div>
  )
}

