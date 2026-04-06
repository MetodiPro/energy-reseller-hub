import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Briefcase, 
  Settings,
  Trash2,
  Edit,
  Plus,
  Zap,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { ProjectCost, CostCategory } from '@/hooks/useProjectFinancials';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CostTabsViewProps {
  costs: ProjectCost[];
  categories: CostCategory[];
  commodityType: string | null;
  plannedStartDate?: string | null;
  onEdit: (cost: ProjectCost) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  activeChannelNames?: string[];
  headerActions?: React.ReactNode;
}

const COST_CATEGORIES = {
  operational: {
    label: 'Gestionali',
    description: 'Software, personale, assistenza clienti, SII',
    icon: Settings,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
  commercial: {
    label: 'Commerciali',
    description: 'Acquisizione clienti, agenti, marketing, provvigioni',
    icon: Briefcase,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
  infrastructure: {
    label: 'Infrastruttura',
    description: 'Ufficio, licenze, garanzie, consulenze, setup iniziale',
    icon: Building2,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
};

const filterByCommodity = (cost: ProjectCost, commodityType: string | null): boolean => {
  const costName = cost.name.toLowerCase();
  const commodityFilter = (cost as any).commodity_filter;
  
  if (commodityFilter) {
    if (commodityType === 'solo-luce' && commodityFilter === 'gas') return false;
    if (commodityType === 'solo-gas' && commodityFilter === 'luce') return false;
  }
  
  const gasPatterns = ['gas', 'smc', 'evg', 'metano'];
  const lucePatterns = ['energia', 'kwh', 'eve', 'elettric'];
  
  const isGasRelated = gasPatterns.some(p => costName.includes(p));
  const isLuceRelated = lucePatterns.some(p => costName.includes(p));
  
  if (commodityType === 'solo-luce' && isGasRelated && !isLuceRelated) return false;
  if (commodityType === 'solo-gas' && isLuceRelated && !isGasRelated) return false;
  
  return true;
};

const categorizeCost = (cost: ProjectCost): keyof typeof COST_CATEGORIES | null => {
  if ((cost as any).is_passthrough === true) return null;
  
  const name = cost.name.toLowerCase();
  const energyPatterns = ['energia acquistata', 'trasporto e distribuzione', 'corrispettivi trasporto', 'oneri di sistema'];
  if (energyPatterns.some(p => name.includes(p))) return null;
  
  // Use the saved cost_type as the primary categorization
  if (cost.cost_type === 'commercial') return 'commercial';
  if (cost.cost_type === 'structural') return 'infrastructure';
  // 'direct' and 'indirect' both map to operational
  return 'operational';
};

const isCommissionDuplicate = (cost: ProjectCost, activeChannels: string[]): boolean => {
  if (activeChannels.length === 0) return false;
  const name = cost.name.toLowerCase();
  const commissionPatterns = ['provvigion', 'commission', 'rete agenti', 'call center', 'referral', 'sportell'];
  if (!commissionPatterns.some(p => name.includes(p))) return false;
  
  const activeNormalized = activeChannels.map(c => c.toLowerCase());
  const mentionsInactiveChannel = !activeNormalized.some(ch => name.includes(ch.split(' ')[0]));
  
  return mentionsInactiveChannel;
};

export const CostTabsView = ({
  costs,
  categories,
  commodityType,
  plannedStartDate,
  onEdit,
  onDelete,
  onAdd,
  activeChannelNames = [],
  headerActions,
}: CostTabsViewProps) => {
  const categorizedCosts = useMemo(() => {
    const filtered = costs.filter(cost => filterByCommodity(cost, commodityType));
    
    const result: Record<keyof typeof COST_CATEGORIES, { costs: ProjectCost[]; total: number }> = {
      operational: { costs: [], total: 0 },
      commercial: { costs: [], total: 0 },
      infrastructure: { costs: [], total: 0 },
    };
    
    filtered.forEach(cost => {
      const category = categorizeCost(cost);
      if (category === null) return;
      if (!(category in result)) return;
      
      const amount = cost.amount * cost.quantity;
      const isDuplicate = category === 'commercial' && isCommissionDuplicate(cost, activeChannelNames);
      
      result[category].costs.push(cost);
      if (!isDuplicate) {
        result[category].total += amount;
      }
    });
    
    return result;
  }, [costs, commodityType, activeChannelNames]);
  
  const totalCosts = Object.values(categorizedCosts).reduce((sum, cat) => sum + cat.total, 0);
  
  const renderCostTable = (costList: ProjectCost[], checkDuplicates = false) => {
    if (costList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nessun costo in questa categoria
        </div>
      );
    }
    
    return (
      <Table>
         <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Data Inizio</TableHead>
            <TableHead className="text-right">Importo</TableHead>
            <TableHead className="text-right">Qtà</TableHead>
            <TableHead className="text-right">Totale</TableHead>
            <TableHead className="text-center">Ricorrente</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costList.map(cost => {
            const isDuplicate = checkDuplicates && isCommissionDuplicate(cost, activeChannelNames);
            return (
              <TableRow key={cost.id} className={isDuplicate ? 'opacity-50 bg-muted/30' : ''}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {cost.name.toLowerCase().includes('gas') || cost.name.toLowerCase().includes('smc') ? (
                      <Flame className="h-4 w-4 text-orange-500" />
                    ) : cost.name.toLowerCase().includes('energia') || cost.name.toLowerCase().includes('kwh') ? (
                      <Zap className="h-4 w-4 text-yellow-500" />
                    ) : null}
                    {cost.name}
                    {isDuplicate && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>Questo costo si riferisce a un canale non attivo. I canali attivi sono: {activeChannelNames.join(', ')}. Considera di eliminarlo per evitare duplicazioni.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                  {cost.description || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {cost.date 
                    ? format(parseISO(cost.date), 'd MMM yyyy', { locale: it })
                    : <span className="italic text-muted-foreground/50">Non impostata</span>
                  }
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(cost.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {cost.quantity} {cost.unit}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(cost.amount * cost.quantity)}
                </TableCell>
                <TableCell className="text-center">
                  {cost.is_recurring ? (
                    <Badge variant="outline" className="text-xs">
                      {cost.recurrence_period === 'monthly' ? 'Mensile' : 
                       cost.recurrence_period === 'yearly' ? 'Annuale' : 
                       cost.recurrence_period === 'quarterly' ? 'Trimestrale' : 
                       'Sì'}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(cost)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(cost.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            Costi Operativi
          </CardTitle>
          <div className="flex items-center gap-2">
            {headerActions}
            <Button onClick={onAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Aggiungi Costo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Totale costi gestionali, commerciali e di infrastruttura</p>
          <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(totalCosts)}</p>
        </div>
      
        <Tabs defaultValue="operational">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(COST_CATEGORIES).map(([key, config]) => {
              const Icon = config.icon;
              const category = categorizedCosts[key as keyof typeof COST_CATEGORIES];
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge variant="secondary" className="ml-1">
                    {category.costs.length}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {Object.entries(COST_CATEGORIES).map(([key, config]) => {
            const Icon = config.icon;
            const category = categorizedCosts[key as keyof typeof COST_CATEGORIES];
            
            return (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", config.bgClass)}>
                      <Icon className={cn("h-5 w-5", config.colorClass)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(category.total)}</p>
                    <p className="text-sm text-muted-foreground">
                      {`${category.costs.length} ${category.costs.length === 1 ? 'voce' : 'voci'}`}
                    </p>
                  </div>
                </div>

                {key === 'commercial' && activeChannelNames.length > 0 && category.costs.some(c => isCommissionDuplicate(c, activeChannelNames)) && (
                  <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-muted/30 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          Costi provvigioni non coerenti con i canali attivi
                        </p>
                        <p className="text-muted-foreground mt-1">
                          Hai configurato solo <strong>{activeChannelNames.join(', ')}</strong> come {activeChannelNames.length === 1 ? 'canale attivo' : 'canali attivi'}. 
                          Le voci evidenziate sono escluse dal totale.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {renderCostTable(category.costs, key === 'commercial')}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
