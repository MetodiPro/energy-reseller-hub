import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, TrendingDown } from 'lucide-react';
import { useProjectFinancials, ProjectCost } from '@/hooks/useProjectFinancials';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useExportFinancialPDF } from '@/hooks/useExportFinancialPDF';
import { CostTemplateSelector } from '@/components/financial/CostTemplateSelector';
import { CostTabsView } from '@/components/financial/CostTabsView';
import { CostEditDialog } from '@/components/financial/CostEditDialog';
import { StartupCostsSummary } from '@/components/financial/StartupCostsSummary';

interface CostsPageProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

export const CostsPage = ({ projectId, projectName, commodityType }: CostsPageProps) => {
  const { costs, categories, loading, addCost, deleteCost, updateCost, refetch } = useProjectFinancials(projectId);
  const { channels: salesChannels } = useSalesChannels(projectId);
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
  const handleExportPDF = () => exportToPDF(projectName, filteredCosts);
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
            Costi Generali
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
        activeChannelNames={salesChannels.filter(c => c.is_active && c.contract_share > 0).map(c => c.channel_name)}
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