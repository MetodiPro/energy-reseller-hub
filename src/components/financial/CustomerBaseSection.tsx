import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Download, MousePointerClick } from 'lucide-react';
import { MultiProductEngineResult } from '@/lib/simulationEngine';
import { ChurnPerProductChart } from './ChurnPerProductChart';
import * as XLSX from 'xlsx';

interface CustomerBaseSectionProps {
  multiProductResult: MultiProductEngineResult | null;
  totalActiveEnd: number;
}

interface MonthRow {
  month: string;
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
    const cols: { key: string; label: string }[] = [{ key: 'month', label: 'Mese' }];

    prods.forEach(p => {
      cols.push({ key: `contratti_${p.product.id}`, label: `Contratti ${p.product.name}` });
      cols.push({ key: `non_attivati_${p.product.id}`, label: `Non attivati ${p.product.name}` });
      cols.push({ key: `attivi_${p.product.id}`, label: `Attivi ${p.product.name}` });
      cols.push({ key: `churn_${p.product.id}`, label: `Churn ${p.product.name}` });
    });
    cols.push({ key: 'totale_contratti', label: 'Tot. Contratti' });
    cols.push({ key: 'totale_non_attivati', label: 'Tot. Non Attivati' });
    cols.push({ key: 'totale_attivi', label: 'Tot. Attivi' });
    cols.push({ key: 'totale_churn', label: 'Tot. Churn' });

    const rows: MonthRow[] = [];
    for (let m = 0; m < monthCount; m++) {
      const row: MonthRow = { month: prods[0].result.monthly[m].customer.monthLabel };
      let totAttivi = 0;
      let totChurn = 0;
      let totContratti = 0;
      let totNonAttivati = 0;
      prods.forEach(p => {
        const cm = p.result.monthly[m].customer;
        const nonAttivati = Math.max(0, cm.contrattiNuovi - cm.attivazioni);
        row[`contratti_${p.product.id}`] = cm.contrattiNuovi;
        row[`non_attivati_${p.product.id}`] = nonAttivati;
        row[`attivi_${p.product.id}`] = cm.clientiAttivi;
        row[`churn_${p.product.id}`] = cm.churn;
        totContratti += cm.contrattiNuovi;
        totNonAttivati += nonAttivati;
        totAttivi += cm.clientiAttivi;
        totChurn += cm.churn;
      });
      row.totale_contratti = totContratti;
      row.totale_non_attivati = totNonAttivati;
      row.totale_attivi = totAttivi;
      row.totale_churn = totChurn;
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
    // Set column widths
    ws['!cols'] = columns.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Base');
    XLSX.writeFile(wb, 'customer_base.xlsx');
  }, [tableData, columns]);

  if (!multiProductResult || multiProductResult.products.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Customer Base KPI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Customer Base
          </CardTitle>
          <CardDescription>
            Punti di fornitura attivi alla fine del periodo di simulazione previsto nelle Ipotesi Operative.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => setDialogOpen(true)}
            className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer w-full text-left"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{totalActiveEnd.toLocaleString('it-IT')}</p>
              <p className="text-sm text-muted-foreground">Punti di fornitura attivi al termine della simulazione</p>
            </div>
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
              Clienti attivi e switch-out mensili per ogni prodotto commerciale.
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
                    <TableHead key={col.key} className={col.key !== 'month' ? 'text-right' : ''}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, i) => (
                  <TableRow key={i}>
                    {columns.map(col => (
                      <TableCell
                        key={col.key}
                        className={`${col.key !== 'month' ? 'text-right' : ''} ${
                          col.key.startsWith('totale') ? 'font-semibold' : ''
                        } ${(col.key.startsWith('churn') || col.key === 'totale_churn') ? 'text-destructive' : ''}${(col.key.startsWith('non_attivati') || col.key === 'totale_non_attivati') ? ' text-amber-600 dark:text-amber-400' : ''}`}
                      >
                        {typeof row[col.key] === 'number'
                          ? (row[col.key] as number).toLocaleString('it-IT')
                          : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Churn per prodotto chart moved here */}
      <ChurnPerProductChart multiProductResult={multiProductResult} />
    </div>
  );
};
