import React from 'react'
import { X, Sparkles } from 'lucide-react'
import { NAVIGATION_ITEMS } from '../constants/navigation'

export default function Sidebar({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  backendStatus,
}) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        } lg:static lg:z-auto lg:shadow-none`}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-6 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-base shadow-xs">
                ₹
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  Paytm AI Sales
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">
                    AI
                  </span>
                </span>
                <span className="text-[11px] text-slate-600 font-medium">Sales Automation</span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Overview & Operations
            </div>
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id)
                    if (onClose) onClose()
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 font-semibold border border-orange-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-orange-600' : 'text-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom System Status */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200/80 text-xs">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                backendStatus?.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-700 truncate">
                {backendStatus?.status === 'ok' ? 'Backend API: Online' : 'Backend API: Offline'}
              </p>
              <p className="text-[10px] text-slate-600 truncate">
                {backendStatus?.database?.status === 'connected'
                  ? 'MongoDB: Connected'
                  : 'MongoDB: Setup Pending'}
              </p>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" aria-hidden="true" />
          </div>
        </div>
      </aside>
    </>
  )
}
