import React from 'react'

/**
 * Reusable EmptyState component
 * Displays a clean, neutral placeholder when data is not yet available.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  compact = false,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl transition-colors ${
        compact ? 'py-8 px-4' : 'py-12 px-6'
      } ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-3 shadow-xs">
          <Icon className="w-6 h-6 stroke-[1.75]" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-800 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}

