import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingDown } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MultiProductEngineResult } from '@/lib/simulationEngine';

interface ChurnPerProductChartProps {
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

const CHURN_COLORS = [
  'hsl(0, 70%, 55%)',
  'hsl(25, 80%, 55%)',
  'hsl(45, 75%, 50%)',
  'hsl(330, 65%, 50%)',
  'hsl(200, 60%, 50%)',
  'hsl(270, 55%, 55%)',
];

export const ChurnPerProductChart = ({ multiProductResult }: ChurnPerProductChartProps) => {
  const { chartData, products, lastMonthActive, totalActiveEnd } = useMemo(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) {
      return { chartData: [], products: [], lastMonthActive: 0, totalActiveEnd: 0 };
    }

    const prods = multiProductResult.products;
    const monthCount = prods[0].result.monthly.length;
    const data: Record<string, any>[] = [];

    for (let m = 0; m < monthCount; m++) {
      const row: Record<string, any> = {
        month: prods[0].result.monthly[m].customer.monthLabel,
      };
      prods.forEach((p, idx) => {
        const cm = p.result.monthly[m].customer;
        row[`churn_${idx}`] = cm.churn;
        row[`attivi_${idx}`] = cm.clientiAttivi;
      });
      data.push(row);
    }

    // Totale clienti attivi alla fine dell'ultimo mese (= giorno 1 del mese 15)
    let totalEnd = 0;
    prods.forEach(p => {
      const last = p.result.monthly[monthCount - 1].customer;
      totalEnd += last.clientiAttivi;
    });

    return {
      chartData: data,
      products: prods.map(p => p.product),
      lastMonthActive: monthCount,
      totalActiveEnd: totalEnd,
    };
  }, [multiProductResult]);

  if (!multiProductResult || chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Andamento Switch-out per Prodotto
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              POD attivi a fine simulazione: <span className="font-bold">{totalActiveEnd.toLocaleString('it-IT')}</span>
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Barre = switch-out mensili per prodotto.
          Al giorno 1 del {lastMonthActive + 1}° mese resteranno <strong>{totalActiveEnd.toLocaleString('it-IT')}</strong> accessi attivi in fornitura.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="churn" orientation="left" tick={{ fontSize: 11 }} label={{ value: 'Switch-out', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const num = Math.round(value).toLocaleString('it-IT');
                  return [num, name];
                }}
              />
              <Legend />
              {products.map((p, idx) => (
                <Bar
                  key={`churn_${idx}`}
                  yAxisId="churn"
                  dataKey={`churn_${idx}`}
                  name={`Switch-out ${p.name}`}
                  fill={CHURN_COLORS[idx % CHURN_COLORS.length]}
                  stackId="churn"
                  opacity={0.7}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Per-product detail at end of simulation */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {multiProductResult.products.map((p, idx) => {
            const lastMonth = p.result.monthly[p.result.monthly.length - 1].customer;
            const totalChurn = p.result.monthly.reduce((s, m) => s + m.customer.churn, 0);
            return (
              <div key={p.product.id} className="p-3 rounded-lg border bg-card text-card-foreground">
                <p className="text-xs text-muted-foreground font-medium truncate">{p.product.name}</p>
                <p className="text-lg font-bold" style={{ color: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] }}>
                  {lastMonth.clientiAttivi.toLocaleString('it-IT')}
                </p>
                <p className="text-xs text-muted-foreground">
                  attivi · {totalChurn.toLocaleString('it-IT')} switch-out totali
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
