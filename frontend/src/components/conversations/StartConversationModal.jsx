import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
} from 'lucide-react'
import Modal from '../Modal'

export default function StartConversationModal({
  isOpen,
  onClose,
  shopkeepers = [],
  conversations = [],
  onSelectMerchant,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter merchants based on search query
  const filteredShopkeepers = useMemo(() => {
    if (!searchQuery.trim()) return shopkeepers
    const q = searchQuery.toLowerCase().trim()

    return shopkeepers.filter((s) => {
      const name = (s.name || '').toLowerCase()
      const shopName = (s.shopName || '').toLowerCase()
      const phone = (s.phoneNumber || '').toLowerCase()
      const city = (s.address?.city || '').toLowerCase()
      const category = (s.category || '').toLowerCase()

      return (
        name.includes(q) ||
        shopName.includes(q) ||
        phone.includes(q) ||
        city.includes(q) ||
        category.includes(q)
      )
    })
  }, [shopkeepers, searchQuery])

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New Merchant Conversation"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Select an authorized merchant to launch or continue an AI sales dialogue. If an active conversation exists, it will resume seamlessly.
        </p>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by shop name, merchant name, phone, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002e6e] focus:border-[#002e6e] transition-all"
            autoFocus
          />
        </div>

        {/* Merchants List */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading merchant directory...
            </div>
          ) : filteredShopkeepers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {searchQuery
                ? `No merchants match "${searchQuery}".`
                : 'No accessible merchants found.'}
            </div>
          ) : (
            filteredShopkeepers.map((merchant) => {
              // Check if merchant already has a conversation
              const existingConv = conversations.find(
                (c) =>
                  (c.shopkeeperId?._id || c.shopkeeperId) === merchant._id
              )

              const shopName = merchant.shopName || 'Registered Merchant'
              const ownerName = merchant.name || 'Owner'
              const phone = merchant.phoneNumber || ''
              const city = merchant.address?.city || ''
              const lang = merchant.preferredLanguage || 'Hindi'
              const hasSoundbox = merchant.currentDevices?.includes('Paytm Soundbox')

              return (
                <button
                  key={merchant._id}
                  type="button"
                  onClick={() => onSelectMerchant(merchant, existingConv)}
                  className="w-full text-left p-3 hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#002e6e] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {shopName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-[#002e6e] truncate">
                          {shopName}
                        </p>
                        {hasSoundbox && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Soundbox
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {ownerName} • {phone} {city ? `• ${city}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {lang}
                    </span>
                    {existingConv ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#002e6e] bg-blue-100/70 group-hover:bg-[#002e6e] group-hover:text-white transition-colors">
                        Resume Chat
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        <span>Start Chat</span>
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] text-slate-500">
            Showing {filteredShopkeepers.length} authorized merchants
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
