import { useMemo } from 'react';
import { useSimulationSummary, MonthlyDepositData } from './useSimulationSummary';
import { useRevenueSimulation } from './useRevenueSimulation';
import { stepCostsData } from '@/types/stepCosts';
import { stepTimingConfig } from '@/lib/costTimingConfig';
import { useStepCosts } from './useStepCosts';
import { useSalesChannels } from './useSalesChannels';
import { useTaxFlows } from './useTaxFlows';

export interface CashFlowBreakdown {
  // Incassi breakdown (collection aging)
  incassoScadenza: number;   // collectionMonth0
  incasso30gg: number;       // collectionMonth1
  incasso60gg: number;       // collectionMonth2
  incassoOltre60gg: number;  // collectionMonth3Plus
  // Passanti breakdown
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  // Operativi
  gestionePod: number;
  // Deposito
  depositoLordoAttivazioni: number;   // cumulative deposits from new activations
  depositoRilasciatoChurn: number;    // cumulative deposits released from churned customers
  pagamentiConsumi: number;           // cumulative payments reducing deposit
  depositoRichiesto: number;
  depositoPrecedente: number;
  // Clienti
  churnedCustomers: number;
  invoicedCustomers: number;
  saldoPrecedente: number;
}

export interface MonthlyCashFlowData {
  month: number;
  monthLabel: string;
  // Inflows
  incassi: number;
  // Outflows
  costiPassanti: number;
  costiOperativi: number;
  costiCommerciali: number;
  flussiFiscali: number;
  deltaDeposito: number;
  investimentiIniziali: number;
  // Net
  flussoNetto: number;
  saldoCumulativo: number;
  // Context
  clientiAttivi: number;
  contrattiNuovi: number;
  attivazioni: number;
  fatturato: number;
  // Breakdown for tooltips
  breakdown: CashFlowBreakdown;
}

export interface CashFlowSummary {
  // Monthly data for chart
  monthlyData: MonthlyCashFlowData[];
  // KPI
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
  // Flags
  hasData: boolean;
}

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// Calculate investment per month based on step timing config
const calculateMonthlyInvestments = (
  getStepTotal: (stepId: string) => number
): number[] => {
  const monthlyTotals = new Array(14).fill(0);
  
  // Iterate through all steps and assign to their designated month
  Object.keys(stepCostsData).forEach(stepId => {
    const month = stepTimingConfig[stepId] ?? 0;
    const stepTotal = getStepTotal(stepId);
    if (month >= 0 && month < 14) {
      monthlyTotals[month] += stepTotal;
    }
  });
  
  return monthlyTotals;
};

