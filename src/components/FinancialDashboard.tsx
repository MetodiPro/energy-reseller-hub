import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Percent,
  FileDown,
  Receipt,
  Calculator,
  Zap,
  Users,
  Wallet
} from 'lucide-react';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useCashFlowAnalysis } from '@/hooks/useCashFlowAnalysis';
import { useExportFinancialPDF } from '@/hooks/useExportFinancialPDF';
import { CostRevenueManager } from '@/components/CostRevenueManager';
import { FinancialTrendChart } from '@/components/financial/FinancialTrendChart';
import { BreakEvenAnalysis } from '@/components/financial/BreakEvenAnalysis';
import { CostTemplateSelector } from '@/components/financial/CostTemplateSelector';
import { FinancialAlerts } from '@/components/financial/FinancialAlerts';
import { WhatIfSimulator } from '@/components/financial/WhatIfSimulator';
import { FinancialTimeline } from '@/components/financial/FinancialTimeline';
import { CostCategorySummary } from '@/components/financial/CostCategorySummary';
import { TaxesManager } from '@/components/financial/TaxesManager';
import { PassthroughCostsCard } from '@/components/financial/PassthroughCostsCard';
import { MarginAnalysis } from '@/components/financial/MarginAnalysis';
import { ResellerRevenueSimulator } from '@/components/financial/ResellerRevenueSimulator';
import { CostTabsView } from '@/components/financial/CostTabsView';
import { WholesalerCostsConfig } from '@/components/financial/WholesalerCostsConfig';
import { CashFlowDashboard } from '@/components/financial/CashFlowDashboard';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface FinancialDashboardProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

const COLORS = {
  commercial: 'hsl(var(--chart-1))',
  structural: 'hsl(var(--chart-2))',
  direct: 'hsl(var(--chart-3))',
  indirect: 'hsl(var(--chart-4))',
};

const COST_TYPE_LABELS = {
  commercial: 'Commerciali',
  structural: 'Strutturali',
  direct: 'Diretti',
  indirect: 'Indiretti',
};

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

