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
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useCashFlowAnalysis } from '@/hooks/useCashFlowAnalysis';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { OverviewTab } from '@/components/financial/OverviewTab';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

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
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);
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

  const marginWaterfallData = [
    { name: 'Fatturato', value: summary.totalRevenue, fill: 'hsl(var(--chart-1))' },
    { name: 'Margine Reseller', value: summary.resellerMargin, fill: 'hsl(var(--chart-2))' },
    { name: 'Margine Lordo', value: summary.grossMargin, fill: 'hsl(var(--chart-3))' },
    { name: 'Margine Netto', value: summary.netMargin, fill: summary.netMargin >= 0 ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))' },
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
      const financialData = {
        projectName,
        commodityType,
        fatturatoTotale: summary.totalRevenue,
        margineReseller: summary.resellerMargin,
        margineLordo: summary.grossMargin,
        margineLordoPerc: summary.grossMarginPercent,
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
        parametriSimulazione: {
          punPerKwh: revenueSimulation.data?.params?.punPerKwh,
          spreadPerKwh: revenueSimulation.data?.params?.spreadPerKwh,
          ccvMensile: revenueSimulation.data?.params?.ccvMonthly,
          consumoMedioMensile: revenueSimulation.data?.params?.avgMonthlyConsumption,
          tassoAttivazione: revenueSimulation.data?.params?.activationRate,
          tassoChurn: revenueSimulation.data?.params?.monthlyChurnRate,
          tassoInsoluti: revenueSimulation.data?.params?.uncollectibleRate,
          contrattiMensili: revenueSimulation.data?.monthlyContracts,
        },
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
          incassato: Math.round(m.incassato),
          costiTotali: Math.round(m.costiTotali),
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

  const handleExportPDF = () => {
    if (!report) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Direzionale', margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`${projectName} — ${new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y);
    y += 6;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setTextColor(0);

    // KPI Summary box
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, maxWidth, 28, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const kpis = [
      { label: 'Fatturato', value: formatCurrency(summary.totalRevenue) },
      { label: 'Margine Netto', value: `${formatCurrency(summary.netMargin)} (${summary.netMarginPercent.toFixed(1)}%)` },
      { label: 'Clienti Attivi', value: String(summary.clientiAttivi) },
      { label: 'Break-Even', value: cashFlowData.mesePrimoPositivo || 'N/D' },
      { label: 'ROI', value: `${(cashFlowData.investimentoIniziale > 0 ? (cashFlowData.saldoFinale / cashFlowData.investimentoIniziale * 100) : 0).toFixed(1)}%` },
    ];
    const kpiWidth = maxWidth / kpis.length;
    kpis.forEach((kpi, i) => {
      const x = margin + i * kpiWidth + kpiWidth / 2;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(kpi.label, x, y + 8, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(kpi.value, x, y + 16, { align: 'center' });
    });
    y += 34;

    // Report content
    doc.setTextColor(0);
    const lines = report.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { y += 3; continue; }

      if (y > 275) {
        doc.addPage();
        y = 15;
      }

      if (trimmed.startsWith('## ')) {
        y += 4;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        const heading = trimmed.slice(3).replace(/[⚠️✅❌]/g, '').trim();
        doc.text(heading, margin, y);
        y += 2;
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + doc.getTextWidth(heading), y);
        y += 5;
        doc.setTextColor(0);
      } else if (trimmed.startsWith('### ')) {
        y += 2;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(trimmed.slice(4), margin, y);
        y += 5;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const text = trimmed.slice(2).replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(`• ${text}`, maxWidth - 5);
        for (const wl of wrapped) {
          if (y > 275) { doc.addPage(); y = 15; }
          doc.text(wl, margin + 3, y);
          y += 4.2;
        }
      } else if (/^\d+\.\s/.test(trimmed)) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const text = trimmed.replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(text, maxWidth - 5);
        for (const wl of wrapped) {
          if (y > 275) { doc.addPage(); y = 15; }
          doc.text(wl, margin + 3, y);
          y += 4.2;
        }
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const text = trimmed.replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(text, maxWidth);
        for (const wl of wrapped) {
          if (y > 275) { doc.addPage(); y = 15; }
          doc.text(wl, margin, y);
          y += 4.2;
        }
      }
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150);
      doc.text(`Report Direzionale — ${projectName} — Pagina ${i}/${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('Documento riservato — Generato automaticamente', pageWidth / 2, 294, { align: 'center' });
    }

    doc.save(`Report_Direzionale_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: 'PDF esportato', description: 'Il report è stato scaricato.' });
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
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Esporta PDF
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

      {/* Overview Dashboard */}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniKPI icon={<TrendingUp className="h-4 w-4" />} label="Fatturato" value={formatCurrency(summary.totalRevenue)} color="text-primary" />
            <MiniKPI icon={<Target className="h-4 w-4" />} label="Margine Netto" value={`${formatCurrency(summary.netMargin)} (${summary.netMarginPercent.toFixed(1)}%)`} color={summary.netMargin >= 0 ? 'text-green-600' : 'text-destructive'} />
            <MiniKPI icon={<Users className="h-4 w-4" />} label="Clienti Attivi" value={String(summary.clientiAttivi)} color="text-foreground" />
            <MiniKPI icon={<Wallet className="h-4 w-4" />} label="Break-Even" value={cashFlowData.mesePrimoPositivo || 'N/D'} color="text-foreground" />
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
function MiniKPI({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
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
