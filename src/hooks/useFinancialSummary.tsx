import { useMemo } from 'react';
import { FinancialSummary as CostSummary } from './useProjectFinancials';
import { SimulationSummary } from './useSimulationSummary';
import { CashFlowSummary } from './useCashFlowAnalysis';

export interface FinancialOverviewSummary {
  totalRevenue: number;
  /** Imponibile fattura = fatturato totale - IVA (base per le percentuali) */
  imponibile: number;
  totalIva: number;
  totalCosts: number;
  passthroughCosts: number;
  operationalCosts: number;
  costiCommercialiSimulati: number;
  /** Costo spread grossista = clientiFatturati × kWh × spreadGrossistaPerKwh */
  costoSpreadGrossista: number;
  grossMargin: number;
  grossMarginPercent: number;
  costsByType: { commercial: number; structural: number; direct: number; indirect: number };
  netMargin: number;
  netMarginPercent: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  /** Ricavi propri del reseller = CCV + (spreadRes - spreadGross)×kWh + altri servizi */
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
    const passthroughCosts = simulationSummary.hasData ? simulationSummary.totalPassanti : costSummary.passthroughCosts;

    const costiCommercialiSimulati = cashFlowData.hasData ? cashFlowData.totaleCostiCommerciali : 0;

    const manualCommercialCosts = costSummary.costsByType.commercial;
    const commercialCostsToUse = costiCommercialiSimulati > 0 ? costiCommercialiSimulati : manualCommercialCosts;

    // ── IVA e imponibile fattura ──
    const iva = simulationSummary.hasData ? simulationSummary.totalIva : 0;
    // Imponibile fattura = fatturato totale − IVA (base per tutte le percentuali)
    const fatturatoImponibile = simulationSummary.hasData
      ? simulationSummary.totalFatturato - iva
      : costSummary.totalRevenue;

    // ── Costo spread grossista (costo REALE, non passante) ──
    // Il reseller paga PUN + spreadGrossista al fornitore ma fattura PUN + spreadReseller al cliente.
    // Il PUN si annulla (passante), lo spreadGrossista è un costo effettivo.
    // cashFlowData.totaleCostiPassanti = Σ(clientiFatturati × kWh × spreadGrossistaPerKwh)
    const costoSpreadGrossista = cashFlowData.hasData ? cashFlowData.totaleCostiPassanti : 0;

    // ── Ricavi propri del reseller ──
    // totalMargine = CCV + spreadRes×kWh + altroServizi (per tutti i clienti fatturati)
    // Ricavi propri = totalMargine − costoSpreadGrossista
    //              = CCV + (spreadRes − spreadGross)×kWh + altroServizi
    const ricaviReseller = simulationSummary.hasData
      ? simulationSummary.totalMargine - costoSpreadGrossista
      : costSummary.totalRevenue;

    // ── Costi operativi reali (NO passanti — si annullano tra ricavi e costi) ──
    const costiGestionePod = simulationSummary.hasData ? simulationSummary.costoGestionePodTotale : 0;
    const strutturaliCosts = costSummary.costsByType.structural + costSummary.costsByType.direct + costSummary.costsByType.indirect;
    const operationalCosts = costiGestionePod + commercialCostsToUse + strutturaliCosts;

    // ── Margini (corretti: spreadGrossista sottratto, % su imponibile fattura) ──
    const grossMargin = ricaviReseller;
    const grossMarginPercent = fatturatoImponibile > 0 ? (grossMargin / fatturatoImponibile) * 100 : 0;

    const contributionMargin = grossMargin - commercialCostsToUse;
    const contributionMarginPercent = fatturatoImponibile > 0 ? (contributionMargin / fatturatoImponibile) * 100 : 0;

    const netMargin = ricaviReseller - operationalCosts;
    const netMarginPercent = fatturatoImponibile > 0 ? (netMargin / fatturatoImponibile) * 100 : 0;

    return {
      totalRevenue,
      imponibile: fatturatoImponibile,
      totalIva: iva,
      totalCosts: operationalCosts,
      passthroughCosts,
      operationalCosts,
      costiCommercialiSimulati,
      costoSpreadGrossista,
      grossMargin,
      grossMarginPercent,
      costsByType: costSummary.costsByType,
      netMargin,
      netMarginPercent,
      contributionMargin,
      contributionMarginPercent,
      resellerMargin: ricaviReseller,
      clientiAttivi: simulationSummary.clientiAttivi,
      contrattiTotali: simulationSummary.contrattiTotali,
      totalIncassato: simulationSummary.totalIncassato,
      totalInsoluti: simulationSummary.totalInsoluti,
      hasSimulationData: simulationSummary.hasData,
    };
  }, [costSummary, simulationSummary, cashFlowData]);
};
