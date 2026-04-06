import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, TrendingDown } from 'lucide-react';
import { useProjectFinancials, ProjectCost } from '@/hooks/useProjectFinancials';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useExportFinancialPDF } from '@/hooks/useExportFinancialPDF';
import { useStepCosts } from '@/hooks/useStepCosts';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { CostTemplateSelector } from '@/components/financial/CostTemplateSelector';
import { CostTabsView } from '@/components/financial/CostTabsView';
import { CostEditDialog } from '@/components/financial/CostEditDialog';
import { StartupCostsSummary } from '@/components/financial/StartupCostsSummary';
import { CostDynamicsTimeline } from '@/components/financial/CostDynamicsTimeline';
import { CommercialCostsPerChannel } from '@/components/financial/CommercialCostsPerChannel';
import { supabase } from '@/integrations/supabase/client';

interface CostsPageProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
  plannedStartDate?: string | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export const CostsPage = ({ projectId, projectName, commodityType, plannedStartDate }: CostsPageProps) => {
  const { costs, categories, loading, addCost, deleteCost, updateCost, refetch } = useProjectFinancials(projectId);
  const { channels: salesChannels } = useSalesChannels(projectId);
  const { exportToPDF } = useExportFinancialPDF();
  const { getCostAmount } = useStepCosts(projectId);
  const revenueSimulation = useRevenueSimulation(projectId);
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const activeChannels = salesChannels.filter(c => c.is_active && c.contract_share > 0);

  const [editingCost, setEditingCost] = useState<ProjectCost | null>(null);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [stepDates, setStepDates] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!projectId) return;
    const fetchStepDates = async () => {
      const { data } = await supabase
        .from('step_progress')
        .select('step_id, planned_end_date')
        .eq('project_id', projectId);
      if (data) {
        const map: Record<string, string | null> = {};
        data.forEach((row: any) => {
          map[row.step_id] = row.planned_end_date || null;
        });
        setStepDates(map);
      }
    };
    fetchStepDates();
  }, [projectId]);

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

  const totalRecurring = useMemo(() => {
    return filteredCosts
      .filter(c => c.is_recurring)
      .reduce((sum, c) => sum + c.amount * c.quantity, 0);
  }, [filteredCosts]);

  const totalOneTime = useMemo(() => {
    return filteredCosts
      .filter(c => !c.is_recurring)
      .reduce((sum, c) => sum + c.amount * c.quantity, 0);
  }, [filteredCosts]);

  const handleTemplateApplied = () => refetch();
  const handleExportPDF = () => exportToPDF(projectName, filteredCosts, { getCostAmount, commodityType, plannedStartDate, stepDates });
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
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <TrendingDown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Costi Generali</h2>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
        </div>
        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      {/* Startup Costs Summary */}
      <StartupCostsSummary projectId={projectId} projectName={projectName} commodityType={commodityType} />

      {/* Commercial Costs per Channel */}
      {engineResult && activeChannels.length > 0 && (
        <CommercialCostsPerChannel
          engineResult={engineResult}
          salesChannels={salesChannels}
        />
      )}

      {/* Operational Costs Tabs */}
      <CostTabsView
        costs={filteredCosts}
        categories={categories}
        commodityType={commodityType || null}
        plannedStartDate={plannedStartDate || null}
        onEdit={(cost) => { setEditingCost(cost); setShowCostDialog(true); }}
        onDelete={async (id) => { if (confirm('Sei sicuro di voler eliminare questo costo?')) await deleteCost(id); }}
        onAdd={() => { setEditingCost(null); setShowCostDialog(true); }}
        activeChannelNames={salesChannels.filter(c => c.is_active && c.contract_share > 0).map(c => c.channel_name)}
        headerActions={<CostTemplateSelector projectId={projectId} onTemplateApplied={handleTemplateApplied} />}
      />

      {/* Monthly Cost Dynamics */}
      <CostDynamicsTimeline projectId={projectId} costs={filteredCosts} commodityType={commodityType} plannedStartDate={plannedStartDate} />

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
