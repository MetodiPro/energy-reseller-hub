import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Users, 
  Zap, 
  Calendar,
  TrendingUp,
  Info,
  CreditCard,
  Loader2,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useSalesChannels } from '@/hooks/useSalesChannels';
import { useToast } from '@/hooks/use-toast';

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const formatCurrencyDecimal = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface SimulationParamsConfigProps {
  projectId: string;
  simulationHook: ReturnType<typeof useRevenueSimulation>;
  commodityType?: string | null;
}

export const SimulationParamsConfig = ({ projectId, simulationHook, commodityType }: SimulationParamsConfigProps) => {
  const { 
    data, 
    loading, 
    updateParams, 
    updateMonthlyContract, 
    updateStartDate, 
  } = simulationHook;

  const { getWeightedActivationRate, channels, loading: channelsLoading } = useSalesChannels(projectId);
  const { toast } = useToast();

  const { startDate, monthlyContracts, params } = data;

  const weightedRate = getWeightedActivationRate();
  const activeChannelsExist = channels.some(c => c.is_active && c.contract_share > 0);
  const rateGap = Math.abs(params.activationRate - weightedRate);
  const showRateWarning = activeChannelsExist && rateGap > 5;

  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Caricamento parametri...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Parametri di Simulazione
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {/* Data Inizio */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Inizio Attività Commerciali
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mese</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={startDate.getMonth()}
                    onChange={(e) => updateStartDate(new Date(startDate.getFullYear(), parseInt(e.target.value), 1))}
                  >
                    {MONTHS_IT.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Anno</Label>
                  <Input
                    type="number"
                    min="2024"
                    max="2035"
                    value={startDate.getFullYear()}
                    onChange={(e) => updateStartDate(new Date(parseInt(e.target.value) || 2026, startDate.getMonth(), 1))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contratti Target per Mese */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contratti Target per Mese
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {monthlyContracts.map((value, index) => {
                  const monthIndex = (startMonth + index) % 12;
                  const year = startYear + Math.floor((startMonth + index) / 12);
                  return (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs">{MONTHS_IT[monthIndex]} {year}</Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-8"
                        value={value}
                        onChange={(e) => updateMonthlyContract(index, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="p-2 bg-muted rounded-lg text-sm">
                <span className="font-medium">Totale: </span>
                {monthlyContracts.reduce((a, b) => a + b, 0)} contratti
              </div>
            </div>
          </div>

          {/* Column 2: Consumption + Reseller Margin */}
          <div className="space-y-6">
            {/* Parametri Consumo */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Parametri Consumo
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Consumo medio (kWh/mese)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>Residenziale tipico: 150-250 kWh/mese</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  value={params.avgMonthlyConsumption}
                  onChange={(e) => updateParams('avgMonthlyConsumption', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo Clientela</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={params.clientType}
                  onChange={(e) => {
                    const value = e.target.value as 'domestico' | 'business' | 'pmi';
                    updateParams('clientType', value);
                    const ivaAutomatic = value === 'domestico' ? 10 : 22;
                    updateParams('ivaPercent', ivaAutomatic);
                    toast({ title: 'IVA aggiornata automaticamente', description: `Clienti ${value}: aliquota IVA impostata al ${ivaAutomatic}%` });
                  }}
                >
                  <option value="domestico">Domestico (IVA 10%)</option>
                  <option value="business">Business (IVA 22%)</option>
                  <option value="pmi">PMI (IVA 22%)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Domestico: IVA 10%, accisa 0.0227 €/kWh — Business/PMI: IVA 22%, accisa 0.0125 €/kWh
                </p>
              </div>

              <div className="space-y-2">
                <Label>Aliquota IVA (%)</Label>
                <Input
                  type="number"
                  value={params.ivaPercent}
                  readOnly
                  className="bg-muted cursor-not-allowed font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Aggiornata automaticamente in base al tipo clientela
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tasso attivazione (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={params.activationRate}
                  onChange={(e) => updateParams('activationRate', parseFloat(e.target.value) || 0)}
                />
                {showRateWarning && (
                  <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p>I canali di vendita hanno un tasso medio del <strong>{weightedRate.toFixed(1)}%</strong> — considera di allineare questo valore.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1.5 h-6 text-xs gap-1"
                        onClick={() => {
                          const aligned = Math.round(weightedRate * 10) / 10;
                          updateParams('activationRate', aligned);
                          toast({ title: 'Tasso allineato', description: `Tasso attivazione impostato a ${aligned}%` });
                        }}
                      >
                        <RefreshCw className="h-3 w-3" />
                        Allinea automaticamente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Separator />

              {/* Churn Granulare */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 rotate-180" />
                  Switch-out (Churn)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Inserisci il tasso % di abbandono per i primi 3 mesi, poi il simulatore applica un decadimento esponenziale.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">1° mese (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.1" className="h-8"
                      value={params.churnMonth1Pct}
                      onChange={(e) => updateParams('churnMonth1Pct', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">2° mese (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.1" className="h-8"
                      value={params.churnMonth2Pct}
                      onChange={(e) => updateParams('churnMonth2Pct', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">3° mese (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.1" className="h-8"
                      value={params.churnMonth3Pct}
                      onChange={(e) => updateParams('churnMonth3Pct', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Fattore decadimento</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>
                          <p>Dal 4° mese il tasso si riduce moltiplicando quello del 3° mese per questo fattore elevato al numero di mesi successivi. Tipico: 0.80-0.90</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number" min="0.1" max="1" step="0.05"
                    value={params.churnDecayFactor}
                    onChange={(e) => updateParams('churnDecayFactor', parseFloat(e.target.value) || 0.85)}
                  />
                </div>

                {/* Preview curva churn */}
                {(() => {
                  const rates = [params.churnMonth1Pct, params.churnMonth2Pct, params.churnMonth3Pct];
                  for (let i = 3; i < 9; i++) {
                    rates.push(params.churnMonth3Pct * Math.pow(params.churnDecayFactor, i - 2));
                  }
                  const annualRetention = rates.reduce((acc, r) => acc * (1 - r / 100), 1);
                  const annualChurn = Math.round((1 - annualRetention) * 100);
                  return (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex gap-1 items-end h-10">
                        {rates.map((r, i) => (
                          <TooltipProvider key={i}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="flex-1 rounded-t bg-destructive/70 transition-all"
                                  style={{ height: `${Math.min(100, (r / Math.max(...rates)) * 100)}%`, minHeight: '2px' }}
                                />
                              </TooltipTrigger>
                              <TooltipContent><p>Mese {i + 1}: {r.toFixed(2)}%</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Curva churn 9 mesi — <span className="font-medium text-destructive">~{annualChurn}% abbandono annuo stimato</span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <Separator />

            {/* Margine Reseller */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                Margine Reseller
              </h4>
              
              <div className="space-y-2">
                <Label>CCV (€/mese)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={params.ccvMonthly}
                  onChange={(e) => updateParams('ccvMonthly', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Spread su PUN (€/kWh)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={params.spreadPerKwh}
                  onChange={(e) => updateParams('spreadPerKwh', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  = {formatCurrencyDecimal(params.spreadPerKwh * params.avgMonthlyConsumption)}/mese
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Altri servizi (€/mese)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={params.otherServicesMonthly}
                  onChange={(e) => updateParams('otherServicesMonthly', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              {(() => {
                const ricaviPerCliente = params.ccvMonthly + (params.spreadPerKwh * params.avgMonthlyConsumption) + params.otherServicesMonthly;
                const margineNettoPerCliente = params.ccvMonthly
                  + ((params.spreadPerKwh ?? 0) - (params.spreadGrossistaPerKwh ?? 0)) * params.avgMonthlyConsumption
                  + params.otherServicesMonthly
                  - (params.gestionePodPerPod ?? 0);
                const isNegative = margineNettoPerCliente <= 0;
                return (
                  <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Ricavi commerciali per cliente/mese</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(ricaviPerCliente)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Margine netto stimato per cliente/mese</p>
                      <p className={`text-lg font-bold ${isNegative ? 'text-destructive' : 'text-green-600'}`}>
                        {formatCurrency(margineNettoPerCliente)}
                      </p>
                      {isNegative && (
                        <p className="text-xs font-medium text-destructive">⚠ Attenzione: margine negativo</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        = CCV + (spread cliente − spread grossista) × kWh − fee POD
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Column 3: Collection rates + Invoice components */}
          <div className="space-y-6">
            {/* Tassi di Incasso */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Tassi di Incasso
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Alla scadenza (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth0}
                    onChange={(e) => updateParams('collectionMonth0', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entro 30gg (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth1}
                    onChange={(e) => updateParams('collectionMonth1', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entro 60gg (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth2}
                    onChange={(e) => updateParams('collectionMonth2', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Oltre 60gg (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth3Plus}
                    onChange={(e) => updateParams('collectionMonth3Plus', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Insoluti definitivi (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={params.uncollectibleRate}
                  onChange={(e) => updateParams('uncollectibleRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              {(() => {
                const total = params.collectionMonth0 + params.collectionMonth1 + params.collectionMonth2 + params.collectionMonth3Plus + params.uncollectibleRate;
                const isValid = Math.abs(total - 100) < 0.1;
                return (
                  <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                    isValid
                      ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : 'bg-destructive/10 text-destructive border border-destructive/30'
                  }`}>
                    {isValid ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">
                        Totale: {total.toFixed(1)}%
                        {!isValid && (total > 100 ? ` (eccesso di ${(total - 100).toFixed(1)}%)` : ` (mancano ${(100 - total).toFixed(1)}%)`)}
                      </p>
                      {!isValid && (
                        <p className="text-xs mt-1 opacity-80">
                          La somma dei tassi di incasso e degli insoluti deve essere esattamente 100%. I risultati della simulazione potrebbero non essere attendibili.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
