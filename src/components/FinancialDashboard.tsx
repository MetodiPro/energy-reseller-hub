import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, PieChart, FileDown, Receipt,
  Calculator, Wallet, Zap, Settings2, Users, FileSpreadsheet,
} from 'lucide-react';
import { useProjectFinancials, ProjectCost } from '@/hooks/useProjectFinancials';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useCashFlowAnalysis } from '@/hooks/useCashFlowAnalysis';
import { useExportFinancialPDF } from '@/hooks/useExportFinancialPDF';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useEngineResult } from '@/hooks/useEngineResult';
import { buildTaxFlows } from '@/hooks/useTaxFlows';
import { exportGrossistaReport, exportFiscaleReport } from '@/lib/exportFinancialExcel';

import { CostTemplateSelector } from '@/components/financial/CostTemplateSelector';
import { PassthroughCostsCard } from '@/components/financial/PassthroughCostsCard';
import { WhatIfSimulator } from '@/components/financial/WhatIfSimulator';
import { MarginAnalysis } from '@/components/financial/MarginAnalysis';
import { ResellerRevenueSimulator } from '@/components/financial/ResellerRevenueSimulator';
import { CostTabsView } from '@/components/financial/CostTabsView';
import { WholesalerCostsConfig } from '@/components/financial/WholesalerCostsConfig';
import { CashFlowDashboard } from '@/components/financial/CashFlowDashboard';
import { SalesChannelsConfig } from '@/components/financial/SalesChannelsConfig';
import { TaxFlowsDashboard } from '@/components/financial/TaxFlowsDashboard';
import { SimulationParamsConfig } from '@/components/financial/SimulationParamsConfig';
import { OverviewTab } from '@/components/financial/OverviewTab';
import { CostEditDialog } from '@/components/financial/CostEditDialog';

interface FinancialDashboardProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

