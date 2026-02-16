import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SalesChannel } from '@/hooks/useSalesChannels';

interface MonthlyChannelCostsChartProps {
  channels: SalesChannel[];
  monthlyContracts: number[];
  startDate: Date | string;
}

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const CHANNEL_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
  'hsl(330, 70%, 50%)',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const MonthlyChannelCostsChart = ({
  channels,
  monthlyContracts,
  startDate,
}: MonthlyChannelCostsChartProps) => {
  const activeChannels = useMemo(
    () => channels.filter((c) => c.is_active && c.contract_share > 0),
    [channels],
  );

  const chartData = useMemo(() => {
    if (activeChannels.length === 0) return [];

    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();

    const data: Record<string, any>[] = [];

    for (let m = 0; m < 14; m++) {
      const monthIndex = (startMonth + m) % 12;
      const yearOffset = Math.floor((startMonth + m) / 12);
      const label = `${MONTHS_IT[monthIndex]} ${(startYear + yearOffset).toString().slice(-2)}`;

      const newContracts = m < 12 ? (monthlyContracts[m] ?? 0) : 0;

      const row: Record<string, any> = { month: label };

      activeChannels.forEach((ch) => {
        const contracts = Math.round(newContracts * (ch.contract_share / 100));
        if (ch.commission_type === 'per_contract') {
          row[ch.channel_name] = contracts * ch.commission_amount;
        } else {
          const activations = Math.round(contracts * (ch.activation_rate / 100));
          row[ch.channel_name] = activations * ch.commission_amount;
        }
      });

      data.push(row);
    }

    return data;
  }, [activeChannels, monthlyContracts, startDate]);

  if (activeChannels.length === 0 || chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Costi Commerciali Mensili per Canale
        </CardTitle>
        <CardDescription>
          Evoluzione delle provvigioni per canale di vendita sui 14 mesi di simulazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              labelFormatter={(label) => `Mese: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {activeChannels.map((ch, i) => (
              <Bar
                key={ch.id}
                dataKey={ch.channel_name}
                stackId="channels"
                fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
