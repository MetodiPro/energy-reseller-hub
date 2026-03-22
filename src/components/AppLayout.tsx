import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, LogOut, Download, FileText, DollarSign, ContactRound } from 'lucide-react';
import { processSteps } from '@/data/processSteps';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ProjectWizard } from '@/components/ProjectWizard';
import { ProjectSelector } from '@/components/ProjectSelector';
import { ProjectStartupDialog } from '@/components/ProjectStartupDialog';
import { PageGuide } from '@/components/PageGuide';
import { pageGuides } from '@/data/pageGuides';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { AppSidebar } from '@/components/AppSidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { OverallProgressRing } from '@/components/OverallProgressRing';
import { supabase } from '@/integrations/supabase/client';
import { useStepProgress } from '@/hooks/useStepProgress';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useExportPDF } from '@/hooks/useExportPDF';
import { useDeadlineNotifications } from '@/hooks/useDeadlineNotifications';
import { useLazyUnifiedExport } from '@/hooks/useLazyUnifiedExport';
import { useProjectContext } from '@/contexts/ProjectContext';
import type { User } from '@supabase/supabase-js';

// Lazy-loaded section components
const Dashboard = lazy(() => import('@/components/Dashboard').then(m => ({ default: m.Dashboard })));
const ProcessTracker = lazy(() => import('@/components/ProcessTracker').then(m => ({ default: m.ProcessTracker })));
const ProjectOverview = lazy(() => import('@/components/ProjectOverview').then(m => ({ default: m.ProjectOverview })));
const RegulatoryCalendar = lazy(() => import('@/components/RegulatoryCalendar').then(m => ({ default: m.RegulatoryCalendar })));
const StepDocuments = lazy(() => import('@/components/StepDocuments').then(m => ({ default: m.StepDocuments })));
const ProjectTeamManager = lazy(() => import('@/components/ProjectTeamManager').then(m => ({ default: m.ProjectTeamManager })));
const DocumentManager = lazy(() => import('@/components/DocumentManager').then(m => ({ default: m.DocumentManager })));
const ConsultantsManager = lazy(() => import('@/components/ConsultantsManager').then(m => ({ default: m.ConsultantsManager })));
const FinancialDashboard = lazy(() => import('@/components/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
const BusinessPlanEditor = lazy(() => import('@/components/BusinessPlanEditor').then(m => ({ default: m.BusinessPlanEditor })));
const MarketingPlanEditor = lazy(() => import('@/components/MarketingPlanEditor').then(m => ({ default: m.MarketingPlanEditor })));
const GanttTimeline = lazy(() => import('@/components/GanttTimeline').then(m => ({ default: m.GanttTimeline })));
const PreLaunchChecklist = lazy(() => import('@/components/PreLaunchChecklist').then(m => ({ default: m.PreLaunchChecklist })));
const ContractPackagePage = lazy(() => import('@/components/ContractPackagePage').then(m => ({ default: m.ContractPackagePage })));
const FAQ = lazy(() => import('@/components/FAQ').then(m => ({ default: m.FAQ })));
const SettingsPage = lazy(() => import('@/components/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const MarketTariffsPage = lazy(() => import('@/components/MarketTariffsSection').then(m => ({ default: m.MarketTariffsSection })));
const HypothesesPage = lazy(() => import('@/components/HypothesesPage').then(m => ({ default: m.HypothesesPage })));
const CrmDashboard = lazy(() => import('@/components/CrmDashboard').then(m => ({ default: m.CrmDashboard })));

function SectionLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

const VALID_SECTIONS = [
  'overview', 'dashboard', 'process', 'deadlines', 'step-docs', 'team',
  'documents', 'consultants', 'tariffs', 'hypotheses', 'financials', 'business-plan', 'marketing',
  'gantt', 'prelaunch', 'contract-package', 'faq', 'settings', 'profile', 'crm',
];

interface AppLayoutProps {
  user: User;
}

export function AppLayout({ user }: AppLayoutProps) {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const activeTab = VALID_SECTIONS.includes(section || '') ? section! : 'overview';

  const setActiveTab = useCallback((tab: string) => {
    navigate(`/app/${tab}`, { replace: true });
  }, [navigate]);

  const {
    projects, currentProject, loading: projectsLoading,
    selectProject, addProject, updateProject,
    updateProjectStartDate, updateProjectEndDate,
    deleteProject, hasProjects,
  } = useProjectContext();

  const [showWizard, setShowWizard] = useState(false);
  const [showStartupDialog, setShowStartupDialog] = useState(false);
  const [regulatoryDeadlines, setRegulatoryDeadlines] = useState<any[]>([]);
  const [navigateToPhase, setNavigateToPhase] = useState<number | null>(null);

  const currentProjectId = currentProject?.id ?? null;

  // Core hooks
  const { stepProgress, loading: progressLoading } = useStepProgress({
    userId: user.id,
    projectId: currentProjectId,
  });
  const { settings: notificationSettings } = useNotificationSettings(user.id);
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications(
    user.id, stepProgress, notificationSettings, currentProjectId,
  );
  const { exportToPDF } = useExportPDF();
  const { exportReport, exporting } = useLazyUnifiedExport();

  useDeadlineNotifications(regulatoryDeadlines, !!currentProjectId, currentProject?.commodity_type);

  // Fetch deadlines
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

  // Wizard / startup dialog logic
  useEffect(() => {
    if (projectsLoading) return;
    if (projects.length === 0) {
      setShowWizard(true);
      setShowStartupDialog(false);
    } else if (!currentProject) {
      setShowStartupDialog(true);
      setShowWizard(false);
    } else {
      setShowWizard(false);
      setShowStartupDialog(false);
    }
  }, [projectsLoading, projects.length, currentProject]);

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
    navigate('/');
  };

  // ── Section renderer ──
  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'overview':
          return (
            <ProjectOverview
              project={currentProject}
              onProjectUpdate={(p) => selectProject(p)}
              stepProgress={stepProgress}
            />
          );
        case 'dashboard':
          return (
            <Dashboard
              stepProgress={stepProgress}
              commodityType={currentProject?.commodity_type}
              projectStartDate={currentProject?.planned_start_date}
              projectEndDate={currentProject?.go_live_date}
              projectId={currentProjectId}
              onNavigateToPhase={(phaseId) => {
                setNavigateToPhase(phaseId);
                setActiveTab('process');
              }}
            />
          );
        case 'process':
          return (
            <ProcessTracker
              projectId={currentProjectId ?? undefined}
              commodityType={currentProject?.commodity_type}
              projectName={currentProject?.name}
              projectStartDate={currentProject?.planned_start_date}
              projectEndDate={currentProject?.go_live_date}
              initialPhase={navigateToPhase}
              onUpdateProjectStartDate={(date) => {
                if (currentProjectId) updateProjectStartDate(currentProjectId, date);
              }}
              onUpdateProjectEndDate={(date) => {
                if (currentProjectId) updateProjectEndDate(currentProjectId, date);
              }}
            />
          );
        case 'deadlines':
          return (
            <RegulatoryCalendar
              projectId={currentProjectId}
              eveLicenseDate={currentProject?.eve_license_date}
              evgLicenseDate={currentProject?.evg_license_date}
              commodityType={currentProject?.commodity_type}
            />
          );
        case 'step-docs':
          return <StepDocuments projectId={currentProjectId} />;
        case 'team':
          return <ProjectTeamManager projectId={currentProjectId} currentUserId={user.id} />;
        case 'documents':
          return <DocumentManager projectId={currentProjectId} />;
        case 'consultants':
          return <ConsultantsManager projectId={currentProjectId} />;
        case 'financials':
          return currentProjectId ? (
            <FinancialDashboard
              projectId={currentProjectId}
              projectName={currentProject?.name || 'Progetto Corrente'}
              commodityType={currentProject?.commodity_type}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Crea prima un progetto per accedere alla Dashboard Finanziaria</p>
            </div>
          );
        case 'business-plan':
          return (
            <BusinessPlanEditor
              userId={user.id}
              projectId={currentProjectId}
              stepProgress={stepProgress}
            />
          );
        case 'marketing':
          return (
            <MarketingPlanEditor
              userId={user.id}
              projectId={currentProjectId}
              stepProgress={stepProgress}
            />
          );
        case 'gantt':
          return (
            <GanttTimeline
              stepProgress={stepProgress}
              projectStartDate={currentProject?.planned_start_date}
              goLiveDate={currentProject?.go_live_date}
              projectId={currentProjectId}
            />
          );
        case 'prelaunch':
          return (
            <PreLaunchChecklist
              stepProgress={stepProgress}
              project={currentProject}
              projectId={currentProjectId}
            />
          );
        case 'contract-package':
          return (
            <ContractPackagePage
              project={currentProject}
              projectId={currentProjectId}
            />
          );
        case 'faq':
          return <FAQ onNavigate={setActiveTab} />;
        case 'tariffs':
          return <MarketTariffsPage />;
        case 'crm':
          return currentProjectId ? (
            <CrmDashboard projectId={currentProjectId} userId={user.id} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ContactRound className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Crea prima un progetto per accedere al CRM Clienti</p>
            </div>
          );
        case 'settings':
          return (
            <SettingsPage
              userId={user.id}
              userEmail={user.email}
              userName={user.user_metadata?.full_name}
            />
          );
        case 'profile':
          return (
            <ProfilePage
              userId={user.id}
              userEmail={user.email}
              userName={user.user_metadata?.full_name}
            />
          );
        default:
          return (
            <ProjectOverview
              project={currentProject}
              onProjectUpdate={(p) => selectProject(p)}
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

  // ── Layout ──
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
          userEmail={user.email}
          userName={user.user_metadata?.full_name}
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
                    commodityType: currentProject?.commodity_type,
                  })}
                  className="text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Processo</span>
                </Button>
                {currentProject && currentProjectId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={exporting}
                    onClick={() => exportReport(currentProject, currentProjectId, stepProgress)}
                    className="text-white hover:bg-white/10"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">{exporting ? 'Generazione...' : 'Report'}</span>
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
                <OverallProgressRing stepProgress={stepProgress} />
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
}
