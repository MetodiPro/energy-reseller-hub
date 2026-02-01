import { 
  Building2, 
  LayoutDashboard, 
  ListTodo, 
  Calendar, 
  Link, 
  Users, 
  FolderOpen, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  BarChart3, 
  Rocket, 
  HelpCircle,
  Zap
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: "overview", title: "Scheda", icon: Building2 },
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { id: "process", title: "Processo", icon: ListTodo },
  { id: "deadlines", title: "Scadenze", icon: Calendar },
  { id: "step-docs", title: "Doc/Step", icon: Link },
  { id: "team", title: "Team", icon: Users },
  { id: "documents", title: "Documenti", icon: FolderOpen },
  { id: "financials", title: "Finanza", icon: DollarSign },
  { id: "business-plan", title: "Business", icon: FileText },
  { id: "marketing", title: "Marketing", icon: TrendingUp },
  { id: "gantt", title: "Timeline", icon: BarChart3 },
  { id: "prelaunch", title: "Pre-Launch", icon: Rocket },
];

const helpItems = [
  { id: "faq", title: "FAQ", icon: HelpCircle },
];

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sm truncate">Power Reseller</span>
              <span className="text-xs text-muted-foreground truncate">Start Up</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigazione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Supporto</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
