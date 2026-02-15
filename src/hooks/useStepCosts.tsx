import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { stepCostsData, StepCostItem } from '@/types/stepCosts';

interface ProjectStepCost {
  id: string;
  project_id: string;
  step_id: string;
  cost_item_id: string;
  amount: number;
  notes: string | null;
}

export const useStepCosts = (projectId: string | null) => {
  const [customCosts, setCustomCosts] = useState<Record<string, Record<string, number>>>({});
  const [customNotes, setCustomNotes] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch custom costs from database
  const fetchCosts = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('project_step_costs')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching step costs:', error);
      setLoading(false);
      return;
    }

    // Organize costs by step_id -> cost_item_id -> amount
    const costsMap: Record<string, Record<string, number>> = {};
    const notesMap: Record<string, Record<string, string>> = {};

    (data as ProjectStepCost[]).forEach(cost => {
      if (!costsMap[cost.step_id]) {
        costsMap[cost.step_id] = {};
      }
      costsMap[cost.step_id][cost.cost_item_id] = cost.amount;

      if (cost.notes) {
        if (!notesMap[cost.step_id]) {
          notesMap[cost.step_id] = {};
        }
        notesMap[cost.step_id][cost.cost_item_id] = cost.notes;
      }
    });

    setCustomCosts(costsMap);
    setCustomNotes(notesMap);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Realtime subscription to detect changes from other components (e.g. Processo -> Liquidità)
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`step-costs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_step_costs',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchCosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchCosts]);

  // Get the effective amount for a cost item (custom or default)
  const getCostAmount = useCallback((stepId: string, costItemId: string): number => {
    // Check for custom amount first
    if (customCosts[stepId]?.[costItemId] !== undefined) {
      return customCosts[stepId][costItemId];
    }

    // Fall back to default amount
    const stepData = stepCostsData[stepId];
    if (!stepData) return 0;

    const item = stepData.items.find(i => i.id === costItemId);
    return item?.defaultAmount ?? 0;
  }, [customCosts]);

  // Get the note for a cost item
  const getCostNote = useCallback((stepId: string, costItemId: string): string | null => {
    return customNotes[stepId]?.[costItemId] ?? null;
  }, [customNotes]);

  // Check if a cost has been customized
  const isCustomized = useCallback((stepId: string, costItemId: string): boolean => {
    return customCosts[stepId]?.[costItemId] !== undefined;
  }, [customCosts]);

  // Save or update a cost
  const saveCost = async (stepId: string, costItemId: string, amount: number, notes?: string) => {
    if (!projectId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Errore',
        description: 'Devi essere autenticato per modificare i costi',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('project_step_costs')
      .upsert({
        project_id: projectId,
        step_id: stepId,
        cost_item_id: costItemId,
        amount,
        notes: notes || null,
        created_by: user.id,
      }, {
        onConflict: 'project_id,step_id,cost_item_id',
      });

    if (error) {
      console.error('Error saving cost:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il costo',
        variant: 'destructive',
      });
      return false;
    }

    // Update local state
    setCustomCosts(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [costItemId]: amount,
      },
    }));

    if (notes) {
      setCustomNotes(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          [costItemId]: notes,
        },
      }));
    }

    toast({
      title: 'Costo salvato',
      description: 'Il costo personalizzato è stato salvato',
    });

    return true;
  };

  // Reset a cost to default
  const resetCost = async (stepId: string, costItemId: string) => {
    if (!projectId) return false;

    const { error } = await supabase
      .from('project_step_costs')
      .delete()
      .eq('project_id', projectId)
      .eq('step_id', stepId)
      .eq('cost_item_id', costItemId);

    if (error) {
      console.error('Error resetting cost:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile ripristinare il costo',
        variant: 'destructive',
      });
      return false;
    }

    // Update local state
    setCustomCosts(prev => {
      const newCosts = { ...prev };
      if (newCosts[stepId]) {
        delete newCosts[stepId][costItemId];
        if (Object.keys(newCosts[stepId]).length === 0) {
          delete newCosts[stepId];
        }
      }
      return newCosts;
    });

    setCustomNotes(prev => {
      const newNotes = { ...prev };
      if (newNotes[stepId]) {
        delete newNotes[stepId][costItemId];
        if (Object.keys(newNotes[stepId]).length === 0) {
          delete newNotes[stepId];
        }
      }
      return newNotes;
    });

    toast({
      title: 'Costo ripristinato',
      description: 'Il costo è stato riportato al valore predefinito',
    });

    return true;
  };

  // Calculate total for a step
  const getStepTotal = useCallback((stepId: string): number => {
    const stepData = stepCostsData[stepId];
    if (!stepData) return 0;

    return stepData.items.reduce((total, item) => {
      return total + getCostAmount(stepId, item.id);
    }, 0);
  }, [getCostAmount]);

  // Calculate grand total for all steps
  const getGrandTotal = useCallback((): number => {
    return Object.keys(stepCostsData).reduce((total, stepId) => {
      return total + getStepTotal(stepId);
    }, 0);
  }, [getStepTotal]);

  return {
    loading,
    getCostAmount,
    getCostNote,
    isCustomized,
    saveCost,
    resetCost,
    getStepTotal,
    getGrandTotal,
    refetch: fetchCosts,
  };
};
