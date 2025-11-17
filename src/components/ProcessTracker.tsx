import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  CloudOff
} from "lucide-react";
import { processSteps, phases, type ProcessStep } from "@/data/processSteps";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useStepProgress } from "@/hooks/useStepProgress";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { NotificationSettingsDialog } from "@/components/NotificationSettingsDialog";

export const ProcessTracker = () => {
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | undefined>();
  const { stepProgress, loading, updateProgress } = useStepProgress(userId);
  const { settings: notificationSettings, updateSetting, deleteSetting } = useNotificationSettings(userId);

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

  const filteredSteps = selectedPhase
    ? processSteps.filter(step => step.phase === selectedPhase)
    : processSteps;

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
      {/* Sync Status */}
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
                      {step.costs && (
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
    </div>
  );
};
