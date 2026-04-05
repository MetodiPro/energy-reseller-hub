import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface CostTabsViewProps {
  costs: ProjectCost[];
  categories: CostCategory[];
  commodityType: string | null;
  onEdit: (cost: ProjectCost) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  activeChannelNames?: string[];
}

const COST_CATEGORIES = {
  operational: {
    label: 'Gestionali',
    description: 'Software, personale, assistenza clienti, SII',
    icon: Settings,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  commercial: {
    label: 'Commerciali',
    description: 'Acquisizione clienti, agenti, marketing, provvigioni',
    icon: Briefcase,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  infrastructure: {
    label: 'Infrastruttura',
    description: 'Ufficio, licenze, garanzie, consulenze, setup iniziale',
    icon: Building2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Filter costs by commodity type
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

// Categorize cost - EXCLUDE passthrough from manual costs
const categorizeCost = (cost: ProjectCost): keyof typeof COST_CATEGORIES | null => {
  if ((cost as any).is_passthrough === true) return null;
  
  const name = cost.name.toLowerCase();
  const energyPatterns = ['energia acquistata', 'trasporto e distribuzione', 'corrispettivi trasporto', 'oneri di sistema'];
  if (energyPatterns.some(p => name.includes(p))) return null;
  
  const commercialPatterns = ['agent', 'provvigion', 'marketing', 'promozion', 'vendita', 'acquisizione', 'lead', 'campagna'];
  if (cost.cost_type === 'commercial' || commercialPatterns.some(p => name.includes(p))) return 'commercial';
  
  const infraPatterns = ['fidejussion', 'garanz', 'costituzione', 'notaio', 'licenza', 'setup', 'assicurazione', 'consulenza', 'legale', 'ufficio', 'arredamento'];
  if (cost.cost_type === 'structural' || infraPatterns.some(p => name.includes(p))) return 'infrastructure';
  
  return 'operational';
};

// Detect if a commercial cost is a commission entry that duplicates simulated channel costs
const isCommissionDuplicate = (cost: ProjectCost, activeChannels: string[]): boolean => {
  if (activeChannels.length === 0) return false;
  const name = cost.name.toLowerCase();
  const commissionPatterns = ['provvigion', 'commission', 'rete agenti', 'call center', 'referral', 'sportell'];
  if (!commissionPatterns.some(p => name.includes(p))) return false;
  
  // Check if the cost references a channel that is NOT active
  const activeNormalized = activeChannels.map(c => c.toLowerCase());
  const mentionsInactiveChannel = !activeNormalized.some(ch => name.includes(ch.split(' ')[0]));
  
  return mentionsInactiveChannel;
};

export const CostTabsView = ({
  costs,
  categories,
  commodityType,
  onEdit,
  onDelete,
  onAdd,
  activeChannelNames = [],
  simulatedCommercial,
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
  }, [costs, commodityType, activeChannelNames, simulatedCommercial]);
  
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
              <TableRow key={cost.id} className={isDuplicate ? 'opacity-50 bg-amber-50/50 dark:bg-amber-950/10' : ''}>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestione Costi per Categoria</CardTitle>
          <CardDescription className="flex flex-col gap-1">
            <span>Totale costi gestionali, commerciali e infrastrutturali: {formatCurrency(totalCosts)}</span>
          </CardDescription>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Costo
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="operational">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(COST_CATEGORIES).map(([key, config]) => {
              const Icon = config.icon;
              const category = categorizedCosts[key as keyof typeof COST_CATEGORIES];
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
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
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(category.total)}</p>
                    <p className="text-sm text-muted-foreground">
                      {`${category.costs.length} ${category.costs.length === 1 ? 'voce' : 'voci'}`}
                    </p>
                  </div>
                </div>
                
                

                {/* Warning for duplicate manual costs */}
                {key === 'commercial' && activeChannelNames.length > 0 && category.costs.some(c => isCommissionDuplicate(c, activeChannelNames)) && (
                  <div className="mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-300">
                          Costi provvigioni non coerenti con i canali attivi
                        </p>
                        <p className="text-amber-700 dark:text-amber-400 mt-1">
                          Hai configurato solo <strong>{activeChannelNames.join(', ')}</strong> come {activeChannelNames.length === 1 ? 'canale attivo' : 'canali attivi'}. 
                          Le voci evidenziate sono escluse dal totale. Eliminale per tenere pulita la scheda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual cost entries */}
                {key === 'commercial' && category.costs.length > 0 && simulatedCommercial && (
                  <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Costi Commerciali Manuali
                    <Badge variant="secondary" className="text-xs font-normal">{category.costs.length} voci</Badge>
                  </h4>
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