import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart3, ChevronRight } from 'lucide-react';
import { MultiProductEngineResult } from '@/lib/simulationEngine';

interface ProductPerformanceTableProps {
  multiProductResult: MultiProductEngineResult;
  salesChannels: any[];
  products: any[];
  formatCurrency?: (v: number) => string;
}

const defaultFmt = (v: number) =>
  v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function ProductPerformanceTable({
  multiProductResult,
  salesChannels,
  products: allProducts,
  formatCurrency: fmt = defaultFmt,
}: ProductPerformanceTableProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleProduct = (id: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const rows = useMemo(() => {
    return multiProductResult.products.map(({ product, result }) => {
      const lastMonth = result.monthly[result.monthly.length - 1];
      const totalFatturato = result.monthly.reduce((s, m) => s + m.fatturato, 0);
      const totalMargine = result.monthly.reduce((s, m) => s + m.margineCommerciale, 0);
      const totalIva = result.monthly.reduce((s, m) => s + m.ivaTotale, 0);
      const imponibile = totalFatturato - totalIva;
      const totalContratti = result.monthly.reduce((s, m) => s + m.customer.contrattiNuovi, 0);
      const totalChurn = result.monthly.reduce((s, m) => s + m.customer.churn, 0);
      const linkedProduct = allProducts.find((p: any) => p.id === product.id);
      const channelName = linkedProduct?.channel_id
        ? salesChannels.find((c: any) => c.id === linkedProduct.channel_id)?.channel_name ?? '—'
        : '—';
      const marginPct = imponibile > 0 ? (totalMargine / imponibile) * 100 : 0;
      return {
        id: product.id,
        name: product.name,
        channelName,
        contractShare: product.contractShare,
        totalContratti,
        clientiAttivi: lastMonth?.customer.clientiAttivi ?? 0,
        totalFatturato,
        totalMargine,
        marginPct,
        totalChurn,
        monthly: result.monthly,
      };
    });
  }, [multiProductResult, salesChannels, allProducts]);

  const totals = useMemo(() => ({
    totalContratti: rows.reduce((s, r) => s + r.totalContratti, 0),
    clientiAttivi: rows.reduce((s, r) => s + r.clientiAttivi, 0),
    totalFatturato: rows.reduce((s, r) => s + r.totalFatturato, 0),
    totalMargine: rows.reduce((s, r) => s + r.totalMargine, 0),
    totalChurn: rows.reduce((s, r) => s + r.totalChurn, 0),
  }), [rows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Fatturato Lordo per Prodotto
        </CardTitle>
        <CardDescription className="text-xs">
          Clicca sul nome di un prodotto per espandere il dettaglio fatturato mensile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Prodotto</th>
                <th className="py-2 pr-3 font-medium">Canale</th>
                <th className="py-2 pr-3 font-medium text-right">Quota %</th>
                <th className="py-2 pr-3 font-medium text-right">Contratti</th>
                <th className="py-2 pr-3 font-medium text-right">Clienti Attivi</th>
                <th className="py-2 pr-3 font-medium text-right">Fatturato</th>
                <th className="py-2 font-medium text-right">Churn Tot.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isExpanded = expandedProducts.has(row.id);
                return (
                  <Collapsible key={row.id} open={isExpanded} onOpenChange={() => toggleProduct(row.id)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <tr className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors">
                          <td className="py-2 pr-3 font-medium text-primary">
                            <span className="inline-flex items-center gap-1 underline decoration-dotted">
                              <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              {row.name}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{row.channelName}</td>
                          <td className="py-2 pr-3 text-right">{row.contractShare}%</td>
                          <td className="py-2 pr-3 text-right">{row.totalContratti}</td>
                          <td className="py-2 pr-3 text-right">{row.clientiAttivi}</td>
                          <td className="py-2 pr-3 text-right">{fmt(row.totalFatturato)}</td>
                          <td className="py-2 text-right text-destructive">{row.totalChurn}</td>
                        </tr>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={7} className="p-0">
                            <div className="bg-muted/20 border-y border-border px-4 py-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Dettaglio Mensile — {row.name}
                              </p>
                              <div className="overflow-x-auto max-h-[350px]">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Mese</TableHead>
                                      <TableHead className="text-xs text-right">Fatturato</TableHead>
                                      <TableHead className="text-xs text-right">Margine</TableHead>
                                      <TableHead className="text-xs text-right">Attivi</TableHead>
                                      <TableHead className="text-xs text-right">Fatturati</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {row.monthly.map((m, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="text-xs font-medium">{m.customer.monthLabel}</TableCell>
                                        <TableCell className="text-xs text-right">{fmt(m.fatturato)}</TableCell>
                                        <TableCell className="text-xs text-right text-emerald-600 dark:text-emerald-400">{fmt(m.margineCommerciale)}</TableCell>
                                        <TableCell className="text-xs text-right">{m.customer.clientiAttivi}</TableCell>
                                        <TableCell className="text-xs text-right">{m.customer.clientiFatturati}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow className="font-bold border-t-2 bg-muted/30">
                                      <TableCell className="text-xs">Totale</TableCell>
                                      <TableCell className="text-xs text-right">{fmt(row.totalFatturato)}</TableCell>
                                      <TableCell className="text-xs text-right text-emerald-600 dark:text-emerald-400">{fmt(row.totalMargine)}</TableCell>
                                      <TableCell className="text-xs text-right">{row.clientiAttivi}</TableCell>
                                      <TableCell className="text-xs text-right">—</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
              <tr className="border-t-2 border-foreground/20 font-bold bg-muted/30">
                <td className="py-2 pr-3 pl-6">Totale</td>
                <td className="py-2 pr-3"></td>
                <td className="py-2 pr-3 text-right">100%</td>
                <td className="py-2 pr-3 text-right">{totals.totalContratti}</td>
                <td className="py-2 pr-3 text-right">{totals.clientiAttivi}</td>
                <td className="py-2 pr-3 text-right">{fmt(totals.totalFatturato)}</td>
                <td className="py-2 text-right text-destructive">{totals.totalChurn}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
