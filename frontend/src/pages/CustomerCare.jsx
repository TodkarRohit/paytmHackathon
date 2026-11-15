import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Headset,
  Search,
  RefreshCw,
  AlertCircle,
  Eye,
  Clock,
  UserCheck,
  CheckCircle2,
  HelpCircle,
  Phone,
  Store,
} from 'lucide-react'
import { conversationAPI } from '../services/api'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'

const STATUS_FILTERS = ['All', 'Active', 'Escalated to Agent', 'Completed']

export default function CustomerCare({ onRecordMutated }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })

  // Fetch support conversations
  const fetchSupportRequests = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      setError(null)

      const params = {
        support: true,
        page,
        limit: 50,
      }

      if (selectedStatus !== 'All') {
        params.status = selectedStatus
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }

      const res = await conversationAPI.getAll(params)

      if (res && res.status === 'success') {
        setConversations(res.data || [])
        if (res.pagination) {
          setPagination(res.pagination)
        }
      } else {
        setConversations([])
      }
    } catch (err) {
      console.error('Failed to load customer care requests:', err)
      setError(err.message || 'Failed to load customer care requests')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSupportRequests(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchSupportRequests])

  // Open the conversation in Conversations tab
  const handleViewConversation = (conv) => {
    if (!conv) return

    const convId = conv._id
    const shopkeeperId = conv.shopkeeperId?._id || conv.shopkeeperId

    if (convId) {
      try {
        sessionStorage.setItem('paytm_selected_conversation_id', convId)
      } catch {}
    }

    if (shopkeeperId) {
      try {
        sessionStorage.setItem('paytm_selected_shopkeeper_id', shopkeeperId.toString())
      } catch {}
    }

    // Trigger sidebar tab switch to 'Conversations'
    const navButtons = Array.from(document.querySelectorAll('nav button'))
    const convBtn = navButtons.find((btn) => btn.textContent.includes('Conversations'))
    if (convBtn) {
      convBtn.click()
    }
  }

  // Filter conversations locally if needed for instant responsiveness
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations

    const term = searchTerm.toLowerCase().trim()
    return conversations.filter((c) => {
      const merchantName = (c.shopkeeperId?.name || '').toLowerCase()
      const shopName = (c.shopkeeperId?.shopName || '').toLowerCase()
      const phone = (c.shopkeeperId?.phoneNumber || '').toLowerCase()
      return merchantName.includes(term) || shopName.includes(term) || phone.includes(term)
    })
  }, [conversations, searchTerm])

  // Compute stat metrics from all loaded support conversations
  const stats = useMemo(() => {
    const total = conversations.length
    let open = 0
    let escalated = 0
    let completed = 0

    conversations.forEach((c) => {
      if (c.status === 'Escalated to Agent' || c.escalatedToHuman === true) {
        escalated++
      } else if (c.status === 'Completed') {
        completed++
      } else {
        // Active / Open
        open++
      }
    })

    return { total, open, escalated, completed }
  }, [conversations])

  // Helper to extract the last doubt / message sent by the shopkeeper
  const getDoubtText = (conv) => {
    if (!conv?.messages || conv.messages.length === 0) {
      return conv?.aiSummary || '—'
    }

    // Find the latest message sent by the shopkeeper
    const shopkeeperMsgs = conv.messages.filter((m) => m.sender === 'Shopkeeper')
    if (shopkeeperMsgs.length > 0) {
      return shopkeeperMsgs[shopkeeperMsgs.length - 1].text
    }

    return conv.messages[conv.messages.length - 1].text || '—'
  }

  // Render Status Badge
  const renderStatusBadge = (conv) => {
    const isEscalated = conv.status === 'Escalated to Agent' || conv.escalatedToHuman === true
    const isCompleted = conv.status === 'Completed'

    if (isEscalated) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Escalated to Agent
        </span>
      )
    }

    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Completed
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Open
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Headset className="w-5 h-5 text-orange-600" />
            Customer Care & Merchant Support
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time shopkeeper technical doubts, soundbox troubleshooting, and agent escalations
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchSupportRequests(1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Doubts"
          value={stats.total}
          icon={HelpCircle}
          badgeText={stats.total > 0 ? 'Logged' : 'No data'}
          helperText="All recorded customer care queries"
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          borderColor="border-blue-100"
        />

        <StatCard
          title="Open"
          value={stats.open}
          icon={Clock}
          badgeText={stats.open > 0 ? 'Active' : 'Zero'}
          helperText="Awaiting shopkeeper verification"
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          borderColor="border-amber-100"
        />

        <StatCard
          title="Escalated to Agent"
          value={stats.escalated}
          icon={UserCheck}
          badgeText={stats.escalated > 0 ? 'Action Req.' : 'None'}
          helperText="Needs field agent intervention"
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          borderColor="border-rose-100"
        />

        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          badgeText={stats.completed > 0 ? 'Resolved' : 'None'}
          helperText="Successfully resolved doubts"
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          borderColor="border-emerald-100"
        />
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchSupportRequests(1)}
            className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search by Merchant Name / Phone */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by merchant name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 shrink-0 font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === 'Active' ? 'Open (Active)' : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading customer care requests...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={Headset}
            title="No customer care requests yet"
            description={
              searchTerm || selectedStatus !== 'All'
                ? 'No customer care requests match your search or filter criteria. Try clearing filters.'
                : 'When shopkeepers ask doubts or raise technical support issues in Conversations, they will automatically appear here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3">Merchant Name</th>
                  <th scope="col" className="px-5 py-3">Shop Name</th>
                  <th scope="col" className="px-5 py-3">Phone Number</th>
                  <th scope="col" className="px-5 py-3">Paytm Product</th>
                  <th scope="col" className="px-5 py-3 max-w-xs">Doubt / Last Message</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3">Date</th>
                  <th scope="col" className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConversations.map((conv) => {
                  const shopkeeper = conv.shopkeeperId || {}
                  const merchantName = shopkeeper.name || 'Merchant'
                  const shopName = shopkeeper.shopName || 'Retail Shop'
                  const phone = shopkeeper.phoneNumber || '—'
                  const devices =
                    Array.isArray(shopkeeper.currentDevices) && shopkeeper.currentDevices.length > 0
                      ? shopkeeper.currentDevices.join(', ')
                      : 'Paytm Soundbox'
                  const doubtText = getDoubtText(conv)
                  const dateStr = conv.updatedAt || conv.createdAt
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'

                  return (
                    <tr
                      key={conv._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Merchant Name */}
                      <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {merchantName}
                      </td>

                      {/* Shop Name */}
                      <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{shopName}</span>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td className="px-5 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{phone}</span>
                        </div>
                      </td>

                      {/* Paytm Product */}
                      <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {devices}
                        </span>
                      </td>

                      {/* Doubt / Last Shopkeeper Message */}
                      <td className="px-5 py-3 text-slate-700 max-w-xs">
                        <p className="line-clamp-2 text-xs" title={doubtText}>
                          {doubtText}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {renderStatusBadge(conv)}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {formattedDate}
                      </td>

                      {/* View Button */}
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewConversation(conv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          title="Open in Conversations"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
