import React, { useState, useEffect, useCallback } from 'react'
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { campaignAPI } from '../services/api'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

const STATUSES = ['All', 'Active', 'Paused', 'Completed', 'Draft', 'Archived']
const PRODUCTS = [
  'Paytm Soundbox 4.0',
  'Paytm EDC Card Machine',
  'Paytm Merchant Loan',
  'General Upgrade',
]
const CHANNELS = ['WhatsApp', 'Voice Call', 'SMS', 'Omnichannel']
const CATEGORIES = [
  'All',
  'Kirana / Grocery',
  'Pharmacy',
  'Restaurant / Cafe',
  'Electronics',
  'Apparel / Footwear',
  'Hardware',
  'Automobile / Repair',
  'Other',
]

export default function Campaigns({ onRecordMutated }) {
  const [campaigns, setCampaigns] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedChannel, setSelectedChannel] = useState('All')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [deletingCampaign, setDeletingCampaign] = useState(null)
  const [formError, setFormError] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Form fields
  const [formData, setFormData] = useState({
    campaignName: '',
    productFocus: 'Paytm Soundbox 4.0',
    channel: 'WhatsApp',
    campaignStatus: 'Active',
    targetAudience: {
      category: 'Kirana / Grocery',
      city: 'Jaipur',
      minDailyTransactions: 20,
    },
  })

  // Fetch campaigns
  const fetchCampaigns = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: 10,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
        channel: selectedChannel !== 'All' ? selectedChannel : undefined,
      }
      const res = await campaignAPI.getAll(params)
      if (res.status === 'success') {
        setCampaigns(res.data || [])
        if (res.pagination) setPagination(res.pagination)
      }
    } catch (err) {
      setError(err.message || 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, selectedChannel])

  useEffect(() => {
    fetchCampaigns(1)
  }, [fetchCampaigns])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCampaign(null)
    setFormData({
      campaignName: '',
      productFocus: 'Paytm Soundbox 4.0',
      channel: 'WhatsApp',
      campaignStatus: 'Active',
      targetAudience: {
        category: 'Kirana / Grocery',
        city: 'Jaipur',
        minDailyTransactions: 20,
      },
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (camp) => {
    setEditingCampaign(camp)
    setFormData({
      campaignName: camp.campaignName || '',
      productFocus: camp.productFocus || 'Paytm Soundbox 4.0',
      channel: camp.channel || 'WhatsApp',
      campaignStatus: camp.campaignStatus || 'Active',
      targetAudience: {
        category: camp.targetAudience?.category || 'Kirana / Grocery',
        city: camp.targetAudience?.city || 'Jaipur',
        minDailyTransactions: camp.targetAudience?.minDailyTransactions || 0,
      },
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  // Submit Create / Edit
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)

    try {
      if (editingCampaign) {
        await campaignAPI.update(editingCampaign._id, formData)
      } else {
        await campaignAPI.create(formData)
      }
      setIsFormOpen(false)
      fetchCampaigns(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to save campaign')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Quick Toggle Status (Active <-> Paused)
  const handleToggleStatus = async (camp) => {
    const newStatus = camp.campaignStatus === 'Active' ? 'Paused' : 'Active'
    try {
      await campaignAPI.update(camp._id, { campaignStatus: newStatus })
      fetchCampaigns(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setError(`Failed to toggle status: ${err.message}`)
    }
  }

  // Delete Campaign
  const handleDelete = async () => {
    if (!deletingCampaign) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await campaignAPI.delete(deletingCampaign._id)
      setDeletingCampaign(null)
      fetchCampaigns(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to delete campaign')
    } finally {
      setFormSubmitting(false)
    }
  }

  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase()
    if (s === 'active' || s === 'running') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      )
    }
    if (s === 'paused') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Pause className="w-2.5 h-2.5" />
          Paused
        </span>
      )
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Completed
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {status || 'Draft'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Sales Campaigns
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Automated outreach campaigns targeting merchant clusters via WhatsApp and Phone
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Campaign</span>
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
            onClick={() => fetchCampaigns(pagination.page)}
            className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="All">All Channels</option>
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchCampaigns(pagination.page)}
          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Refresh campaigns"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading sales campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns available"
            description={
              selectedStatus !== 'All' || selectedChannel !== 'All'
                ? 'No campaigns matched your selected filter criteria. Try choosing a different filter.'
                : 'No sales outreach campaigns have been initiated yet. Click "Create Campaign" above to launch an automated outreach.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3">Campaign Details</th>
                  <th scope="col" className="px-5 py-3">Target Audience</th>
                  <th scope="col" className="px-5 py-3 text-center">Delivered</th>
                  <th scope="col" className="px-5 py-3 text-center">Responded</th>
                  <th scope="col" className="px-5 py-3 text-center">Converted</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {campaigns.map((camp) => {
                  const delivered = camp.totalContacts ?? camp.metrics?.delivered ?? camp.metrics?.totalTargeted ?? 0
                  const responded = camp.responses ?? camp.metrics?.responded ?? 0
                  const converted = camp.interestedCustomers ?? camp.metrics?.converted ?? 0

                  return (
                    <tr key={camp._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                            <Megaphone className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {camp.campaignName}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {camp.productFocus} • {camp.channel}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                        <div>
                          <span>
                            {camp.targetAudience?.city || 'All Cities'} (
                            {camp.targetAudience?.category || 'All Categories'})
                          </span>
                          {camp.targetAudience?.minDailyTransactions > 0 && (
                            <span className="text-[10px] text-slate-600 block">
                              Min {camp.targetAudience.minDailyTransactions} txns/day
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-slate-700 font-medium">
                        {delivered}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-slate-700 font-medium">
                        {responded}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center text-emerald-700 font-semibold">
                        {converted}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getStatusBadge(camp.campaignStatus)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(camp)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                            title={
                              camp.campaignStatus === 'Active'
                                ? 'Pause Campaign'
                                : 'Activate Campaign'
                            }
                          >
                            {camp.campaignStatus === 'Active' ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(camp)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit Campaign"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingCampaign(camp)
                              setFormError(null)
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Campaign"
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
              Showing {campaigns.length} of {pagination.total} campaigns
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => fetchCampaigns(pagination.page - 1)}
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
                onClick={() => fetchCampaigns(pagination.page + 1)}
                className="px-2.5 py-1 border border-slate-200 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Campaign */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCampaign ? 'Edit Sales Campaign' : 'Create Sales Campaign'}
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
            <label className="block font-semibold text-slate-700 mb-1">Campaign Name *</label>
            <input
              type="text"
              required
              value={formData.campaignName}
              onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
              placeholder="e.g. Jaipur Kirana Soundbox Festive Q4"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Focus *</label>
              <select
                required
                value={formData.productFocus}
                onChange={(e) => setFormData({ ...formData, productFocus: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {PRODUCTS.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Outreach Channel *</label>
              <select
                required
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Target Audience Filters
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Target City</label>
                <input
                  type="text"
                  value={formData.targetAudience.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAudience: { ...formData.targetAudience, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Store Category</label>
                <select
                  value={formData.targetAudience.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAudience: { ...formData.targetAudience, category: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Min Daily Txns</label>
                <input
                  type="number"
                  min="0"
                  value={formData.targetAudience.minDailyTransactions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAudience: {
                        ...formData.targetAudience,
                        minDailyTransactions: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Campaign Status</label>
            <select
              value={formData.campaignStatus}
              onChange={(e) => setFormData({ ...formData, campaignStatus: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Draft">Draft</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
            >
              {formSubmitting
                ? 'Saving...'
                : editingCampaign
                ? 'Update Campaign'
                : 'Create Campaign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={Boolean(deletingCampaign)}
        onClose={() => setDeletingCampaign(null)}
        title="Confirm Campaign Deletion"
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
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">{deletingCampaign?.campaignName}</strong>?
          </p>
          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
            Note: If any merchant leads were generated from this campaign, deletion will be safely
            prevented by database constraints.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingCampaign(null)}
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
