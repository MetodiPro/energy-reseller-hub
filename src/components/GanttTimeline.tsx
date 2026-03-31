import { useMemo } from 'react';
import { useStepAssignments } from '@/hooks/useStepAssignments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { processSteps, phases } from '@/data/processSteps';
import { format, addDays, differenceInDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Clock, Calendar, UserCircle } from 'lucide-react';
import type { StepProgress } from '@/hooks/useStepProgress';

interface GanttTimelineProps {
  stepProgress: Record<string, StepProgress>;
  projectStartDate?: string;
  goLiveDate?: string;
  projectId?: string | null;
}

interface PhaseData {
  id: number;
  name: string;
  estimatedStart: Date;
  estimatedEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  progress: number;
  isDelayed: boolean;
  steps: {
    id: string;
    title: string;
    estimatedDays: number;
    started: boolean;
    completed: boolean;
    startDate: Date | null;
    completionDate: Date | null;
  }[];
}

const phaseColors: Record<number, { bg: string; fill: string; text: string }> = {
  1: { bg: 'bg-blue-100', fill: 'bg-blue-500', text: 'text-blue-700' },
  2: { bg: 'bg-green-100', fill: 'bg-green-500', text: 'text-green-700' },
  3: { bg: 'bg-purple-100', fill: 'bg-purple-500', text: 'text-purple-700' },
  4: { bg: 'bg-orange-100', fill: 'bg-orange-500', text: 'text-orange-700' },
  5: { bg: 'bg-pink-100', fill: 'bg-pink-500', text: 'text-pink-700' },
  6: { bg: 'bg-teal-100', fill: 'bg-teal-500', text: 'text-teal-700' },
  7: { bg: 'bg-indigo-100', fill: 'bg-indigo-500', text: 'text-indigo-700' },
};

