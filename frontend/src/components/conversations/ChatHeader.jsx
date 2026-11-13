import React from 'react'
import {
  ArrowLeft,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  UserCheck,
} from 'lucide-react'

export default function ChatHeader({
  merchant,
  conversation,
  isPanelCOpen,
  onTogglePanelC,
  onRefreshChat,
  onBackToList,
  loading = false,
}) {
  const shopName = merchant?.shopName || 'Registered Merchant'
  const contactName = merchant?.name || 'Owner'
  const phoneNumber = merchant?.phoneNumber
  const category = merchant?.category
  const preferredLanguage = merchant?.preferredLanguage
  const status = conversation?.status || 'Active'

  return (
    <header className="h-14 px-3 sm:px-4 bg-white border-b border-slate-200/90 flex items-center justify-between gap-2.5 shrink-0 select-none z-10 shadow-2xs">
      {/* Left: Avatar & Merchant Identity */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Mobile Back to List Button */}
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="md:hidden p-1 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Back to conversations list"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Merchant Avatar with status dot */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#002e6e] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {shopName.charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-white ${
              status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            title={`Status: ${status}`}
          />
        </div>

        {/* Merchant Name, Category and Status Details */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          {/* Row 1: Shop Name + Status Badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <h3
              className="text-xs sm:text-sm font-bold text-slate-900 truncate"
              title={shopName}
            >
              {shopName}
            </h3>

            {/* AI Active / Escalated Status Badge */}
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold border ${
                status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : status === 'Escalated to Agent'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {status === 'Active' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AI Active
                </>
              ) : status === 'Escalated to Agent' ? (
                <>
                  <UserCheck className="w-2.5 h-2.5" />
                  Escalated
                </>
              ) : (
                status
              )}
            </span>
          </div>

          {/* Row 2: Contact Name, Category, Phone, Language */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0 truncate">
            <span className="truncate font-medium text-slate-600" title={contactName}>
              {contactName}
            </span>
            {category && (
              <span className="hidden sm:inline text-slate-400 shrink-0">
                • {category}
              </span>
            )}
            {phoneNumber && (
              <span className="hidden md:inline text-slate-400 font-mono shrink-0">
                • {phoneNumber}
              </span>
            )}
            {preferredLanguage && (
              <span className="hidden lg:inline text-slate-400 shrink-0">
                • {preferredLanguage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Reload Chat Transcript */}
        <button
          type="button"
          onClick={onRefreshChat}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          title="Reload messages transcript"
          aria-label="Reload messages transcript"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Toggle Panel C (Merchant Info) */}
        <button
          type="button"
          onClick={onTogglePanelC}
          className={`h-8 px-2 sm:px-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
            isPanelCOpen
              ? 'bg-blue-50 text-[#002e6e] border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
          title={isPanelCOpen ? 'Hide merchant details' : 'Show merchant details'}
          aria-label={isPanelCOpen ? 'Hide merchant details' : 'Show merchant details'}
          aria-expanded={isPanelCOpen}
        >
          {isPanelCOpen ? (
            <PanelRightClose className="w-3.5 h-3.5 text-[#002e6e]" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="hidden sm:inline">
            {isPanelCOpen ? 'Hide Info' : 'Merchant Info'}
          </span>
        </button>
      </div>
    </header>
  )
}
