import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building2, Info, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MonthlyCostBreakdown } from '@/hooks/useSimulationSummary';

interface WholesalerCostsSummaryProps {
  costoEnergiaTotale: number;
  costoGestionePodTotale: number;
  clientiAttiviFinale: number;
  passthroughTotals?: {
    dispacciamento: number;
    trasporto: number;
    oneriSistema: number;
    accise: number;
  };
  costiMensili?: MonthlyCostBreakdown[];
  params?: {
    punPerKwh?: number;
    spreadGrossistaPerKwh?: number;
    gestionePodPerPod?: number;
    dispacciamentoPerKwh?: number;
    trasportoQuotaFissaAnno?: number;
    trasportoQuotaEnergiaKwh?: number;
    trasportoQuotaPotenzaKwAnno?: number;
    potenzaImpegnataKw?: number;
    oneriAsosKwh?: number;
    oneriArimKwh?: number;
    acciseKwh?: number;
    avgMonthlyConsumption?: number;
  };
}

const fmt = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

const fmt0 = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

type DetailKey = 'energia' | 'pod' | 'dispacciamento' | 'trasporto' | 'oneri' | 'accise' | null;

function CostRow({
  label,
  sublabel,
  value,
  color = 'text-destructive',
  bold = false,
  detailKey,
  onShowDetail,
}: {
  label: string;
  sublabel?: string;
  value: number;
  color?: string;
  bold?: boolean;
  detailKey?: DetailKey;
  onShowDetail?: (key: DetailKey) => void;
}) {
  const clickable = detailKey && onShowDetail;
  return (
    <div
      className={`flex justify-between items-center py-1.5 ${bold ? 'font-bold' : ''} ${clickable ? 'cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2 transition-colors group' : ''}`}
      onClick={clickable ? () => onShowDetail(detailKey) : undefined}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {sublabel && <span className="text-xs text-muted-foreground">({sublabel})</span>}
        {clickable && <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </span>
      <span className={`font-mono ${color}`}>{fmt(value)}</span>
    </div>
  );
}

export const WholesalerCostsSummary = ({
  costoEnergiaTotale,
  costoGestionePodTotale,
  clientiAttiviFinale,
  passthroughTotals,
  costiMensili,
  params,
}: WholesalerCostsSummaryProps) => {
  const [activeDetail, setActiveDetail] = useState<DetailKey>(null);

  const totalePassanti = passthroughTotals
    ? passthroughTotals.dispacciamento + passthroughTotals.trasporto + passthroughTotals.oneriSistema + passthroughTotals.accise
    : 0;

  const totaleGrossista = costoEnergiaTotale + costoGestionePodTotale;

  // Build detail content for each cost line
  const getDetailContent = (key: DetailKey) => {
    if (!key) return null;

    const monthlyData = costiMensili || [];
    const p = params || {};

    switch (key) {
      case 'energia':
        return {
          title: 'Dettaglio Costo Energia Acquistata',
          description: 'PUN + Spread Grossista × kWh consumati dai clienti attivi ogni mese',
          formula: `Costo Energia = Σ (clienti attivi × consumo medio mensile × (PUN + Spread Grossista))`,
          params: [
            { label: 'PUN', value: `${(p.punPerKwh ?? 0).toFixed(4)} €/kWh` },
            { label: 'Spread Grossista', value: `${(p.spreadGrossistaPerKwh ?? 0).toFixed(4)} €/kWh` },
            { label: 'Costo Acquisto', value: `${((p.punPerKwh ?? 0) + (p.spreadGrossistaPerKwh ?? 0)).toFixed(4)} €/kWh` },
            { label: 'Consumo medio', value: `${p.avgMonthlyConsumption ?? 0} kWh/mese/cliente` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.costoEnergia, clients: m.clientiAttivi })),
          total: costoEnergiaTotale,
        };
      case 'pod':
        return {
          title: 'Dettaglio Gestione POD',
          description: 'Fee fissa per ogni punto di fornitura attivo',
          formula: `Costo POD = Σ (clienti attivi × fee POD mensile)`,
          params: [
            { label: 'Fee POD', value: `${(p.gestionePodPerPod ?? 0).toFixed(2)} €/POD/mese` },
            { label: 'Clienti Attivi (fine periodo)', value: `${clientiAttiviFinale}` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.costoPod, clients: m.clientiAttivi })),
          total: costoGestionePodTotale,
        };
      case 'dispacciamento':
        return {
          title: 'Dettaglio Dispacciamento',
          description: 'Corrispettivo versato a Terna/GME per il servizio di dispacciamento',
          formula: `Dispacciamento = Σ (clienti attivi × consumo medio × tariffa dispacciamento)`,
          params: [
            { label: 'Tariffa dispacciamento', value: `${(p.dispacciamentoPerKwh ?? 0).toFixed(4)} €/kWh` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.dispacciamento, clients: m.clientiAttivi })),
          total: passthroughTotals?.dispacciamento ?? 0,
        };
      case 'trasporto':
        return {
          title: 'Dettaglio Trasporto e Distribuzione',
          description: 'Costi versati al Distributore Locale (DSO) per il trasporto dell\'energia',
          formula: `Trasporto = Σ (quota fissa annua/12 + quota energia × kWh + quota potenza × kW/12) × clienti`,
          params: [
            { label: 'Quota fissa', value: `${(p.trasportoQuotaFissaAnno ?? 0).toFixed(2)} €/anno/cliente` },
            { label: 'Quota energia', value: `${(p.trasportoQuotaEnergiaKwh ?? 0).toFixed(4)} €/kWh` },
            { label: 'Quota potenza', value: `${(p.trasportoQuotaPotenzaKwAnno ?? 0).toFixed(2)} €/kW/anno` },
            { label: 'Potenza impegnata', value: `${p.potenzaImpegnataKw ?? 0} kW` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.trasporto, clients: m.clientiAttivi })),
          total: passthroughTotals?.trasporto ?? 0,
        };
      case 'oneri':
        return {
          title: 'Dettaglio Oneri di Sistema',
          description: 'Componenti ASOS e ARIM versati a CSEA/ARERA',
          formula: `Oneri = Σ (clienti attivi × consumo medio × (ASOS + ARIM))`,
          params: [
            { label: 'ASOS', value: `${(p.oneriAsosKwh ?? 0).toFixed(4)} €/kWh` },
            { label: 'ARIM', value: `${(p.oneriArimKwh ?? 0).toFixed(4)} €/kWh` },
            { label: 'Totale Oneri', value: `${((p.oneriAsosKwh ?? 0) + (p.oneriArimKwh ?? 0)).toFixed(4)} €/kWh` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.oneriSistema, clients: m.clientiAttivi })),
          total: passthroughTotals?.oneriSistema ?? 0,
        };
      case 'accise':
        return {
          title: 'Dettaglio Accise',
          description: 'Imposta erariale sull\'energia versata all\'Agenzia delle Dogane',
          formula: `Accise = Σ (clienti attivi × consumo medio × aliquota accise)`,
          params: [
            { label: 'Aliquota accise', value: `${(p.acciseKwh ?? 0).toFixed(4)} €/kWh` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.accise, clients: m.clientiAttivi })),
          total: passthroughTotals?.accise ?? 0,
        };
    }
  };

  const detail = getDetailContent(activeDetail);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Riepilogo Costi Grossista (14 mesi cumulativi)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Calcolati mese per mese sui clienti attivi progressivi. Clicca su ogni voce per il dettaglio del calcolo.
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Costi netti reseller */}
          <CostRow label="Energia Acquistata" sublabel="PUN + Spread Grossista" value={costoEnergiaTotale} detailKey="energia" onShowDetail={setActiveDetail} />
          <CostRow label="Gestione POD" value={costoGestionePodTotale} detailKey="pod" onShowDetail={setActiveDetail} />
          <Separator className="my-2" />
          <CostRow label="Totale Costi Grossista (14 mesi)" value={totaleGrossista} bold />

          {passthroughTotals && (
            <>
              <Separator className="my-4" />
              <div className="mb-2">
                <h4 className="font-semibold text-sm">Costi Passanti in Fattura (14 mesi)</h4>
                <p className="text-xs text-muted-foreground">
                  Incassati dal cliente e girati ai rispettivi destinatari. Non impattano il margine.
                </p>
              </div>
              <CostRow label="Dispacciamento" sublabel="Terna/GME" value={passthroughTotals.dispacciamento} color="text-amber-600" detailKey="dispacciamento" onShowDetail={setActiveDetail} />
              <CostRow label="Trasporto e Distribuzione" sublabel="Distributore" value={passthroughTotals.trasporto} color="text-amber-600" detailKey="trasporto" onShowDetail={setActiveDetail} />
              <CostRow label="Oneri di Sistema" sublabel="CSEA/ARERA" value={passthroughTotals.oneriSistema} color="text-amber-600" detailKey="oneri" onShowDetail={setActiveDetail} />
              <CostRow label="Accise" sublabel="Agenzia Dogane" value={passthroughTotals.accise} color="text-amber-600" detailKey="accise" onShowDetail={setActiveDetail} />
              <Separator className="my-2" />
              <CostRow label="Totale Passanti (14 mesi)" value={totalePassanti} color="text-amber-600" bold />
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!activeDetail} onOpenChange={(open) => !open && setActiveDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>{detail.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Formula */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Formula</p>
                  <p className="font-mono text-sm">{detail.formula}</p>
                </div>

                {/* Parameters */}
                <div>
                  <p className="text-sm font-semibold mb-2">Parametri utilizzati</p>
                  <div className="grid grid-cols-2 gap-2">
                    {detail.params.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm border-b py-1">
                        <span className="text-muted-foreground">{p.label}</span>
                        <span className="font-mono font-medium">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly breakdown */}
                {detail.monthly.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Dettaglio mensile</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-1.5 text-left font-medium">Mese</th>
                            <th className="py-1.5 text-right font-medium">Clienti Attivi</th>
                            <th className="py-1.5 text-right font-medium">Importo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.monthly.map((m, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-1.5">{m.label}</td>
                              <td className="py-1.5 text-right font-mono">{m.clients}</td>
                              <td className="py-1.5 text-right font-mono">{fmt(m.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold border-t-2">
                            <td className="py-2" colSpan={2}>Totale 14 mesi</td>
                            <td className="py-2 text-right font-mono">{fmt(detail.total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
