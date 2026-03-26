import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Zap, 
  Calculator,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WholesalerConfig {
  punPerKwh: number;              // PUN in €/kWh
  punOverride: number | null;
  punAutoUpdate: boolean;
  spreadGrossistaPerKwh: number;  // Spread pagato al grossista (COSTO)
  gestionePodPerPod: number;
  depositoMesi: number;           // Mesi di fatturato stimato per deposito cauzionale
  depositoPercentualeAttivazione: number; // % fatturato stimato applicata al deposito
  depositoSvincoloPagamentiPerc?: number; // % pagamenti consumi svincolati dalla garanzia
}

interface PassthroughTotals {
  dispacciamento: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
}

interface WholesalerCostsConfigProps {
  config: WholesalerConfig;
  consumoMedioMensile: number;
  onConfigChange: (updates: Partial<WholesalerConfig>) => void;
  // Totali cumulativi calcolati dal simulatore (14 mesi)
  costoEnergiaTotale: number;
  costoGestionePodTotale: number;
  clientiAttiviFinale: number;
  // Costi passanti fattura
  passthroughTotals?: PassthroughTotals;
  onNavigateToTariffs?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
};

export const WholesalerCostsConfig = ({
  config,
  consumoMedioMensile,
  onConfigChange,
  costoEnergiaTotale,
  costoGestionePodTotale,
  clientiAttiviFinale,
  passthroughTotals,
  onNavigateToTariffs,
}: WholesalerCostsConfigProps) => {
  // Calculate derived values - tutto in €/kWh
  const punEffective = config.punPerKwh;
  // Costo per il reseller = PUN + spread grossista
  const costoAcquistoPerKwh = punEffective + config.spreadGrossistaPerKwh;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Configurazione Costi Grossista
        </CardTitle>
        <CardDescription>
          Definisci i parametri commerciali con il grossista (UDD)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PUN Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Costo Energia dal Grossista
            </h4>
            <p className="text-xs text-muted-foreground">
              Il PUN si aggiorna dalla sezione <span className="font-medium">Tariffe di Mercato</span>
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                PUN (€/kWh)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Prezzo Unico Nazionale — aggiornabile da Tariffe di Mercato</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                step="0.0001"
                value={config.punPerKwh}
                readOnly
                className="font-mono bg-muted cursor-not-allowed"
              />
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Aggiornabile da <span className="font-medium">Tariffe di Mercato</span> o Componenti Fattura
                </p>
                {onNavigateToTariffs && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={onNavigateToTariffs}>
                    <ExternalLink className="h-3 w-3" />
                    Vai a Tariffe
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Spread Grossista (€/kWh)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Spread applicato dal grossista al reseller (è un COSTO)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                step="0.001"
                value={config.spreadGrossistaPerKwh}
                onChange={(e) => onConfigChange({ spreadGrossistaPerKwh: parseFloat(e.target.value) || 0 })}
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Costo Acquisto (€/kWh)</Label>
              <div className="h-10 px-3 py-2 bg-red-100 dark:bg-red-950 rounded-md flex items-center font-mono font-semibold text-red-700 dark:text-red-300">
                €{costoAcquistoPerKwh.toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground">
                PUN + Spread Grossista
              </p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Gestione POD */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-500" />
            Gestione POD (Punti di Fornitura)
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Fee Gestione POD (€/POD/mese)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Costo fisso applicato dal grossista per ogni punto di fornitura attivo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                step="0.10"
                value={config.gestionePodPerPod}
                onChange={(e) => onConfigChange({ gestionePodPerPod: parseFloat(e.target.value) || 0 })}
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Clienti Attivi (fine periodo)</Label>
              <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center justify-between">
                <span className="text-sm text-muted-foreground">POD attivi al 14° mese</span>
                <span className="font-mono font-semibold">{clientiAttiviFinale}</span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Depositi Cauzionali */}
        <div className="space-y-4">
           <h4 className="font-medium flex items-center gap-2">
             <Info className="h-4 w-4 text-purple-500" />
             Depositi Cauzionali / Garanzie Grossista
           </h4>
           <p className="text-xs text-muted-foreground">
             Copertura richiesta dal grossista per le componenti che anticipa per il reseller: 
             Materia Energia, Trasporto/Distribuzione e Oneri di Sistema. 
             Non include Accise e IVA (a carico diretto del reseller).
           </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Mesi di fatturato in garanzia
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Il grossista richiede un deposito pari a N mesi di fatturato stimato dei clienti attivi.
                      Ogni mese si versa solo il delta incrementale rispetto al deposito già versato.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                step="1"
                min="1"
                max="12"
                value={config.depositoMesi}
                onChange={(e) => onConfigChange({ depositoMesi: parseInt(e.target.value) || 3 })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                % applicata al deposito
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Percentuale del fatturato stimato effettivamente richiesta come deposito cauzionale.
                      Es: 85% significa che il deposito è calcolato sull'85% del fatturato stimato.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                value={config.depositoPercentualeAttivazione}
                onChange={(e) => onConfigChange({ depositoPercentualeAttivazione: parseFloat(e.target.value) || 85 })}
                className="font-mono"
              />
            </div>
          </div>
           <p className="text-xs text-muted-foreground">
             Deposito = POD in switching × (Materia Energia + Trasporto + Oneri + Fee POD) × {config.depositoMesi} mesi × {config.depositoPercentualeAttivazione}%
           </p>
           <p className="text-xs text-muted-foreground mt-1 italic">
             Esclusi: Accise (versate dal reseller alla dogana) e IVA (versata dal reseller all'erario).
             La garanzia è richiesta all'atto della richiesta di switching (mese successivo al contratto).
           </p>
           
           <Separator className="my-3" />
           
           <div className="space-y-2">
             <div className="flex items-center gap-2">
               <Label>Svincolo deposito da pagamenti</Label>
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                   </TooltipTrigger>
                   <TooltipContent className="max-w-xs">
                     Percentuale dei pagamenti mensili accumulati verso il grossista che vengono riconosciuti come riduzione della garanzia richiesta. 0% = deposito fisso (worst case per il cash flow). 50% = il grossista svincola progressivamente metà dei pagamenti ricevuti (scenario realistico). 100% = svincolo totale (scenario ottimistico, raro in pratica nei primi 12 mesi).
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
             </div>
             <div className="flex items-center gap-4">
               <input
                 type="range"
                 min="0"
                 max="100"
                 step="10"
                 value={config.depositoSvincoloPagamentiPerc ?? 50}
                 onChange={(e) => onConfigChange({ depositoSvincoloPagamentiPerc: parseInt(e.target.value) })}
                 className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-primary"
               />
               <span className="font-mono text-sm font-medium w-12 text-right">{config.depositoSvincoloPagamentiPerc ?? 50}%</span>
             </div>
             <p className="text-xs text-muted-foreground">
               0% = deposito fisso (modello conservativo) · 50% = scenario realistico · 100% = svincolo totale
             </p>
           </div>
         </div>
        
        <Separator />
        
        {/* Summary - TOTALI CUMULATIVI 14 mesi (calcolati progressivamente) */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <h4 className="font-semibold mb-3">Riepilogo Costi Grossista (14 mesi cumulativi)</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Calcolati mese per mese sui clienti attivi progressivi, non sul totale finale
          </p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Energia Acquistata (PUN + Spread Grossista)</span>
              <span className="font-mono text-red-600">{formatCurrencyFull(costoEnergiaTotale)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gestione POD</span>
              <span className="font-mono text-red-600">{formatCurrencyFull(costoGestionePodTotale)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold">
              <span>Totale Costi Grossista (14 mesi)</span>
              <span className="font-mono text-red-600">
                {formatCurrencyFull(costoEnergiaTotale + costoGestionePodTotale)}
              </span>
            </div>
          </div>

          {/* Costi passanti in fattura */}
          {passthroughTotals && (
            <>
              <Separator className="my-4" />
              <h4 className="font-semibold mb-3">Costi Passanti in Fattura (14 mesi cumulativi)</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Il reseller li incassa dal cliente e li gira ai rispettivi destinatari. Non impattano il margine.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Dispacciamento <span className="text-xs text-muted-foreground">(Terna/GME)</span></span>
                  <span className="font-mono text-amber-600">{formatCurrencyFull(passthroughTotals.dispacciamento)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Trasporto e Distribuzione <span className="text-xs text-muted-foreground">(Distributore)</span></span>
                  <span className="font-mono text-amber-600">{formatCurrencyFull(passthroughTotals.trasporto)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Oneri di Sistema <span className="text-xs text-muted-foreground">(CSEA/ARERA)</span></span>
                  <span className="font-mono text-amber-600">{formatCurrencyFull(passthroughTotals.oneriSistema)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accise <span className="text-xs text-muted-foreground">(Agenzia Dogane)</span></span>
                  <span className="font-mono text-amber-600">{formatCurrencyFull(passthroughTotals.accise)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Totale Passanti (14 mesi)</span>
                  <span className="font-mono text-amber-600">
                    {formatCurrencyFull(passthroughTotals.dispacciamento + passthroughTotals.trasporto + passthroughTotals.oneriSistema + passthroughTotals.accise)}
                  </span>
                </div>
              </div>

              {/* Costo netto vs partite di giro */}
              <Separator className="my-3" />
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-base">
                  <span>Costo netto reseller (energia + POD)</span>
                  <span className="font-mono text-destructive">
                    {formatCurrencyFull(costoEnergiaTotale + costoGestionePodTotale)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Questo è il vero costo del reseller: la differenza tra quanto incassa dallo spread e quanto paga al grossista.
                </p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Partite di giro (girate a DSO/ADM/CSEA)</span>
                  <span className="font-mono text-amber-600">
                    {formatCurrencyFull(
                      passthroughTotals.dispacciamento + passthroughTotals.trasporto +
                      passthroughTotals.oneriSistema + passthroughTotals.accise
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Importi incassati dai clienti e girati integralmente a terzi. Non impattano il margine ma richiedono gestione della liquidità.
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Info box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Perché i "Costi Passanti" in Panoramica sono diversi?
          </h5>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            La Panoramica mostra i <strong>Costi Passanti in fattura</strong>: ciò che il cliente paga e il reseller gira ai destinatari 
            (include PUN + dispacciamento come componente energia). 
            Qui invece vedi i <strong>Costi effettivi del reseller</strong>: ciò che paghi al grossista 
            (PUN + spread grossista, diverso dal dispacciamento) più i passanti da girare. 
            La differenza è dovuta al fatto che lo spread grossista ≠ dispacciamento e che i costi grossista 
            partono dal mese di attivazione (mese 3), mentre la fatturazione parte dal mese 4.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
