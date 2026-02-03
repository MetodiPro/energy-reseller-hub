import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Loader2, 
  Building2, 
  Zap, 
  Calculator,
  Info,
} from 'lucide-react';
import { fetchCurrentPunPrice, PunPriceData } from '@/lib/api/punPrice';
import { useToast } from '@/hooks/use-toast';
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
}

interface WholesalerCostsConfigProps {
  config: WholesalerConfig;
  consumoMedioMensile: number;
  onConfigChange: (updates: Partial<WholesalerConfig>) => void;
  // Totali cumulativi calcolati dal simulatore (14 mesi)
  costoEnergiaTotale: number;
  costoGestionePodTotale: number;
  clientiAttiviFinale: number;
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
}: WholesalerCostsConfigProps) => {
  const { toast } = useToast();
  const [punData, setPunData] = useState<PunPriceData | null>(null);
  const [loadingPun, setLoadingPun] = useState(false);
  
  // Calculate derived values - tutto in €/kWh
  const punEffective = config.punOverride ?? config.punPerKwh;
  // Costo per il reseller = PUN + spread grossista
  const costoAcquistoPerKwh = punEffective + config.spreadGrossistaPerKwh;
  
  // Fetch PUN price
  const fetchPun = async () => {
    setLoadingPun(true);
    try {
      const result = await fetchCurrentPunPrice();
      if (result.success) {
        setPunData(result.data);
        if (config.punAutoUpdate && !config.punOverride) {
          // Salva in €/kWh direttamente
          onConfigChange({ punPerKwh: result.data.averagePriceKwh });
        }
        toast({
          title: 'PUN aggiornato',
          description: `Prezzo medio: €${result.data.averagePriceKwh.toFixed(4)}/kWh`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile recuperare il PUN',
        variant: 'destructive',
      });
    } finally {
      setLoadingPun(false);
    }
  };
  
  useEffect(() => {
    if (config.punAutoUpdate) {
      fetchPun();
    }
  }, []);
  
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
            <div className="flex items-center gap-2">
              <Switch
                checked={config.punAutoUpdate}
                onCheckedChange={(checked) => onConfigChange({ punAutoUpdate: checked })}
              />
              <Label className="text-sm">Auto-aggiorna PUN</Label>
            </div>
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
                      <p>Prezzo Unico Nazionale - media mensile GME</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={config.punOverride ?? config.punPerKwh}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    onConfigChange({ 
                      punOverride: value,
                      punAutoUpdate: false 
                    });
                  }}
                  className="font-mono"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={fetchPun}
                  disabled={loadingPun}
                >
                  {loadingPun ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {punData && (
                <p className="text-xs text-muted-foreground">
                  Ultimo aggiornamento: {punData.date} ({punData.source})
                </p>
              )}
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
        </div>
        
        {/* Info box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Nota sui costi progressivi
          </h5>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            I costi sono calcolati mese per mese in base ai clienti attivi in quel mese, 
            considerando attivazioni e switch-out. Il totale qui riportato è la somma cumulativa 
            su 14 mesi, non una proiezione basata sul numero finale di clienti.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
