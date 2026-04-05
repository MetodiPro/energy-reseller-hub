import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, TrendingDown } from 'lucide-react';
import { useProjectFinancials, ProjectCost } from '@/hooks/useProjectFinancials';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useCashFlowAnalysis } from '@/hooks/useCashFlowAnalysis';
import { useExportFinancialPDF } from '@/hooks/useExportFinancialPDF';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { CostTemplateSelector } from '@/components/financial/CostTemplateSelector';
import { CostTabsView } from '@/components/financial/CostTabsView';
import { CostEditDialog } from '@/components/financial/CostEditDialog';

interface CostsPageProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

export const CostsPage = ({ projectId, projectName, commodityType }: CostsPageProps) => {
  const { costs, revenues, categories, loading, summary: costSummary, addCost, deleteCost, updateCost, refetch } = useProjectFinancials(projectId);
  const revenueSimulation = useRevenueSimulation(projectId);
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const { channels: salesChannels, getChannelBreakdown, calculateCommissionCosts, loading: channelsLoading } = useSalesChannels(projectId);
  const sharedChannelsData = { channels: salesChannels, calculateCommissionCosts, loading: channelsLoading };
  const { cashFlowData } = useCashFlowAnalysis(projectId, { simulationData: sharedSimData, salesChannelsData: sharedChannelsData, sharedEngine: engineResult });
  const summary = useFinancialSummary(costSummary, simulationSummary, cashFlowData);
  const { exportToPDF } = useExportFinancialPDF();

  const [editingCost, setEditingCost] = useState<ProjectCost | null>(null);
  const [showCostDialog, setShowCostDialog] = useState(false);

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

  const handleTemplateApplied = () => refetch();
  const handleExportPDF = () => exportToPDF(projectName, costs, revenues, summary);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="h-6 w-6" />
            Gestione Costi
          </h2>
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
