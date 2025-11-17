import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StepProgress {
  stepId: string;
  completed: boolean;
  notes: string;
  checklistProgress: boolean[];
  startDate?: string;
  completionDate?: string;
}

export const useStepProgress = (userId: string | undefined) => {
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
      try {
        const { data, error } = await supabase
          .from("step_progress")
          .select("*")
          .eq("user_id", userId);

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
          };
        });

        setStepProgress(progressMap);
      } catch (error: any) {
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
    const channel = supabase
      .channel("step_progress_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "step_progress",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const item = payload.new as any;
            setStepProgress((prev) => ({
              ...prev,
              [item.step_id]: {
                stepId: item.step_id,
                completed: item.completed || false,
                notes: item.notes || "",
                checklistProgress: (item.checklist_progress as boolean[]) || [],
                startDate: item.start_date || undefined,
                completionDate: item.completion_date || undefined,
              },
            }));
          } else if (payload.eventType === "DELETE") {
            const item = payload.old as any;
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
  }, [userId, toast]);

  // Save progress to database
  const saveProgress = async (stepId: string, progress: StepProgress) => {
    if (!userId) return;

    try {
      const { error } = await supabase.from("step_progress").upsert({
        user_id: userId,
        step_id: stepId,
        completed: progress.completed,
        notes: progress.notes,
        checklist_progress: progress.checklistProgress,
        start_date: progress.startDate,
        completion_date: progress.completionDate,
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Errore nel salvataggio",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProgress = (stepId: string, updates: Partial<StepProgress>) => {
    const current = stepProgress[stepId] || {
      stepId,
      completed: false,
      notes: "",
      checklistProgress: [],
    };

    const updated = { ...current, ...updates };
    setStepProgress((prev) => ({ ...prev, [stepId]: updated }));
    saveProgress(stepId, updated);
  };

  return { stepProgress, loading, updateProgress };
};
