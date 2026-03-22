import { useCallback } from 'react';
import { Settings2 } from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { SimulationParamsConfig } from '@/components/financial/SimulationParamsConfig';
import { SalesChannelsConfig } from '@/components/financial/SalesChannelsConfig';
import { WholesalerCostsConfig } from '@/components/financial/WholesalerCostsConfig';

interface HypothesesPageProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
}

export const HypothesesPage = ({ projectId, projectName, commodityType }: HypothesesPageProps) => {
  const revenueSimulation = useRevenueSimulation(projectId);
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const { channels: salesChannels, calculateCommissionCosts, loading: channelsLoading, refetch: refetchChannels } = useSalesChannels(projectId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          Ipotesi Operative
        </h2>
        <p className="text-muted-foreground">{projectName} — Parametri di simulazione e configurazione canali</p>
      </div>

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
        clientiAttiviFinale={simulationSummary.clientiAttivi || 0}
        passthroughTotals={{
          dispacciamento: simulationSummary.costiMensili.reduce((s, m) => s + m.dispacciamento, 0),
          trasporto: simulationSummary.costiMensili.reduce((s, m) => s + m.trasporto, 0),
          oneriSistema: simulationSummary.costiMensili.reduce((s, m) => s + m.oneriSistema, 0),
          accise: simulationSummary.costiMensili.reduce((s, m) => s + m.accise, 0),
        }}
      />
    </div>
  );
};
