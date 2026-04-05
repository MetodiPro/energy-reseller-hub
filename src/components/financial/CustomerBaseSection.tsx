import { useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, Download, ChevronDown } from 'lucide-react';
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

interface ProductTableData {
  productName: string;
  rows: { monthLabel: string; contratti: number; attivazioni: number; churn: number; churnM0: number; churnOrd: number; attivi: number; fatturati: number }[];
}

const PRODUCT_COLS = [
  { key: 'monthLabel', label: 'Mese' },
  { key: 'contratti', label: 'Contratti' },
  { key: 'attivazioni', label: 'Attivazioni' },
  { key: 'churn', label: 'Switch-Out' },
  { key: 'churnM0', label: 'di cui M0' },
  { key: 'churnOrd', label: 'di cui Ord.' },
  { key: 'attivi', label: 'Attivi' },
  { key: 'fatturati', label: 'Fatturati' },
];

const AGGREGATE_COLS = [
  { key: 'monthLabel', label: 'Mese' },
  { key: 'tot_contratti', label: 'Tot. Contratti' },
  { key: 'tot_attivazioni', label: 'Tot. Attivazioni' },
  { key: 'tot_churn', label: 'Tot. Switch-Out' },
  { key: 'tot_churnM0', label: 'di cui Churn M0' },
  { key: 'tot_churnOrd', label: 'di cui Churn Ord.' },
  { key: 'tot_attivi', label: 'Tot. Attivi' },
  { key: 'tot_fatturati', label: 'Tot. Fatturati' },
];

