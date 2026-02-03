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
  Info,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { fetchCurrentPunPrice, PunPriceData } from '@/lib/api/punPrice';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MonthlyDepositData } from '@/hooks/useSimulationSummary';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface WholesalerConfig {
  punPerKwh: number;              // PUN in €/kWh
  punOverride: number | null;
  punAutoUpdate: boolean;
  spreadGrossistaPerKwh: number;  // Spread pagato al grossista (COSTO)
  gestionePodPerPod: number;
  depositoMesi: 3 | 6;
  depositoPercentualeAttivazione: number;
}

interface WholesalerCostsConfigProps {
  config: WholesalerConfig;
  clientiAttivi: number;
  consumoMedioMensile: number;
  onConfigChange: (updates: Partial<WholesalerConfig>) => void;
  depositiMensili?: MonthlyDepositData[];
  depositoIniziale?: number;
  depositoFinale?: number;
  depositoMassimo?: number;
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
  clientiAttivi,
  consumoMedioMensile,
  onConfigChange,
  depositiMensili = [],
  depositoIniziale = 0,
  depositoFinale = 0,
  depositoMassimo = 0,
}: WholesalerCostsConfigProps) => {
  const { toast } = useToast();
  const [punData, setPunData] = useState<PunPriceData | null>(null);
  const [loadingPun, setLoadingPun] = useState(false);
  
  // Calculate derived values - tutto in €/kWh
  const punEffective = config.punOverride ?? config.punPerKwh;
  // Costo per il reseller = PUN + spread grossista
  const costoAcquistoPerKwh = punEffective + config.spreadGrossistaPerKwh;
  
  const costoEnergiaMensile = clientiAttivi * consumoMedioMensile * costoAcquistoPerKwh;
  const costoGestionePodMensile = clientiAttivi * config.gestionePodPerPod;
  
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
  
  // Chart data preparation
  const chartData = depositiMensili.map((d, index) => ({
    ...d,
    name: d.monthLabel,
    deposito: d.depositoRichiesto,
  }));
  
  const depositoDelta = depositoFinale - depositoIniziale;
  const depositoTrend = depositoDelta > 0 ? 'up' : depositoDelta < 0 ? 'down' : 'stable';
  
  return (
    <div className="space-y-6">
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
                <Label>Costo Totale Gestione POD</Label>
                <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{clientiAttivi} POD attivi</span>
                  <span className="font-mono font-semibold">{formatCurrencyFull(costoGestionePodMensile)}/mese</span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Deposito Cauzionale Config */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Deposito Cauzionale / Fidejussione
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Tasso Attivazione SII (%)</Label>
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
                  % contratti che superano il SII e diventano attivi
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Summary */}
          <div className="p-4 bg-primary/5 rounded-lg">
            <h4 className="font-semibold mb-3">Riepilogo Costi Grossista Mensili</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Energia (PUN + Spread Grossista)</span>
                <span className="font-mono text-red-600">{formatCurrencyFull(costoEnergiaMensile)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gestione POD</span>
                <span className="font-mono text-red-600">{formatCurrencyFull(costoGestionePodMensile)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Totale Costi Grossista Mensili</span>
                <span className="font-mono text-red-600">
                  {formatCurrencyFull(costoEnergiaMensile + costoGestionePodMensile)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Deposito Cauzionale Evolution Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Evoluzione Deposito Cauzionale
          </CardTitle>
          <CardDescription>
            Andamento del deposito/fidejussione richiesto in base alla base clienti attiva
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Deposito Iniziale</p>
              <p className="text-lg font-bold">{formatCurrency(depositoIniziale)}</p>
              <p className="text-xs text-muted-foreground">Al mese 3 (prima fattura)</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Deposito Finale</p>
              <p className="text-lg font-bold">{formatCurrency(depositoFinale)}</p>
              <p className="text-xs text-muted-foreground">Al mese 14</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Picco Massimo</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(depositoMassimo)}</p>
              <p className="text-xs text-muted-foreground">Fabbisogno massimo</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Variazione</p>
              <div className="flex items-center gap-2">
                {depositoTrend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : depositoTrend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
                <p className={`text-lg font-bold ${
                  depositoDelta > 0 ? 'text-green-600' : depositoDelta < 0 ? 'text-red-600' : ''
                }`}>
                  {depositoDelta >= 0 ? '+' : ''}{formatCurrency(depositoDelta)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Iniziale → Finale</p>
            </div>
          </div>
          
          {/* Chart */}
          {chartData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="depositoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'deposito' ? 'Deposito Richiesto' : name
                    ]}
                    labelFormatter={(label) => `Mese: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="deposito" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#depositoGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {/* Explanation */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h5 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              📋 Come funziona il deposito cauzionale
            </h5>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• <strong>Mese X:</strong> Invii Y contratti al grossista</li>
              <li>• <strong>Mese X+1:</strong> Il grossista invia al SII (dopo scarto tecnico: {config.depositoPercentualeAttivazione}% accettati)</li>
              <li>• <strong>Mese X+2:</strong> Attivazione fornitura per i POD accettati</li>
              <li>• <strong>Mese X+3:</strong> Prima fattura e calcolo deposito ({config.depositoMesi} mesi di fatturato)</li>
              <li>• Il deposito si aggiorna mensilmente: <em>nuovi POD + esistenti - switch-out</em></li>
            </ul>
          </div>
          
          {/* Monthly Details Table */}
          {depositiMensili.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Mese</th>
                    <th className="px-3 py-2 text-right font-medium">Clienti Attivi</th>
                    <th className="px-3 py-2 text-right font-medium">Fatturato Mensile</th>
                    <th className="px-3 py-2 text-right font-medium">Deposito Richiesto</th>
                    <th className="px-3 py-2 text-right font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {depositiMensili.slice(2).map((d, index) => (
                    <tr key={d.month} className="border-t">
                      <td className="px-3 py-2">{d.monthLabel}</td>
                      <td className="px-3 py-2 text-right font-mono">{d.clientiAttivi}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(d.fatturatoMensileStimato)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(d.depositoRichiesto)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${
                        d.deltaDeposito > 0 ? 'text-green-600' : d.deltaDeposito < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {d.deltaDeposito >= 0 ? '+' : ''}{formatCurrency(d.deltaDeposito)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
