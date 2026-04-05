import { Truck, ShieldCheck, Receipt } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useStepCosts } from '@/hooks/useStepCosts';
import { WholesalerCostsConfig } from '@/components/financial/WholesalerCostsConfig';
import { WholesalerCostsSummary } from '@/components/financial/WholesalerCostsSummary';
import { WholesalerGuaranteeSection } from '@/components/financial/WholesalerGuaranteeSection';
import { WholesalerConsumptionSection } from '@/components/financial/WholesalerConsumptionSection';
import { WholesalerGuideSection } from '@/components/financial/WholesalerGuideSection';
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

  // Legge il deposito cauzionale versato al grossista dalla Fase 4 del processo.
  const { getCostAmount } = useStepCosts(projectId);
  const depositoVersatoFase4 = getCostAmount('step-4-2', 'deposito-cauzionale');

  const params = revenueSimulation.data?.params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Grossista (Udd)
          </h2>
          <p className="text-muted-foreground mt-1">{projectName} — Configurazione costi grossista, garanzie finanziarie e pagamento consumi</p>
        </div>
      </div>

      {/* Configurazione parametri grossista */}
      <WholesalerCostsConfig
        config={{
          punPerKwh: params?.punPerKwh ?? 0.12,
          punOverride: null,
          punAutoUpdate: false,
          spreadGrossistaPerKwh: params?.spreadGrossistaPerKwh ?? 0.008,
          gestionePodPerPod: params?.gestionePodPerPod ?? 2.50,
          depositoMesi: params?.depositoMesi ?? 2,
          depositoPercentualeAttivazione: params?.depositoPercentualeAttivazione ?? 100,
          depositoSvincoloPagamentiPerc: params?.depositoSvincoloPagamentiPerc ?? 0,
        }}
        consumoMedioMensile={params?.avgMonthlyConsumption ?? 150}
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

      {/* Riepilogo costi dettagliato (tabella esistente) */}
      <WholesalerCostsSummary
        costoEnergiaTotale={simulationSummary.costoEnergiaTotale}
        costoGestionePodTotale={simulationSummary.costoGestionePodTotale}
        clientiAttiviFinale={simulationSummary.clientiAttivi || 0}
        passthroughTotals={{
          dispacciamento: simulationSummary.costiMensili.reduce((s, m) => s + m.dispacciamento, 0),
          trasporto: simulationSummary.costiMensili.reduce((s, m) => s + m.trasporto, 0),
          oneriSistema: simulationSummary.costiMensili.reduce((s, m) => s + m.oneriSistema, 0),
          accise: simulationSummary.costiMensili.reduce((s, m) => s + m.accise, 0),
        }}
        costiMensili={simulationSummary.costiMensili}
        params={params}
      />

      {/* Tabs: Garanzie e Consumi Reali */}
      <Tabs defaultValue="garanzie" className="w-full">
        <TabsList>
          <TabsTrigger value="garanzie" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Garanzie Finanziarie
          </TabsTrigger>
          <TabsTrigger value="consumi" className="gap-2">
            <Receipt className="h-4 w-4" />
            Pagamento Consumi Reali
          </TabsTrigger>
        </TabsList>

        <TabsContent value="garanzie">
          <WholesalerGuaranteeSection
            depositiMensili={simulationSummary.depositiMensili}
            depositoIniziale={simulationSummary.depositoIniziale}
            depositoMassimo={simulationSummary.depositoMassimo}
            depositoFinale={simulationSummary.depositoFinale}
            depositoMesi={params?.depositoMesi ?? 2}
            depositoPercentualeAttivazione={params?.depositoPercentualeAttivazione ?? 100}
            depositoVersatoFase4={depositoVersatoFase4}
            perClientBreakdown={engineResult?.perClient ? {
              materiaEnergia: engineResult.perClient.materiaEnergia,
              trasporto: engineResult.perClient.trasporto,
              oneriSistema: engineResult.perClient.oneriSistema,
              costoGarantitoPerCliente: engineResult.perClient.costoGarantitoPerCliente,
            } : undefined}
            gestionePodPerPod={params?.gestionePodPerPod ?? 2.5}
          />
        </TabsContent>

        <TabsContent value="consumi">
          <WholesalerConsumptionSection
            depositiMensili={simulationSummary.depositiMensili}
            costoEnergiaTotale={simulationSummary.costoEnergiaTotale}
            costoGestionePodTotale={simulationSummary.costoGestionePodTotale}
            passthroughTotals={{
              dispacciamento: simulationSummary.costiMensili.reduce((s, m) => s + m.dispacciamento, 0),
              trasporto: simulationSummary.costiMensili.reduce((s, m) => s + m.trasporto, 0),
              oneriSistema: simulationSummary.costiMensili.reduce((s, m) => s + m.oneriSistema, 0),
            }}
            spreadGrossistaPerKwh={params?.spreadGrossistaPerKwh ?? 0.008}
            gestionePodPerPod={params?.gestionePodPerPod ?? 2.50}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
