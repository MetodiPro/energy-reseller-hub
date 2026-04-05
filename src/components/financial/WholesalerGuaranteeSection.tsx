import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MonthlyDepositData } from '@/hooks/useSimulationSummary';

interface WholesalerGuaranteeSectionProps {
  depositiMensili: MonthlyDepositData[];
  depositoIniziale: number;
  depositoMassimo: number;
  depositoFinale: number;
  depositoMesi: number;
  depositoPercentualeAttivazione: number;
  depositoVersatoFase4: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const fmtSmall = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

export const WholesalerGuaranteeSection = ({
  depositiMensili,
  depositoIniziale,
  depositoMassimo,
  depositoFinale,
  depositoMesi,
  depositoPercentualeAttivazione,
}: WholesalerGuaranteeSectionProps) => {
  const chartData = depositiMensili.map((d) => ({
    name: d.monthLabel,
    depositoRichiesto: Math.round(d.depositoRichiesto),
    delta: Math.round(d.deltaDeposito),
    clienti: d.clientiAttivi,
  }));

  const totalDeltaPositivo = depositiMensili.reduce(
    (s, d) => s + Math.max(0, d.deltaDeposito), 0
  );
  const totalDeltaNegativo = depositiMensili.reduce(
    (s, d) => s + Math.min(0, d.deltaDeposito), 0
  );

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Depositato (Fase 4 Processo)</p>
            <p className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-300">
              {fmt(depositoVersatoFase4)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Impostato nello step Garanzie Finanziarie Grossista
            </p>
          </CardContent>
        </Card>
        <Card className={depositoIniziale > depositoVersatoFase4 ? 'border-orange-300 dark:border-orange-700' : 'border-green-300 dark:border-green-700'}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Richiesto mese 1 switching</p>
            <p className={`text-2xl font-bold mt-1 ${depositoIniziale > depositoVersatoFase4 ? 'text-orange-600' : 'text-green-600'}`}>
              {fmt(depositoIniziale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {depositoIniziale > depositoVersatoFase4
                ? `⚠ Integrativo: ${fmt(depositoIniziale - depositoVersatoFase4)}`
                : depositoVersatoFase4 > depositoIniziale
                ? `✓ Fase 4 capiente (eccesso: ${fmt(depositoVersatoFase4 - depositoIniziale)})`
                : `✓ Perfettamente allineato`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Deposito Massimo</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">
              {fmt(depositoMassimo)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Picco nel periodo simulato</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Parametri garanzia</p>
            <p className="text-lg font-semibold mt-1">{depositoMesi} mesi</p>
            <p className="text-xs text-muted-foreground mt-1">{depositoPercentualeAttivazione}% del costo garantito</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert allineamento Fase 4 */}
      {depositoIniziale > depositoVersatoFase4 && depositoVersatoFase4 > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>⚠ Attenzione — Deposito integrativo richiesto:</strong> il deposito calcolato dal simulatore per il mese 1 di switching (
              {fmt(depositoIniziale)}) è superiore a quello impostato nella Fase 4 del processo ({fmt(depositoVersatoFase4)}).
              Potrebbe essere necessario versare un integrazione di {fmt(depositoIniziale - depositoVersatoFase4)} al grossista.
              Verifica il valore nella sezione <strong>Processo → Fase 4 → Garanzie Finanziarie Grossista</strong>.
            </p>
          </CardContent>
        </Card>
      )}
      {depositoVersatoFase4 === 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Nota:</strong> nessun deposito impostato nella Fase 4 del processo. Vai in <strong>Processo → Fase 4 → Garanzie Finanziarie Grossista</strong> e inserisci l'importo concordato col grossista nel campo "Deposito Cauzionale Grossista".
            </p>
          </CardContent>
        </Card>
      )}
      {depositoVersatoFase4 >= depositoIniziale && depositoVersatoFase4 > 0 && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✓ Garanzia capiente:</strong> il deposito impostato nella Fase 4 ({fmt(depositoVersatoFase4)}) copre il fabbisogno del mese 1 di switching ({fmt(depositoIniziale)}). Nessun versamento integrativo iniziale necessario.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grafico evoluzione deposito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Evoluzione Deposito Cauzionale (14 mesi)
          </CardTitle>
          <CardDescription>
            Liquidità immobilizzata presso il grossista mese per mese. Non è una spesa — viene restituita alla cessazione o alla riduzione del portafoglio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [fmt(value), 'Deposito richiesto']}
                  labelStyle={{ fontSize: 11 }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Line type="monotone" dataKey="depositoRichiesto" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabella delta mensili */}
      <Card>
        <CardHeader>
          <CardTitle>Movimenti mensili del deposito</CardTitle>
          <CardDescription>
            Delta = variazione rispetto al mese precedente. Positivo = versamento integrativo. Negativo = svincolo parziale per churn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Mese</th>
                  <th className="text-right py-2 px-3 font-medium">Clienti Attivi</th>
                  <th className="text-right py-2 px-3 font-medium">Deposito Richiesto</th>
                  <th className="text-right py-2 px-3 font-medium">Delta mese</th>
                </tr>
              </thead>
              <tbody>
                {depositiMensili.map((d, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{d.monthLabel}</td>
                    <td className="text-right py-2 px-3">{d.clientiAttivi}</td>
                    <td className="text-right py-2 px-3">{fmt(d.depositoRichiesto)}</td>
                    <td className={`text-right py-2 px-3 flex items-center justify-end gap-1 ${d.deltaDeposito > 0 ? 'text-orange-600' : d.deltaDeposito < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {d.deltaDeposito > 0 ? <TrendingUp className="h-3 w-3" /> : d.deltaDeposito < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                      {fmtSmall(d.deltaDeposito)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td colSpan={3} className="py-2 px-3 font-medium">Totale versamenti integrativi</td>
                  <td className="text-right py-2 px-3 font-bold text-orange-600">{fmt(totalDeltaPositivo)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-3 font-medium">Totale svincoli per churn</td>
                  <td className="text-right py-2 px-3 font-bold text-green-600">{fmt(totalDeltaNegativo)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Nota metodologica */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <Badge variant="outline" className="mr-1">Componenti coperte dalla garanzia</Badge>
              Materia Prima (PUN + Dispacciamento) · Trasporto e Distribuzione · Oneri di Sistema (ASOS + ARIM).
            </p>
            <p>
              <Badge variant="outline" className="mr-1">NON inclusi</Badge>
              Spread Grossista e Fee POD (fatturati sui consumi reali) · Accise (versate ad ADM) · IVA (reverse charge, neutro).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
