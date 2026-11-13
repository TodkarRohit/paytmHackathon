import React from 'react'
import { ArrowLeft, Clock } from 'lucide-react'

/**
 * PlaceholderView component
 * Transparently indicates that a navigation module is slated for subsequent tasks,
 * avoiding false functionality while keeping the navigation fully interactive.
 */
export default function PlaceholderView({
  title,
  icon: Icon,
  description,
  moduleStage = 'Planned for Future Task',
  onBackToDashboard,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs my-8">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Icon className="w-7 h-7 stroke-[1.75]" />
        </div>
      )}

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 mb-3">
        <Clock className="w-3 h-3 text-orange-500" />
        <span>{moduleStage}</span>
      </div>

      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-2">
        {title} Module
      </h2>

      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
        {description ||
          'This section is scheduled for development in subsequent tasks once database models and backend services are connected.'}
      </p>

      {onBackToDashboard && (
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      )}
    </div>
  )
}

