import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet } from 'lucide-react';
import { SimulationEngineResult } from '@/lib/simulationEngine';
import { SalesChannel } from '@/hooks/useSalesChannels';

interface CommercialCostsPerChannelProps {
  engineResult: SimulationEngineResult;
  salesChannels: SalesChannel[];
  formatCurrency?: (v: number) => string;
}

const defaultFmt = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export function CommercialCostsPerChannel({
  engineResult,
  salesChannels,
  formatCurrency: fmt = defaultFmt,
}: CommercialCostsPerChannelProps) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const activeChannels = useMemo(() => salesChannels.filter(c => c.is_active && c.contract_share > 0), [salesChannels]);

  const channelRows = useMemo(() => {
    return activeChannels.map(ch => {
      const monthlyData = engineResult.monthly.map(m => {
        const share = ch.contract_share / 100;
        let cost = 0;
        if (ch.commission_type === 'per_contract') {
          cost = m.customer.contrattiNuovi * share * ch.commission_amount;
        } else {
          cost = m.customer.attivazioni * share * ch.commission_amount;
        }
        const contratti = Math.round(m.customer.contrattiNuovi * share);
        const attivazioni = Math.round(m.customer.attivazioni * share);
        return { monthLabel: m.customer.monthLabel, contratti, attivazioni, cost };
      });
      const totalCost = monthlyData.reduce((s, m) => s + m.cost, 0);
      const totalContratti = monthlyData.reduce((s, m) => s + m.contratti, 0);
      const totalAttivazioni = monthlyData.reduce((s, m) => s + m.attivazioni, 0);
      const cac = totalAttivazioni > 0 ? totalCost / totalAttivazioni : 0;
      return { id: ch.id, name: ch.channel_name, commissionType: ch.commission_type, commissionAmount: ch.commission_amount, totalContratti, totalAttivazioni, totalCost, cac, monthlyData };
    });
  }, [activeChannels, engineResult]);

  const totals = useMemo(() => ({
    totalContratti: channelRows.reduce((s, r) => s + r.totalContratti, 0),
    totalAttivazioni: channelRows.reduce((s, r) => s + r.totalAttivazioni, 0),
    totalCost: channelRows.reduce((s, r) => s + r.totalCost, 0),
  }), [channelRows]);

  const selectedRow = channelRows.find(r => r.id === selectedChannel);

  if (activeChannels.length === 0) return null;

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              Costi Commerciali per Canale di Vendita
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Totale Provvigioni Stimate (14 mesi)</p>
            <p className="text-3xl font-bold text-primary mt-1">{fmt(totals.totalCost)}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Canale</th>
                  <th className="py-2 pr-3 font-medium text-right">Tipo Comm.</th>
                  <th className="py-2 pr-3 font-medium text-right">€/unità</th>
                  <th className="py-2 pr-3 font-medium text-right">Contratti</th>
                  <th className="py-2 pr-3 font-medium text-right">Attivazioni</th>
                  <th className="py-2 pr-3 font-medium text-right">Costo Totale</th>
                  <th className="py-2 font-medium text-right">CAC</th>
                </tr>
              </thead>
              <tbody>
                {channelRows.map(row => (
                  <tr key={row.id} className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedChannel(row.id)}>
                    <td className="py-2 pr-3 font-medium text-primary underline decoration-dotted">{row.name}</td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">{row.commissionType === 'per_contract' ? 'Per contratto' : 'Per attivazione'}</td>
                    <td className="py-2 pr-3 text-right">{fmt(row.commissionAmount)}</td>
                    <td className="py-2 pr-3 text-right">{row.totalContratti}</td>
                    <td className="py-2 pr-3 text-right">{row.totalAttivazioni}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{fmt(row.totalCost)}</td>
                    <td className="py-2 text-right">{fmt(row.cac)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-foreground/20 font-bold bg-muted/30">
                  <td className="py-2 pr-3">Totale</td>
                  <td className="py-2 pr-3"></td>
                  <td className="py-2 pr-3"></td>
                  <td className="py-2 pr-3 text-right">{totals.totalContratti}</td>
                  <td className="py-2 pr-3 text-right">{totals.totalAttivazioni}</td>
                  <td className="py-2 pr-3 text-right">{fmt(totals.totalCost)}</td>
                  <td className="py-2 text-right">{totals.totalAttivazioni > 0 ? fmt(totals.totalCost / totals.totalAttivazioni) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground pt-3 border-t border-border">
            Provvigioni stimate per canale di vendita. Clicca su un canale per il dettaglio mensile.
          </p>
        </CardContent>
      </Card>

      {selectedRow && (
        <Dialog open={!!selectedChannel} onOpenChange={(open) => { if (!open) setSelectedChannel(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Costi Mensili — {selectedRow.name}
              </DialogTitle>
              <DialogDescription>
                Dettaglio mese per mese delle provvigioni ({selectedRow.commissionType === 'per_contract' ? 'per contratto' : 'per attivazione'} × {fmt(selectedRow.commissionAmount)}).
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mese</TableHead>
                    <TableHead className="text-right">Contratti</TableHead>
                    <TableHead className="text-right">Attivazioni</TableHead>
                    <TableHead className="text-right">Costo Provvigioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRow.monthlyData.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{m.monthLabel}</TableCell>
                      <TableCell className="text-right">{m.contratti}</TableCell>
                      <TableCell className="text-right">{m.attivazioni}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(m.cost)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2 bg-muted/30">
                    <TableCell>Totale</TableCell>
                    <TableCell className="text-right">{selectedRow.totalContratti}</TableCell>
                    <TableCell className="text-right">{selectedRow.totalAttivazioni}</TableCell>
                    <TableCell className="text-right">{fmt(selectedRow.totalCost)}</TableCell>
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
