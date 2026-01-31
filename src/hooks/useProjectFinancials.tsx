import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CostCategory {
  id: string;
  name: string;
  type: 'commercial' | 'structural' | 'direct' | 'indirect';
  description: string | null;
  icon: string | null;
  color: string | null;
  is_default: boolean;
}

export interface ProjectCost {
  id: string;
  project_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  amount: number;
  quantity: number;
  unit: string;
  cost_type: 'commercial' | 'structural' | 'direct' | 'indirect';
  is_recurring: boolean;
  recurrence_period: string | null;
  date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: CostCategory;
}

export interface ProjectRevenue {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  amount: number;
  quantity: number;
  unit: string;
  revenue_type: string;
  recurrence_period: string | null;
  date: string | null;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCosts: number;
  passthroughCosts: number;
  operationalCosts: number;
  grossMargin: number;
  grossMarginPercent: number;
  costsByType: {
    commercial: number;
    structural: number;
    direct: number;
    indirect: number;
  };
  netMargin: number;
  netMarginPercent: number;
  contributionMargin: number;
  contributionMarginPercent: number;
}

export const useProjectFinancials = (projectId: string | null) => {
  const [costs, setCosts] = useState<ProjectCost[]>([]);
  const [revenues, setRevenues] = useState<ProjectRevenue[]>([]);
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('cost_categories')
      .select('*')
      .order('type', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    // Cast the data to our interface since the types haven't been regenerated yet
    setCostCategories(data as unknown as CostCategory[]);
  };

  const setCostCategories = (data: CostCategory[]) => {
    setCategories(data);
  };

  const fetchCosts = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('project_costs')
      .select('*, category:cost_categories(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching costs:', error);
      return;
    }

    setCosts(data as unknown as ProjectCost[]);
  };

  const fetchRevenues = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('project_revenues')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching revenues:', error);
      return;
    }

    setRevenues(data as unknown as ProjectRevenue[]);
  };

  const addCost = async (cost: Omit<ProjectCost, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
    const { data, error } = await supabase
      .from('project_costs')
      .insert(cost)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiungere il costo',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Costo aggiunto',
      description: 'La voce di costo è stata salvata',
    });

    await fetchCosts();
    return data;
  };

  const updateCost = async (id: string, updates: Partial<ProjectCost>) => {
    const { error } = await supabase
      .from('project_costs')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il costo',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Costo aggiornato',
      description: 'La voce di costo è stata modificata',
    });

    await fetchCosts();
    return true;
  };

  const deleteCost = async (id: string) => {
    const { error } = await supabase
      .from('project_costs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il costo',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Costo eliminato',
      description: 'La voce di costo è stata rimossa',
    });

    await fetchCosts();
    return true;
  };

  const addRevenue = async (revenue: Omit<ProjectRevenue, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('project_revenues')
      .insert(revenue)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiungere il ricavo',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Ricavo aggiunto',
      description: 'La voce di ricavo è stata salvata',
    });

    await fetchRevenues();
    return data;
  };

  const updateRevenue = async (id: string, updates: Partial<ProjectRevenue>) => {
    const { error } = await supabase
      .from('project_revenues')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il ricavo',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Ricavo aggiornato',
      description: 'La voce di ricavo è stata modificata',
    });

    await fetchRevenues();
    return true;
  };

  const deleteRevenue = async (id: string) => {
    const { error } = await supabase
      .from('project_revenues')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il ricavo',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Ricavo eliminato',
      description: 'La voce di ricavo è stata rimossa',
    });

    await fetchRevenues();
    return true;
  };

  const calculateSummary = (): FinancialSummary => {
    const totalRevenue = revenues.reduce((sum, r) => sum + (r.amount * r.quantity), 0);
    
    // Separate passthrough costs from operational costs
    let passthroughCosts = 0;
    let operationalCosts = 0;
    
    const costsByType = {
      commercial: 0,
      structural: 0,
      direct: 0,
      indirect: 0,
    };

    costs.forEach(cost => {
      const total = cost.amount * cost.quantity;
      
      // Check if cost is passthrough (from database field)
      const isPassthrough = (cost as any).is_passthrough === true;
      
      if (isPassthrough) {
        passthroughCosts += total;
      } else {
        operationalCosts += total;
        costsByType[cost.cost_type] += total;
      }
    });

    const totalCosts = passthroughCosts + operationalCosts;
    
    // Gross Margin = Revenue - Passthrough Costs (what you keep before operational expenses)
    const grossMargin = totalRevenue - passthroughCosts;
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    
    // Contribution Margin = Gross Margin - Commercial Costs
    const contributionMargin = grossMargin - costsByType.commercial;
    const contributionMarginPercent = totalRevenue > 0 ? (contributionMargin / totalRevenue) * 100 : 0;
    
    // Net Margin = Revenue - All Costs (passthrough + operational)
    const netMargin = totalRevenue - totalCosts;
    const netMarginPercent = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCosts,
      passthroughCosts,
      operationalCosts,
      grossMargin,
      grossMarginPercent,
      costsByType,
      netMargin,
      netMarginPercent,
      contributionMargin,
      contributionMarginPercent,
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCategories();
      if (projectId) {
        await Promise.all([fetchCosts(), fetchRevenues()]);
      }
      setLoading(false);
    };

    loadData();
  }, [projectId]);

  return {
    costs,
    revenues,
    categories,
    loading,
    summary: calculateSummary(),
    addCost,
    updateCost,
    deleteCost,
    addRevenue,
    updateRevenue,
    deleteRevenue,
    refetch: async () => {
      await Promise.all([fetchCosts(), fetchRevenues()]);
    },
  };
};
