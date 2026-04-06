import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

type DetailKey = 'energia_pun' | 'energia_spread' | 'pod' | 'dispacciamento' | 'trasporto' | 'oneri' | 'accise' | null;

export const WholesalerCostsSummary = ({
  costoEnergiaTotale,
  costoGestionePodTotale,
  clientiAttiviFinale,
  passthroughTotals,
  costiMensili,
  params,
}: WholesalerCostsSummaryProps) => {
  const [activeDetail, setActiveDetail] = useState<DetailKey>(null);

  const dispacciamentoTotale = passthroughTotals?.dispacciamento ?? 0;
  const totalePassanti = passthroughTotals
    ? passthroughTotals.trasporto + passthroughTotals.oneriSistema
    : 0;
  // accise escluse: pagate dal reseller direttamente ad ADM, non al grossista
  // dispacciamento incluso nei costi grossista: pagato al grossista in fattura

  // Split energia into PUN and Spread components
  const pun = params?.punPerKwh ?? 0;
  const spreadG = params?.spreadGrossistaPerKwh ?? 0;
  const totalRate = pun + spreadG;
  const punShare = totalRate > 0 ? pun / totalRate : 1;
  const spreadShare = totalRate > 0 ? spreadG / totalRate : 0;
  const costoEnergiaPun = costoEnergiaTotale * punShare;
  const costoEnergiaSpread = costoEnergiaTotale * spreadShare;

  const totaleGrossista = costoEnergiaTotale + costoGestionePodTotale + dispacciamentoTotale;

  const getDetailContent = (key: DetailKey) => {
    if (!key) return null;
    const monthlyData = costiMensili || [];
    const p = params || {};

    switch (key) {
      case 'energia_pun':
        return {
          title: 'Dettaglio Materia Prima Energia (PUN)',
          description: 'Prezzo Unico Nazionale × kWh acquistati dai clienti attivi ogni mese',
          formula: `Costo PUN = Σ (clienti attivi × consumo medio mensile × PUN)`,
          params: [
            { label: 'PUN', value: `${pun.toFixed(4)} €/kWh` },
            { label: 'Consumo medio', value: `${p.avgMonthlyConsumption ?? 0} kWh/mese/cliente` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.costoEnergia * punShare, clients: m.clientiAttivi, kwhAcquistati: m.clientiAttivi * (p.avgMonthlyConsumption ?? 0) })),
          total: costoEnergiaPun,
          showMwh: true,
        };
      case 'energia_spread':
        return {
          title: 'Dettaglio Spread Grossista',
          description: 'Ricarico applicato dal grossista sul prezzo PUN per ogni kWh acquistato',
          formula: `Costo Spread = Σ (clienti attivi × consumo medio mensile × Spread Grossista)`,
          params: [
            { label: 'Spread Grossista', value: `${spreadG.toFixed(4)} €/kWh` },
            { label: 'Consumo medio', value: `${p.avgMonthlyConsumption ?? 0} kWh/mese/cliente` },
          ],
          monthly: monthlyData.map(m => ({ label: m.monthLabel, value: m.costoEnergia * spreadShare, clients: m.clientiAttivi, kwhAcquistati: m.clientiAttivi * (p.avgMonthlyConsumption ?? 0) })),
          total: costoEnergiaSpread,
          showMwh: true,
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

  // Build table rows
  type CostRow = {
    key: DetailKey;
    label: string;
    sublabel?: string;
    value: number;
    isPassthrough?: boolean;
  };

  const grossistaRows: CostRow[] = [
    { key: 'energia_pun', label: 'Materia Prima (PUN)', sublabel: 'Prezzo Unico Nazionale', value: costoEnergiaPun },
    { key: 'energia_spread', label: 'Spread Grossista', sublabel: 'Ricarico sul PUN', value: costoEnergiaSpread },
    { key: 'pod', label: 'Gestione POD', value: costoGestionePodTotale },
  ];

  const passthroughRows: CostRow[] = passthroughTotals ? [
    { key: 'dispacciamento', label: 'Dispacciamento', sublabel: 'Terna/GME', value: passthroughTotals.dispacciamento, isPassthrough: true },
    { key: 'trasporto', label: 'Trasporto e Distribuzione', sublabel: 'Distributore', value: passthroughTotals.trasporto, isPassthrough: true },
    { key: 'oneri', label: 'Oneri di Sistema', sublabel: 'CSEA/ARERA', value: passthroughTotals.oneriSistema, isPassthrough: true },
  ] : [];
  // NOTA: Le accise NON appaiono qui — sono versate dal reseller direttamente
  // all'Agenzia delle Dogane e sono gestite nella sezione Flussi Fiscali.

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Riepilogo Costi Grossista (14 mesi cumulativi)
          </CardTitle>
          <CardDescription className="text-xs">
            Calcolati mese per mese sui clienti attivi progressivi. Clicca su ogni voce per il dettaglio del calcolo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Voce di Costo</th>
                  <th className="py-2 pr-3 font-medium">Destinatario</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 font-medium text-right">Importo (14 mesi)</th>
                </tr>
              </thead>
              <tbody>
                {/* Costi Grossista */}
                {grossistaRows.map(row => (
                  <tr
                    key={row.key}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveDetail(row.key)}
                  >
                    <td className="py-2 pr-3 font-medium text-primary underline decoration-dotted flex items-center gap-1">
                      {row.label}
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">Grossista</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive">
                        Costo netto
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-destructive">{fmt(row.value)}</td>
                  </tr>
                ))}
                {/* Subtotale Grossista */}
                <tr className="border-t-2 border-foreground/20 font-bold bg-muted/30">
                  <td className="py-2 pr-3" colSpan={3}>Totale Costi Grossista</td>
                  <td className="py-2 text-right font-mono text-destructive">{fmt(totaleGrossista)}</td>
                </tr>

                {/* Spacer */}
                {passthroughRows.length > 0 && (
                  <tr>
                    <td colSpan={4} className="py-1"></td>
                  </tr>
                )}

                {/* Costi Passanti */}
                {passthroughRows.map(row => (
                  <tr
                    key={row.key}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveDetail(row.key)}
                  >
                    <td className="py-2 pr-3 font-medium text-primary underline decoration-dotted">
                      {row.label}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.sublabel}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600">
                        Passante
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-amber-600">{fmt(row.value)}</td>
                  </tr>
                ))}

                {/* Subtotale Passanti */}
                {passthroughRows.length > 0 && (
                  <tr className="border-t-2 border-foreground/20 font-bold bg-muted/30">
                    <td className="py-2 pr-3" colSpan={3}>Totale Passanti (grossista)</td>
                    <td className="py-2 text-right font-mono text-amber-600">{fmt(totalePassanti)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sezione Accise separata */}
          {passthroughTotals && passthroughTotals.accise > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed border-foreground/20">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium" colSpan={4}>
                      Accise — Obbligo diretto del Reseller (non in fattura grossista)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveDetail('accise')}
                  >
                    <td className="py-2 pr-3 font-medium text-primary underline decoration-dotted">
                      Accise Energia
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">Agenzia delle Dogane (ADM)</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600">
                        Obbligo diretto
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-violet-600">{fmt(passthroughTotals.accise)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground italic mt-1.5 px-1">
                Le accise sono versate mensilmente dal reseller direttamente all'Agenzia delle Dogane. Non transitano nella fattura del grossista.
              </p>
            </div>
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
                            {detail.showMwh && <th className="py-1.5 text-right font-medium">MWh Acquistati</th>}
                            <th className="py-1.5 text-right font-medium">Importo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.monthly.map((m, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-1.5">{m.label}</td>
                              <td className="py-1.5 text-right font-mono">{m.clients}</td>
                              {detail.showMwh && (
                                <td className="py-1.5 text-right font-mono">
                                  {((m.kwhAcquistati ?? 0) / 1000).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </td>
                              )}
                              <td className="py-1.5 text-right font-mono">{fmt(m.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold border-t-2">
                            <td className="py-2" colSpan={detail.showMwh ? 3 : 2}>Totale 14 mesi</td>
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
