import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { CashFlowSummary } from '@/hooks/useCashFlowAnalysis';

interface FinancialTrendChartProps {
  cashFlowData: CashFlowSummary;
  loading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground inline-block ml-1 cursor-help" />
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs text-xs">
      {text}
    </TooltipContent>
  </Tooltip>
);

export const FinancialTrendChart = ({ cashFlowData, loading }: FinancialTrendChartProps) => {
  const trendData = useMemo(() => {
    if (!cashFlowData.hasData) return [];

    let cumIncassi = 0;
    let cumUscite = 0;

    return cashFlowData.monthlyData.map(d => {
      cumIncassi += d.incassi;
      const usciteMese = d.costiPassanti + d.costiOperativi + d.costiCommerciali + d.flussiFiscali + d.investimentiIniziali + (d.deltaDeposito > 0 ? d.deltaDeposito : 0);
      cumUscite += usciteMese;

      return {
        month: d.monthLabel,
        cumRevenues: cumIncassi,
        cumCosts: cumUscite,
        margin: d.flussoNetto,
      };
    });
  }, [cashFlowData]);

  // Usa il break-even dal motore principale per coerenza con Liquidità e Dashboard
  const breakEvenMonth = cashFlowData.mesePrimoPositivo;

  if (loading || !cashFlowData.hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Configura il simulatore di ricavi per visualizzare il trend.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lastMonth = trendData[trendData.length - 1];
  const projectedMargin = lastMonth ? lastMonth.cumRevenues - lastMonth.cumCosts : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend e Proiezioni 14 Mesi
              <InfoTip text="Andamento cumulativo di incassi e uscite nei 14 mesi della simulazione, basato sul motore di cash flow (stessi dati della scheda Liquidità)." />
            </CardTitle>
            <CardDescription>Andamento cumulativo incassi e uscite dalla simulazione</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Simulazione
            </Badge>
            {breakEvenMonth && (
              <Badge variant="default" className="bg-green-600">
                Break-Even: {breakEvenMonth}
              </Badge>
            )}
            {!breakEvenMonth && (
              <Badge variant="secondary">
                Break-Even non raggiunto
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenues" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'cumRevenues' ? 'Incassi Cumulativi' :
                  name === 'cumCosts' ? 'Uscite Cumulative' : name
              ]}
              labelFormatter={(label) => `Mese: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend
              formatter={(value) =>
                value === 'cumRevenues' ? 'Incassi Cumulativi' :
                  value === 'cumCosts' ? 'Uscite Cumulative' : value
              }
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="cumRevenues"
              stroke="hsl(var(--chart-1))"
              fillOpacity={1}
              fill="url(#colorRevenues)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cumCosts"
              stroke="hsl(var(--chart-4))"
              fillOpacity={1}
              fill="url(#colorCosts)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Totale Incassi (14m)</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(lastMonth?.cumRevenues || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Totale Uscite (14m)</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(lastMonth?.cumCosts || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Saldo Finale</p>
            <p className={`text-lg font-bold ${projectedMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(projectedMargin)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 italic">
          ⚠️ Dati coerenti con la scheda Liquidità: basati sul simulatore di ricavi, costi operativi, flussi fiscali, depositi e aging degli incassi.
        </p>
      </CardContent>
    </Card>
  );
};
