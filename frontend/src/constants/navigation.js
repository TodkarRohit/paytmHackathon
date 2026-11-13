import {
  LayoutDashboard,
  Store,
  Megaphone,
  Target,
  UserCheck,
  MessageSquare,
  BarChart3,
  Settings,
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'shopkeepers', label: 'Shopkeepers', icon: Store },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'agents', label: 'Sales Agents', icon: UserCheck },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

