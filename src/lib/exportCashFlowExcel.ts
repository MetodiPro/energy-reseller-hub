/**
 * Export cash flow (Liquidità) data to Excel (CSV format with Italian locale)
 */
import type { CashFlowSummary } from '@/hooks/useCashFlowAnalysis';

const fmt = (value: number, decimals = 2): string => value.toFixed(decimals).replace('.', ',');

const esc = (value: string | number): string => {
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportCashFlowToExcel = (
  projectName: string,
  data: CashFlowSummary
): void => {
  const lines: string[] = [];

  // Header
  lines.push('ANALISI LIQUIDITÀ — FLUSSI DI CASSA');
  lines.push(`Progetto;${esc(projectName)}`);
  lines.push(`Data Export;${new Date().toLocaleDateString('it-IT')}`);
  lines.push('');

  // KPI Summary
  lines.push('RIEPILOGO KPI');
  lines.push(`Investimento Totale;${fmt(data.investimentoIniziale)}`);
  lines.push(`Massima Esposizione;${fmt(data.massimaEsposizione)}`);
  lines.push(`Mese Esposizione Massima;${esc(data.meseEsposizioneMassima)}`);
  lines.push(`Break-Even (primo mese positivo);${data.mesePrimoPositivo ?? 'Non raggiunto'}`);
  lines.push(`Saldo Finale;${fmt(data.saldoFinale)}`);
  lines.push(`Totale Incassi;${fmt(data.totaleIncassi)}`);
  lines.push(`Totale Costo Grossista;${fmt(data.totaleCostiPassanti)}`);
  lines.push(`Totale Costi Operativi;${fmt(data.totaleCostiOperativi)}`);
  lines.push(`Totale Costi Commerciali;${fmt(data.totaleCostiCommerciali)}`);
  lines.push(`Totale Flussi Fiscali;${fmt(data.totaleFlussiFiscali)}`);
  lines.push(`Totale Depositi;${fmt(data.totaleDepositi)}`);
  lines.push('');

  // Monthly detail header
  lines.push('DETTAGLIO MENSILE');
  const headers = [
    'Mese',
    'Contratti Nuovi',
    'Attivazioni',
    'Clienti Attivi',
    'Fatturato',
    'Incassi',
    'di cui Scadenza',
    'di cui 30gg',
    'di cui 60gg',
    'di cui Oltre 60gg',
    'Costo Grossista',
    'Costo Grossista (PUN+spread)',
    'Costi Operativi',
    'Costi Commerciali',
    'Flussi Fiscali',
    'Delta Deposito',
    'Deposito Richiesto',
    'Investimenti',
    'Flusso Netto',
    'Saldo Cumulativo',
  ];
  lines.push(headers.join(';'));

  // Monthly rows
  data.monthlyData.forEach((m) => {
    const b = m.breakdown;
    const row = [
      esc(m.monthLabel),
      m.contrattiNuovi,
      m.attivazioni,
      m.clientiAttivi,
      fmt(m.fatturato),
      fmt(m.incassi),
      fmt(b.incassoScadenza),
      fmt(b.incasso30gg),
      fmt(b.incasso60gg),
      fmt(b.incassoOltre60gg),
      fmt(m.costiPassanti),
      fmt(m.costiPassanti),
      fmt(m.costiOperativi),
      fmt(m.costiCommerciali),
      fmt(m.flussiFiscali),
      fmt(m.deltaDeposito),
      fmt(b.depositoRichiesto),
      fmt(m.investimentiIniziali),
      fmt(m.flussoNetto),
      fmt(m.saldoCumulativo),
    ];
    lines.push(row.join(';'));
  });

  // Investment breakdown appendix
  const hasInvestments = data.monthlyData.some((m) => m.breakdown.investmentBreakdown.length > 0);
  if (hasInvestments) {
    lines.push('');
    lines.push('DETTAGLIO INVESTIMENTI PER MESE');
    lines.push('Mese;Step;Descrizione;Importo');
    data.monthlyData.forEach((m) => {
      m.breakdown.investmentBreakdown.forEach((item) => {
        lines.push([esc(m.monthLabel), esc(item.stepId), esc(item.description), fmt(item.amount)].join(';'));
      });
    });
  }

  // Download
  const csvContent = lines.join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `liquidita_${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
