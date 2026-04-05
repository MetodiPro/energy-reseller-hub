import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';
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
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

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
    marginPct: (() => {
      const totFatt = rows.reduce((s, r) => s + r.totalFatturato, 0);
      const totIva = multiProductResult.products.reduce((s, { result }) => s + result.monthly.reduce((ss, m) => ss + m.ivaTotale, 0), 0);
      const imp = totFatt - totIva;
      const totMarg = rows.reduce((s, r) => s + r.totalMargine, 0);
      return imp > 0 ? (totMarg / imp) * 100 : 0;
    })(),
  }), [rows, multiProductResult]);

  const selectedRow = rows.find(r => r.id === selectedProduct);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Fatturato Lordo per Prodotto
          </CardTitle>
          <CardDescription className="text-xs">
            Clicca su un prodotto per il dettaglio fatturato mensile.
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
                {rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedProduct(row.id)}
                  >
                    <td className="py-2 pr-3 font-medium text-primary underline decoration-dotted">{row.name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.channelName}</td>
                    <td className="py-2 pr-3 text-right">{row.contractShare}%</td>
                    <td className="py-2 pr-3 text-right">{row.totalContratti}</td>
                    <td className="py-2 pr-3 text-right">{row.clientiAttivi}</td>
                    <td className="py-2 pr-3 text-right">{fmt(row.totalFatturato)}</td>
                    <td className="py-2 text-right text-destructive">{row.totalChurn}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-foreground/20 font-bold bg-muted/30">
                  <td className="py-2 pr-3">Totale</td>
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

      {selectedRow && (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Fatturato Mensile — {selectedRow.name}
              </DialogTitle>
              <DialogDescription>
                Dettaglio mese per mese di fatturato, margine commerciale, clienti attivi e fatturati.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mese</TableHead>
                    <TableHead className="text-right">Fatturato</TableHead>
                    <TableHead className="text-right">Margine</TableHead>
                    <TableHead className="text-right">Attivi</TableHead>
                    <TableHead className="text-right">Fatturati</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRow.monthly.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{m.customer.monthLabel}</TableCell>
                      <TableCell className="text-right">{fmt(m.fatturato)}</TableCell>
                      <TableCell className="text-right text-green-600">{fmt(m.margineCommerciale)}</TableCell>
                      <TableCell className="text-right">{m.customer.clientiAttivi}</TableCell>
                      <TableCell className="text-right">{m.customer.clientiFatturati}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2 bg-muted/30">
                    <TableCell>Totale</TableCell>
                    <TableCell className="text-right">{fmt(selectedRow.totalFatturato)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(selectedRow.totalMargine)}</TableCell>
                    <TableCell className="text-right">{selectedRow.clientiAttivi}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
