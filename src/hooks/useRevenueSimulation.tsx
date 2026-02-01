import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RevenueSimulationParams {
  avgMonthlyConsumption: number;
  activationRate: number;
  ccvMonthly: number;
  spreadPerKwh: number;
  otherServicesMonthly: number;
  collectionMonth0: number;
  collectionMonth1: number;
  collectionMonth2: number;
  collectionMonth3Plus: number;
  uncollectibleRate: number;
}

export type MonthlyContractsTarget = [number, number, number, number, number, number, number, number, number, number, number, number];

export interface RevenueSimulationData {
  id?: string;
  startDate: Date;
  monthlyContracts: MonthlyContractsTarget;
  params: RevenueSimulationParams;
}

const DEFAULT_PARAMS: RevenueSimulationParams = {
  avgMonthlyConsumption: 200,
  activationRate: 85,
  ccvMonthly: 8.50,
  spreadPerKwh: 0.015,
  otherServicesMonthly: 0,
  collectionMonth0: 70,
  collectionMonth1: 18,
  collectionMonth2: 7,
  collectionMonth3Plus: 3,
  uncollectibleRate: 2,
};

const DEFAULT_MONTHLY_CONTRACTS: MonthlyContractsTarget = [30, 40, 50, 60, 70, 80, 90, 100, 100, 100, 100, 100];

export const useRevenueSimulation = (projectId: string | null) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<RevenueSimulationData>({
    startDate: new Date(2026, 0, 1),
    monthlyContracts: DEFAULT_MONTHLY_CONTRACTS,
    params: DEFAULT_PARAMS,
  });

  // Load simulation from database
  const loadSimulation = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: simulation, error } = await supabase
        .from('project_revenue_simulations')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;

      if (simulation) {
        const monthlyContracts = (simulation.monthly_contracts as number[]) || DEFAULT_MONTHLY_CONTRACTS;
        
        setData({
          id: simulation.id,
          startDate: new Date(simulation.start_date),
          monthlyContracts: monthlyContracts.length === 12 
            ? monthlyContracts as MonthlyContractsTarget 
            : DEFAULT_MONTHLY_CONTRACTS,
          params: {
            avgMonthlyConsumption: Number(simulation.avg_monthly_consumption),
            activationRate: Number(simulation.activation_rate),
            ccvMonthly: Number(simulation.ccv_monthly),
            spreadPerKwh: Number(simulation.spread_per_kwh),
            otherServicesMonthly: Number(simulation.other_services_monthly),
            collectionMonth0: Number(simulation.collection_month_0),
            collectionMonth1: Number(simulation.collection_month_1),
            collectionMonth2: Number(simulation.collection_month_2),
            collectionMonth3Plus: Number(simulation.collection_month_3_plus),
            uncollectibleRate: Number(simulation.uncollectible_rate),
          },
        });
      } else {
        // Reset to defaults if no simulation found
        setData({
          startDate: new Date(2026, 0, 1),
          monthlyContracts: DEFAULT_MONTHLY_CONTRACTS,
          params: DEFAULT_PARAMS,
        });
      }
    } catch (error) {
      console.error('Error loading simulation:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Save simulation to database
  const saveSimulation = useCallback(async () => {
    if (!projectId) return;

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      const simulationData = {
        project_id: projectId,
        start_date: data.startDate.toISOString().split('T')[0],
        monthly_contracts: data.monthlyContracts,
        avg_monthly_consumption: data.params.avgMonthlyConsumption,
        activation_rate: data.params.activationRate,
        ccv_monthly: data.params.ccvMonthly,
        spread_per_kwh: data.params.spreadPerKwh,
        other_services_monthly: data.params.otherServicesMonthly,
        collection_month_0: data.params.collectionMonth0,
        collection_month_1: data.params.collectionMonth1,
        collection_month_2: data.params.collectionMonth2,
        collection_month_3_plus: data.params.collectionMonth3Plus,
        uncollectible_rate: data.params.uncollectibleRate,
        created_by: user.id,
      };

      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('project_revenue_simulations')
          .update(simulationData)
          .eq('id', data.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { data: newSim, error } = await supabase
          .from('project_revenue_simulations')
          .insert(simulationData)
          .select()
          .single();
        
        if (error) throw error;
        
        setData(prev => ({ ...prev, id: newSim.id }));
      }

      toast({
        title: 'Salvato',
        description: 'Configurazione simulatore salvata con successo',
      });
    } catch (error: any) {
      console.error('Error saving simulation:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare la configurazione',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, data, toast]);

  // Update params
  const updateParams = useCallback((key: keyof RevenueSimulationParams, value: number) => {
    setData(prev => ({
      ...prev,
      params: { ...prev.params, [key]: value },
    }));
  }, []);

  // Update monthly contract
  const updateMonthlyContract = useCallback((monthIndex: number, value: number) => {
    setData(prev => {
      const updated = [...prev.monthlyContracts] as MonthlyContractsTarget;
      updated[monthIndex] = value;
      return { ...prev, monthlyContracts: updated };
    });
  }, []);

  // Update start date
  const updateStartDate = useCallback((date: Date) => {
    setData(prev => ({ ...prev, startDate: date }));
  }, []);

  // Load on mount
  useEffect(() => {
    loadSimulation();
  }, [loadSimulation]);

  return {
    data,
    loading,
    saving,
    updateParams,
    updateMonthlyContract,
    updateStartDate,
    saveSimulation,
    refetch: loadSimulation,
  };
};
