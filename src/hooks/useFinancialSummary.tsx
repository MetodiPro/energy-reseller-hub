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
  // --- Nuovi campi margine a cascata ---
  costoEnergiaNetto: number;
  costoGestionePodTotale: number;
  margineCommercialeLordo: number;
  margineCommercialePercent: number;
  // --- Fine nuovi campi ---
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
    // Passanti non-energetici: solo trasporto + oneri + accise (senza materiaEnergia che è già in costoEnergia)
    const passthroughNonEnergia = simulationSummary.hasData
      ? (simulationSummary.totalTrasporto + simulationSummary.totalOneri + simulationSummary.totalAccise)
      : costSummary.passthroughCosts;

    const costiCommercialiSimulati = cashFlowData.hasData ? cashFlowData.totaleCostiCommerciali : 0;

    const manualCommercialCosts = costSummary.costsByType.commercial;
    const commercialCostsToUse = costiCommercialiSimulati > 0 ? costiCommercialiSimulati : manualCommercialCosts;

    const iva = simulationSummary.hasData ? simulationSummary.totalIva : 0;

    // === Nuovi calcoli: costi reali grossista ===
    const costoEnergiaNetto = simulationSummary.hasData
      ? simulationSummary.costoEnergiaTotale
      : 0;
    const costoGestionePodTotale = simulationSummary.hasData
      ? simulationSummary.costoGestionePodTotale
      : 0;

    // Margine commerciale lordo = Imponibile − Costo energia grossista − Passanti non-energetici − Fee POD
    // NOTA: passthroughCosts include materiaEnergia (PUN+disp) che si sovrappone a costoEnergia (PUN+spreadGrossista).
    // Per evitare il doppio conteggio del PUN, sottraiamo solo i passanti non-energetici (trasporto+oneri+accise).
    const margineCommercialeLordo = imponibile - costoEnergiaNetto - passthroughNonEnergia - costoGestionePodTotale;

    // Imponibile = fatturato − IVA
    const imponibile = totalRevenue - iva;

    // % margine commerciale sul fatturato netto (imponibile)
    const margineCommercialePercent = imponibile > 0
      ? (margineCommercialeLordo / imponibile) * 100
      : 0;

    // === Costi operativi propri (senza costo energia/POD, già detratti nel margine commerciale) ===
    const strutturaliCosts = costSummary.costsByType.structural + costSummary.costsByType.direct + costSummary.costsByType.indirect;
    const operationalCosts = commercialCostsToUse + strutturaliCosts;

    // === Margini a cascata basati sul margine commerciale ===
    // Margine lordo = margine commerciale lordo (dopo grossista)
    const grossMargin = margineCommercialeLordo;
    const grossMarginPercent = imponibile > 0 ? (grossMargin / imponibile) * 100 : 0;

    // Margine contribuzione = margine commerciale − costi commerciali (provvigioni canali)
    const contributionMargin = margineCommercialeLordo - commercialCostsToUse;
    const contributionMarginPercent = imponibile > 0 ? (contributionMargin / imponibile) * 100 : 0;

    // Margine netto = margine commerciale − tutti i costi operativi
    const netMargin = margineCommercialeLordo - operationalCosts;
    const netMarginPercent = imponibile > 0 ? (netMargin / imponibile) * 100 : 0;

    return {
      totalRevenue,
      imponibile,
      totalIva: iva,
      totalCosts: operationalCosts + costoEnergiaNetto + costoGestionePodTotale,
      passthroughCosts,
      operationalCosts,
      costiCommercialiSimulati,
      costoEnergiaNetto,
      costoGestionePodTotale,
      margineCommercialeLordo,
      margineCommercialePercent,
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
