import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Loader2, RefreshCw, ClipboardCopy, CheckCircle2,
  AlertTriangle, Download, TrendingUp, TrendingDown, Users,
  Target, Wallet, PieChart as PieChartIcon, BarChart3,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useSimulationSummary, buildSimulationSummary } from '@/hooks/useSimulationSummary';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSimulationProducts } from '@/hooks/useSimulationProducts';
import { useCashFlowAnalysis } from '@/hooks/useCashFlowAnalysis';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { OverviewTab } from '@/components/financial/OverviewTab';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportDirectorReportDocx } from '@/lib/exportDirectorReportDocx';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

interface DirectorReportProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

export const DirectorReport = ({ projectId, projectName, commodityType }: DirectorReportProps) => {
  const { toast } = useToast();
  const [report, setReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { costs, revenues, summary: costSummary, loading } = useProjectFinancials(projectId);
  const revenueSimulation = useRevenueSimulation(projectId);
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult, multiProductResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const { products } = useSimulationProducts(projectId);
  const { channels: salesChannels, getChannelBreakdown, calculateCommissionCosts, loading: channelsLoading } = useSalesChannels(projectId);
  const sharedChannelsData = { channels: salesChannels, calculateCommissionCosts, loading: channelsLoading };
  const { cashFlowData, loading: cashFlowLoading } = useCashFlowAnalysis(projectId, { simulationData: sharedSimData, salesChannelsData: sharedChannelsData, sharedEngine: engineResult });
  const summary = useFinancialSummary(costSummary, simulationSummary, cashFlowData);

  const handleUsePunLive = useCallback((punPerKwh: number) => {
    revenueSimulation.updateParams('punPerKwh', punPerKwh);
    setTimeout(() => revenueSimulation.saveSimulation(), 500);
  }, [revenueSimulation]);

  // ── Chart Data ──
  const costBreakdownData = [
    { name: 'Passanti', value: summary.passthroughCosts, color: 'hsl(var(--chart-5))' },
    { name: 'Commerciali', value: summary.costiCommercialiSimulati, color: 'hsl(var(--chart-1))' },
    { name: 'Strutturali', value: summary.costsByType.structural, color: 'hsl(var(--chart-2))' },
    { name: 'Diretti', value: summary.costsByType.direct, color: 'hsl(var(--chart-3))' },
    { name: 'Indiretti', value: summary.costsByType.indirect, color: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0);

  const fatturatoNetto = summary.totalRevenue - summary.totalIva;
  const costoGrossistaDisplay = summary.costoEnergiaNetto + summary.costoGestionePodTotale ||
    (simulationSummary.costoEnergiaTotale + simulationSummary.costoGestionePodTotale);

  const marginWaterfallData = [
    { name: 'Fatturato netto (imp.)', value: fatturatoNetto, fill: 'hsl(var(--chart-1))' },
    { name: 'Ricavi commerciali', value: summary.resellerMargin, fill: 'hsl(var(--chart-2))' },
    { name: '− Costo grossista', value: -costoGrossistaDisplay, fill: 'hsl(var(--destructive))' },
    { name: 'Margine comm. lordo', value: summary.grossMargin, fill: 'hsl(var(--chart-3))' },
    { name: 'Margine netto', value: summary.netMargin, fill: summary.netMargin >= 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))' },
  ];

  const cashFlowChartData = cashFlowData.monthlyData?.map(m => ({
    month: m.monthLabel,
    entrate: m.incassi,
    uscite: m.outflow,
    saldoCumulativo: m.saldoCumulativo,
  })) || [];

  const channelBreakdown = getChannelBreakdown(simulationSummary.contrattiTotali || 0);
  const channelData = channelBreakdown.filter(c => c.cost > 0).map((c, i) => ({
    name: c.channel_name,
    costo: c.cost,
    contratti: c.contracts,
    costoPerCliente: c.contracts > 0 ? Math.round(c.cost / c.contracts) : 0,
    color: `hsl(var(--chart-${(i % 5) + 1}))`,
  }));

  const generateReport = async () => {
    setGenerating(true);
    try {
      // Build per-product summaries from multi-product engine
      const activeProducts = products.filter(p => p.is_active);
      const prodottiDettaglio = activeProducts.map(p => {
        const productEngine = multiProductResult?.products.find(pr => pr.product.id === p.id);
        const lastMonth = productEngine?.result.monthly[productEngine.result.monthly.length - 1];
        const totalFatturato = productEngine?.result.monthly.reduce((s, m) => s + m.fatturato, 0) || 0;
        const totalMargine = productEngine?.result.monthly.reduce((s, m) => s + m.margineCommerciale, 0) || 0;
        const totalContratti = productEngine?.result.monthly.reduce((s, m) => s + m.customer.contrattiNuovi, 0) || 0;
        const totalChurn = productEngine?.result.monthly.reduce((s, m) => s + m.customer.churn, 0) || 0;
        const linkedChannel = salesChannels.find(c => c.id === p.channel_id);
        return {
          nome: p.name,
          quotaContratti: p.contract_share,
          ccvMensile: p.ccv_monthly,
          spreadPerKwh: p.spread_per_kwh,
          altriServizi: p.other_services_monthly,
          consumoMedio: p.avg_monthly_consumption,
          tipoCliente: p.client_type,
          ivaPercent: p.iva_percent,
          tassoAttivazione: p.activation_rate,
          churnMese1: p.churn_month1_pct,
          churnMese2: p.churn_month2_pct,
          churnMese3: p.churn_month3_pct,
          churnDecay: p.churn_decay_factor,
          incassoMese0: p.collection_month_0,
          incassoMese1: p.collection_month_1,
          incassoMese2: p.collection_month_2,
          incassoMese3Plus: p.collection_month_3_plus,
          tassoInsoluti: p.uncollectible_rate,
          canaleVendita: linkedChannel?.channel_name || 'Non assegnato',
          // Risultati simulazione
          fatturatoTotale: totalFatturato,
          margineTotale: totalMargine,
          contrattiTotali: totalContratti,
          clientiAttiviFinali: lastMonth?.customer.clientiAttivi || 0,
          switchOutTotali: totalChurn,
          marginePerc: totalFatturato > 0 ? (totalMargine / totalFatturato * 100) : 0,
        };
      });

      const financialData = {
        projectName,
        commodityType,
        fatturatoTotale: summary.totalRevenue,
        fatturatoNetto: summary.totalRevenue - summary.totalIva,
        ricaviCommerciali: summary.resellerMargin,
        costoEnergiaGrossista: simulationSummary.costoEnergiaTotale + simulationSummary.costoGestionePodTotale,
        margineCommercialeLordo: summary.grossMargin,
        margineCommLordoPerc: summary.grossMarginPercent,
        margineReseller: summary.resellerMargin,
        margineNetto: summary.netMargin,
        margineNettoPerc: summary.netMarginPercent,
        margineContributivo: summary.contributionMargin,
        margineContributivoPerc: summary.contributionMarginPercent,
        costiOperativi: summary.operationalCosts,
        costiCommerciali: summary.costiCommercialiSimulati,
        costiPassanti: summary.passthroughCosts,
        costiPerTipo: summary.costsByType,
        clientiAttivi: summary.clientiAttivi,
        contrattiTotali: summary.contrattiTotali,
        incassato: summary.totalIncassato,
        insoluti: summary.totalInsoluti,
        investimentoIniziale: cashFlowData.investimentoIniziale,
        saldoFinale: cashFlowData.saldoFinale,
        mesePrimoPositivo: cashFlowData.mesePrimoPositivo,
        massimaEsposizione: cashFlowData.massimaEsposizione,
        meseEsposizioneMassima: cashFlowData.meseEsposizioneMassima,
        // Multi-product details
        prodotti: prodottiDettaglio,
        parametriSimulazione: {
          punPerKwh: revenueSimulation.data?.params?.punPerKwh,
          contrattiMensili: revenueSimulation.data?.monthlyContracts,
          spreadGrossistaPerKwh: revenueSimulation.data?.params?.spreadGrossistaPerKwh,
          gestionePodPerPod: revenueSimulation.data?.params?.gestionePodPerPod,
          depositoMesi: revenueSimulation.data?.params?.depositoMesi,
          depositoPercentualeAttivazione: revenueSimulation.data?.params?.depositoPercentualeAttivazione,
          dispacciamentoPerKwh: revenueSimulation.data?.params?.dispacciamentoPerKwh,
          trasportoQuotaFissaAnno: revenueSimulation.data?.params?.trasportoQuotaFissaAnno,
          trasportoQuotaEnergiaKwh: revenueSimulation.data?.params?.trasportoQuotaEnergiaKwh,
          trasportoQuotaPotenzaKwAnno: revenueSimulation.data?.params?.trasportoQuotaPotenzaKwAnno,
          potenzaImpegnataKw: revenueSimulation.data?.params?.potenzaImpegnataKw,
          oneriAsosKwh: revenueSimulation.data?.params?.oneriAsosKwh,
          oneriArimKwh: revenueSimulation.data?.params?.oneriArimKwh,
          acciseKwh: revenueSimulation.data?.params?.acciseKwh,
        },
        costiPassantiDettaglio: {
          dispacciamento: simulationSummary.costiMensili?.reduce((s: number, m: any) => s + (m.dispacciamento || 0), 0) || 0,
          trasporto: simulationSummary.costiMensili?.reduce((s: number, m: any) => s + (m.trasporto || 0), 0) || 0,
          oneriSistema: simulationSummary.costiMensili?.reduce((s: number, m: any) => s + (m.oneriSistema || 0), 0) || 0,
          accise: simulationSummary.costiMensili?.reduce((s: number, m: any) => s + (m.accise || 0), 0) || 0,
        },
        costoEnergiaTotale: simulationSummary.costoEnergiaTotale || 0,
        costoGestionePodTotale: simulationSummary.costoGestionePodTotale || 0,
        canaliVendita: salesChannels.filter(c => c.is_active).map(c => ({
          nome: c.channel_name,
          tipo: c.channel_type,
          commissione: c.commission_amount,
          tipoCommissione: c.commission_type,
          quotaContratti: c.contract_share,
          tassoAttivazione: c.activation_rate,
        })),
        roi: cashFlowData.investimentoIniziale > 0
          ? ((cashFlowData.saldoFinale / cashFlowData.investimentoIniziale) * 100)
          : 0,
        cashFlowMensile: cashFlowData.monthlyData?.map(m => ({
          mese: m.monthLabel,
          incassato: Math.round(m.incassi),
          costiTotali: Math.round(m.outflow),
          saldoCumulativo: Math.round(m.saldoCumulativo),
        })),
      };

      const { data, error } = await supabase.functions.invoke('generate-director-report', {
        body: { financialData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setReport(data.report);
      toast({ title: 'Report generato', description: 'Il report direzionale è pronto.' });
    } catch (err: any) {
      console.error('Error generating report:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile generare il report',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      setCopied(true);
      toast({ title: 'Copiato', description: 'Report copiato negli appunti' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportDocx = async () => {
    if (!report) return;
    try {
      await exportDirectorReportDocx({
        projectName,
        reportContent: report,
        kpis: {
          fatturato: formatCurrency(summary.totalRevenue),
          margineNetto: formatCurrency(summary.netMargin),
          margineNettoPerc: `${summary.netMarginPercent.toFixed(1)}% (su marg. comm.)`,
          clientiAttivi: String(summary.clientiAttivi),
          breakEven: cashFlowData.mesePrimoPositivo || 'N/D',
          roi: cashFlowData.investimentoIniziale > 0
            ? `${(cashFlowData.saldoFinale / cashFlowData.investimentoIniziale * 100).toFixed(1)}%`
            : 'N/D (costi non config.)',
          massimaEsposizione: formatCurrency(Math.abs(cashFlowData.massimaEsposizione)),
          meseMassimaEsposizione: cashFlowData.meseEsposizioneMassima || 'N/D',
          saldoFinale: formatCurrency(cashFlowData.saldoFinale),
        },
        date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
        cashFlowMonthly: cashFlowData.monthlyData?.map(m => ({
          mese: m.monthLabel,
          incassato: Math.round(m.incassi),
          costiTotali: Math.round(m.outflow),
          flussoNetto: Math.round(m.flussoNetto),
          saldoCumulativo: Math.round(m.saldoCumulativo),
        })),
        costBreakdown: costBreakdownData.map(c => ({ name: c.name, value: c.value })),
        marginWaterfall: marginWaterfallData.map(m => ({ name: m.name, value: m.value })),
        channelData: channelData.map(c => ({ name: c.name, costo: c.costo, contratti: c.contratti, costoPerCliente: c.costoPerCliente })),
        monthlyClients: cashFlowData.monthlyData?.map(m => ({
          mese: m.monthLabel,
          contrattiNuovi: m.contrattiNuovi,
          attivazioni: m.attivazioni,
          clientiAttivi: m.clientiAttivi,
          churn: m.breakdown?.churnedCustomers ?? 0,
        })),
      });
      toast({ title: 'Word esportato', description: 'Il report è stato scaricato in formato .docx' });
    } catch (err) {
      console.error('Export error:', err);
      toast({ title: 'Errore', description: 'Impossibile esportare il documento', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Report Direzionale
          </h2>
          <p className="text-muted-foreground">
            {projectName} — Panoramica KPI e report strategico per la direzione
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <ClipboardCopy className="h-4 w-4" />}
                {copied ? 'Copiato' : 'Copia'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportDocx} className="gap-2">
                <Download className="h-4 w-4" />
                Esporta Word
              </Button>
            </>
          )}
          <Button
            onClick={generateReport}
            disabled={generating || !summary.hasSimulationData}
            className="gap-2"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generazione in corso...
              </>
            ) : report ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Rigenera Report
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Genera Report Direzionale
              </>
            )}
          </Button>
        </div>
      </div>

      {!summary.hasSimulationData && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-400">Simulazione non configurata</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configura prima le Ipotesi Operative e i parametri di simulazione per poter generare il report direzionale.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {summary.hasSimulationData && cashFlowData.investimentoIniziale === 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-400">
                Costi di investimento non configurati
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Il ROI e l'analisi del payback richiedono i costi degli step del processo.
                Vai in <strong>Processo</strong> per configurare i costi di avvio. Il report
                verrà generato ma mostrerà ROI = 0% (non significativo).
              </p>
            </div>
          </CardContent>
        </Card>
      )}


      <OverviewTab
        summary={summary}
        simulationSummary={simulationSummary}
        cashFlowData={cashFlowData}
        cashFlowLoading={cashFlowLoading}
        salesChannels={salesChannels}
        getChannelBreakdown={getChannelBreakdown}
        simulationData={revenueSimulation.data}
        onUsePunLive={handleUsePunLive}
        onNavigateToTariffs={() => {}}
      />

      {/* ── Report Section with Charts ── */}
      {report && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Header Card */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Report Direzionale — {projectName}
                  </CardTitle>
                  <CardDescription>
                    Analisi strategica completa — Documento riservato per la direzione aziendale
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <MiniKPI icon={<TrendingUp className="h-4 w-4" />} label="Fatturato" value={formatCurrency(summary.totalRevenue)} color="text-primary" />
            <MiniKPI icon={<Target className="h-4 w-4" />} label="Margine Netto" value={formatCurrency(summary.netMargin)} subValue={`${summary.netMarginPercent.toFixed(1)}% sul marg. comm.`} color={summary.netMargin >= 0 ? 'text-green-600' : 'text-destructive'} />
            <MiniKPI icon={<Users className="h-4 w-4" />} label="Clienti Attivi" value={String(summary.clientiAttivi)} color="text-foreground" />
            <MiniKPI icon={<Wallet className="h-4 w-4" />} label="Break-Even" value={cashFlowData.mesePrimoPositivo || 'N/D'} color="text-foreground" />
            <MiniKPI icon={<TrendingDown className="h-4 w-4" />} label="Massima Esposizione" value={formatCurrency(Math.abs(cashFlowData.massimaEsposizione))} subValue={`Picco: ${cashFlowData.meseEsposizioneMassima}`} color="text-destructive" />
            <MiniKPI icon={<Wallet className="h-4 w-4" />} label="Saldo Finale (14m)" value={formatCurrency(cashFlowData.saldoFinale)} color={cashFlowData.saldoFinale >= 0 ? 'text-green-600' : 'text-destructive'} />
            <MiniKPI icon={<TrendingUp className="h-4 w-4" />} label="ROI (14m)" value={`${(cashFlowData.investimentoIniziale > 0 ? (cashFlowData.saldoFinale / cashFlowData.investimentoIniziale * 100) : 0).toFixed(1)}%`} color={(cashFlowData.saldoFinale / (cashFlowData.investimentoIniziale || 1)) >= 0 ? 'text-green-600' : 'text-destructive'} />
          </div>

          {/* Charts Row 1: Margin Waterfall + Cost Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Cascata dei Margini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={marginWaterfallData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={10} />
                    <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" /> Composizione Costi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {costBreakdownData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                          {costBreakdownData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {costBreakdownData.map(entry => (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Nessun dato</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chart Row 2: Cash Flow Trend */}
          {cashFlowChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Andamento Cash Flow (14 mesi)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={cashFlowChartData}>
                    <defs>
                      <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} fontSize={10} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="saldoCumulativo" name="Saldo Cumulativo" stroke="hsl(var(--chart-2))" fill="url(#colorSaldo)" strokeWidth={2} />
                    <Line type="monotone" dataKey="entrate" name="Entrate" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="uscite" name="Uscite" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Chart Row 3: Channel Performance */}
          {channelData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Performance Canali di Vendita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis tickFormatter={(v) => `€${v}`} fontSize={10} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="costo" name="Costo Totale" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex flex-col justify-center">
                    {channelData.map(ch => (
                      <div key={ch.name} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="text-sm font-medium">{ch.name}</p>
                          <p className="text-xs text-muted-foreground">{ch.contratti} contratti</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(ch.costo)}</p>
                          <p className="text-xs text-muted-foreground">CAC: {formatCurrency(ch.costoPerCliente)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Report Text */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Analisi Strategica Dettagliata</CardTitle>
              <CardDescription>Commento e interpretazione professionale dei dati</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="max-w-none">
                <ReportContent content={report} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Mini KPI card for the summary strip
function MiniKPI({ icon, label, value, color, subValue }: { icon: React.ReactNode; label: string; value: string; color: string; subValue?: string }) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

// Markdown-like renderer
function ReportContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-bold text-foreground mt-8 mb-3 border-b border-primary/20 pb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-semibold text-foreground mt-5 mb-2">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2.5 ml-3">
              <span className="text-primary mt-1.5 text-xs">●</span>
              <span className="text-sm text-muted-foreground leading-relaxed">
                <InlineFormat text={trimmed.slice(2)} />
              </span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s/)?.[1];
          return (
            <div key={i} className="flex items-start gap-2.5 ml-3">
              <span className="bg-primary/10 text-primary font-bold text-xs min-w-[1.5rem] h-5 rounded flex items-center justify-center">{num}</span>
              <span className="text-sm text-muted-foreground leading-relaxed">
                <InlineFormat text={trimmed.replace(/^\d+\.\s/, '')} />
              </span>
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            <InlineFormat text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

function InlineFormat({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
