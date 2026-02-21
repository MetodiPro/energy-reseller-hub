import { useMemo } from 'react';
import { useSimulationSummary } from './useSimulationSummary';
import { useRevenueSimulation, RevenueSimulationData } from './useRevenueSimulation';
import { useStepCosts } from './useStepCosts';
import { useSalesChannels } from './useSalesChannels';
import { useTaxFlows } from './useTaxFlows';
import { stepTimingConfig } from '@/lib/costTimingConfig';
import { stepCostsData } from '@/types/stepCosts';

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
}

export const useCashFlowAnalysis = (projectId: string | null, options?: UseCashFlowOptions) => {
  const ownSimHook = useRevenueSimulation(options?.simulationData ? null : projectId);
  const simData = options?.simulationData?.data ?? ownSimHook.data;
  const simLoading = options?.simulationData?.loading ?? ownSimHook.loading;

  const { summary, loading: summaryLoading } = useSimulationSummary(projectId, options?.simulationData ? { data: simData, loading: simLoading } : undefined);
  const { getGrandTotal, getStepTotal, getCostAmount, loading: costsLoading } = useStepCosts(projectId);

  const ownChannelsHook = useSalesChannels(options?.salesChannelsData ? null : projectId);
  const channels = options?.salesChannelsData?.channels ?? ownChannelsHook.channels;
  const calculateCommissionCosts = options?.salesChannelsData?.calculateCommissionCosts ?? ownChannelsHook.calculateCommissionCosts;
  const channelsLoading = options?.salesChannelsData?.loading ?? ownChannelsHook.loading;

  const { taxFlows, loading: taxLoading } = useTaxFlows(projectId);

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

    if (!summary.hasData || !simData) return empty;

    const { params, startDate, monthlyContracts } = simData;
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const depositoMesi = params.depositoMesi ?? 3;
    const gestionePodPerPod = params.gestionePodPerPod ?? 2.5;

    // Per-client calculations
    const kWh = params.avgMonthlyConsumption;
    const materiaEnergiaPerCliente = (params.punPerKwh + params.dispacciamentoPerKwh) * kWh;
    const trasportoPerCliente = (params.trasportoQuotaFissaAnno / 12) + (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) + (params.trasportoQuotaEnergiaKwh * kWh);
    const oneriPerCliente = (params.oneriAsosKwh + params.oneriArimKwh) * kWh;
    const accisePerCliente = params.acciseKwh * kWh;
    const passantiPerCliente = materiaEnergiaPerCliente + trasportoPerCliente + oneriPerCliente + accisePerCliente;

    const ccvPerCliente = params.ccvMonthly;
    const spreadPerCliente = params.spreadPerKwh * kWh;
    const altroPerCliente = params.otherServicesMonthly;
    const marginePerCliente = ccvPerCliente + spreadPerCliente + altroPerCliente;

    const imponibilePerCliente = passantiPerCliente + marginePerCliente;
    const ivaPerCliente = imponibilePerCliente * (params.ivaPercent / 100);
    const fatturaPerCliente = imponibilePerCliente + ivaPerCliente;

    // Deposit tracking
    let totalDepositoLordo = 0;
    let totalPagamentiConsumi = 0;
    let previousDeposito = 0;

    const invoicesToCollect: { month: number; amount: number }[] = [];
    let cumulativeActiveCustomers = 0;

    // Commercial costs from channels
    const activeChannels = channels.filter(c => c.is_active && c.contract_share > 0);

    // Accumulators
    let totaleIncassi = 0, totaleCostiPassanti = 0, totaleCostiOperativi = 0;
    let totaleCostiCommerciali = 0, totaleFlussiFiscali = 0, totaleDepositi = 0;

    let minCumulative = 0;
    let maxExposureMonth = '-';
    let firstPositiveMonth: string | null = null;

    const rawMonthly: Omit<MonthlyCashFlowData, 'saldoCumulativo' | 'cumulative'>[] = [];

    for (let m = 0; m < 14; m++) {
      const newContracts = m < 12 ? monthlyContracts[m] : 0;
      const activatedCustomers = m >= 2 ? Math.round((m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)) : 0;
      const churnedCustomers = m >= 3 ? Math.round(cumulativeActiveCustomers * (params.monthlyChurnRate / 100)) : 0;

      cumulativeActiveCustomers = Math.max(0, cumulativeActiveCustomers + activatedCustomers - churnedCustomers);
      const invoicedCustomers = m >= 3 ? cumulativeActiveCustomers : 0;
      const fatturatoMese = invoicedCustomers * fatturaPerCliente;

      if (fatturatoMese > 0) invoicesToCollect.push({ month: m, amount: fatturatoMese });

      // Collection
      let incassiMese = 0;
      let incassoScadenza = 0, incasso30gg = 0, incasso60gg = 0, incassoOltre60gg = 0;
      invoicesToCollect.forEach(invoice => {
        const d = m - invoice.month;
        let amt = 0;
        if (d === 0) { amt = invoice.amount * (params.collectionMonth0 / 100); incassoScadenza += amt; }
        else if (d === 1) { amt = invoice.amount * (params.collectionMonth1 / 100); incasso30gg += amt; }
        else if (d === 2) { amt = invoice.amount * (params.collectionMonth2 / 100); incasso60gg += amt; }
        else if (d === 3) { amt = invoice.amount * (params.collectionMonth3Plus / 100); incassoOltre60gg += amt; }
        incassiMese += amt;
      });

      // Passthrough costs
      const materiaEnergiaMese = invoicedCustomers * materiaEnergiaPerCliente;
      const trasportoMese = invoicedCustomers * trasportoPerCliente;
      const oneriMese = invoicedCustomers * oneriPerCliente;
      const acciseMese = invoicedCustomers * accisePerCliente;
      const costiPassantiMese = materiaEnergiaMese + trasportoMese + oneriMese + acciseMese;

      // Operating costs
      const costiOperativiMese = m >= 2 ? cumulativeActiveCustomers * gestionePodPerPod : 0;

      // Deposit
      const depositoPercentuale = (params.depositoPercentualeAttivazione ?? 85) / 100;
      const nuovoDepositoAttivazioni = activatedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      const depositoRilasciatoChurn = churnedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      totalDepositoLordo += nuovoDepositoAttivazioni;

      const pagamentiConsumiMese = m >= 2 ? cumulativeActiveCustomers * passantiPerCliente : 0;
      totalPagamentiConsumi += pagamentiConsumiMese;

      const depositoRichiesto = Math.max(0, totalDepositoLordo - totalPagamentiConsumi);
      const deltaDeposito = Math.max(0, depositoRichiesto - previousDeposito);
      const depositoPrecedente = previousDeposito;
      previousDeposito = depositoRichiesto;

      // Tax flows
      const flussiFiscaliMese = taxFlows.hasData && taxFlows.monthlyData[m] ? taxFlows.monthlyData[m].totaleTaxOutflows : 0;

      // Commercial costs (commissions on new contracts + activations)
      let costiCommercialiMese = 0;
      if (activeChannels.length > 0 && (newContracts > 0 || activatedCustomers > 0)) {
        activeChannels.forEach(ch => {
          const share = ch.contract_share / 100;
          if (ch.commission_type === 'per_contract') {
            costiCommercialiMese += newContracts * share * ch.commission_amount;
          } else {
            costiCommercialiMese += activatedCustomers * share * ch.commission_amount;
          }
        });
      }

      // Step costs distributed by costTimingConfig phase
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

      const monthIndex = (startMonth + m) % 12;
      const yearOffset = Math.floor((startMonth + m) / 12);
      const monthLabel = `${MONTHS_IT[monthIndex]} ${startYear + yearOffset}`;

      const totalOutflow = costiPassantiMese + costiOperativiMese + deltaDeposito + flussiFiscaliMese + costiCommercialiMese + investimentiIniziali;
      const flussoNetto = incassiMese - totalOutflow;

      totaleIncassi += incassiMese;
      totaleCostiPassanti += costiPassantiMese;
      totaleCostiOperativi += costiOperativiMese;
      totaleCostiCommerciali += costiCommercialiMese;
      totaleFlussiFiscali += flussiFiscaliMese;
      totaleDepositi += deltaDeposito;

      rawMonthly.push({
        month: m,
        monthLabel,
        contrattiNuovi: newContracts,
        attivazioni: activatedCustomers,
        clientiAttivi: cumulativeActiveCustomers,
        fatturato: fatturatoMese,
        incassi: incassiMese,
        costiPassanti: costiPassantiMese,
        costiOperativi: costiOperativiMese,
        costiCommerciali: costiCommercialiMese,
        flussiFiscali: flussiFiscaliMese,
        deltaDeposito,
        investimentiIniziali,
        flussoNetto,
        inflow: incassiMese,
        outflow: totalOutflow,
        net: flussoNetto,
        breakdown: {
          incassoScadenza, incasso30gg, incasso60gg, incassoOltre60gg,
          materiaEnergia: materiaEnergiaMese,
          trasporto: trasportoMese,
          oneriSistema: oneriMese,
          accise: acciseMese,
          gestionePod: costiOperativiMese,
          churnedCustomers,
          depositoLordoAttivazioni: nuovoDepositoAttivazioni,
          depositoRilasciatoChurn,
          pagamentiConsumi: pagamentiConsumiMese,
          depositoRichiesto,
          depositoPrecedente,
          saldoPrecedente: 0, // filled below
          investmentBreakdown: investmentBreakdownItems,
        },
      });
    }

    // Compute cumulative
    let cumulative = 0;
    const monthlyData: MonthlyCashFlowData[] = rawMonthly.map((d, i) => {
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
        outflow: totaleCostiPassanti + totaleCostiOperativi + totaleDepositi + totaleFlussiFiscali + totaleCostiCommerciali + getGrandTotal(),
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
  }, [summary, simData, channels, taxFlows, calculateCommissionCosts, getGrandTotal, getStepTotal, getCostAmount]);

  return { cashFlowData, loading: summaryLoading || simLoading || costsLoading || channelsLoading || taxLoading };
};
