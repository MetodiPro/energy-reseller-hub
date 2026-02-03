import { useMemo } from 'react';
import { useRevenueSimulation, RevenueSimulationParams } from './useRevenueSimulation';
import { useSimulationSummary } from './useSimulationSummary';

export interface MonthlyTaxFlowData {
  month: number;
  monthLabel: string;
  
  // IVA flows
  ivaDebito: number;          // IVA collected from customers
  ivaCredito: number;         // IVA paid on purchases (costs)
  ivaNetPosition: number;     // Net IVA position (debito - credito)
  ivaPayment: number;         // F24 payment this month
  
  // Accise flows
  acciseIncassate: number;    // Excise duties collected from customers
  acciseVersamento: number;   // Quarterly payment to ADM
  
  // Pass-through charges
  oneriIncassati: number;     // ASOS + ARIM collected
  oneriRiversamento: number;  // Payment to DSO/CSEA
  
  // Trasporto (pass-through to DSO)
  trasportoIncassato: number;
  trasportoVersamento: number;
  
  // Total tax outflows this month
  totaleTaxOutflows: number;
  
  // Context
  clientiFatturati: number;
  fatturato: number;
}

export interface TaxFlowsSummary {
  monthlyData: MonthlyTaxFlowData[];
  
  // IVA totals
  totaleIvaDebito: number;
  totaleIvaCredito: number;
  totaleIvaVersamenti: number;
  
  // Accise totals
  totaleAcciseIncassate: number;
  totaleAcciseVersate: number;
  
  // Pass-through totals
  totaleOneriIncassati: number;
  totaleOneriRiversati: number;
  totaleTrasportoIncassato: number;
  totaleTrasportoVersato: number;
  
  // Overall
  totaleTaxOutflows: number;
  hasData: boolean;
}

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

// IVA rates for cost categories
const IVA_RATES = {
  costiOperativi: 0.22,      // Software, servizi
  costiPassantiEnergia: 0,   // Energy costs - already includes IVA logic
  costiCommerciali: 0.22,    // Marketing, commissions
};

// Payment timing configurations
const TAX_PAYMENT_CONFIG = {
  // IVA: monthly for large taxpayers, quarterly for small
  // We assume monthly F24 payments by the 16th of next month
  ivaPaymentDelay: 1, // months delay
  
  // Accise: quarterly to ADM
  acciseQuarters: [2, 5, 8, 11], // March, June, September, December (0-indexed)
  accisePaymentDelay: 1, // month after quarter end
  
  // Pass-through charges: monthly to DSO
  oneriPaymentDelay: 1, // months delay
  trasportoPaymentDelay: 1, // months delay
};

