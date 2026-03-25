import { useMemo } from 'react';
import { RevenueSimulationData } from './useRevenueSimulation';
import { SimulationEngineResult, SIM_MONTHS } from '@/lib/simulationEngine';
import { useEngineResult } from './useEngineResult';

export interface MonthlyDepositData {
  month: number;
  monthLabel: string;
  clientiAttivi: number;
  fatturatoMensileStimato: number;
  depositoRichiesto: number;
  deltaDeposito: number;
}

export interface MonthlyCostBreakdown {
  month: number;
  monthLabel: string;
  clientiAttivi: number;
  costoEnergia: number;
  costoPod: number;
  dispacciamento: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
}

export interface SimulationSummary {
  totalFatturato: number;
  totalMargine: number;
  totalPassanti: number;
  totalIva: number;
  totalIncassato: number;
  totalInsoluti: number;
  totalCrediti: number;
  clientiAttivi: number;
  contrattiTotali: number;
  switchOutTotali: number;
  marginePercent: number;
  hasData: boolean;
  costoGestionePodTotale: number;
  costoEnergiaTotale: number;
  depositoIniziale: number;
  depositoFinale: number;
  depositoMassimo: number;
  depositiMensili: MonthlyDepositData[];
  costiMensili: MonthlyCostBreakdown[];
}

const EMPTY_SUMMARY: SimulationSummary = {
  totalFatturato: 0, totalMargine: 0, totalPassanti: 0, totalIva: 0,
  totalIncassato: 0, totalInsoluti: 0, totalCrediti: 0, clientiAttivi: 0,
  contrattiTotali: 0, switchOutTotali: 0, marginePercent: 0, hasData: false,
  costoGestionePodTotale: 0, costoEnergiaTotale: 0,
  depositoIniziale: 0, depositoFinale: 0, depositoMassimo: 0,
  depositiMensili: [], costiMensili: [],
};

/** Overload: accepts a pre-computed engine result to avoid re-running the simulation */
export function buildSimulationSummary(
  engine: SimulationEngineResult,
  data: RevenueSimulationData
): SimulationSummary {
  const { monthly } = engine;

  let totalFatturato = 0, totalMargine = 0, totalPassanti = 0, totalIva = 0;
  let totalChurned = 0, totalContracts = 0;
  let costoGestionePodTotale = 0, costoEnergiaTotale = 0;
  let cumulativeCollection = 0;
  let depositoIniziale = 0, depositoMassimo = 0;

  const depositiMensili: MonthlyDepositData[] = [];
  const costiMensili: MonthlyCostBreakdown[] = [];

  for (const m of monthly) {
    const { customer, deposit, collection } = m;

    totalContracts += customer.contrattiNuovi;
    totalChurned += customer.churn;
    totalFatturato += m.fatturato;
    totalMargine += m.margineCommerciale;
    totalPassanti += m.costiPassanti;
    totalIva += m.ivaTotale;
    costoGestionePodTotale += m.costiGestionePod;
    costoEnergiaTotale += m.costoEnergia;
    cumulativeCollection += collection.totaleIncassi;

    const fatturatoMensileStimato = m.fatturatoStimatoAttivi;

    depositiMensili.push({
      month: customer.month,
      monthLabel: customer.monthLabel,
      clientiAttivi: customer.clientiAttivi,
      fatturatoMensileStimato,
      depositoRichiesto: deposit.depositoRichiesto,
      deltaDeposito: deposit.deltaDeposito,
    });

    if (customer.month === 2) depositoIniziale = deposit.depositoRichiesto;
    if (deposit.depositoRichiesto > depositoMassimo) depositoMassimo = deposit.depositoRichiesto;

    costiMensili.push({
      month: customer.month,
      monthLabel: customer.monthLabel,
      clientiAttivi: customer.clientiAttivi,
      costoEnergia: m.costoEnergia,
      costoPod: m.costiGestionePod,
      dispacciamento: m.dispacciamento,
      trasporto: m.trasportoTotale,
      oneriSistema: m.oneriSistemaTotale,
      accise: m.acciseTotale,
    });
  }

  const lastMonth = monthly[monthly.length - 1];
  // Insoluti reali = quota di fatturato strutturalmente non incassabile (tasso insoluti)
  const totalInsoluti = totalFatturato * (data.params.uncollectibleRate / 100);
  // Crediti pendenti = fatturato non ancora incassato ma atteso (crediti in lavorazione waterfall)
  const totalCrediti = Math.max(0, totalFatturato - cumulativeCollection - totalInsoluti);
  const depositoFinale = lastMonth ? lastMonth.deposit.depositoRichiesto : 0;

  return {
    totalFatturato, totalMargine, totalPassanti, totalIva,
    totalIncassato: cumulativeCollection, totalInsoluti,
    totalCrediti,
    clientiAttivi: lastMonth?.customer.clientiAttivi ?? 0,
    contrattiTotali: totalContracts, switchOutTotali: totalChurned,
    marginePercent: (totalFatturato - totalIva) > 0 ? (totalMargine / (totalFatturato - totalIva)) * 100 : 0,
    hasData: totalContracts > 0,
    costoGestionePodTotale, costoEnergiaTotale,
    depositoIniziale, depositoFinale, depositoMassimo,
    depositiMensili, costiMensili,
  };
}

export const useSimulationSummary = (
  projectId: string | null,
  simulationData?: { data: RevenueSimulationData; loading: boolean },
  sharedEngine?: SimulationEngineResult | null
) => {
  // If no shared engine provided, compute our own
  const ownEngine = useEngineResult(
    sharedEngine !== undefined ? null : projectId,
    simulationData ? { simulationData } : undefined
  );

  const engineResult = sharedEngine !== undefined ? sharedEngine : ownEngine.engineResult;
  const data = simulationData?.data ?? ownEngine.data;
  const loading = simulationData?.loading ?? ownEngine.loading;

  const summary = useMemo((): SimulationSummary => {
    if (!projectId || loading || !engineResult || !data) return EMPTY_SUMMARY;
    return buildSimulationSummary(engineResult, data);
  }, [projectId, loading, engineResult, data]);

  return { summary, loading };
};
