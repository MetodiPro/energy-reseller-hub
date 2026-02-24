import { useMemo } from 'react';
import { useRevenueSimulation } from './useRevenueSimulation';
import { useSimulationSummary } from './useSimulationSummary';
import { runSimulationEngine } from '@/lib/simulationEngine';

export interface MonthlyTaxFlowData {
  month: number;
  monthLabel: string;
  ivaDebito: number;
  ivaCredito: number;
  ivaNetPosition: number;
  ivaPayment: number;
  acciseIncassate: number;
  acciseVersamento: number;
  oneriIncassati: number;
  oneriRiversamento: number;
  trasportoIncassato: number;
  trasportoVersamento: number;
  totaleTaxOutflows: number;
  clientiFatturati: number;
  fatturato: number;
}

export interface TaxFlowsSummary {
  monthlyData: MonthlyTaxFlowData[];
  totaleIvaDebito: number;
  totaleIvaCredito: number;
  totaleIvaVersamenti: number;
  totaleAcciseIncassate: number;
  totaleAcciseVersate: number;
  totaleOneriIncassati: number;
  totaleOneriRiversati: number;
  totaleTrasportoIncassato: number;
  totaleTrasportoVersato: number;
  totaleTaxOutflows: number;
  hasData: boolean;
}

const EMPTY_TAX: TaxFlowsSummary = {
  monthlyData: [],
  totaleIvaDebito: 0, totaleIvaCredito: 0, totaleIvaVersamenti: 0,
  totaleAcciseIncassate: 0, totaleAcciseVersate: 0,
  totaleOneriIncassati: 0, totaleOneriRiversati: 0,
  totaleTrasportoIncassato: 0, totaleTrasportoVersato: 0,
  totaleTaxOutflows: 0, hasData: false,
};

const IVA_COSTI_OPERATIVI = 0.22;

const TAX_PAYMENT_CONFIG = {
  ivaPaymentDelay: 1,
  acciseQuarters: [2, 5, 8, 11],
  accisePaymentDelay: 1,
  oneriPaymentDelay: 1,
  trasportoPaymentDelay: 1,
};

