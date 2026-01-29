import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useProjectFinancials';

interface BreakEvenAnalysisProps {
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

export const BreakEvenAnalysis = ({ summary }: BreakEvenAnalysisProps) => {
  const analysis = useMemo(() => {
    const fixedCosts = summary.costsByType.structural + summary.costsByType.indirect;
    const variableCosts = summary.costsByType.direct + summary.costsByType.commercial;
    const totalCosts = summary.totalCosts;
    const totalRevenue = summary.totalRevenue;
    
    // Contribution margin per unit (assuming revenue represents sold units)
    const contributionMarginRatio = totalRevenue > 0 
      ? (totalRevenue - variableCosts) / totalRevenue 
      : 0;
    
    // Break-even revenue point
    const breakEvenRevenue = contributionMarginRatio > 0 
      ? fixedCosts / contributionMarginRatio 
      : 0;
    
    // Current position relative to break-even
    const revenueToBreakEven = breakEvenRevenue - totalRevenue;
    const isAboveBreakEven = totalRevenue >= breakEvenRevenue && breakEvenRevenue > 0;
    const breakEvenProgress = breakEvenRevenue > 0 
      ? Math.min(100, (totalRevenue / breakEvenRevenue) * 100) 
      : 0;
    
    // Margin of Safety
    const marginOfSafety = isAboveBreakEven && totalRevenue > 0
      ? ((totalRevenue - breakEvenRevenue) / totalRevenue) * 100
      : 0;
    
    // Operating Leverage
    const operatingLeverage = summary.netMargin !== 0 
      ? summary.contributionMargin / summary.netMargin 
      : 0;
    
    // Cost structure ratio
    const fixedCostRatio = totalCosts > 0 ? (fixedCosts / totalCosts) * 100 : 0;
    const variableCostRatio = totalCosts > 0 ? (variableCosts / totalCosts) * 100 : 0;
    
    return {
      fixedCosts,
      variableCosts,
      contributionMarginRatio,
      breakEvenRevenue,
      revenueToBreakEven,
      isAboveBreakEven,
      breakEvenProgress,
      marginOfSafety,
      operatingLeverage,
      fixedCostRatio,
      variableCostRatio,
    };
  }, [summary]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Analisi Break-Even Point
        </CardTitle>
        <CardDescription>
          Punto di pareggio e indicatori di redditività
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Break-Even Status */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {analysis.isAboveBreakEven ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">
                {analysis.isAboveBreakEven ? 'Sopra il Break-Even' : 'Sotto il Break-Even'}
              </span>
            </div>
            <Badge variant={analysis.isAboveBreakEven ? 'default' : 'secondary'}>
              {formatPercent(analysis.breakEvenProgress)} raggiunto
            </Badge>
          </div>
          
          <Progress value={analysis.breakEvenProgress} className="h-3 mb-3" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Break-Even Point</p>
              <p className="text-lg font-bold">{formatCurrency(analysis.breakEvenRevenue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {analysis.isAboveBreakEven ? 'Eccedenza' : 'Mancante'}
              </p>
              <p className={`text-lg font-bold ${analysis.isAboveBreakEven ? 'text-green-600' : 'text-amber-500'}`}>
                {formatCurrency(Math.abs(analysis.revenueToBreakEven))}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Costi Fissi</p>
            <p className="font-bold text-destructive">{formatCurrency(analysis.fixedCosts)}</p>
            <p className="text-xs text-muted-foreground">{formatPercent(analysis.fixedCostRatio)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Costi Variabili</p>
            <p className="font-bold text-orange-500">{formatCurrency(analysis.variableCosts)}</p>
            <p className="text-xs text-muted-foreground">{formatPercent(analysis.variableCostRatio)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Margine Contrib.</p>
            <p className="font-bold text-primary">{formatPercent(analysis.contributionMarginRatio * 100)}</p>
            <p className="text-xs text-muted-foreground">% su ricavi</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Margine Sicurezza</p>
            <p className={`font-bold ${analysis.marginOfSafety >= 20 ? 'text-green-600' : analysis.marginOfSafety >= 10 ? 'text-amber-500' : 'text-destructive'}`}>
              {formatPercent(analysis.marginOfSafety)}
            </p>
            <p className="text-xs text-muted-foreground">sopra BEP</p>
          </div>
        </div>

        {/* Explanation */}
        <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 mt-0.5 shrink-0" />
            <p><strong>Break-Even Point:</strong> Fatturato minimo per coprire tutti i costi (fissi + variabili)</p>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
            <p><strong>Margine di Sicurezza:</strong> Quanto i ricavi possono calare prima di andare in perdita</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
