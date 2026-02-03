import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Loader2, 
  Building2, 
  Zap, 
  Shield,
  Calculator,
  Info
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
  punPerMwh: number;
  punOverride: number | null;
  punAutoUpdate: boolean;
  spreadPerKwh: number;
  gestionePodPerPod: number;
  depositoMesi: 3 | 6;
  depositoPercentualeAttivazione: number;
}

interface WholesalerCostsConfigProps {
  config: WholesalerConfig;
  clientiAttivi: number;
  consumoMedioMensile: number;
  onConfigChange: (updates: Partial<WholesalerConfig>) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
};

export const WholesalerCostsConfig = ({
  config,
  clientiAttivi,
  consumoMedioMensile,
  onConfigChange,
}: WholesalerCostsConfigProps) => {
  const { toast } = useToast();
  const [punData, setPunData] = useState<PunPriceData | null>(null);
  const [loadingPun, setLoadingPun] = useState(false);
  
  // Calculate derived values
  const punEffective = config.punOverride ?? (punData?.averagePriceKwh ?? config.punPerMwh / 1000);
  const costoEnergiaPerKwh = punEffective + config.spreadPerKwh;
  const costoEnergiaMensile = clientiAttivi * consumoMedioMensile * costoEnergiaPerKwh;
  const costoGestionePodMensile = clientiAttivi * config.gestionePodPerPod;
  
  // Calculate security deposit
  const fatturatoMedioMensile = clientiAttivi * consumoMedioMensile * 0.25; // Prezzo vendita stimato
  const depositoCauzionale = fatturatoMedioMensile * config.depositoMesi;
  
  // Fetch PUN price
  const fetchPun = async () => {
    setLoadingPun(true);
    try {
      const result = await fetchCurrentPunPrice();
      if (result.success) {
        setPunData(result.data);
        if (config.punAutoUpdate && !config.punOverride) {
          onConfigChange({ punPerMwh: result.data.averagePrice });
        }
        toast({
          title: 'PUN aggiornato',
          description: `Prezzo medio: €${result.data.averagePrice.toFixed(2)}/MWh`,
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
              Prezzo Energia (PUN + Spread)
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
                PUN (€/MWh)
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
                  step="0.01"
                  value={config.punOverride ?? config.punPerMwh}
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
                Spread (€/kWh)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Margine applicato dal grossista sul PUN</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                step="0.001"
                value={config.spreadPerKwh}
                onChange={(e) => onConfigChange({ spreadPerKwh: parseFloat(e.target.value) || 0 })}
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Costo Totale (€/kWh)</Label>
              <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-mono font-semibold">
                €{costoEnergiaPerKwh.toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground">
                PUN + Spread
              </p>
            </div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Costo energia mensile stimato ({clientiAttivi} clienti × {consumoMedioMensile} kWh)
              </span>
              <span className="font-bold">{formatCurrency(costoEnergiaMensile)}</span>
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
              <Label>Costo Totale Gestione POD</Label>
              <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{clientiAttivi} POD attivi</span>
                <span className="font-mono font-semibold">{formatCurrency(costoGestionePodMensile)}/mese</span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Deposito Cauzionale */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            Deposito Cauzionale / Fidejussione
          </h4>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Periodo Copertura</Label>
              <Select
                value={String(config.depositoMesi)}
                onValueChange={(value) => onConfigChange({ depositoMesi: parseInt(value) as 3 | 6 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 mesi</SelectItem>
                  <SelectItem value="6">6 mesi</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Mesi di fatturato richiesti come garanzia
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Tasso Attivazione (%)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                value={config.depositoPercentualeAttivazione}
                onChange={(e) => onConfigChange({ depositoPercentualeAttivazione: parseFloat(e.target.value) || 85 })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                % contratti che diventano attivi
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Deposito Richiesto</Label>
              <div className="h-10 px-3 py-2 bg-green-50 dark:bg-green-950/20 rounded-md flex items-center">
                <span className="font-mono font-bold text-green-600">{formatCurrency(depositoCauzionale)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {config.depositoMesi} mesi × fatturato medio
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h5 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              📋 Come funziona il deposito cauzionale
            </h5>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Mese X: Invii Y contratti al grossista</li>
              <li>• Mese X+1: Il grossista invia Y-Z al SII (Z = scartati)</li>
              <li>• I POD attivati richiedono un deposito pari a {config.depositoMesi} mesi di fornitura</li>
              <li>• Il deposito si aggiorna mensilmente (nuovi + esistenti - switch-out)</li>
            </ul>
          </div>
        </div>
        
        <Separator />
        
        {/* Summary */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <h4 className="font-semibold mb-3">Riepilogo Costi Grossista Mensili</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Energia (PUN + Spread)</span>
              <span className="font-mono">{formatCurrency(costoEnergiaMensile)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gestione POD</span>
              <span className="font-mono">{formatCurrency(costoGestionePodMensile)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold">
              <span>Totale Mensile Grossista</span>
              <span className="font-mono text-primary">
                {formatCurrency(costoEnergiaMensile + costoGestionePodMensile)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>+ Deposito Cauzionale (una tantum)</span>
              <span className="font-mono">{formatCurrency(depositoCauzionale)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
