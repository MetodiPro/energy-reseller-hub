import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchCurrentPunPrice } from '@/lib/api/punPrice';

interface MarketDataBarProps {
  onUsePunLive?: (punPerKwh: number) => void;
  onNavigateToTariffs?: () => void;
  currentPunPerKwh?: number | null;
}

export function MarketDataBar({ onUsePunLive, onNavigateToTariffs, currentPunPerKwh }: MarketDataBarProps) {
  const [punValue, setPunValue] = useState<number | null>(currentPunPerKwh ?? null);
  const [punLoading, setPunLoading] = useState(false);

  useEffect(() => {
    if (typeof currentPunPerKwh === 'number' && currentPunPerKwh > 0) {
      setPunValue(currentPunPerKwh);
    }
  }, [currentPunPerKwh]);

  const handleRefreshPun = useCallback(async () => {
    setPunLoading(true);
    try {
      const res = await fetchCurrentPunPrice();
      if (res.data) {
        setPunValue(res.data.averagePriceKwh);
        if (res.data.data_freshness === 'live') {
          toast.success(`PUN aggiornato: €${res.data.averagePriceKwh.toFixed(5)}/kWh`);
        } else {
          toast.info('PUN stimato caricato — configura le credenziali Terna per dati live');
        }
      }
    } catch {
      toast.error('Errore aggiornamento PUN');
    } finally {
      setPunLoading(false);
    }
  }, []);

  const handleUsePun = () => {
    if (punValue && onUsePunLive) {
      onUsePunLive(punValue);
      toast.success(`PUN importato nel simulatore: €${punValue.toFixed(5)}/kWh`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">PUN</span>
        {punValue ? (
          <span className="font-bold font-mono">€&nbsp;{punValue.toFixed(5)}/kWh</span>
        ) : (
          <span className="text-xs text-muted-foreground">Non caricato</span>
        )}
        <button
          onClick={handleRefreshPun}
          disabled={punLoading}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Aggiorna PUN da Terna"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${punLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-3 ml-auto">
        {punValue && onUsePunLive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleUsePun}
          >
            Usa PUN nel simulatore
          </Button>
        )}
        {onNavigateToTariffs && (
          <button
            onClick={onNavigateToTariffs}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Gestisci tariffe <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
