import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText, Loader2, RefreshCw, ClipboardCopy, CheckCircle2,
  AlertTriangle, TrendingUp, DollarSign, PieChart, Info,
} from 'lucide-react';
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
import type { RevenueSimulationData } from '@/hooks/useRevenueSimulation';

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

  // Data hooks (same pattern as FinancialDashboard)
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

  const generateReport = async () => {
    setGenerating(true);
    try {
      const financialData = {
        projectName,
        commodityType,
        // Revenue & Margins
        fatturatoTotale: summary.totalRevenue,
        margineReseller: summary.resellerMargin,
        margineLordo: summary.grossMargin,
        margineLordoPerc: summary.grossMarginPercent,
        margineNetto: summary.netMargin,
        margineNettoPerc: summary.netMarginPercent,
        margineContributivo: summary.contributionMargin,
        margineContributivoPerc: summary.contributionMarginPercent,
        // Costs
        costiOperativi: summary.operationalCosts,
        costiCommerciali: summary.costiCommercialiSimulati,
        costiPassanti: summary.passthroughCosts,
        costiPerTipo: summary.costsByType,
        // Clients
        clientiAttivi: summary.clientiAttivi,
        contrattiTotali: summary.contrattiTotali,
        // Cash Flow
        incassato: summary.totalIncassato,
        insoluti: summary.totalInsoluti,
        investimentoIniziale: cashFlowData.investimentoIniziale,
        saldoFinale: cashFlowData.saldoFinale,
        mesePrimoPositivo: cashFlowData.mesePrimoPositivo,
        massimaEsposizione: cashFlowData.massimaEsposizione,
        meseEsposizioneMassima: cashFlowData.meseEsposizioneMassima,
        // Simulation params
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
        // Sales channels
        canaliVendita: salesChannels.filter(c => c.is_active).map(c => ({
          nome: c.channel_name,
          tipo: c.channel_type,
          commissione: c.commission_amount,
          tipoCommissione: c.commission_type,
          quotaContratti: c.contract_share,
          tassoAttivazione: c.activation_rate,
        })),
        // ROI
        roi: cashFlowData.investimentoIniziale > 0
          ? ((cashFlowData.saldoFinale / cashFlowData.investimentoIniziale) * 100)
          : 0,
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
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <ClipboardCopy className="h-4 w-4" />}
              {copied ? 'Copiato' : 'Copia Report'}
            </Button>
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

      {/* Overview Dashboard (moved from Finanza > Panoramica) */}
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

      {/* AI Generated Report */}
      {report && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Report Direzionale — {projectName}
                </CardTitle>
                <CardDescription>
                  Analisi strategica generata automaticamente dai dati del progetto
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Generato il {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReportContent content={report} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Simple markdown-like renderer for the report
function ReportContent({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-2 border-b pb-1">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-1">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
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
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="text-primary font-bold text-sm min-w-[1.5rem]">{num}.</span>
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
  // Handle **bold** patterns
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
