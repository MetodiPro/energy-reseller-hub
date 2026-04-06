import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Zap, Truck, Shield, Wallet,
  Users, DollarSign, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useEngineResult } from '@/hooks/useEngineResult';
import { useSimulationSummary } from '@/hooks/useSimulationSummary';
import { useStepCosts } from '@/hooks/useStepCosts';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { SimulationEngineResult } from '@/lib/simulationEngine';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

interface EsitiEconomiciPageProps {
  projectId: string;
  projectName: string;
  commodityType?: string | null;
  sharedRevenueSimulation?: ReturnType<typeof useRevenueSimulation>;
}

export const EsitiEconomiciPage = ({ projectId, projectName, commodityType, sharedRevenueSimulation }: EsitiEconomiciPageProps) => {
  const ownRevenueSimulation = useRevenueSimulation(sharedRevenueSimulation ? null : projectId);
  const revenueSimulation = sharedRevenueSimulation || ownRevenueSimulation;

  const sharedSimData = { data: revenueSimulation.data, loading: revenueSimulation.loading };
  const { engineResult } = useEngineResult(projectId, { simulationData: sharedSimData });
  const { summary } = useSimulationSummary(projectId, sharedSimData, engineResult);
  const { getGrandTotal, loading: costsLoading } = useStepCosts(projectId);
  const { channels, loading: channelsLoading } = useSalesChannels(projectId);
  const { costs: projectCosts, summary: costSummary, loading: projectCostsLoading } = useProjectFinancials(projectId);

  const data = useMemo(() => {
    if (!summary.hasData || !engineResult) return null;

    const { monthly } = engineResult;

    // 1. Fatturato Netto (imponibile = fatturato lordo - IVA)
    const fatturatoNetto = summary.totalFatturato - summary.totalIva;

    // 2. Costo Energia Grossista (PUN + spread grossista + dispacciamento)
    let costoEnergiaGrossista = 0;
    for (const m of monthly) {
      costoEnergiaGrossista += m.costoEnergia + m.dispacciamento;
    }

    // 3. Costi Passanti (trasporto + oneri sistema)
    let costiPassanti = 0;
    for (const m of monthly) {
      costiPassanti += m.trasportoTotale + m.oneriSistemaTotale;
    }

    // 4. Accise
    let accise = 0;
    for (const m of monthly) {
      accise += m.acciseTotale;
    }

    // 5. Fee gestione POD
    const feeGestionePod = summary.costoGestionePodTotale;

    // 6. Costi di avvio depurati dalla garanzia versata
    const costiAvvioLordi = getGrandTotal();
    const garanziaVersata = summary.depositoFinale;
    const costiAvvioNetti = costiAvvioLordi - garanziaVersata;

    // 7. Costi commerciali (provvigioni canali di vendita) - arrotondati come in CostsPage
    let costiCommerciali = 0;
    const activeChannels = channels.filter((c: any) => c.is_active && c.contract_share > 0);
    for (const m of monthly) {
      activeChannels.forEach((ch: any) => {
        const share = ch.contract_share / 100;
        const contratti = Math.round(m.customer.contrattiNuovi * share);
        const attivazioni = Math.round(m.customer.attivazioni * share);
        if (ch.commission_type === 'per_contract') {
          costiCommerciali += contratti * ch.commission_amount;
        } else {
          costiCommerciali += attivazioni * ch.commission_amount;
        }
      });
    }

    // 8. Costi Operativi (gestionali, commerciali, infrastruttura)
    const costiGestionali = costSummary.costsByType.direct;
    const costiCommercialiOp = costSummary.costsByType.commercial;
    const costiInfrastruttura = costSummary.costsByType.structural + costSummary.costsByType.indirect;
    const costiOperativiTotale = costiGestionali + costiCommercialiOp + costiInfrastruttura;

    // 9. Crediti non esigibili al mese 14 (insoluti)
    const creditiNonEsigibili = summary.totalInsoluti;

    // Totale uscite
    const totaleUscite = costoEnergiaGrossista + costiPassanti + accise + feeGestionePod + costiAvvioNetti + costiCommerciali + costiOperativiTotale + creditiNonEsigibili;

    // Risultato economico
    const risultatoEconomico = fatturatoNetto - totaleUscite;

    return {
      fatturatoNetto,
      costoEnergiaGrossista,
      costiPassanti,
      accise,
      feeGestionePod,
      costiAvvioLordi,
      garanziaVersata,
      costiAvvioNetti,
      costiCommerciali,
      costiGestionali,
      costiCommercialiOp,
      costiInfrastruttura,
      costiOperativiTotale,
      creditiNonEsigibili,
      totaleUscite,
      risultatoEconomico,
    };
  }, [summary, engineResult, channels, costSummary, getGrandTotal]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Esiti Economici</h1>
          <p className="text-muted-foreground mt-1">Riepilogo economico complessivo del progetto</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Configura le ipotesi operative e la simulazione per visualizzare gli esiti economici.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows: { label: string; value: number; icon: React.ReactNode; isSubItem?: boolean; isBold?: boolean; isNegative?: boolean; detail?: string }[] = [
    { label: 'Fatturato Netto (IVA esclusa)', value: data.fatturatoNetto, icon: <TrendingUp className="h-5 w-5 text-emerald-500" />, isBold: true },
    { label: 'Costo Energia Grossista', value: -data.costoEnergiaGrossista, icon: <Zap className="h-5 w-5 text-amber-500" />, isNegative: true },
    { label: 'Costi Passanti (Trasporto + Oneri)', value: -data.costiPassanti, icon: <Truck className="h-5 w-5 text-blue-500" />, isNegative: true },
    { label: 'Accise', value: -data.accise, icon: <Shield className="h-5 w-5 text-red-500" />, isNegative: true },
    { label: 'Fee Gestione POD', value: -data.feeGestionePod, icon: <Users className="h-5 w-5 text-purple-500" />, isNegative: true },
    { label: `Costi di Avvio (${formatCurrency(data.costiAvvioLordi)} − Garanzia ${formatCurrency(data.garanziaVersata)})`, value: -data.costiAvvioNetti, icon: <Wallet className="h-5 w-5 text-orange-500" />, isNegative: true },
    { label: 'Costi Commerciali (Provvigioni Canali)', value: -data.costiCommerciali, icon: <DollarSign className="h-5 w-5 text-pink-500" />, isNegative: true },
    { label: 'Costi Operativi', value: -data.costiOperativiTotale, icon: <TrendingDown className="h-5 w-5 text-slate-500" />, isNegative: true },
    { label: 'Gestionali', value: -data.costiGestionali, icon: <span className="w-5" />, isSubItem: true, isNegative: true },
    { label: 'Commerciali', value: -data.costiCommercialiOp, icon: <span className="w-5" />, isSubItem: true, isNegative: true },
    { label: 'Infrastruttura', value: -data.costiInfrastruttura, icon: <span className="w-5" />, isSubItem: true, isNegative: true },
    { label: 'Crediti Non Esigibili (Mese 14)', value: -data.creditiNonEsigibili, icon: <AlertTriangle className="h-5 w-5 text-destructive" />, isNegative: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Esiti Economici</h1>
        <p className="text-muted-foreground mt-1">
          Riepilogo economico complessivo — {projectName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Conto Economico di Sintesi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {rows.map((row, i) => (
            <div key={i}>
              {row.label === 'Costi Operativi' && <Separator className="my-2" />}
              {row.label === 'Crediti Non Esigibili (Mese 14)' && <Separator className="my-2" />}
              <div
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                  row.isSubItem ? 'pl-12 text-sm text-muted-foreground' : 'hover:bg-muted/50'
                } ${row.isBold ? 'font-semibold' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {!row.isSubItem && row.icon}
                  <span>{row.label}</span>
                </div>
                <span className={`font-mono text-sm ${
                  row.value > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                  row.value < 0 ? 'text-red-600 dark:text-red-400' :
                  'text-muted-foreground'
                } ${row.isBold ? 'text-base font-bold' : ''}`}>
                  {formatCurrency(row.value)}
                </span>
              </div>
            </div>
          ))}

          <Separator className="my-3" />

          {/* Risultato finale */}
          <div className="flex items-center justify-between py-4 px-3 rounded-xl bg-muted/60">
            <div className="flex items-center gap-3">
              {data.risultatoEconomico >= 0 ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              )}
              <span className="font-bold text-lg">Risultato Economico</span>
              <Badge variant={data.risultatoEconomico >= 0 ? 'default' : 'destructive'}>
                {data.risultatoEconomico >= 0 ? 'Utile' : 'Perdita'}
              </Badge>
            </div>
            <span className={`font-mono text-lg font-bold ${
              data.risultatoEconomico >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(data.risultatoEconomico)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EsitiEconomiciPage;
