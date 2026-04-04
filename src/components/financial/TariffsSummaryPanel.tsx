import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Zap, 
  Truck, 
  Receipt,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// PUN is now manual — no auto-fetch
import { fetchAreraTariffs } from '@/lib/api/areraTariffs';
import type { RevenueSimulationParams } from '@/hooks/useRevenueSimulation';

interface TariffsSummaryPanelProps {
  params: RevenueSimulationParams;
  onUpdate: (key: keyof RevenueSimulationParams, value: number | string) => void;
}

const formatCurrency = (value: number, decimals = 4) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const TariffsSummaryPanel = ({ params, onUpdate }: TariffsSummaryPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [punInfo, setPunInfo] = useState<{ source: string; date: string } | null>(null);
  const [areraInfo, setAreraInfo] = useState<{ source: string; quarter: string } | null>(null);

  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      // Fetch PUN and ARERA in parallel
      const [punResponse, areraResponse] = await Promise.all([
        fetchCurrentPunPrice(),
        fetchAreraTariffs(params.clientType),
      ]);

      if (punResponse.success && punResponse.data) {
        onUpdate('punPerKwh', punResponse.data.averagePriceKwh);
        setPunInfo({
          source: punResponse.data.source,
          date: punResponse.data.date,
        });
      }

      if (areraResponse.success && areraResponse.data) {
        onUpdate('trasportoQuotaFissaAnno', areraResponse.data.trasporto.quotaFissaAnno);
        onUpdate('trasportoQuotaPotenzaKwAnno', areraResponse.data.trasporto.quotaPotenzaKwAnno);
        onUpdate('trasportoQuotaEnergiaKwh', areraResponse.data.trasporto.quotaEnergiaKwh);
        onUpdate('oneriAsosKwh', areraResponse.data.oneri.asosKwh);
        onUpdate('oneriArimKwh', areraResponse.data.oneri.arimKwh);
        const accisaCorretta = params.clientType === 'domestico'
          ? areraResponse.data.accise?.domesticoKwh ?? areraResponse.data.acciseApplicate
          : areraResponse.data.accise?.altriUsiKwh ?? areraResponse.data.acciseApplicate;
        onUpdate('acciseKwh', accisaCorretta);
        onUpdate('ivaPercent', areraResponse.data.ivaPercent);
        setAreraInfo({
          source: `Delibera ${areraResponse.data.delibera}`,
          quarter: `${areraResponse.data.quarter} ${areraResponse.data.year}`,
        });
      }

      toast({
        title: 'Tariffe Aggiornate',
        description: 'Tutte le tariffe sono state aggiornate con i valori più recenti.',
      });
    } catch (error: any) {
      console.error('Error refreshing tariffs:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare le tariffe',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clientTypeLabel = {
    domestico: 'Domestico',
    pmi: 'PMI',
    business: 'Business',
  }[params.clientType] || 'Domestico';

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Riepilogo Tariffe Correnti
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building2 className="h-3 w-3" />
              Cliente: <Badge variant="outline" className="text-xs">{clientTypeLabel}</Badge>
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={handleRefreshAll}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Aggiorna Tutto
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recupera PUN dal GME e tariffe ARERA in un click</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PUN Section */}
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-sm">Materia Energia (PUN)</span>
            </div>
            {punInfo ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>{punInfo.date}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Non aggiornato</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PUN:</span>
              <span className="font-mono">{formatCurrency(params.punPerKwh)}/kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispacciamento:</span>
              <span className="font-mono">{formatCurrency(params.dispacciamentoPerKwh)}/kWh</span>
            </div>
          </div>
          {punInfo && (
            <p className="text-xs text-muted-foreground mt-2">
              Fonte: {punInfo.source}
            </p>
          )}
        </div>

        {/* Trasporto Section */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Trasporto e Distribuzione</span>
            </div>
            {areraInfo ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>{areraInfo.quarter}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Non aggiornato</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quota fissa:</span>
              <span className="font-mono">{formatCurrency(params.trasportoQuotaFissaAnno, 2)}/anno</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quota potenza:</span>
              <span className="font-mono">{formatCurrency(params.trasportoQuotaPotenzaKwAnno, 2)}/kW/anno</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quota energia:</span>
              <span className="font-mono">{formatCurrency(params.trasportoQuotaEnergiaKwh)}/kWh</span>
            </div>
          </div>
        </div>

        {/* Oneri Section */}
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-sm">Oneri di Sistema</span>
            </div>
            {areraInfo && (
              <Badge variant="outline" className="text-xs">ARERA {areraInfo.quarter}</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ASOS:</span>
              <span className="font-mono">{formatCurrency(params.oneriAsosKwh)}/kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ARIM:</span>
              <span className="font-mono">{formatCurrency(params.oneriArimKwh)}/kWh</span>
            </div>
          </div>
        </div>

        {/* Imposte Section */}
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-red-500" />
              <span className="font-medium text-sm">Imposte</span>
            </div>
            <Badge variant="outline" className="text-xs">
              IVA {params.ivaPercent}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accise:</span>
              <span className="font-mono">{formatCurrency(params.acciseKwh)}/kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA:</span>
              <span className="font-mono">{params.ivaPercent}%</span>
            </div>
          </div>
        </div>

        {/* Totale per kWh */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Costo Totale Componenti</span>
            <span className="font-mono font-bold text-lg">
              {formatCurrency(
                params.punPerKwh + 
                params.dispacciamentoPerKwh + 
                params.trasportoQuotaEnergiaKwh + 
                params.oneriAsosKwh + 
                params.oneriArimKwh + 
                params.acciseKwh
              )}/kWh
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Escluse quote fisse e quota potenza
          </p>
        </div>

        {areraInfo && (
          <p className="text-xs text-muted-foreground text-center">
            Fonte: {areraInfo.source}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
