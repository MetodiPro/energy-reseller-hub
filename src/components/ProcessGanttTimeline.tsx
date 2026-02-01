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
  Flag,
  TrendingUp,
  TrendingDown
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

  // Calculate timeline data
  const timelineData = useMemo(() => {
    if (!projectStartDate) return null;

    let currentDate = projectStartDate;
    const stepsWithDates: Array<{
      step: ProcessStep;
      startDate: Date;
      endDate: Date;
      cost: number;
      completed: boolean;
      hasCustomDates: boolean;
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

      if (hasCustomDates) {
        startDate = parseISO(progress.plannedStartDate!);
        endDate = parseISO(progress.plannedEndDate!);
      } else {
        startDate = currentDate;
        endDate = addDays(currentDate, step.estimatedDays);
        currentDate = endDate;
      }

      stepsWithDates.push({
        step,
        startDate,
        endDate,
        cost: stepCost,
        completed: progress?.completed || false,
        hasCustomDates,
      });

      if (!hasCustomDates) {
        currentDate = endDate;
      }
    });

    // Calculate totals
    const totalDays = differenceInDays(
      stepsWithDates[stepsWithDates.length - 1]?.endDate || projectStartDate,
      projectStartDate
    );
    const totalCost = stepsWithDates.reduce((sum, s) => sum + s.cost, 0);
    const completedSteps = stepsWithDates.filter(s => s.completed).length;

    // Cost by month
    const costByMonth: Record<string, number> = {};
    stepsWithDates.forEach(({ startDate, cost }) => {
      const monthKey = format(startDate, 'yyyy-MM');
      costByMonth[monthKey] = (costByMonth[monthKey] || 0) + cost;
    });

    return {
      steps: stepsWithDates,
      totalDays,
      totalCost,
      completedSteps,
      costByMonth,
      projectEndDate: stepsWithDates[stepsWithDates.length - 1]?.endDate || projectStartDate,
    };
  }, [projectStartDate, visibleSteps, stepProgress, getCostAmount]);

  if (!projectStartDate) {
    return (
      <Card className="border-dashed border-warning/50 bg-warning/5">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
          <p className="text-muted-foreground">
            Imposta una data di inizio progetto per visualizzare la timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!timelineData) return null;

  const today = new Date();
  
  // Calculate difference between target and estimated end dates
  const daysMargin = projectEndDate 
    ? differenceInDays(projectEndDate, timelineData.projectEndDate) 
    : null;
  const isOnTrack = daysMargin === null || daysMargin >= 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span>Durata Stimata</span>
            </div>
            <p className="text-2xl font-bold mt-1">{timelineData.totalDays} giorni</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              <span>Fine Stimata</span>
            </div>
            <p className="text-lg font-bold mt-1">
              {format(timelineData.projectEndDate, 'd MMM yyyy', { locale: it })}
            </p>
          </CardContent>
        </Card>

        {/* Target Date Card */}
        <Card className={cn(
          projectEndDate && !isOnTrack && "border-destructive/50 bg-destructive/5"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Flag className={cn("h-4 w-4", projectEndDate ? "text-primary" : "")} />
              <span>Target</span>
            </div>
            {projectEndDate ? (
              <div>
                <p className="text-lg font-bold mt-1">
                  {format(projectEndDate, 'd MMM yyyy', { locale: it })}
                </p>
                {daysMargin !== null && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs mt-1",
                    isOnTrack ? "text-success" : "text-destructive"
                  )}>
                    {isOnTrack ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        <span>+{daysMargin} giorni di margine</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        <span>{Math.abs(daysMargin)} giorni in ritardo</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Non impostato</p>
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
