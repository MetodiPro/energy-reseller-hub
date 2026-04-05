import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
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

const fmtSigned = (v: number) => {
  const s = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v));
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s;
};

export const WholesalerGuaranteeSection = ({
  depositiMensili,
  depositoIniziale,
  depositoMassimo,
  depositoFinale,
  depositoMesi,
  depositoPercentualeAttivazione,
  depositoVersatoFase4,
}: WholesalerGuaranteeSectionProps) => {

  // ── Calcolo versamenti aggiuntivi effettivi ────────────────────────────────
  // Il depositoVersatoFase4 è già sul conto del grossista prima del mese 0.
  // La curva nel grafico mostra il totale sul conto del grossista:
  //   depositoSulConto(m) = max(depositoRichiesto(m), depositoVersatoFase4)
  //   → non scende mai sotto il depositoVersatoFase4 (il grossista tiene sempre la garanzia iniziale)

  const chartData = depositiMensili.map((d, i) => {
    const depositoSulConto = Math.max(d.depositoRichiesto, depositoVersatoFase4);
    const prevRichiesto = i > 0 ? depositiMensili[i - 1].depositoRichiesto : 0;
    const prevSulConto = Math.max(prevRichiesto, depositoVersatoFase4);
    const deltaEffettivo = depositoSulConto - prevSulConto;
    return {
      name: d.monthLabel,
      depositoSulConto: Math.round(depositoSulConto),
      depositoRichiestoMotore: Math.round(d.depositoRichiesto),
      deltaEffettivo: Math.round(deltaEffettivo),
      clienti: d.clientiAttivi,
    };
  });

  // Totale versamenti aggiuntivi effettivi (solo incrementi oltre Fase 4)
  const totalVersamenti = chartData.reduce((s, d) => s + Math.max(0, d.deltaEffettivo), 0);
  // Totale svincoli effettivi
  const totalSvincoli = chartData.reduce((s, d) => s + Math.min(0, d.deltaEffettivo), 0);

  // Deposito massimo effettivo sul conto
  const depositoMassimoEffettivo = Math.max(depositoMassimo, depositoVersatoFase4);

  return (
    <div className="space-y-6">

      {/* ── Alert allineamento Fase 4 ── */}
      {depositoVersatoFase4 === 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Nota:</strong> nessun deposito impostato nella Fase 4 del processo. Vai in{' '}
              <strong>Processo → Fase 4 → Garanzie Finanziarie Grossista</strong> e inserisci l'importo
              concordato col grossista nel campo "Deposito Cauzionale Grossista".
            </p>
          </CardContent>
        </Card>
      )}
      {depositoVersatoFase4 > 0 && depositoIniziale > depositoVersatoFase4 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>⚠ Deposito integrativo al mese 1:</strong> il fabbisogno calcolato ({fmt(depositoIniziale)})
              supera il deposito versato in Fase 4 ({fmt(depositoVersatoFase4)}).
              Versamento integrativo iniziale previsto: <strong>{fmt(depositoIniziale - depositoVersatoFase4)}</strong>.
            </p>
          </CardContent>
        </Card>
      )}
      {depositoVersatoFase4 >= depositoIniziale && depositoVersatoFase4 > 0 && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✓ Garanzia capiente:</strong> il deposito versato in Fase 4 ({fmt(depositoVersatoFase4)})
              copre il fabbisogno del mese 1 ({fmt(depositoIniziale)}).
              {depositoMassimoEffettivo > depositoVersatoFase4
                ? ` Versamenti integrativi attesi nei mesi successivi: ${fmt(depositoMassimoEffettivo - depositoVersatoFase4)}.`
                : " Nessun versamento integrativo necessario nell'intero periodo simulato."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Depositato (Fase 4)</p>
            <p className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-300">
              {fmt(depositoVersatoFase4)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Versato al grossista prima dell'avvio switching
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Versamenti aggiuntivi totali</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">
              {fmt(totalVersamenti)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Integrativi oltre il deposito Fase 4
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Deposito massimo sul conto</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">
              {fmt(depositoMassimoEffettivo)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Picco liquidità immobilizzata</p>
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

      {/* ── Grafico evoluzione deposito ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Evoluzione deposito sul conto grossista (14 mesi)
          </CardTitle>
          <CardDescription>
            Linea arancione = deposito totale presente sul conto del grossista (include Fase 4 + integrativi).
            Linea tratteggiata = fabbisogno teorico calcolato dal simulatore.
            La linea non scende mai sotto il deposito Fase 4 (il grossista mantiene sempre la garanzia iniziale).
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
                  formatter={(value: number, name: string) => [
                    fmt(value),
                    name === 'depositoSulConto' ? 'Deposito sul conto' : 'Fabbisogno teorico',
                  ]}
                  labelStyle={{ fontSize: 11 }}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'depositoSulConto' ? 'Deposito sul conto grossista' : 'Fabbisogno teorico'
                  }
                />
                {/* Linea di riferimento deposito Fase 4 */}
                {depositoVersatoFase4 > 0 && (
                  <ReferenceLine y={depositoVersatoFase4} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" label={{ value: `Fase 4: ${fmt(depositoVersatoFase4)}`, position: 'right', fontSize: 10 }} />
                )}
                {/* Fabbisogno teorico del motore (tratteggiato grigio) */}
                <Line type="monotone" dataKey="depositoRichiestoMotore" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                {/* Deposito effettivo sul conto (linea principale) */}
                <Line type="monotone" dataKey="depositoSulConto" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabella movimenti mensili ── */}
      <Card>
        <CardHeader>
          <CardTitle>Movimenti mensili del deposito</CardTitle>
          <CardDescription>
            "Sul conto" = deposito totale presente presso il grossista (Fase 4 + integrativi).
            "Movimento effettivo" = variazione reale di cassa: positivo = versamento integrativo, negativo = svincolo.
            I mesi in cui il fabbisogno teorico è coperto dal deposito Fase 4 non generano movimenti di cassa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Mese</th>
                  <th className="text-right py-2 px-3 font-medium">POD Attivi</th>
                  <th className="text-right py-2 px-3 font-medium">Fabbisogno teorico</th>
                  <th className="text-right py-2 px-3 font-medium">Sul conto grossista</th>
                  <th className="text-right py-2 px-3 font-medium">Movimento di cassa</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, i) => {
                  const fabbisogno = depositiMensili[i].depositoRichiesto;
                  const coperto = depositoVersatoFase4 > 0 && fabbisogno <= depositoVersatoFase4;
                  return (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-3">{d.name}</td>
                      <td className="text-right py-2 px-3">{d.clienti}</td>
                      <td className={`text-right py-2 px-3 ${coperto ? 'text-muted-foreground' : ''}`}>
                        {fmt(fabbisogno)}
                      </td>
                      <td className="text-right py-2 px-3 font-medium">
                        {fmt(d.depositoSulConto)}
                      </td>
                      <td className="text-right py-2 px-3">
                        {d.deltaEffettivo === 0 ? (
                          <span className="text-muted-foreground flex items-center justify-end gap-1">
                            <Minus className="h-3 w-3" /> —
                          </span>
                        ) : d.deltaEffettivo > 0 ? (
                          <span className="text-orange-600 flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {fmtSigned(d.deltaEffettivo)}
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center justify-end gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {fmtSigned(d.deltaEffettivo)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td colSpan={4} className="py-2 px-3 font-medium">Totale versamenti integrativi effettivi</td>
                  <td className="text-right py-2 px-3 font-bold text-orange-600">{fmt(totalVersamenti)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-2 px-3 font-medium">Totale svincoli effettivi</td>
                  <td className="text-right py-2 px-3 font-bold text-green-600">{fmt(Math.abs(totalSvincoli))}</td>
                </tr>
                <tr className="border-t">
                  <td colSpan={4} className="py-2 px-3 font-medium">Liquidità immobilizzata totale (Fase 4 + integrativi)</td>
                  <td className="text-right py-2 px-3 font-bold">{fmt(depositoVersatoFase4 + totalVersamenti)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Nota metodologica ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <Badge variant="outline" className="mr-1">Componenti coperte dalla garanzia</Badge>
              Materia Prima (PUN + Dispacciamento) · Trasporto e Distribuzione · Oneri di Sistema (ASOS + ARIM).
            </p>
            <p>
              <Badge variant="outline" className="mr-1">NON inclusi nella garanzia</Badge>
              Spread Grossista e Fee POD (fatturati sui consumi reali) · Accise (versate ad ADM) · IVA (reverse charge, neutro).
            </p>
            <p>
              <Badge variant="outline" className="mr-1">Deposito Fase 4</Badge>
              Il deposito cauzionale impostato nel Processo → Fase 4 è la base iniziale già presente sul conto del grossista.
              Il simulatore calcola il fabbisogno teorico mese per mese; i movimenti di cassa effettivi sono solo la parte che eccede tale base.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
