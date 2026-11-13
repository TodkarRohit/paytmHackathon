import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  Search,
  Plus,
  RefreshCw,
  X,
  Bot,
  UserCheck,
} from 'lucide-react'
import ConversationCard from './ConversationCard'

export default function ConversationList({
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  onStartNewConversation,
  onRefresh,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All') // 'All' | 'AI Active' | 'Human Assigned'

  // Filter conversations strictly by search and real backend data
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // 1. Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const shopkeeper = conv.shopkeeperId || {}
        const shopName = (shopkeeper.shopName || '').toLowerCase()
        const contactName = (shopkeeper.name || '').toLowerCase()
        const phone = (shopkeeper.phoneNumber || '').toLowerCase()
        const city = (shopkeeper.address?.city || '').toLowerCase()
        const category = (shopkeeper.category || '').toLowerCase()
        const summary = (conv.aiSummary || '').toLowerCase()

        const matchesSearch =
          shopName.includes(q) ||
          contactName.includes(q) ||
          phone.includes(q) ||
          city.includes(q) ||
          category.includes(q) ||
          summary.includes(q)

        if (!matchesSearch) return false
      }

      // 2. Status / Assignment Tab filter
      if (activeFilter === 'AI Active') {
        return conv.status === 'Active'
      }
      if (activeFilter === 'Human Assigned') {
        return (
          conv.status === 'Escalated to Agent' ||
          conv.leadId?.stage === 'Agent Assigned' ||
          Boolean(conv.assignment)
        )
      }

      return true
    })
  }, [conversations, searchQuery, activeFilter])

  return (
    <aside className="w-full h-full flex flex-col bg-white border-r border-slate-200/90 select-none overflow-hidden">
      {/* Panel Header */}
      <div className="p-2.5 sm:p-3 border-b border-slate-200/90 bg-white space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Conversations
            </h2>
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              {conversations.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh conversation list"
              aria-label="Refresh conversation list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onStartNewConversation}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-white bg-[#002e6e] hover:bg-blue-900 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Start a new dialogue"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search merchants or conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002e6e] focus:border-[#002e6e] transition-all"
            aria-label="Search merchants or conversations"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter('All')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              activeFilter === 'All'
                ? 'bg-[#002e6e] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('AI Active')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              activeFilter === 'AI Active'
                ? 'bg-[#002e6e] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bot className="w-3 h-3" />
            <span>AI Active</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('Human Assigned')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              activeFilter === 'Human Assigned'
                ? 'bg-[#002e6e] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Assigned</span>
          </button>
        </div>
      </div>

      {/* Conversations Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && conversations.length === 0 ? (
          /* Loading Skeletons */
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          /* Empty State */
          <div className="p-6 text-center text-slate-500 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-1">
              <MessageSquare className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-800">
              No conversations yet
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? 'No merchant dialogue matches your search query.'
                : 'Start a dialogue with a registered merchant to begin AI sales conversations.'}
            </p>
            <button
              type="button"
              onClick={onStartNewConversation}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#002e6e] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Start New Conversation</span>
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationCard
              key={conv._id}
              conversation={conv}
              isSelected={selectedConversationId === conv._id}
              onSelect={onSelectConversation}
            />
          ))
        )}
      </div>
    </aside>
  )
}
