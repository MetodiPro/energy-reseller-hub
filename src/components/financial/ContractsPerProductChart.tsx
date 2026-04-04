import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { MultiProductEngineResult } from '@/lib/simulationEngine';

interface ContractsPerProductChartProps {
  multiProductResult: MultiProductEngineResult | null;
}

const CONTRACT_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(340, 65%, 55%)',
  'hsl(160, 55%, 45%)',
  'hsl(30, 75%, 55%)',
];

export const ContractsPerProductChart = ({ multiProductResult }: ContractsPerProductChartProps) => {
  const { chartData, products, totalContracts } = useMemo(() => {
    if (!multiProductResult || multiProductResult.products.length === 0) {
      return { chartData: [], products: [], totalContracts: 0 };
    }

    const prods = multiProductResult.products;
    const monthCount = prods[0].result.monthly.length;
    const data: Record<string, any>[] = [];
    let totContr = 0;

    for (let m = 0; m < monthCount; m++) {
      const row: Record<string, any> = {
        month: prods[0].result.monthly[m].customer.monthLabel,
      };
      prods.forEach((p, idx) => {
        const cm = p.result.monthly[m].customer;
        row[`contratti_${idx}`] = cm.contrattiNuovi;
        totContr += cm.contrattiNuovi;
      });
      data.push(row);
    }

    return {
      chartData: data,
      products: prods.map(p => p.product),
      totalContracts: totContr,
    };
  }, [multiProductResult]);

  if (!multiProductResult || chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nuovi Contratti Firmati per Prodotto
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            Totale contratti: <span className="font-bold">{totalContracts.toLocaleString('it-IT')}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Barre = contratti firmati dalla rete vendita ogni mese, suddivisi per prodotto commerciale.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Contratti', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const num = Math.round(value).toLocaleString('it-IT');
                  return [num, name];
                }}
              />
              <Legend />
              {products.map((p, idx) => (
                <Bar
                  key={`contratti_${idx}`}
                  dataKey={`contratti_${idx}`}
                  name={`${p.name}`}
                  fill={CONTRACT_COLORS[idx % CONTRACT_COLORS.length]}
                  stackId="contracts"
                  opacity={0.75}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {multiProductResult.products.map((p, idx) => {
            const total = p.result.monthly.reduce((s, m) => s + m.customer.contrattiNuovi, 0);
            return (
              <div key={p.product.id} className="p-3 rounded-lg border bg-card text-card-foreground">
                <p className="text-xs text-muted-foreground font-medium truncate">{p.product.name}</p>
                <p className="text-lg font-bold" style={{ color: CONTRACT_COLORS[idx % CONTRACT_COLORS.length] }}>
                  {total.toLocaleString('it-IT')}
                </p>
                <p className="text-xs text-muted-foreground">contratti firmati</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
