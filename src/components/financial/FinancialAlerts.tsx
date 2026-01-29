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
  Info
} from 'lucide-react';
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
  icon: React.ElementType;
  priority: number;
}

const DEFAULT_THRESHOLDS = {
  criticalMarginPercent: 0,
  warningMarginPercent: 10,
  targetMarginPercent: 20,
};

export const FinancialAlerts = ({ summary, thresholds = DEFAULT_THRESHOLDS }: FinancialAlertsProps) => {
  const alerts = useMemo(() => {
    const alertList: FinancialAlert[] = [];
    
    const fixedCosts = summary.costsByType.structural + summary.costsByType.indirect;
    const variableCosts = summary.costsByType.direct + summary.costsByType.commercial;
    const contributionMarginRatio = summary.totalRevenue > 0 
      ? (summary.totalRevenue - variableCosts) / summary.totalRevenue 
      : 0;
    const breakEvenRevenue = contributionMarginRatio > 0 
      ? fixedCosts / contributionMarginRatio 
      : 0;
    const isAboveBreakEven = summary.totalRevenue >= breakEvenRevenue && breakEvenRevenue > 0;

    // Break-Even Point Alert
    if (isAboveBreakEven && summary.totalRevenue > 0) {
      const marginOfSafety = ((summary.totalRevenue - breakEvenRevenue) / summary.totalRevenue) * 100;
      alertList.push({
        id: 'bep-reached',
        type: 'success',
        title: '🎉 Break-Even Point Raggiunto!',
        description: `Hai superato il punto di pareggio con un margine di sicurezza del ${marginOfSafety.toFixed(1)}%. I ricavi coprono tutti i costi.`,
        icon: CheckCircle,
        priority: 1,
      });
    } else if (breakEvenRevenue > 0 && summary.totalRevenue > 0) {
      const percentToBreakEven = (summary.totalRevenue / breakEvenRevenue) * 100;
      const remainingToBreakEven = breakEvenRevenue - summary.totalRevenue;
      alertList.push({
        id: 'bep-not-reached',
        type: 'warning',
        title: 'Break-Even Point Non Raggiunto',
        description: `Sei al ${percentToBreakEven.toFixed(0)}% del BEP. Servono ancora €${remainingToBreakEven.toLocaleString('it-IT')} di ricavi per raggiungere il pareggio.`,
        icon: Target,
        priority: 2,
      });
    }

    // Net Margin Alerts
    if (summary.netMarginPercent < thresholds.criticalMarginPercent) {
      alertList.push({
        id: 'margin-critical',
        type: 'error',
        title: '⚠️ Margine Netto Critico',
        description: `Il margine netto è al ${summary.netMarginPercent.toFixed(1)}%, sotto la soglia critica dello ${thresholds.criticalMarginPercent}%. Il progetto è in perdita.`,
        icon: XCircle,
        priority: 0,
      });
    } else if (summary.netMarginPercent < thresholds.warningMarginPercent) {
      alertList.push({
        id: 'margin-warning',
        type: 'warning',
        title: 'Margine Netto Basso',
        description: `Il margine netto è al ${summary.netMarginPercent.toFixed(1)}%, sotto la soglia di attenzione del ${thresholds.warningMarginPercent}%. Considera ottimizzazioni.`,
        icon: AlertTriangle,
        priority: 3,
      });
    } else if (summary.netMarginPercent >= thresholds.targetMarginPercent) {
      alertList.push({
        id: 'margin-target',
        type: 'success',
        title: 'Obiettivo Margine Raggiunto',
        description: `Il margine netto del ${summary.netMarginPercent.toFixed(1)}% supera l'obiettivo del ${thresholds.targetMarginPercent}%. Ottimo lavoro!`,
        icon: TrendingUp,
        priority: 4,
      });
    }

    // Gross Margin Alert
    if (summary.grossMarginPercent < 0) {
      alertList.push({
        id: 'gross-margin-negative',
        type: 'error',
        title: 'Margine Lordo Negativo',
        description: 'I costi diretti superano i ricavi. Rivedi i prezzi o riduci i costi di produzione.',
        icon: TrendingDown,
        priority: 1,
      });
    }

    // Cost Structure Alert
    const fixedCostRatio = summary.totalCosts > 0 ? (fixedCosts / summary.totalCosts) * 100 : 0;
    if (fixedCostRatio > 60) {
      alertList.push({
        id: 'high-fixed-costs',
        type: 'info',
        title: 'Elevata Incidenza Costi Fissi',
        description: `I costi fissi rappresentano il ${fixedCostRatio.toFixed(0)}% del totale. Questo aumenta il rischio operativo ma migliora la leva sui profitti.`,
        icon: Info,
        priority: 5,
      });
    }

    // Revenue vs Costs Balance
    if (summary.totalRevenue === 0 && summary.totalCosts > 0) {
      alertList.push({
        id: 'no-revenues',
        type: 'warning',
        title: 'Nessun Ricavo Registrato',
        description: 'Hai registrato costi ma nessun ricavo. Aggiungi le voci di ricavo per un\'analisi completa.',
        icon: AlertTriangle,
        priority: 2,
      });
    }

    // Sort by priority (lower = more important)
    return alertList.sort((a, b) => a.priority - b.priority);
  }, [summary, thresholds]);

  const getAlertVariant = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'success': return 'default';
      default: return 'default';
    }
  };

  const getAlertClasses = (type: FinancialAlert['type']) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'warning': return 'border-amber-500 bg-amber-50 dark:bg-amber-950/20';
      case 'error': return 'border-destructive';
      case 'info': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
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

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Finanziari
            </CardTitle>
            <CardDescription>Notifiche automatiche sullo stato del progetto</CardDescription>
          </div>
          <Badge variant="secondary">{alerts.length} alert</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const IconComponent = alert.icon;
          return (
            <Alert 
              key={alert.id} 
              variant={getAlertVariant(alert.type)}
              className={getAlertClasses(alert.type)}
            >
              <IconComponent className={`h-4 w-4 ${getIconClasses(alert.type)}`} />
              <AlertTitle className="ml-2">{alert.title}</AlertTitle>
              <AlertDescription className="ml-2 mt-1">
                {alert.description}
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
};
