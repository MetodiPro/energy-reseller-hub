import { useMemo } from 'react';
import { useSimulationSummary, MonthlyDepositData } from './useSimulationSummary';
import { useRevenueSimulation } from './useRevenueSimulation';
import { stepCostsData } from '@/types/stepCosts';
import { stepTimingConfig } from '@/lib/costTimingConfig';
import { useStepCosts } from './useStepCosts';
import { useSalesChannels } from './useSalesChannels';
import { useTaxFlows } from './useTaxFlows';

export interface MonthlyCashFlowData {
  month: number;
  monthLabel: string;
  // Inflows
  incassi: number;
  // Outflows
  costiPassanti: number;
  costiOperativi: number;
  costiCommerciali: number; // Commission costs for acquired customers
  flussiFiscali: number;   // Tax outflows (IVA F24, accise, oneri)
  deltaDeposito: number;
  investimentiIniziali: number;
  // Net
  flussoNetto: number;
  saldoCumulativo: number;
  // Context
  clientiAttivi: number;
  contrattiNuovi: number;
  attivazioni: number;       // Clienti effettivamente attivati (pipeline 2 mesi)
  fatturato: number;
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
    
    // Get deposit config
    const depositoMesi = (simData as any).depositoMesi ?? 3;
    const gestionePodPerPod = (simData as any).gestionePodPerPod ?? 2.5;
    
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
    
    // Track invoices for collection aging
    const invoicesToCollect: { month: number; amount: number }[] = [];
    
    // Monthly cost and revenue calculations (same as simulation summary)
    const kWh = params.avgMonthlyConsumption;
    
    // Passthrough costs per client/month
    const materiaEnergiaPerCliente = (params.punPerKwh + params.dispacciamentoPerKwh) * kWh;
    const trasportoPerCliente = 
      (params.trasportoQuotaFissaAnno / 12) + 
      (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) +
      (params.trasportoQuotaEnergiaKwh * kWh);
    const oneriPerCliente = (params.oneriAsosKwh + params.oneriArimKwh) * kWh;
    const accisePerCliente = params.acciseKwh * kWh;
    const passantiPerCliente = materiaEnergiaPerCliente + trasportoPerCliente + oneriPerCliente + accisePerCliente;
    
    // Margin components per client
    const ccvPerCliente = params.ccvMonthly;
    const spreadPerCliente = params.spreadPerKwh * kWh;
    const altroPerCliente = params.otherServicesMonthly;
    const marginePerCliente = ccvPerCliente + spreadPerCliente + altroPerCliente;
    
    // Full invoice per client (including IVA)
    const imponibilePerCliente = passantiPerCliente + marginePerCliente;
    const ivaPerCliente = imponibilePerCliente * (params.ivaPercent / 100);
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
      
      // Calculate collections this month (from previous invoices)
      let incassiMese = 0;
      invoicesToCollect.forEach(invoice => {
        const monthsAfterInvoice = m - invoice.month;
        if (monthsAfterInvoice === 0) {
          incassiMese += invoice.amount * (params.collectionMonth0 / 100);
        } else if (monthsAfterInvoice === 1) {
          incassiMese += invoice.amount * (params.collectionMonth1 / 100);
        } else if (monthsAfterInvoice === 2) {
          incassiMese += invoice.amount * (params.collectionMonth2 / 100);
        } else if (monthsAfterInvoice === 3) {
          incassiMese += invoice.amount * (params.collectionMonth3Plus / 100);
        }
      });
      
      // Calculate passthrough costs (paid to wholesaler)
      const costiPassantiMese = m >= 2 ? cumulativeActiveCustomers * passantiPerCliente : 0;
      
      // Calculate operational costs (gestione POD, etc.)
      const costiOperativiMese = m >= 2 ? cumulativeActiveCustomers * gestionePodPerPod : 0;
      
      // Calculate deposit delta
      const fatturatoMensileStimato = cumulativeActiveCustomers * fatturaPerCliente;
      const depositoRichiesto = fatturatoMensileStimato * depositoMesi;
      const deltaDeposito = depositoRichiesto - previousDeposito;
      previousDeposito = depositoRichiesto;
      
      // Investment costs for this month (distributed based on step timing)
      const investimentiMese = monthlyInvestments[m] ?? 0;
      
      // Commercial costs (sales channel commissions)
      // Commissions are paid when contracts are signed or when customers activate
      const costiCommercialiMese = calculateCommissionCosts(newContracts, activatedCustomers);
      
      // Tax flows (IVA F24, accise, oneri) - get from tax flows hook
      const flussiFiscaliMese = taxFlows.hasData && taxFlows.monthlyData[m] 
        ? taxFlows.monthlyData[m].totaleTaxOutflows 
        : 0;
      
      // Net cash flow (including tax outflows)
      const flussoNetto = incassiMese - costiPassantiMese - costiOperativiMese - costiCommercialiMese - flussiFiscaliMese - deltaDeposito - investimentiMese;
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
