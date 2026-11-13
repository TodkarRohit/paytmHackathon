import React, { useState, useEffect, useCallback } from 'react'
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { agentAPI, leadAPI } from '../services/api'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

const STATUSES = ['All', 'Available', 'Busy', 'On Leave', 'Inactive']
const TERRITORIES = [
  'Jaipur Central',
  'Jaipur North',
  'Jaipur South',
  'Jaipur West',
  'Jaipur East',
  'Mansarovar',
  'Malviya Nagar',
  'Vaishali Nagar',
]

export default function Agents({ onRecordMutated }) {
  const [agents, setAgents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [deletingAgent, setDeletingAgent] = useState(null)
  const [viewLeadsAgent, setViewLeadsAgent] = useState(null)
  const [assignedLeadsData, setAssignedLeadsData] = useState(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  const [formError, setFormError] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Agent form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    territory: 'Jaipur Central',
    status: 'Available',
  })

  // Assign lead form fields
  const [availableLeads, setAvailableLeads] = useState([])
  const [assignData, setAssignData] = useState({
    leadId: '',
    agentId: '',
    priority: 'Standard',
    notes: '',
  })

  // Fetch agents
  const fetchAgents = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: 10,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
      }
      const res = await agentAPI.getAll(params)
      if (res.status === 'success') {
        setAgents(res.data || [])
        if (res.pagination) setPagination(res.pagination)
      }
    } catch (err) {
      setError(err.message || 'Failed to load sales agents')
    } finally {
      setLoading(false)
    }
  }, [selectedStatus])

  useEffect(() => {
    fetchAgents(1)
  }, [fetchAgents])

  // Open Create Agent Modal
  const handleOpenCreate = () => {
    setEditingAgent(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      territory: 'Jaipur Central',
      status: 'Available',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  // Open Edit Agent Modal
  const handleOpenEdit = (agent) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      territory: agent.territory || 'Jaipur Central',
      status: agent.status || 'Available',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  // Submit Create / Edit Agent
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSubmitting(true)

    try {
      if (editingAgent) {
        await agentAPI.update(editingAgent._id, formData)
      } else {
        await agentAPI.create(formData)
      }
      setIsFormOpen(false)
      fetchAgents(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to save sales agent')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Delete Agent
  const handleDelete = async () => {
    if (!deletingAgent) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await agentAPI.delete(deletingAgent._id)
      setDeletingAgent(null)
      fetchAgents(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to delete sales agent')
    } finally {
      setFormSubmitting(false)
    }
  }

  // View Assigned Leads
  const handleViewAssignedLeads = async (agent) => {
    try {
      setViewLeadsAgent(agent)
      setAssignedLeadsData(null)
      const res = await agentAPI.getLeads(agent._id)
      if (res.status === 'success') {
        setAssignedLeadsData(res.data)
      }
    } catch (err) {
      setError(`Failed to fetch assigned leads: ${err.message}`)
    }
  }

  // Open Assign Lead Modal
  const handleOpenAssignModal = async (preselectedAgent = null) => {
    try {
      setFormError(null)
      // Fetch active leads to populate select list
      const leadsRes = await leadAPI.getAll({ limit: 100 })
      if (leadsRes.status === 'success') {
        setAvailableLeads(leadsRes.data || [])
      }
      setAssignData({
        leadId: '',
        agentId: preselectedAgent?._id || '',
        priority: 'Standard',
        notes: '',
      })
      setAssignModalOpen(true)
    } catch (err) {
      setError(`Failed to load leads for assignment: ${err.message}`)
    }
  }

  // Submit Assign Lead
  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    if (!assignData.leadId || !assignData.agentId) {
      setFormError('Please select both a lead and an agent.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      await agentAPI.assignLead({
        leadId: assignData.leadId,
        agentId: assignData.agentId,
        priority: assignData.priority,
        notes: assignData.notes,
        assignedBy: 'Admin',
      })
      setAssignModalOpen(false)
      fetchAgents(pagination.page)
      if (onRecordMutated) onRecordMutated()
    } catch (err) {
      setFormError(err.message || 'Failed to assign lead')
    } finally {
      setFormSubmitting(false)
    }
  }

  const getStatusBadge = (status = '') => {
    if (status === 'Available') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Available
        </span>
      )
    }
    if (status === 'Busy') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Busy
        </span>
      )
    }
    if (status === 'On Leave') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          On Leave
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
        Inactive
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Sales Agents
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            On-ground sales representatives, territory allocation, and lead assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAssignModal(null)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-orange-500" />
            <span>Assign Lead</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Agent</span>
          </button>
        </div>
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
            onClick={() => fetchAgents(pagination.page)}
            className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Filter by Status:</span>
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

        <button
          type="button"
          onClick={() => fetchAgents(pagination.page)}
          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Refresh agents"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading sales agent team...</p>
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No sales agents registered"
            description={
              selectedStatus !== 'All'
                ? 'No agents matched your status filter. Try clearing the filter.'
                : 'No sales representatives have been registered yet. Click "Add Agent" above to add your first sales rep.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3">Agent Name</th>
                  <th scope="col" className="px-5 py-3">Contact</th>
                  <th scope="col" className="px-5 py-3">Territory</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-center">Active Leads</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {agents.map((agent) => (
                  <tr key={agent._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {agent.name ? agent.name.charAt(0) : 'A'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{agent.name}</span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {agent.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agent.phone}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agent.territory || 'Jaipur Central'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(agent.status)}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => handleViewAssignedLeads(agent)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                        title="Click to view assigned leads"
                      >
                        <Briefcase className="w-3 h-3" />
                        <span>{agent.activeLeadsCount ?? 0} leads</span>
                      </button>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(agent)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
                          title="Assign Lead to this Agent"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(agent)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Edit Agent Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingAgent(agent)
                            setFormError(null)
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Agent"
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
              Showing {agents.length} of {pagination.total} agents
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrev}
                onClick={() => fetchAgents(pagination.page - 1)}
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
                onClick={() => fetchAgents(pagination.page + 1)}
                className="px-2.5 py-1 border border-slate-200 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: View Assigned Leads for an Agent */}
      <Modal
        isOpen={Boolean(viewLeadsAgent)}
        onClose={() => setViewLeadsAgent(null)}
        title={`Assigned Leads: ${viewLeadsAgent?.name}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-orange-50/60 border border-orange-200/70 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">{viewLeadsAgent?.name}</p>
              <p className="text-slate-600">
                {viewLeadsAgent?.territory} • {viewLeadsAgent?.phone}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white border border-orange-200 font-bold text-orange-700">
              {assignedLeadsData?.totalAssignedLeads ?? viewLeadsAgent?.activeLeadsCount ?? 0} Active
            </span>
          </div>

          {!assignedLeadsData ? (
            <div className="p-8 text-center text-slate-500">
              <div className="inline-block w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p>Loading assigned leads...</p>
            </div>
          ) : assignedLeadsData.assignedLeads?.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200/70">
              <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No active leads assigned</p>
              <p className="text-slate-500 mt-1">
                Assign a qualified lead to this agent using the "Assign Lead" action.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {assignedLeadsData.assignedLeads.map((assignment) => {
                const lead = assignment.leadId
                const shopkeeper = lead?.shopkeeperId

                return (
                  <div key={assignment._id} className="py-2.5 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {shopkeeper?.name || 'Customer'} ({shopkeeper?.shopName || 'Store'})
                      </span>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{shopkeeper?.phoneNumber}</span>
                        <span>•</span>
                        <span>{shopkeeper?.address?.city || 'Jaipur'}</span>
                        <span>•</span>
                        <span className="font-medium text-orange-600">
                          {lead?.leadStatus || 'Warm'} Lead
                        </span>
                      </p>
                      {assignment.notes && (
                        <p className="text-[10px] text-slate-600 mt-1 italic bg-slate-50 p-1.5 rounded">
                          "{assignment.notes}"
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 block mb-1">
                        {assignment.priority || 'Standard'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {assignment.assignedAt
                          ? new Date(assignment.assignedAt).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setViewLeadsAgent(null)}
              className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Assign Lead to Agent */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Lead to Sales Representative"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Sales Lead *</label>
            <select
              required
              value={assignData.leadId}
              onChange={(e) => setAssignData({ ...assignData, leadId: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">-- Choose Lead to Assign --</option>
              {availableLeads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.shopkeeperId?.name || 'Lead'} ({l.shopkeeperId?.shopName}) - {l.leadStatus} [
                  {l.stage}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Sales Agent *
            </label>
            <select
              required
              value={assignData.agentId}
              onChange={(e) => setAssignData({ ...assignData, agentId: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">-- Choose Agent --</option>
              {agents.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.territory}) - {a.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assignment Priority</label>
            <select
              value={assignData.priority}
              onChange={(e) => setAssignData({ ...assignData, priority: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="High">High (Immediate Store Visit)</option>
              <option value="Standard">Standard (Follow-up within 48h)</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Handoff Instructions / Notes</label>
            <textarea
              rows={2}
              value={assignData.notes}
              onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
              placeholder="e.g. Merchant requested on-site Soundbox 4.0 demonstration."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              {formSubmitting ? 'Assigning...' : 'Assign Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create / Edit Agent */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAgent ? 'Edit Sales Agent' : 'Add Sales Agent'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Vikas Sharma"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. vikas.sharma@paytm.com"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +91 98112 34567"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Territory</label>
              <select
                value={formData.territory}
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {TERRITORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Availability Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {STATUSES.filter((s) => s !== 'All').map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
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
              {formSubmitting ? 'Saving...' : editingAgent ? 'Update Agent' : 'Create Agent'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation with relational protection handling */}
      <Modal
        isOpen={Boolean(deletingAgent)}
        onClose={() => setDeletingAgent(null)}
        title="Confirm Agent Deletion"
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
            Are you sure you want to delete sales agent{' '}
            <strong className="text-slate-900">{deletingAgent?.name}</strong>?
          </p>
          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
            Note: If this agent currently has active lead assignments, deletion will be blocked by
            database relational safeguards. Reassign any active leads before deleting.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingAgent(null)}
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
