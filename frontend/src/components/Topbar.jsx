import React, { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

export default function Topbar({
  pageTitle = 'Dashboard',
  onToggleSidebar,
}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const notificationRef = useRef(null)
  const profileRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false)
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false)
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

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 mx-0.5" />

        {/* Admin Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer"
            aria-label="Admin Profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-xs shrink-0">
              AD
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                Sales Admin
              </span>
              <span className="text-[10px] text-slate-600 font-medium">
                Admin Console
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900">Sales Admin</p>
                <p className="text-[11px] text-slate-600">admin@paytm-sales.local</p>
              </div>
              <div className="py-1">
                <div className="px-3 py-1.5 text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                  <span>Role: Operations Admin</span>
                </div>
                <div className="px-3 py-1.5 text-slate-600 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>Status: Active Session</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

