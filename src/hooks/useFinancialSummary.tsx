import { useMemo } from 'react';
import { FinancialSummary as CostSummary } from './useProjectFinancials';
import { SimulationSummary } from './useSimulationSummary';
import { CashFlowSummary } from './useCashFlowAnalysis';

export interface FinancialOverviewSummary {
  totalRevenue: number;
  imponibile: number;
  totalIva: number;
  totalCosts: number;
  passthroughCosts: number;
  operationalCosts: number;
  costiCommercialiSimulati: number;
  grossMargin: number;
  grossMarginPercent: number;
  costsByType: { commercial: number; structural: number; direct: number; indirect: number };
  netMargin: number;
  netMarginPercent: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  resellerMargin: number;
  clientiAttivi: number;
  contrattiTotali: number;
  totalIncassato: number;
  totalInsoluti: number;
  hasSimulationData: boolean;
}

export const useFinancialSummary = (
  costSummary: CostSummary,
  simulationSummary: SimulationSummary,
  cashFlowData: CashFlowSummary,
): FinancialOverviewSummary => {
  return useMemo(() => {
    const totalRevenue = simulationSummary.hasData ? simulationSummary.totalFatturato : costSummary.totalRevenue;
    const resellerMargin = simulationSummary.hasData ? simulationSummary.totalMargine : 0;
    const passthroughCosts = simulationSummary.hasData ? simulationSummary.totalPassanti : costSummary.passthroughCosts;

    const costiCommercialiSimulati = cashFlowData.hasData ? cashFlowData.totaleCostiCommerciali : 0;

    const manualCommercialCosts = costSummary.costsByType.commercial;
    const commercialCostsToUse = costiCommercialiSimulati > 0 ? costiCommercialiSimulati : manualCommercialCosts;

    // Ricavi propri del reseller (solo margine, senza passanti)
    const resellerRevenue = simulationSummary.hasData
      ? simulationSummary.totalMargine
      : costSummary.totalRevenue;

    // Costi operativi reali (NO passanti — si annullano tra ricavi e costi)
    // NOTA: costiGestionePod viene dalla simulazione (calcolo automatico).
    // I costi strutturali manuali (strutturaliCosts) vengono da project_costs.
    // L'utente dovrebbe usare uno solo dei due metodi: o il simulatore
    // o l'inserimento manuale, non entrambi per la stessa voce.
    const costiGestionePod = simulationSummary.hasData ? simulationSummary.costoGestionePodTotale : 0;
    const strutturaliCosts = costSummary.costsByType.structural + costSummary.costsByType.direct + costSummary.costsByType.indirect;
    const operationalCosts = costiGestionePod + commercialCostsToUse + strutturaliCosts;

    // Margini corretti
    const grossMargin = resellerRevenue;
    const grossMarginPercent = resellerRevenue > 0 ? (grossMargin / resellerRevenue) * 100 : 0;

    const contributionMargin = grossMargin - commercialCostsToUse;
    const contributionMarginPercent = resellerRevenue > 0 ? (contributionMargin / resellerRevenue) * 100 : 0;

    const netMargin = resellerRevenue - operationalCosts;
    const netMarginPercent = resellerRevenue > 0 ? (netMargin / resellerRevenue) * 100 : 0;

    const iva = simulationSummary.hasData ? simulationSummary.totalIva : 0;

    return {
      totalRevenue,
      imponibile: resellerRevenue,
      totalIva: iva,
      totalCosts: operationalCosts,
      passthroughCosts,
      operationalCosts,
      costiCommercialiSimulati,
      grossMargin,
      grossMarginPercent,
      costsByType: costSummary.costsByType,
      netMargin,
      netMarginPercent,
      contributionMargin,
      contributionMarginPercent,
      resellerMargin,
      clientiAttivi: simulationSummary.clientiAttivi,
      contrattiTotali: simulationSummary.contrattiTotali,
      totalIncassato: simulationSummary.totalIncassato,
      totalInsoluti: simulationSummary.totalInsoluti,
      hasSimulationData: simulationSummary.hasData,
    };
  }, [costSummary, simulationSummary, cashFlowData]);
};
