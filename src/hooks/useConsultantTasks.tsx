import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { consultantTaskTemplates, type ConsultantTaskTemplate } from '@/data/consultantTasks';

export interface ConsultantTask {
  id: string;
  projectId: string;
  consultantType: 'commercialista' | 'legale' | 'entrambi';
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  estimatedCost: number;
  actualCost: number | null;
  costNotes: string | null;
  isRecurring: boolean;
  recurrencePattern: string | null;
  dueDate: string | null;
  reminderDays: number;
  priority: 'high' | 'medium' | 'low';
  phase: string | null;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const useConsultantTasks = (projectId: string | null) => {
  const [tasks, setTasks] = useState<ConsultantTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch tasks from database
  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('consultant_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setTasks((data || []).map(row => ({
        id: row.id,
        projectId: row.project_id,
        consultantType: row.consultant_type as ConsultantTask['consultantType'],
        category: row.category,
        subcategory: row.subcategory,
        title: row.title,
        description: row.description,
        notes: row.notes,
        isCompleted: row.is_completed || false,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        estimatedCost: Number(row.estimated_cost) || 0,
        actualCost: row.actual_cost ? Number(row.actual_cost) : null,
        costNotes: row.cost_notes,
        isRecurring: row.is_recurring || false,
        recurrencePattern: row.recurrence_pattern,
        dueDate: row.due_date,
        reminderDays: row.reminder_days || 7,
        priority: row.priority as ConsultantTask['priority'],
        phase: row.phase,
        sortOrder: row.sort_order || 0,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })));
    } catch (error: any) {
      console.error('Error fetching consultant tasks:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le attività consulenti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Initialize tasks from templates
  const initializeFromTemplates = useCallback(async (templates: ConsultantTaskTemplate[]) => {
    if (!projectId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const newTasks = templates.map(t => ({
        project_id: projectId,
        consultant_type: t.consultantType,
        category: t.category,
        subcategory: t.subcategory || null,
        title: t.title,
        description: t.description,
        notes: null,
        is_completed: false,
        estimated_cost: t.estimatedCost,
        is_recurring: t.isRecurring,
        recurrence_pattern: t.recurrencePattern,
        reminder_days: t.reminderDays,
        priority: t.priority,
        phase: t.phase,
        sort_order: t.sortOrder,
        created_by: user.id,
      }));

      const { error } = await supabase
        .from('consultant_tasks')
        .insert(newTasks);

      if (error) throw error;

      toast({
        title: 'Attività inizializzate',
        description: `${templates.length} attività caricate con successo`,
      });

      fetchTasks();
    } catch (error: any) {
      console.error('Error initializing tasks:', error);
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [projectId, fetchTasks, toast]);

  // Toggle task completion
  const toggleTaskCompletion = useCallback(async (taskId: string, completed: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const updates: any = {
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? user?.id : null,
      };

      const { error } = await supabase
        .from('consultant_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, isCompleted: completed, completedAt: updates.completed_at, completedBy: updates.completed_by }
          : t
      ));
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Update task
  const updateTask = useCallback(async (taskId: string, updates: Partial<ConsultantTask>) => {
    try {
      const dbUpdates: any = {};
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.actualCost !== undefined) dbUpdates.actual_cost = updates.actualCost;
      if (updates.costNotes !== undefined) dbUpdates.cost_notes = updates.costNotes;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

      const { error } = await supabase
        .from('consultant_tasks')
        .update(dbUpdates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      ));
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Add custom task
  const addTask = useCallback(async (task: Partial<ConsultantTask>) => {
    if (!projectId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('consultant_tasks')
        .insert({
          project_id: projectId,
          consultant_type: task.consultantType || 'commercialista',
          category: task.category || 'Altro',
          subcategory: task.subcategory || null,
          title: task.title || 'Nuova attività',
          description: task.description || null,
          estimated_cost: task.estimatedCost || 0,
          is_recurring: task.isRecurring || false,
          recurrence_pattern: task.recurrencePattern || null,
          due_date: task.dueDate || null,
          reminder_days: task.reminderDays || 7,
          priority: task.priority || 'medium',
          phase: task.phase || 'operational',
          sort_order: tasks.length,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      fetchTasks();
      
      toast({
        title: 'Attività aggiunta',
        description: 'La nuova attività è stata creata',
      });
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [projectId, tasks.length, fetchTasks, toast]);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('consultant_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      toast({
        title: 'Attività eliminata',
        description: 'L\'attività è stata rimossa',
      });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.isCompleted).length,
    pending: tasks.filter(t => !t.isCompleted).length,
    commercialista: tasks.filter(t => t.consultantType === 'commercialista').length,
    legale: tasks.filter(t => t.consultantType === 'legale').length,
    estimatedCostTotal: tasks.reduce((sum, t) => sum + t.estimatedCost, 0),
    actualCostTotal: tasks.reduce((sum, t) => sum + (t.actualCost || 0), 0),
    overdue: tasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < new Date()).length,
  };

  return {
    tasks,
    loading,
    stats,
    initializeFromTemplates,
    toggleTaskCompletion,
    updateTask,
    addTask,
    deleteTask,
    refetch: fetchTasks,
  };
};