export const useTaxFlows = (projectId: string | null, ivaRegime: 'monthly' | 'quarterly' = 'monthly') => {
  const { data: simData, loading: simLoading } = useRevenueSimulation(projectId);
  const { summary: simSummary, loading: summaryLoading } = useSimulationSummary(projectId);

  const loading = simLoading || summaryLoading;

  const taxFlows = useMemo((): TaxFlowsSummary => {
    if (!projectId || loading || !simSummary.hasData) {
      return {
        monthlyData: [],
        totaleIvaDebito: 0,
        totaleIvaCredito: 0,
        totaleIvaVersamenti: 0,
        totaleAcciseIncassate: 0,
        totaleAcciseVersate: 0,
        totaleOneriIncassati: 0,
        totaleOneriRiversati: 0,
        totaleTrasportoIncassato: 0,
        totaleTrasportoVersato: 0,
        totaleTaxOutflows: 0,
        hasData: false,
      };
    }

    const startDate = simData.startDate;
    const startMonth = startDate.getMonth();
    const startYear = startDate.getFullYear();
    const params = simData.params;
    const monthlyContracts = simData.monthlyContracts;
    
    // Calculate per-client amounts
    const kWh = params.avgMonthlyConsumption;
    
    // Passthrough components per client
    const materiaEnergiaPerCliente = (params.punPerKwh + params.dispacciamentoPerKwh) * kWh;
    const trasportoPerCliente = 
      (params.trasportoQuotaFissaAnno / 12) + 
      (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) +
      (params.trasportoQuotaEnergiaKwh * kWh);
    const oneriPerCliente = (params.oneriAsosKwh + params.oneriArimKwh) * kWh;
    const accisePerCliente = params.acciseKwh * kWh;
    
    // Reseller margin components
    const marginePerCliente = params.ccvMonthly + (params.spreadPerKwh * kWh) + params.otherServicesMonthly;
    
    // Total taxable base
    const imponibilePerCliente = materiaEnergiaPerCliente + trasportoPerCliente + oneriPerCliente + accisePerCliente + marginePerCliente;
    const ivaPerCliente = imponibilePerCliente * (params.ivaPercent / 100);
    
    // Monthly data collection
    const monthlyData: MonthlyTaxFlowData[] = [];
    
    // Accumulators for quarterly payments
    const pendingAccise: { month: number; amount: number }[] = [];
    const pendingIva: { month: number; amount: number }[] = [];
    const pendingOneri: { month: number; amount: number }[] = [];
    const pendingTrasporto: { month: number; amount: number }[] = [];
    
    // Customer tracking
    let cumulativeActiveCustomers = 0;
    
    // Totals
    let totaleIvaDebito = 0;
    let totaleIvaCredito = 0;
    let totaleIvaVersamenti = 0;
    let totaleAcciseIncassate = 0;
    let totaleAcciseVersate = 0;
    let totaleOneriIncassati = 0;
    let totaleOneriRiversati = 0;
    let totaleTrasportoIncassato = 0;
    let totaleTrasportoVersato = 0;
    let totaleTaxOutflows = 0;
    
    for (let m = 0; m < 14; m++) {
      const monthIndex = (startMonth + m) % 12;
      const yearOffset = Math.floor((startMonth + m) / 12);
      const monthLabel = `${MONTHS_IT[monthIndex]} ${startYear + yearOffset}`;
      
      // Calculate active customers (same logic as cash flow)
      const activatedCustomers = m >= 2
        ? Math.round((m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)) 
        : 0;
      
      const churnedCustomers = m >= 3 
        ? Math.round(cumulativeActiveCustomers * (params.monthlyChurnRate / 100))
        : 0;
      
      cumulativeActiveCustomers = Math.max(0, cumulativeActiveCustomers + activatedCustomers - churnedCustomers);
      
      // Invoiced customers (billing starts after 3 months)
      const clientiFatturati = m >= 3 ? cumulativeActiveCustomers : 0;
      const fatturato = clientiFatturati * (imponibilePerCliente + ivaPerCliente);
      
      // === IVA DEBITO (collected from customers) ===
      const ivaDebito = clientiFatturati * ivaPerCliente;
      pendingIva.push({ month: m, amount: ivaDebito });
      totaleIvaDebito += ivaDebito;
      
      // === IVA CREDITO (on operational costs) ===
      // Estimate IVA credit on operational costs (simplified: 22% on ~30% of passthrough as service costs)
      const stimaCostiConIva = clientiFatturati * marginePerCliente * 0.3; // Estimate costs with IVA
      const ivaCredito = stimaCostiConIva * IVA_RATES.costiOperativi;
      totaleIvaCredito += ivaCredito;
      
      // === IVA PAYMENT (F24 - monthly or quarterly based on regime) ===
      let ivaPayment = 0;
      
      if (ivaRegime === 'monthly') {
        // Monthly F24: pay previous month's net IVA
        const ivaToPayIndex = m - TAX_PAYMENT_CONFIG.ivaPaymentDelay;
        if (ivaToPayIndex >= 0) {
          const pendingEntry = pendingIva.find(p => p.month === ivaToPayIndex);
          if (pendingEntry) {
            const previousCredito = ivaToPayIndex >= 3 
              ? (m >= 4 ? cumulativeActiveCustomers : 0) * marginePerCliente * 0.3 * IVA_RATES.costiOperativi
              : 0;
            ivaPayment = Math.max(0, pendingEntry.amount - previousCredito);
            totaleIvaVersamenti += ivaPayment;
          }
        }
      } else {
        // Quarterly F24: pay on specific months (May, Aug, Nov, Feb/Mar)
        // Q1 (Jan-Mar) -> May 16, Q2 (Apr-Jun) -> Aug 20, Q3 (Jul-Sep) -> Nov 16, Q4 (Oct-Dec) -> Mar 16
        const quarterlyPaymentMonths = [4, 7, 10, 2]; // May, Aug, Nov, Mar (next year for Q4)
        if (quarterlyPaymentMonths.includes(monthIndex)) {
          // Sum previous quarter's IVA
          const quarterStart = m - 4; // 3 months of quarter + 1 month delay
          const quarterlyTotal = pendingIva
            .filter(p => p.month > quarterStart && p.month <= m - 1)
            .reduce((sum, p) => sum + p.amount, 0);
          
          const quarterlyCredito = pendingIva
            .filter(p => p.month > quarterStart && p.month <= m - 1)
            .length * (cumulativeActiveCustomers * marginePerCliente * 0.3 * IVA_RATES.costiOperativi / 3);
          
          ivaPayment = Math.max(0, quarterlyTotal - quarterlyCredito);
          // Add 1% interest for quarterly regime
          ivaPayment = ivaPayment * 1.01;
          totaleIvaVersamenti += ivaPayment;
        }
      }
      
      // === ACCISE (collected from customers) ===
      const acciseIncassate = clientiFatturati * accisePerCliente;
      pendingAccise.push({ month: m, amount: acciseIncassate });
      totaleAcciseIncassate += acciseIncassate;
      
      // === ACCISE PAYMENT (quarterly to ADM) ===
      let acciseVersamento = 0;
      // Check if this is a quarter-end payment month (March, June, Sept, Dec + 1 month delay)
      const paymentMonths = TAX_PAYMENT_CONFIG.acciseQuarters.map(q => (q + 1) % 12);
      if (paymentMonths.includes(monthIndex)) {
        // Sum all pending accise from the previous quarter
        const quarterStart = m - 3;
        acciseVersamento = pendingAccise
          .filter(p => p.month > quarterStart - TAX_PAYMENT_CONFIG.accisePaymentDelay && p.month <= m - TAX_PAYMENT_CONFIG.accisePaymentDelay)
          .reduce((sum, p) => sum + p.amount, 0);
        totaleAcciseVersate += acciseVersamento;
      }
      
      // === ONERI SISTEMA (ASOS + ARIM collected) ===
      const oneriIncassati = clientiFatturati * oneriPerCliente;
      pendingOneri.push({ month: m, amount: oneriIncassati });
      totaleOneriIncassati += oneriIncassati;
      
      // === ONERI PAYMENT (monthly to DSO) ===
      let oneriRiversamento = 0;
      const oneriToPayIndex = m - TAX_PAYMENT_CONFIG.oneriPaymentDelay;
      if (oneriToPayIndex >= 0) {
        const pendingEntry = pendingOneri.find(p => p.month === oneriToPayIndex);
        if (pendingEntry) {
          oneriRiversamento = pendingEntry.amount;
          totaleOneriRiversati += oneriRiversamento;
        }
      }
      
      // === TRASPORTO (collected and paid to DSO) ===
      const trasportoIncassato = clientiFatturati * trasportoPerCliente;
      pendingTrasporto.push({ month: m, amount: trasportoIncassato });
      totaleTrasportoIncassato += trasportoIncassato;
      
      // === TRASPORTO PAYMENT (monthly to DSO) ===
      let trasportoVersamento = 0;
      const trasportoToPayIndex = m - TAX_PAYMENT_CONFIG.trasportoPaymentDelay;
      if (trasportoToPayIndex >= 0) {
        const pendingEntry = pendingTrasporto.find(p => p.month === trasportoToPayIndex);
        if (pendingEntry) {
          trasportoVersamento = pendingEntry.amount;
          totaleTrasportoVersato += trasportoVersamento;
        }
      }
      
      // Total tax outflows this month
      const monthTaxOutflows = ivaPayment + acciseVersamento + oneriRiversamento + trasportoVersamento;
      totaleTaxOutflows += monthTaxOutflows;
      
      monthlyData.push({
        month: m,
        monthLabel,
        ivaDebito: Math.round(ivaDebito * 100) / 100,
        ivaCredito: Math.round(ivaCredito * 100) / 100,
        ivaNetPosition: Math.round((ivaDebito - ivaCredito) * 100) / 100,
        ivaPayment: Math.round(ivaPayment * 100) / 100,
        acciseIncassate: Math.round(acciseIncassate * 100) / 100,
        acciseVersamento: Math.round(acciseVersamento * 100) / 100,
        oneriIncassati: Math.round(oneriIncassati * 100) / 100,
        oneriRiversamento: Math.round(oneriRiversamento * 100) / 100,
        trasportoIncassato: Math.round(trasportoIncassato * 100) / 100,
        trasportoVersamento: Math.round(trasportoVersamento * 100) / 100,
        totaleTaxOutflows: Math.round(monthTaxOutflows * 100) / 100,
        clientiFatturati,
        fatturato: Math.round(fatturato * 100) / 100,
      });
    }
    
    return {
      monthlyData,
      totaleIvaDebito: Math.round(totaleIvaDebito),
      totaleIvaCredito: Math.round(totaleIvaCredito),
      totaleIvaVersamenti: Math.round(totaleIvaVersamenti),
      totaleAcciseIncassate: Math.round(totaleAcciseIncassate),
      totaleAcciseVersate: Math.round(totaleAcciseVersate),
      totaleOneriIncassati: Math.round(totaleOneriIncassati),
      totaleOneriRiversati: Math.round(totaleOneriRiversati),
      totaleTrasportoIncassato: Math.round(totaleTrasportoIncassato),
      totaleTrasportoVersato: Math.round(totaleTrasportoVersato),
      totaleTaxOutflows: Math.round(totaleTaxOutflows),
      hasData: monthlyData.length > 0,
    };
  }, [projectId, loading, simSummary, simData, ivaRegime]);

  return {
    taxFlows,
    loading,
  };
};
