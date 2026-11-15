import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Store,
  Megaphone,
  Target,
  UserCheck,
  MessageSquare,
  Headset,
  BarChart3,
  Settings,
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'crm', label: 'Outbound CRM', icon: Building2 },
  { id: 'ai-training', label: 'AI Training Studio', icon: GraduationCap },
  { id: 'shopkeepers', label: 'Shopkeepers', icon: Store },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'agents', label: 'Sales Agents', icon: UserCheck },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'customer-care', label: 'Customer Requests', icon: Headset },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

