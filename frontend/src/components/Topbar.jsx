import React, { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
} from 'lucide-react'

export default function Topbar({
  pageTitle = 'Dashboard',
  onToggleSidebar,
  onOpenTwilioModal,
}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const notificationRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight capitalize">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Middle: Clean Search Field */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search shopkeepers, leads, campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Twilio WhatsApp Quick Hub Button */}
        {onOpenTwilioModal && (
          <button
            type="button"
            onClick={onOpenTwilioModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            title="Twilio WhatsApp Integration Hub & Simulator"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">WhatsApp:</span> Twilio
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-orange-500 absolute top-2 right-2 ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-900">Notifications</span>
                <span className="text-[11px] text-slate-600 font-medium">0 Unread</span>
              </div>
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">No new notifications</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Real-time lead assignments & AI alerts will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

