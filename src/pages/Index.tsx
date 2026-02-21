import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, Download, FileText } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ProjectWizard } from "@/components/ProjectWizard";
import { ProjectSelector } from "@/components/ProjectSelector";
import { ProjectStartupDialog } from "@/components/ProjectStartupDialog";
import { PageGuide } from "@/components/PageGuide";
import { pageGuides } from "@/data/pageGuides";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { useExportUnifiedPDF } from "@/hooks/useExportUnifiedPDF";
import { useCashFlowAnalysis } from "@/hooks/useCashFlowAnalysis";
import { DollarSign } from "lucide-react";
import type { User } from "@supabase/supabase-js";

// Lazy-loaded section components
const Dashboard = lazy(() => import("@/components/Dashboard").then(m => ({ default: m.Dashboard })));
const ProcessTracker = lazy(() => import("@/components/ProcessTracker").then(m => ({ default: m.ProcessTracker })));
const ProjectOverview = lazy(() => import("@/components/ProjectOverview").then(m => ({ default: m.ProjectOverview })));
const RegulatoryCalendar = lazy(() => import("@/components/RegulatoryCalendar").then(m => ({ default: m.RegulatoryCalendar })));
const StepDocuments = lazy(() => import("@/components/StepDocuments").then(m => ({ default: m.StepDocuments })));
const ProjectTeamManager = lazy(() => import("@/components/ProjectTeamManager").then(m => ({ default: m.ProjectTeamManager })));
const DocumentManager = lazy(() => import("@/components/DocumentManager").then(m => ({ default: m.DocumentManager })));
const ConsultantsManager = lazy(() => import("@/components/ConsultantsManager").then(m => ({ default: m.ConsultantsManager })));
const FinancialDashboard = lazy(() => import("@/components/FinancialDashboard").then(m => ({ default: m.FinancialDashboard })));
const BusinessPlanEditor = lazy(() => import("@/components/BusinessPlanEditor").then(m => ({ default: m.BusinessPlanEditor })));
const MarketingPlanEditor = lazy(() => import("@/components/MarketingPlanEditor").then(m => ({ default: m.MarketingPlanEditor })));
const GanttTimeline = lazy(() => import("@/components/GanttTimeline").then(m => ({ default: m.GanttTimeline })));
const PreLaunchChecklist = lazy(() => import("@/components/PreLaunchChecklist").then(m => ({ default: m.PreLaunchChecklist })));
const ContractPackagePage = lazy(() => import("@/components/ContractPackagePage").then(m => ({ default: m.ContractPackagePage })));
const FAQ = lazy(() => import("@/components/FAQ").then(m => ({ default: m.FAQ })));
const SettingsPage = lazy(() => import("@/components/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("@/components/ProfilePage").then(m => ({ default: m.ProfilePage })));
const TeamAnalyticsDashboard = lazy(() => import("@/components/TeamAnalyticsDashboard").then(m => ({ default: m.TeamAnalyticsDashboard })));

function SectionLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

const VALID_SECTIONS = [
  "overview", "dashboard", "process", "deadlines", "step-docs", "team",
  "documents", "consultants", "financials", "business-plan", "marketing",
  "gantt", "prelaunch", "contract-package", "faq", "settings", "profile"
];

const Index = () => {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const activeTab = VALID_SECTIONS.includes(section || "") ? section! : "overview";

  const setActiveTab = (tab: string) => {
    navigate(`/app/${tab}`, { replace: true });
  };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showStartupDialog, setShowStartupDialog] = useState(false);
  const [regulatoryDeadlines, setRegulatoryDeadlines] = useState<any[]>([]);
  const [navigateToPhase, setNavigateToPhase] = useState<number | null>(null);

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

  const { 
    projects, currentProject, loading: projectsLoading, 
    selectProject, addProject, updateProject, updateProjectStartDate,
    updateProjectEndDate, deleteProject, hasProjects 
  } = useProjects(user?.id);

  const currentProjectId = currentProject?.id ?? null;

  const { stepProgress, loading: progressLoading } = useStepProgress({
    userId: user?.id,
    projectId: currentProjectId,
  });

  const { settings: notificationSettings } = useNotificationSettings(user?.id);
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications(
    user?.id, stepProgress, notificationSettings, currentProjectId
  );
  const { exportToPDF } = useExportPDF();
  const { exportProjectReportPDF } = useExportProjectReportPDF();
  const { analytics, loading: analyticsLoading } = useTeamAnalytics(user?.id, stepProgress);
  const { costs, revenues, summary: financialSummary } = useProjectFinancials(currentProjectId);
  const { cashFlowData } = useCashFlowAnalysis(currentProjectId);
  const { exportUnifiedPDF } = useExportUnifiedPDF();
  const { getCostAmount } = useStepCosts(currentProjectId);

  const [realHasDocuments, setRealHasDocuments] = useState(false);
  const [realHasTeamMembers, setRealHasTeamMembers] = useState(false);

  useEffect(() => {
    if (!currentProjectId) {
      setRealHasDocuments(false);
      setRealHasTeamMembers(false);
      return;
    }
    const fetchRealData = async () => {
      const [{ count: docCount }, { count: memberCount }] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId),
        supabase.from('project_members').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId),
      ]);
      setRealHasDocuments((docCount ?? 0) > 0);
      setRealHasTeamMembers((memberCount ?? 0) > 1);
    };
    fetchRealData();
  }, [currentProjectId]);

  useDeadlineNotifications(regulatoryDeadlines, !!currentProjectId, (currentProject as any)?.commodity_type);

  useEffect(() => {
    const fetchDeadlines = async () => {
      if (!currentProjectId) { setRegulatoryDeadlines([]); return; }
      const { data } = await supabase
        .from('regulatory_deadlines')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('due_date', { ascending: true });
      setRegulatoryDeadlines(data || []);
    };
    fetchDeadlines();
  }, [currentProjectId]);

  useEffect(() => {
    if (projectsLoading || !user) return;
    const userHasProjects = projects.length > 0;
    if (!userHasProjects) {
      setShowWizard(true);
      setShowStartupDialog(false);
    } else if (!currentProject) {
      setShowStartupDialog(true);
      setShowWizard(false);
    } else {
      setShowWizard(false);
      setShowStartupDialog(false);
    }
  }, [projectsLoading, user, projects.length, currentProject]);

  const handleProjectCreated = async (projectId: string) => {
    setShowWizard(false);
    setShowStartupDialog(false);
    const { data: newProject } = await supabase
      .from('projects').select('*').eq('id', projectId).single();
    if (newProject) addProject(newProject);
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
    navigate("/");
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
    const content = (() => {
      switch (activeTab) {
        case "overview":
          return (
            <ProjectOverview 
              project={currentProject as any} 
              onProjectUpdate={(p) => selectProject(p as any)}
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
              onNavigateToPhase={(phaseId) => {
                setNavigateToPhase(phaseId);
                setActiveTab("process");
              }}
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
              initialPhase={navigateToPhase}
              onUpdateProjectStartDate={(date) => {
                if (currentProjectId) updateProjectStartDate(currentProjectId, date);
              }}
              onUpdateProjectEndDate={(date) => {
                if (currentProjectId) updateProjectEndDate(currentProjectId, date);
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
              projectStartDate={(currentProject as any)?.planned_start_date}
              goLiveDate={(currentProject as any)?.go_live_date}
              projectId={currentProjectId}
            />
          );
        case "prelaunch":
          return (
            <PreLaunchChecklist 
              stepProgress={stepProgress}
              project={currentProject as any}
              hasDocuments={realHasDocuments}
              hasCosts={costs.length > 0}
              hasTeamMembers={realHasTeamMembers}
              projectId={currentProjectId}
            />
          );
        case "contract-package":
          return (
            <ContractPackagePage
              project={currentProject as any}
              projectId={currentProjectId}
            />
          );
        case "faq":
          return <FAQ onNavigate={setActiveTab} />;
        case "settings":
          return (
            <SettingsPage 
              userId={user?.id}
              userEmail={user?.email}
              userName={user?.user_metadata?.full_name}
            />
          );
        case "profile":
          return (
            <ProfilePage 
              userId={user?.id}
              userEmail={user?.email}
              userName={user?.user_metadata?.full_name}
            />
          );
        default:
          return (
            <ProjectOverview 
              project={currentProject as any} 
              onProjectUpdate={(p) => selectProject(p as any)}
            />
          );
      }
    })();

    return (
      <ErrorBoundary fallbackTitle="Errore nel caricamento della sezione">
        <Suspense fallback={<SectionLoader />}>
          {content}
        </Suspense>
      </ErrorBoundary>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProjectStartupDialog
          open={showStartupDialog}
          projects={projects}
          loading={projectsLoading}
          onSelectProject={handleSelectProjectFromStartup}
          onCreateNew={handleOpenWizard}
        />

        <ProjectWizard
          userId={user.id}
          open={showWizard}
          onClose={() => setShowWizard(false)}
          onProjectCreated={handleProjectCreated}
        />

        {currentProject && <OnboardingTutorial onNavigate={setActiveTab} />}

        <AppSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          userEmail={user?.email}
          userName={user?.user_metadata?.full_name}
          onSignOut={handleSignOut}
        />

        <SidebarInset>
          <header className="bg-gradient-hero border-b shadow-lg sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-white hover:bg-white/20 h-9 w-9 rounded-md transition-colors" />
                <div className="h-px w-6 bg-white/20 rotate-90 hidden sm:block" />
                <div className="flex items-center gap-3 group cursor-pointer">
                  <img src="/favicon.png" alt="Metodi Res Builder" className="h-9 w-9 rounded-xl shrink-0 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3" />
                  <div className="hidden sm:flex flex-col">
                    <span className="text-white font-bold text-sm tracking-tight leading-tight">Metodi</span>
                    <span className="text-amber-400 text-xs font-medium leading-tight">RES BUILDER</span>
                  </div>
                </div>
              </div>

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
                  <span className="hidden md:inline">Processo</span>
                </Button>
                {currentProject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const { data: members } = await supabase
                        .from('project_members')
                        .select('user_id, role')
                        .eq('project_id', currentProjectId!);
                      const userIds = members?.map(m => m.user_id) || [];
                      const { data: profiles } = userIds.length > 0
                        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
                        : { data: [] };
                      const profileMap: Record<string, string> = {};
                      profiles?.forEach(p => { profileMap[p.id] = p.full_name || 'Utente'; });
                      const teamMembers = members?.map(m => ({
                        name: profileMap[m.user_id] || 'Utente',
                        role: m.role,
                      })) || [];

                      const { processSteps } = await import('@/data/processSteps');
                      const checkItems = [
                        { label: 'Iscrizione EVE', isMet: !!(currentProject as any)?.eve_license_date, severity: 'critical', category: 'admin' },
                        { label: 'Codice ARERA', isMet: !!(currentProject as any)?.arera_code, severity: 'critical', category: 'admin' },
                        { label: 'Grossista definito', isMet: !!(currentProject as any)?.wholesaler_name, severity: 'critical', category: 'commercial' },
                        { label: 'Mercato target', isMet: !!(currentProject as any)?.market_type, severity: 'important', category: 'commercial' },
                        { label: 'Data Go-Live', isMet: !!(currentProject as any)?.go_live_date, severity: 'important', category: 'operational' },
                        { label: 'Documenti caricati', isMet: realHasDocuments, severity: 'recommended', category: 'admin' },
                        { label: 'Team definito', isMet: realHasTeamMembers, severity: 'recommended', category: 'operational' },
                        { label: 'Budget definito', isMet: costs.length > 0, severity: 'recommended', category: 'operational' },
                      ];

                      exportUnifiedPDF(
                        currentProject as any,
                        stepProgress,
                        financialSummary as any,
                        cashFlowData,
                        teamMembers,
                        checkItems,
                      );
                    }}
                    className="text-white hover:bg-white/10"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">Report</span>
                  </Button>
                )}
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

          <main className="flex-1 p-6">
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

            {pageGuides[activeTab] && (
              <PageGuide {...pageGuides[activeTab]} />
            )}
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
