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
import type { ProjectCost, ProjectRevenue, FinancialSummary } from '@/hooks/useProjectFinancials';

interface FinancialTrendChartProps {
  costs: ProjectCost[];
  revenues: ProjectRevenue[];
  summary: FinancialSummary & {
    hasSimulationData?: boolean;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

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

export const FinancialTrendChart = ({ costs, revenues, summary }: FinancialTrendChartProps) => {
  const trendData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const months: {
      month: string;
      costs: number;
      revenues: number;
      cumCosts: number;
      cumRevenues: number;
      margin: number;
    }[] = [];

    // ─── Distribuzione su 12 mesi basata sui dati reali ───
    // Se abbiamo dati di simulazione, distribuiamo uniformemente su 12 mesi
    // (la simulazione copre 14 mesi ma proiettiamo su 12 per il grafico)
    const hasSimData = summary.hasSimulationData && summary.totalRevenue > 0;

    // Ricavi mensili medi
    const monthlyRevenue = hasSimData
      ? summary.totalRevenue / 14 // simulazione è su 14 mesi
      : summary.totalRevenue / 12;

    // Costi mensili medi
    const monthlyCosts = hasSimData
      ? summary.totalCosts / 14
      : summary.totalCosts / 12;

    // Costi operativi mensili (da costi registrati)
    const recurringMonthlyCosts = costs
      .filter(c => c.is_recurring)
      .reduce((sum, c) => {
        const multiplier = c.recurrence_period === 'yearly' ? 1 / 12 : c.recurrence_period === 'quarterly' ? 1 / 3 : 1;
        return sum + (c.amount * c.quantity * multiplier);
      }, 0);

    let cumCosts = 0;
    let cumRevenues = 0;

    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const monthLabel = `${MONTHS_IT[monthIndex]} ${year.toString().slice(2)}`;

      // Applichiamo una curva di crescita graduale per i primi mesi
      // (un reseller non ha subito tutti i clienti dal mese 1)
      const rampUpFactor = hasSimData
        ? Math.min(1, (i + 1) / 6) // rampa su 6 mesi
        : 1;

      const monthRevenue = monthlyRevenue * rampUpFactor * (1 + i * 0.03); // +3% crescita mensile
      const monthCost = hasSimData
        ? (monthlyCosts * rampUpFactor * (1 + i * 0.02)) // costi crescono più lentamente dei ricavi
        : (recurringMonthlyCosts > 0 ? recurringMonthlyCosts : monthlyCosts);

      cumCosts += monthCost;
      cumRevenues += monthRevenue;

      months.push({
        month: monthLabel,
        costs: Math.round(monthCost),
        revenues: Math.round(monthRevenue),
        cumCosts: Math.round(cumCosts),
        cumRevenues: Math.round(cumRevenues),
        margin: Math.round(monthRevenue - monthCost),
      });
    }

    return months;
  }, [costs, summary]);

  const breakEvenMonth = useMemo(() => {
    for (let i = 0; i < trendData.length; i++) {
      if (trendData[i].cumRevenues >= trendData[i].cumCosts && trendData[i].cumCosts > 0) {
        return trendData[i].month;
      }
    }
    return null;
  }, [trendData]);

  const lastMonth = trendData[trendData.length - 1];
  const projectedMargin = lastMonth ? lastMonth.cumRevenues - lastMonth.cumCosts : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend e Proiezioni 12 Mesi
              <InfoTip text="Proiezione dell'andamento cumulativo di ricavi e costi nei prossimi 12 mesi, basata sui dati del simulatore di ricavi e sui costi operativi registrati." />
            </CardTitle>
            <CardDescription>Andamento cumulativo costi e ricavi con proiezione</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Proiezione
            </Badge>
            {breakEvenMonth && (
              <Badge variant="default" className="bg-green-600">
                Break-Even: {breakEvenMonth}
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
                name === 'cumRevenues' ? 'Ricavi Cumulativi' :
                  name === 'cumCosts' ? 'Costi Cumulativi' :
                    name === 'margin' ? 'Margine Mensile' : name
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
                value === 'cumRevenues' ? 'Ricavi Cumulativi' :
                  value === 'cumCosts' ? 'Costi Cumulativi' : value
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
            <p className="text-muted-foreground">Proiezione Ricavi (12m)</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(lastMonth?.cumRevenues || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Proiezione Costi (12m)</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(lastMonth?.cumCosts || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Margine Proiettato</p>
            <p className={`text-lg font-bold ${projectedMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(projectedMargin)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 italic">
          ⚠️ Le proiezioni sono stime basate sui parametri attuali del simulatore e sui costi operativi registrati. I valori reali potranno variare in base all'andamento del mercato e all'acquisizione clienti.
        </p>
      </CardContent>
    </Card>
  );
};
