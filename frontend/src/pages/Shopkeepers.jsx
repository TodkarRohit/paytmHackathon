import React, { useState, useEffect, useCallback } from 'react'
import {
  Store,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { shopkeeperAPI } from '../services/api'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

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

const STATUSES = ['All', 'New', 'Contacted', 'Interested', 'Not Interested', 'Converted', 'Churned']
const LANGUAGES = ['Hindi', 'English', 'Hinglish', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi']

export default function Shopkeepers({ onRecordMutated }) {
  const [shopkeepers, setShopkeepers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Modals state
  const [viewShopkeeper, setViewShopkeeper] = useState(null)
  const [editingShopkeeper, setEditingShopkeeper] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingShopkeeper, setDeletingShopkeeper] = useState(null)
  const [formError, setFormError] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    shopName: '',
    phoneNumber: '',
    category: 'Kirana / Grocery',
    address: { street: '', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
    preferredLanguage: 'Hindi',
    dailyTransactionsEstimate: 0,
    status: 'New',
    whatsappOptIn: true,
    notes: '',
  })

  // Fetch shopkeepers
  const fetchShopkeepers = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
      }
      const res = await shopkeeperAPI.getAll(params)
      if (res.status === 'success') {
        setShopkeepers(res.data || [])
        if (res.pagination) setPagination(res.pagination)
      }
    } catch (err) {
      setError(err.message || 'Failed to load shopkeepers')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedCategory, selectedStatus])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShopkeepers(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchShopkeepers])

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingShopkeeper(null)
    setFormData({
      name: '',
      shopName: '',
      phoneNumber: '',
      category: 'Kirana / Grocery',
      address: { street: '', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      preferredLanguage: 'Hindi',
      dailyTransactionsEstimate: 0,
      status: 'New',
      whatsappOptIn: true,
      notes: '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  // Open Edit Form
  const handleOpenEdit = (shopkeeper) => {
    setEditingShopkeeper(shopkeeper)
    setFormData({
      name: shopkeeper.name || '',
      shopName: shopkeeper.shopName || '',
      phoneNumber: shopkeeper.phoneNumber || '',
      category: shopkeeper.category || 'Other',
      address: {
        street: shopkeeper.address?.street || '',
        city: shopkeeper.address?.city || '',
        state: shopkeeper.address?.state || '',
        pincode: shopkeeper.address?.pincode || '',
      },
      preferredLanguage: shopkeeper.preferredLanguage || 'Hindi',
      dailyTransactionsEstimate: shopkeeper.dailyTransactionsEstimate || 0,
      status: shopkeeper.status || 'New',
      whatsappOptIn: Boolean(shopkeeper.whatsappOptIn),
      notes: shopkeeper.notes || '',
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
      if (editingShopkeeper) {
        await shopkeeperAPI.update(editingShopkeeper._id, formData)
      } else {
        await shopkeeperAPI.create(formData)
      }
      setIsFormOpen(false)
      fetchShopkeepers(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to save shopkeeper')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Delete Shopkeeper
  const handleDelete = async () => {
    if (!deletingShopkeeper) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await shopkeeperAPI.delete(deletingShopkeeper._id)
      setDeletingShopkeeper(null)
      fetchShopkeepers(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to delete shopkeeper')
    } finally {
      setFormSubmitting(false)
    }
  }

  // View Details
  const handleViewDetails = async (id) => {
    try {
      const res = await shopkeeperAPI.getById(id)
      if (res.status === 'success') {
        setViewShopkeeper(res.data)
      }
    } catch (err) {
      setError(`Failed to fetch details: ${err.message}`)
    }
  }

  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase()
    if (s === 'interested' || s === 'converted') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {status}
        </span>
      )
    }
    if (s === 'contacted') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {status}
        </span>
      )
    }
    if (s === 'not interested' || s === 'churned') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          {status}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {status || 'New'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Shopkeeper Directory
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Registered merchant profiles, storefront details, and contact points
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Shopkeeper</span>
        </button>
      </div>

      {/* Global error banner if any */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchShopkeepers(pagination.page)}
            className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by merchant name, shop name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 shrink-0 font-medium hidden sm:inline">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 shrink-0 font-medium hidden sm:inline">Status:</span>
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

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => fetchShopkeepers(pagination.page)}
          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
          title="Refresh shopkeepers"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Table / Empty State Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading shopkeeper directory...</p>
          </div>
        ) : shopkeepers.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No shopkeepers found"
            description={
              searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All'
                ? 'No shopkeepers matched your search or filter criteria. Try clearing filters or adding a new merchant.'
                : 'Your merchant directory is currently empty. Click "Add Shopkeeper" above to register your first storefront.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3">Merchant & Shop</th>
                  <th scope="col" className="px-5 py-3">Category</th>
                  <th scope="col" className="px-5 py-3">Location</th>
                  <th scope="col" className="px-5 py-3">Phone</th>
                  <th scope="col" className="px-5 py-3">WhatsApp</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {shopkeepers.map((sk) => (
                  <tr key={sk._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {sk.name ? sk.name.charAt(0) : 'S'}
                        </div>
                        <div>
                          <span className="font-semibold block">{sk.name || '—'}</span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Store className="w-3 h-3 text-slate-400" />
                            {sk.shopName || '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                      {sk.category || 'Other'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{sk.address?.city || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{sk.phoneNumber || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {sk.whatsappOptIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          Opted In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="w-3 h-3" />
                          No Opt-In
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(sk.status)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(sk._id)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="View Merchant Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sk)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Merchant"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingShopkeeper(sk)
                            setFormError(null)
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Merchant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.total > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {shopkeepers.length} of {pagination.total} shopkeepers
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => fetchShopkeepers(pagination.page - 1)}
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
                onClick={() => fetchShopkeepers(pagination.page + 1)}
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
        isOpen={Boolean(viewShopkeeper)}
        onClose={() => setViewShopkeeper(null)}
        title="Shopkeeper Profile Details"
        maxWidth="max-w-xl"
      >
        {viewShopkeeper && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3.5 rounded-lg bg-orange-50/60 border border-orange-200/70 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {viewShopkeeper.name ? viewShopkeeper.name.charAt(0) : 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {viewShopkeeper.name}
                </h4>
                <p className="text-slate-600">{viewShopkeeper.shopName}</p>
              </div>
              <div>{getStatusBadge(viewShopkeeper.status)}</div>
            </div>

            {/* Grid properties */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Phone Number
                </span>
                <span className="font-mono text-slate-800 font-medium">
                  {viewShopkeeper.phoneNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Category
                </span>
                <span className="text-slate-800 font-medium">
                  {viewShopkeeper.category || 'Other'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Preferred Language
                </span>
                <span className="text-slate-800 font-medium">
                  {viewShopkeeper.preferredLanguage || 'Hindi'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Est. Daily Transactions
                </span>
                <span className="text-slate-800 font-medium">
                  {viewShopkeeper.dailyTransactionsEstimate || 0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  WhatsApp Opt-in
                </span>
                <span className="text-slate-800 font-medium">
                  {viewShopkeeper.whatsappOptIn ? 'Opted In' : 'Not Opted In'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Associated Leads
                </span>
                <span className="text-slate-800 font-medium">
                  {viewShopkeeper.associatedLeadsCount ?? 0}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                Storefront Address
              </span>
              <p className="text-slate-700 leading-relaxed">
                {[
                  viewShopkeeper.address?.street,
                  viewShopkeeper.address?.city,
                  viewShopkeeper.address?.state,
                  viewShopkeeper.address?.pincode,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No address specified'}
              </p>
            </div>

            {/* Current Devices (Actual array) */}
            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                Current Payment Devices
              </span>
              {Array.isArray(viewShopkeeper.currentDevices) &&
              viewShopkeeper.currentDevices.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {viewShopkeeper.currentDevices.map((dev, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px]"
                    >
                      {dev}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">No devices currently deployed</p>
              )}
            </div>

            {/* Notes */}
            {viewShopkeeper.notes && (
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/70">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Internal Notes
                </span>
                <p className="text-slate-700 whitespace-pre-wrap">{viewShopkeeper.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewShopkeeper(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create / Edit Shopkeeper */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingShopkeeper ? 'Edit Shopkeeper' : 'Add New Shopkeeper'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Merchant Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Gupta"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shop Name *</label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                placeholder="e.g. Gupta Kirana & General Store"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="e.g. +91 98290 12345"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Storefront Address
            </span>
            <div>
              <label className="block font-medium text-slate-600 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value },
                  })
                }
                placeholder="e.g. Shop 12, Main Market"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">State</label>
                <input
                  type="text"
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Pincode</label>
                <input
                  type="text"
                  value={formData.address.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, pincode: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Preferred Language</label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lead/Merchant Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {STATUSES.filter((s) => s !== 'All').map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="whatsappOptIn"
              checked={formData.whatsappOptIn}
              onChange={(e) => setFormData({ ...formData, whatsappOptIn: e.target.checked })}
              className="rounded border-slate-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
            />
            <label htmlFor="whatsappOptIn" className="text-slate-700 cursor-pointer select-none">
              Shopkeeper opted in for WhatsApp notifications
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Inquired about Soundbox 4.0 pricing and battery life."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
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
                : editingShopkeeper
                ? 'Update Shopkeeper'
                : 'Create Shopkeeper'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation with relational protection handling */}
      <Modal
        isOpen={Boolean(deletingShopkeeper)}
        onClose={() => setDeletingShopkeeper(null)}
        title="Confirm Shopkeeper Deletion"
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
            <strong className="text-slate-900">{deletingShopkeeper?.name}</strong> (
            {deletingShopkeeper?.shopName})?
          </p>
          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
            Note: If this merchant has associated leads in the pipeline, deletion will be blocked by
            database relational safeguards.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingShopkeeper(null)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
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
