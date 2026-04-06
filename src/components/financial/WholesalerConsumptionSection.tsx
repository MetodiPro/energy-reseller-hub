import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyDepositData } from '@/hooks/useSimulationSummary';

interface WholesalerConsumptionSectionProps {
  depositiMensili: MonthlyDepositData[];
  costoEnergiaTotale: number;
  costoGestionePodTotale: number;
  passthroughTotals?: {
    dispacciamento: number;
    trasporto: number;
    oneriSistema: number;
  };
  spreadGrossistaPerKwh: number;
  gestionePodPerPod: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

export const WholesalerConsumptionSection = ({
  depositiMensili,
  costoEnergiaTotale,
  costoGestionePodTotale,
  passthroughTotals,
  spreadGrossistaPerKwh,
  gestionePodPerPod,
}: WholesalerConsumptionSectionProps) => {
  const totalSpread = depositiMensili.reduce((s, d) => s + d.fatturaMensileSpread, 0);
  const totalFee = depositiMensili.reduce((s, d) => s + d.fatturaMensileFee, 0);
  const totalConsumiReali = depositiMensili.reduce((s, d) => s + d.fatturaMensileConsumiTotale, 0);

  const totalePassanti = passthroughTotals
    ? passthroughTotals.dispacciamento + passthroughTotals.trasporto + passthroughTotals.oneriSistema
    : 0;

  const chartData = depositiMensili
    .filter(d => d.fatturaMensileConsumiTotale > 0)
    .map(d => ({
      name: d.monthLabel,
      spread: Math.round(d.fatturaMensileSpread),
      fee: Math.round(d.fatturaMensileFee),
      garantiti: Math.round(d.fatturaMensileConsumiTotale - d.fatturaMensileSpread - d.fatturaMensileFee),
    }));

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Totale Fatture Grossista (14 mesi)</p>
            <p className="text-2xl font-bold mt-1">
              {fmt(totalConsumiReali)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Somma di tutti i pagamenti mensili</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">di cui Spread Grossista</p>
            <p className="text-2xl font-bold mt-1">
              {fmt(totalSpread)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{spreadGrossistaPerKwh.toFixed(4)} €/kWh × kWh acquistati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">di cui Fee Gestione POD</p>
            <p className="text-2xl font-bold mt-1">
              {fmt(totalFee)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{gestionePodPerPod.toFixed(2)} €/POD/mese</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafico stacked */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Composizione fatture mensili grossista
          </CardTitle>
          <CardDescription>
            Componenti garantite (PUN + Disp + Trasporto + Oneri) · Spread Grossista · Fee POD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    fmt(value),
                    name === 'Passanti + PUN' ? 'Passanti + PUN (garantiti)'
                      : name === 'Spread Grossista' ? 'Spread Grossista'
                      : 'Fee Gestione POD'
                  ]}
                  labelStyle={{ fontSize: 11 }}
                />
                <Legend />
                <Bar dataKey="garantiti" stackId="a" fill="hsl(var(--primary))" name="Passanti + PUN" radius={[0,0,0,0]} />
                <Bar dataKey="spread" stackId="a" fill="#ef4444" name="Spread Grossista" radius={[0,0,0,0]} />
                <Bar dataKey="fee" stackId="a" fill="#f97316" name="Fee Gestione POD" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabella mensile */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio fatture mensili grossista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Mese</th>
                  <th className="text-right py-2 px-3 font-medium">POD Attivi</th>
                  <th className="text-right py-2 px-3 font-medium">Passanti + PUN</th>
                  <th className="text-right py-2 px-3 font-medium">Spread</th>
                  <th className="text-right py-2 px-3 font-medium">Fee POD</th>
                  <th className="text-right py-2 px-3 font-medium">Totale Fattura</th>
                </tr>
              </thead>
              <tbody>
                {depositiMensili.map((d, i) => {
                  const passanti = d.fatturaMensileConsumiTotale - d.fatturaMensileSpread - d.fatturaMensileFee;
                  return (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-3">{d.monthLabel}</td>
                      <td className="text-right py-2 px-3">{d.clientiAttivi}</td>
                      <td className="text-right py-2 px-3">{fmt(passanti)}</td>
                      <td className="text-right py-2 px-3">{fmtFull(d.fatturaMensileSpread)}</td>
                      <td className="text-right py-2 px-3">{fmtFull(d.fatturaMensileFee)}</td>
                      <td className="text-right py-2 px-3 font-semibold">{fmt(d.fatturaMensileConsumiTotale)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td colSpan={2} className="py-2 px-3 font-bold">Totale 14 mesi</td>
                  <td className="text-right py-2 px-3 font-bold">{fmt(costoEnergiaTotale + totalePassanti)}</td>
                  <td className="text-right py-2 px-3 font-bold">{fmt(totalSpread)}</td>
                  <td className="text-right py-2 px-3 font-bold">{fmt(totalFee)}</td>
                  <td className="text-right py-2 px-3 font-bold">{fmt(totalConsumiReali)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
