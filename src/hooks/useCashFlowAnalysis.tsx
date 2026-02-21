import { useMemo } from 'react';
import { useSimulationSummary } from './useSimulationSummary';
import { useRevenueSimulation } from './useRevenueSimulation';
import { useStepCosts } from './useStepCosts';
import { useSalesChannels } from './useSalesChannels';
import { useTaxFlows } from './useTaxFlows';

export interface MonthlyCashFlowData {
  month: number;
  inflow: number;
  outflow: number;
  net: number;
  breakdown: {
    incassi: number;
    passanti: number;
    operativi: number;
    deposito: number;
    fiscali: number;
    processo: number;
    commerciali: number;
  };
  cumulative: number;
}

export interface CashFlowBreakdown {
  incassoScadenza: number;
  incasso30gg: number;
  incasso60gg: number;
  incassoOltre60gg: number;
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  gestionePod: number;
  depositoLordoAttivazioni: number;
  depositoRilasciatoChurn: number;
  pagamentiConsumi: number;
  depositoRichiesto: number;
  depositoPrecedente: number;
  churnedCustomers: number;
}

export interface CashFlowSummary {
  monthlyData: MonthlyCashFlowData[];
  totals: {
    inflow: number;
    outflow: number;
    net: number;
    cumulative: number;
  };
  breakdown: CashFlowBreakdown;
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

export const useCashFlowAnalysis = (projectId: string | null) => {
  const { summary, loading: summaryLoading } = useSimulationSummary(projectId);
  const { data: simData, loading: simLoading } = useRevenueSimulation(projectId);
  const { costs, loading: costsLoading } = useStepCosts(projectId);
  const { channels, loading: channelsLoading } = useSalesChannels(projectId);
  const { taxFlows, loading: taxLoading } = useTaxFlows(projectId);

  const cashFlowData = useMemo((): CashFlowSummary => {
    if (!summary.hasData || !simData) {
      return {
        monthlyData: [],
        totals: { inflow: 0, outflow: 0, net: 0, cumulative: 0 },
        breakdown: {
          incassoScadenza: 0, incasso30gg: 0, incasso60gg: 0, incassoOltre60gg: 0,
          materiaEnergia: 0, trasporto: 0, oneriSistema: 0, accise: 0,
          gestionePod: 0, depositoLordoAttivazioni: 0, depositoRilasciatoChurn: 0,
          pagamentiConsumi: 0, depositoRichiesto: 0, depositoPrecedente: 0, churnedCustomers: 0,
        },
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
    }

    const { params, startDate, monthlyContracts } = simData;
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const depositoMesi = params.depositoMesi ?? 3;
    const gestionePodPerPod = params.gestionePodPerPod ?? 2.5;
    
    // Deposit tracking
    let totalDepositoLordo = 0;        
    let totalDepositoRilasciatoChurn = 0;
    let totalPagamentiConsumi = 0;     
    
    const invoicesToCollect: { month: number; amount: number }[] = [];
    const kWh = params.avgMonthlyConsumption;
    
    // Costs per client
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
    
    let totaleIncassi = 0, totaleCostiPassanti = 0, totaleCostiOperativi = 0;
    let totaleCostiCommerciali = 0, totaleFlussiFiscali = 0, totaleDepositi = 0;
    
    let cumulativeActiveCustomers = 0;
    let previousDeposito = 0;
    let totalChurnedCustomers = 0;

    let totalIncassoScadenza = 0, totalIncasso30gg = 0, totalIncasso60gg = 0, totalIncassoOltre60gg = 0;
    let totalMateriaEnergia = 0, totalTrasporto = 0, totalOneriSistema = 0, totalAccise = 0, totalGestionePod = 0;

    // Determine max exposure
    let minCumulative = 0;
    let maxExposureMonth = '';
    let firstPositiveMonth = null;

    const monthlyData = Array.from({ length: 14 }).map((_, m) => {
      const newContracts = m < 12 ? monthlyContracts[m] : 0;
      const activatedCustomers = m >= 2 ? Math.round((m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)) : 0;
      const churnedCustomers = m >= 3 ? Math.round(cumulativeActiveCustomers * (params.monthlyChurnRate / 100)) : 0;
      
      totalChurnedCustomers += churnedCustomers;
      cumulativeActiveCustomers = Math.max(0, cumulativeActiveCustomers + activatedCustomers - churnedCustomers);
      
      const invoicedCustomers = m >= 3 ? cumulativeActiveCustomers : 0;
      const fatturatoMese = invoicedCustomers * fatturaPerCliente;
      
      if (fatturatoMese > 0) invoicesToCollect.push({ month: m, amount: fatturatoMese });
      
      let incassiMese = 0;
      invoicesToCollect.forEach(invoice => {
        const monthsAfterInvoice = m - invoice.month;
        let amt = 0;
        if (monthsAfterInvoice === 0) { amt = invoice.amount * (params.collectionMonth0 / 100); totalIncassoScadenza += amt; }
        else if (monthsAfterInvoice === 1) { amt = invoice.amount * (params.collectionMonth1 / 100); totalIncasso30gg += amt; }
        else if (monthsAfterInvoice === 2) { amt = invoice.amount * (params.collectionMonth2 / 100); totalIncasso60gg += amt; }
        else if (monthsAfterInvoice === 3) { amt = invoice.amount * (params.collectionMonth3Plus / 100); totalIncassoOltre60gg += amt; }
        incassiMese += amt;
      });
      
      const materiaEnergiaMese = invoicedCustomers * materiaEnergiaPerCliente;
      const trasportoMese = invoicedCustomers * trasportoPerCliente;
      const oneriMese = invoicedCustomers * oneriPerCliente;
      const acciseMese = invoicedCustomers * accisePerCliente;
      const costiPassantiMese = materiaEnergiaMese + trasportoMese + oneriMese + acciseMese;
      
      totalMateriaEnergia += materiaEnergiaMese;
      totalTrasporto += trasportoMese;
      totalOneriSistema += oneriMese;
      totalAccise += acciseMese;
      
      const costiOperativiMese = m >= 2 ? cumulativeActiveCustomers * gestionePodPerPod : 0;
      totalGestionePod += costiOperativiMese;
      
      const depositoPercentuale = (params.depositoPercentualeAttivazione ?? 85) / 100;
      const nuovoDepositoAttivazioni = activatedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      const depositoRilasciatoChurn = churnedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      totalDepositoLordo += nuovoDepositoAttivazioni;
      totalDepositoRilasciatoChurn += depositoRilasciatoChurn;
      
      const pagamentiConsumiMese = m >= 2 ? cumulativeActiveCustomers * passantiPerCliente : 0;
      totalPagamentiConsumi += pagamentiConsumiMese;
      
      const depositoRichiesto = Math.max(0, totalDepositoLordo - totalPagamentiConsumi);
      const deltaDeposito = Math.max(0, depositoRichiesto - previousDeposito);
      previousDeposito = depositoRichiesto;

      // Tax flows (simplified distribution if taxFlows not detailed)
      const flussiFiscaliMese = taxFlows.hasData && taxFlows.monthlyData[m] ? taxFlows.monthlyData[m].totaleTaxOutflows : 0;

      // Other costs
      const costiDiProcessoMese = 0; // Placeholder
      const costiCommercialiMese = 0; // Placeholder

      const totalOutflow = costiPassantiMese + costiOperativiMese + deltaDeposito + flussiFiscaliMese + costiDiProcessoMese + costiCommercialiMese;
      const netCashFlow = incassiMese - totalOutflow;

      totaleIncassi += incassiMese;
      totaleCostiPassanti += costiPassantiMese;
      totaleCostiOperativi += costiOperativiMese;
      totaleDepositi += deltaDeposito;
      totaleFlussiFiscali += flussiFiscaliMese;
      
      return {
        month: m,
        inflow: incassiMese,
        outflow: totalOutflow,
        net: netCashFlow,
        breakdown: {
          incassi: incassiMese,
          passanti: costiPassantiMese,
          operativi: costiOperativiMese,
          deposito: deltaDeposito,
          fiscali: flussiFiscaliMese,
          processo: costiDiProcessoMese,
          commerciali: costiCommercialiMese
        },
        cumulative: 0 // Will calculate below
      };
    });

    let cumulative = 0;
    const monthlyWithCumulative = monthlyData.map(d => {
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
      return { ...d, cumulative };
    });

    return {
      monthlyData: monthlyWithCumulative,
      totals: {
        inflow: totaleIncassi,
        outflow: totaleCostiPassanti + totaleCostiOperativi + totaleDepositi + totaleFlussiFiscali + totaleCostiCommerciali,
        net: cumulative,
        cumulative
      },
      breakdown: {
        incassoScadenza: totalIncassoScadenza,
        incasso30gg: totalIncasso30gg,
        incasso60gg: totalIncasso60gg,
        incassoOltre60gg: totalIncassoOltre60gg,
        materiaEnergia: totalMateriaEnergia,
        trasporto: totalTrasporto,
        oneriSistema: totalOneriSistema,
        accise: totalAccise,
        gestionePod: totalGestionePod,
        depositoLordoAttivazioni: totalDepositoLordo,
        depositoRilasciatoChurn: totalDepositoRilasciatoChurn,
        pagamentiConsumi: totalPagamentiConsumi,
        depositoRichiesto: previousDeposito,
        depositoPrecedente: 0,
        churnedCustomers: totalChurnedCustomers
      },
      hasData: true,
      investimentoIniziale: 0, // Placeholder
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
  }, [summary, simData, costs, channels, taxFlows]);

  return { cashFlowData, loading: summaryLoading || simLoading || costsLoading || channelsLoading || taxLoading };
};
