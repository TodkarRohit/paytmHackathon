import React from 'react'
import { Store, Target, Flame, Megaphone, TrendingUp } from 'lucide-react'
import StatCard from '../components/StatCard'
import LeadsTable from '../components/LeadsTable'
import CampaignOverview from '../components/CampaignOverview'
import RecentActivity from '../components/RecentActivity'

/**
 * Dashboard page
 * Displays overview metric cards, pipeline progression, recent leads, campaign status, and activity.
 */
export default function Dashboard({
  shopkeepersCount = 0,
  leadsCount = 0,
  hotLeadsCount = 0,
  campaignsCount = 0,
  conversion = null,
  leads = [],
  campaigns = [],
  activities = [],
  backendHealth = null,
}) {
  const isDbConnected = backendHealth?.database?.status === 'connected'

  return (
    <div className="space-y-6">
      {/* Top Banner Notice: Dynamic backend & DB connection status */}
      <div
        className={`border rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
          isDbConnected
            ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
            : 'bg-orange-50/70 border-orange-200/80 text-orange-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isDbConnected ? 'bg-emerald-500' : 'bg-orange-500'
            }`}
          />
          <p className="font-medium">
            <span
              className={`font-bold ${
                isDbConnected ? 'text-emerald-900' : 'text-orange-900'
              }`}
            >
              {isDbConnected ? 'System Live:' : 'System Ready:'}
            </span>{' '}
            {isDbConnected
              ? 'Connected to live MongoDB Atlas. Real-time merchant leads, sales assignments, and campaigns operational.'
              : 'Admin Dashboard initialized with live-ready empty states. Real data will stream here once MongoDB Atlas is connected.'}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold bg-white border shrink-0 ${
            isDbConnected
              ? 'border-emerald-200 text-emerald-700'
              : 'border-orange-200 text-orange-700'
          }`}
        >
          {isDbConnected ? 'MongoDB Atlas Connected' : 'MongoDB Setup Pending'}
        </span>
      </div>

      {/* 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Shopkeepers"
          value={shopkeepersCount}
          icon={Store}
          badgeText={shopkeepersCount > 0 ? 'Registered' : 'No records'}
          helperText={
            shopkeepersCount > 0
              ? `${shopkeepersCount} merchants in directory`
              : 'No shopkeepers registered yet'
          }
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
          borderColor="border-orange-200/80"
        />

        <StatCard
          title="Total Leads"
          value={leadsCount}
          icon={Target}
          badgeText={leadsCount > 0 ? 'In Pipeline' : 'Pipeline Empty'}
          helperText={
            leadsCount > 0
              ? `${leadsCount} merchant prospects recorded`
              : 'No merchant leads recorded yet'
          }
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          borderColor="border-blue-200/80"
        />

        <StatCard
          title="Hot Leads"
          value={hotLeadsCount}
          icon={Flame}
          badgeText={hotLeadsCount > 0 ? 'Urgent Intent' : 'High Intent'}
          helperText={
            hotLeadsCount > 0
              ? `${hotLeadsCount} urgent follow-ups required`
              : '0 urgent follow-ups required'
          }
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          borderColor="border-rose-200/80"
        />

        <StatCard
          title="Active Campaigns"
          value={campaignsCount}
          icon={Megaphone}
          badgeText={campaignsCount > 0 ? 'Running' : 'No Campaigns'}
          helperText={
            campaignsCount > 0
              ? `${campaignsCount} automated outreach running`
              : '0 automated outreach running'
          }
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          borderColor="border-emerald-200/80"
        />
      </div>

      {/* Pipeline & Conversion Overview (When data exists) */}
      {conversion && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sales Pipeline & Conversion Rate
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Funnel progression from AI Outreach to Won Deals
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold w-fit">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Conversion Rate: {conversion.conversionRate || 0}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Identified</span>
              <span className="text-base font-bold text-slate-800">
                {conversion.pipeline?.identified || 0}
              </span>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Agent Assigned</span>
              <span className="text-base font-bold text-slate-800">
                {conversion.pipeline?.agentAssigned || 0}
              </span>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Demo Scheduled</span>
              <span className="text-base font-bold text-slate-800">
                {conversion.pipeline?.demoScheduled || 0}
              </span>
            </div>
            <div className="bg-emerald-50/60 rounded-lg p-2.5 border border-emerald-100">
              <span className="text-[11px] text-emerald-700 font-medium block">Deals Won</span>
              <span className="text-base font-bold text-emerald-800">
                {conversion.pipeline?.won || 0}
              </span>
            </div>
            <div className="bg-rose-50/60 rounded-lg p-2.5 border border-rose-100">
              <span className="text-[11px] text-rose-700 font-medium block">Lost</span>
              <span className="text-base font-bold text-rose-800">
                {conversion.pipeline?.lost || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Leads Table Section */}
      <section aria-label="Recent Leads Section">
        <LeadsTable leads={leads} />
      </section>

      {/* Campaign Overview & Recent Activity Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <section aria-label="Campaign Overview Section">
            <CampaignOverview campaigns={campaigns} />
          </section>
        </div>
        <div className="lg:col-span-1">
          <section aria-label="Recent Activity Section">
            <RecentActivity activities={activities} />
          </section>
        </div>
      </div>
    </div>
  )
}
