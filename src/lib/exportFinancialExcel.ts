import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { SimulationEngineResult } from '@/lib/simulationEngine';
import type { RevenueSimulationParams } from '@/hooks/useRevenueSimulation';
import type { TaxFlowsSummary } from '@/hooks/useTaxFlows';

const fmt = (v: number) => Math.round(v * 100) / 100;

// ─── Report Grossista ───────────────────────────────────────

export function exportGrossistaReport(
  projectName: string,
  engineResult: SimulationEngineResult,
  params: RevenueSimulationParams
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Dettaglio Mensile
  const rows = engineResult.monthly.map(m => ({
    'Mese': m.customer.monthLabel,
    'POD Attivi': m.customer.clientiAttivi,
    'Nuove Attivazioni': m.customer.attivazioni,
    'Churn': m.customer.churn,
    'kWh Acquistati': fmt(m.customer.clientiAttivi * params.avgMonthlyConsumption),
    'PUN (€/kWh)': params.punPerKwh,
    'Spread Grossista (€/kWh)': params.spreadGrossistaPerKwh,
    'Dispacciamento (€/kWh)': params.dispacciamentoPerKwh,
    'Costo Energia Grossista (PUN+Disp+Spread) (€)': fmt(m.costoEnergiaConDisp),
    'Fee Gestione POD (€)': fmt(m.costiGestionePod),
    'Totale Fattura Grossista (€)': fmt(m.costoEnergiaConDisp + m.costiGestionePod),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Report Grossista');

  // Sheet 2: Riepilogo Annuale
  const totals = engineResult.monthly.reduce(
    (acc, m) => {
      acc.kWhTotali += m.customer.clientiAttivi * params.avgMonthlyConsumption;
      acc.costoEnergiaConDisp += m.costoEnergiaConDisp;
      acc.feePod += m.costiGestionePod;
      acc.attivazioni += m.customer.attivazioni;
      acc.churn += m.customer.churn;
      return acc;
    },
    { kWhTotali: 0, costoEnergiaConDisp: 0, feePod: 0, attivazioni: 0, churn: 0 }
  );

  const lastMonth = engineResult.monthly[engineResult.monthly.length - 1];
  const summaryRows = [
    { 'Voce': 'Periodo Simulazione', 'Valore': `${engineResult.monthly[0]?.customer.monthLabel} - ${lastMonth?.customer.monthLabel}` },
    { 'Voce': 'Totale kWh Acquistati', 'Valore': fmt(totals.kWhTotali) },
    { 'Voce': 'Totale Attivazioni', 'Valore': totals.attivazioni },
    { 'Voce': 'Totale Churn', 'Valore': totals.churn },
    { 'Voce': 'POD Attivi Fine Periodo', 'Valore': lastMonth?.customer.clientiAttivi || 0 },
    { 'Voce': '', 'Valore': '' },
    { 'Voce': 'Costo Energia Grossista (PUN+Disp+Spread) Totale (€)', 'Valore': fmt(totals.costoEnergiaConDisp) },
    { 'Voce': 'Fee Gestione POD Totale (€)', 'Valore': fmt(totals.feePod) },
    { 'Voce': 'TOTALE FATTURA GROSSISTA (€)', 'Valore': fmt(totals.costoEnergiaConDisp + totals.feePod) },
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  ws2['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Riepilogo Annuale');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${projectName}_Report_Grossista.xlsx`);
}

// ─── Report Fiscale ─────────────────────────────────────────

export function exportFiscaleReport(
  projectName: string,
  engineResult: SimulationEngineResult,
  taxFlows: TaxFlowsSummary,
  params: RevenueSimulationParams
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: IVA Mensile
  const ivaRows = taxFlows.monthlyData.map(m => ({
    'Mese': m.monthLabel,
    'Clienti Fatturati': m.clientiFatturati,
    'Fatturato (€)': fmt(m.fatturato),
    'IVA a Debito (€)': fmt(m.ivaDebito),
    'IVA a Credito (€)': fmt(m.ivaCredito),
    'Posizione Netta (€)': fmt(m.ivaNetPosition),
    'IVA da Versare (€)': fmt(m.ivaPayment),
    'Regime': params.ivaPaymentRegime === 'quarterly' ? 'Trimestrale' : 'Mensile',
  }));

  // Add totals row
  ivaRows.push({
    'Mese': 'TOTALE',
    'Clienti Fatturati': '' as any,
    'Fatturato (€)': fmt(taxFlows.monthlyData.reduce((s, m) => s + m.fatturato, 0)),
    'IVA a Debito (€)': fmt(taxFlows.totaleIvaDebito),
    'IVA a Credito (€)': fmt(taxFlows.totaleIvaCredito),
    'Posizione Netta (€)': fmt(taxFlows.totaleIvaDebito - taxFlows.totaleIvaCredito),
    'IVA da Versare (€)': fmt(taxFlows.totaleIvaVersamenti),
    'Credito Residuo Riportato (€)': fmt(taxFlows.ivaCreditoRiportato),
  });

  const wsIva = XLSX.utils.json_to_sheet(ivaRows);
  wsIva['!cols'] = Object.keys(ivaRows[0] || {}).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsIva, 'IVA Mensile');

  // Sheet 2: Accise
  const acciseRows = taxFlows.monthlyData.map(m => {
    const engineMonth = engineResult.monthly.find(em => em.customer.monthLabel === m.monthLabel);
    const kWhFatturati = (engineMonth?.customer.clientiFatturati || 0) * params.avgMonthlyConsumption;
    return {
      'Mese': m.monthLabel,
      'kWh Fatturati': fmt(kWhFatturati),
      'Aliquota Accise (€/kWh)': params.acciseKwh,
      'Accise Incassate (€)': fmt(m.acciseIncassate),
      'Versamento Accise (€)': fmt(m.acciseVersamento),
    };
  });

  acciseRows.push({
    'Mese': 'TOTALE',
    'kWh Fatturati': '' as any,
    'Aliquota Accise (€/kWh)': '' as any,
    'Accise Incassate (€)': fmt(taxFlows.totaleAcciseIncassate),
    'Versamento Accise (€)': fmt(taxFlows.totaleAcciseVersate),
  });

  const wsAccise = XLSX.utils.json_to_sheet(acciseRows);
  wsAccise['!cols'] = Object.keys(acciseRows[0] || {}).map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, wsAccise, 'Accise');

  // Sheet 3: Stima IRES/IRAP
  const margineAnnuo = engineResult.monthly.reduce((s, m) => s + m.margineCommerciale, 0);
  const costiOperativi = engineResult.monthly.reduce((s, m) => s + m.costiGestionePod, 0);
  const baseImponibileIres = Math.max(0, margineAnnuo - costiOperativi);
  const aliquotaIres = 0.24;
  const aliquotaIrap = 0.039;

  const iresIrapRows = [
    { 'Voce': '⚠️ STIMA INDICATIVA — NON USARE PER DICHIARAZIONI FISCALI', 'Valore (€)': '' as any },
    { 'Voce': 'Consultare un commercialista per il calcolo fiscale effettivo', 'Valore (€)': '' as any },
    { 'Voce': 'La stima non considera ammortamenti, costi strutturali e perdite pregresse', 'Valore (€)': '' as any },
    { 'Voce': '', 'Valore (€)': '' as any },
    { 'Voce': 'Margine Commerciale Annuo (CCV + Spread + Altro)', 'Valore (€)': fmt(margineAnnuo) },
    { 'Voce': 'Deduzione Costi Operativi (Fee POD)', 'Valore (€)': fmt(-costiOperativi) },
    { 'Voce': '', 'Valore (€)': '' as any },
    { 'Voce': 'Base Imponibile Stimata IRES', 'Valore (€)': fmt(baseImponibileIres) },
    { 'Voce': 'Aliquota IRES', 'Valore (€)': '24%' as any },
    { 'Voce': 'Stima IRES Dovuta', 'Valore (€)': fmt(baseImponibileIres * aliquotaIres) },
    { 'Voce': '', 'Valore (€)': '' as any },
    { 'Voce': 'Base Imponibile Stimata IRAP', 'Valore (€)': fmt(margineAnnuo) },
    { 'Voce': 'Aliquota IRAP', 'Valore (€)': '3.9%' as any },
    { 'Voce': 'Stima IRAP Dovuta', 'Valore (€)': fmt(margineAnnuo * aliquotaIrap) },
    { 'Voce': '', 'Valore (€)': '' as any },
    { 'Voce': 'TOTALE STIMA IMPOSTE', 'Valore (€)': fmt(baseImponibileIres * aliquotaIres + margineAnnuo * aliquotaIrap) },
  ];

  const wsIresIrap = XLSX.utils.json_to_sheet(iresIrapRows);
  wsIresIrap['!cols'] = [{ wch: 55 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsIresIrap, 'Stima IRES-IRAP (indicativa)');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${projectName}_Report_Fiscale.xlsx`);
}
