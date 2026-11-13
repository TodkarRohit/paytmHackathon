import React, { useState, useEffect, useCallback } from 'react'
import {
  Target,
  Plus,
  Flame,
  User,
  Store,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
} from 'lucide-react'
import { leadAPI, shopkeeperAPI, campaignAPI } from '../services/api'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

const LEAD_STATUSES = ['All', 'Hot', 'Warm', 'Cold']
const STAGES = ['All', 'Identified', 'Agent Assigned', 'Demo Scheduled', 'Won', 'Lost']
const PRIORITIES = ['All', 'High', 'Medium', 'Low']
const AVAILABLE_PRODUCTS = [
  'Paytm Soundbox 4.0',
  'Paytm EDC Card Machine',
  'Paytm Merchant Loan',
  'Paytm Dynamic QR',
  'Paytm Soundbox Plus',
]

export default function Leads({ onRecordMutated }) {
  const [leads, setLeads] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedStage, setSelectedStage] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [viewLead, setViewLead] = useState(null)
  const [deletingLead, setDeletingLead] = useState(null)
  const [formError, setFormError] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Options for form dropdowns
  const [shopkeepersList, setShopkeepersList] = useState([])
  const [campaignsList, setCampaignsList] = useState([])

  // Form fields
  const [formData, setFormData] = useState({
    shopkeeperId: '',
    campaignId: '',
    interestedProducts: ['Paytm Soundbox 4.0'],
    leadStatus: 'Hot',
    confidenceScore: 80,
    stage: 'Identified',
    priority: 'High',
    aiSummary: '',
    notes: '',
  })

  // Fetch leads
  const fetchLeads = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: 10,
        leadStatus: selectedStatus !== 'All' ? selectedStatus : undefined,
        stage: selectedStage !== 'All' ? selectedStage : undefined,
        priority: selectedPriority !== 'All' ? selectedPriority : undefined,
      }
      const res = await leadAPI.getAll(params)
      if (res.status === 'success') {
        setLeads(res.data || [])
        if (res.pagination) setPagination(res.pagination)
      }
    } catch (err) {
      setError(err.message || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, selectedStage, selectedPriority])

  useEffect(() => {
    fetchLeads(1)
  }, [fetchLeads])

  // Fetch shopkeepers & campaigns list when opening form
  const loadFormOptions = async () => {
    try {
      const [skRes, campRes] = await Promise.all([
        shopkeeperAPI.getAll({ limit: 100 }),
        campaignAPI.getAll({ limit: 100 }),
      ])
      if (skRes.status === 'success') setShopkeepersList(skRes.data || [])
      if (campRes.status === 'success') setCampaignsList(campRes.data || [])
    } catch {
      // Non-critical, user can still type or retry
    }
  }

  // Open Create Modal
  const handleOpenCreate = async () => {
    await loadFormOptions()
    setEditingLead(null)
    setFormData({
      shopkeeperId: '',
      campaignId: '',
      interestedProducts: ['Paytm Soundbox 4.0'],
      leadStatus: 'Hot',
      confidenceScore: 80,
      stage: 'Identified',
      priority: 'High',
      aiSummary: '',
      notes: '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = async (lead) => {
    await loadFormOptions()
    setEditingLead(lead)
    setFormData({
      shopkeeperId: lead.shopkeeperId?._id || lead.shopkeeperId || '',
      campaignId: lead.campaignId?._id || lead.campaignId || '',
      interestedProducts: lead.interestedProducts || ['Paytm Soundbox 4.0'],
      leadStatus: lead.leadStatus || 'Warm',
      confidenceScore: lead.confidenceScore || 50,
      stage: lead.stage || 'Identified',
      priority: lead.priority || 'Medium',
      aiSummary: lead.aiSummary || '',
      notes: lead.notes || '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  // Submit Create / Edit
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.shopkeeperId) {
      setFormError('Please select a merchant shopkeeper')
      return
    }

    setFormError(null)
    setFormSubmitting(true)

    try {
      const payload = {
        ...formData,
        campaignId: formData.campaignId || undefined,
      }

      if (editingLead) {
        await leadAPI.update(editingLead._id, payload)
      } else {
        await leadAPI.create(payload)
      }
      setIsFormOpen(false)
      fetchLeads(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to save lead')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Quick Change Lead Status (Hot / Warm / Cold)
  const handleQuickStatusChange = async (leadId, newStatus) => {
    try {
      await leadAPI.updateStatus(leadId, newStatus)
      fetchLeads(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setError(`Failed to update status: ${err.message}`)
    }
  }

  // Delete Lead
  const handleDelete = async () => {
    if (!deletingLead) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await leadAPI.delete(deletingLead._id)
      setDeletingLead(null)
      fetchLeads(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to delete lead')
    } finally {
      setFormSubmitting(false)
    }
  }

  // View Details
  const handleViewDetails = async (id) => {
    try {
      const res = await leadAPI.getById(id)
      if (res.status === 'success') {
        setViewLead(res.data)
      }
    } catch (err) {
      setError(`Failed to fetch lead details: ${err.message}`)
    }
  }

  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase()
    if (s === 'hot') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
          Hot
        </span>
      )
    }
    if (s === 'warm') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Warm
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
        Cold
      </span>
    )
  }

  const getStageBadge = (stage = '') => {
    if (stage === 'Won') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
          Won
        </span>
      )
    }
    if (stage === 'Lost') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
          Lost
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
        {stage || 'Identified'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Lead Management
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Identified high-intent merchants, lead temperatures, and sales stage progression
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead</span>
        </button>
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
            onClick={() => fetchLeads(pagination.page)}
            className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Temperature Quick Tabs & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Temperature Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg border border-slate-200/60">
            {LEAD_STATUSES.map((status) => {
              const isSelected = selectedStatus === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? status === 'Hot'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : status === 'Warm'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : status === 'Cold'
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status === 'Hot' && <Flame className="w-3 h-3 inline mr-1 fill-current" />}
                  {status === 'All' ? 'All Leads' : `${status} Leads`}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Stage filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Stage:</span>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Priority:</span>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {PRIORITIES.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => fetchLeads(pagination.page)}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Refresh leads"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading sales leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No leads found"
            description={
              selectedStatus !== 'All' || selectedStage !== 'All' || selectedPriority !== 'All'
                ? 'No leads match your selected filters. Try adjusting your temperature or stage filters.'
                : 'No merchant leads have been generated yet. Click "Add Lead" above to record a new qualified prospect.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3">Merchant / Store</th>
                  <th scope="col" className="px-5 py-3">Products of Interest</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-center">Confidence</th>
                  <th scope="col" className="px-5 py-3">Stage</th>
                  <th scope="col" className="px-5 py-3">Assigned Agent</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leads.map((lead) => {
                  const customerName = lead.shopkeeperId?.name || lead.customerName || '—'
                  const shopName = lead.shopkeeperId?.shopName || lead.shopName || '—'
                  const phone = lead.shopkeeperId?.phoneNumber || lead.phoneNumber || '—'
                  const agentName =
                    lead.assignedAgent?.name ||
                    lead.activeAssignment?.agentId?.name ||
                    (typeof lead.assignedAgent === 'string' ? lead.assignedAgent : null) ||
                    'Unassigned'

                  return (
                    <tr key={lead._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {customerName !== '—' ? customerName.charAt(0) : 'L'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{customerName}</span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Store className="w-3 h-3 text-slate-400" />
                              {shopName} • {phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                        {Array.isArray(lead.interestedProducts) &&
                        lead.interestedProducts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {lead.interestedProducts.map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(lead.leadStatus)}
                          <select
                            value={lead.leadStatus}
                            onChange={(e) => handleQuickStatusChange(lead._id, e.target.value)}
                            className="bg-transparent border-0 text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer focus:ring-0 p-0"
                            title="Quick change status"
                          >
                            <option value="Hot">Hot</option>
                            <option value="Warm">Warm</option>
                            <option value="Cold">Cold</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <span className="font-semibold text-slate-800">
                          {lead.confidenceScore ?? 50}%
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getStageBadge(lead.stage)}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className={agentName === 'Unassigned' ? 'text-slate-400 italic' : ''}>
                            {agentName}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(lead._id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="View Lead Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lead)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Lead"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingLead(lead)
                              setFormError(null)
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.total > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {leads.length} of {pagination.total} leads
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => fetchLeads(pagination.page - 1)}
                className="px-2.5 py-1 border border-slate-200 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-800">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={!pagination.hasNext}
                onClick={() => fetchLeads(pagination.page + 1)}
                className="px-2.5 py-1 border border-slate-200 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: View Details */}
      <Modal
        isOpen={Boolean(viewLead)}
        onClose={() => setViewLead(null)}
        title="Sales Lead Details"
        maxWidth="max-w-xl"
      >
        {viewLead && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-orange-50/60 border border-orange-200/70 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {viewLead.shopkeeperId?.name || 'Unknown Merchant'}
                </h4>
                <p className="text-slate-600">
                  {viewLead.shopkeeperId?.shopName} • {viewLead.shopkeeperId?.phoneNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(viewLead.leadStatus)}
                {getStageBadge(viewLead.stage)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Campaign Sourced
                </span>
                <span className="font-medium text-slate-800">
                  {viewLead.campaignId?.campaignName || 'Direct Outreach / None'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Priority
                </span>
                <span className="font-medium text-slate-800">{viewLead.priority || 'Medium'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Confidence Score
                </span>
                <span className="font-medium text-slate-800">
                  {viewLead.confidenceScore ?? 50} / 100
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Assigned Agent
                </span>
                <span className="font-medium text-slate-800">
                  {viewLead.activeAssignment?.agentId?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Interested Products */}
            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                Products of Interest
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {viewLead.interestedProducts?.map((prod, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 text-[11px] font-medium"
                  >
                    {prod}
                  </span>
                )) || <span className="text-slate-500">None specified</span>}
              </div>
            </div>

            {/* AI Summary */}
            {viewLead.aiSummary && (
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  AI Dialogue Summary
                </span>
                <p className="text-slate-700 leading-relaxed">{viewLead.aiSummary}</p>
              </div>
            )}

            {/* Internal Notes */}
            {viewLead.notes && (
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Agent Follow-up Notes
                </span>
                <p className="text-slate-700 leading-relaxed">{viewLead.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewLead(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create / Edit Lead */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingLead ? 'Edit Lead' : 'Create Sales Lead'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Merchant / Shopkeeper *
            </label>
            <select
              required
              disabled={Boolean(editingLead)}
              value={formData.shopkeeperId}
              onChange={(e) => setFormData({ ...formData, shopkeeperId: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            >
              <option value="">-- Choose Shopkeeper --</option>
              {shopkeepersList.map((sk) => (
                <option key={sk._id} value={sk._id}>
                  {sk.name} ({sk.shopName}) - {sk.phoneNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Source Campaign (Optional)
            </label>
            <select
              value={formData.campaignId}
              onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">-- None / Direct Contact --</option>
              {campaignsList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.campaignName} ({c.productFocus})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Interested Products *
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {AVAILABLE_PRODUCTS.map((prod) => {
                const checked = formData.interestedProducts.includes(prod)
                return (
                  <label
                    key={prod}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer select-none text-[11px]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...formData.interestedProducts, prod]
                          : formData.interestedProducts.filter((p) => p !== prod)
                        setFormData({ ...formData, interestedProducts: updated })
                      }}
                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-slate-800">{prod}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Temperature</label>
              <select
                value={formData.leadStatus}
                onChange={(e) => setFormData({ ...formData, leadStatus: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {STAGES.filter((s) => s !== 'All').map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {PRIORITIES.filter((p) => p !== 'All').map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">Confidence Score</label>
              <span className="font-bold text-orange-600">{formData.confidenceScore}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.confidenceScore}
              onChange={(e) =>
                setFormData({ ...formData, confidenceScore: parseInt(e.target.value, 10) })
              }
              className="w-full accent-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">AI Dialogue Summary</label>
            <textarea
              rows={2}
              value={formData.aiSummary}
              onChange={(e) => setFormData({ ...formData, aiSummary: e.target.value })}
              placeholder="e.g. Customer inquired about Soundbox battery backup."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              {formSubmitting ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={Boolean(deletingLead)}
        onClose={() => setDeletingLead(null)}
        title="Confirm Lead Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to delete the lead for{' '}
            <strong className="text-slate-900">
              {deletingLead?.shopkeeperId?.name || 'this merchant'}
            </strong>
            ?
          </p>
          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
            Deleting this lead will automatically remove its active sales assignments in accordance
            with database cascade logic.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingLead(null)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              {formSubmitting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
