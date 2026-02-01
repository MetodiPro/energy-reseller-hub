import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StepProgress {
  stepId: string;
  completed: boolean;
  notes: string;
  checklistProgress: boolean[];
  startDate?: string;
  completionDate?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

interface UseStepProgressOptions {
  userId: string | undefined;
  projectId: string | null;
}

export const useStepProgress = (
  userIdOrOptions: string | undefined | UseStepProgressOptions,
  projectIdArg?: string | null
) => {
  // Support both old signature (userId) and new signature ({ userId, projectId })
  let userId: string | undefined;
  let projectId: string | null;

  if (typeof userIdOrOptions === 'object' && userIdOrOptions !== null && 'userId' in userIdOrOptions) {
    userId = userIdOrOptions.userId;
    projectId = userIdOrOptions.projectId;
  } else if (typeof userIdOrOptions === 'string') {
    userId = userIdOrOptions;
    projectId = projectIdArg ?? null;
  } else {
    userId = undefined;
    projectId = projectIdArg ?? null;
  }

  const [stepProgress, setStepProgress] = useState<Record<string, StepProgress>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load progress from database
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadProgress = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("step_progress")
          .select("*")
          .eq("user_id", userId);

        // If projectId is provided, filter by project
        if (projectId) {
          query = query.eq("project_id", projectId);
        } else {
          // If no project, get progress without project_id (legacy/global progress)
          query = query.is("project_id", null);
        }

        const { data, error } = await query;

        if (error) throw error;

        const progressMap: Record<string, StepProgress> = {};
        data?.forEach((item) => {
          progressMap[item.step_id] = {
            stepId: item.step_id,
            completed: item.completed || false,
            notes: item.notes || "",
            checklistProgress: (item.checklist_progress as boolean[]) || [],
            startDate: item.start_date || undefined,
            completionDate: item.completion_date || undefined,
            plannedStartDate: item.planned_start_date || undefined,
            plannedEndDate: item.planned_end_date || undefined,
          };
        });

        setStepProgress(progressMap);
      } catch (error: any) {
        console.error("Error loading step progress:", error);
        toast({
          title: "Errore nel caricamento",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProgress();

    // Subscribe to realtime updates
    const filterParts = [`user_id=eq.${userId}`];
    if (projectId) {
      filterParts.push(`project_id=eq.${projectId}`);
    }

    const channel = supabase
      .channel(`step_progress_${userId}_${projectId || 'global'}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "step_progress",
          filter: filterParts[0], // Primary filter
        },
        (payload) => {
          const item = payload.new as any || payload.old as any;
          
          // Additional client-side filter for project_id
          if (projectId && item.project_id !== projectId) return;
          if (!projectId && item.project_id !== null) return;

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setStepProgress((prev) => ({
              ...prev,
              [item.step_id]: {
                stepId: item.step_id,
                completed: item.completed || false,
                notes: item.notes || "",
                checklistProgress: (item.checklist_progress as boolean[]) || [],
                startDate: item.start_date || undefined,
                completionDate: item.completion_date || undefined,
                plannedStartDate: item.planned_start_date || undefined,
                plannedEndDate: item.planned_end_date || undefined,
              },
            }));
          } else if (payload.eventType === "DELETE") {
            setStepProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[item.step_id];
              return newProgress;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, projectId, toast]);

  // Save progress to database
  const saveProgress = useCallback(async (stepId: string, progress: StepProgress) => {
    if (!userId) return;

    try {
      const upsertData: any = {
        user_id: userId,
        step_id: stepId,
        completed: progress.completed,
        notes: progress.notes,
        checklist_progress: progress.checklistProgress,
        start_date: progress.startDate,
        completion_date: progress.completionDate,
        planned_start_date: progress.plannedStartDate || null,
        planned_end_date: progress.plannedEndDate || null,
      };

      // Include project_id if provided
      if (projectId) {
        upsertData.project_id = projectId;
      }

      // Determine the conflict columns based on whether we have a project
      // The table has a unique constraint on (user_id, step_id)
      // But we need to handle project-specific progress
      const { error } = await supabase.from("step_progress").upsert(
        upsertData,
        {
          onConflict: "user_id,step_id",
        }
      );

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving step progress:", error);
      toast({
        title: "Errore nel salvataggio",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [userId, projectId, toast]);

  const updateProgress = useCallback((stepId: string, updates: Partial<StepProgress>) => {
    const current = stepProgress[stepId] || {
      stepId,
      completed: false,
      notes: "",
      checklistProgress: [],
    };

    const updated = { ...current, ...updates };
    setStepProgress((prev) => ({ ...prev, [stepId]: updated }));
    saveProgress(stepId, updated);
  }, [stepProgress, saveProgress]);

  return { stepProgress, loading, updateProgress };
};
