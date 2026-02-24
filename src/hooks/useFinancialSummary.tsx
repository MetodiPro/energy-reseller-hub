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
    // Sostituisci i costi commerciali manuali con quelli simulati SOLO se la simulazione è attiva
    // e ha effettivamente dei canali configurati (costiCommercialiSimulati > 0).
    // Se nessun canale è attivo, mantieni i costi commerciali manuali.
    const commercialCostsToUse = costiCommercialiSimulati > 0 ? costiCommercialiSimulati : manualCommercialCosts;
    const operationalCosts = costSummary.operationalCosts - manualCommercialCosts + commercialCostsToUse;
    const totalCosts = passthroughCosts + operationalCosts;

    const iva = simulationSummary.hasData ? simulationSummary.totalIva : 0;
    const imponibile = totalRevenue - iva;

    const grossMargin = imponibile - passthroughCosts;
    const grossMarginPercent = imponibile > 0 ? (grossMargin / imponibile) * 100 : 0;

    const contributionMargin = grossMargin - costiCommercialiSimulati;
    const contributionMarginPercent = imponibile > 0 ? (contributionMargin / imponibile) * 100 : 0;

    const netMargin = imponibile - totalCosts;
    const netMarginPercent = imponibile > 0 ? (netMargin / imponibile) * 100 : 0;

    return {
      totalRevenue,
      imponibile,
      totalIva: iva,
      totalCosts,
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
