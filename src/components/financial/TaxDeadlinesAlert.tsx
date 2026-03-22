import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaxFlowsSummary } from '@/hooks/useTaxFlows';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Calendar, 
  Bell, 
  Receipt, 
  Landmark,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useTaxAlerts, TaxDeadline } from '@/hooks/useTaxAlerts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TaxDeadlinesAlertProps {
  projectId: string | null;
  startDate: Date;
  ivaRegime: 'monthly' | 'quarterly';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getTypeIcon = (type: TaxDeadline['type']) => {
  switch (type) {
    case 'f24_iva':
      return <Receipt className="h-4 w-4" />;
    case 'accise_adm':
      return <Landmark className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: TaxDeadline['type']) => {
  switch (type) {
    case 'f24_iva':
      return 'F24 IVA';
    case 'accise_adm':
      return 'Accise ADM';
    default:
      return 'Scadenza';
  }
};

const getPriorityColor = (priority: TaxDeadline['priority'], isOverdue: boolean) => {
  if (isOverdue) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300';
  switch (priority) {
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300';
  }
};

export const TaxDeadlinesAlert = ({ projectId, startDate, ivaRegime }: TaxDeadlinesAlertProps) => {
  const { 
    upcomingDeadlines, 
    overdueDeadlines, 
    urgentDeadlines,
    triggerAlertCheck,
    loading 
  } = useTaxAlerts(projectId, startDate, ivaRegime);

  if (loading) {
    return null;
  }

  const hasAlerts = overdueDeadlines.length > 0 || urgentDeadlines.length > 0;

  return (
    <Card className={cn(
      "transition-all",
      overdueDeadlines.length > 0 && "border-red-300 bg-red-50/30 dark:bg-red-950/10",
      overdueDeadlines.length === 0 && urgentDeadlines.length > 0 && "border-orange-300 bg-orange-50/30 dark:bg-orange-950/10"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {overdueDeadlines.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : urgentDeadlines.length > 0 ? (
              <Bell className="h-5 w-5 text-orange-600" />
            ) : (
              <Calendar className="h-5 w-5 text-blue-600" />
            )}
            <CardTitle className="text-base">Scadenze Fiscali</CardTitle>
            {hasAlerts && (
              <Badge variant={overdueDeadlines.length > 0 ? "destructive" : "secondary"} className="ml-2">
                {overdueDeadlines.length > 0 
                  ? `${overdueDeadlines.length} scadute` 
                  : `${urgentDeadlines.length} imminenti`}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={triggerAlertCheck}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Prossimi versamenti F24 e Accise ADM
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingDeadlines.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nessuna scadenza fiscale nei prossimi 60 giorni</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    getPriorityColor(deadline.priority, deadline.isOverdue)
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        deadline.isOverdue ? "bg-red-200 dark:bg-red-800" : "bg-background"
                      )}>
                        {getTypeIcon(deadline.type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{deadline.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(deadline.type)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {deadline.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(deadline.dueDate, 'dd MMM yyyy', { locale: it })}
                          </span>
                          {deadline.isOverdue ? (
                            <span className="text-red-700 dark:text-red-400 font-medium">
                              Scaduta da {Math.abs(deadline.daysRemaining)} giorni
                            </span>
                          ) : deadline.daysRemaining === 0 ? (
                            <span className="text-orange-700 dark:text-orange-400 font-medium">
                              Scade oggi!
                            </span>
                          ) : (
                            <span>
                              Tra {deadline.daysRemaining} giorni
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {formatCurrency(deadline.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Summary Footer */}
        {upcomingDeadlines.length > 0 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
            <div className="flex gap-4">
              <span className="text-muted-foreground">
                Prossime 60 giorni: <strong>{upcomingDeadlines.length}</strong> scadenze
              </span>
              <span className="text-muted-foreground">
                Totale: <strong>{formatCurrency(upcomingDeadlines.reduce((sum, d) => sum + d.amount, 0))}</strong>
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
