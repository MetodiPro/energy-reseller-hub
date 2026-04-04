import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Zap, 
  Truck, 
  Receipt,
  Info,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// PUN is now manual — no auto-fetch
import { fetchAreraTariffs } from '@/lib/api/areraTariffs';
import type { RevenueSimulationParams } from '@/hooks/useRevenueSimulation';

interface InvoiceComponentsInputProps {
  params: RevenueSimulationParams;
  onUpdate: (key: keyof RevenueSimulationParams, value: number | string) => void;
}

const formatCurrencyDecimal = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
};

export const InvoiceComponentsInput = ({ params, onUpdate }: InvoiceComponentsInputProps) => {
  const { toast } = useToast();
  const [loadingPun, setLoadingPun] = useState(false);
  const [punSource, setPunSource] = useState<string | null>(null);
  const [punDate, setPunDate] = useState<string | null>(null);
  const [loadingArera, setLoadingArera] = useState(false);
  const [areraSource, setAreraSource] = useState<string | null>(null);
  const [areraDate, setAreraDate] = useState<string | null>(null);

  // Calcola costo mensile componenti passanti per singolo cliente
  const monthlyPassthrough = {
    energia: (params.punPerKwh + params.dispacciamentoPerKwh) * params.avgMonthlyConsumption,
    trasporto: (params.trasportoQuotaFissaAnno / 12) + 
               (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) +
               (params.trasportoQuotaEnergiaKwh * params.avgMonthlyConsumption),
    oneri: (params.oneriAsosKwh + params.oneriArimKwh) * params.avgMonthlyConsumption,
    accise: params.acciseKwh * params.avgMonthlyConsumption,
  };
  
  const imponibile = monthlyPassthrough.energia + monthlyPassthrough.trasporto + 
                     monthlyPassthrough.oneri + monthlyPassthrough.accise +
                     params.ccvMonthly + (params.spreadPerKwh * params.avgMonthlyConsumption) + 
                     params.otherServicesMonthly;
  
  const iva = imponibile * (params.ivaPercent / 100);
  const totaleFattura = imponibile + iva;

  const handleFetchPun = async () => {
    setLoadingPun(true);
    try {
      const response = await fetchCurrentPunPrice();
      
      if (response.success && response.data) {
        onUpdate('punPerKwh', response.data.averagePriceKwh);
        setPunSource(response.data.source);
        setPunDate(response.data.date);
        
        toast({
          title: 'PUN Aggiornato',
          description: (
            <div className="space-y-1">
              <p>Prezzo medio: {response.data.averagePrice.toFixed(2)} €/MWh</p>
              <p className="text-xs text-muted-foreground">
                Min: {response.data.minPrice.toFixed(2)} - Max: {response.data.maxPrice.toFixed(2)} €/MWh
              </p>
              <p className="text-xs text-muted-foreground">Fonte: {response.data.source}</p>
            </div>
          ),
        });
        
        if (response.warning) {
          toast({
            title: 'Avviso',
            description: response.warning,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching PUN:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile recuperare il prezzo PUN',
        variant: 'destructive',
      });
    } finally {
      setLoadingPun(false);
    }
  };

  const handleFetchArera = async () => {
    setLoadingArera(true);
    try {
      const response = await fetchAreraTariffs(params.clientType);
      
      if (response.success && response.data) {
        // Aggiorna tutte le tariffe ARERA
        onUpdate('trasportoQuotaFissaAnno', response.data.trasporto.quotaFissaAnno);
        onUpdate('trasportoQuotaPotenzaKwAnno', response.data.trasporto.quotaPotenzaKwAnno);
        onUpdate('trasportoQuotaEnergiaKwh', response.data.trasporto.quotaEnergiaKwh);
        onUpdate('oneriAsosKwh', response.data.oneri.asosKwh);
        onUpdate('oneriArimKwh', response.data.oneri.arimKwh);
        const accisaCorretta = params.clientType === 'domestico'
          ? response.data.accise?.domesticoKwh ?? response.data.acciseApplicate
          : response.data.accise?.altriUsiKwh ?? response.data.acciseApplicate;
        onUpdate('acciseKwh', accisaCorretta);
        onUpdate('ivaPercent', response.data.ivaPercent);
        
        setAreraSource(`Delibera ${response.data.delibera}`);
        setAreraDate(`${response.data.quarter} ${response.data.year}`);
        
        toast({
          title: 'Tariffe ARERA Aggiornate',
          description: (
            <div className="space-y-1">
              <p>Trimestre: {response.data.quarter} {response.data.year}</p>
              <p className="text-xs text-muted-foreground">
                Trasporto: €{response.data.trasporto.quotaFissaAnno}/anno + €{response.data.trasporto.quotaEnergiaKwh.toFixed(4)}/kWh
              </p>
              <p className="text-xs text-muted-foreground">
                Oneri: ASOS €{response.data.oneri.asosKwh.toFixed(4)}/kWh + ARIM €{response.data.oneri.arimKwh.toFixed(4)}/kWh
              </p>
              <p className="text-xs text-muted-foreground">Fonte: Delibera {response.data.delibera}</p>
            </div>
          ),
        });
        
        if (response.warning) {
          toast({
            title: 'Avviso',
            description: response.warning,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching ARERA tariffs:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile recuperare le tariffe ARERA',
        variant: 'destructive',
      });
    } finally {
      setLoadingArera(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Componenti Fattura Cliente
        </CardTitle>
        <CardDescription>
          Parametri per il calcolo della fattura completa al cliente finale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipologia Cliente */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <Label>Tipologia Cliente</Label>
          </div>
          <Select 
            value={params.clientType} 
            onValueChange={async (v) => {
              const clientType = v as 'domestico' | 'business' | 'pmi';
              onUpdate('clientType', clientType);
              const ivaAuto = clientType === 'domestico' ? 10 : 22;
              onUpdate('ivaPercent', ivaAuto);
              try {
                const res = await fetchAreraTariffs(clientType);
                if (res.success && res.data) {
                  onUpdate('acciseKwh', res.data.acciseApplicate);
                  toast({
                    title: 'Parametri aggiornati',
                    description: `Clienti ${clientType}: IVA ${ivaAuto}%, accisa ${res.data.acciseApplicate.toFixed(4)} €/kWh`,
                  });
                  return;
                }
              } catch {
                const accisaFallback = clientType === 'domestico' ? 0.0227 : 0.0125;
                onUpdate('acciseKwh', accisaFallback);
              }
              toast({
                title: 'Parametri aggiornati',
                description: `Clienti ${clientType}: IVA ${ivaAuto}%, accisa ${clientType === 'domestico' ? '0.0227' : '0.0125'} €/kWh`,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="domestico">Domestico (IVA 10%)</SelectItem>
              <SelectItem value="pmi">PMI (IVA 22%)</SelectItem>
              <SelectItem value="business">Business (IVA 22%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Materia Energia */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            Materia Energia
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs">PUN (€/kWh)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>
                      <p>Prezzo Unico Nazionale - costo materia prima energia</p>
                      <p className="text-xs text-muted-foreground">Clicca "Aggiorna" per recuperare il valore attuale dal GME</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-1">
                <Input
                  type="number"
                  step="0.001"
                  className="h-8"
                  value={params.punPerKwh}
                  onChange={(e) => onUpdate('punPerKwh', parseFloat(e.target.value) || 0)}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={handleFetchPun}
                        disabled={loadingPun}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingPun ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Recupera PUN attuale dal GME</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {punSource && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {punSource.includes('GME') ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                  )}
                  <span>{punDate}</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs">Dispacciamento (€/kWh)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>
                      <p>Costo bilanciamento rete</p>
                      <p className="text-xs text-muted-foreground">Tipico: 0.008-0.012 €/kWh</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                step="0.001"
                className="h-8"
                value={params.dispacciamentoPerKwh}
                onChange={(e) => onUpdate('dispacciamentoPerKwh', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Costo energia: {formatCurrencyDecimal(monthlyPassthrough.energia)}/mese/cliente
          </p>
        </div>

        <Separator />

        {/* Trasporto e Distribuzione */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-blue-500" />
              Trasporto e Distribuzione
            </h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleFetchArera}
                    disabled={loadingArera}
                  >
                    <Download className={`h-3 w-3 ${loadingArera ? 'animate-spin' : ''}`} />
                    Aggiorna ARERA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recupera tariffe ufficiali ARERA per trasporto, oneri e accise</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {areraSource && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {areraSource.includes('ARERA') ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              <span>{areraSource} - {areraDate}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Quota fissa (€/anno)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-8"
                value={params.trasportoQuotaFissaAnno}
                onChange={(e) => onUpdate('trasportoQuotaFissaAnno', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quota potenza (€/kW/anno)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-8"
                value={params.trasportoQuotaPotenzaKwAnno}
                onChange={(e) => onUpdate('trasportoQuotaPotenzaKwAnno', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quota energia (€/kWh)</Label>
              <Input
                type="number"
                step="0.001"
                className="h-8"
                value={params.trasportoQuotaEnergiaKwh}
                onChange={(e) => onUpdate('trasportoQuotaEnergiaKwh', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Potenza impegnata (kW)</Label>
              <Input
                type="number"
                step="0.1"
                className="h-8"
                value={params.potenzaImpegnataKw}
                onChange={(e) => onUpdate('potenzaImpegnataKw', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Costo trasporto: {formatCurrencyDecimal(monthlyPassthrough.trasporto)}/mese/cliente
          </p>
        </div>

        <Separator />

        {/* Oneri di Sistema */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4 text-purple-500" />
            Oneri di Sistema
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs">ASOS (€/kWh)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>
                      <p>Sostegno alle energie rinnovabili</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                step="0.001"
                className="h-8"
                value={params.oneriAsosKwh}
                onChange={(e) => onUpdate('oneriAsosKwh', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs">ARIM (€/kWh)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>
                      <p>Altri oneri rimanenti</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                step="0.001"
                className="h-8"
                value={params.oneriArimKwh}
                onChange={(e) => onUpdate('oneriArimKwh', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Costo oneri: {formatCurrencyDecimal(monthlyPassthrough.oneri)}/mese/cliente
          </p>
        </div>

        <Separator />

        {/* Imposte */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4 text-red-500" />
            Imposte
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs">Accise (€/kWh)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>
                      <p>Domestico: 0.0227 €/kWh (esenti primi 150 kWh/mese)</p>
                      <p className="text-xs text-muted-foreground">Business: variabile</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                step="0.0001"
                className="h-8"
                value={params.acciseKwh}
                onChange={(e) => onUpdate('acciseKwh', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">IVA (%) <span className="text-muted-foreground font-normal">— auto da tipo cliente</span></Label>
              <Input
                type="number"
                step="1"
                className="h-8 bg-muted cursor-not-allowed font-mono"
                value={params.ivaPercent}
                readOnly
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Accise: {formatCurrencyDecimal(monthlyPassthrough.accise)}/mese/cliente
          </p>
        </div>

        <Separator />

        {/* Riepilogo Fattura Cliente */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-lg space-y-2">
          <p className="text-sm font-medium">Fattura Mensile per Cliente</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Materia energia:</span>
            <span className="text-right">{formatCurrencyDecimal(monthlyPassthrough.energia)}</span>
            
            <span className="text-muted-foreground">Trasporto:</span>
            <span className="text-right">{formatCurrencyDecimal(monthlyPassthrough.trasporto)}</span>
            
            <span className="text-muted-foreground">Oneri sistema:</span>
            <span className="text-right">{formatCurrencyDecimal(monthlyPassthrough.oneri)}</span>
            
            <span className="text-muted-foreground">Accise:</span>
            <span className="text-right">{formatCurrencyDecimal(monthlyPassthrough.accise)}</span>
            
            <span className="text-muted-foreground">Commerciale (reseller):</span>
            <span className="text-right font-medium text-green-600">
              {formatCurrencyDecimal(params.ccvMonthly + (params.spreadPerKwh * params.avgMonthlyConsumption) + params.otherServicesMonthly)}
            </span>
            
            <div className="col-span-2 border-t my-1"></div>
            
            <span className="text-muted-foreground">Imponibile:</span>
            <span className="text-right">{formatCurrencyDecimal(imponibile)}</span>
            
            <span className="text-muted-foreground">IVA {params.ivaPercent}%:</span>
            <span className="text-right">{formatCurrencyDecimal(iva)}</span>
            
            <span className="font-medium">TOTALE FATTURA:</span>
            <span className="text-right font-bold text-lg">{formatCurrencyDecimal(totaleFattura)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
