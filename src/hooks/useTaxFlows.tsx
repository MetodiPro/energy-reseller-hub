import { useMemo } from 'react';
import { RevenueSimulationData } from './useRevenueSimulation';
import { SimulationEngineResult } from '@/lib/simulationEngine';
import { useEngineResult } from './useEngineResult';

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
  taxOutflowsPerCashFlow: number;
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
  totaleTaxOutflowsPerCashFlow: number;
  hasData: boolean;
}

const EMPTY_TAX: TaxFlowsSummary = {
  monthlyData: [],
  totaleIvaDebito: 0, totaleIvaCredito: 0, totaleIvaVersamenti: 0,
  totaleAcciseIncassate: 0, totaleAcciseVersate: 0,
  totaleOneriIncassati: 0, totaleOneriRiversati: 0,
  totaleTrasportoIncassato: 0, totaleTrasportoVersato: 0,
  totaleTaxOutflows: 0, totaleTaxOutflowsPerCashFlow: 0, hasData: false,
};

// IVA sugli acquisti dal grossista: sempre 22% per legge italiana,
// indipendentemente dall'aliquota IVA applicata al cliente finale (10% domestico, 22% business).
// Questo genera un credito IVA strutturale per i reseller con clientela domestica.
const IVA_ALIQUOTA_ACQUISTI = 0.22;
const TAX_PAYMENT_CONFIG = {
  ivaPaymentDelay: 1,
  acciseQuarters: [2, 5, 8, 11],
  accisePaymentDelay: 1,
  oneriPaymentDelay: 1,
  trasportoPaymentDelay: 1,
};

interface UseTaxFlowsOptions {
  simulationData?: { data: RevenueSimulationData; loading: boolean };
  sharedEngine?: SimulationEngineResult | null;
}

export function buildTaxFlows(
  engine: SimulationEngineResult,
  ivaRegime: 'monthly' | 'quarterly'
): TaxFlowsSummary {
  const { perClient, monthly: engineMonthly } = engine;

  const pendingIvaCredito: { month: number; amount: number }[] = [];
  const pendingIva: { month: number; amount: number }[] = [];
  const pendingAccise: { month: number; amount: number }[] = [];
  const pendingOneri: { month: number; amount: number }[] = [];
  const pendingTrasporto: { month: number; amount: number }[] = [];

  let totaleIvaDebito = 0, totaleIvaCredito = 0, totaleIvaVersamenti = 0;
  let totaleAcciseIncassate = 0, totaleAcciseVersate = 0;
  let totaleOneriIncassati = 0, totaleOneriRiversati = 0;
  let totaleTrasportoIncassato = 0, totaleTrasportoVersato = 0;
  let totaleTaxOutflows = 0;
  let totaleTaxOutflowsPerCashFlow = 0;

  const monthlyData: MonthlyTaxFlowData[] = [];

  for (const em of engineMonthly) {
    const { customer } = em;
    const m = customer.month;
    const clientiFatturati = customer.clientiFatturati;

    const ivaDebito = clientiFatturati * perClient.iva;
    pendingIva.push({ month: m, amount: ivaDebito });
    totaleIvaDebito += ivaDebito;

    // Costi REALI deducibili IVA del reseller (NO doppio conteggio):
    // 1. Energia acquistata dal grossista (PUN + spreadGrossista) → em.costoEnergia
    // 2. Trasporto e Oneri di sistema → pagati al distributore (per clienti fatturati)
    // 3. Gestione POD → pagata al grossista
    // NB: Le accise sono imposte erariali NON soggette a IVA
    // NB: NON usare em.costiPassanti perché include materiaEnergia (PUN + disp.)
    //     che è la componente in fattura al cliente, non il costo reale del reseller
    const costiDeducibiliIva = em.costoEnergia
      + clientiFatturati * (perClient.trasporto + perClient.oneriSistema)
      + em.costiGestionePod;
    const ivaCredito = costiDeducibiliIva * IVA_ALIQUOTA_ACQUISTI;
    pendingIvaCredito.push({ month: m, amount: ivaCredito });
    totaleIvaCredito += ivaCredito;

    let ivaPayment = 0;
    if (ivaRegime === 'monthly') {
      const idx = m - TAX_PAYMENT_CONFIG.ivaPaymentDelay;
      if (idx >= 0) {
        const debitoEntry = pendingIva.find(p => p.month === idx);
        const creditoEntry = pendingIvaCredito.find(p => p.month === idx);
        if (debitoEntry) {
          ivaPayment = Math.max(0, debitoEntry.amount - (creditoEntry?.amount ?? 0));
          totaleIvaVersamenti += ivaPayment;
        }
      }
    } else {
      const quarterlyPaymentMonths = [4, 7, 10, 2];
      if (quarterlyPaymentMonths.includes(customer.monthIndex)) {
        const quarterStart = m - 4;
        const quarterlyDebito = pendingIva
          .filter(p => p.month > quarterStart && p.month <= m - 1)
          .reduce((s, p) => s + p.amount, 0);
        const quarterlyCredito = pendingIvaCredito
          .filter(p => p.month > quarterStart && p.month <= m - 1)
          .reduce((s, p) => s + p.amount, 0);
        ivaPayment = Math.max(0, quarterlyDebito - quarterlyCredito) * 1.01;
        totaleIvaVersamenti += ivaPayment;
      }
    }

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

    const oneriIncassati = clientiFatturati * perClient.oneriSistema;
    pendingOneri.push({ month: m, amount: oneriIncassati });
    totaleOneriIncassati += oneriIncassati;

    let oneriRiversamento = 0;
    const oneriIdx = m - TAX_PAYMENT_CONFIG.oneriPaymentDelay;
    if (oneriIdx >= 0) {
      const entry = pendingOneri.find(p => p.month === oneriIdx);
      if (entry) { oneriRiversamento = entry.amount; totaleOneriRiversati += oneriRiversamento; }
    }

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
    const monthTaxCashFlow = ivaPayment + acciseVersamento;
    totaleTaxOutflows += monthTax;
    totaleTaxOutflowsPerCashFlow += monthTaxCashFlow;

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
      taxOutflowsPerCashFlow: Math.round(monthTaxCashFlow * 100) / 100,
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
}

export const useTaxFlows = (
  projectId: string | null,
  ivaRegime: 'monthly' | 'quarterly' = 'monthly',
  options?: UseTaxFlowsOptions
) => {
  // Use shared engine if provided, otherwise compute own
  const ownEngine = useEngineResult(
    options?.sharedEngine !== undefined ? null : projectId,
    options?.simulationData ? { simulationData: options.simulationData } : undefined
  );

  const engineResult = options?.sharedEngine !== undefined ? options.sharedEngine : ownEngine.engineResult;
  const loading = options?.simulationData?.loading ?? ownEngine.loading;

  const taxFlows = useMemo((): TaxFlowsSummary => {
    if (!projectId || loading || !engineResult) return EMPTY_TAX;
    return buildTaxFlows(engineResult, ivaRegime);
  }, [projectId, loading, engineResult, ivaRegime]);

  return { taxFlows, loading };
};
