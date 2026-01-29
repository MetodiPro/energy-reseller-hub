import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useFinancialAuditLog, AuditLogEntry } from '@/hooks/useFinancialAuditLog';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface FinancialTimelineProps {
  projectId: string;
}

const ACTION_CONFIG = {
  create: {
    icon: Plus,
    label: 'Creato',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    borderColor: 'border-green-500',
  },
  update: {
    icon: Edit,
    label: 'Modificato',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    borderColor: 'border-blue-500',
  },
  delete: {
    icon: Trash2,
    label: 'Eliminato',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    borderColor: 'border-red-500',
  },
};

const ENTITY_CONFIG = {
  cost: {
    icon: TrendingDown,
    label: 'Costo',
    color: 'text-destructive',
  },
  revenue: {
    icon: TrendingUp,
    label: 'Ricavo',
    color: 'text-green-600',
  },
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  amount: 'Importo',
  quantity: 'Quantità',
  cost_type: 'Tipo costo',
  revenue_type: 'Tipo ricavo',
  description: 'Descrizione',
  status: 'Stato',
  unit: 'Unità',
  notes: 'Note',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatValue = (field: string, value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (field === 'amount') return formatCurrency(Number(value));
  if (field === 'quantity') return String(value);
  return String(value);
};

const TimelineEntry = ({ entry }: { entry: AuditLogEntry }) => {
  const [expanded, setExpanded] = useState(false);
  const actionConfig = ACTION_CONFIG[entry.action];
  const entityConfig = ENTITY_CONFIG[entry.entity_type];
  const ActionIcon = actionConfig.icon;
  const EntityIcon = entityConfig.icon;

  const entityName = entry.action === 'delete' 
    ? (entry.old_values?.name as string) || 'Elemento'
    : (entry.new_values?.name as string) || 'Elemento';

  const getChangeSummary = () => {
    if (entry.action === 'create') {
      const amount = entry.new_values?.amount as number;
      const quantity = entry.new_values?.quantity as number || 1;
      return `${formatCurrency(amount * quantity)}`;
    }
    if (entry.action === 'delete') {
      const amount = entry.old_values?.amount as number;
      const quantity = entry.old_values?.quantity as number || 1;
      return `${formatCurrency(amount * quantity)}`;
    }
    if (entry.action === 'update' && entry.changed_fields?.includes('amount')) {
      const oldAmount = entry.old_values?.amount as number;
      const newAmount = entry.new_values?.amount as number;
      const diff = newAmount - oldAmount;
      return `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`;
    }
    return null;
  };

  const changeSummary = getChangeSummary();

  return (
    <div className={`relative pl-8 pb-6 border-l-2 ${actionConfig.borderColor} last:pb-0`}>
      {/* Timeline dot */}
      <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${actionConfig.borderColor} bg-background border-2`} />
      
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={actionConfig.color} variant="secondary">
              <ActionIcon className="h-3 w-3 mr-1" />
              {actionConfig.label}
            </Badge>
            <div className={`flex items-center gap-1 ${entityConfig.color}`}>
              <EntityIcon className="h-4 w-4" />
              <span className="font-medium">{entityConfig.label}</span>
            </div>
            <span className="font-semibold">{entityName}</span>
            {changeSummary && (
              <Badge variant="outline" className="font-mono">
                {changeSummary}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: it })}
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {format(new Date(entry.created_at), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
        </p>

        {/* Changed fields for updates */}
        {entry.action === 'update' && entry.changed_fields && entry.changed_fields.length > 0 && (
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Nascondi' : 'Mostra'} dettagli ({entry.changed_fields.length} modifiche)
            </Button>
            
            {expanded && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 mt-2">
                {entry.changed_fields.map((field) => {
                  const oldValue = entry.old_values?.[field];
                  const newValue = entry.new_values?.[field];
                  return (
                    <div key={field} className="flex items-center gap-2 text-sm">
                      <span className="font-medium min-w-[100px]">
                        {FIELD_LABELS[field] || field}:
                      </span>
                      <span className="text-muted-foreground line-through">
                        {formatValue(field, oldValue)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {formatValue(field, newValue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const FinancialTimeline = ({ projectId }: FinancialTimelineProps) => {
  const { auditLog, loading } = useFinancialAuditLog(projectId);
  const [filter, setFilter] = useState<'all' | 'cost' | 'revenue'>('all');

  const filteredLog = auditLog.filter((entry) => {
    if (filter === 'all') return true;
    return entry.entity_type === filter;
  });

  // Group by date
  const groupedLog = filteredLog.reduce((acc, entry) => {
    const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, AuditLogEntry[]>);

  const sortedDates = Object.keys(groupedLog).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Storico Modifiche
            </CardTitle>
            <CardDescription>
              Timeline delle modifiche a costi e ricavi
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-2">Tutti</TabsTrigger>
                <TabsTrigger value="cost" className="text-xs px-2">Costi</TabsTrigger>
                <TabsTrigger value="revenue" className="text-xs px-2">Ricavi</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <History className="h-12 w-12 mb-4 opacity-20" />
            <p>Nessuna modifica registrata</p>
            <p className="text-sm">Le modifiche future ai costi e ricavi appariranno qui</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-4 sticky top-0 bg-background py-1">
                    {format(new Date(date), "EEEE d MMMM yyyy", { locale: it })}
                  </h3>
                  <div className="space-y-0">
                    {groupedLog[date].map((entry) => (
                      <TimelineEntry key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
