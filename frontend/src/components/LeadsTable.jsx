import React from 'react'
import { Target, User, Phone, MapPin, Store } from 'lucide-react'
import EmptyState from './EmptyState'

/**
 * LeadsTable component
 * Renders recent leads or an empty state when no leads are available.
 */
export default function LeadsTable({ leads = [] }) {
  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase()
    if (s === 'hot') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse" />
          Hot
        </span>
      )
    }
    if (s === 'warm') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          Warm
        </span>
      )
    }
    if (s === 'cold') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5" />
          Cold
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        {status || 'Unknown'}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Table Header / Title */}
      <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Recent Leads
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Identified merchant prospects from automated outreach
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {leads.length} records
          </span>
        </div>
      </div>

      {/* Table Content or Clean Empty State */}
      {leads.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No leads available yet."
          description="When shopkeeper conversations identify purchase intent for Paytm Soundbox, Card Machines, or Merchant Loans, qualified leads will populate here."
          className="bg-slate-50/40"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-5 py-3">Customer Name</th>
                <th scope="col" className="px-5 py-3">Shop Name</th>
                <th scope="col" className="px-5 py-3">Location</th>
                <th scope="col" className="px-5 py-3">Phone Number</th>
                <th scope="col" className="px-5 py-3">Lead Status</th>
                <th scope="col" className="px-5 py-3">Assigned Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {leads.map((lead, idx) => {
                const customerName = lead.shopkeeperId?.name || lead.customerName || '—'
                const shopName = lead.shopkeeperId?.shopName || lead.shopName || '—'
                const location = lead.shopkeeperId?.address?.city || lead.location || '—'
                const phoneNumber = lead.shopkeeperId?.phoneNumber || lead.phoneNumber || '—'
                const agentName =
                  lead.assignedAgent?.name ||
                  lead.activeAssignment?.agentId?.name ||
                  (typeof lead.assignedAgent === 'string' ? lead.assignedAgent : null) ||
                  'Unassigned'

                return (
                  <tr
                    key={lead._id || lead.id || idx}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold">
                          {customerName !== '—' ? customerName.charAt(0) : 'U'}
                        </div>
                        <span>{customerName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Store className="w-3.5 h-3.5 text-slate-600" />
                        <span>{shopName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-600" />
                        <span>{location}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>{phoneNumber}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(lead.leadStatus)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                        <span>{agentName}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