export const useCashFlowAnalysis = (projectId: string | null) => {
  const { summary: simSummary, loading: simLoading } = useSimulationSummary(projectId);
  const { data: simData, loading: revenueLoading } = useRevenueSimulation(projectId);
  const { getStepTotal, loading: stepCostsLoading } = useStepCosts(projectId);
  const { channels, calculateCommissionCosts, loading: channelsLoading } = useSalesChannels(projectId);
  const { taxFlows, loading: taxFlowsLoading } = useTaxFlows(projectId);

  const loading = simLoading || revenueLoading || stepCostsLoading || channelsLoading || taxFlowsLoading;

  const cashFlowData = useMemo((): CashFlowSummary => {
    if (!projectId || loading || !simSummary.hasData) {
      return {
        monthlyData: [],
        investimentoIniziale: 0,
        massimaEsposizione: 0,
        meseEsposizioneMassima: '',
        mesePrimoPositivo: null,
        saldoFinale: 0,
        totaleIncassi: 0,
        totaleCostiPassanti: 0,
        totaleCostiOperativi: 0,
        totaleCostiCommerciali: 0,
        totaleFlussiFiscali: 0,
        totaleDepositi: 0,
        hasData: false,
      };
    }

    const startDate = simData.startDate;
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const params = simData.params;
    const monthlyContracts = simData.monthlyContracts;
    
    // Get deposit config from params
    const depositoMesi = params.depositoMesi ?? 3;
    const depositoPercentuale = (params.depositoPercentualeAttivazione ?? 85) / 100;
    const gestionePodPerPod = params.gestionePodPerPod ?? 2.5;
    
    // Calculate monthly investments based on step timing
    const monthlyInvestments = calculateMonthlyInvestments(getStepTotal);
    const investimentoIniziale = monthlyInvestments.reduce((sum, val) => sum + val, 0);
    
    // Monthly calculations
    const monthlyData: MonthlyCashFlowData[] = [];
    let cumulativeActiveCustomers = 0;
    let saldoCumulativo = 0; // Start at 0, investments will be subtracted month by month
    let minSaldo = saldoCumulativo;
    let meseMinSaldo = '';
    let mesePrimoPositivo: string | null = null;
    let previousDeposito = 0;
    
    // Deposit tracking: deposits are required only for NEW activations,
    // churned customers release deposits, payments reduce the outstanding deposit
    let totalDepositoLordo = 0;        // cumulative gross deposits from activations
    let totalDepositoRilasciatoChurn = 0; // cumulative deposits released from churn
    let totalPagamentiConsumi = 0;     // cumulative payments made to wholesaler
    
    // Track invoices for collection aging
    const invoicesToCollect: { month: number; amount: number }[] = [];
    
    // Monthly cost and revenue calculations
    const kWh = params.avgMonthlyConsumption;
    const smc = params.avgMonthlyConsumptionGas;
    const commodityType = params.simulationCommodityType ?? 'luce';
    const includeLuce = commodityType === 'luce' || commodityType === 'dual';
    const includeGas = commodityType === 'gas' || commodityType === 'dual';
    
    // Passthrough costs per client/month (LUCE)
    const materiaEnergiaPerCliente = includeLuce ? (params.punPerKwh + params.dispacciamentoPerKwh) * kWh : 0;
    const trasportoPerCliente = includeLuce ? (
      (params.trasportoQuotaFissaAnno / 12) + 
      (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) +
      (params.trasportoQuotaEnergiaKwh * kWh)
    ) : 0;
    const oneriPerCliente = includeLuce ? (params.oneriAsosKwh + params.oneriArimKwh) * kWh : 0;
    const accisePerCliente = includeLuce ? params.acciseKwh * kWh : 0;
    
    // Passthrough costs per client/month (GAS)
    const materiaGasPerCliente = includeGas ? params.psvPerSmc * smc : 0;
    const trasportoGasPerCliente = includeGas ? (
      (params.trasportoGasQuotaFissaAnno / 12) +
      (params.trasportoGasQuotaEnergiaSmc * smc)
    ) : 0;
    const oneriGasPerCliente = includeGas ? (params.oneriGasReSmc + params.oneriGasUgSmc) * smc : 0;
    const acciseGasPerCliente = includeGas ? (params.acciseGasSmc + params.addizionaleRegionaleGasSmc) * smc : 0;
    
    const passantiLucePerCliente = materiaEnergiaPerCliente + trasportoPerCliente + oneriPerCliente + accisePerCliente;
    const passantiGasPerCliente = materiaGasPerCliente + trasportoGasPerCliente + oneriGasPerCliente + acciseGasPerCliente;
    const passantiPerCliente = passantiLucePerCliente + passantiGasPerCliente;
    
    // Margin components per client
    const ccvPerCliente = (includeLuce ? params.ccvMonthly : 0) + (includeGas ? params.ccvGasMonthly : 0);
    const spreadPerCliente = (includeLuce ? params.spreadPerKwh * kWh : 0) + (includeGas ? params.spreadGasPerSmc * smc : 0);
    const altroPerCliente = params.otherServicesMonthly;
    const marginePerCliente = ccvPerCliente + spreadPerCliente + altroPerCliente;
    
    // Full invoice per client (including IVA - weighted)
    const imponibilePerCliente = passantiPerCliente + marginePerCliente;
    const ivaLuce = includeLuce ? (passantiLucePerCliente + params.ccvMonthly + params.spreadPerKwh * kWh) * (params.ivaPercent / 100) : 0;
    const ivaGas = includeGas ? (passantiGasPerCliente + params.ccvGasMonthly + params.spreadGasPerSmc * smc) * (params.ivaPercentGas / 100) : 0;
    const ivaAltro = altroPerCliente * (params.ivaPercent / 100);
    const ivaPerCliente = ivaLuce + ivaGas + ivaAltro;
    const fatturaPerCliente = imponibilePerCliente + ivaPerCliente;
    
    // Totals for summary
    let totaleIncassi = 0;
    let totaleCostiPassanti = 0;
    let totaleCostiOperativi = 0;
    let totaleCostiCommerciali = 0;
    let totaleFlussiFiscali = 0;
    let totaleDepositi = 0;
    
    for (let m = 0; m < 14; m++) {
      // Calculate month label
      const monthIndex = (startMonth + m) % 12;
      const yearOffset = Math.floor((startMonth + m) / 12);
      const monthLabel = `${MONTHS_IT[monthIndex]} ${startYear + yearOffset}`;
      
      // New contracts this month
      const newContracts = m < 12 ? monthlyContracts[m] : 0;
      
      // Activations: contracts from 2 months ago after SII screening
      const activatedCustomers = m >= 2
        ? Math.round((m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)) 
        : 0;
      
      // Churn calculation
      const churnedCustomers = m >= 3 
        ? Math.round(cumulativeActiveCustomers * (params.monthlyChurnRate / 100))
        : 0;
      
      // Update active customers
      cumulativeActiveCustomers = Math.max(0, cumulativeActiveCustomers + activatedCustomers - churnedCustomers);
      
      // Customers to invoice (after 3 months)
      const invoicedCustomers = m >= 3 ? cumulativeActiveCustomers : 0;
      
      // Calculate invoice this month
      const fatturatoMese = invoicedCustomers * fatturaPerCliente;
      
      // Add to collection queue
      if (fatturatoMese > 0) {
        invoicesToCollect.push({ month: m, amount: fatturatoMese });
      }
      
      // Calculate collections this month (from previous invoices) with aging breakdown
      let incassiMese = 0;
      let incassoScadenza = 0;
      let incasso30gg = 0;
      let incasso60gg = 0;
      let incassoOltre60gg = 0;
      invoicesToCollect.forEach(invoice => {
        const monthsAfterInvoice = m - invoice.month;
        if (monthsAfterInvoice === 0) {
          const amt = invoice.amount * (params.collectionMonth0 / 100);
          incassiMese += amt;
          incassoScadenza += amt;
        } else if (monthsAfterInvoice === 1) {
          const amt = invoice.amount * (params.collectionMonth1 / 100);
          incassiMese += amt;
          incasso30gg += amt;
        } else if (monthsAfterInvoice === 2) {
          const amt = invoice.amount * (params.collectionMonth2 / 100);
          incassiMese += amt;
          incasso60gg += amt;
        } else if (monthsAfterInvoice === 3) {
          const amt = invoice.amount * (params.collectionMonth3Plus / 100);
          incassiMese += amt;
          incassoOltre60gg += amt;
        }
      });
      
      // Calculate passthrough costs with breakdown (luce + gas combined)
      const materiaEnergiaMese = invoicedCustomers * (materiaEnergiaPerCliente + materiaGasPerCliente);
      const trasportoMese = invoicedCustomers * (trasportoPerCliente + trasportoGasPerCliente);
      const oneriMese = invoicedCustomers * (oneriPerCliente + oneriGasPerCliente);
      const acciseMese = invoicedCustomers * (accisePerCliente + acciseGasPerCliente);
      const costiPassantiMese = materiaEnergiaMese + trasportoMese + oneriMese + acciseMese;
      
      // Calculate operational costs (gestione POD/PDR - based on active customers from month 2)
      const gestionePerCliente = (includeLuce ? gestionePodPerPod : 0) + (includeGas ? (params.gestionePdrPerPdr ?? 2.5) : 0);
      const costiOperativiMese = m >= 2 ? cumulativeActiveCustomers * gestionePerCliente : 0;
      
      // Calculate deposit: only NEW activations generate new deposit requirements
      // Churned customers release their deposit, payments reduce the outstanding deposit
      const nuovoDepositoAttivazioni = activatedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      const depositoRilasciatoChurn = churnedCustomers * fatturaPerCliente * depositoMesi * depositoPercentuale;
      totalDepositoLordo += nuovoDepositoAttivazioni;
      totalDepositoRilasciatoChurn += depositoRilasciatoChurn;
      
      // Reseller pays wholesaler for actual consumption (passthrough costs) - this reduces the deposit
      totalPagamentiConsumi += costiPassantiMese;
      
      const depositoRichiesto = Math.max(0, totalDepositoLordo - totalDepositoRilasciatoChurn - totalPagamentiConsumi);
      const depositoPrecedente = previousDeposito;
      const deltaDeposito = depositoRichiesto - previousDeposito;
      previousDeposito = depositoRichiesto;
      
      // Investment costs for this month (distributed based on step timing)
      const investimentiMese = monthlyInvestments[m] ?? 0;
      
      // Commercial costs (sales channel commissions)
      const costiCommercialiMese = calculateCommissionCosts(newContracts, activatedCustomers);
      
      // Tax flows (IVA F24, accise, oneri) - get from tax flows hook
      const flussiFiscaliMese = taxFlows.hasData && taxFlows.monthlyData[m] 
        ? taxFlows.monthlyData[m].totaleTaxOutflows 
        : 0;
      
      // Net cash flow
      const flussoNetto = incassiMese - costiPassantiMese - costiOperativiMese - costiCommercialiMese - flussiFiscaliMese - deltaDeposito - investimentiMese;
      const saldoPrecedente = saldoCumulativo;
      saldoCumulativo += flussoNetto;
      
      // Track min balance and first positive month
      if (saldoCumulativo < minSaldo) {
        minSaldo = saldoCumulativo;
        meseMinSaldo = monthLabel;
      }
      if (mesePrimoPositivo === null && saldoCumulativo > 0) {
        mesePrimoPositivo = monthLabel;
      }
      
      // Accumulate totals
      totaleIncassi += incassiMese;
      totaleCostiPassanti += costiPassantiMese;
      totaleCostiOperativi += costiOperativiMese;
      totaleCostiCommerciali += costiCommercialiMese;
      totaleFlussiFiscali += flussiFiscaliMese;
      if (deltaDeposito > 0) {
        totaleDepositi += deltaDeposito;
      }
      
      monthlyData.push({
        month: m,
        monthLabel,
        incassi: Math.round(incassiMese),
        costiPassanti: Math.round(costiPassantiMese),
        costiOperativi: Math.round(costiOperativiMese),
        costiCommerciali: Math.round(costiCommercialiMese),
        flussiFiscali: Math.round(flussiFiscaliMese),
        deltaDeposito: Math.round(deltaDeposito),
        investimentiIniziali: Math.round(investimentiMese),
        flussoNetto: Math.round(flussoNetto),
        saldoCumulativo: Math.round(saldoCumulativo),
        clientiAttivi: cumulativeActiveCustomers,
        contrattiNuovi: newContracts,
        attivazioni: activatedCustomers,
        fatturato: Math.round(fatturatoMese),
        breakdown: {
          incassoScadenza: Math.round(incassoScadenza),
          incasso30gg: Math.round(incasso30gg),
          incasso60gg: Math.round(incasso60gg),
          incassoOltre60gg: Math.round(incassoOltre60gg),
          materiaEnergia: Math.round(materiaEnergiaMese),
          trasporto: Math.round(trasportoMese),
          oneriSistema: Math.round(oneriMese),
          accise: Math.round(acciseMese),
          gestionePod: Math.round(costiOperativiMese),
          depositoLordoAttivazioni: Math.round(totalDepositoLordo),
          depositoRilasciatoChurn: Math.round(totalDepositoRilasciatoChurn),
          pagamentiConsumi: Math.round(totalPagamentiConsumi),
          depositoRichiesto: Math.round(depositoRichiesto),
          depositoPrecedente: Math.round(depositoPrecedente),
          churnedCustomers,
          invoicedCustomers,
          saldoPrecedente: Math.round(saldoPrecedente),
        },
      });
    }
    
    return {
      monthlyData,
      investimentoIniziale,
      massimaEsposizione: Math.abs(minSaldo),
      meseEsposizioneMassima: meseMinSaldo,
      mesePrimoPositivo,
      saldoFinale: Math.round(saldoCumulativo),
      totaleIncassi: Math.round(totaleIncassi),
      totaleCostiPassanti: Math.round(totaleCostiPassanti),
      totaleCostiOperativi: Math.round(totaleCostiOperativi),
      totaleCostiCommerciali: Math.round(totaleCostiCommerciali),
      totaleFlussiFiscali: Math.round(totaleFlussiFiscali),
      totaleDepositi: Math.round(totaleDepositi),
      hasData: monthlyData.length > 0,
    };
  }, [projectId, loading, simSummary, simData, getStepTotal, calculateCommissionCosts, taxFlows]);

  return {
    cashFlowData,
    loading,
  };
};
