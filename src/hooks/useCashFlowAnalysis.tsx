import { useMemo } from 'react';
import { useSimulationSummary } from './useSimulationSummary';
import { RevenueSimulationData } from './useRevenueSimulation';
import { useStepCosts } from './useStepCosts';
import { useSalesChannels } from './useSalesChannels';
import { useTaxFlows } from './useTaxFlows';
import { useEngineResult } from './useEngineResult';
import { stepTimingConfig } from '@/lib/costTimingConfig';
import { stepCostsData } from '@/types/stepCosts';
import { SimulationEngineResult } from '@/lib/simulationEngine';

export interface MonthlyBreakdown {
  incassoScadenza: number;
  incasso30gg: number;
  incasso60gg: number;
  incassoOltre60gg: number;
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  gestionePod: number;
  churnedCustomers: number;
  depositoLordoAttivazioni: number;
  depositoRilasciatoChurn: number;
  pagamentiConsumi: number;
  depositoRichiesto: number;
  depositoPrecedente: number;
  saldoPrecedente: number;
  investmentBreakdown: { stepId: string; description: string; amount: number }[];
}

export interface MonthlyCashFlowData {
  month: number;
  monthLabel: string;
  contrattiNuovi: number;
  attivazioni: number;
  clientiAttivi: number;
  fatturato: number;
  incassi: number;
  costiPassanti: number;
  costiOperativi: number;
  costiCommerciali: number;
  flussiFiscali: number;
  deltaDeposito: number;
  investimentiIniziali: number;
  flussoNetto: number;
  saldoCumulativo: number;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
  breakdown: MonthlyBreakdown;
}

export interface CashFlowSummary {
  monthlyData: MonthlyCashFlowData[];
  totals: {
    inflow: number;
    outflow: number;
    net: number;
    cumulative: number;
  };
  hasData: boolean;
  investimentoIniziale: number;
  massimaEsposizione: number;
  meseEsposizioneMassima: string;
  mesePrimoPositivo: string | null;
  saldoFinale: number;
  totaleIncassi: number;
  totaleCostiPassanti: number;
  totaleCostiOperativi: number;
  totaleCostiCommerciali: number;
  totaleFlussiFiscali: number;
  totaleDepositi: number;
}

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

interface UseCashFlowOptions {
  simulationData?: { data: RevenueSimulationData; loading: boolean };
  salesChannelsData?: { channels: any[]; calculateCommissionCosts: any; loading: boolean };
  sharedEngine?: SimulationEngineResult | null;
}