export const GanttTimeline = ({ stepProgress, projectStartDate, goLiveDate, projectId }: GanttTimelineProps) => {
  const { getAssigneeName } = useStepAssignments(projectId ?? null);

  const timeline = useMemo(() => {
    const baseStartDate = projectStartDate 
      ? parseISO(projectStartDate) 
      : startOfDay(new Date());

    const projectEndDate = goLiveDate
      ? parseISO(goLiveDate)
      : null;

    // Calculate total estimated days for proportional distribution
    const totalEstimatedDays = phases.reduce((sum, phase) => {
      const phaseSteps = processSteps.filter(s => s.phase === phase.id);
      return sum + phaseSteps.reduce((s, step) => s + step.estimatedDays, 0);
    }, 0);

    // Use project date range if both dates are set, otherwise fall back to estimated days
    const totalProjectDays = projectEndDate
      ? differenceInDays(projectEndDate, baseStartDate)
      : totalEstimatedDays;

    let cumulativeDays = 0;
    const phaseData: PhaseData[] = [];

    phases.forEach((phase) => {
      const phaseSteps = processSteps.filter(s => s.phase === phase.id);
      const phaseDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);

      // Proportionally distribute phase within the actual project date range
      const phaseStartOffset = totalEstimatedDays > 0
        ? Math.round((cumulativeDays / totalEstimatedDays) * totalProjectDays)
        : 0;
      const phaseEndOffset = totalEstimatedDays > 0
        ? Math.round(((cumulativeDays + phaseDays) / totalEstimatedDays) * totalProjectDays)
        : 0;

      const estimatedStart = addDays(baseStartDate, phaseStartOffset);
      const estimatedEnd = addDays(baseStartDate, phaseEndOffset);

      // Calculate actual dates from progress
      let actualStart: Date | null = null;
      let actualEnd: Date | null = null;
      let completedSteps = 0;

      const stepsData = phaseSteps.map(step => {
        const progress = stepProgress[step.id];
        const started = !!progress?.startDate;
        const completed = !!progress?.completed;
        const startDate = progress?.startDate ? parseISO(progress.startDate) : null;
        const completionDate = progress?.completionDate ? parseISO(progress.completionDate) : null;

        if (startDate && (!actualStart || isBefore(startDate, actualStart))) {
          actualStart = startDate;
        }
        if (completionDate && (!actualEnd || isAfter(completionDate, actualEnd))) {
          actualEnd = completionDate;
        }
        if (completed) completedSteps++;

        return {
          id: step.id,
          title: step.title,
          estimatedDays: step.estimatedDays,
          started,
          completed,
          startDate,
          completionDate,
        };
      });

      const progressPercent = phaseSteps.length > 0 ? (completedSteps / phaseSteps.length) * 100 : 0;

      // Determine if delayed
      const isDelayed = actualEnd 
        ? isAfter(actualEnd, estimatedEnd) 
        : (actualStart && isAfter(new Date(), estimatedEnd) && progressPercent < 100);

      phaseData.push({
        id: phase.id,
        name: phase.name,
        estimatedStart,
        estimatedEnd,
        actualStart,
        actualEnd,
        progress: progressPercent,
        isDelayed: !!isDelayed,
        steps: stepsData,
      });

      cumulativeDays += phaseDays;
    });

    return {
      phases: phaseData,
      totalDays: cumulativeDays,
      projectEnd: addDays(baseStartDate, cumulativeDays),
      baseStartDate,
    };
  }, [stepProgress, projectStartDate]);

  const today = startOfDay(new Date());
  const overallProgress = useMemo(() => {
    const totalSteps = processSteps.length;
    const completedSteps = Object.values(stepProgress).filter(p => p.completed).length;
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  }, [stepProgress]);

  const daysToGoLive = goLiveDate 
    ? differenceInDays(parseISO(goLiveDate), today) 
    : null;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inizio Stimato</p>
                <p className="font-semibold">{format(timeline.baseStartDate, 'dd MMM yyyy', { locale: it })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fine Stimata</p>
                <p className="font-semibold">{format(timeline.projectEnd, 'dd MMM yyyy', { locale: it })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durata Totale</p>
                <p className="font-semibold">{timeline.totalDays} giorni</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {daysToGoLive !== null && (
          <Card className={cn(daysToGoLive < 0 ? 'border-destructive' : daysToGoLive <= 30 ? 'border-warning' : '')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  daysToGoLive < 0 ? 'bg-destructive/10' : daysToGoLive <= 30 ? 'bg-warning/10' : 'bg-primary/10'
                )}>
                  {daysToGoLive < 0 ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Calendar className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Go-Live</p>
                  <p className={cn("font-semibold", daysToGoLive < 0 && "text-destructive")}>
                    {daysToGoLive < 0 ? `${Math.abs(daysToGoLive)} giorni fa` : `${daysToGoLive} giorni`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Avanzamento Globale</span>
            <span className="text-sm text-muted-foreground">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Timeline Fasi Progetto
          </CardTitle>
          <CardDescription>
            Visualizzazione temporale con date stimate vs reali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="space-y-4">
              {timeline.phases.map((phase) => {
                const colors = phaseColors[phase.id] || phaseColors[1];
                const daysDuration = differenceInDays(phase.estimatedEnd, phase.estimatedStart);
                
                return (
                  <div key={phase.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={cn(colors.bg, colors.text, 'border-0')}>
                          Fase {phase.id}
                        </Badge>
                        <span className="font-medium text-sm">{phase.name}</span>
                        {phase.isDelayed && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Ritardo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{format(phase.estimatedStart, 'dd/MM', { locale: it })} - {format(phase.estimatedEnd, 'dd/MM', { locale: it })}</span>
                        <span className="font-medium">{daysDuration} gg</span>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn("relative h-8 rounded-lg overflow-hidden", colors.bg)}>
                          {/* Estimated bar */}
                          <div 
                            className={cn("absolute inset-y-0 left-0 opacity-30", colors.fill)}
                            style={{ width: '100%' }}
                          />
                          
                          {/* Actual progress bar */}
                          <div 
                            className={cn("absolute inset-y-0 left-0 transition-all", colors.fill)}
                            style={{ width: `${phase.progress}%` }}
                          />

                          {/* Progress label */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-medium text-white drop-shadow">
                              {Math.round(phase.progress)}% completato
                            </span>
                          </div>

                          {/* Today marker */}
                          {isAfter(today, phase.estimatedStart) && isBefore(today, phase.estimatedEnd) && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                              style={{ 
                                left: `${(differenceInDays(today, phase.estimatedStart) / daysDuration) * 100}%` 
                              }}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-xs">
                          <p><strong>Fase {phase.id}:</strong> {phase.name}</p>
                          <p>Stimato: {format(phase.estimatedStart, 'dd/MM/yyyy', { locale: it })} - {format(phase.estimatedEnd, 'dd/MM/yyyy', { locale: it })}</p>
                          {phase.actualStart && (
                            <p>Reale: {format(phase.actualStart, 'dd/MM/yyyy', { locale: it })} - {phase.actualEnd ? format(phase.actualEnd, 'dd/MM/yyyy', { locale: it }) : 'In corso'}</p>
                          )}
                          <p>Step completati: {phase.steps.filter(s => s.completed).length}/{phase.steps.length}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Steps breakdown */}
                    <div className="flex gap-1 ml-4">
                      {phase.steps.map((step) => (
                        <Tooltip key={step.id}>
                          <TooltipTrigger asChild>
                            <div 
                              className={cn(
                                "h-2 rounded-full transition-colors cursor-pointer",
                                step.completed ? colors.fill : step.started ? 'bg-warning' : 'bg-muted'
                              )}
                              style={{ flex: step.estimatedDays }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p className="font-medium">{step.title}</p>
                              <p>{step.estimatedDays} giorni stimati</p>
                              <p>
                                {step.completed ? '✓ Completato' : step.started ? '⏳ In corso' : '○ Non iniziato'}
                              </p>
                              {getAssigneeName(step.id) && (
                                <p className="flex items-center gap-1 mt-0.5">
                                  <UserCircle className="h-3 w-3" />
                                  {getAssigneeName(step.id)}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Completato</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-warning" />
              <span>In corso</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted" />
              <span>Non iniziato</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-destructive" />
              <span>Oggi</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
