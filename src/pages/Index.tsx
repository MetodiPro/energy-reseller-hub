import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Zap, LayoutDashboard, ListTodo, FileText, TrendingUp, Lightbulb, LogOut, Download, Users, FolderOpen, Briefcase } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { ProcessTracker } from "@/components/ProcessTracker";
import { AuthForm } from "@/components/AuthForm";
import { NotificationCenter } from "@/components/NotificationCenter";
import { TeamAnalyticsDashboard } from "@/components/TeamAnalyticsDashboard";
import { DocumentManager } from "@/components/DocumentManager";
import { BusinessPlanEditor } from "@/components/BusinessPlanEditor";
import { supabase } from "@/integrations/supabase/client";
import { useStepProgress } from "@/hooks/useStepProgress";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useExportPDF } from "@/hooks/useExportPDF";
import { useTeamAnalytics } from "@/hooks/useTeamAnalytics";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { stepProgress } = useStepProgress(user?.id);
  const { settings: notificationSettings } = useNotificationSettings(user?.id);
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications(
    user?.id,
    stepProgress,
    notificationSettings
  );
  const { exportToPDF } = useExportPDF();
  const { analytics, loading: analyticsLoading, currentProjectId } = useTeamAnalytics(user?.id, stepProgress);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="bg-gradient-hero border-b shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Metodi ResBuilder</h1>
                <p className="text-white/80 text-sm">Reseller Energia Elettrica - Percorso Operativo 2025/2026</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onClearAll={clearAll}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportToPDF(stepProgress)}
                className="text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="process" className="gap-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Processo</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Documenti</span>
            </TabsTrigger>
            <TabsTrigger value="business-plan" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Business Plan</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Marketing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard stepProgress={stepProgress} />
          </TabsContent>

          <TabsContent value="process" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Tracker Processo Operativo</h2>
                <p className="text-muted-foreground">Segui step-by-step tutte le attività necessarie</p>
              </div>
            </div>
            <ProcessTracker />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Analytics Team</h2>
                <p className="text-muted-foreground">Monitora le performance e il progresso del team</p>
              </div>
            </div>
            <TeamAnalyticsDashboard analytics={analytics} loading={analyticsLoading} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <DocumentManager projectId={currentProjectId} />
          </TabsContent>

          <TabsContent value="business-plan" className="space-y-6">
            <BusinessPlanEditor 
              userId={user.id} 
              projectId={currentProjectId} 
              stepProgress={stepProgress}
            />
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6">
            <div className="text-center py-20">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Piano Marketing</h2>
              <p className="text-muted-foreground mb-6">
                Definisci strategie di acquisizione clienti, pricing e posizionamento competitivo
              </p>
              <Button className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Coming Soon
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
