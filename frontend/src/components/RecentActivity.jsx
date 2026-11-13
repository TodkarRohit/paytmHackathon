import React from 'react'
import { Activity, Clock } from 'lucide-react'
import EmptyState from './EmptyState'

/**
 * RecentActivity component
 * Displays recent system events (new leads, AI responses, assignments)
 * or an empty state when no activity has occurred.
 */
export default function RecentActivity({ activities = [] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Recent Activity
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Audit log of AI responses, hot leads, and agent handoffs
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">Live Feed</span>
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No recent activity logged yet."
          description="System events such as automated AI chats, customer replies, hot lead alerts, and agent handoffs will stream here in real time."
          className="bg-slate-50/40"
        />
      ) : (
        <div className="divide-y divide-slate-100 p-2">
          {activities.map((act, idx) => (
            <div
              key={act.id || idx}
              className="p-3 hover:bg-slate-50/60 rounded-lg transition-colors flex items-start gap-3 text-xs"
            >
              <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-medium">
                  {act.title}
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  {act.description}
                </p>
              </div>
              <span className="text-[10px] text-slate-600 shrink-0">
                {act.timestamp}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