export const CustomerBaseSection = ({ multiProductResult, totalActiveEnd }: CustomerBaseSectionProps) => {

  const { productTables, aggregateRows } = useMemo(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) {
      return { productTables: [] as ProductTableData[], aggregateRows: [] as Record<string, string | number>[] };
    }

    const prods = multiProductResult.products;
    const monthCount = prods[0].result.monthly.length;

    const tables: ProductTableData[] = prods.map(p => ({
      productName: p.product.name,
      rows: Array.from({ length: monthCount }, (_, m) => {
        const cm = p.result.monthly[m].customer;
        return {
          monthLabel: cm.monthLabel,
          contratti: cm.contrattiNuovi,
          attivazioni: cm.attivazioni,
          churn: cm.churn,
          churnM0: cm.churnM0 ?? 0,
          churnOrd: cm.churnOrdinario ?? 0,
          attivi: cm.clientiAttivi,
          fatturati: cm.clientiFatturati,
        };
      }),
    }));

    const aggRows: Record<string, string | number>[] = [];
    for (let m = 0; m < monthCount; m++) {
      let totC = 0, totA = 0, totCh = 0, totM0 = 0, totOrd = 0, totAtt = 0, totF = 0;
      prods.forEach(p => {
        const cm = p.result.monthly[m].customer;
        totC += cm.contrattiNuovi;
        totA += cm.attivazioni;
        totCh += cm.churn;
        totM0 += cm.churnM0 ?? 0;
        totOrd += cm.churnOrdinario ?? 0;
        totAtt += cm.clientiAttivi;
        totF += cm.clientiFatturati;
      });
      aggRows.push({
        monthLabel: prods[0].result.monthly[m].customer.monthLabel,
        tot_contratti: totC, tot_attivazioni: totA, tot_churn: totCh,
        tot_churnM0: totM0, tot_churnOrd: totOrd, tot_attivi: totAtt, tot_fatturati: totF,
      });
    }

    return { productTables: tables, aggregateRows: aggRows };
  }, [multiProductResult]);

  const handleExportXlsx = useCallback(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) return;
    const wb = XLSX.utils.book_new();

    // One sheet per product
    productTables.forEach(pt => {
      const wsData = [PRODUCT_COLS.map(c => c.label)];
      pt.rows.forEach(row => {
        wsData.push(PRODUCT_COLS.map(c => String((row as any)[c.key] ?? '')));
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = PRODUCT_COLS.map(() => ({ wch: 16 }));
      const sheetName = pt.productName.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Aggregate sheet if multiple products
    if (productTables.length > 1) {
      const wsData = [AGGREGATE_COLS.map(c => c.label)];
      aggregateRows.forEach(row => {
        wsData.push(AGGREGATE_COLS.map(c => String(row[c.key] ?? '')));
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = AGGREGATE_COLS.map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Riepilogo');
    }

    XLSX.writeFile(wb, 'customer_base.xlsx');
  }, [multiProductResult, productTables, aggregateRows]);

  if (!multiProductResult || multiProductResult.products.length === 0) return null;

  const aggregatedMonthly = multiProductResult.aggregated.monthly;
  const lastMonth = aggregatedMonthly[aggregatedMonthly.length - 1];
  const totalAttiviFinali = lastMonth?.customer.clientiAttivi ?? 0;
  const totalAttivazioniCumulative = aggregatedMonthly.reduce((s, m) => s + m.customer.attivazioni, 0);
  const totalSwitchOutCumulativo = aggregatedMonthly.reduce((s, m) => s + m.customer.churn, 0);
  const totalContrattiCumulativi = aggregatedMonthly.reduce((s, m) => s + m.customer.contrattiNuovi, 0);

  const cellStyle = (key: string) => {
    const isMonth = key === 'monthLabel';
    const isChurn = key === 'churn' || key === 'tot_churn';
    const isAttivi = key === 'attivi' || key === 'tot_attivi';
    const isFatturati = key === 'fatturati' || key === 'tot_fatturati';
    const isTotal = key.startsWith('tot_');
    return `${!isMonth ? 'text-right' : ''} ${isTotal ? 'font-semibold' : ''} ${isChurn ? 'text-destructive' : ''} ${isAttivi ? 'text-primary' : ''} ${isFatturati ? 'text-emerald-600 dark:text-emerald-400' : ''}`;
  };

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
        </CardContent>
      </Card>

      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportXlsx} className="gap-2">
          <Download className="h-4 w-4" />
          Esporta Excel (tutte le tabelle)
        </Button>
      </div>

      {/* One table per product */}
      {productTables.map((pt, idx) => (
        <Collapsible key={idx} defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Dettaglio Mensile — {pt.productName}
                  </CardTitle>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </div>
                {idx === 0 && (
                  <CardDescription className="mt-1">
                    Per ogni mese: contratti firmati, attivazioni (con 2 mesi di lag), switch-out, POD attivi e fatturati.
                    <span className="block mt-1 text-xs opacity-80">
                      ⓘ Switch-out mesi 1-2 = 0: fisiologico. POD fatturati = 0 nei mesi 1-3: primo ciclo fatturazione dal 3° mese.
                    </span>
                  </CardDescription>
                )}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {PRODUCT_COLS.map(col => (
                          <TableHead key={col.key} className={col.key !== 'monthLabel' ? 'text-right' : ''}>
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pt.rows.map((row, i) => (
                        <TableRow key={i}>
                          {PRODUCT_COLS.map(col => {
                            const val = (row as any)[col.key];
                            return (
                              <TableCell key={col.key} className={cellStyle(col.key)}>
                                {typeof val === 'number' ? val.toLocaleString('it-IT') : val}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      {/* Aggregate table when multiple products */}
      {productTables.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Riepilogo Aggregato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {AGGREGATE_COLS.map(col => (
                      <TableHead key={col.key} className={col.key !== 'monthLabel' ? 'text-right' : ''}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregateRows.map((row, i) => (
                    <TableRow key={i}>
                      {AGGREGATE_COLS.map(col => {
                        const val = row[col.key];
                        return (
                          <TableCell key={col.key} className={cellStyle(col.key)}>
                            {typeof val === 'number' ? val.toLocaleString('it-IT') : val}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <ContractsPerProductChart multiProductResult={multiProductResult} />
      <ActivationsPerProductChart multiProductResult={multiProductResult} />
      <ChurnPerProductChart multiProductResult={multiProductResult} />
      <ActivePodsPerProductChart multiProductResult={multiProductResult} />
    </div>
  );
};
