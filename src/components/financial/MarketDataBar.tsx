import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Zap, FileText, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { fetchCurrentPunPrice } from '@/lib/api/punPrice';
import { fetchAreraTariffs } from '@/lib/api/areraTariffs';

interface MarketDataBarProps {
  onUsePunLive?: (punPerKwh: number) => void;
  onNavigateToTariffs?: () => void;
}

export function MarketDataBar({ onUsePunLive, onNavigateToTariffs }: MarketDataBarProps) {
  const STALE_TIME = 20 * 60 * 1000;

  const punQuery = useQuery({
    queryKey: ['pun-price-bar'],
    queryFn: () => fetchCurrentPunPrice(),
    staleTime: STALE_TIME,
    retry: 1,
  });

  const areraQuery = useQuery({
    queryKey: ['arera-tariffs-bar'],
    queryFn: () => fetchAreraTariffs(),
    staleTime: STALE_TIME,
    retry: 1,
  });

  const pun = punQuery.data?.data;
  const punIsLive = pun?.data_freshness === 'live';
  const punWarning = punQuery.data?.warning;
  const ternaNotConfigured = !punQuery.isLoading && !pun && punQuery.isError;

  const arera = areraQuery.data;

  const handleUsePun = () => {
    if (pun && onUsePunLive) {
      onUsePunLive(pun.averagePriceKwh);
      toast.success(`PUN aggiornato nel simulatore: €${pun.averagePriceKwh.toFixed(5)}/kWh`);
    }
  };

  const handleRefreshPun = () => {
    punQuery.refetch();
  };

  // Loading state
  if (punQuery.isLoading && areraQuery.isLoading) {
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-2.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-2.5 text-sm">
      {/* ── PUN Section ── */}
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">PUN Index GME</span>
        {ternaNotConfigured ? (
          <button
            onClick={onNavigateToTariffs}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Configura API Terna in Impostazioni
          </button>
        ) : pun ? (
          <>
            <span className="font-bold font-mono">€&nbsp;{pun.averagePriceKwh.toFixed(5)}/kWh</span>
            <span
              className={`inline-block h-2 w-2 rounded-full ${punIsLive ? 'bg-green-500' : 'bg-yellow-500'}`}
              title={punIsLive ? 'Dati live Terna' : 'Valore stimato (fallback)'}
            />
            {pun.reference_date && (
              <span className="text-xs text-muted-foreground">
                ieri {format(new Date(pun.reference_date + 'T00:00:00'), 'dd/MM', { locale: it })}
              </span>
            )}
            <button
              onClick={handleRefreshPun}
              disabled={punQuery.isFetching}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Aggiorna PUN"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${punQuery.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </>
        ) : punQuery.isError ? (
          <span className="text-xs text-muted-foreground">Non disponibile</span>
        ) : (
          <Skeleton className="h-4 w-32" />
        )}
      </div>

      {/* ── Separator ── */}
      <div className="h-4 w-px bg-border" />

      {/* ── ARERA Section ── */}
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Tariffe ARERA</span>
        {arera ? (
          <>
            <span className="text-xs font-mono">
              ASOS {arera.data.oneri.asosKwh} · ARIM {arera.data.oneri.arimKwh} · Accisa {arera.data.acciseApplicate}
            </span>
            <Badge
              variant={arera.requires_update ? 'destructive' : 'default'}
              className={`text-[10px] px-1.5 py-0 h-5 ${
                arera.requires_update
                  ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
                  : 'bg-green-600 hover:bg-green-700 text-white border-green-600'
              }`}
            >
              {arera.requires_update ? '⚠ Verifica' : `Q${arera.data.quarter} ${arera.data.year}`}
            </Badge>
          </>
        ) : areraQuery.isError ? (
          <span className="text-xs text-muted-foreground">Non disponibile</span>
        ) : (
          <Skeleton className="h-4 w-48" />
        )}
      </div>

      {/* ── Separator ── */}
      <div className="h-4 w-px bg-border" />

      {/* ── Actions Section ── */}
      <div className="flex items-center gap-3 ml-auto">
        {pun && onUsePunLive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleUsePun}
          >
            Usa PUN live nel simulatore
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
