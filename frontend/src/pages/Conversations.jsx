import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bot,
  Plus,
} from 'lucide-react'
import { conversationAPI, shopkeeperAPI, ensureAuthenticatedSession } from '../services/api'
import ConversationList from '../components/conversations/ConversationList'
import ChatHeader from '../components/conversations/ChatHeader'
import MessageList from '../components/conversations/MessageList'
import MessageComposer from '../components/conversations/MessageComposer'
import MerchantInfoPanel from '../components/conversations/MerchantInfoPanel'
import StartConversationModal from '../components/conversations/StartConversationModal'

const STORAGE_KEY_CONV_ID = 'paytm_selected_conversation_id'
const STORAGE_KEY_SHOPKEEPER_ID = 'paytm_selected_shopkeeper_id'

export default function Conversations({ onRecordMutated }) {
  // Master lists
  const [conversations, setConversations] = useState([])
  const [shopkeepers, setShopkeepers] = useState([])
  const [loadingList, setLoadingList] = useState(true)

  // Selection states
  const [selectedConversationId, setSelectedConversationId] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_CONV_ID) || null
    } catch {
      return null
    }
  })
  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_SHOPKEEPER_ID) || null
    } catch {
      return null
    }
  })

  // Active chat state
  const [activeConversation, setActiveConversation] = useState(null)
  const [activeMerchant, setActiveMerchant] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Composer & error states
  const [inputText, setInputText] = useState('')
  const [chatError, setChatError] = useState(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // Layout UI states
  const [isPanelCOpen, setIsPanelCOpen] = useState(true) // Collapsible right panel
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'chat' | 'info'

  // Ref to track in-flight requests and prevent race conditions
  const activeChatRequestRef = useRef(0)

  // Rate-limiting cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  // Fetch initial conversations and authorized merchants
  const fetchConversationsAndShopkeepers = useCallback(async () => {
    try {
      setLoadingList(true)
      await ensureAuthenticatedSession()

      const [convRes, shopRes] = await Promise.allSettled([
        conversationAPI.getAll({ limit: 50 }),
        shopkeeperAPI.getAll({ limit: 50 }),
      ])

      let loadedConversations = []
      if (convRes.status === 'fulfilled' && convRes.value?.status === 'success') {
        loadedConversations = convRes.value.data || []
        setConversations(loadedConversations)
      }

      let loadedShopkeepers = []
      if (shopRes.status === 'fulfilled' && shopRes.value?.status === 'success') {
        loadedShopkeepers = shopRes.value.data || []
        setShopkeepers(loadedShopkeepers)
      }

      // Check if saved conversation or merchant exists
      const savedConvId = sessionStorage.getItem(STORAGE_KEY_CONV_ID)
      const savedShopkeeperId = sessionStorage.getItem(STORAGE_KEY_SHOPKEEPER_ID)

      if (savedConvId && loadedConversations.some((c) => c._id === savedConvId)) {
        setSelectedConversationId(savedConvId)
      } else if (savedShopkeeperId && loadedShopkeepers.some((s) => s._id === savedShopkeeperId)) {
        setSelectedShopkeeperId(savedShopkeeperId)
      } else if (loadedConversations.length > 0) {
        setSelectedConversationId(loadedConversations[0]._id)
      }
    } catch (err) {
      console.warn('Failed to load conversation list:', err.message)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    fetchConversationsAndShopkeepers()
  }, [fetchConversationsAndShopkeepers])

  // Load single conversation transcript with populated relations
  const loadConversationTranscript = useCallback(async (convId) => {
    if (!convId) return
    const requestId = ++activeChatRequestRef.current

    try {
      setLoadingChat(true)
      setChatError(null)

      const res = await conversationAPI.getById(convId)

      // Guard against race conditions if user switched conversations quickly
      if (requestId !== activeChatRequestRef.current) return

      if (res?.status === 'success' && res.data) {
        const conv = res.data
        setActiveConversation(conv)
        setMessages(conv.messages || [])

        if (conv.shopkeeperId && typeof conv.shopkeeperId === 'object') {
          setActiveMerchant(conv.shopkeeperId)
          setSelectedShopkeeperId(conv.shopkeeperId._id)
          try {
            sessionStorage.setItem(STORAGE_KEY_SHOPKEEPER_ID, conv.shopkeeperId._id)
          } catch {}
        }
      }
    } catch (err) {
      if (requestId !== activeChatRequestRef.current) return
      setChatError({
        status: err.status || 500,
        message: err.message || 'Failed to retrieve conversation history from server',
      })
    } finally {
      if (requestId === activeChatRequestRef.current) {
        setLoadingChat(false)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedConversationId) {
      loadConversationTranscript(selectedConversationId)
      try {
        sessionStorage.setItem(STORAGE_KEY_CONV_ID, selectedConversationId)
      } catch {}
    } else if (selectedShopkeeperId) {
      // New dialogue with selected merchant before first message
      const found = shopkeepers.find((s) => s._id === selectedShopkeeperId)
      if (found) {
        setActiveMerchant(found)
        setActiveConversation(null)
        setMessages([])
        try {
          sessionStorage.setItem(STORAGE_KEY_SHOPKEEPER_ID, selectedShopkeeperId)
          sessionStorage.removeItem(STORAGE_KEY_CONV_ID)
        } catch {}
      }
    }
  }, [selectedConversationId, selectedShopkeeperId, shopkeepers, loadConversationTranscript])

  // Select an existing conversation card
  const handleSelectConversation = (conv) => {
    setSelectedConversationId(conv._id)
    const mId = conv.shopkeeperId?._id || conv.shopkeeperId
    if (mId) setSelectedShopkeeperId(mId)
    setChatError(null)
    setMobileView('chat')
  }

  // Handle selecting a merchant from Start Conversation modal
  const handleSelectMerchantFromModal = (merchant, existingConv) => {
    setIsNewChatModalOpen(false)

    if (existingConv) {
      handleSelectConversation(existingConv)
    } else {
      setSelectedConversationId(null)
      setSelectedShopkeeperId(merchant._id)
      setActiveMerchant(merchant)
      setActiveConversation(null)
      setMessages([])
      setChatError(null)
      setMobileView('chat')
      try {
        sessionStorage.setItem(STORAGE_KEY_SHOPKEEPER_ID, merchant._id)
        sessionStorage.removeItem(STORAGE_KEY_CONV_ID)
      } catch {}
    }
  }

  // Send message to Gemini AI Sales Teammate
  const handleSendMessage = async () => {
    const trimmedMessage = inputText.trim()
    if (!trimmedMessage || isSending || cooldownSeconds > 0) return

    // 1,000 characters validation
    if (trimmedMessage.length > 1000) {
      setChatError({
        status: 400,
        message: 'Message exceeds maximum length of 1,000 characters. Please shorten your message.',
      })
      return
    }

    const effectiveShopkeeperId =
      selectedShopkeeperId ||
      activeMerchant?._id ||
      (activeConversation?.shopkeeperId?._id || activeConversation?.shopkeeperId)

    if (!effectiveShopkeeperId) {
      setChatError({
        status: 400,
        message: 'Please select a registered merchant before sending a message.',
      })
      return
    }

    // Keep unsent message preserved in case of failure
    const messageToSend = trimmedMessage
    setInputText('')
    setChatError(null)
    setIsSending(true)

    // Optimistically show merchant's message
    const optimisticMessage = {
      sender: 'Shopkeeper',
      text: messageToSend,
      timestamp: new Date().toISOString(),
      intentDetected: null,
      sentiment: 'Neutral',
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const payload = {
        shopkeeperId: effectiveShopkeeperId,
        message: messageToSend,
        channel: 'Web Chat',
        ...(selectedConversationId ? { conversationId: selectedConversationId } : {}),
      }

      const res = await conversationAPI.chat(payload)

      if (res?.status === 'success' && res.data) {
        const { conversationId, reply, intentDetected, sentiment } = res.data

        // If newly created conversation, update selection
        if (conversationId && conversationId !== selectedConversationId) {
          setSelectedConversationId(conversationId)
          try {
            sessionStorage.setItem(STORAGE_KEY_CONV_ID, conversationId)
          } catch {}
        }

        // Append returned AI response
        const aiMessage = {
          sender: 'AI',
          text: reply,
          timestamp: new Date().toISOString(),
          intentDetected,
          sentiment: sentiment || 'Positive',
        }

        setMessages((prev) => [...prev, aiMessage])

        // Update conversation in sidebar list
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c._id === conversationId)
          const updatedSummary = `Latest topic: ${intentDetected || 'Inquiry'} (${sentiment || 'Positive'} sentiment)`

          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = {
              ...updated[idx],
              updatedAt: new Date().toISOString(),
              aiSummary: updatedSummary,
              messages: [...(updated[idx].messages || []), optimisticMessage, aiMessage],
            }
            return updated
          } else {
            return [
              {
                _id: conversationId,
                shopkeeperId: activeMerchant || { _id: effectiveShopkeeperId },
                channel: 'Web Chat',
                status: 'Active',
                aiSummary: updatedSummary,
                updatedAt: new Date().toISOString(),
                messages: [optimisticMessage, aiMessage],
              },
              ...prev,
            ]
          }
        })

        // Notify parent dashboard
        if (onRecordMutated) {
          onRecordMutated()
        }
      } else {
        throw new Error(res?.message || 'Unexpected response received from AI Sales Agent.')
      }
    } catch (err) {
      console.error('Chat error:', err)
      // Restore unsent message into composer so user does not lose their text
      setInputText(messageToSend)

      const status = err.status || (err.message?.includes('Network error') ? 0 : 500)
      let displayMessage = err.message || 'Error communicating with AI Sales Teammate.'

      if (status === 429) {
        displayMessage = 'Rate limit reached (10 requests/minute). Please wait 15 seconds before sending another message.'
        setCooldownSeconds(15)
      } else if (status === 401 || status === 403) {
        displayMessage = 'Access denied: You do not have permission to converse with this merchant or your session has expired.'
      } else if (status === 0 || err.message?.includes('Network error')) {
        displayMessage = 'Network error: Unable to connect to backend server. Please verify backend is running.'
      }

      setChatError({
        status,
        message: displayMessage,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Resolved merchant for right panel
  const resolvedMerchant =
    activeMerchant ||
    (activeConversation?.shopkeeperId && typeof activeConversation.shopkeeperId === 'object'
      ? activeConversation.shopkeeperId
      : null)

  const handleTogglePanelC = () => {
    // If on mobile/small screen, toggle mobileView
    if (window.innerWidth < 768) {
      setMobileView((prev) => (prev === 'info' ? 'chat' : 'info'))
    } else {
      setIsPanelCOpen((prev) => !prev)
    }
  }

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-white border border-slate-200/90 rounded-xl shadow-xs flex overflow-hidden relative">
      {/* =========================================================================
          PANEL A: CONVERSATION LIST (LEFT: ~285px)
          On mobile (<768px): shown only when mobileView === 'list'
          On tablet/desktop (>=768px): always docked on left
          ========================================================================= */}
      <div
        className={`w-full md:w-[285px] shrink-0 h-full ${
          mobileView === 'list' ? 'block' : 'hidden md:block'
        }`}
      >
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onStartNewConversation={() => setIsNewChatModalOpen(true)}
          onRefresh={fetchConversationsAndShopkeepers}
          loading={loadingList}
        />
      </div>

      {/* =========================================================================
          PANEL B: CHAT WORKSPACE (CENTER: FLEXIBLE WIDTH)
          On mobile (<768px): shown only when mobileView === 'chat'
          On tablet/desktop (>=768px): flex-1 min-w-0 takes all available remaining space
          ========================================================================= */}
      <div
        className={`flex-1 min-w-0 flex flex-col h-full bg-white relative ${
          mobileView === 'chat'
            ? 'flex'
            : mobileView === 'info'
            ? 'hidden md:flex'
            : 'hidden md:flex'
        }`}
      >
        {activeConversation || activeMerchant ? (
          <>
            {/* Chat Top Header */}
            <ChatHeader
              merchant={resolvedMerchant}
              conversation={activeConversation}
              isPanelCOpen={isPanelCOpen}
              onTogglePanelC={handleTogglePanelC}
              onRefreshChat={() => {
                if (selectedConversationId) {
                  loadConversationTranscript(selectedConversationId)
                }
              }}
              onBackToList={() => setMobileView('list')}
              loading={loadingChat}
            />

            {/* Chat Transcript Area */}
            <MessageList
              messages={messages}
              merchantName={resolvedMerchant?.name || 'Merchant'}
              agentName={activeConversation?.assignment?.agentId?.name || 'Sales Agent'}
              loading={loadingChat}
              isSending={isSending}
            />

            {/* Message Composer Bar */}
            <MessageComposer
              inputText={inputText}
              setInputText={setInputText}
              onSendMessage={handleSendMessage}
              isSending={isSending}
              error={chatError}
              onDismissError={() => setChatError(null)}
              cooldownSeconds={cooldownSeconds}
              disabled={loadingChat}
            />
          </>
        ) : (
          /* Welcome State (No conversation selected) */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-[#002e6e] text-white flex items-center justify-center mb-3 shadow-xs">
              <Bot className="w-6 h-6 text-sky-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Paytm AI Sales Teammate
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
              Select a merchant conversation from the left to start chatting, or start a new dialogue.
            </p>
            <button
              type="button"
              onClick={() => setIsNewChatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#002e6e] hover:bg-blue-900 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start New Conversation</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            PANEL C (TABLET OVERLAY MODE: 768px <= width < 1280px)
            When isPanelCOpen on tablet, renders as a slide-over drawer so it doesn't squeeze chat
            ========================================================================= */}
        {isPanelCOpen && (activeConversation || activeMerchant) && (
          <div className="hidden md:block xl:hidden absolute inset-y-0 right-0 z-30 shadow-xl transition-all">
            <MerchantInfoPanel
              isOpen={true}
              onClose={() => setIsPanelCOpen(false)}
              merchant={resolvedMerchant}
              conversation={activeConversation}
            />
          </div>
        )}
      </div>

      {/* =========================================================================
          PANEL C (DESKTOP IN-FLOW DOCKED: >= 1280px)
          On wide desktop screens (>=1280px), docks side-by-side with Panel A & B
          ========================================================================= */}
      {isPanelCOpen && (activeConversation || activeMerchant) && (
        <div className="hidden xl:block h-full shrink-0">
          <MerchantInfoPanel
            isOpen={true}
            onClose={() => setIsPanelCOpen(false)}
            merchant={resolvedMerchant}
            conversation={activeConversation}
          />
        </div>
      )}

      {/* =========================================================================
          PANEL C (MOBILE FULL-SCREEN: < 768px when mobileView === 'info')
          ========================================================================= */}
      {mobileView === 'info' && (activeConversation || activeMerchant) && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          <MerchantInfoPanel
            isOpen={true}
            onClose={() => setMobileView('chat')}
            merchant={resolvedMerchant}
            conversation={activeConversation}
          />
        </div>
      )}

      {/* Start New Conversation Modal */}
      <StartConversationModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        shopkeepers={shopkeepers}
        conversations={conversations}
        onSelectMerchant={handleSelectMerchantFromModal}
        loading={loadingList}
      />
    </div>
  )
}
