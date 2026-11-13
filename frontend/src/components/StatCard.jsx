import React from 'react'

/**
 * StatCard component
 * Displays a single metric overview card with proper empty state handling
 * and subtle hover animations.
 */
export default function StatCard({
  title,
  value,
  icon: Icon,
  badgeText = 'No data',
  helperText,
  iconBgColor = 'bg-orange-50',
  iconColor = 'text-orange-600',
  borderColor = 'border-orange-100',
}) {
  const isAvailable = value !== undefined && value !== null && value !== ''
  const displayValue = isAvailable ? value : '—'

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={`w-10 h-10 rounded-lg ${iconBgColor} ${borderColor} border flex items-center justify-center ${iconColor} shrink-0 transition-transform group-hover:scale-105`}
        >
          {Icon && <Icon className="w-5 h-5 stroke-[1.75]" aria-hidden="true" />}
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold tracking-tight text-slate-800">
            {displayValue}
          </span>
          {badgeText && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/70">
              {badgeText}
            </span>
          )}
        </div>
        {helperText && (
          <p className="text-xs text-slate-500 line-clamp-1">
            {helperText}
          </p>
        )}
      </div>
    </div>
  )
}

