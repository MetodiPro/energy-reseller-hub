import { Truck } from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { WholesalerCostsConfig } from '@/components/financial/WholesalerCostsConfig';
import { useNavigate } from 'react-router-dom';

interface WholesalerPageProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
  sharedRevenueSimulation?: ReturnType<typeof useRevenueSimulation>;
}

export const WholesalerPage = ({ projectId, projectName, commodityType, sharedRevenueSimulation }: WholesalerPageProps) => {
  const ownRevenueSimulation = useRevenueSimulation(sharedRevenueSimulation ? null : projectId);
  const revenueSimulation = sharedRevenueSimulation || ownRevenueSimulation;
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          Grossista (Udd)
        </h2>
        <p className="text-muted-foreground">{projectName} — Configurazione costi grossista e struttura acquisto energia</p>
      </div>

      <WholesalerCostsConfig
        config={{
          punPerKwh: revenueSimulation.data?.params?.punPerKwh || 0.12,
          punOverride: null,
          punAutoUpdate: true,
          spreadGrossistaPerKwh: revenueSimulation.data?.params?.spreadGrossistaPerKwh ?? 0.008,
          gestionePodPerPod: revenueSimulation.data?.params?.gestionePodPerPod ?? 2.50,
          depositoMesi: revenueSimulation.data?.params?.depositoMesi ?? 3,
          depositoPercentualeAttivazione: revenueSimulation.data?.params?.depositoPercentualeAttivazione ?? 85,
          depositoSvincoloPagamentiPerc: revenueSimulation.data?.params?.depositoSvincoloPagamentiPerc ?? 50,
        }}
        consumoMedioMensile={revenueSimulation.data?.params?.avgMonthlyConsumption || 200}
        onConfigChange={(updates) => {
          if (updates.spreadGrossistaPerKwh !== undefined) revenueSimulation.updateParams('spreadGrossistaPerKwh', updates.spreadGrossistaPerKwh);
          if (updates.punPerKwh !== undefined) revenueSimulation.updateParams('punPerKwh', updates.punPerKwh);
          if (updates.gestionePodPerPod !== undefined) revenueSimulation.updateParams('gestionePodPerPod', updates.gestionePodPerPod);
          if (updates.depositoMesi !== undefined) revenueSimulation.updateParams('depositoMesi', updates.depositoMesi);
          if (updates.depositoPercentualeAttivazione !== undefined) revenueSimulation.updateParams('depositoPercentualeAttivazione', updates.depositoPercentualeAttivazione);
          if (updates.depositoSvincoloPagamentiPerc !== undefined) revenueSimulation.updateParams('depositoSvincoloPagamentiPerc', updates.depositoSvincoloPagamentiPerc);
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
        onNavigateToTariffs={() => navigate('/app/tariffs')}
      />
    </div>
  );
};
