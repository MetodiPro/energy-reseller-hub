import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Calculator, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Target,
  Users,
  Phone
} from 'lucide-react';

interface ChannelScenario {
  channelName: string;
  commissionChange: number; // % variation on commission amount
  contractShareChange: number; // % variation on contract share
  originalCommission: number;
  originalContracts: number;
  originalCost: number;
}

interface WhatIfSimulatorProps {
  summary: {
    totalRevenue: number;
    totalCosts: number;
    grossMargin: number;
    grossMarginPercent: number;
    contributionMargin: number;
    contributionMarginPercent: number;
    netMargin: number;
    netMarginPercent: number;
    costiCommercialiSimulati: number;
    operationalCosts: number;
    passthroughCosts: number;
    costsByType: {
      direct: number;
      commercial: number;
      structural: number;
      indirect: number;
    };
  };
  channelBreakdown: Array<{
    channel_name: string;
    commission_amount: number;
    commission_type: 'per_contract' | 'per_activation';
    contracts: number;
    activations: number;
    cost: number;
  }>;
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

export const WhatIfSimulator = ({ summary, channelBreakdown }: WhatIfSimulatorProps) => {
  const [revenueChange, setRevenueChange] = useState(0);
  const [structuralCostChange, setStructuralCostChange] = useState(0);
  const [indirectCostChange, setIndirectCostChange] = useState(0);
  const [channelScenarios, setChannelScenarios] = useState<Record<string, { commissionChange: number; volumeChange: number }>>(
    () => {
      const init: Record<string, { commissionChange: number; volumeChange: number }> = {};
      channelBreakdown.forEach(ch => {
        init[ch.channel_name] = { commissionChange: 0, volumeChange: 0 };
      });
      return init;
    }
  );

  const simulatedSummary = useMemo(() => {
    const newRevenue = summary.totalRevenue * (1 + revenueChange / 100);
    
    // Calculate new commercial costs from channels
    let newCommercialCosts = 0;
    channelBreakdown.forEach(ch => {
      const scenario = channelScenarios[ch.channel_name] || { commissionChange: 0, volumeChange: 0 };
      const newCommission = ch.commission_amount * (1 + scenario.commissionChange / 100);
      const newVolume = ch.contracts * (1 + scenario.volumeChange / 100);
      
      if (ch.commission_type === 'per_contract') {
        newCommercialCosts += newCommission * newVolume;
      } else {
        const activations = Math.round(newVolume * (ch.activations / (ch.contracts || 1)));
        newCommercialCosts += newCommission * activations;
      }
    });
    
    // If no channels configured, fall back to percentage-based
    if (channelBreakdown.length === 0) {
      newCommercialCosts = summary.costiCommercialiSimulati;
    }

    const newStructuralCosts = summary.costsByType.structural * (1 + structuralCostChange / 100);
    const newIndirectCosts = summary.costsByType.indirect * (1 + indirectCostChange / 100);
    
    // Non-commercial operational costs (operational - commercial simulated)
    const nonCommercialOps = summary.operationalCosts - summary.costiCommercialiSimulati;
    const newOperationalCosts = nonCommercialOps + newCommercialCosts + newStructuralCosts + newIndirectCosts;
    
    const newTotalCosts = summary.passthroughCosts + newOperationalCosts;
    const newGrossMargin = newRevenue - summary.passthroughCosts;
    const newContributionMargin = newGrossMargin - newCommercialCosts;
    const newNetMargin = newRevenue - newTotalCosts;

    const fixedCosts = newStructuralCosts + newIndirectCosts;
    const contributionMarginRatio = newRevenue > 0 ? (newRevenue - summary.passthroughCosts - newCommercialCosts) / newRevenue : 0;
    const breakEvenRevenue = contributionMarginRatio > 0 ? (fixedCosts + nonCommercialOps) / contributionMarginRatio : 0;

    return {
      totalRevenue: newRevenue,
      totalCosts: newTotalCosts,
      grossMargin: newGrossMargin,
      grossMarginPercent: newRevenue > 0 ? (newGrossMargin / newRevenue) * 100 : 0,
      contributionMargin: newContributionMargin,
      contributionMarginPercent: newRevenue > 0 ? (newContributionMargin / newRevenue) * 100 : 0,
      netMargin: newNetMargin,
      netMarginPercent: newRevenue > 0 ? (newNetMargin / newRevenue) * 100 : 0,
      commercialCosts: newCommercialCosts,
      breakEvenRevenue,
      isAboveBreakEven: newRevenue >= breakEvenRevenue && breakEvenRevenue > 0,
    };
  }, [summary, revenueChange, structuralCostChange, indirectCostChange, channelScenarios, channelBreakdown]);

  const differences = useMemo(() => ({
    revenue: simulatedSummary.totalRevenue - summary.totalRevenue,
    costs: simulatedSummary.totalCosts - summary.totalCosts,
    netMargin: simulatedSummary.netMargin - summary.netMargin,
    netMarginPercent: simulatedSummary.netMarginPercent - summary.netMarginPercent,
    commercialCosts: simulatedSummary.commercialCosts - summary.costiCommercialiSimulati,
  }), [summary, simulatedSummary]);

  const resetScenario = () => {
    setRevenueChange(0);
    setStructuralCostChange(0);
    setIndirectCostChange(0);
    const reset: Record<string, { commissionChange: number; volumeChange: number }> = {};
    channelBreakdown.forEach(ch => {
      reset[ch.channel_name] = { commissionChange: 0, volumeChange: 0 };
    });
    setChannelScenarios(reset);
  };

  const applyPreset = (preset: 'optimistic' | 'pessimistic' | 'cost-reduction') => {
    const channelPreset: Record<string, { commissionChange: number; volumeChange: number }> = {};
    channelBreakdown.forEach(ch => {
      switch (preset) {
        case 'optimistic':
          channelPreset[ch.channel_name] = { commissionChange: -10, volumeChange: 20 };
          break;
        case 'pessimistic':
          channelPreset[ch.channel_name] = { commissionChange: 10, volumeChange: -15 };
          break;
        case 'cost-reduction':
          channelPreset[ch.channel_name] = { commissionChange: -20, volumeChange: 0 };
          break;
      }
    });
    setChannelScenarios(channelPreset);
    
    switch (preset) {
      case 'optimistic':
        setRevenueChange(20);
        setStructuralCostChange(0);
        setIndirectCostChange(0);
        break;
      case 'pessimistic':
        setRevenueChange(-15);
        setStructuralCostChange(5);
        setIndirectCostChange(5);
        break;
      case 'cost-reduction':
        setRevenueChange(0);
        setStructuralCostChange(-5);
        setIndirectCostChange(-5);
        break;
    }
  };

  const updateChannelScenario = (channelName: string, field: 'commissionChange' | 'volumeChange', value: number) => {
    setChannelScenarios(prev => ({
      ...prev,
      [channelName]: { ...prev[channelName], [field]: value },
    }));
  };

  const SliderControl = ({ 
    label, 
    value, 
    onChange, 
    currentValue 
  }: { 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
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
    const isPositive = label.includes('Costi') ? diff < 0 : diff > 0;
    
    return (
      <div className={`flex items-center justify-between py-2 ${highlight ? 'bg-muted/50 px-3 rounded-lg' : ''}`}>
        <span className={`text-sm ${highlight ? 'font-medium' : ''}`}>{label}</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-24 text-right">
            {isPercent ? `${original.toFixed(1)}%` : formatCurrency(original)}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className={`text-sm font-medium w-24 text-right ${
            isPositive ? 'text-green-600' : diff !== 0 ? 'text-destructive' : ''
          }`}>
            {isPercent ? `${simulated.toFixed(1)}%` : formatCurrency(simulated)}
          </span>
          <Badge 
            variant={diff === 0 ? 'secondary' : isPositive ? 'default' : 'destructive'}
            className="w-20 justify-center"
          >
            {isPercent 
              ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp` 
              : formatPercent((diff / (Math.abs(original) || 1)) * 100)
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
            <CardDescription>Simula variazioni su ricavi, provvigioni canali e costi operativi</CardDescription>
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
          <Button variant="outline" size="sm" onClick={() => applyPreset('optimistic')} className="gap-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            Scenario Ottimista
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('pessimistic')} className="gap-1">
            <TrendingDown className="h-3 w-3 text-destructive" />
            Scenario Pessimista
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('cost-reduction')} className="gap-1">
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
              value={revenueChange}
              onChange={setRevenueChange}
              currentValue={summary.totalRevenue}
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-destructive flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Costi Fissi
            </h4>
            <SliderControl
              label="Costi Strutturali"
              value={structuralCostChange}
              onChange={setStructuralCostChange}
              currentValue={summary.costsByType.structural}
            />
            <SliderControl
              label="Costi Indiretti"
              value={indirectCostChange}
              onChange={setIndirectCostChange}
              currentValue={summary.costsByType.indirect}
            />
          </div>
        </div>

        {/* Channel-specific controls */}
        {channelBreakdown.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium text-orange-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Canali di Vendita
                <Badge variant="outline" className="text-xs font-normal">Provvigioni reali configurate</Badge>
              </h4>
              
              {channelBreakdown.map(ch => {
                const scenario = channelScenarios[ch.channel_name] || { commissionChange: 0, volumeChange: 0 };
                const newCommission = ch.commission_amount * (1 + scenario.commissionChange / 100);
                const newVolume = Math.round(ch.contracts * (1 + scenario.volumeChange / 100));
                const newCost = ch.commission_type === 'per_contract'
                  ? newCommission * newVolume
                  : newCommission * Math.round(newVolume * (ch.activations / (ch.contracts || 1)));
                
                return (
                  <div key={ch.channel_name} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{ch.channel_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ch.commission_type === 'per_contract' ? 'Per contratto' : 'Per attivazione'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground mr-2">{formatCurrency(ch.cost)}</span>
                        <ArrowRight className="h-3 w-3 inline text-muted-foreground mx-1" />
                        <span className={`text-sm font-medium ${newCost !== ch.cost ? (newCost < ch.cost ? 'text-green-600' : 'text-destructive') : ''}`}>
                          {formatCurrency(newCost)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Provvigione unitaria</Label>
                          <span className="text-xs text-muted-foreground">€{ch.commission_amount} → €{newCommission.toFixed(0)}</span>
                        </div>
                        <Slider
                          value={[scenario.commissionChange]}
                          onValueChange={([val]) => updateChannelScenario(ch.channel_name, 'commissionChange', val)}
                          min={-50}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-right">
                          <Badge variant={scenario.commissionChange === 0 ? 'secondary' : scenario.commissionChange > 0 ? 'destructive' : 'default'} className="text-xs">
                            {formatPercent(scenario.commissionChange)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Volume contratti</Label>
                          <span className="text-xs text-muted-foreground">{ch.contracts} → {newVolume}</span>
                        </div>
                        <Slider
                          value={[scenario.volumeChange]}
                          onValueChange={([val]) => updateChannelScenario(ch.channel_name, 'volumeChange', val)}
                          min={-50}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-right">
                          <Badge variant={scenario.volumeChange === 0 ? 'secondary' : scenario.volumeChange > 0 ? 'default' : 'destructive'} className="text-xs">
                            {formatPercent(scenario.volumeChange)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

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
              label="Costi Commerciali" 
              original={summary.costiCommercialiSimulati} 
              simulated={simulatedSummary.commercialCosts} 
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
          <div className={`p-3 rounded-lg text-center ${differences.commercialCosts <= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <p className="text-xs text-muted-foreground mb-1">Δ Provvigioni</p>
            <p className={`text-lg font-bold ${differences.commercialCosts <= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(differences.commercialCosts)}
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
