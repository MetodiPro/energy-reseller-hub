import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MultiProductEngineResult } from '@/lib/simulationEngine';

interface ActivePodsPerProductChartProps {
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

export const ActivePodsPerProductChart = ({ multiProductResult }: ActivePodsPerProductChartProps) => {
  const { chartData, products, totalActiveEnd } = useMemo(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) {
      return { chartData: [], products: [], totalActiveEnd: 0 };
    }

    const prods = multiProductResult.products;
    const monthCount = prods[0].result.monthly.length;
    const data: Record<string, any>[] = [];

    for (let m = 0; m < monthCount; m++) {
      const row: Record<string, any> = {
        month: prods[0].result.monthly[m].customer.monthLabel,
      };
      let monthTotal = 0;
      prods.forEach((p, idx) => {
        const cm = p.result.monthly[m].customer;
        row[`attivi_${idx}`] = cm.clientiAttivi;
        monthTotal += cm.clientiAttivi;
      });
      row.totale = monthTotal;
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
    };
  }, [multiProductResult]);

  if (!multiProductResult || chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            POD in Fornitura per Prodotto
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            Totale attivi fine periodo: <span className="font-bold">{totalActiveEnd.toLocaleString('it-IT')}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Aree impilate = POD attivi in fornitura per prodotto. I POD attivi includono sia quelli fatturati (dalla 3ª mensilità) sia quelli in fase di prima attivazione. Il churn mese 0 erode silenziosamente ogni coorte: con churn m0 &gt; 0%, una quota fissa delle attivazioni mensili uscirà 2 mesi dopo, visibile come componente costante negli switch-out.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'POD attivi', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const num = Math.round(value).toLocaleString('it-IT');
                  return [num, name];
                }}
              />
              <Legend />
              {products.map((p, idx) => (
                <Area
                  key={`attivi_${idx}`}
                  type="monotone"
                  dataKey={`attivi_${idx}`}
                  name={`${p.name}`}
                  fill={PRODUCT_COLORS[idx % PRODUCT_COLORS.length]}
                  stroke={PRODUCT_COLORS[idx % PRODUCT_COLORS.length]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  stackId="active"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {multiProductResult.products.map((p, idx) => {
            const lastMonth = p.result.monthly[p.result.monthly.length - 1].customer;
            const peakActive = Math.max(...p.result.monthly.map(m => m.customer.clientiAttivi));
            return (
              <div key={p.product.id} className="p-3 rounded-lg border bg-card text-card-foreground">
                <p className="text-xs text-muted-foreground font-medium truncate">{p.product.name}</p>
                <p className="text-lg font-bold" style={{ color: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] }}>
                  {lastMonth.clientiAttivi.toLocaleString('it-IT')}
                </p>
                <p className="text-xs text-muted-foreground">
                  attivi · picco {peakActive.toLocaleString('it-IT')}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
