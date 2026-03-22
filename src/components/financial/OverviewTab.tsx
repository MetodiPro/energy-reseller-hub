import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, Target, Percent, Calculator, Zap, Users, Info, ChevronDown,
  ArrowRight,
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
  onUsePunLive?: (punPerKwh: number) => void;
  onNavigateToTariffs?: () => void;
}

export const OverviewTab = ({
  summary, simulationSummary, cashFlowData, cashFlowLoading,
  salesChannels, getChannelBreakdown, simulationData,
  onUsePunLive, onNavigateToTariffs,
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

  const strutturaliCosts = summary.costsByType.structural + summary.costsByType.direct + summary.costsByType.indirect;

  const barData = [
    { name: 'Fatturato Netto', value: summary.imponibile, fill: 'hsl(var(--chart-1))' },
    { name: 'Ricavi Reseller', value: summary.resellerMargin, fill: 'hsl(var(--chart-2))' },
    { name: 'Margine Commerciale', value: summary.margineCommercialeLordo, fill: 'hsl(var(--chart-3))' },
    { name: 'Margine Netto', value: summary.netMargin, fill: summary.netMargin >= 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))' },
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
      <MarketDataBar
        onUsePunLive={onUsePunLive}
        onNavigateToTariffs={onNavigateToTariffs}
        currentPunPerKwh={simulationData?.params?.punPerKwh ?? null}
      />

      <Collapsible defaultOpen={false}>
        <Card className="border-muted">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Come leggere i dati finanziari
              </CardTitle>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Fatturato vs Margine</p>
                  <p className="text-xs text-muted-foreground">
                    Il fatturato lordo include tutto ciò che transita in fattura (passanti + IVA).
                    Il margine commerciale è ciò che resta dopo aver pagato il grossista per l'energia.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Costi Reali vs Passanti</p>
                  <p className="text-xs text-muted-foreground">
                    I costi reali del reseller sono: costo energia (PUN + spread grossista + fee POD),
                    provvigioni canali e costi strutturali. I passanti (trasporto, oneri, accise) transitano
                    e si annullano.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Cash Flow vs Accrual</p>
                  <p className="text-xs text-muted-foreground">
                    I margini sono in logica accrual (competenza). Il Cash Flow mostra l'impatto sulla
                    liquidità: depositi cauzionali, dilazioni d'incasso e investimenti iniziali.
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <FinancialAlerts summary={summary} />

      {/* RIGA 1 — Volume */}
      <TooltipProvider delayDuration={200}>
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Fatturato Lordo"
            tooltip="Tutto ciò che il reseller fattura ai clienti finali: include margine reseller, costi passanti e IVA. È il volume complessivo d'affari, non il guadagno."
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(summary.totalRevenue)}
            valueClass="text-primary"
            subtitle={`IVA: ${formatCurrency(summary.totalIva)}`}
          />
          <KPICard
            title="Fatturato Netto"
            tooltip="Imponibile: fatturato al netto dell'IVA. Base di calcolo per le percentuali di margine."
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(summary.imponibile)}
            valueClass="text-primary"
            subtitle="Imponibile, senza IVA"
          />
          <KPICard
            title="Clienti Attivi"
            tooltip="Clienti con fornitura attiva alla fine del periodo di simulazione (14 mesi), al netto del churn."
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            value={String(summary.clientiAttivi)}
            subtitle={`su ${summary.contrattiTotali} contratti`}
          />
        </div>
      </TooltipProvider>

      {/* RIGA 2 — Margini a cascata */}
      <TooltipProvider delayDuration={200}>
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Ricavi Reseller"
            tooltip="Le componenti commerciali che il reseller applica in fattura: il CCV (corrispettivo fisso mensile) e lo spread applicato al prezzo dell'energia. Questi sono i RICAVI LORDI del reseller prima di detrarre il costo dell'energia pagata al grossista."
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            value={formatCurrency(summary.resellerMargin)}
            valueClass="text-green-600"
            subtitle="CCV + Spread cliente × kWh"
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <UITooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="text-sm font-medium flex items-center gap-1 cursor-help">
                    Costo Energia al Grossista
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>Quanto il reseller paga effettivamente al grossista per l'energia: PUN (prezzo mercato) × kWh + spread grossista × kWh + fee gestione POD × clienti. Questo NON include trasporto, oneri e accise che sono pure partite di giro.</p>
                </TooltipContent>
              </UITooltip>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(summary.costoEnergiaNetto + summary.costoGestionePodTotale)}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">
                  Energia: {formatCurrency(summary.costoEnergiaNetto)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fee POD: {formatCurrency(summary.costoGestionePodTotale)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className={summary.margineCommercialeLordo >= 0 ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <UITooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="text-sm font-medium flex items-center gap-1 cursor-help">
                    Margine Commerciale
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>Il vero margine del reseller dopo aver pagato il grossista. Corrisponde a: spread netto (spread cliente − spread grossista) × kWh + CCV − fee POD, moltiplicato per tutti i clienti del periodo. Rappresenta la redditività lorda del modello commerciale.</p>
                </TooltipContent>
              </UITooltip>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.margineCommercialeLordo >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(summary.margineCommercialeLordo)}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {summary.margineCommercialePercent >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-600" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
                <span className={summary.margineCommercialePercent >= 0 ? 'text-green-600' : 'text-destructive'}>{formatPercent(summary.margineCommercialePercent)}</span>
                <span className="text-muted-foreground">sul fatturato netto</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* RIGA 3 — Costi operativi propri */}
      <TooltipProvider delayDuration={200}>
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Costi Commerciali"
            tooltip="Provvigioni e commissioni pagate ai canali di vendita (agenti, teleselling, web, sportelli) per ogni contratto acquisito e attivato."
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(summary.costiCommercialiSimulati)}
            valueClass="text-orange-600"
            subtitle={summary.costiCommercialiSimulati > 0 ? 'Provvigioni canali vendita' : 'Configura i canali'}
          />
          <KPICard
            title="Costi Strutturali"
            tooltip="Costi fissi del reseller: affitto, personale, software, consulenze. Sono i costi che sostieni indipendentemente dal numero di clienti."
            icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(strutturaliCosts)}
            valueClass="text-orange-600"
            subtitle="Affitto, personale, software"
          />
          <Card className={summary.netMargin >= 0 ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <UITooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="text-sm font-medium flex items-center gap-1 cursor-help">
                    Margine Netto Operativo
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>Margine commerciale meno tutti i costi operativi (provvigioni + costi strutturali). È il risultato operativo reale del reseller.</p>
                </TooltipContent>
              </UITooltip>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(summary.netMargin)}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {summary.netMarginPercent >= 0 ? <ArrowUpRight className="h-3 w-3 text-green-600" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
                <span className={summary.netMarginPercent >= 0 ? 'text-green-600' : 'text-destructive'}>{formatPercent(summary.netMarginPercent)}</span>
                <span className="text-muted-foreground">sul fatturato netto</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* RIGA 4 — Passanti e incassi */}
      {summary.hasSimulationData && (
        <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Partite di Giro (Transit Items)
            </CardTitle>
            <CardDescription>
              Importi incassati dai clienti e girati integralmente a terzi (DSO, GSE, ADM). Non impattano il margine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Costi Passanti Totali</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(summary.passthroughCosts)}</p>
                <p className="text-xs text-muted-foreground">Trasporto + oneri + accise</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Totale Incassato</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalIncassato)}</p>
                <p className="text-xs text-muted-foreground">Incassi effettivi dai clienti</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Insoluti</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(summary.totalInsoluti)}</p>
                <p className="text-xs text-muted-foreground">Fatturato non incassato</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Cascata Margini</CardTitle><CardDescription>Dal fatturato al margine netto</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis type="category" dataKey="name" width={140} />
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
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />ROI — Return on Investment</CardTitle><CardDescription>Analisi di ritorno sull'investimento basata sui flussi di cassa effettivi</CardDescription></CardHeader>
          <CardContent>
            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div className="space-y-1"><p className="text-sm text-muted-foreground">Investimento Totale</p><p className="text-2xl font-bold text-destructive">{formatCurrency(cashFlowData.investimentoIniziale)}</p><p className="text-xs text-muted-foreground">Costi step del Processo</p></div>
                <div className="space-y-1"><p className="text-sm text-muted-foreground">Saldo Cassa (14m)</p><p className={`text-2xl font-bold ${cashFlowData.saldoFinale >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(cashFlowData.saldoFinale)}</p><p className="text-xs text-muted-foreground">Flusso di cassa cumulativo</p></div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">ROI</p>
                  {(() => { const roi = cashFlowData.investimentoIniziale > 0 ? ((cashFlowData.saldoFinale / cashFlowData.investimentoIniziale) * 100) : 0; return (<><p className={`text-2xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-destructive'}`}>{roi.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{roi >= 100 ? 'Investimento recuperato' : roi >= 0 ? 'In recupero' : 'Negativo'}</p></>); })()}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Payback</p>
                  <p className="text-2xl font-bold">{cashFlowData.mesePrimoPositivo ?? 'N/D'}</p>
                  <p className="text-xs text-muted-foreground">{cashFlowData.mesePrimoPositivo ? 'Primo mese saldo positivo' : 'Oltre 14 mesi'}</p>
                </div>
                <div className="space-y-1">
                  <UITooltip><TooltipTrigger asChild><p className="text-sm text-muted-foreground flex items-center gap-1 cursor-help">Massima Esposizione<Info className="h-3 w-3 opacity-60" /></p></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>Il picco di cassa negativa: quanto capitale serve avere disponibile prima di raggiungere l'equilibrio</p></TooltipContent></UITooltip>
                  <p className={`text-2xl font-bold ${cashFlowData.massimaEsposizione < 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(cashFlowData.massimaEsposizione)}</p>
                  <p className="text-xs text-muted-foreground">{cashFlowData.meseEsposizioneMassima}</p>
                </div>
              </div>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground mt-2 italic">
              * La stima delle imposte dirette (IRES/IRAP) nel report fiscale è indicativa.
              Non include ammortamenti, costi strutturali e perdite riportabili.
              Consultare un commercialista per il calcolo definitivo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Margin Analysis summary */}
      <Card>
        <CardHeader><CardTitle>Analisi Margini a Cascata</CardTitle><CardDescription>Dal margine commerciale al risultato operativo</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {[
            { name: 'Margine Commerciale', percent: summary.margineCommercialePercent, desc: 'Ricavi Reseller − Costo Energia Grossista − Fee POD' },
            { name: 'Margine di Contribuzione', percent: summary.contributionMarginPercent, desc: 'Margine Commerciale − Provvigioni canali vendita' },
            { name: 'Margine Netto Operativo', percent: summary.netMarginPercent, desc: 'Margine Commerciale − Costi Commerciali − Costi Strutturali' },
          ].map((margin) => (
            <div key={margin.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{margin.name}</span>
                  <p className="text-xs text-muted-foreground">{margin.desc}</p>
                </div>
                <Badge variant={margin.percent >= 20 ? 'default' : margin.percent >= 0 ? 'secondary' : 'destructive'}>{formatPercent(margin.percent)}</Badge>
              </div>
              <Progress value={Math.max(0, Math.min(100, margin.percent))} className="h-2" />
            </div>
          ))}
          <div className="pt-4 border-t text-xs text-muted-foreground italic">
            Tutte le percentuali sono calcolate sul fatturato netto (imponibile), esclusi IVA e costi passanti.
          </div>
        </CardContent>
      </Card>

      {/* Simulation Cost Summary */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Riepilogo Costi dal Simulatore</CardTitle><CardDescription>Costi calcolati in base alla base clienti e consumi previsti</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Costo Energia Grossista</p><p className="text-xl font-bold">{formatCurrency(simulationSummary.costoEnergiaTotale)}</p><p className="text-xs text-muted-foreground">PUN + spread grossista</p></div>
            <div className="space-y-1"><p className="text-sm text-muted-foreground">Fee Gestione POD</p><p className="text-xl font-bold">{formatCurrency(simulationSummary.costoGestionePodTotale)}</p><p className="text-xs text-muted-foreground">Per ogni POD attivo</p></div>
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
