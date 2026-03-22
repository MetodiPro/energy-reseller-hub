import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown, 
  TrendingUp,
  Target,
  XCircle,
  Info,
  HelpCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FinancialSummary } from '@/hooks/useProjectFinancials';

interface FinancialAlertsProps {
  summary: FinancialSummary;
  thresholds?: {
    criticalMarginPercent: number;
    warningMarginPercent: number;
    targetMarginPercent: number;
  };
}

interface FinancialAlert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  explanation: string;
  icon: React.ElementType;
  priority: number;
}

const DEFAULT_THRESHOLDS = {
  criticalMarginPercent: 0,
  warningMarginPercent: 10,
  targetMarginPercent: 20,
};

const InfoTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground inline-block ml-1 cursor-help" />
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs text-xs">
      {text}
    </TooltipContent>
  </Tooltip>
);

export const FinancialAlerts = ({ summary, thresholds = DEFAULT_THRESHOLDS }: FinancialAlertsProps) => {
  const alerts = useMemo(() => {
    const alertList: FinancialAlert[] = [];
    
    // Calcoli di base - modello reseller: BEP su margine reseller
    const operationalCosts = summary.operationalCosts;
    const resellerRevenue = summary.imponibile > 0 ? summary.imponibile : summary.grossMargin;
    const grossMarginRatio = resellerRevenue > 0 ? 1.0 : 0;
    const breakEvenRevenue = operationalCosts; // BEP = costi operativi da coprire col margine reseller
    const isAboveBreakEven = summary.grossMargin >= breakEvenRevenue && breakEvenRevenue > 0;

    // ═══════════════════════════════════════════
    // ALERT 1: Margine Netto (la misura più importante)
    // ═══════════════════════════════════════════
    if (summary.netMarginPercent < thresholds.criticalMarginPercent) {
      const lossAmount = Math.abs(summary.netMargin).toLocaleString('it-IT');
      alertList.push({
        id: 'margin-critical',
        type: 'error',
        title: 'Progetto in Perdita',
        description: `Il progetto genera una perdita di €${lossAmount}. Significa che le spese totali superano i guadagni del ${Math.abs(summary.netMarginPercent).toFixed(1)}%.`,
        explanation: 'Per tornare in positivo puoi: aumentare i prezzi ai clienti, acquisire più clienti per coprire i costi fissi, oppure ridurre le spese operative (affitti, personale, consulenze).',
        icon: XCircle,
        priority: 0,
      });
    } else if (summary.netMarginPercent < thresholds.warningMarginPercent) {
      alertList.push({
        id: 'margin-warning',
        type: 'warning',
        title: 'Guadagno Molto Ridotto',
        description: `Il guadagno netto è solo il ${summary.netMarginPercent.toFixed(1)}% del fatturato. Con margini così bassi, basta un imprevisto per andare in perdita.`,
        explanation: `L'obiettivo consigliato è almeno il ${thresholds.warningMarginPercent}%. Valuta se puoi ottimizzare i costi o migliorare le condizioni commerciali.`,
        icon: AlertTriangle,
        priority: 3,
      });
    } else if (summary.netMarginPercent >= thresholds.targetMarginPercent) {
      alertList.push({
        id: 'margin-target',
        type: 'success',
        title: 'Redditività Ottima',
        description: `Il guadagno netto è il ${summary.netMarginPercent.toFixed(1)}% del fatturato, sopra l'obiettivo del ${thresholds.targetMarginPercent}%.`,
        explanation: 'Il progetto ha margini sani che permettono di assorbire eventuali imprevisti e di reinvestire nella crescita.',
        icon: TrendingUp,
        priority: 4,
      });
    }

    // ═══════════════════════════════════════════
    // ALERT 2: Break-Even Point (coerente col margine)
    // ═══════════════════════════════════════════
    if (isAboveBreakEven && summary.grossMargin > 0) {
      // BEP raggiunto MA progetto in perdita → spiega la contraddizione apparente
      if (summary.netMarginPercent < 0) {
        alertList.push({
          id: 'bep-partial',
          type: 'info',
          title: 'Break-Even Commerciale Raggiunto, ma Non Basta',
          description: `Il margine reseller (€${summary.grossMargin.toLocaleString('it-IT')}) supera il punto di pareggio commerciale (€${breakEvenRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}), cioè copre i costi variabili e una parte dei costi fissi di struttura.`,
          explanation: 'Tuttavia il progetto resta in perdita perché ci sono costi operativi aggiuntivi (es. consulenze, affitti, personale) che non sono ancora coperti. Per raggiungere il vero pareggio servono più clienti o una riduzione delle spese operative.',
          icon: Target,
          priority: 2,
        });
      } else {
        const marginOfSafety = summary.grossMargin > 0
          ? ((summary.grossMargin - breakEvenRevenue) / summary.grossMargin) * 100
          : 0;
        alertList.push({
          id: 'bep-reached',
          type: 'success',
          title: 'Punto di Pareggio Superato',
          description: `Il margine reseller supera il punto di pareggio con un margine di sicurezza del ${marginOfSafety.toFixed(0)}%. Ogni euro in più è guadagno netto.`,
          explanation: `Il punto di pareggio è la soglia minima di margine reseller (€${breakEvenRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}) necessaria per coprire tutti i costi operativi. Superarla significa che il progetto genera profitto.`,
          icon: CheckCircle,
          priority: 1,
        });
      }
    } else if (breakEvenRevenue > 0 && summary.grossMargin > 0) {
      const percentToBreakEven = (summary.grossMargin / breakEvenRevenue) * 100;
      const remainingToBreakEven = breakEvenRevenue - summary.grossMargin;
      alertList.push({
        id: 'bep-not-reached',
        type: 'warning',
        title: 'Punto di Pareggio Non Raggiunto',
        description: `Il margine reseller copre il ${percentToBreakEven.toFixed(0)}% del necessario. Servono ancora €${remainingToBreakEven.toLocaleString('it-IT', { maximumFractionDigits: 0 })} di margine reseller per coprire i costi operativi.`,
        explanation: 'Il punto di pareggio è il margine reseller minimo che serve per coprire tutte le spese operative. Finché non lo raggiungi, ogni mese il progetto perde denaro.',
        icon: Target,
        priority: 2,
      });
    }

    // ═══════════════════════════════════════════
    // ALERT 3: Margine Lordo negativo
    // ═══════════════════════════════════════════
    if (summary.grossMarginPercent < 0) {
      alertList.push({
        id: 'gross-margin-negative',
        type: 'error',
        title: 'Si Perde Soldi su Ogni Vendita',
        description: 'Il prezzo di vendita non copre nemmeno i costi diretti del prodotto/servizio.',
        explanation: 'Immagina di vendere un prodotto a €10 quando ti costa €12 produrlo: perdi €2 per ogni vendita. Devi aumentare i prezzi o trovare fornitori più economici prima di tutto il resto.',
        icon: TrendingDown,
        priority: 1,
      });
    }

    // ═══════════════════════════════════════════
    // ALERT 4: Struttura dei costi
    // ═══════════════════════════════════════════
    const passthroughRatio = summary.totalCosts > 0 ? (passthroughCosts / summary.totalCosts) * 100 : 0;
    if (passthroughRatio > 60) {
      alertList.push({
        id: 'high-passthrough-costs',
        type: 'info',
        title: 'Molti Costi Passanti',
        description: `Il ${passthroughRatio.toFixed(0)}% delle spese totali sono costi passanti (energia, distribuzione, oneri) che devi girare al grossista/distributore.`,
        explanation: 'In un modello reseller è normale che i costi passanti siano la maggior parte. Il tuo vero margine dipende dallo spread e dalla CCV che applichi ai clienti.',
        icon: Info,
        priority: 5,
      });
    }

    // ═══════════════════════════════════════════
    // ALERT 5: Nessun ricavo
    // ═══════════════════════════════════════════
    if (summary.totalRevenue === 0 && summary.totalCosts > 0) {
      alertList.push({
        id: 'no-revenues',
        type: 'warning',
        title: 'Nessun Ricavo Inserito',
        description: `Hai registrato €${summary.totalCosts.toLocaleString('it-IT')} di costi ma nessun ricavo. L'analisi finanziaria non è completa.`,
        explanation: 'Aggiungi le voci di ricavo previste (vendite, abbonamenti, commissioni) per ottenere un\'analisi completa con margini e punto di pareggio.',
        icon: AlertTriangle,
        priority: 2,
      });
    }

    return alertList.sort((a, b) => a.priority - b.priority);
  }, [summary, thresholds]);

  const getAlertClasses = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'success': return 'border-green-500/50 bg-green-50 dark:bg-green-950/20';
      case 'warning': return 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20';
      case 'error': return 'border-destructive/50 bg-destructive/5';
      case 'info': return 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20';
      default: return '';
    }
  };

  const getIconClasses = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      case 'error': return 'text-destructive';
      case 'info': return 'text-blue-600';
      default: return '';
    }
  };

  const getBadgeVariant = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'error': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Stato del Progetto
              <InfoTooltip text="Questi avvisi ti aiutano a capire se il progetto sta andando bene economicamente. Sono calcolati automaticamente dai costi e ricavi che hai inserito." />
            </CardTitle>
            <CardDescription>Analisi automatica della salute finanziaria</CardDescription>
          </div>
          <Badge variant="secondary">{alerts.length} {alerts.length === 1 ? 'avviso' : 'avvisi'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const IconComponent = alert.icon;
          return (
            <Alert 
              key={alert.id} 
              variant={alert.type === 'error' ? 'destructive' : 'default'}
              className={getAlertClasses(alert.type)}
            >
              <IconComponent className={`h-4 w-4 ${getIconClasses(alert.type)}`} />
              <AlertTitle className="ml-2 flex items-center gap-1.5">
                {alert.title}
                <Badge variant={getBadgeVariant(alert.type)} className="text-[10px] px-1.5 py-0">
                  {alert.type === 'error' ? 'Critico' : alert.type === 'warning' ? 'Attenzione' : alert.type === 'success' ? 'Positivo' : 'Info'}
                </Badge>
              </AlertTitle>
              <AlertDescription className="ml-2 mt-1 space-y-1.5">
                <p className="text-sm">{alert.description}</p>
                <p className="text-xs text-muted-foreground italic">
                  💡 {alert.explanation}
                </p>
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
};
