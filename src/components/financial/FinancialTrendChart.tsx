import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ProjectCost, ProjectRevenue, FinancialSummary } from '@/hooks/useProjectFinancials';

interface FinancialTrendChartProps {
  costs: ProjectCost[];
  revenues: ProjectRevenue[];
  summary: FinancialSummary;
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

export const FinancialTrendChart = ({ costs, revenues, summary }: FinancialTrendChartProps) => {
  const trendData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Create 12-month data starting from current month
    const months: { month: string; monthIndex: number; year: number; costs: number; revenues: number; cumCosts: number; cumRevenues: number; margin: number; isForecast: boolean }[] = [];
    
    // Calculate monthly averages from existing data for forecasting
    const totalCostsMonthly = summary.totalCosts / Math.max(1, costs.length > 0 ? 3 : 1); // Spread over 3 months if data exists
    const totalRevenueMonthly = summary.totalRevenue / Math.max(1, revenues.length > 0 ? 3 : 1);
    
    // Calculate recurring costs
    const recurringMonthlyCosts = costs
      .filter(c => c.is_recurring)
      .reduce((sum, c) => {
        const multiplier = c.recurrence_period === 'yearly' ? 1/12 : c.recurrence_period === 'quarterly' ? 1/3 : 1;
        return sum + (c.amount * c.quantity * multiplier);
      }, 0);
    
    let cumCosts = 0;
    let cumRevenues = 0;
    
    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      const monthLabel = `${MONTHS_IT[monthIndex]} ${year.toString().slice(2)}`;
      
      // First 3 months use actual/estimated data, rest is forecast
      const isForecast = i >= 3;
      
      let monthCosts = 0;
      let monthRevenues = 0;
      
      if (i === 0) {
        // Current month: use all one-time costs/revenues
        monthCosts = costs.filter(c => !c.is_recurring).reduce((sum, c) => sum + (c.amount * c.quantity), 0);
        monthRevenues = revenues.reduce((sum, r) => sum + (r.amount * r.quantity), 0);
      } else if (i < 3) {
        // Next 2 months: mainly recurring
        monthCosts = recurringMonthlyCosts * (1 + (Math.random() * 0.1 - 0.05)); // ±5% variation
        monthRevenues = totalRevenueMonthly * 0.1 * (1 + (Math.random() * 0.2 - 0.1));
      } else {
        // Forecast: projected growth with seasonal adjustment
        const seasonalFactor = 1 + Math.sin((monthIndex - 2) * Math.PI / 6) * 0.15; // Peak in summer
        const growthFactor = 1 + (i - 3) * 0.02; // 2% monthly growth
        
        monthCosts = (recurringMonthlyCosts + totalCostsMonthly * 0.3) * seasonalFactor * growthFactor;
        monthRevenues = totalRevenueMonthly * 0.4 * seasonalFactor * growthFactor;
      }
      
      cumCosts += monthCosts;
      cumRevenues += monthRevenues;
      
      months.push({
        month: monthLabel,
        monthIndex,
        year,
        costs: Math.round(monthCosts),
        revenues: Math.round(monthRevenues),
        cumCosts: Math.round(cumCosts),
        cumRevenues: Math.round(cumRevenues),
        margin: Math.round(monthRevenues - monthCosts),
        isForecast,
      });
    }
    
    return months;
  }, [costs, revenues, summary]);

  const breakEvenMonth = useMemo(() => {
    for (let i = 0; i < trendData.length; i++) {
      if (trendData[i].cumRevenues >= trendData[i].cumCosts && trendData[i].cumCosts > 0) {
        return trendData[i].month;
      }
    }
    return null;
  }, [trendData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend e Proiezioni 12 Mesi
            </CardTitle>
            <CardDescription>Andamento cumulativo costi e ricavi con forecast</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Forecast
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
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.1}/>
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
            <Tooltip
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
              {formatCurrency(trendData[trendData.length - 1]?.cumRevenues || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Proiezione Costi (12m)</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(trendData[trendData.length - 1]?.cumCosts || 0)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Margine Proiettato</p>
            <p className={`text-lg font-bold ${(trendData[trendData.length - 1]?.cumRevenues - trendData[trendData.length - 1]?.cumCosts) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency((trendData[trendData.length - 1]?.cumRevenues || 0) - (trendData[trendData.length - 1]?.cumCosts || 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
