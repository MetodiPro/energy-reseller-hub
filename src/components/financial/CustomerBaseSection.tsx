import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Download, MousePointerClick } from 'lucide-react';
import { MultiProductEngineResult } from '@/lib/simulationEngine';
import { ChurnPerProductChart } from './ChurnPerProductChart';
import { ContractsPerProductChart } from './ContractsPerProductChart';
import { ActivationsPerProductChart } from './ActivationsPerProductChart';
import { ActivePodsPerProductChart } from './ActivePodsPerProductChart';
import * as XLSX from 'xlsx';

interface CustomerBaseSectionProps {
  multiProductResult: MultiProductEngineResult | null;
  totalActiveEnd: number;
}

interface MonthRow {
  monthLabel: string;
  [key: string]: string | number;
}

export const CustomerBaseSection = ({ multiProductResult, totalActiveEnd }: CustomerBaseSectionProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { tableData, columns } = useMemo(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) {
      return { tableData: [] as MonthRow[], columns: [] as { key: string; label: string }[] };
    }

    const prods = multiProductResult.products;
    const monthCount = prods[0].result.monthly.length;

    const cols: { key: string; label: string }[] = [{ key: 'monthLabel', label: 'Mese' }];

    if (prods.length > 1) {
      prods.forEach(p => {
        cols.push({ key: `contratti_${p.product.id}`,   label: `Contr. ${p.product.name}` });
        cols.push({ key: `attivazioni_${p.product.id}`, label: `Attiv. ${p.product.name}` });
        cols.push({ key: `churn_${p.product.id}`,       label: `SwitchOut ${p.product.name}` });
        cols.push({ key: `attivi_${p.product.id}`,      label: `Attivi ${p.product.name}` });
        cols.push({ key: `fatturati_${p.product.id}`,   label: `Fatt. ${p.product.name}` });
      });
    }

    cols.push({ key: 'tot_contratti',   label: 'Tot. Contratti' });
    cols.push({ key: 'tot_attivazioni', label: 'Tot. Attivazioni' });
    cols.push({ key: 'tot_churn',       label: 'Tot. Switch-Out' });
    cols.push({ key: 'tot_attivi',      label: 'Tot. Attivi' });
    cols.push({ key: 'tot_fatturati',   label: 'Tot. Fatturati' });

    const rows: MonthRow[] = [];
    for (let m = 0; m < monthCount; m++) {
      const row: MonthRow = {
        monthLabel: prods[0].result.monthly[m].customer.monthLabel,
      };

      let totContratti = 0;
      let totAttivazioni = 0;
      let totChurn = 0;
      let totAttivi = 0;
      let totFatturati = 0;

      prods.forEach(p => {
        const cm = p.result.monthly[m].customer;
        row[`contratti_${p.product.id}`]   = cm.contrattiNuovi;
        row[`attivazioni_${p.product.id}`] = cm.attivazioni;
        row[`churn_${p.product.id}`]       = cm.churn;
        row[`attivi_${p.product.id}`]      = cm.clientiAttivi;
        row[`fatturati_${p.product.id}`]   = cm.clientiFatturati;

        totContratti   += cm.contrattiNuovi;
        totAttivazioni += cm.attivazioni;
        totChurn       += cm.churn;
        totAttivi      += cm.clientiAttivi;
        totFatturati   += cm.clientiFatturati;
      });

      row.tot_contratti   = totContratti;
      row.tot_attivazioni = totAttivazioni;
      row.tot_churn       = totChurn;
      row.tot_attivi      = totAttivi;
      row.tot_fatturati   = totFatturati;

      rows.push(row);
    }

    return { tableData: rows, columns: cols };
  }, [multiProductResult]);

  const handleExportXlsx = useCallback(() => {
    if (tableData.length === 0) return;
    const wsData = [columns.map(c => c.label)];
    tableData.forEach(row => {
      wsData.push(columns.map(c => String(row[c.key] ?? '')));
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = columns.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Base');
    XLSX.writeFile(wb, 'customer_base.xlsx');
  }, [tableData, columns]);

  if (!multiProductResult || multiProductResult.products.length === 0) return null;

  const aggregatedMonthly = multiProductResult.aggregated.monthly;
  const lastMonth = aggregatedMonthly[aggregatedMonthly.length - 1];
  const totalAttiviFinali = lastMonth?.customer.clientiAttivi ?? 0;
  const totalAttivazioniCumulative = aggregatedMonthly.reduce((s, m) => s + m.customer.attivazioni, 0);
  const totalSwitchOutCumulativo   = aggregatedMonthly.reduce((s, m) => s + m.customer.churn, 0);
  const totalContrattiCumulativi   = aggregatedMonthly.reduce((s, m) => s + m.customer.contrattiNuovi, 0);

  return (
    <div className="space-y-6">
      {/* KPI Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Customer Base
          </CardTitle>
          <CardDescription>
            Evoluzione dei punti di fornitura lungo il periodo di simulazione (14 mesi).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary KPIs row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Contratti totali firmati</p>
              <p className="text-xl font-bold text-foreground">{totalContrattiCumulativi.toLocaleString('it-IT')}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Attivazioni totali</p>
              <p className="text-xl font-bold text-foreground">{totalAttivazioniCumulative.toLocaleString('it-IT')}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Switch-Out totali</p>
              <p className="text-xl font-bold text-destructive">{totalSwitchOutCumulativo.toLocaleString('it-IT')}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">POD attivi a fine simulazione</p>
              <p className="text-xl font-bold text-foreground">{totalAttiviFinali.toLocaleString('it-IT')}</p>
            </div>
          </div>

          {/* Detail trigger button */}
          <button
            onClick={() => setDialogOpen(true)}
            className="group flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer w-full text-left"
          >
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Visualizza dettaglio mensile per prodotto
            </span>
            <Badge variant="outline" className="ml-auto gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <MousePointerClick className="h-3 w-3" />
              Dettaglio mensile
            </Badge>
          </button>
        </CardContent>
      </Card>

      {/* Monthly Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Base — Dettaglio Mensile per Prodotto
            </DialogTitle>
            <DialogDescription>
              Per ogni mese: contratti firmati dalla rete, attivazioni (entrate in fornitura con 2 mesi di lag dalla firma),
              switch-out (uscite effettive: ogni recesso produce uscita 2 mesi dopo per il processo SII),
              POD attivi cumulativi e POD fatturati.
              <span className="block mt-1 text-xs">
                ⓘ Switch-out = 0 nei mesi 1-2: fisiologico, il ritardo SII fa emergere le prime uscite dal mese 3.
                POD fatturati = 0 nei mesi 1-3: il primo ciclo di fatturazione completo si apre dal 3° mese dall'attivazione.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExportXlsx} className="gap-2">
              <Download className="h-4 w-4" />
              Esporta Excel
            </Button>
          </div>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(col => (
                    <TableHead key={col.key} className={col.key !== 'monthLabel' ? 'text-right' : ''}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, i) => (
                  <TableRow key={i}>
                    {columns.map(col => {
                      const val = row[col.key];
                      const isChurn     = col.key.startsWith('churn_') || col.key === 'tot_churn';
                      const isAttivi    = col.key.startsWith('attivi_') || col.key === 'tot_attivi';
                      const isFatturati = col.key.startsWith('fatturati_') || col.key === 'tot_fatturati';
                      const isTotal     = col.key.startsWith('tot_');
                      const isMonth     = col.key === 'monthLabel';
                      return (
                        <TableCell
                          key={col.key}
                          className={`${!isMonth ? 'text-right' : ''} ${isTotal ? 'font-semibold' : ''} ${isChurn ? 'text-destructive' : ''} ${isAttivi ? 'text-primary' : ''} ${isFatturati ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                        >
                          {typeof val === 'number' ? val.toLocaleString('it-IT') : val}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contracts chart */}
      <ContractsPerProductChart multiProductResult={multiProductResult} />

      {/* Activations chart */}
      <ActivationsPerProductChart multiProductResult={multiProductResult} />

      {/* Active PODs chart */}
      <ActivePodsPerProductChart multiProductResult={multiProductResult} />

      {/* Churn chart */}
      <ChurnPerProductChart multiProductResult={multiProductResult} />
    </div>
  );
};
