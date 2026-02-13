import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, Download } from "lucide-react";
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
import { ProjectStartupDialog } from "@/components/ProjectStartupDialog";
import { ProjectOverview } from "@/components/ProjectOverview";
import { RegulatoryCalendar } from "@/components/RegulatoryCalendar";
import { StepDocuments } from "@/components/StepDocuments";
import { ProjectTeamManager } from "@/components/ProjectTeamManager";
import { GanttTimeline } from "@/components/GanttTimeline";
import { PreLaunchChecklist } from "@/components/PreLaunchChecklist";
import { ConsultantsManager } from "@/components/ConsultantsManager";
import { FAQ } from "@/components/FAQ";
import { SettingsPage } from "@/components/SettingsPage";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useStepProgress } from "@/hooks/useStepProgress";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useExportPDF } from "@/hooks/useExportPDF";
import { useExportProjectReportPDF } from "@/hooks/useExportProjectReportPDF";
import { useTeamAnalytics } from "@/hooks/useTeamAnalytics";
import { useProjects } from "@/hooks/useProjects";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { useStepCosts } from "@/hooks/useStepCosts";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";
import { DollarSign } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showStartupDialog, setShowStartupDialog] = useState(false);
  const [regulatoryDeadlines, setRegulatoryDeadlines] = useState<any[]>([]);

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
    updateProjectStartDate,
    updateProjectEndDate,
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
  const { exportProjectReportPDF } = useExportProjectReportPDF();
  const { analytics, loading: analyticsLoading } = useTeamAnalytics(user?.id, stepProgress);
  
  // Project financials for report
  const { costs, revenues, summary: financialSummary } = useProjectFinancials(currentProjectId);
  
  // Step costs for dashboard
  const { getCostAmount } = useStepCosts(currentProjectId);

  // Deadline notifications - filtered by commodity type
  useDeadlineNotifications(regulatoryDeadlines, !!currentProjectId, (currentProject as any)?.commodity_type);

  // Fetch regulatory deadlines for notifications
  useEffect(() => {
    const fetchDeadlines = async () => {
      if (!currentProjectId) {
        setRegulatoryDeadlines([]);
        return;
      }

      const { data } = await supabase
        .from('regulatory_deadlines')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('due_date', { ascending: true });

      setRegulatoryDeadlines(data || []);
    };

    fetchDeadlines();
  }, [currentProjectId]);

  // Show wizard when user has no projects, or startup dialog if they have projects but none selected
  useEffect(() => {
    // Wait until projects are fully loaded before making any dialog decisions
    if (projectsLoading || !user) {
      return;
    }

    // Use projects.length directly for more reliable check
    const userHasProjects = projects.length > 0;

    if (!userHasProjects) {
      // No projects exist - show wizard to create first one
      setShowWizard(true);
      setShowStartupDialog(false);
    } else if (!currentProject) {
      // Has projects but none selected - show startup dialog to select one
      setShowStartupDialog(true);
      setShowWizard(false);
    } else {
      // Has projects and one is selected - hide all dialogs
      setShowWizard(false);
      setShowStartupDialog(false);
    }
  }, [projectsLoading, user, projects.length, currentProject]);

  const handleProjectCreated = async (projectId: string) => {
    setShowWizard(false);
    setShowStartupDialog(false);
    
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
    setShowStartupDialog(false);
    setShowWizard(true);
  };

  const handleSelectProjectFromStartup = (project: typeof currentProject) => {
    if (project) {
      selectProject(project);
      setShowStartupDialog(false);
    }
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

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <ProjectOverview 
            project={currentProject as any} 
            onProjectUpdate={(p) => {
              selectProject(p as any);
            }}
          />
        );
      case "dashboard":
        return (
          <Dashboard 
            stepProgress={stepProgress}
            commodityType={(currentProject as any)?.commodity_type}
            projectStartDate={(currentProject as any)?.planned_start_date}
            projectEndDate={(currentProject as any)?.go_live_date}
            getCostAmount={getCostAmount}
            projectId={currentProjectId}
          />
        );
      case "process":
        return (
          <ProcessTracker 
            projectId={currentProjectId ?? undefined}
            commodityType={(currentProject as any)?.commodity_type}
            projectName={(currentProject as any)?.name}
            projectStartDate={(currentProject as any)?.planned_start_date}
            projectEndDate={(currentProject as any)?.go_live_date}
            onUpdateProjectStartDate={(date) => {
              if (currentProjectId) {
                updateProjectStartDate(currentProjectId, date);
              }
            }}
            onUpdateProjectEndDate={(date) => {
              if (currentProjectId) {
                updateProjectEndDate(currentProjectId, date);
              }
            }}
          />
        );
      case "deadlines":
        return (
          <RegulatoryCalendar 
            projectId={currentProjectId}
            eveLicenseDate={(currentProject as any)?.eve_license_date}
            evgLicenseDate={(currentProject as any)?.evg_license_date}
            commodityType={(currentProject as any)?.commodity_type}
          />
        );
      case "step-docs":
        return <StepDocuments projectId={currentProjectId} />;
      case "team":
        return <ProjectTeamManager projectId={currentProjectId} currentUserId={user?.id} />;
      case "documents":
        return <DocumentManager projectId={currentProjectId} />;
      case "consultants":
        return <ConsultantsManager projectId={currentProjectId} />;
      case "financials":
        return currentProjectId ? (
          <FinancialDashboard 
            projectId={currentProjectId} 
            projectName={currentProject?.name || "Progetto Corrente"}
            commodityType={currentProject?.commodity_type}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Crea prima un progetto per accedere alla Dashboard Finanziaria</p>
          </div>
        );
      case "business-plan":
        return (
          <BusinessPlanEditor 
            userId={user.id} 
            projectId={currentProjectId} 
            stepProgress={stepProgress}
          />
        );
      case "marketing":
        return (
          <MarketingPlanEditor 
            userId={user.id} 
            projectId={currentProjectId} 
            stepProgress={stepProgress}
          />
        );
      case "gantt":
        return (
          <GanttTimeline 
            stepProgress={stepProgress}
            projectStartDate={(currentProject as any)?.created_at}
            goLiveDate={(currentProject as any)?.go_live_date}
          />
        );
      case "prelaunch":
        return (
          <PreLaunchChecklist 
            stepProgress={stepProgress}
            project={currentProject as any}
            hasDocuments={false}
            hasCosts={costs.length > 0}
            hasTeamMembers={true}
          />
        );
      case "faq":
        return <FAQ />;
      case "settings":
        return (
          <SettingsPage 
            userId={user?.id}
            userEmail={user?.email}
            userName={user?.user_metadata?.full_name}
          />
        );
      default:
        return (
          <ProjectOverview 
            project={currentProject as any} 
            onProjectUpdate={(p) => {
              selectProject(p as any);
            }}
          />
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Project Startup Dialog - for selecting existing projects */}
        <ProjectStartupDialog
          open={showStartupDialog}
          projects={projects}
          loading={projectsLoading}
          onSelectProject={handleSelectProjectFromStartup}
          onCreateNew={handleOpenWizard}
        />

        {/* Project Wizard - for creating new projects */}
        <ProjectWizard
          userId={user.id}
          open={showWizard}
          onClose={() => setShowWizard(false)}
          onProjectCreated={handleProjectCreated}
        />

        <AppSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          userEmail={user?.email}
          userName={user?.user_metadata?.full_name}
          onSignOut={handleSignOut}
        />

        <SidebarInset>
          {/* Header */}
          <header className="bg-gradient-hero border-b shadow-lg sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-white hover:bg-white/20 h-9 w-9 rounded-md transition-colors" />
                <div className="h-px w-6 bg-white/20 rotate-90 hidden sm:block" />
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-orange-500/40 group-hover:rotate-3">
                    <Zap className="h-4 w-4 text-white drop-shadow-sm transition-transform duration-300 group-hover:scale-110" fill="white" />
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-white font-bold text-sm tracking-tight leading-tight">Power Reseller</span>
                    <span className="text-amber-400 text-xs font-medium leading-tight">START UP</span>
                  </div>
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
                  onClick={() => exportToPDF(stepProgress, {
                    projectName: currentProject?.name,
                    commodityType: (currentProject as any)?.commodity_type
                  })}
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
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
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

            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
