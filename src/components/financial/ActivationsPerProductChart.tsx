import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MultiProductEngineResult } from '@/lib/simulationEngine';

interface ActivationsPerProductChartProps {
  multiProductResult: MultiProductEngineResult | null;
}

const PRODUCT_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(340, 65%, 55%)',
  'hsl(160, 55%, 45%)',
  'hsl(30, 75%, 55%)',
];

const ACTIVATION_COLORS = [
  'hsl(142, 70%, 45%)',
  'hsl(170, 65%, 45%)',
  'hsl(100, 60%, 45%)',
  'hsl(190, 70%, 50%)',
  'hsl(80, 55%, 50%)',
  'hsl(50, 70%, 50%)',
];

export const ActivationsPerProductChart = ({ multiProductResult }: ActivationsPerProductChartProps) => {
  const { chartData, products, totalActivations } = useMemo(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) {
      return { chartData: [], products: [], totalActivations: 0 };
    }

    const prods = multiProductResult.products;
    const monthCount = prods[0].result.monthly.length;
    const data: Record<string, any>[] = [];
    let totAct = 0;

    for (let m = 0; m < monthCount; m++) {
      const row: Record<string, any> = {
        month: prods[0].result.monthly[m].customer.monthLabel,
      };
      let monthTotal = 0;
      prods.forEach((p, idx) => {
        const cm = p.result.monthly[m].customer;
        row[`attivazioni_${idx}`] = cm.attivazioni;
        row[`contratti_${idx}`] = cm.contrattiNuovi;
        monthTotal += cm.attivazioni;
      });
      row.totaleAttivazioni = monthTotal;
      totAct += monthTotal;
      data.push(row);
    }

    return {
      chartData: data,
      products: prods.map(p => p.product),
      totalActivations: totAct,
    };
  }, [multiProductResult]);

  if (!multiProductResult || chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Andamento Switch-in (Attivazioni) per Prodotto
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            Totale attivazioni: <span className="font-bold">{totalActivations.toLocaleString('it-IT')}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Barre = attivazioni mensili (switch-in) per prodotto.
          Le attivazioni avvengono con 2 mesi di ritardo rispetto alla firma del contratto (tempo di preparazione dossier + scadenza SII del 10 del mese). Gli switch-out effettivi seguono a loro volta un ulteriore ritardo di 2 mesi dalla richiesta di recesso.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Attivazioni', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const num = Math.round(value).toLocaleString('it-IT');
                  return [num, name];
                }}
              />
              <Legend />
              {products.map((p, idx) => (
                <Bar
                  key={`attivazioni_${idx}`}
                  dataKey={`attivazioni_${idx}`}
                  name={`Attivazioni ${p.name}`}
                  fill={ACTIVATION_COLORS[idx % ACTIVATION_COLORS.length]}
                  stackId="activations"
                  opacity={0.75}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {multiProductResult.products.map((p, idx) => {
            const totalAct = p.result.monthly.reduce((s, m) => s + m.customer.attivazioni, 0);
            const totalContracts = p.result.monthly.reduce((s, m) => s + m.customer.contrattiNuovi, 0);
            return (
              <div key={p.product.id} className="p-3 rounded-lg border bg-card text-card-foreground">
                <p className="text-xs text-muted-foreground font-medium truncate">{p.product.name}</p>
                <p className="text-lg font-bold" style={{ color: ACTIVATION_COLORS[idx % ACTIVATION_COLORS.length] }}>
                  {totalAct.toLocaleString('it-IT')}
                </p>
                <p className="text-xs text-muted-foreground">
                  attivazioni · {totalContracts.toLocaleString('it-IT')} contratti firmati
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
