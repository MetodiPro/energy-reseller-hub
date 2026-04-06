import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useSimulationProducts } from '@/hooks/useSimulationProducts';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { CustomerBaseSection } from '@/components/financial/CustomerBaseSection';
import { CustomerBaseGuide } from '@/components/financial/CustomerBaseGuide';
import { Users } from 'lucide-react';

interface CustomerBasePageProps {
  projectId: string;
  sharedRevenueSimulation?: ReturnType<typeof useRevenueSimulation>;
}

export const CustomerBasePage = ({ projectId, sharedRevenueSimulation }: CustomerBasePageProps) => {
  const ownRevenueSimulation = useRevenueSimulation(projectId);
  const revenueSimulation = sharedRevenueSimulation || ownRevenueSimulation;

  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { multiProductResult, engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);

  if (!multiProductResult || multiProductResult.products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Configura prima i prodotti e la simulazione per visualizzare la Customer Base</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Evoluzione dei punti di fornitura e andamento switch-out per prodotto.
        </p>
      </div>

      <CustomerBaseSection
        multiProductResult={multiProductResult}
        totalActiveEnd={multiProductResult.aggregated.monthly[multiProductResult.aggregated.monthly.length - 1]?.customer?.clientiAttivi ?? simulationSummary.clientiAttivi}
      />

      <CustomerBaseGuide />
    </div>
  );
};
