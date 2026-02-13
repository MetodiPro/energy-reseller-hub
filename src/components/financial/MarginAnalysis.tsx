import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  DollarSign,
  Target,
  Percent
} from 'lucide-react';
import { FinancialSummary } from '@/hooks/useProjectFinancials';

interface MarginAnalysisProps {
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

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export const MarginAnalysis = ({ summary }: MarginAnalysisProps) => {
  const margins = [
    {
      name: 'Margine Lordo',
      value: summary.grossMargin,
      percent: summary.grossMarginPercent,
      description: 'Fatturato - Costi Passanti (energia, distribuzione, oneri)',
      icon: Target,
    },
    {
      name: 'Margine di Contribuzione',
      value: summary.contributionMargin,
      percent: summary.contributionMarginPercent,
      description: 'Margine Lordo - Costi Commerciali (acquisizione clienti)',
      icon: Calculator,
    },
    {
      name: 'Margine Netto Operativo',
      value: summary.netMargin,
      percent: summary.netMarginPercent,
      description: 'Fatturato - Tutti i Costi (passanti + operativi)',
      icon: DollarSign,
    },
  ];

  const getStatusColor = (percent: number) => {
    if (percent >= 20) return 'text-green-600';
    if (percent >= 10) return 'text-yellow-600';
    if (percent >= 0) return 'text-orange-500';
    return 'text-destructive';
  };

  const getStatusBadge = (percent: number) => {
    if (percent >= 20) return 'default';
    if (percent >= 0) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fatturato Lordo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Totale emesso ai clienti finali
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costi Passanti in Fattura</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.passthroughCosts)}
            </div>
            <p className="text-xs text-muted-foreground">
              Grossista + distribuzione + oneri
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costi Operativi</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(summary.operationalCosts)}
            </div>
            <p className="text-xs text-muted-foreground">
              Personale, software, marketing, ecc.
            </p>
          </CardContent>
        </Card>

        <Card className={summary.netMargin >= 0 ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margine Netto</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(summary.netMargin)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              {summary.netMarginPercent >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              )}
              <span className={summary.netMarginPercent >= 0 ? 'text-green-600' : 'text-destructive'}>
                {formatPercent(summary.netMarginPercent)}
              </span>
              <span className="text-muted-foreground">del fatturato</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margin Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Analisi dei Margini
          </CardTitle>
          <CardDescription>
            Calcolo progressivo della redditività operativa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {margins.map((margin, index) => (
            <div key={margin.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    margin.percent >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <margin.icon className={`h-4 w-4 ${getStatusColor(margin.percent)}`} />
                  </div>
                  <div>
                    <span className="font-medium">{margin.name}</span>
                    <p className="text-xs text-muted-foreground">{margin.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${getStatusColor(margin.percent)}`}>
                    {formatCurrency(margin.value)}
                  </div>
                  <Badge variant={getStatusBadge(margin.percent)}>
                    {formatPercent(margin.percent)}
                  </Badge>
                </div>
              </div>
              <Progress 
                value={Math.max(0, Math.min(100, margin.percent))} 
                className="h-2"
              />
              {index < margins.length - 1 && (
                <div className="flex justify-center">
                  <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Margin Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmark di Riferimento</CardTitle>
          <CardDescription>Soglie indicative per il settore energy reselling</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-green-600">Ottimo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Margine netto &gt; 15%<br />
                Sostenibilità alta, capacità di investimento
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="font-medium text-yellow-600">Sufficiente</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Margine netto 5-15%<br />
                Operatività stabile, margini ridotti
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-medium text-destructive">Critico</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Margine netto &lt; 5%<br />
                Rischio operativo, ottimizzazione urgente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
