import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, FileDown, Receipt,
  Calculator, Wallet, Zap, FileSpreadsheet,
} from 'lucide-react';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useRevenueSimulation, type RevenueSimulationParams } from '@/hooks/useRevenueSimulation';
import { useCashFlowAnalysis } from '@/hooks/useCashFlowAnalysis';
import { useExportFinancialPDF } from '@/hooks/useExportFinancialPDF';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useEngineResult } from '@/hooks/useEngineResult';
import { buildTaxFlows } from '@/hooks/useTaxFlows';
import { exportGrossistaReport, exportFiscaleReport } from '@/lib/exportFinancialExcel';

import { WhatIfSimulator } from '@/components/financial/WhatIfSimulator';
import { MarginAnalysis } from '@/components/financial/MarginAnalysis';
import { ResellerRevenueSimulator } from '@/components/financial/ResellerRevenueSimulator';
import { CashFlowDashboard } from '@/components/financial/CashFlowDashboard';
import { TaxFlowsDashboard } from '@/components/financial/TaxFlowsDashboard';

interface FinancialDashboardProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

export const FinancialDashboard = ({ projectId, projectName, commodityType }: FinancialDashboardProps) => {
  const navigate = useNavigate();
  const { costs, revenues, loading, summary: costSummary } = useProjectFinancials(projectId);
  const revenueSimulation = useRevenueSimulation(projectId);
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const { channels: salesChannels, getChannelBreakdown, calculateCommissionCosts, loading: channelsLoading } = useSalesChannels(projectId);
  const sharedChannelsData = { channels: salesChannels, calculateCommissionCosts, loading: channelsLoading };
  const { cashFlowData, loading: cashFlowLoading } = useCashFlowAnalysis(projectId, { simulationData: sharedSimData, salesChannelsData: sharedChannelsData, sharedEngine: engineResult });
  const { exportToPDF } = useExportFinancialPDF();

  const summary = useFinancialSummary(costSummary, simulationSummary, cashFlowData);

  const [activeTab, setActiveTab] = useState('margins');

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
          <h2 className="text-2xl font-bold">Dashboard Finanziaria</h2>
          <p className="text-muted-foreground">{projectName}</p>
        </div>
        <div className="flex items-center gap-2">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="margins" className="flex items-center gap-2"><Calculator className="h-4 w-4" />Margini</TabsTrigger>
          <TabsTrigger value="liquidity" className="flex items-center gap-2"><Wallet className="h-4 w-4" />Liquidità</TabsTrigger>
          <TabsTrigger value="taxflows" className="flex items-center gap-2"><Receipt className="h-4 w-4" />Flussi Fiscali</TabsTrigger>
        </TabsList>

        <TabsContent value="margins" className="space-y-6">
          <MarginAnalysis summary={summary} />
          <WhatIfSimulator
            summary={summary}
            channelBreakdown={getChannelBreakdown(simulationSummary.contrattiTotali || 0)}
            simulationParams={revenueSimulation.data.params}
            onApplyToSimulator={(params) => {
              Object.entries(params).forEach(([key, value]) => {
                revenueSimulation.updateParams(key as keyof RevenueSimulationParams, value);
              });
              revenueSimulation.saveSimulation();
            }}
          />
        </TabsContent>

        <TabsContent value="liquidity" className="space-y-6">
          <CashFlowDashboard cashFlowData={cashFlowData} loading={cashFlowLoading} projectId={projectId} projectName={projectName} />
        </TabsContent>

        <TabsContent value="taxflows" className="space-y-6">
          <TaxFlowsDashboard projectId={projectId} simulationData={sharedSimData} onUpdateParams={revenueSimulation.updateParams} onSaveSimulation={revenueSimulation.saveSimulation} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