export const FinancialDashboard = ({ projectId, projectName, commodityType }: FinancialDashboardProps) => {
  const navigate = useNavigate();
  // ─── Data hooks ───
  const { costs, revenues, categories, loading, summary: costSummary, addCost, addRevenue, deleteCost, deleteRevenue, updateCost, updateRevenue, refetch } = useProjectFinancials(projectId);
  const revenueSimulation = useRevenueSimulation(projectId);
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  // ─── Single engine execution shared across all consumers ───
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary, loading: simulationLoading } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const { channels: salesChannels, getChannelBreakdown, calculateCommissionCosts, loading: channelsLoading, refetch: refetchChannels } = useSalesChannels(projectId);
  const sharedChannelsData = { channels: salesChannels, calculateCommissionCosts, loading: channelsLoading };
  const { cashFlowData, loading: cashFlowLoading } = useCashFlowAnalysis(projectId, { simulationData: sharedSimData, salesChannelsData: sharedChannelsData, sharedEngine: engineResult });
  const { exportToPDF } = useExportFinancialPDF();

  // ─── Derived summary ───
  const summary = useFinancialSummary(costSummary, simulationSummary, cashFlowData);

  // ─── UI state ───
  const [activeTab, setActiveTab] = useState('hypotheses');
  const [editingCost, setEditingCost] = useState<ProjectCost | null>(null);
  const [showCostDialog, setShowCostDialog] = useState(false);

  // ─── Commodity filtering ───
  const filteredCosts = useMemo(() => {
    return costs.filter(cost => {
      const costName = cost.name.toLowerCase();
      const commodityFilter = cost.commodity_filter;
      if (commodityFilter) {
        if (commodityType === 'solo-luce' && commodityFilter === 'gas') return false;
        if (commodityType === 'solo-gas' && commodityFilter === 'luce') return false;
      }
      const gasPatterns = ['gas', 'smc', 'evg', 'metano'];
      const lucePatterns = ['energia elettrica', 'kwh', 'eve'];
      const isGasRelated = gasPatterns.some(p => costName.includes(p)) && !costName.includes('energia');
      const isLuceRelated = lucePatterns.some(p => costName.includes(p));
      if (commodityType === 'solo-luce' && isGasRelated && !isLuceRelated) return false;
      if (commodityType === 'solo-gas' && isLuceRelated && !isGasRelated) return false;
      return true;
    });
  }, [costs, commodityType]);

  // ─── Handlers ───
  const handleExportPDF = () => exportToPDF(projectName, costs, revenues, summary);
  const handleExportGrossista = useCallback(() => {
    if (!engineResult) return;
    exportGrossistaReport(projectName, engineResult, revenueSimulation.data.params);
  }, [projectName, engineResult, revenueSimulation.data.params]);
  const handleExportFiscale = useCallback(() => {
    if (!engineResult) return;
    const taxFlows = buildTaxFlows(engineResult, revenueSimulation.data.params.ivaPaymentRegime);
    exportFiscaleReport(projectName, engineResult, taxFlows, revenueSimulation.data.params);
  }, [projectName, engineResult, revenueSimulation.data.params]);
  const handleTemplateApplied = () => refetch();
  const handleUsePunLive = useCallback((punPerKwh: number) => {
    revenueSimulation.updateParams('punPerKwh', punPerKwh);
    setTimeout(() => revenueSimulation.saveSimulation(), 500);
  }, [revenueSimulation]);
  const handleNavigateToTariffs = useCallback(() => {
    navigate('/app/tariffs');
  }, [navigate]);
  const handleCostSubmit = async (costData: any, isEdit: boolean, editId?: string) => {
    if (isEdit && editId) {
      await updateCost(editId, costData);
    } else {
      await addCost(costData as any);
    }
    setEditingCost(null);
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
          <h2 className="text-2xl font-bold">Dashboard Finanziaria</h2>
          <p className="text-muted-foreground">{projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          <CostTemplateSelector projectId={projectId} onTemplateApplied={handleTemplateApplied} />
          <Button onClick={handleExportGrossista} variant="outline" className="gap-2" disabled={!engineResult}>
            <FileSpreadsheet className="h-4 w-4" />
            Report Grossista
          </Button>
          <Button onClick={handleExportFiscale} variant="outline" className="gap-2" disabled={!engineResult}>
            <FileSpreadsheet className="h-4 w-4" />
            Report Fiscale
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Esporta PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="hypotheses" className="flex items-center gap-2"><Settings2 className="h-4 w-4" />Ipotesi</TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2"><PieChart className="h-4 w-4" />Panoramica</TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2"><TrendingDown className="h-4 w-4" />Costi</TabsTrigger>
          <TabsTrigger value="revenues" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Ricavi</TabsTrigger>
          <TabsTrigger value="margins" className="flex items-center gap-2"><Calculator className="h-4 w-4" />Margini</TabsTrigger>
          <TabsTrigger value="liquidity" className="flex items-center gap-2"><Wallet className="h-4 w-4" />Liquidità</TabsTrigger>
          <TabsTrigger value="taxflows" className="flex items-center gap-2"><Receipt className="h-4 w-4" />Flussi Fiscali</TabsTrigger>
        </TabsList>

        {/* ─── Ipotesi Operative ─── */}
        <TabsContent value="hypotheses" className="space-y-6">
          <SimulationParamsConfig projectId={projectId} simulationHook={revenueSimulation} commodityType={commodityType} />
          <SalesChannelsConfig projectId={projectId} onChannelChange={refetchChannels} />
          <WholesalerCostsConfig
            config={{
              punPerKwh: revenueSimulation.data?.params?.punPerKwh || 0.12,
              punOverride: null,
              punAutoUpdate: true,
              spreadGrossistaPerKwh: revenueSimulation.data?.params?.spreadGrossistaPerKwh ?? 0.008,
              gestionePodPerPod: revenueSimulation.data?.params?.gestionePodPerPod ?? 2.50,
              depositoMesi: revenueSimulation.data?.params?.depositoMesi ?? 3,
              depositoPercentualeAttivazione: revenueSimulation.data?.params?.depositoPercentualeAttivazione ?? 85,
            }}
            consumoMedioMensile={revenueSimulation.data?.params?.avgMonthlyConsumption || 200}
            onConfigChange={(updates) => {
              if (updates.spreadGrossistaPerKwh !== undefined) revenueSimulation.updateParams('spreadGrossistaPerKwh', updates.spreadGrossistaPerKwh);
              if (updates.punPerKwh !== undefined) revenueSimulation.updateParams('punPerKwh', updates.punPerKwh);
              if (updates.gestionePodPerPod !== undefined) revenueSimulation.updateParams('gestionePodPerPod', updates.gestionePodPerPod);
              if (updates.depositoMesi !== undefined) revenueSimulation.updateParams('depositoMesi', updates.depositoMesi);
              if (updates.depositoPercentualeAttivazione !== undefined) revenueSimulation.updateParams('depositoPercentualeAttivazione', updates.depositoPercentualeAttivazione);
              setTimeout(() => revenueSimulation.saveSimulation(), 500);
            }}
            costoEnergiaTotale={simulationSummary.costoEnergiaTotale}
            costoGestionePodTotale={simulationSummary.costoGestionePodTotale}
            clientiAttiviFinale={summary.clientiAttivi || 0}
            passthroughTotals={{
              dispacciamento: simulationSummary.costiMensili.reduce((s, m) => s + m.dispacciamento, 0),
              trasporto: simulationSummary.costiMensili.reduce((s, m) => s + m.trasporto, 0),
              oneriSistema: simulationSummary.costiMensili.reduce((s, m) => s + m.oneriSistema, 0),
              accise: simulationSummary.costiMensili.reduce((s, m) => s + m.accise, 0),
            }}
          />
        </TabsContent>

        {/* ─── Panoramica ─── */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            summary={summary}
            simulationSummary={simulationSummary}
            cashFlowData={cashFlowData}
            cashFlowLoading={cashFlowLoading}
            salesChannels={salesChannels}
            getChannelBreakdown={getChannelBreakdown}
            simulationData={revenueSimulation.data}
            onUsePunLive={handleUsePunLive}
            onNavigateToTariffs={handleNavigateToTariffs}
          />
        </TabsContent>

        {/* ─── Costi ─── */}
        <TabsContent value="costs" className="space-y-6">
          <CostTabsView
            costs={filteredCosts}
            categories={categories}
            commodityType={commodityType || null}
            onEdit={(cost) => { setEditingCost(cost); setShowCostDialog(true); }}
            onDelete={async (id) => { if (confirm('Sei sicuro di voler eliminare questo costo?')) await deleteCost(id); }}
            onAdd={() => { setEditingCost(null); setShowCostDialog(true); }}
            simulatedPassthrough={{
              costoEnergiaTotale: simulationSummary.costoEnergiaTotale,
              costoGestionePodTotale: simulationSummary.costoGestionePodTotale,
              totalPassanti: simulationSummary.totalPassanti,
              clientiAttivi: simulationSummary.clientiAttivi,
              consumoMedioMensile: revenueSimulation.data?.params?.avgMonthlyConsumption || 200,
              punPerKwh: revenueSimulation.data?.params?.punPerKwh || 0.12,
              spreadGrossistaPerKwh: revenueSimulation.data?.params?.spreadGrossistaPerKwh ?? 0.008,
              spreadResellerPerKwh: revenueSimulation.data?.params?.spreadPerKwh || 0.015,
              gestionePodPerPod: revenueSimulation.data?.params?.gestionePodPerPod || 2.50,
              dispacciamentoPerKwh: revenueSimulation.data?.params?.dispacciamentoPerKwh || 0.01,
              trasportoQuotaFissaAnno: revenueSimulation.data?.params?.trasportoQuotaFissaAnno || 23,
              trasportoQuotaPotenzaKwAnno: revenueSimulation.data?.params?.trasportoQuotaPotenzaKwAnno || 22,
              trasportoQuotaEnergiaKwh: revenueSimulation.data?.params?.trasportoQuotaEnergiaKwh || 0.008,
              potenzaImpegnataKw: revenueSimulation.data?.params?.potenzaImpegnataKw || 3,
              oneriAsosKwh: revenueSimulation.data?.params?.oneriAsosKwh || 0.025,
              oneriArimKwh: revenueSimulation.data?.params?.oneriArimKwh || 0.007,
              acciseKwh: revenueSimulation.data?.params?.acciseKwh || 0.0227,
              ivaPercent: revenueSimulation.data?.params?.ivaPercent || 10,
              monthlyBreakdown: simulationSummary.costiMensili,
            }}
            activeChannelNames={salesChannels.filter(c => c.is_active && c.contract_share > 0).map(c => c.channel_name)}
            simulatedCommercial={cashFlowData.hasData ? {
              totaleCostiCommerciali: cashFlowData.totaleCostiCommerciali,
              monthlyBreakdown: cashFlowData.monthlyData.map(m => ({
                month: m.month,
                monthLabel: m.monthLabel,
                contrattiNuovi: m.contrattiNuovi,
                clientiAttivati: m.month >= 2 ? Math.round((m.month - 2 < 12 ? (revenueSimulation.data?.monthlyContracts?.[m.month - 2] ?? 0) : 0) * ((revenueSimulation.data?.params?.activationRate ?? 85) / 100)) : 0,
                costiCommerciali: m.costiCommerciali,
              })),
              channelBreakdown: getChannelBreakdown(simulationSummary.contrattiTotali).map(ch => ({
                channel_name: ch.channel_name,
                commission_amount: ch.commission_amount,
                commission_type: ch.commission_type as 'per_contract' | 'per_activation',
                contracts: ch.contracts,
                activations: ch.activations,
                cost: ch.cost,
              })),
            } : undefined}
          />
        </TabsContent>

        {/* ─── Ricavi ─── */}
        <TabsContent value="revenues">
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />Modello Ricavi Reseller Energia
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                <p>Il <strong>fatturato</strong> di un reseller è dato dalla somma delle bollette emesse ai clienti finali. Solo 3 componenti della fattura sono controllabili dal reseller:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>CCV</strong> - Componente Commercializzazione e Vendita (€/mese fisso)</li>
                  <li><strong>Spread</strong> - Ricarico variabile su PUN/PSV (€/kWh o €/Smc)</li>
                  <li><strong>Altro</strong> - Servizi aggiuntivi opzionali</li>
                </ul>
                <p className="text-xs mt-2 text-blue-600 dark:text-blue-500">Tutte le altre componenti (energia, trasporto, distribuzione, oneri) sono passanti verso il grossista/distributore.</p>
              </div>
            </div>
            <ResellerRevenueSimulator projectId={projectId} simulationHook={revenueSimulation} />
          </div>
        </TabsContent>

        {/* ─── Margini ─── */}
        <TabsContent value="margins" className="space-y-6">
          <MarginAnalysis summary={summary} />
          <WhatIfSimulator summary={summary} channelBreakdown={getChannelBreakdown(simulationSummary.contrattiTotali || 0)} />
        </TabsContent>

        {/* ─── Liquidità ─── */}
        <TabsContent value="liquidity" className="space-y-6">
          <CashFlowDashboard cashFlowData={cashFlowData} loading={cashFlowLoading} projectId={projectId} projectName={projectName} />
        </TabsContent>

        {/* ─── Flussi Fiscali ─── */}
        <TabsContent value="taxflows" className="space-y-6">
          <TaxFlowsDashboard projectId={projectId} simulationData={sharedSimData} onUpdateParams={revenueSimulation.updateParams} onSaveSimulation={revenueSimulation.saveSimulation} />
        </TabsContent>
      </Tabs>

      {/* Cost Add/Edit Dialog */}
      <CostEditDialog
        open={showCostDialog}
        onOpenChange={(open) => { setShowCostDialog(open); if (!open) setEditingCost(null); }}
        editingCost={editingCost}
        categories={categories}
        projectId={projectId}
        onSubmit={handleCostSubmit}
      />
    </div>
  );
};
