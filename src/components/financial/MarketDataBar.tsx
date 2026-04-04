import { useState, useEffect } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MarketDataBarProps {
  onUsePunLive?: (punPerKwh: number) => void;
  onNavigateToTariffs?: () => void;
  currentPunPerKwh?: number | null;
}

export function MarketDataBar({ onUsePunLive, onNavigateToTariffs, currentPunPerKwh }: MarketDataBarProps) {
  const [punValue, setPunValue] = useState<number | null>(currentPunPerKwh ?? null);

  useEffect(() => {
    if (typeof currentPunPerKwh === 'number' && currentPunPerKwh > 0) {
      setPunValue(currentPunPerKwh);
    }
  }, [currentPunPerKwh]);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-2.5 text-sm">
      <span className="flex items-center gap-1.5 font-medium">
        <Zap className="h-4 w-4 text-primary" />
        PUN
      </span>

      {punValue ? (
        <span className="font-mono font-semibold">
          €{punValue.toFixed(5)}/kWh
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">Non impostato</span>
      )}

      {onNavigateToTariffs && (
        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={onNavigateToTariffs}>
          Gestisci tariffe <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
