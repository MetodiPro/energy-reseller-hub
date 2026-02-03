import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Wallet, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Banknote,
  PiggyBank,
  Receipt,
  Building2
} from 'lucide-react';
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
  ComposedChart,
  Bar,
} from 'recharts';
import type { CashFlowSummary, MonthlyCashFlowData } from '@/hooks/useCashFlowAnalysis';

interface CashFlowDashboardProps {
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

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `€${(value / 1000).toFixed(0)}k`;
  }
  return `€${value.toFixed(0)}`;
};

export const CashFlowDashboard = ({ cashFlowData, loading }: CashFlowDashboardProps) => {
  const chartData = useMemo(() => {
    return cashFlowData.monthlyData.map(d => ({
      ...d,
      // For display purposes, invert outflows to show them as negative
      costiTotali: -(d.costiPassanti + d.costiOperativi + (d.deltaDeposito > 0 ? d.deltaDeposito : 0) + d.investimentiIniziali),
    }));
  }, [cashFlowData.monthlyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!cashFlowData.hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nessun dato disponibile</h3>
          <p className="text-muted-foreground">
            Configura i target commerciali nella Simulazione Ricavi per visualizzare l'analisi della liquidità.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPositiveAtEnd = cashFlowData.saldoFinale > 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              Investimento Totale
            </div>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(cashFlowData.investimentoIniziale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Distribuito su 6 mesi
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Massima Esposizione
            </div>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(cashFlowData.massimaEsposizione)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Picco: {cashFlowData.meseEsposizioneMassima}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Break-Even
            </div>
            <p className="text-2xl font-bold">
              {cashFlowData.mesePrimoPositivo || 'Non raggiunto'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Primo mese in positivo
            </p>
          </CardContent>
        </Card>
        
        <Card className={isPositiveAtEnd ? 'border-green-500/50 bg-green-500/5' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {isPositiveAtEnd ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              Saldo Finale (14m)
            </div>
            <p className={`text-2xl font-bold ${isPositiveAtEnd ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(cashFlowData.saldoFinale)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Posizione di cassa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Andamento Liquidità
              </CardTitle>
              <CardDescription>
                Flussi di cassa mensili e saldo cumulativo su 14 mesi
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <ArrowUp className="h-3 w-3 text-green-600" />
                Incassi
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ArrowDown className="h-3 w-3 text-destructive" />
                Uscite
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => formatCompact(value)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    incassi: 'Incassi',
                    costiTotali: 'Uscite Totali',
                    saldoCumulativo: 'Saldo Cumulativo',
                    flussoNetto: 'Flusso Netto',
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
                labelFormatter={(label) => `Mese: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    incassi: 'Incassi',
                    costiTotali: 'Uscite',
                    saldoCumulativo: 'Saldo Cumulativo',
                  };
                  return labels[value] || value;
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar dataKey="incassi" fill="hsl(var(--chart-1))" opacity={0.8} />
              <Bar dataKey="costiTotali" fill="hsl(var(--chart-4))" opacity={0.8} />
              <Area
                type="monotone"
                dataKey="saldoCumulativo"
                stroke="hsl(var(--primary))"
                fillOpacity={0.3}
                fill="url(#colorSaldo)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Banknote className="h-4 w-4 text-green-600" />
              Totale Incassi
            </div>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(cashFlowData.totaleIncassi)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Receipt className="h-4 w-4 text-orange-600" />
              Costi Passanti
            </div>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(cashFlowData.totaleCostiPassanti)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              Costi Operativi
            </div>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(cashFlowData.totaleCostiOperativi)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <PiggyBank className="h-4 w-4 text-purple-600" />
              Depositi Cauzionali
            </div>
            <p className="text-xl font-bold text-purple-600">
              {formatCurrency(cashFlowData.totaleDepositi)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dettaglio Mensile</CardTitle>
          <CardDescription>
            Flussi di cassa per ogni mese della simulazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">Mese</TableHead>
                  <TableHead className="text-right">Clienti</TableHead>
                  <TableHead className="text-right text-green-600">Incassi</TableHead>
                  <TableHead className="text-right text-orange-600">Passanti</TableHead>
                  <TableHead className="text-right text-blue-600">Operativi</TableHead>
                  <TableHead className="text-right text-purple-600">Deposito Δ</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right font-semibold">Flusso Netto</TableHead>
                  <TableHead className="text-right font-semibold">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashFlowData.monthlyData.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {row.monthLabel}
                    </TableCell>
                    <TableCell className="text-right">{row.clientiAttivi}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(row.incassi)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(row.costiPassanti)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(row.costiOperativi)}
                    </TableCell>
                    <TableCell className={`text-right ${row.deltaDeposito > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                      {row.deltaDeposito !== 0 ? formatCurrency(row.deltaDeposito) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {row.investimentiIniziali > 0 ? formatCurrency(row.investimentiIniziali) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${row.flussoNetto >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(row.flussoNetto)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${row.saldoCumulativo >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(row.saldoCumulativo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