export const useCashFlowAnalysis = (projectId: string | null, options?: UseCashFlowOptions) => {
  // Use shared engine if provided, otherwise compute own
  const ownEngine = useEngineResult(
    options?.sharedEngine !== undefined ? null : projectId,
    options?.simulationData ? { simulationData: options.simulationData } : undefined
  );

  const engineResult = options?.sharedEngine !== undefined ? options.sharedEngine : ownEngine.engineResult;
  const simData = options?.simulationData?.data ?? ownEngine.data;
  const simLoading = options?.simulationData?.loading ?? ownEngine.loading;

  const { summary, loading: summaryLoading } = useSimulationSummary(
    projectId,
    options?.simulationData ? { data: simData, loading: simLoading } : undefined,
    engineResult
  );
  const { getGrandTotal, getStepTotal, loading: costsLoading } = useStepCosts(projectId);

  const ownChannelsHook = useSalesChannels(options?.salesChannelsData ? null : projectId);
  const channels = options?.salesChannelsData?.channels ?? ownChannelsHook.channels;
  const channelsLoading = options?.salesChannelsData?.loading ?? ownChannelsHook.loading;

  const { taxFlows, loading: taxLoading } = useTaxFlows(
    projectId,
    'monthly',
    {
      simulationData: { data: simData, loading: simLoading },
      sharedEngine: engineResult,
    }
  );

  const cashFlowData = useMemo((): CashFlowSummary => {
    const empty: CashFlowSummary = {
      monthlyData: [],
      totals: { inflow: 0, outflow: 0, net: 0, cumulative: 0 },
      hasData: false,
      investimentoIniziale: 0,
      massimaEsposizione: 0,
      meseEsposizioneMassima: '-',
      mesePrimoPositivo: null,
      saldoFinale: 0,
      totaleIncassi: 0,
      totaleCostiPassanti: 0,
      totaleCostiOperativi: 0,
      totaleCostiCommerciali: 0,
      totaleFlussiFiscali: 0,
      totaleDepositi: 0,
    };

    if (!summary.hasData || !engineResult || !simData) return empty;

    const { perClient, monthly: engineMonthly } = engineResult;

    const startMonth = simData.startDate.getMonth();
    const startYear = simData.startDate.getFullYear();
    const activeChannels = channels.filter((c: any) => c.is_active && c.contract_share > 0);

    let totaleIncassi = 0, totaleCostiPassanti = 0, totaleCostiOperativi = 0;
    let totaleCostiCommerciali = 0, totaleFlussiFiscali = 0, totaleDepositi = 0;
    let investimentiTotali = 0;
    let minCumulative = 0;
    let maxExposureMonth = '-';
    let firstPositiveMonth: string | null = null;

    const rawMonthly: Omit<MonthlyCashFlowData, 'saldoCumulativo' | 'cumulative'>[] = [];

    for (const em of engineMonthly) {
      const { customer, deposit, collection } = em;
      const m = customer.month;

      const flussiFiscaliMese = taxFlows.hasData && taxFlows.monthlyData[m] ? taxFlows.monthlyData[m].taxOutflowsPerCashFlow : 0;

      let costiCommercialiMese = 0;
      if (activeChannels.length > 0 && (customer.contrattiNuovi > 0 || customer.attivazioni > 0)) {
        activeChannels.forEach((ch: any) => {
          const share = ch.contract_share / 100;
          if (ch.commission_type === 'per_contract') {
            costiCommercialiMese += customer.contrattiNuovi * share * ch.commission_amount;
          } else {
            costiCommercialiMese += customer.attivazioni * share * ch.commission_amount;
          }
        });
      }

      let investimentiIniziali = 0;
      const investmentBreakdownItems: { stepId: string; description: string; amount: number }[] = [];
      Object.keys(stepCostsData).forEach(stepId => {
        const scheduledMonth = stepTimingConfig[stepId] ?? 0;
        if (scheduledMonth === m) {
          const stepTotal = getStepTotal(stepId);
          if (stepTotal > 0) {
            investimentiIniziali += stepTotal;
            investmentBreakdownItems.push({
              stepId,
              description: stepCostsData[stepId]?.description ?? stepId,
              amount: stepTotal,
            });
          }
        }
      });

      const deltaDepositoCassa = deposit.deltaDeposito;
      // Costo reale acquisto energia dal grossista = costoEnergia dal motore
      // (già include PUN + spreadGrossista) × clientiAttivi.
      // Usiamo em.costoEnergia che è la fonte unica di verità del motore.
      // NOTA: il PUN è sia un ricavo (nella fattura al cliente) che un costo
      // (nel pagamento al grossista) — entrambi devono essere nel cash flow
      // per mostrare i flussi lordi reali. Il netto è il margine spread.
      const costiPassantiMese = em.costoEnergia;
      const costiOperativiMese = customer.clientiFatturati *
        (simData.params.gestionePodPerPod ?? 2.5);
      const incassiMese = collection.totaleIncassi;

      const totalOutflow = costiPassantiMese + costiOperativiMese + deltaDepositoCassa + flussiFiscaliMese + costiCommercialiMese + investimentiIniziali;
      const flussoNetto = incassiMese - totalOutflow;

      totaleIncassi += incassiMese;
      totaleCostiPassanti += costiPassantiMese;
      totaleCostiOperativi += costiOperativiMese;
      totaleCostiCommerciali += costiCommercialiMese;
      totaleFlussiFiscali += flussiFiscaliMese;
      totaleDepositi += deltaDepositoCassa;
      investimentiTotali += investimentiIniziali;

      const materiaEnergiaMese = customer.clientiFatturati * perClient.materiaEnergia;
      const trasportoMese = customer.clientiFatturati * perClient.trasporto;
      const oneriMese = customer.clientiFatturati * perClient.oneriSistema;
      const acciseMese = customer.clientiFatturati * perClient.accise;

      rawMonthly.push({
        month: m,
        monthLabel: customer.monthLabel,
        contrattiNuovi: customer.contrattiNuovi,
        attivazioni: customer.attivazioni,
        clientiAttivi: customer.clientiAttivi,
        fatturato: em.fatturato,
        incassi: incassiMese,
        costiPassanti: costiPassantiMese,
        costiOperativi: costiOperativiMese,
        costiCommerciali: costiCommercialiMese,
        flussiFiscali: flussiFiscaliMese,
        deltaDeposito: deltaDepositoCassa,
        investimentiIniziali,
        flussoNetto,
        inflow: incassiMese,
        outflow: totalOutflow,
        net: flussoNetto,
        breakdown: {
          incassoScadenza: collection.incassoScadenza,
          incasso30gg: collection.incasso30gg,
          incasso60gg: collection.incasso60gg,
          incassoOltre60gg: collection.incassoOltre60gg,
          materiaEnergia: materiaEnergiaMese,
          trasporto: trasportoMese,
          oneriSistema: oneriMese,
          accise: acciseMese,
          gestionePod: costiOperativiMese,
          churnedCustomers: customer.churn,
          depositoLordoAttivazioni: deposit.depositoLordoAttivazioni,
          depositoRilasciatoChurn: deposit.depositoRilasciatoChurn,
          pagamentiConsumi: deposit.pagamentiConsumi,
          depositoRichiesto: deposit.depositoRichiesto,
          depositoPrecedente: m > 0 ? engineMonthly[m - 1].deposit.depositoRichiesto : 0,
          saldoPrecedente: 0,
          investmentBreakdown: investmentBreakdownItems,
        },
      });
    }

    let cumulative = 0;
    const monthlyData: MonthlyCashFlowData[] = rawMonthly.map((d) => {
      const saldoPrecedente = cumulative;
      cumulative += d.net;
      if (cumulative < minCumulative) {
        minCumulative = cumulative;
        const mIdx = (startMonth + d.month) % 12;
        const yr = startYear + Math.floor((startMonth + d.month) / 12);
        maxExposureMonth = `${MONTHS_IT[mIdx]} ${yr}`;
      }
      if (cumulative > 0 && !firstPositiveMonth) {
        const mIdx = (startMonth + d.month) % 12;
        const yr = startYear + Math.floor((startMonth + d.month) / 12);
        firstPositiveMonth = `${MONTHS_IT[mIdx]} ${yr}`;
      }
      return {
        ...d,
        saldoCumulativo: cumulative,
        cumulative,
        breakdown: { ...d.breakdown, saldoPrecedente },
      };
    });

    return {
      monthlyData,
      totals: {
        inflow: totaleIncassi,
        outflow: totaleCostiPassanti + totaleCostiOperativi + totaleDepositi + totaleFlussiFiscali + totaleCostiCommerciali + investimentiTotali,
        net: cumulative,
        cumulative,
      },
      hasData: true,
      investimentoIniziale: getGrandTotal(),
      massimaEsposizione: minCumulative,
      meseEsposizioneMassima: maxExposureMonth,
      mesePrimoPositivo: firstPositiveMonth,
      saldoFinale: cumulative,
      totaleIncassi,
      totaleCostiPassanti,
      totaleCostiOperativi,
      totaleCostiCommerciali,
      totaleFlussiFiscali,
      totaleDepositi,
    };
  }, [summary, engineResult, simData, channels, taxFlows, getGrandTotal, getStepTotal]);

  return { cashFlowData, loading: summaryLoading || simLoading || costsLoading || channelsLoading || taxLoading };
};
