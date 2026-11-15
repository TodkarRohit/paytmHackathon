import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Shopkeepers from './pages/Shopkeepers'
import Campaigns from './pages/Campaigns'
import Leads from './pages/Leads'
import Agents from './pages/Agents'
import Conversations from './pages/Conversations'
import CustomerCare from './pages/CustomerCare'
import EnterpriseCRM from './pages/EnterpriseCRM'
import AITrainingStudio from './pages/AITrainingStudio'
import PlaceholderView from './pages/PlaceholderView'
import TwilioWhatsAppModal from './components/TwilioWhatsAppModal'
import { NAVIGATION_ITEMS } from './constants/navigation'
import { healthAPI, dashboardAPI, leadAPI, campaignAPI, ensureAuthenticatedSession } from './services/api'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Real backend and database status
  const [backendHealth, setBackendHealth] = useState(null)

  // Real data state
  const [dashboardStats, setDashboardStats] = useState(null)
  const [recentLeads, setRecentLeads] = useState([])
  const [recentCampaigns, setRecentCampaigns] = useState([])
  const [activities, setActivities] = useState([])

  // Refresh dashboard and health data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Ensure session token is established in development
      await ensureAuthenticatedSession()

      const [healthRes, statsRes, leadsRes, campRes] = await Promise.allSettled([
        healthAPI.checkHealth(),
        dashboardAPI.getStats(),
        leadAPI.getAll({ limit: 5 }),
        campaignAPI.getAll({ limit: 5 }),
      ])

      if (healthRes.status === 'fulfilled') {
        setBackendHealth(healthRes.value)
      } else {
        setBackendHealth(null)
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.status === 'success') {
        setDashboardStats(statsRes.value.data)
      }

      let fetchedLeads = []
      if (leadsRes.status === 'fulfilled' && leadsRes.value?.status === 'success') {
        fetchedLeads = leadsRes.value.data || []
        setRecentLeads(fetchedLeads)
      }

      if (campRes.status === 'fulfilled' && campRes.value?.status === 'success') {
        setRecentCampaigns(campRes.value.data || [])
      }

      // Generate activity summary strictly from real recently created leads if any exist
      if (fetchedLeads.length > 0) {
        const liveActivities = fetchedLeads.slice(0, 5).map((l, idx) => ({
          id: l._id || idx,
          title: `New Lead: ${l.shopkeeperId?.name || l.customerName || 'Merchant'}`,
          description: `${(l.interestedProducts || ['Paytm Device']).join(', ')} • Temperature: ${
            l.leadStatus || 'Warm'
          } [${l.stage || 'Identified'}]`,
          timestamp: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'Recent',
        }))
        setActivities(liveActivities)
      } else {
        setActivities([])
      }
    } catch {
      // Backend offline or connection interrupted
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
    // Poll health/dashboard every 15 seconds
    const interval = setInterval(fetchDashboardData, 15000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  // Resolve current page title and metadata
  const currentItem =
    NAVIGATION_ITEMS.find((item) => item.id === activeTab) || NAVIGATION_ITEMS[0]

  const pageTitles = {
    dashboard: 'Dashboard Overview',
    crm: 'Merchant Directory & Live Outreach Pipeline',
    'ai-training': 'AI Training Studio',
    shopkeepers: 'Shopkeeper Directory',
    campaigns: 'Sales Campaigns',
    leads: 'Lead Management',
    agents: 'Sales Agents',
    conversations: 'AI Conversations',
    'customer-care': 'Customer Requests',
    analytics: 'Performance Analytics',
    settings: 'Platform Settings',
  }

  const pageDescriptions = {
    crm: 'Enterprise Merchant CRM Pipeline & Outbound Directory for B2B lead management and autonomous agent interactions.',
    'ai-training':
      'Train and calibrate the MerchantConnect AI sales engine with your custom brand identity, product offerings, objection battlecards, and sales tone.',
    shopkeepers:
      'Manage registered Paytm merchants, storefront details, soundbox deployment status, and contact information.',
    campaigns:
      'Create and monitor automated AI phone/WhatsApp outreach campaigns targeting merchant clusters.',
    leads:
      'Review qualified high-intent merchants, lead statuses (Hot/Warm/Cold), and manual sales agent assignments.',
    agents:
      'Manage on-ground Paytm sales representatives and distribute qualified leads across territories.',
    conversations:
      'Inspect transcripts of AI dialogues with shopkeepers, sentiment scores, and customer questions.',
    'customer-care':
      'Review shopkeeper incoming inquiries, product doubts, service requests, and escalated customer support tickets.',
    analytics:
      'Aggregated conversion metrics, response rates, and objection analysis across product offerings.',
    settings:
      'Configure AI sales tone, Gemini API keys, WhatsApp Webhooks, and MongoDB Atlas connections.',
  }

  // Render content according to active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            shopkeepersCount={dashboardStats?.overview?.totalShopkeepers ?? 0}
            leadsCount={dashboardStats?.overview?.totalLeads ?? 0}
            hotLeadsCount={dashboardStats?.overview?.hotLeads ?? 0}
            campaignsCount={dashboardStats?.overview?.totalCampaigns ?? 0}
            conversion={dashboardStats?.conversion || null}
            leads={recentLeads}
            campaigns={recentCampaigns}
            activities={activities}
            backendHealth={backendHealth}
          />
        )

      case 'crm':
        return <EnterpriseCRM onRecordMutated={fetchDashboardData} />

      case 'ai-training':
        return <AITrainingStudio onRecordMutated={fetchDashboardData} />

      case 'shopkeepers':
        return <Shopkeepers onRecordMutated={fetchDashboardData} />

      case 'campaigns':
        return <Campaigns onRecordMutated={fetchDashboardData} />

      case 'leads':
        return <Leads onRecordMutated={fetchDashboardData} />

      case 'agents':
        return <Agents onRecordMutated={fetchDashboardData} />

      case 'conversations':
        return <Conversations onRecordMutated={fetchDashboardData} />

      case 'customer-care':
        return <CustomerCare onRecordMutated={fetchDashboardData} />

      default:
        // Analytics, Settings remain as placeholders
        return (
          <PlaceholderView
            title={pageTitles[activeTab]}
            icon={currentItem.icon}
            description={pageDescriptions[activeTab]}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )
    }
  }

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-800 flex antialiased ${
        activeTab === 'conversations' ? 'h-screen overflow-hidden' : ''
      }`}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        backendStatus={backendHealth}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          activeTab === 'conversations' ? 'h-screen overflow-hidden' : 'min-h-screen'
        }`}
      >
        {/* Topbar */}
        <Topbar
          pageTitle={pageTitles[activeTab] || 'Dashboard'}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Dynamic Page Content */}
        <main
          className={`flex-1 min-h-0 ${
            activeTab === 'conversations'
              ? 'p-2 sm:p-2.5 lg:p-3 w-full max-w-none flex flex-col overflow-hidden'
              : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full'
          }`}
        >
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
