/**
 * Export simulation data to Excel (CSV format for compatibility)
 */

interface MonthData {
  label: string;
  newContracts: number;
  activatedCustomers: number;
  churnedCustomers: number;
  activeCustomers: number;
  invoicedCustomers: number;
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  margineCCV: number;
  margineSpread: number;
  margineAltro: number;
  margineTotale: number;
  imponibileTotale: number;
  iva: number;
  fatturaTotale: number;
  expectedCollection: number;
  cumulativeCollection: number;
  cumulativeUncollected: number;
  pendingReceivables: number;
}

interface ExportParams {
  ccvMonthly: number;
  spreadPerKwh: number;
  otherServicesMonthly: number;
  avgMonthlyConsumption: number;
  punPerKwh: number;
  ivaPercent: number;
  activationRate: number;
  monthlyChurnRate: number;
  churnMonth1Pct?: number;
  churnMonth2Pct?: number;
  churnMonth3Pct?: number;
  churnDecayFactor?: number;
  uncollectibleRate: number;
}

interface Totals {
  totalContracts: number;
  totalChurned: number;
  totalActiveCustomers: number;
  totalFatturato: number;
  totalMargine: number;
  totalPassanti: number;
  totalIva: number;
  totalCollected: number;
  totalUncollected: number;
  totalPending: number;
}

const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals).replace('.', ',');
};

const escapeCSV = (value: string | number): string => {
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportSimulationToExcel = (
  projectName: string,
  projection: MonthData[],
  params: ExportParams,
  totals: Totals
): void => {
  // Build CSV content with Italian format (semicolon separator)
  const lines: string[] = [];
  
  // Header section
  lines.push('SIMULAZIONE RICAVI RESELLER ENERGIA');
  lines.push(`Progetto;${escapeCSV(projectName)}`);
  lines.push(`Data Export;${new Date().toLocaleDateString('it-IT')}`);
  lines.push('');
  
  // Parameters section
  lines.push('PARAMETRI SIMULAZIONE');
  lines.push(`CCV (€/mese);${formatNumber(params.ccvMonthly)}`);
  lines.push(`Spread su PUN (€/kWh);${formatNumber(params.spreadPerKwh, 4)}`);
  lines.push(`Altri servizi (€/mese);${formatNumber(params.otherServicesMonthly)}`);
  lines.push(`Consumo medio (kWh/mese);${formatNumber(params.avgMonthlyConsumption, 0)}`);
  lines.push(`PUN (€/kWh);${formatNumber(params.punPerKwh, 4)}`);
  lines.push(`IVA (%);${formatNumber(params.ivaPercent, 0)}`);
  lines.push(`Tasso attivazione (%);${formatNumber(params.activationRate)}`);
  lines.push(`Churn 1° mese (%);${formatNumber(params.churnMonth1Pct ?? params.monthlyChurnRate, 1)}`);
  lines.push(`Churn 2° mese (%);${formatNumber(params.churnMonth2Pct ?? params.monthlyChurnRate, 1)}`);
  lines.push(`Churn 3° mese (%);${formatNumber(params.churnMonth3Pct ?? params.monthlyChurnRate, 1)}`);
  lines.push(`Fattore decadimento;${formatNumber(params.churnDecayFactor ?? 0.85, 2)}`);
  lines.push(`Insoluti (%);${formatNumber(params.uncollectibleRate)}`);
  lines.push('');
  
  // Summary section
  lines.push('RIEPILOGO TOTALI');
  lines.push(`Contratti totali;${totals.totalContracts}`);
  lines.push(`Switch-out totali;${totals.totalChurned}`);
  lines.push(`Clienti attivi finali;${totals.totalActiveCustomers}`);
  lines.push(`Fatturato totale;${formatNumber(totals.totalFatturato)}`);
  lines.push(`Margine reseller;${formatNumber(totals.totalMargine)}`);
  lines.push(`Costi passanti;${formatNumber(totals.totalPassanti)}`);
  lines.push(`IVA totale;${formatNumber(totals.totalIva)}`);
  lines.push(`Incassato;${formatNumber(totals.totalCollected)}`);
  lines.push(`Insoluti;${formatNumber(totals.totalUncollected)}`);
  lines.push(`Crediti pendenti;${formatNumber(totals.totalPending)}`);
  lines.push('');
  
  // Monthly data header
  lines.push('PROIEZIONE MENSILE');
  const headers = [
    'Mese',
    'Contratti',
    'Attivati',
    'Switch-out',
    'Clienti Attivi',
    'Clienti Fatturati',
    'Materia Energia',
    'Trasporto',
    'Oneri Sistema',
    'Accise',
    'Margine CCV',
    'Margine Spread',
    'Margine Altro',
    'Margine Totale',
    'Imponibile',
    'IVA',
    'Fattura Totale',
    'Incasso Mese',
    'Incasso Cumulato',
    'Insoluti Cumulati',
    'Crediti Pendenti'
  ];
  lines.push(headers.join(';'));
  
  // Monthly data rows
  projection.forEach(month => {
    const row = [
      escapeCSV(month.label),
      month.newContracts,
      month.activatedCustomers,
      month.churnedCustomers,
      month.activeCustomers,
      month.invoicedCustomers,
      formatNumber(month.materiaEnergia),
      formatNumber(month.trasporto),
      formatNumber(month.oneriSistema),
      formatNumber(month.accise),
      formatNumber(month.margineCCV),
      formatNumber(month.margineSpread),
      formatNumber(month.margineAltro),
      formatNumber(month.margineTotale),
      formatNumber(month.imponibileTotale),
      formatNumber(month.iva),
      formatNumber(month.fatturaTotale),
      formatNumber(month.expectedCollection),
      formatNumber(month.cumulativeCollection),
      formatNumber(month.cumulativeUncollected),
      formatNumber(month.pendingReceivables),
    ];
    lines.push(row.join(';'));
  });
  
  // Create and download file
  const csvContent = lines.join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `simulazione_ricavi_${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
