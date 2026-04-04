import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingDown } from 'lucide-react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MultiProductEngineResult } from '@/lib/simulationEngine';

interface ChurnPerProductChartProps {
  multiProductResult: MultiProductEngineResult | null;
}

const CHURN_M0_COLORS = [
  'hsl(0, 85%, 55%)',
  'hsl(25, 85%, 55%)',
  'hsl(45, 80%, 50%)',
  'hsl(330, 75%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(270, 65%, 55%)',
];

const CHURN_ORD_COLORS = [
  'hsl(0, 55%, 70%)',
  'hsl(25, 55%, 70%)',
  'hsl(45, 55%, 65%)',
  'hsl(330, 50%, 65%)',
  'hsl(200, 50%, 65%)',
  'hsl(270, 45%, 68%)',
];

export const ChurnPerProductChart = ({ multiProductResult }: ChurnPerProductChartProps) => {
  const { chartData, products, totalActiveEnd, hasChurnM0 } = useMemo(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) {
      return { chartData: [], products: [], totalActiveEnd: 0, hasChurnM0: false };
    }

    const prods = multiProductResult.products;
    const monthCount = prods[0].result.monthly.length;
    const data: Record<string, any>[] = [];
    let anyChurnM0 = false;

    for (let m = 0; m < monthCount; m++) {
      const row: Record<string, any> = {
        month: prods[0].result.monthly[m].customer.monthLabel,
      };
      prods.forEach((p, idx) => {
        const cm = p.result.monthly[m].customer;
        row[`churnM0_${idx}`]  = cm.churnM0 ?? 0;
        row[`churnOrd_${idx}`] = cm.churnOrdinario ?? 0;
        if ((cm.churnM0 ?? 0) > 0) anyChurnM0 = true;
      });
      data.push(row);
    }

    let totalEnd = 0;
    prods.forEach(p => {
      totalEnd += p.result.monthly[monthCount - 1].customer.clientiAttivi;
    });

    return {
      chartData: data,
      products: prods.map(p => p.product),
      totalActiveEnd: totalEnd,
      hasChurnM0: anyChurnM0,
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
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            POD attivi a fine simulazione: <span className="font-bold">{totalActiveEnd.toLocaleString('it-IT')}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Barre impilate per tipo: rosso scuro = switch-out da churn mese 0 (POD appena attivati che escono 2 mesi dopo per first-in wins perso o doppia sottoscrizione); rosso chiaro = switch-out ordinari (uscita naturale del portafoglio attivo con decadimento mensile).
          {!hasChurnM0 && <span className="block mt-1 text-xs opacity-80">Churn mese 0 = 0%: tutte le uscite sono switch-out ordinari.</span>}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="churn" orientation="left" tick={{ fontSize: 11 }} label={{ value: 'Switch-out', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip formatter={(value: number, name: string) => [Math.round(value).toLocaleString('it-IT'), name]} />
              <Legend />
              {products.map((p, idx) => (
                <Bar
                  key={`churnOrd_${idx}`}
                  yAxisId="churn"
                  dataKey={`churnOrd_${idx}`}
                  name={`Churn ord. ${p.name}`}
                  fill={CHURN_ORD_COLORS[idx % CHURN_ORD_COLORS.length]}
                  stackId="churn"
                  opacity={0.8}
                />
              ))}
              {hasChurnM0 && products.map((p, idx) => (
                <Bar
                  key={`churnM0_${idx}`}
                  yAxisId="churn"
                  dataKey={`churnM0_${idx}`}
                  name={`Churn m0 ${p.name}`}
                  fill={CHURN_M0_COLORS[idx % CHURN_M0_COLORS.length]}
                  stackId="churn"
                  opacity={0.9}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {multiProductResult.products.map((p, idx) => {
            const lastMonth = p.result.monthly[p.result.monthly.length - 1].customer;
            const totalChurn    = p.result.monthly.reduce((s, m) => s + m.customer.churn, 0);
            const totalChurnM0  = p.result.monthly.reduce((s, m) => s + (m.customer.churnM0 ?? 0), 0);
            const totalChurnOrd = p.result.monthly.reduce((s, m) => s + (m.customer.churnOrdinario ?? 0), 0);
            return (
              <div key={p.product.id} className="p-3 rounded-lg border bg-card text-card-foreground">
                <p className="text-xs text-muted-foreground font-medium truncate">{p.product.name}</p>
                <p className="text-lg font-bold">{lastMonth.clientiAttivi.toLocaleString('it-IT')} attivi</p>
                <p className="text-xs text-muted-foreground">{totalChurn.toLocaleString('it-IT')} switch-out totali</p>
                {hasChurnM0 && (
                  <>
                    <p className="text-xs text-muted-foreground">↳ {totalChurnM0.toLocaleString('it-IT')} da churn m0</p>
                    <p className="text-xs text-muted-foreground">↳ {totalChurnOrd.toLocaleString('it-IT')} ordinari</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
