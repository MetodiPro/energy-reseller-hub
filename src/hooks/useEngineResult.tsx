import { useMemo } from 'react';
import { useRevenueSimulation, RevenueSimulationData } from './useRevenueSimulation';
import { useSimulationProducts } from './useSimulationProducts';
import {
  runMultiProductEngine,
  SimulationEngineResult,
  MultiProductEngineResult,
  ProductConfig,
} from '@/lib/simulationEngine';

/**
 * Hook centralizzato che esegue il motore di simulazione (multi-prodotto)
 * UNA SOLA VOLTA e restituisce il risultato condiviso da tutti i consumatori.
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

  const { products, loading: productsLoading } = useSimulationProducts(projectId);

  const multiProductResult = useMemo((): MultiProductEngineResult | null => {
    if (!projectId || loading || productsLoading || !data?.params) return null;

    const activeProducts = products.filter(p => p.is_active);
    const productConfigs: ProductConfig[] = activeProducts.map(p => ({
      id: p.id,
      name: p.name,
      contractShare: p.contract_share,
      ccvMonthly: p.ccv_monthly,
      spreadPerKwh: p.spread_per_kwh,
      otherServicesMonthly: p.other_services_monthly,
      avgMonthlyConsumption: p.avg_monthly_consumption,
      clientType: p.client_type,
      ivaPercent: p.iva_percent,
      activationRate: p.activation_rate,
      churnMonth0Pct: p.churn_month0_pct ?? 0,
      churnMonth1Pct: p.churn_month1_pct,
      churnMonth2Pct: p.churn_month2_pct,
      churnMonth3Pct: p.churn_month3_pct,
      churnDecayFactor: p.churn_decay_factor,
      collectionMonth0: p.collection_month_0,
      collectionMonth1: p.collection_month_1,
      collectionMonth2: p.collection_month_2,
      collectionMonth3Plus: p.collection_month_3_plus,
      uncollectibleRate: p.uncollectible_rate,
    }));

    return runMultiProductEngine(data.params, data.monthlyContracts, data.startDate, productConfigs);
  }, [projectId, loading, productsLoading, data, products]);

  // Backward compat: engineResult is the aggregated result
  const engineResult = multiProductResult?.aggregated ?? null;

  return { engineResult, multiProductResult, data, loading: loading || productsLoading };
};
