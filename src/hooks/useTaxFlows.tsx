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
  ivaCreditoRiportato: number;   // Credito IVA residuo accumulato non ancora compensato a fine simulazione
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
  totaleIvaDebito: 0, totaleIvaCredito: 0, totaleIvaVersamenti: 0, ivaCreditoRiportato: 0,
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
  const { monthly: engineMonthly } = engine;

  const pendingIvaCredito: { month: number; amount: number }[] = [];
  const pendingIva: { month: number; amount: number }[] = [];
  const pendingAccise: { month: number; amount: number }[] = [];
  const pendingOneri: { month: number; amount: number }[] = [];
  const pendingTrasporto: { month: number; amount: number }[] = [];

  let totaleIvaDebito = 0, totaleIvaCredito = 0, totaleIvaVersamenti = 0;
  let ivaCredito_riportato = 0;
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

    const ivaDebito = em.ivaTotale;
    pendingIva.push({ month: m, amount: ivaDebito });
    totaleIvaDebito += ivaDebito;

    // IVA a credito: il grossista fattura al reseller in REVERSE CHARGE (art. 17 c.6 DPR 633/72).
    // La reverse charge è un'operazione puramente contabile a saldo ZERO:
    //   - Si registra IVA a debito (registro vendite) e IVA a credito (registro acquisti) per lo stesso importo
    //   - I due importi si annullano → nessun credito IVA effettivo sull'energia acquistata
    // Il reseller NON matura credito IVA sull'acquisto di energia elettrica.
    // L'unico credito IVA reale deriva dalle spese aziendali ordinarie (affitto, software, consulenze)
    // che non sono modellate in questo simulatore e che qui si approssimano a zero.
    // Conseguenza: il reseller versa all'Erario quasi tutta l'IVA incassata dai clienti.
    const ivaCredito = 0;
    pendingIvaCredito.push({ month: m, amount: ivaCredito });
    totaleIvaCredito += ivaCredito;

    let ivaPayment = 0;
    if (ivaRegime === 'monthly') {
      const idx = m - TAX_PAYMENT_CONFIG.ivaPaymentDelay;
      if (idx >= 0) {
        const debitoEntry = pendingIva.find(p => p.month === idx);
        const creditoEntry = pendingIvaCredito.find(p => p.month === idx);
        if (debitoEntry) {
          const nettoConRiporto = debitoEntry.amount - (creditoEntry?.amount ?? 0) - ivaCredito_riportato;
          if (nettoConRiporto > 0) {
            ivaPayment = nettoConRiporto;
            ivaCredito_riportato = 0;
          } else {
            ivaPayment = 0;
            ivaCredito_riportato = -nettoConRiporto;
          }
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
        const nettoConRiporto = (quarterlyDebito - quarterlyCredito - ivaCredito_riportato) * 1.01;
        if (nettoConRiporto > 0) {
          ivaPayment = nettoConRiporto;
          ivaCredito_riportato = 0;
        } else {
          ivaPayment = 0;
          ivaCredito_riportato = -nettoConRiporto / 1.01;
        }
        totaleIvaVersamenti += ivaPayment;
      }
    }

    const acciseIncassate = em.acciseTotale;
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

    const oneriIncassati = em.oneriSistemaTotale;
    pendingOneri.push({ month: m, amount: oneriIncassati });
    totaleOneriIncassati += oneriIncassati;

    let oneriRiversamento = 0;
    const oneriIdx = m - TAX_PAYMENT_CONFIG.oneriPaymentDelay;
    if (oneriIdx >= 0) {
      const entry = pendingOneri.find(p => p.month === oneriIdx);
      if (entry) { oneriRiversamento = entry.amount; totaleOneriRiversati += oneriRiversamento; }
    }

    const trasportoIncassato = em.trasportoTotale;
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
    ivaCreditoRiportato: Math.round(ivaCredito_riportato),
    totaleAcciseIncassate: Math.round(totaleAcciseIncassate),
    totaleAcciseVersate: Math.round(totaleAcciseVersate),
    totaleOneriIncassati: Math.round(totaleOneriIncassati),
    totaleOneriRiversati: Math.round(totaleOneriRiversati),
    totaleTrasportoIncassato: Math.round(totaleTrasportoIncassato),
    totaleTrasportoVersato: Math.round(totaleTrasportoVersato),
    totaleTaxOutflows: Math.round(totaleTaxOutflows),
    totaleTaxOutflowsPerCashFlow: Math.round(totaleTaxOutflowsPerCashFlow),
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
