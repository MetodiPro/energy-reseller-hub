import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { SimulationParamsConfig } from '@/components/financial/SimulationParamsConfig';
import { SalesChannelsConfig } from '@/components/financial/SalesChannelsConfig';
import { WholesalerCostsConfig } from '@/components/financial/WholesalerCostsConfig';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { fetchAreraTariffs, type AreraTariffData } from '@/lib/api/areraTariffs';
import { toast } from 'sonner';

interface HypothesesPageProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
  sharedRevenueSimulation?: ReturnType<typeof useRevenueSimulation>;
}

export const HypothesesPage = ({ projectId, projectName, commodityType, sharedRevenueSimulation }: HypothesesPageProps) => {
  const ownRevenueSimulation = useRevenueSimulation(sharedRevenueSimulation ? null : projectId);
  const revenueSimulation = sharedRevenueSimulation || ownRevenueSimulation;
  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary: simulationSummary } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const { channels: salesChannels, calculateCommissionCosts, loading: channelsLoading, refetch: refetchChannels } = useSalesChannels(projectId);
  const navigate = useNavigate();

  // --- ARERA tariff mismatch detection ---
  const [tariffeMismatch, setTariffeMismatch] = useState(false);
  const [areraDati, setAreraDati] = useState<AreraTariffData | null>(null);

  useEffect(() => {
    if (revenueSimulation.loading) return;
    fetchAreraTariffs().then(res => {
      const d = res.data;
      const p = revenueSimulation.data.params;
      const mismatch =
        Math.abs(d.trasporto.quotaFissaAnno - (p.trasportoQuotaFissaAnno ?? 0)) > 0.01 ||
        Math.abs(d.trasporto.quotaEnergiaKwh - (p.trasportoQuotaEnergiaKwh ?? 0)) > 0.00001 ||
        Math.abs(d.oneri.asosKwh - (p.oneriAsosKwh ?? 0)) > 0.00001 ||
        Math.abs(d.oneri.arimKwh - (p.oneriArimKwh ?? 0)) > 0.00001;
      setTariffeMismatch(mismatch);
      setAreraDati(d);
    }).catch(() => {});
  }, [revenueSimulation.data.params, revenueSimulation.loading]);

  const handleSyncTariffs = () => {
    if (!areraDati) return;
    const p = revenueSimulation;
    const clientType = p.data.params.clientType;
    p.updateParams('trasportoQuotaFissaAnno', areraDati.trasporto.quotaFissaAnno);
    p.updateParams('trasportoQuotaPotenzaKwAnno', areraDati.trasporto.quotaPotenzaKwAnno);
    p.updateParams('trasportoQuotaEnergiaKwh', areraDati.trasporto.quotaEnergiaKwh);
    p.updateParams('oneriAsosKwh', areraDati.oneri.asosKwh);
    p.updateParams('oneriArimKwh', areraDati.oneri.arimKwh);
    p.updateParams('acciseKwh', clientType === 'domestico'
      ? areraDati.accise.domesticoKwh
      : areraDati.accise.altriUsiKwh);
    setTimeout(() => {
      p.saveSimulation();
      setTariffeMismatch(false);
      toast.success('Tariffe ARERA sincronizzate nel simulatore');
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          Ipotesi Operative
        </h2>
        <p className="text-muted-foreground">{projectName} — Parametri di simulazione e configurazione canali</p>
      </div>

      {tariffeMismatch && areraDati && (
        <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-300">Tariffe ARERA non sincronizzate</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            <p className="mb-3">Le tariffe di mercato globali sono state aggiornate (delibera {areraDati.delibera}) ma i parametri di questo simulatore non sono ancora stati allineati.</p>
            <Button size="sm" onClick={handleSyncTariffs} className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Sincronizza ora
            </Button>
          </AlertDescription>
        </Alert>
      )}

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