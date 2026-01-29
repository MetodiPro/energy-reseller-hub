import { useState } from 'react';
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
  FileDown
} from 'lucide-react';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useExportFinancialPDF } from '@/hooks/useExportFinancialPDF';
import { CostRevenueManager } from '@/components/CostRevenueManager';
import { FinancialTrendChart } from '@/components/financial/FinancialTrendChart';
import { BreakEvenAnalysis } from '@/components/financial/BreakEvenAnalysis';
import { CostTemplateSelector } from '@/components/financial/CostTemplateSelector';
import { FinancialAlerts } from '@/components/financial/FinancialAlerts';
import { WhatIfSimulator } from '@/components/financial/WhatIfSimulator';
import { FinancialTimeline } from '@/components/financial/FinancialTimeline';
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

export const FinancialDashboard = ({ projectId, projectName }: FinancialDashboardProps) => {
  const { costs, revenues, categories, loading, summary, addCost, addRevenue, deleteCost, deleteRevenue, updateCost, updateRevenue, refetch } = useProjectFinancials(projectId);
  const { exportToPDF } = useExportFinancialPDF();
  const [activeTab, setActiveTab] = useState('overview');

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Simulazione
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Costi
          </TabsTrigger>
          <TabsTrigger value="revenues" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ricavi
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(summary.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {revenues.length} voci di ricavo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Costi Totali</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalCosts)}</div>
                <p className="text-xs text-muted-foreground">
                  {costs.length} voci di costo
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

          {/* Trend Chart with Forecast */}
          <FinancialTrendChart costs={costs} revenues={revenues} summary={summary} />

          {/* Break-Even Analysis */}
          <BreakEvenAnalysis summary={summary} />
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          {/* What-If Simulator */}
          <WhatIfSimulator summary={summary} />
          
          {/* Break-Even Analysis */}
          <BreakEvenAnalysis summary={summary} />
        </TabsContent>

        <TabsContent value="costs">
          <CostRevenueManager
            type="costs"
            projectId={projectId}
            items={costs}
            categories={categories}
            onAdd={addCost}
            onUpdate={updateCost}
            onDelete={deleteCost}
          />
        </TabsContent>

        <TabsContent value="revenues">
          <CostRevenueManager
            type="revenues"
            projectId={projectId}
            items={revenues}
            categories={categories}
            onAdd={addRevenue}
            onUpdate={updateRevenue}
            onDelete={deleteRevenue}
          />
        </TabsContent>

        <TabsContent value="history">
          <FinancialTimeline projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
