import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, Target, Percent, Calculator, Zap, Users, Info,
} from 'lucide-react';
import { FinancialAlerts } from './FinancialAlerts';
import { FinancialTrendChart } from './FinancialTrendChart';
import { BreakEvenAnalysis } from './BreakEvenAnalysis';
import { FinancialGlossary } from './FinancialGlossary';
import { MonthlyChannelCostsChart } from './MonthlyChannelCostsChart';
import { MarketDataBar } from './MarketDataBar';
import type { SalesChannel } from '@/hooks/useSalesChannels';
import type { FinancialOverviewSummary } from '@/hooks/useFinancialSummary';
import type { SimulationSummary } from '@/hooks/useSimulationSummary';
import type { CashFlowSummary } from '@/hooks/useCashFlowAnalysis';
import type { RevenueSimulationData } from '@/hooks/useRevenueSimulation';
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const COLORS = {
  commercial: 'hsl(var(--chart-1))',
  structural: 'hsl(var(--chart-2))',
  direct: 'hsl(var(--chart-3))',
  indirect: 'hsl(var(--chart-4))',
};

const COST_TYPE_LABELS: Record<string, string> = {
  commercial: 'Commerciali',
  structural: 'Strutturali',
  direct: 'Diretti',
  indirect: 'Indiretti',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

interface OverviewTabProps {
  summary: FinancialOverviewSummary;
  simulationSummary: SimulationSummary;
  cashFlowData: CashFlowSummary;
  cashFlowLoading: boolean;
  salesChannels: SalesChannel[];
  getChannelBreakdown: (total: number) => { channel_name: string; cost: number; commission_amount: number; commission_type: string; contracts: number; activations: number }[];
  simulationData?: RevenueSimulationData;
}

export const OverviewTab = ({
  summary, simulationSummary, cashFlowData, cashFlowLoading,
  salesChannels, getChannelBreakdown, simulationData,
}: OverviewTabProps) => {
  // Pie data
  const pieData = (() => {
    const entries: { name: string; value: number; color: string }[] = [];
    if (summary.hasSimulationData && summary.passthroughCosts > 0) {
      entries.push({ name: 'Passanti (energia, trasporto, oneri)', value: summary.passthroughCosts, color: 'hsl(var(--chart-5))' });
    }
    if (summary.costiCommercialiSimulati > 0) {
      entries.push({ name: 'Commerciali (canali vendita)', value: summary.costiCommercialiSimulati, color: COLORS.commercial });
    }
    Object.entries(summary.costsByType)
      .filter(([key, value]) => {
        if (value <= 0) return false;
        if (key === 'commercial' && summary.costiCommercialiSimulati > 0) return false;
        return true;
      })
      .forEach(([key, value]) => {
        entries.push({ name: COST_TYPE_LABELS[key] || key, value, color: COLORS[key as keyof typeof COLORS] || 'hsl(var(--chart-1))' });
      });
    return entries;
  })();

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

  const totalContracts = summary.contrattiTotali || 0;
  const breakdown = getChannelBreakdown(totalContracts);
  const totalChannelCost = breakdown.reduce((s, ch) => s + ch.cost, 0);
  const channelPieData = breakdown
    .filter(ch => ch.cost > 0)
    .map((ch, i) => ({
      name: ch.channel_name,
      value: ch.cost,
      percent: totalChannelCost > 0 ? (ch.cost / totalChannelCost) * 100 : 0,
      color: `hsl(var(--chart-${(i % 5) + 1}))`,
    }));

  return (
    <div className="space-y-6">
      <FinancialAlerts summary={summary} />

      {/* KPI Cards */}
      <TooltipProvider delayDuration={200}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard title="Fatturato Totale" tooltip="Tutto ciò che il reseller fattura ai clienti finali nei 14 mesi di simulazione. Include margine, costi passanti e IVA." icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} value={formatCurrency(summary.totalRevenue)} valueClass="text-primary" subtitle={summary.hasSimulationData ? 'Da simulatore (14 mesi)' : 'Nessun dato simulazione'} />
          <KPICard title="Margine Reseller" tooltip="Il guadagno lordo del reseller: somma di CCV (commercializzazione), Spread al cliente e altri servizi." icon={<TrendingUp className="h-4 w-4 text-green-600" />} value={formatCurrency(summary.resellerMargin)} valueClass="text-green-600" subtitle="CCV + Spread + Altro" />
          <KPICard title="Clienti Attivi" tooltip="Clienti con fornitura attiva a fine simulazione, al netto degli switch-out." icon={<Users className="h-4 w-4 text-muted-foreground" />} value={String(summary.clientiAttivi)} subtitle={`su ${summary.contrattiTotali} contratti`} />
          <KPICard title="Costi Commerciali" tooltip="Provvigioni e commissioni pagate ai canali di vendita per l'acquisizione clienti." icon={<Users className="h-4 w-4 text-muted-foreground" />} value={formatCurrency(summary.costiCommercialiSimulati)} valueClass="text-orange-600" subtitle={summary.costiCommercialiSimulati > 0 ? 'Da canali di vendita' : 'Configura i canali'} />
          <KPICard title="Costi Operativi" tooltip="Totale costi del reseller: provvigioni canali + spese strutturali. Non includono i costi passanti." icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />} value={formatCurrency(summary.operationalCosts)} valueClass="text-destructive" subtitle="Commerciali + strutturali" />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <UITooltip><TooltipTrigger asChild><CardTitle className="text-sm font-medium flex items-center gap-1 cursor-help">Margine Lordo<Info className="h-3 w-3 text-muted-foreground" /></CardTitle></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>Imponibile meno costi passanti in fattura. Indica quanto resta al reseller prima delle spese operative.</p></TooltipContent></UITooltip>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.grossMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(summary.grossMargin)}</div>
              <div className="flex items-center gap-1 text-xs">
                {summary.grossMarginPercent >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-600" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
                <span className={summary.grossMarginPercent >= 0 ? 'text-green-600' : 'text-destructive'}>{formatPercent(summary.grossMarginPercent)}</span>
                <span className="text-muted-foreground">sull'imponibile</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <UITooltip><TooltipTrigger asChild><CardTitle className="text-sm font-medium flex items-center gap-1 cursor-help">Margine Netto<Info className="h-3 w-3 text-muted-foreground" /></CardTitle></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>Margine Lordo meno i Costi Operativi. È il profitto effettivo del reseller.</p></TooltipContent></UITooltip>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(summary.netMargin)}</div>
              <div className="flex items-center gap-1 text-xs">
                {summary.netMarginPercent >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-600" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
                <span className={summary.netMarginPercent >= 0 ? 'text-green-600' : 'text-destructive'}>{formatPercent(summary.netMarginPercent)}</span>
                <span className="text-muted-foreground">sull'imponibile</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Cash flow summary cards */}
      {summary.hasSimulationData && (
        <TooltipProvider delayDuration={200}>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50 dark:bg-green-950/20">
              <CardHeader className="pb-2"><UITooltip><TooltipTrigger asChild><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-1 cursor-help">Incassato<Info className="h-3 w-3 opacity-60" /></CardTitle></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>Quanto è stato effettivamente incassato dai clienti.</p></TooltipContent></UITooltip></CardHeader>
              <CardContent><div className="text-xl font-bold text-green-600">{formatCurrency(summary.totalIncassato)}</div></CardContent>
            </Card>
            <Card className="bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="pb-2"><UITooltip><TooltipTrigger asChild><CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1 cursor-help">Costi Passanti in Fattura<Info className="h-3 w-3 opacity-60" /></CardTitle></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>Voci addebitate al cliente e girate a terzi. Non sono un guadagno per il reseller.</p></TooltipContent></UITooltip></CardHeader>
              <CardContent><div className="text-xl font-bold text-orange-600">{formatCurrency(summary.passthroughCosts)}</div></CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/20">
              <CardHeader className="pb-2"><UITooltip><TooltipTrigger asChild><CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-1 cursor-help">Insoluti<Info className="h-3 w-3 opacity-60" /></CardTitle></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>Importi fatturati ma non incassati dopo 4+ mesi.</p></TooltipContent></UITooltip></CardHeader>
              <CardContent><div className="text-xl font-bold text-red-600">{formatCurrency(summary.totalInsoluti)}</div></CardContent>
            </Card>
          </div>
        </TooltipProvider>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Ripartizione Costi</CardTitle><CardDescription>Suddivisione per tipologia</CardDescription></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">Nessun costo registrato</div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate">{entry.name}</span></div>
                  <span className="font-medium">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Ricavi vs Costi</CardTitle><CardDescription>Confronto economico</CardDescription></CardHeader>
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

      {/* Sales Channel Cost Breakdown */}
      {channelPieData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Ripartizione Costi Commerciali per Canale</CardTitle><CardDescription>Distribuzione provvigioni tra canali di vendita ({totalContracts} contratti totali)</CardDescription></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={channelPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${percent.toFixed(0)}%`}>
                    {channelPieData.map((entry, index) => (<Cell key={`ch-cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="space-y-3 flex flex-col justify-center">
                {channelPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm font-medium">{entry.name}</span></div>
                    <div className="text-right"><span className="text-sm font-bold">{formatCurrency(entry.value)}</span><span className="text-xs text-muted-foreground ml-2">({entry.percent.toFixed(1)}%)</span></div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {simulationData && (
        <MonthlyChannelCostsChart channels={salesChannels} monthlyContracts={simulationData.monthlyContracts} startDate={simulationData.startDate} />
      )}

      {/* ROI */}
      {cashFlowData.hasData && cashFlowData.investimentoIniziale > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />ROI — Return on Investment</CardTitle><CardDescription>Confronto tra margine netto e investimento iniziale dal Processo</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Investimento Totale</p><p className="text-2xl font-bold text-destructive">{formatCurrency(cashFlowData.investimentoIniziale)}</p><p className="text-xs text-muted-foreground">Costi step del Processo</p></div>
              <div className="space-y-1"><p className="text-sm text-muted-foreground">Margine Netto (14m)</p><p className={`text-2xl font-bold ${summary.netMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(summary.netMargin)}</p><p className="text-xs text-muted-foreground">Ricavi − Tutti i costi</p></div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ROI</p>
                {(() => { const roi = cashFlowData.investimentoIniziale > 0 ? ((summary.netMargin / cashFlowData.investimentoIniziale) * 100) : 0; return (<><p className={`text-2xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-destructive'}`}>{roi.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{roi >= 100 ? 'Investimento recuperato' : roi >= 0 ? 'In recupero' : 'Negativo'}</p></>); })()}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Payback</p>
                {(() => { const avg = summary.netMargin / 14; const months = avg > 0 ? Math.ceil(cashFlowData.investimentoIniziale / avg) : null; return (<><p className="text-2xl font-bold">{months ? `${months} mesi` : 'N/D'}</p><p className="text-xs text-muted-foreground">{months && months <= 14 ? 'Entro la simulazione' : 'Oltre 14 mesi'}</p></>); })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Margin Analysis summary */}
      <Card>
        <CardHeader><CardTitle>Analisi Margini</CardTitle><CardDescription>Indicatori di redditività del progetto</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {marginData.map((margin) => (
            <div key={margin.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{margin.name}</span>
                <Badge variant={margin.percent >= 20 ? 'default' : margin.percent >= 0 ? 'secondary' : 'destructive'}>{formatPercent(margin.percent)}</Badge>
              </div>
              <Progress value={Math.max(0, Math.min(100, margin.percent))} className="h-2" />
            </div>
          ))}
          <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <p><strong>Margine Lordo:</strong> Imponibile − Costi Passanti in fattura (grossista, trasporto, oneri, accise)</p>
            <p><strong>Margine Contributivo:</strong> Margine Lordo − Provvigioni canali di vendita</p>
            <p><strong>Margine Netto:</strong> Imponibile − Costi Passanti − Costi Commerciali − Costi Strutturali</p>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Cost Summary */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Riepilogo Costi dal Simulatore</CardTitle><CardDescription>Costi calcolati in base alla base clienti e consumi previsti</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Costo Energia Grossista</p><p className="text-xl font-bold">{formatCurrency(simulationSummary.costoEnergiaTotale)}</p><p className="text-xs text-muted-foreground">14 mesi simulati</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Fee Gestione POD</p><p className="text-xl font-bold">{formatCurrency(simulationSummary.costoGestionePodTotale)}</p><p className="text-xs text-muted-foreground">14 mesi simulati</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Costi Commerciali</p><p className="text-xl font-bold">{formatCurrency(summary.costiCommercialiSimulati)}</p><p className="text-xs text-muted-foreground">Provvigioni canali vendita</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Depositi Cauzionali</p><p className="text-xl font-bold">{formatCurrency(simulationSummary.depositoMassimo)}</p><p className="text-xs text-muted-foreground">Picco massimo</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Costi Operativi Totali</p><p className="text-xl font-bold">{formatCurrency(summary.operationalCosts)}</p><p className="text-xs text-muted-foreground">Commerciali + strutturali</p></div>
          </div>
        </CardContent>
      </Card>

      <FinancialTrendChart cashFlowData={cashFlowData} loading={cashFlowLoading} />
      <BreakEvenAnalysis summary={summary} breakEvenFinanziario={cashFlowData.mesePrimoPositivo} />
      <FinancialGlossary />
    </div>
  );
};

// Simple KPI Card helper
const KPICard = ({ title, tooltip, icon, value, valueClass, subtitle }: { title: string; tooltip: string; icon: React.ReactNode; value: string; valueClass?: string; subtitle: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <TooltipProvider delayDuration={200}>
        <UITooltip><TooltipTrigger asChild><CardTitle className="text-sm font-medium flex items-center gap-1 cursor-help">{title}<Info className="h-3 w-3 text-muted-foreground" /></CardTitle></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>{tooltip}</p></TooltipContent></UITooltip>
      </TooltipProvider>
      {icon}
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${valueClass || ''}`}>{value}</div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </CardContent>
  </Card>
);
