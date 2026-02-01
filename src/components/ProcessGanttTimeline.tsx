import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Flag
} from "lucide-react";
import { processSteps, phases, type ProcessStep } from "@/data/processSteps";
import { stepCostsData } from "@/types/stepCosts";
import { cn } from "@/lib/utils";
import { format, differenceInDays, addDays, isAfter, isBefore, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { StepDatePicker } from "@/components/StepDatePicker";

interface StepProgressData {
  completed: boolean;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
}

interface ProcessGanttTimelineProps {
  projectStartDate: Date | null;
  projectEndDate: Date | null;
  stepProgress: Record<string, StepProgressData>;
  commodityType: string | null;
  getCostAmount: (stepId: string, costItemId: string) => number;
  onUpdateStepDates?: (stepId: string, startDate?: string, endDate?: string) => void;
}

export const ProcessGanttTimeline = ({
  projectStartDate,
  projectEndDate,
  stepProgress,
  commodityType,
  getCostAmount,
  onUpdateStepDates,
}: ProcessGanttTimelineProps) => {
  // Filter steps by commodity type
  const filterStep = (step: ProcessStep) => {
    if (!step.commodityType || step.commodityType === 'all') return true;
    if (!commodityType) return true;
    if (commodityType === 'dual-fuel') return true;
    if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
    if (commodityType === 'solo-gas') return step.commodityType === 'solo-gas';
    return true;
  };

  const visibleSteps = processSteps.filter(filterStep);

  // Calculate minimum required days based on step estimates
  const minimumRequiredDays = useMemo(() => {
    return visibleSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
  }, [visibleSteps]);

  // Calculate timeline data - distribute steps proportionally within the date range
  const timelineData = useMemo(() => {
    if (!projectStartDate || !projectEndDate) return null;

    const totalProjectDays = differenceInDays(projectEndDate, projectStartDate);
    if (totalProjectDays <= 0) return null;

    // Calculate total estimated days for proportional distribution
    const totalEstimatedDays = visibleSteps.reduce((sum, step) => sum + step.estimatedDays, 0);

    let currentDate = projectStartDate;
    const stepsWithDates: Array<{
      step: ProcessStep;
      startDate: Date;
      endDate: Date;
      cost: number;
      completed: boolean;
      hasCustomDates: boolean;
      originalDays: number;
      scaledDays: number;
    }> = [];

    visibleSteps.forEach(step => {
      const progress = stepProgress[step.id];
      const stepData = stepCostsData[step.id];
      
      // Calculate step cost
      let stepCost = 0;
      if (stepData) {
        stepData.items.forEach(item => {
          stepCost += getCostAmount(step.id, item.id);
        });
      }

      // Check for custom planned dates
      const hasCustomDates = !!(progress?.plannedStartDate && progress?.plannedEndDate);
      let startDate: Date;
      let endDate: Date;
      let scaledDays: number;

      if (hasCustomDates) {
        startDate = parseISO(progress.plannedStartDate!);
        endDate = parseISO(progress.plannedEndDate!);
        scaledDays = differenceInDays(endDate, startDate);
      } else {
        // Proportionally scale the step duration to fit within the project range
        const proportion = step.estimatedDays / totalEstimatedDays;
        scaledDays = Math.max(1, Math.round(totalProjectDays * proportion));
        
        startDate = currentDate;
        endDate = addDays(currentDate, scaledDays);
        currentDate = endDate;
      }

      stepsWithDates.push({
        step,
        startDate,
        endDate,
        cost: stepCost,
        completed: progress?.completed || false,
        hasCustomDates,
        originalDays: step.estimatedDays,
        scaledDays,
      });

      if (!hasCustomDates) {
        currentDate = endDate;
      }
    });

    // Calculate totals
    const totalCost = stepsWithDates.reduce((sum, s) => sum + s.cost, 0);
    const completedSteps = stepsWithDates.filter(s => s.completed).length;

    // Cost by month
    const costByMonth: Record<string, number> = {};
    stepsWithDates.forEach(({ startDate, cost }) => {
      const monthKey = format(startDate, 'yyyy-MM');
      costByMonth[monthKey] = (costByMonth[monthKey] || 0) + cost;
    });

    // Calculate compression ratio
    const compressionRatio = totalProjectDays / totalEstimatedDays;

    return {
      steps: stepsWithDates,
      totalDays: totalProjectDays,
      totalCost,
      completedSteps,
      costByMonth,
      compressionRatio,
      totalEstimatedDays,
    };
  }, [projectStartDate, projectEndDate, visibleSteps, stepProgress, getCostAmount]);

  // Validation: check if the date range is feasible
  const isFeasible = useMemo(() => {
    if (!projectStartDate || !projectEndDate) return true;
    const totalProjectDays = differenceInDays(projectEndDate, projectStartDate);
    // Consider feasible if at least 30% of estimated time (aggressive but possible)
    // Below 10% is definitely not feasible
    return totalProjectDays >= minimumRequiredDays * 0.1;
  }, [projectStartDate, projectEndDate, minimumRequiredDays]);

  const compressionWarning = useMemo(() => {
    if (!timelineData) return null;
    const ratio = timelineData.compressionRatio;
    if (ratio >= 0.8) return null; // No warning if 80%+ of original time
    if (ratio >= 0.5) return 'moderate'; // 50-80%: moderate compression
    if (ratio >= 0.2) return 'high'; // 20-50%: high compression
    return 'extreme'; // <20%: extreme compression
  }, [timelineData]);

  if (!projectStartDate || !projectEndDate) {
    return (
      <Card className="border-dashed border-warning/50 bg-warning/5">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
          <p className="text-muted-foreground">
            Imposta le date di inizio e fine progetto per visualizzare la timeline
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Durata minima stimata: <strong>{minimumRequiredDays} giorni</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show error if dates are not feasible
  if (!isFeasible || !timelineData) {
    const actualDays = differenceInDays(projectEndDate, projectStartDate);
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="font-medium text-destructive">
            Range di date non realistico
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Hai impostato <strong>{actualDays} giorni</strong>, ma il processo richiede 
            almeno <strong>{minimumRequiredDays} giorni</strong> secondo le stime.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Estendi la data di fine o anticipa la data di inizio per un piano realistico.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!timelineData) return null;

  const today = new Date();
  const daysRemaining = differenceInDays(projectEndDate, today);
  const progressPercentage = Math.round((timelineData.completedSteps / timelineData.steps.length) * 100);

  const getCompressionBadge = () => {
    if (!compressionWarning) return null;
    const config = {
      moderate: { label: 'Compressione moderata', className: 'bg-warning/10 text-warning border-warning/30' },
      high: { label: 'Compressione alta', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
      extreme: { label: 'Compressione estrema', className: 'bg-destructive/10 text-destructive border-destructive/30' },
    };
    const c = config[compressionWarning];
    return (
      <Badge variant="outline" className={cn("text-xs", c.className)}>
        {c.label} ({Math.round(timelineData.compressionRatio * 100)}% del tempo stimato)
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Compression Warning Banner */}
      {compressionWarning && (
        <Card className={cn(
          "border",
          compressionWarning === 'moderate' && "border-warning/50 bg-warning/5",
          compressionWarning === 'high' && "border-orange-500/50 bg-orange-500/5",
          compressionWarning === 'extreme' && "border-destructive/50 bg-destructive/5"
        )}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn(
                "h-5 w-5 flex-shrink-0 mt-0.5",
                compressionWarning === 'moderate' && "text-warning",
                compressionWarning === 'high' && "text-orange-500",
                compressionWarning === 'extreme' && "text-destructive"
              )} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">Timeline compressa</span>
                  {getCompressionBadge()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Il range di {timelineData.totalDays} giorni è inferiore alla durata stimata di {timelineData.totalEstimatedDays} giorni. 
                  Gli step saranno compressi proporzionalmente. Valuta se è realistico.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span>Inizio</span>
            </div>
            <p className="text-lg font-bold mt-1">
              {format(projectStartDate, 'd MMM yyyy', { locale: it })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Flag className="h-4 w-4 text-primary" />
              <span>Due Date</span>
            </div>
            <p className="text-lg font-bold mt-1">
              {format(projectEndDate, 'd MMM yyyy', { locale: it })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              <span>Durata</span>
            </div>
            <p className="text-2xl font-bold mt-1">{timelineData.totalDays} giorni</p>
            {daysRemaining > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {daysRemaining} giorni rimanenti
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Avanzamento</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {timelineData.completedSteps}/{timelineData.steps.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{progressPercentage}% completato</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="text-primary font-bold">€</span>
              <span>Investimento</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">
              €{timelineData.totalCost.toLocaleString('it-IT')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Timeline Progetto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 overflow-x-auto">
            {/* Header with months */}
            <div className="flex items-center gap-2 mb-4 min-w-[600px]">
              <div className="w-48 flex-shrink-0" />
              <div className="flex-1 flex">
                {Object.keys(timelineData.costByMonth).map(monthKey => (
                  <div key={monthKey} className="flex-1 text-center text-xs text-muted-foreground">
                    {format(parseISO(monthKey + '-01'), 'MMM yyyy', { locale: it })}
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            {timelineData.steps.map(({ step, startDate, endDate, cost, completed, hasCustomDates }, index) => {
              const phaseConfig = phases.find(p => p.id === step.phase);
              const isLate = !completed && isBefore(endDate, today);
              const isActive = !completed && isBefore(startDate, today) && isAfter(endDate, today);
              const progress = stepProgress[step.id];
              
              // Calculate position
              const startOffset = differenceInDays(startDate, projectStartDate);
              const duration = differenceInDays(endDate, startDate);
              const totalDuration = timelineData.totalDays;
              const leftPercent = (startOffset / totalDuration) * 100;
              const widthPercent = Math.max((duration / totalDuration) * 100, 2);

              return (
                <div key={step.id} className="flex items-center gap-2 py-1.5 min-w-[800px] group">
                  {/* Step name */}
                  <div className="w-40 flex-shrink-0 text-sm truncate pr-2">
                    <div className="flex items-center gap-1">
                      {completed && <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />}
                      <span className={cn(completed && "text-muted-foreground line-through", "text-xs")}>
                        {step.title.length > 20 ? step.title.substring(0, 20) + '...' : step.title}
                      </span>
                    </div>
                  </div>
                  
                  {/* Date Pickers */}
                  {onUpdateStepDates && (
                    <div className="flex items-center gap-1 w-44 flex-shrink-0">
                      <StepDatePicker
                        label="Inizio"
                        date={progress?.plannedStartDate || undefined}
                        onDateChange={(date) => 
                          onUpdateStepDates(step.id, date, progress?.plannedEndDate || undefined)
                        }
                        minDate={projectStartDate || undefined}
                        maxDate={progress?.plannedEndDate ? parseISO(progress.plannedEndDate) : undefined}
                      />
                      <span className="text-muted-foreground text-xs">→</span>
                      <StepDatePicker
                        label="Fine"
                        date={progress?.plannedEndDate || undefined}
                        onDateChange={(date) => 
                          onUpdateStepDates(step.id, progress?.plannedStartDate || undefined, date)
                        }
                        minDate={progress?.plannedStartDate ? parseISO(progress.plannedStartDate) : projectStartDate || undefined}
                      />
                      {hasCustomDates && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1">
                          <Edit2 className="h-2.5 w-2.5" />
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Gantt bar */}
                  <div className="flex-1 h-8 bg-muted/30 rounded relative">
                    <div
                      className={cn(
                        "absolute h-full rounded flex items-center justify-end pr-2 text-xs font-medium text-white transition-all",
                        completed && "bg-success",
                        isLate && "bg-destructive",
                        isActive && "bg-primary",
                        !completed && !isLate && !isActive && "bg-primary/60",
                        hasCustomDates && "ring-2 ring-primary/30 ring-offset-1"
                      )}
                      style={{
                        left: `${Math.max(0, leftPercent)}%`,
                        width: `${widthPercent}%`,
                        minWidth: '50px',
                      }}
                    >
                      {cost > 0 && (
                        <span className="text-[10px] opacity-90">
                          €{cost.toLocaleString('it-IT')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-success" />
              <span className="text-muted-foreground">Completato</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="text-muted-foreground">In corso</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary/60" />
              <span className="text-muted-foreground">Pianificato</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-destructive" />
              <span className="text-muted-foreground">In ritardo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Distribution by Month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuzione Costi nel Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(timelineData.costByMonth).map(([monthKey, cost]) => {
              const percentage = (cost / timelineData.totalCost) * 100;
              return (
                <div key={monthKey} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {format(parseISO(monthKey + '-01'), 'MMMM yyyy', { locale: it })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        €{cost.toLocaleString('it-IT')}
                      </Badge>
                      <span className="text-muted-foreground text-xs w-12 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
