import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  AlertCircle,
  Calendar,
  Euro,
  ListChecks,
  Cloud,
  CloudOff,
  ExternalLink,
  TrendingUp,
  Calculator,
  Wallet,
  Download,
  CalendarDays,
  Play,
  Flag
} from "lucide-react";
import { processSteps, phases, type ProcessStep } from "@/data/processSteps";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useStepProgress } from "@/hooks/useStepProgress";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { NotificationSettingsDialog } from "@/components/NotificationSettingsDialog";
import { StepCostDetails } from "@/components/StepCostDetails";
import { stepCostsData, costCategoryLabels, StepCostCategory } from "@/types/stepCosts";
import { useStepCosts } from "@/hooks/useStepCosts";
import { useExportProcessCostsPDF } from "@/hooks/useExportProcessCostsPDF";
import { ProcessGanttTimeline } from "@/components/ProcessGanttTimeline";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface ProcessTrackerProps {
  projectId?: string | null;
  commodityType?: string | null;
  projectName?: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  onUpdateProjectStartDate?: (date: Date | null) => void;
  onUpdateProjectEndDate?: (date: Date | null) => void;
}

export const ProcessTracker = ({ 
  projectId, 
  commodityType, 
  projectName = 'Progetto',
  projectStartDate,
  projectEndDate,
  onUpdateProjectStartDate,
  onUpdateProjectEndDate,
}: ProcessTrackerProps) => {
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | undefined>();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const { stepProgress, loading, updateProgress } = useStepProgress({
    userId,
    projectId: projectId ?? null,
  });
  const { settings: notificationSettings, updateSetting, deleteSetting } = useNotificationSettings(userId);
  const { getStepTotal, getCostAmount } = useStepCosts(projectId ?? null);
  const { exportToPDF } = useExportProcessCostsPDF();
  const parsedStartDate = projectStartDate ? parseISO(projectStartDate) : null;
  const parsedEndDate = projectEndDate ? parseISO(projectEndDate) : null;

  const handleExportPDF = () => {
    exportToPDF(projectName, commodityType ?? null, getCostAmount);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (onUpdateProjectStartDate) {
      onUpdateProjectStartDate(date || null);
    }
    setStartDateOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (onUpdateProjectEndDate) {
      onUpdateProjectEndDate(date || null);
    }
    setEndDateOpen(false);
  };

  // Calculate total costs by category across all visible steps
  const costSummary = useMemo(() => {
    const visibleStepIds = processSteps
      .filter(step => {
        if (!step.commodityType || step.commodityType === 'all') return true;
        if (!commodityType) return true;
        if (commodityType === 'dual-fuel') return true;
        if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
        if (commodityType === 'solo-gas') return step.commodityType === 'solo-gas';
        return true;
      })
      .map(s => s.id);

    let grandTotal = 0;
    const byCategory: Record<StepCostCategory, number> = {
      licenze: 0,
      consulenza: 0,
      burocrazia: 0,
      software: 0,
      garanzie: 0,
      formazione: 0,
      personale: 0,
      infrastruttura: 0,
      altro: 0,
    };

    visibleStepIds.forEach(stepId => {
      const stepData = stepCostsData[stepId];
      if (stepData) {
        stepData.items.forEach(item => {
          const amount = getCostAmount(stepId, item.id);
          grandTotal += amount;
          byCategory[item.category] += amount;
        });
      }
    });

    // Get non-zero categories sorted by value
    const topCategories = Object.entries(byCategory)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const stepsWithCosts = visibleStepIds.filter(id => stepCostsData[id]).length;

    return { grandTotal, byCategory, topCategories, stepsWithCosts };
  }, [commodityType, getCostAmount]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev =>
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const toggleStepCompletion = (stepId: string) => {
    const current = stepProgress[stepId] || {
      stepId,
      completed: false,
      notes: '',
      checklistProgress: []
    };
    
    updateProgress(stepId, {
      completed: !current.completed,
      completionDate: !current.completed ? new Date().toISOString() : undefined
    });
  };

  const updateChecklistItem = (stepId: string, index: number, checked: boolean) => {
    const current = stepProgress[stepId] || {
      stepId,
      completed: false,
      notes: '',
      checklistProgress: []
    };
    
    const newChecklist = [...current.checklistProgress];
    newChecklist[index] = checked;
    
    updateProgress(stepId, {
      checklistProgress: newChecklist
    });
  };

  const updateNotes = (stepId: string, notes: string) => {
    updateProgress(stepId, { notes });
  };

  const updateStepDates = (stepId: string, startDate?: string, endDate?: string) => {
    updateProgress(stepId, {
      plannedStartDate: startDate,
      plannedEndDate: endDate,
    });
  };

  const getCategoryColor = (category: ProcessStep['category']) => {
    const colors = {
      legal: 'bg-primary/10 text-primary border-primary/20',
      administrative: 'bg-accent/10 text-accent border-accent/20',
      technical: 'bg-warning/10 text-warning border-warning/20',
      operational: 'bg-success/10 text-success border-success/20',
      commercial: 'bg-primary-glow/10 text-primary-glow border-primary-glow/20'
    };
    return colors[category];
  };

  // Filter steps based on commodity type
  const filterStepByCommodity = (step: ProcessStep): boolean => {
    if (!step.commodityType || step.commodityType === 'all') return true;
    if (!commodityType) return true; // Show all if project has no type set
    
    // dual-fuel includes both luce and gas steps
    if (commodityType === 'dual-fuel') return true;
    
    // solo-luce: show steps with 'solo-luce' or no commodity type
    if (commodityType === 'solo-luce') {
      return step.commodityType === 'solo-luce';
    }
    
    // solo-gas: show steps with 'solo-gas' or no commodity type
    if (commodityType === 'solo-gas') {
      return step.commodityType === 'solo-gas';
    }
    
    return true;
  };

  const filteredSteps = processSteps
    .filter(filterStepByCommodity)
    .filter(step => selectedPhase === null || step.phase === selectedPhase);

  const getStepChecklistProgress = (step: ProcessStep) => {
    const progress = stepProgress[step.id];
    if (!progress) return 0;
    const completed = progress.checklistProgress.filter(Boolean).length;
    return (completed / step.checklist.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Caricamento progressi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sync Status and Start Date */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {userId ? (
            <>
              <Cloud className="h-4 w-4 text-success" />
              <span>Sincronizzazione automatica attiva</span>
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4 text-warning" />
              <span>Accedi per salvare i progressi</span>
            </>
          )}
        </div>

        {/* Project Date Pickers */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Start Date */}
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Inizio:</span>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 font-normal",
                    !parsedStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  {parsedStartDate ? (
                    format(parsedStartDate, "d MMM yyyy", { locale: it })
                  ) : (
                    "Imposta"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={parsedStartDate || undefined}
                  onSelect={handleStartDateSelect}
                  disabled={(date) => parsedEndDate ? date > parsedEndDate : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date / Due Date */}
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Target:</span>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 font-normal",
                    !parsedEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  {parsedEndDate ? (
                    format(parsedEndDate, "d MMM yyyy", { locale: it })
                  ) : (
                    "Imposta"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={parsedEndDate || undefined}
                  onSelect={handleEndDateSelect}
                  disabled={(date) => parsedStartDate ? date < parsedStartDate : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Phase Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedPhase === null ? "default" : "outline"}
          onClick={() => setSelectedPhase(null)}
          size="sm"
        >
          Tutte le Fasi
        </Button>
        {phases.map(phase => (
          <Button
            key={phase.id}
            variant={selectedPhase === phase.id ? "default" : "outline"}
            onClick={() => setSelectedPhase(phase.id)}
            size="sm"
          >
            Fase {phase.id}: {phase.name}
          </Button>
        ))}
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {filteredSteps.map((step, index) => {
          const isExpanded = expandedSteps.includes(step.id);
          const progress = stepProgress[step.id];
          const isCompleted = progress?.completed || false;
          const checklistProgress = getStepChecklistProgress(step);

          return (
            <Card
              key={step.id}
              className={cn(
                "overflow-hidden transition-all shadow-custom-lg",
                isCompleted && "border-success/50 bg-success/5"
              )}
            >
              {/* Step Header */}
              <div
                className="p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleStep(step.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            Fase {step.phase}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", getCategoryColor(step.category))}>
                            {step.category}
                          </Badge>
                          {step.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              Alta Priorità
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStep(step.id);
                        }}
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>

                    {/* Quick Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{step.estimatedDays} giorni</span>
                      </div>
                      {stepCostsData[step.id] && (
                        <div className="flex items-center gap-1">
                          <Euro className="h-4 w-4" />
                          <span>€{getStepTotal(step.id).toLocaleString('it-IT')}</span>
                        </div>
                      )}
                      {!stepCostsData[step.id] && step.costs && (
                        <div className="flex items-center gap-1">
                          <Euro className="h-4 w-4" />
                          <span>€{step.costs.min.toLocaleString()} - €{step.costs.max.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <ListChecks className="h-4 w-4" />
                        <span>{step.checklist.length} attività</span>
                      </div>
                    </div>

                    {/* Checklist Progress */}
                    {checklistProgress > 0 && (
                      <div className="mt-3">
                        <Progress value={checklistProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(checklistProgress)}% checklist completata
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t bg-muted/20 p-6 space-y-6">
                  {/* Cost Details */}
                  {stepCostsData[step.id] && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Euro className="h-5 w-5 text-primary" />
                        Dettaglio Costi
                      </h4>
                      <StepCostDetails 
                        stepId={step.id} 
                        projectId={projectId ?? null} 
                      />
                    </div>
                  )}

                  {/* Checklist */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-primary" />
                      Checklist Operativa
                    </h4>
                    <div className="space-y-2">
                      {step.checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-background/50">
                          <Checkbox
                            checked={progress?.checklistProgress[idx] || false}
                            onCheckedChange={(checked) =>
                              updateChecklistItem(step.id, idx, checked as boolean)
                            }
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {item}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Documenti Necessari
                    </h4>
                    <ul className="space-y-1">
                      {step.documents.map((doc, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Notes */}
                  {step.notes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-primary" />
                        Note Importanti
                      </h4>
                      <ul className="space-y-2">
                        {step.notes.map((note, idx) => (
                          <li key={idx} className="text-sm bg-primary/5 p-3 rounded-lg border border-primary/10">
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Official Links */}
                  {step.officialLinks && step.officialLinks.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        Link Portali Ufficiali
                      </h4>
                      <div className="grid gap-2">
                        {step.officialLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
                          >
                            <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                {link.name}
                              </p>
                              {link.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {link.description}
                                </p>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* User Notes */}
                  <div>
                    <h4 className="font-semibold mb-3">Note Personali</h4>
                    <Textarea
                      placeholder="Aggiungi le tue note, osservazioni o dettagli specifici per questo step..."
                      value={progress?.notes || ''}
                      onChange={(e) => updateNotes(step.id, e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* Notification Settings & Complete Button */}
                  <div className="pt-4 border-t space-y-3">
                    <NotificationSettingsDialog
                      step={step}
                      setting={notificationSettings?.[step.id]}
                      onUpdateSetting={updateSetting}
                      onDeleteSetting={deleteSetting}
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStepCompletion(step.id);
                      }}
                      variant={isCompleted ? "outline" : "default"}
                      className="w-full"
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Completato
                        </>
                      ) : (
                        <>
                          <Circle className="mr-2 h-4 w-4" />
                          Segna come Completato
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Cost Summary Card - Now at the bottom */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20 shadow-custom-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Riepilogo Costi di Avvio
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Esporta PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Investimento Totale Stimato</p>
              <p className="text-3xl font-bold text-primary">
                €{costSummary.grandTotal.toLocaleString('it-IT')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Step con costi</p>
              <p className="text-xl font-semibold">{costSummary.stepsWithCosts}</p>
            </div>
          </div>

          {costSummary.topCategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Principali Categorie di Spesa
              </p>
              <div className="space-y-2">
                {costSummary.topCategories.map(([category, amount]) => {
                  const config = costCategoryLabels[category as StepCostCategory];
                  const percentage = (amount / costSummary.grandTotal) * 100;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn("font-medium", config.color)}>
                          {config.label}
                        </span>
                        <span className="font-mono">
                          €{amount.toLocaleString('it-IT')}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-2 border-t">
            <Calculator className="h-3 w-3 inline mr-1" />
            I costi sono stime indicative e possono variare in base alle specifiche esigenze del progetto.
          </p>
        </CardContent>
      </Card>

      {/* Gantt Timeline - At the very bottom */}
      <ProcessGanttTimeline
        projectStartDate={parsedStartDate}
        projectEndDate={parsedEndDate}
        stepProgress={Object.fromEntries(
          Object.entries(stepProgress).map(([key, value]) => [
            key,
            {
              completed: value.completed,
              plannedStartDate: value.plannedStartDate,
              plannedEndDate: value.plannedEndDate,
            }
          ])
        )}
        commodityType={commodityType ?? null}
        getCostAmount={getCostAmount}
        onUpdateStepDates={updateStepDates}
      />
    </div>
  );
};
