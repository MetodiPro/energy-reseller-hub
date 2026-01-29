import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Target
} from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useProjectFinancials';

interface WhatIfSimulatorProps {
  summary: FinancialSummary;
}

interface Scenario {
  revenueChange: number;
  directCostChange: number;
  commercialCostChange: number;
  structuralCostChange: number;
  indirectCostChange: number;
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
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const WhatIfSimulator = ({ summary }: WhatIfSimulatorProps) => {
  const [scenario, setScenario] = useState<Scenario>({
    revenueChange: 0,
    directCostChange: 0,
    commercialCostChange: 0,
    structuralCostChange: 0,
    indirectCostChange: 0,
  });

  const simulatedSummary = useMemo(() => {
    const newRevenue = summary.totalRevenue * (1 + scenario.revenueChange / 100);
    const newDirectCosts = summary.costsByType.direct * (1 + scenario.directCostChange / 100);
    const newCommercialCosts = summary.costsByType.commercial * (1 + scenario.commercialCostChange / 100);
    const newStructuralCosts = summary.costsByType.structural * (1 + scenario.structuralCostChange / 100);
    const newIndirectCosts = summary.costsByType.indirect * (1 + scenario.indirectCostChange / 100);
    
    const newTotalCosts = newDirectCosts + newCommercialCosts + newStructuralCosts + newIndirectCosts;
    const newGrossMargin = newRevenue - newDirectCosts;
    const newContributionMargin = newRevenue - newDirectCosts - newCommercialCosts;
    const newNetMargin = newRevenue - newTotalCosts;

    const fixedCosts = newStructuralCosts + newIndirectCosts;
    const variableCosts = newDirectCosts + newCommercialCosts;
    const contributionMarginRatio = newRevenue > 0 ? (newRevenue - variableCosts) / newRevenue : 0;
    const breakEvenRevenue = contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : 0;

    return {
      totalRevenue: newRevenue,
      totalCosts: newTotalCosts,
      grossMargin: newGrossMargin,
      grossMarginPercent: newRevenue > 0 ? (newGrossMargin / newRevenue) * 100 : 0,
      contributionMargin: newContributionMargin,
      contributionMarginPercent: newRevenue > 0 ? (newContributionMargin / newRevenue) * 100 : 0,
      netMargin: newNetMargin,
      netMarginPercent: newRevenue > 0 ? (newNetMargin / newRevenue) * 100 : 0,
      breakEvenRevenue,
      isAboveBreakEven: newRevenue >= breakEvenRevenue && breakEvenRevenue > 0,
      costsByType: {
        direct: newDirectCosts,
        commercial: newCommercialCosts,
        structural: newStructuralCosts,
        indirect: newIndirectCosts,
      },
    };
  }, [summary, scenario]);

  const differences = useMemo(() => ({
    revenue: simulatedSummary.totalRevenue - summary.totalRevenue,
    costs: simulatedSummary.totalCosts - summary.totalCosts,
    netMargin: simulatedSummary.netMargin - summary.netMargin,
    netMarginPercent: simulatedSummary.netMarginPercent - summary.netMarginPercent,
  }), [summary, simulatedSummary]);

  const resetScenario = () => {
    setScenario({
      revenueChange: 0,
      directCostChange: 0,
      commercialCostChange: 0,
      structuralCostChange: 0,
      indirectCostChange: 0,
    });
  };

  const applyPreset = (preset: 'optimistic' | 'pessimistic' | 'cost-reduction') => {
    switch (preset) {
      case 'optimistic':
        setScenario({
          revenueChange: 20,
          directCostChange: 5,
          commercialCostChange: 10,
          structuralCostChange: 0,
          indirectCostChange: 0,
        });
        break;
      case 'pessimistic':
        setScenario({
          revenueChange: -15,
          directCostChange: 10,
          commercialCostChange: 5,
          structuralCostChange: 5,
          indirectCostChange: 5,
        });
        break;
      case 'cost-reduction':
        setScenario({
          revenueChange: 0,
          directCostChange: -10,
          commercialCostChange: -15,
          structuralCostChange: -5,
          indirectCostChange: -5,
        });
        break;
    }
  };

  const SliderControl = ({ 
    label, 
    value, 
    onChange, 
    color = 'primary',
    currentValue 
  }: { 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
    color?: 'primary' | 'destructive';
    currentValue: number;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatCurrency(currentValue)}
          </span>
          <Badge variant={value === 0 ? 'secondary' : value > 0 ? 'default' : 'destructive'}>
            {formatPercent(value)}
          </Badge>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={-50}
        max={50}
        step={1}
        className="w-full"
      />
    </div>
  );

  const ComparisonRow = ({ 
    label, 
    original, 
    simulated, 
    isPercent = false,
    highlight = false 
  }: { 
    label: string; 
    original: number; 
    simulated: number;
    isPercent?: boolean;
    highlight?: boolean;
  }) => {
    const diff = simulated - original;
    const isPositive = diff > 0;
    
    return (
      <div className={`flex items-center justify-between py-2 ${highlight ? 'bg-muted/50 px-3 rounded-lg' : ''}`}>
        <span className={`text-sm ${highlight ? 'font-medium' : ''}`}>{label}</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-24 text-right">
            {isPercent ? `${original.toFixed(1)}%` : formatCurrency(original)}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className={`text-sm font-medium w-24 text-right ${
            isPositive ? 'text-green-600' : diff < 0 ? 'text-destructive' : ''
          }`}>
            {isPercent ? `${simulated.toFixed(1)}%` : formatCurrency(simulated)}
          </span>
          <Badge 
            variant={diff === 0 ? 'secondary' : isPositive ? 'default' : 'destructive'}
            className="w-20 justify-center"
          >
            {isPercent 
              ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp` 
              : formatPercent((diff / (original || 1)) * 100)
            }
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Simulatore What-If
            </CardTitle>
            <CardDescription>Analizza scenari di variazione costi e ricavi</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetScenario}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Scenarios */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('optimistic')}
            className="gap-1"
          >
            <TrendingUp className="h-3 w-3 text-green-600" />
            Scenario Ottimista
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('pessimistic')}
            className="gap-1"
          >
            <TrendingDown className="h-3 w-3 text-destructive" />
            Scenario Pessimista
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => applyPreset('cost-reduction')}
            className="gap-1"
          >
            <Target className="h-3 w-3 text-blue-600" />
            Riduzione Costi
          </Button>
        </div>

        <Separator />

        {/* Sliders */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ricavi
            </h4>
            <SliderControl
              label="Variazione Ricavi"
              value={scenario.revenueChange}
              onChange={(val) => setScenario(s => ({ ...s, revenueChange: val }))}
              currentValue={summary.totalRevenue}
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-destructive flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Costi
            </h4>
            <SliderControl
              label="Costi Diretti"
              value={scenario.directCostChange}
              onChange={(val) => setScenario(s => ({ ...s, directCostChange: val }))}
              color="destructive"
              currentValue={summary.costsByType.direct}
            />
            <SliderControl
              label="Costi Commerciali"
              value={scenario.commercialCostChange}
              onChange={(val) => setScenario(s => ({ ...s, commercialCostChange: val }))}
              color="destructive"
              currentValue={summary.costsByType.commercial}
            />
            <SliderControl
              label="Costi Strutturali"
              value={scenario.structuralCostChange}
              onChange={(val) => setScenario(s => ({ ...s, structuralCostChange: val }))}
              color="destructive"
              currentValue={summary.costsByType.structural}
            />
            <SliderControl
              label="Costi Indiretti"
              value={scenario.indirectCostChange}
              onChange={(val) => setScenario(s => ({ ...s, indirectCostChange: val }))}
              color="destructive"
              currentValue={summary.costsByType.indirect}
            />
          </div>
        </div>

        <Separator />

        {/* Results Comparison */}
        <div>
          <h4 className="font-medium mb-4">Confronto Risultati</h4>
          <div className="space-y-1">
            <ComparisonRow 
              label="Ricavi Totali" 
              original={summary.totalRevenue} 
              simulated={simulatedSummary.totalRevenue} 
            />
            <ComparisonRow 
              label="Costi Totali" 
              original={summary.totalCosts} 
              simulated={simulatedSummary.totalCosts} 
            />
            <ComparisonRow 
              label="Margine Lordo" 
              original={summary.grossMargin} 
              simulated={simulatedSummary.grossMargin} 
            />
            <ComparisonRow 
              label="Margine Lordo %" 
              original={summary.grossMarginPercent} 
              simulated={simulatedSummary.grossMarginPercent}
              isPercent 
            />
            <ComparisonRow 
              label="Margine Contribuzione" 
              original={summary.contributionMargin} 
              simulated={simulatedSummary.contributionMargin} 
            />
            <ComparisonRow 
              label="Margine Netto" 
              original={summary.netMargin} 
              simulated={simulatedSummary.netMargin}
              highlight 
            />
            <ComparisonRow 
              label="Margine Netto %" 
              original={summary.netMarginPercent} 
              simulated={simulatedSummary.netMarginPercent}
              isPercent
              highlight 
            />
          </div>
        </div>

        {/* Break-Even Status */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <span className="font-medium">Break-Even Point</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                BEP: {formatCurrency(simulatedSummary.breakEvenRevenue)}
              </span>
              <Badge variant={simulatedSummary.isAboveBreakEven ? 'default' : 'secondary'}>
                {simulatedSummary.isAboveBreakEven ? '✓ Raggiunto' : '○ Non raggiunto'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Impact Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-3 rounded-lg text-center ${differences.netMargin >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <p className="text-xs text-muted-foreground mb-1">Impatto su Margine</p>
            <p className={`text-lg font-bold ${differences.netMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(differences.netMargin)}
            </p>
          </div>
          <div className={`p-3 rounded-lg text-center ${differences.revenue >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <p className="text-xs text-muted-foreground mb-1">Δ Ricavi</p>
            <p className={`text-lg font-bold ${differences.revenue >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(differences.revenue)}
            </p>
          </div>
          <div className={`p-3 rounded-lg text-center ${differences.costs <= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <p className="text-xs text-muted-foreground mb-1">Δ Costi</p>
            <p className={`text-lg font-bold ${differences.costs <= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(differences.costs)}
            </p>
          </div>
          <div className={`p-3 rounded-lg text-center ${differences.netMarginPercent >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <p className="text-xs text-muted-foreground mb-1">Δ Margine %</p>
            <p className={`text-lg font-bold ${differences.netMarginPercent >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {differences.netMarginPercent >= 0 ? '+' : ''}{differences.netMarginPercent.toFixed(1)}pp
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
