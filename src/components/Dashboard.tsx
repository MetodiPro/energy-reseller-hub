import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  TrendingUp, 
  FileText, 
  Euro, 
  Calendar, 
  Target,
  AlertTriangle,
  Flag,
  Activity,
  HelpCircle
} from "lucide-react";
import { processSteps, phases, type ProcessStep } from "@/data/processSteps";
import { stepCostsData } from "@/types/stepCosts";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StepProgress } from "@/hooks/useStepProgress";
import { format, differenceInDays, parseISO, isAfter, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardProps {
  stepProgress: Record<string, StepProgress>;
  commodityType?: string | null;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  getCostAmount: (stepId: string, costItemId: string) => number;
}

export const Dashboard = ({ 
  stepProgress, 
  commodityType,
  projectStartDate,
  projectEndDate,
  getCostAmount
}: DashboardProps) => {
  
  // Filter steps by commodity type (same logic as ProcessTracker)
  const filterStep = (step: ProcessStep) => {
    if (!step.commodityType || step.commodityType === 'all') return true;
    if (!commodityType) return true;
    if (commodityType === 'dual-fuel') return true;
    if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
    if (commodityType === 'solo-gas') return step.commodityType === 'solo-gas';
    return true;
  };

  const visibleSteps = processSteps.filter(filterStep);
  const totalSteps = visibleSteps.length;
  
  // Calculate completed steps
  const completedStepIds = Object.entries(stepProgress)
    .filter(([stepId, progress]) => progress.completed && visibleSteps.some(s => s.id === stepId))
    .map(([stepId]) => stepId);
  
  const completedCount = completedStepIds.length;
  const progressPercentage = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  
  // Calculate real costs from database
  const totalRealCosts = useMemo(() => {
    let total = 0;
    visibleSteps.forEach(step => {
      const stepData = stepCostsData[step.id];
      if (stepData) {
        stepData.items.forEach(item => {
          total += getCostAmount(step.id, item.id);
        });
      }
    });
    return total;
  }, [visibleSteps, getCostAmount]);

  // Calculate estimated days
  const totalEstimatedDays = visibleSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
  
  // Calculate remaining days based on completed steps
  const remainingDays = visibleSteps
    .filter(step => !completedStepIds.includes(step.id))
    .reduce((sum, step) => sum + step.estimatedDays, 0);

  // Calculate completed phases
  const completedPhases = phases.filter(phase => {
    const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
    return phaseSteps.length > 0 && phaseSteps.every(step => completedStepIds.includes(step.id));
  }).length;

  // Parse project dates
  const startDate = projectStartDate ? parseISO(projectStartDate) : null;
  const endDate = projectEndDate ? parseISO(projectEndDate) : null;
  const today = new Date();
  
  // Calculate time progress
  const timeProgress = useMemo(() => {
    if (!startDate || !endDate) return null;
    
    const totalDays = differenceInDays(endDate, startDate);
    const elapsedDays = differenceInDays(today, startDate);
    const daysRemaining = differenceInDays(endDate, today);
    
    if (totalDays <= 0) return null;
    
    const timePercentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    const isOnTrack = progressPercentage >= timePercentage - 10; // Allow 10% tolerance
    const isLate = isBefore(endDate, today);
    const hasStarted = isAfter(today, startDate);
    
    return {
      totalDays,
      elapsedDays: Math.max(0, elapsedDays),
      daysRemaining: Math.max(0, daysRemaining),
      timePercentage,
      isOnTrack,
      isLate,
      hasStarted,
    };
  }, [startDate, endDate, today, progressPercentage]);

  // Prepare data for phase progress chart (with real costs)
  const phaseProgressData = phases.map(phase => {
    const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
    if (phaseSteps.length === 0) return null;
    
    const phaseCompletedCount = phaseSteps.filter(s => completedStepIds.includes(s.id)).length;
    const phaseTotal = phaseSteps.length;
    const phaseDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
    
    // Calculate real costs for phase
    let phaseCosts = 0;
    phaseSteps.forEach(step => {
      const stepData = stepCostsData[step.id];
      if (stepData) {
        stepData.items.forEach(item => {
          phaseCosts += getCostAmount(step.id, item.id);
        });
      }
    });

    return {
      name: phase.name.length > 15 ? phase.name.substring(0, 15) + '...' : phase.name,
      fullName: phase.name,
      completati: phaseCompletedCount,
      totali: phaseTotal,
      percentuale: Math.round((phaseCompletedCount / phaseTotal) * 100),
      giorni: phaseDays,
      costi: Math.round(phaseCosts)
    };
  }).filter(Boolean) as Array<{
    name: string;
    fullName: string;
    completati: number;
    totali: number;
    percentuale: number;
    giorni: number;
    costi: number;
  }>;

  // Prepare data for cost breakdown by phase (only if there are costs)
  const costByPhaseData = phaseProgressData
    .filter(p => p.costi > 0)
    .map(p => ({
      name: p.name,
      fullName: p.fullName,
      valore: p.costi
    }));

  // Prepare data for priority distribution (only visible steps)
  const priorityData = [
    { name: 'Alta', value: visibleSteps.filter(s => s.priority === 'high').length, color: '#ef4444' },
    { name: 'Media', value: visibleSteps.filter(s => s.priority === 'medium').length, color: '#f59e0b' },
    { name: 'Bassa', value: visibleSteps.filter(s => s.priority === 'low').length, color: '#10b981' }
  ].filter(item => item.value > 0);

  // Get status badge for time tracking
  const getTimeStatusBadge = () => {
    if (!timeProgress) return null;
    
    if (timeProgress.isLate) {
      return <Badge variant="destructive">Scaduto</Badge>;
    }
    if (!timeProgress.hasStarted) {
      return <Badge variant="outline">Non iniziato</Badge>;
    }
    if (timeProgress.isOnTrack) {
      return <Badge className="bg-success text-white">In linea</Badge>;
    }
    return <Badge variant="destructive">In ritardo</Badge>;
  };

  return (
    <TooltipProvider delayDuration={100}>
    <div className="space-y-6">
      {/* Time Progress Banner (if dates are set) */}
      {timeProgress && (
        <Card className={cn(
          "p-4 border-l-4",
          timeProgress.isLate && "border-l-destructive bg-destructive/5",
          !timeProgress.isLate && timeProgress.isOnTrack && "border-l-success bg-success/5",
          !timeProgress.isLate && !timeProgress.isOnTrack && "border-l-warning bg-warning/5"
        )}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">Periodo: </span>
                  <span className="font-medium">
                    {format(startDate!, 'd MMM', { locale: it })} → {format(endDate!, 'd MMM yyyy', { locale: it })}
                  </span>
                </div>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{timeProgress.elapsedDays}</strong> di <strong>{timeProgress.totalDays}</strong> giorni trascorsi
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getTimeStatusBadge()}
              <div className="text-sm text-right">
                <div className="font-medium">{timeProgress.daysRemaining} giorni rimanenti</div>
              </div>
            </div>
          </div>
          
          {/* Double Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tempo trascorso: {Math.round(timeProgress.timePercentage)}%</span>
              <span>Avanzamento: {Math.round(progressPercentage)}%</span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              {/* Time progress (background) */}
              <div 
                className="absolute h-full bg-muted-foreground/30 rounded-full"
                style={{ width: `${timeProgress.timePercentage}%` }}
              />
              {/* Task progress (foreground) */}
              <div 
                className={cn(
                  "absolute h-full rounded-full transition-all",
                  timeProgress.isOnTrack ? "bg-success" : "bg-warning"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Inizio</span>
              <span>Fine</span>
            </div>
          </div>
        </Card>
      )}

      {/* Warning if no dates set */}
      {!projectStartDate && !projectEndDate && (
        <Card className="p-4 border-dashed border-warning/50 bg-warning/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-sm">Date progetto non impostate</p>
              <p className="text-xs text-muted-foreground">
                Vai nella sezione <strong>Processo</strong> per impostare le date di inizio e fine progetto
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-primary shadow-custom-lg hover:shadow-glow transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progresso Totale</p>
              <h3 className="text-3xl font-bold mt-2 bg-gradient-primary bg-clip-text text-transparent">
                {completedCount}/{totalSteps}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{Math.round(progressPercentage)}% completato</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <Progress value={progressPercentage} className="mt-4" />
        </Card>

        <Card className="p-6 border-l-4 border-l-accent shadow-custom-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fasi Completate</p>
              <h3 className="text-3xl font-bold mt-2 text-accent">
                {completedPhases}/{phases.length}
              </h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-warning shadow-custom-lg">
          <div className="flex items-center justify-between">
            <div>
              <ShadcnTooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 cursor-help">
                    Lavoro Stimato Rimanente
                    <HelpCircle className="h-3 w-3" />
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Giorni-lavoro vs Giorni calendario</p>
                  <p className="text-xs">
                    <strong>Giorni-lavoro ({remainingDays})</strong>: somma delle durate stimate di ogni attività. 
                    Rappresenta il carico di lavoro totale.
                  </p>
                  <p className="text-xs mt-1">
                    <strong>Giorni calendario ({timeProgress?.daysRemaining ?? '–'})</strong>: tempo reale 
                    disponibile fino alla data di fine progetto.
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Se i giorni-lavoro superano i giorni calendario, dovrai lavorare in parallelo 
                    su più attività o coinvolgere più persone.
                  </p>
                </TooltipContent>
              </ShadcnTooltip>
              <h3 className="text-3xl font-bold mt-2 text-warning">
                {remainingDays}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                di {totalEstimatedDays} giorni-lavoro totali
              </p>
              {timeProgress && (
                <p className="text-xs text-muted-foreground mt-1">
                  📅 Calendario: {timeProgress.daysRemaining} giorni reali
                </p>
              )}
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-success shadow-custom-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Investimento</p>
              <h3 className="text-3xl font-bold mt-2 text-success">
                €{totalRealCosts.toLocaleString('it-IT')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">costi inseriti</p>
            </div>
            <Euro className="h-8 w-8 text-success" />
          </div>
        </Card>
      </div>

      {/* Commodity Type Badge */}
      {commodityType && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {commodityType === 'solo-luce' && '⚡ Solo Energia Elettrica'}
            {commodityType === 'solo-gas' && '🔥 Solo Gas Naturale'}
            {commodityType === 'dual-fuel' && '⚡🔥 Dual Fuel'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            • {visibleSteps.length} step applicabili
          </span>
        </div>
      )}

      {/* Phase Progress Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 shadow-custom-lg">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Progresso per Fase</h2>
          </div>
          {phaseProgressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={phaseProgressData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <Legend />
                <Bar dataKey="completati" fill="hsl(var(--primary))" name="Completati" />
                <Bar dataKey="totali" fill="hsl(var(--muted))" name="Totali" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nessuna fase applicabile
            </div>
          )}
        </Card>

        <Card className="p-6 shadow-custom-lg">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Distribuzione Priorità</h2>
          </div>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Nessuno step disponibile
            </div>
          )}
        </Card>
      </div>

      {/* Cost Analysis */}
      <Card className="p-6 shadow-custom-lg">
        <div className="flex items-center gap-2 mb-6">
          <Euro className="h-5 w-5 text-success" />
          <h2 className="text-xl font-bold">Costi Reali per Fase</h2>
        </div>
        {costByPhaseData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByPhaseData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
              <YAxis className="text-xs" />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: number) => [`€${value.toLocaleString('it-IT')}`, 'Costo']}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Legend />
              <Bar dataKey="valore" fill="hsl(var(--success))" name="Costi Inseriti (€)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center">
              <Euro className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessun costo inserito</p>
              <p className="text-xs mt-1">Vai nella sezione Processo per inserire i costi degli step</p>
            </div>
          </div>
        )}
      </Card>

      {/* Phase Overview */}
      <Card className="p-6 shadow-custom-lg">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Panoramica Fasi</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {phases.map((phase) => {
            const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
            if (phaseSteps.length === 0) return null;
            
            const phaseCompleted = phaseSteps.filter(s => completedStepIds.includes(s.id)).length;
            const phaseProgress = phaseSteps.length > 0 ? (phaseCompleted / phaseSteps.length) * 100 : 0;
            const phaseDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
            
            // Calculate real costs
            let phaseCosts = 0;
            phaseSteps.forEach(step => {
              const stepData = stepCostsData[step.id];
              if (stepData) {
                stepData.items.forEach(item => {
                  phaseCosts += getCostAmount(step.id, item.id);
                });
              }
            });
            
            return (
              <Card key={phase.id} className="p-4 border-2 hover:border-primary transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Badge 
                    variant="outline" 
                    className="text-xs font-semibold"
                    style={{ borderColor: phase.color }}
                  >
                    Fase {phase.id}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-lg mb-3">{phase.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Step completati</span>
                    <span className="font-medium">{phaseCompleted}/{phaseSteps.length}</span>
                  </div>
                  
                  <Progress value={phaseProgress} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Durata</span>
                    </div>
                    <span className="font-medium">{phaseDays} giorni</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Euro className="h-3 w-3" />
                      <span>Costi</span>
                    </div>
                    <span className="font-medium">€{phaseCosts.toLocaleString('it-IT')}</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    {phaseProgress === 100 ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Completata</span>
                      </div>
                    ) : phaseProgress > 0 ? (
                      <div className="flex items-center gap-2 text-warning">
                        <Circle className="h-4 w-4 fill-current" />
                        <span className="text-sm font-medium">In corso</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Circle className="h-4 w-4" />
                        <span className="text-sm font-medium">Non iniziata</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
    </TooltipProvider>
  );
};