export const useTaxFlows = (projectId: string | null, ivaRegime: 'monthly' | 'quarterly' = 'monthly') => {
  const { data: simData, loading: simLoading } = useRevenueSimulation(projectId);
  const { summary: simSummary, loading: summaryLoading } = useSimulationSummary(projectId);

  const loading = simLoading || summaryLoading;

  const taxFlows = useMemo((): TaxFlowsSummary => {
    if (!projectId || loading || !simSummary.hasData) return EMPTY_TAX;

    // Usa il motore condiviso per i dati clienti
    const engine = runSimulationEngine(simData.params, simData.monthlyContracts, simData.startDate);
    const { perClient, monthly: engineMonthly } = engine;

    const pendingIva: { month: number; amount: number }[] = [];
    const pendingAccise: { month: number; amount: number }[] = [];
    const pendingOneri: { month: number; amount: number }[] = [];
    const pendingTrasporto: { month: number; amount: number }[] = [];

    let totaleIvaDebito = 0, totaleIvaCredito = 0, totaleIvaVersamenti = 0;
    let totaleAcciseIncassate = 0, totaleAcciseVersate = 0;
    let totaleOneriIncassati = 0, totaleOneriRiversati = 0;
    let totaleTrasportoIncassato = 0, totaleTrasportoVersato = 0;
    let totaleTaxOutflows = 0;

    const monthlyData: MonthlyTaxFlowData[] = [];

    for (const em of engineMonthly) {
      const { customer } = em;
      const m = customer.month;
      const clientiFatturati = customer.clientiFatturati;

      // IVA debito
      const ivaDebito = clientiFatturati * perClient.iva;
      pendingIva.push({ month: m, amount: ivaDebito });
      totaleIvaDebito += ivaDebito;

      // IVA credito (stima su costi operativi)
      const stimaCostiConIva = clientiFatturati * perClient.margineTotale * 0.3;
      const ivaCredito = stimaCostiConIva * IVA_COSTI_OPERATIVI;
      totaleIvaCredito += ivaCredito;

      // IVA payment
      let ivaPayment = 0;
      if (ivaRegime === 'monthly') {
        const idx = m - TAX_PAYMENT_CONFIG.ivaPaymentDelay;
        if (idx >= 0) {
          const entry = pendingIva.find(p => p.month === idx);
          if (entry) {
            const prevCredito = idx >= 3 ? customer.clientiAttivi * perClient.margineTotale * 0.3 * IVA_COSTI_OPERATIVI : 0;
            ivaPayment = Math.max(0, entry.amount - prevCredito);
            totaleIvaVersamenti += ivaPayment;
          }
        }
      } else {
        const quarterlyPaymentMonths = [4, 7, 10, 2];
        if (quarterlyPaymentMonths.includes(customer.monthIndex)) {
          const quarterStart = m - 4;
          const quarterlyTotal = pendingIva
            .filter(p => p.month > quarterStart && p.month <= m - 1)
            .reduce((s, p) => s + p.amount, 0);
          const quarterlyCredito = pendingIva
            .filter(p => p.month > quarterStart && p.month <= m - 1).length
            * (customer.clientiAttivi * perClient.margineTotale * 0.3 * IVA_COSTI_OPERATIVI / 3);
          ivaPayment = Math.max(0, quarterlyTotal - quarterlyCredito) * 1.01;
          totaleIvaVersamenti += ivaPayment;
        }
      }

      // Accise
      const acciseIncassate = clientiFatturati * perClient.accise;
      pendingAccise.push({ month: m, amount: acciseIncassate });
      totaleAcciseIncassate += acciseIncassate;

      let acciseVersamento = 0;
      const paymentMonths = TAX_PAYMENT_CONFIG.acciseQuarters.map(q => (q + 1) % 12);
      if (paymentMonths.includes(customer.monthIndex)) {
        const qs = m - 3;
        acciseVersamento = pendingAccise
          .filter(p => p.month > qs - TAX_PAYMENT_CONFIG.accisePaymentDelay && p.month <= m - TAX_PAYMENT_CONFIG.accisePaymentDelay)
          .reduce((s, p) => s + p.amount, 0);
        totaleAcciseVersate += acciseVersamento;
      }

      // Oneri sistema
      const oneriIncassati = clientiFatturati * perClient.oneriSistema;
      pendingOneri.push({ month: m, amount: oneriIncassati });
      totaleOneriIncassati += oneriIncassati;

      let oneriRiversamento = 0;
      const oneriIdx = m - TAX_PAYMENT_CONFIG.oneriPaymentDelay;
      if (oneriIdx >= 0) {
        const entry = pendingOneri.find(p => p.month === oneriIdx);
        if (entry) { oneriRiversamento = entry.amount; totaleOneriRiversati += oneriRiversamento; }
      }

      // Trasporto
      const trasportoIncassato = clientiFatturati * perClient.trasporto;
      pendingTrasporto.push({ month: m, amount: trasportoIncassato });
      totaleTrasportoIncassato += trasportoIncassato;

      let trasportoVersamento = 0;
      const trIdx = m - TAX_PAYMENT_CONFIG.trasportoPaymentDelay;
      if (trIdx >= 0) {
        const entry = pendingTrasporto.find(p => p.month === trIdx);
        if (entry) { trasportoVersamento = entry.amount; totaleTrasportoVersato += trasportoVersamento; }
      }

      const monthTax = ivaPayment + acciseVersamento + oneriRiversamento + trasportoVersamento;
      totaleTaxOutflows += monthTax;

      monthlyData.push({
        month: m,
        monthLabel: customer.monthLabel,
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
        totaleTaxOutflows: Math.round(monthTax * 100) / 100,
        clientiFatturati,
        fatturato: Math.round(em.fatturato * 100) / 100,
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

  return { taxFlows, loading };
};
