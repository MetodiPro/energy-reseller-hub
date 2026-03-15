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

  const { startDate, monthlyContracts, params } = data;

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
                <Label>Tasso attivazione (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={params.activationRate}
                  onChange={(e) => updateParams('activationRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Switch-out mensile (%)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>Percentuale di clienti che abbandonano ogni mese</p>
                        <p className="text-xs text-muted-foreground">Tipico mercato libero: 1-3%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={params.monthlyChurnRate}
                  onChange={(e) => updateParams('monthlyChurnRate', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-destructive">
                  = ~{Math.round((1 - Math.pow(1 - params.monthlyChurnRate/100, 12)) * 100)}% abbandono annuo
                </p>
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
              
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">Margine per cliente/mese</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(params.ccvMonthly + (params.spreadPerKwh * params.avgMonthlyConsumption) + params.otherServicesMonthly)}
                </p>
              </div>
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
