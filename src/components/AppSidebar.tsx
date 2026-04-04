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
  Zap,
  Settings,
  LogOut,
  User,
  Briefcase,
  ContactRound,
  ClipboardCheck,
  Truck,
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userEmail?: string;
  userName?: string;
  onSignOut?: () => void;
}

const projectItems = [
  { id: "overview", title: "Scheda Progetto", icon: Building2 },
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
];

const operativeItems = [
  { id: "process", title: "Processo", icon: ListTodo },
  { id: "gantt", title: "Timeline", icon: BarChart3 },
  
  { id: "step-docs", title: "Documenti Step", icon: Link },
  { id: "documents", title: "Documenti", icon: FolderOpen },
  
];

const teamItems = [
  { id: "team", title: "Team", icon: Users },
  { id: "consultants", title: "Consulenti", icon: Briefcase },
];

const strategyItems = [
  { id: "tariffs", title: "Tariffe di Mercato", icon: Zap },
  { id: "hypotheses", title: "Ipotesi Operative", icon: Settings },
  { id: "wholesaler", title: "Grossista (Udd)", icon: Truck },
  { id: "customer-base", title: "Customer Base", icon: Users },
  { id: "director-report", title: "Esiti", icon: ClipboardCheck },
  { id: "financials", title: "Finanza", icon: DollarSign },
  { id: "business-plan", title: "Business Plan", icon: FileText },
  { id: "marketing", title: "Marketing", icon: TrendingUp },
];

const launchItems = [
  { id: "prelaunch", title: "Pre-Launch", icon: Rocket },
  { id: "contract-package", title: "Plico Contrattuale", icon: FileText },
];

const helpItems = [
  { id: "faq", title: "FAQ", icon: HelpCircle },
  { id: "profile", title: "Profilo", icon: User },
  { id: "settings", title: "Impostazioni", icon: Settings },
];

export function AppSidebar({ activeTab, onTabChange, userEmail, userName, onSignOut }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center gap-3 group cursor-pointer">
          <img src="/favicon.png" alt="Metodi Res Builder" className="h-10 w-10 rounded-xl shrink-0 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3" />
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-base text-sidebar-foreground tracking-tight">Metodi</span>
              <span className="text-xs font-medium text-amber-500">RES BUILDER</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {[
          { label: 'Progetto', items: projectItems },
          { label: 'Operativo', items: operativeItems },
          { label: 'Team', items: teamItems },
          { label: 'Strategia', items: strategyItems },
          { label: 'Lancio', items: launchItems },
        ].map((group, idx) => (
          <div key={group.label}>
            {idx > 0 && <SidebarSeparator />}
            <SidebarGroup>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
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
          </div>
        ))}

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

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip={userName || userEmail || "Utente"}
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
                      {getInitials(userName, userEmail)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName || "Utente"}</span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail || ""}</span>
                    </div>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isCollapsed ? "right" : "top"}
                align="end"
                sideOffset={4}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
                      {getInitials(userName, userEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName || "Utente"}</span>
                    <span className="truncate text-xs text-muted-foreground">{userEmail || ""}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => onTabChange("profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profilo
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => onTabChange("settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Impostazioni
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={onSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
