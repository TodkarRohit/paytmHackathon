import React from 'react'
import { Megaphone, Users, MessageSquareText, ThumbsUp } from 'lucide-react'
import EmptyState from './EmptyState'

/**
 * CampaignOverview component
 * Displays marketing / automated AI sales campaigns or a clean empty state.
 */
export default function CampaignOverview({ campaigns = [] }) {
  const getStatusBadge = (status = '') => {
    const s = status.toLowerCase()
    if (s === 'active' || s === 'running') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          Active
        </span>
      )
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Completed
        </span>
      )
    }
    if (s === 'draft' || s === 'scheduled') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          {status}
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
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Campaign Overview
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Active and scheduled automated AI sales outreach
          </p>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {campaigns.length} campaigns
        </span>
      </div>

      {/* Content */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns available yet."
          description="Campaigns configured to contact shopkeepers via AI for Paytm Soundbox, QR codes, or EDC machines will appear here."
          className="bg-slate-50/40"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-5 py-3">Campaign Name</th>
                <th scope="col" className="px-5 py-3">Total Contacts</th>
                <th scope="col" className="px-5 py-3">Responses</th>
                <th scope="col" className="px-5 py-3">Interested Customers</th>
                <th scope="col" className="px-5 py-3">Campaign Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {campaigns.map((camp, idx) => {
                const totalContacts = camp.totalContacts ?? camp.metrics?.totalTargeted ?? 0
                const responses = camp.responses ?? camp.metrics?.responded ?? 0
                const interested = camp.interestedCustomers ?? camp.metrics?.converted ?? 0
                const status = camp.campaignStatus || camp.status || 'Draft'

                return (
                  <tr
                    key={camp._id || camp.id || idx}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-3.5 h-3.5 text-orange-500" />
                        <div>
                          <span className="block font-semibold">{camp.campaignName || '—'}</span>
                          {camp.productFocus && (
                            <span className="text-[10px] text-slate-500 block">
                              {camp.productFocus} • {camp.channel || 'All'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-600" />
                        <span>{totalContacts}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MessageSquareText className="w-3.5 h-3.5 text-slate-600" />
                        <span>{responses}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5 text-slate-600" />
                        <span>{interested}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getStatusBadge(status)}
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

