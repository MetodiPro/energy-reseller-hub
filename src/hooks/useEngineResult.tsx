import { useMemo } from 'react';
import { useRevenueSimulation, RevenueSimulationData } from './useRevenueSimulation';
import { runSimulationEngine, SimulationEngineResult } from '@/lib/simulationEngine';

/**
 * Hook centralizzato che esegue runSimulationEngine UNA SOLA VOLTA
 * e restituisce il risultato condiviso da tutti i consumatori
 * (useSimulationSummary, useTaxFlows, useCashFlowAnalysis).
 */

interface UseEngineResultOptions {
  simulationData?: { data: RevenueSimulationData; loading: boolean };
}

export const useEngineResult = (
  projectId: string | null,
  options?: UseEngineResultOptions
) => {
  const ownHook = useRevenueSimulation(options?.simulationData ? null : projectId);
  const data = options?.simulationData?.data ?? ownHook.data;
  const loading = options?.simulationData?.loading ?? ownHook.loading;

  const engineResult = useMemo((): SimulationEngineResult | null => {
    if (!projectId || loading || !data?.params) return null;
    return runSimulationEngine(data.params, data.monthlyContracts, data.startDate);
  }, [projectId, loading, data]);

  return { engineResult, data, loading };
};