export const FinancialDashboard = ({ projectId, projectName, commodityType }: FinancialDashboardProps) => {
  const { costs, revenues, categories, loading, summary: costSummary, addCost, addRevenue, deleteCost, deleteRevenue, updateCost, updateRevenue, refetch } = useProjectFinancials(projectId);
  const { summary: simulationSummary, loading: simulationLoading } = useSimulationSummary(projectId);
  const { data: simulationData, updateParams: updateSimParams, saveSimulation } = useRevenueSimulation(projectId);
  const { cashFlowData, loading: cashFlowLoading } = useCashFlowAnalysis(projectId);
  const { exportToPDF } = useExportFinancialPDF();
  const [activeTab, setActiveTab] = useState('overview');
  const [editingCost, setEditingCost] = useState<any>(null);
  const [showCostDialog, setShowCostDialog] = useState(false);
  
  // Filter costs by commodity type
  const filteredCosts = useMemo(() => {
    return costs.filter(cost => {
      const costName = cost.name.toLowerCase();
      const commodityFilter = (cost as any).commodity_filter;
      
      // If cost has explicit filter, use it
      if (commodityFilter) {
        if (commodityType === 'solo-luce' && commodityFilter === 'gas') return false;
        if (commodityType === 'solo-gas' && commodityFilter === 'luce') return false;
      }
      
      // Pattern-based filtering
      const gasPatterns = ['gas', 'smc', 'evg', 'metano'];
      const lucePatterns = ['energia elettrica', 'kwh', 'eve'];
      
      const isGasRelated = gasPatterns.some(p => costName.includes(p)) && !costName.includes('energia');
      const isLuceRelated = lucePatterns.some(p => costName.includes(p));
      
      // If it's clearly gas-related and project is solo-luce, hide it
      if (commodityType === 'solo-luce' && isGasRelated && !isLuceRelated) {
        return false;
      }
      
      // If it's clearly luce-related and project is solo-gas, hide it
      if (commodityType === 'solo-gas' && isLuceRelated && !isGasRelated) {
        return false;
      }
      
      return true;
    });
  }, [costs, commodityType]);

  // Integrated summary using simulation data for revenues
  const summary = useMemo(() => {
    // Use simulation revenue as the source of truth
    const totalRevenue = simulationSummary.hasData ? simulationSummary.totalFatturato : costSummary.totalRevenue;
    const resellerMargin = simulationSummary.hasData ? simulationSummary.totalMargine : 0;
    const passthroughCosts = simulationSummary.hasData ? simulationSummary.totalPassanti + simulationSummary.totalIva : costSummary.passthroughCosts;
    
    // Operational costs from cost manager
    const operationalCosts = costSummary.operationalCosts;
    const totalCosts = passthroughCosts + operationalCosts;
    
    // Gross Margin = Fatturato - Passanti (what you keep before operational expenses)
    const grossMargin = totalRevenue - passthroughCosts;
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    
    // Contribution Margin = Gross Margin - Commercial Costs
    const contributionMargin = grossMargin - costSummary.costsByType.commercial;
    const contributionMarginPercent = totalRevenue > 0 ? (contributionMargin / totalRevenue) * 100 : 0;
    
    // Net Margin = Revenue - All Costs (passthrough + operational)
    const netMargin = totalRevenue - totalCosts;
    const netMarginPercent = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCosts,
      passthroughCosts,
      operationalCosts,
      grossMargin,
      grossMarginPercent,
      costsByType: costSummary.costsByType,
      netMargin,
      netMarginPercent,
      contributionMargin,
      contributionMarginPercent,
      // Additional simulation data
      resellerMargin,
      clientiAttivi: simulationSummary.clientiAttivi,
      contrattiTotali: simulationSummary.contrattiTotali,
      totalIncassato: simulationSummary.totalIncassato,
      totalInsoluti: simulationSummary.totalInsoluti,
      hasSimulationData: simulationSummary.hasData,
    };
  }, [costSummary, simulationSummary]);

  const handleExportPDF = () => {
    exportToPDF(projectName, costs, revenues, summary);
  };

  const handleTemplateApplied = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pieData = Object.entries(summary.costsByType)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: COST_TYPE_LABELS[key as keyof typeof COST_TYPE_LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  const barData = [
    { name: 'Ricavi', value: summary.totalRevenue, fill: 'hsl(var(--chart-1))' },
    { name: 'Costi Totali', value: summary.totalCosts, fill: 'hsl(var(--chart-4))' },
    { name: 'Margine Lordo', value: summary.grossMargin, fill: 'hsl(var(--chart-2))' },
    { name: 'Margine Netto', value: summary.netMargin, fill: summary.netMargin >= 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))' },
  ];

  const marginData = [
    { name: 'Margine Lordo', percent: summary.grossMarginPercent },
    { name: 'Margine Contributivo', percent: summary.contributionMarginPercent },
    { name: 'Margine Netto', percent: summary.netMarginPercent },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Finanziaria</h2>
          <p className="text-muted-foreground">{projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          <CostTemplateSelector projectId={projectId} onTemplateApplied={handleTemplateApplied} />
          <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Esporta PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Costi
          </TabsTrigger>
          <TabsTrigger value="revenues" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ricavi
          </TabsTrigger>
          <TabsTrigger value="margins" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Margini
          </TabsTrigger>
          <TabsTrigger value="liquidity" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Liquidità
          </TabsTrigger>
          <TabsTrigger value="taxes" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Imposte
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Simulazione
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Storico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Alerts */}
          <FinancialAlerts summary={summary} />

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fatturato Totale</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(summary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.hasSimulationData ? 'Da simulatore (14 mesi)' : 'Nessun dato simulazione'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margine Reseller</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.resellerMargin)}</div>
                <p className="text-xs text-muted-foreground">
                  CCV + Spread + Altro
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clienti Attivi</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.clientiAttivi}</div>
                <p className="text-xs text-muted-foreground">
                  su {summary.contrattiTotali} contratti
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Costi Operativi</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.operationalCosts)}</div>
                <p className="text-xs text-muted-foreground">
                  {costs.filter(c => !(c as any).is_passthrough).length} voci
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margine Lordo</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.grossMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(summary.grossMargin)}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {summary.grossMarginPercent >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  )}
                  <span className={summary.grossMarginPercent >= 0 ? 'text-green-600' : 'text-destructive'}>
                    {formatPercent(summary.grossMarginPercent)}
                  </span>
                  <span className="text-muted-foreground">sui ricavi</span>
                </div>
              </CardContent>
            </Card>

            <Card>
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
                  <span className="text-muted-foreground">sui ricavi</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Summary if simulation data available */}
          {summary.hasSimulationData && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-green-50 dark:bg-green-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Incassato</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(summary.totalIncassato)}</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Passanti (da girare)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-orange-600">{formatCurrency(summary.passthroughCosts)}</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Insoluti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-600">{formatCurrency(summary.totalInsoluti)}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cost Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Ripartizione Costi
                </CardTitle>
                <CardDescription>Suddivisione per tipologia</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Nessun costo registrato
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {Object.entries(summary.costsByType).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }}
                        />
                        <span>{COST_TYPE_LABELS[key as keyof typeof COST_TYPE_LABELS]}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue vs Costs Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ricavi vs Costi
                </CardTitle>
                <CardDescription>Confronto economico</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Margin Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Analisi Margini</CardTitle>
              <CardDescription>Indicatori di redditività del progetto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {marginData.map((margin) => (
                <div key={margin.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{margin.name}</span>
                    <Badge variant={margin.percent >= 20 ? 'default' : margin.percent >= 0 ? 'secondary' : 'destructive'}>
                      {formatPercent(margin.percent)}
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.max(0, Math.min(100, margin.percent))} 
                    className="h-2"
                  />
                </div>
              ))}
              
              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <p><strong>Margine Lordo:</strong> Ricavi - Costi Diretti (materiali, manodopera)</p>
                <p><strong>Margine Contributivo:</strong> Ricavi - Costi Diretti - Costi Commerciali</p>
                <p><strong>Margine Netto:</strong> Ricavi - Tutti i Costi (inclusi strutturali e indiretti)</p>
              </div>
            </CardContent>
          </Card>

          {/* Cost Category Summary */}
          <CostCategorySummary costs={costs} />

          {/* Trend Chart with Forecast */}
          <FinancialTrendChart costs={costs} revenues={revenues} summary={summary} />

          {/* Break-Even Analysis */}
          <BreakEvenAnalysis summary={summary} />
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {/* Wholesaler costs configuration with deposit evolution */}
          <WholesalerCostsConfig
            config={{
              punPerMwh: simulationData?.params?.punPerKwh ? simulationData.params.punPerKwh * 1000 : 120,
              punOverride: null,
              punAutoUpdate: true,
              spreadPerKwh: simulationData?.params?.spreadPerKwh || 0.015,
              gestionePodPerPod: 2.50,
              depositoMesi: 3,
              depositoPercentualeAttivazione: simulationData?.params?.activationRate || 85,
            }}
            clientiAttivi={summary.clientiAttivi || 0}
            consumoMedioMensile={simulationData?.params?.avgMonthlyConsumption || 200}
            onConfigChange={(updates) => {
              if (updates.spreadPerKwh !== undefined) {
                updateSimParams('spreadPerKwh', updates.spreadPerKwh);
              }
              if (updates.punPerMwh !== undefined) {
                updateSimParams('punPerKwh', updates.punPerMwh / 1000);
              }
            }}
            depositiMensili={simulationSummary.depositiMensili}
            depositoIniziale={simulationSummary.depositoIniziale}
            depositoFinale={simulationSummary.depositoFinale}
            depositoMassimo={simulationSummary.depositoMassimo}
          />
          
          {/* Costs organized by category tabs */}
          <CostTabsView
            costs={filteredCosts}
            categories={categories}
            commodityType={commodityType || null}
            onEdit={(cost) => {
              setEditingCost(cost);
              setShowCostDialog(true);
            }}
            onDelete={async (id) => {
              if (confirm('Sei sicuro di voler eliminare questo costo?')) {
                await deleteCost(id);
              }
            }}
            onAdd={() => {
              setEditingCost(null);
              setShowCostDialog(true);
            }}
          />
        </TabsContent>

        <TabsContent value="revenues">
          <div className="space-y-6">
            {/* Spiegazione modello ricavi reseller */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Modello Ricavi Reseller Energia
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                <p>
                  Il <strong>fatturato</strong> di un reseller è dato dalla somma delle bollette emesse ai clienti finali.
                  Solo 3 componenti della fattura sono controllabili dal reseller:
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>CCV</strong> - Componente Commercializzazione e Vendita (€/mese fisso)</li>
                  <li><strong>Spread</strong> - Ricarico variabile su PUN/PSV (€/kWh o €/Smc)</li>
                  <li><strong>Altro</strong> - Servizi aggiuntivi opzionali</li>
                </ul>
                <p className="text-xs mt-2 text-blue-600 dark:text-blue-500">
                  Tutte le altre componenti (energia, trasporto, distribuzione, oneri) sono passanti verso il grossista/distributore.
                </p>
              </div>
            </div>

            {/* Simulatore Ricavi Reseller - Fonte unica dei ricavi */}
            <ResellerRevenueSimulator projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="margins" className="space-y-6">
          <MarginAnalysis summary={summary} />
        </TabsContent>

        <TabsContent value="liquidity" className="space-y-6">
          <CashFlowDashboard 
            cashFlowData={cashFlowData} 
            loading={cashFlowLoading} 
          />
        </TabsContent>

        <TabsContent value="taxes">
          <TaxesManager projectId={projectId} />
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          {/* What-If Simulator */}
          <WhatIfSimulator summary={summary} />
          
          {/* Break-Even Analysis */}
          <BreakEvenAnalysis summary={summary} />
        </TabsContent>

        <TabsContent value="history">
          <FinancialTimeline projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
