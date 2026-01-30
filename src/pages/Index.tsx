import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Zap, LayoutDashboard, ListTodo, FileText, TrendingUp, LogOut, Download, Users, FolderOpen, DollarSign, HelpCircle } from "lucide-react";
import { Dashboard } from "@/components/Dashboard";
import { ProcessTracker } from "@/components/ProcessTracker";
import { AuthForm } from "@/components/AuthForm";
import { NotificationCenter } from "@/components/NotificationCenter";
import { TeamAnalyticsDashboard } from "@/components/TeamAnalyticsDashboard";
import { DocumentManager } from "@/components/DocumentManager";
import { BusinessPlanEditor } from "@/components/BusinessPlanEditor";
import { MarketingPlanEditor } from "@/components/MarketingPlanEditor";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { ProjectWizard } from "@/components/ProjectWizard";
import { ProjectSelector } from "@/components/ProjectSelector";
import { FAQ } from "@/components/FAQ";
import { supabase } from "@/integrations/supabase/client";
import { useStepProgress } from "@/hooks/useStepProgress";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useExportPDF } from "@/hooks/useExportPDF";
import { useTeamAnalytics } from "@/hooks/useTeamAnalytics";
import { useProjects } from "@/hooks/useProjects";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

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

  // Projects management
  const { 
    projects, 
    currentProject, 
    loading: projectsLoading, 
    selectProject, 
    addProject,
    updateProject,
    deleteProject,
    hasProjects 
  } = useProjects(user?.id);

  // Current project ID
  const currentProjectId = currentProject?.id ?? null;

  // Step progress for current project
  const { stepProgress, loading: progressLoading } = useStepProgress({
    userId: user?.id,
    projectId: currentProjectId,
  });

  const { settings: notificationSettings } = useNotificationSettings(user?.id);
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications(
    user?.id,
    stepProgress,
    notificationSettings
  );
  const { exportToPDF } = useExportPDF();
  const { analytics, loading: analyticsLoading } = useTeamAnalytics(user?.id, stepProgress);

  // Show wizard when user has no projects (after loading completes)
  useEffect(() => {
    if (!projectsLoading && user && !hasProjects) {
      setShowWizard(true);
    }
  }, [projectsLoading, user, hasProjects]);

  const handleProjectCreated = async (projectId: string) => {
    setShowWizard(false);
    
    // Fetch the newly created project and add it
    const { data: newProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (newProject) {
      addProject(newProject);
    }
  };

  const handleOpenWizard = () => {
    setShowWizard(true);
  };

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
      {/* Project Wizard */}
      <ProjectWizard
        userId={user.id}
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Hero Header */}
      <header className="bg-gradient-hero border-b shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Metodi ResBuilder</h1>
                <p className="text-white/80 text-xs">Reseller Energia - Percorso Operativo</p>
              </div>
            </div>

            {/* Project Selector - Center */}
            <div className="flex-1 flex justify-center px-4">
              <ProjectSelector
                projects={projects}
                currentProject={currentProject}
                loading={projectsLoading}
                onSelectProject={selectProject}
                onNewProject={handleOpenWizard}
                onUpdateProject={updateProject}
                onDeleteProject={deleteProject}
              />
            </div>

            {/* Actions - Right */}
            <div className="flex items-center gap-2">
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
                <span className="hidden md:inline">Esporta</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Esci</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* No Project Warning */}
        {!currentProject && !projectsLoading && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium text-warning">Nessun progetto selezionato</p>
              <p className="text-sm text-muted-foreground">Crea o seleziona un progetto per iniziare a lavorare</p>
            </div>
            <Button onClick={handleOpenWizard} variant="outline" size="sm">
              Crea Progetto
            </Button>
          </div>
        )}

        {/* Current Project Badge */}
        {currentProject && (
          <div className="mb-6 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Progetto Attivo: <span className="text-primary">{currentProject.name}</span></p>
              {currentProject.description && (
                <p className="text-xs text-muted-foreground">{currentProject.description}</p>
              )}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
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
            <TabsTrigger value="financials" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Finanza</span>
            </TabsTrigger>
            <TabsTrigger value="business-plan" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Business Plan</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">FAQ</span>
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
            <ProcessTracker projectId={currentProjectId ?? undefined} />
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

          <TabsContent value="financials" className="space-y-6">
            {currentProjectId ? (
              <FinancialDashboard 
                projectId={currentProjectId} 
                projectName={currentProject?.name || "Progetto Corrente"}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Crea prima un progetto per accedere alla Dashboard Finanziaria</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="business-plan" className="space-y-6">
            <BusinessPlanEditor 
              userId={user.id} 
              projectId={currentProjectId} 
              stepProgress={stepProgress}
            />
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6">
            <MarketingPlanEditor 
              userId={user.id} 
              projectId={currentProjectId} 
              stepProgress={stepProgress}
            />
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">FAQ Reseller Energia</h2>
                <p className="text-muted-foreground">Domande frequenti sull'avvio e gestione di un reseller luce e gas</p>
              </div>
            </div>
            <FAQ />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
