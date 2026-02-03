import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftRight, 
  Building2, 
  Briefcase, 
  Settings,
  Trash2,
  Edit,
  Plus,
  Zap,
  Flame
} from 'lucide-react';
import { ProjectCost, CostCategory } from '@/hooks/useProjectFinancials';

interface CostTabsViewProps {
  costs: ProjectCost[];
  categories: CostCategory[];
  commodityType: string | null;
  onEdit: (cost: ProjectCost) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const COST_CATEGORIES = {
  passthrough: {
    label: 'Passanti',
    description: 'Costi da girare a grossista/distributore (energia, trasporto, oneri)',
    icon: ArrowLeftRight,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
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

// Filter costs by commodity type
const filterByCommodity = (cost: ProjectCost, commodityType: string | null): boolean => {
  const costName = cost.name.toLowerCase();
  const commodityFilter = (cost as any).commodity_filter;
  
  // If cost has explicit filter, use it
  if (commodityFilter) {
    if (commodityType === 'solo-luce' && commodityFilter === 'gas') return false;
    if (commodityType === 'solo-gas' && commodityFilter === 'luce') return false;
  }
  
  // Pattern-based filtering
  const gasPatterns = ['gas', 'smc', 'evg', 'metano'];
  const lucePatterns = ['energia', 'kwh', 'eve', 'elettric'];
  
  const isGasRelated = gasPatterns.some(p => costName.includes(p));
  const isLuceRelated = lucePatterns.some(p => costName.includes(p));
  
  // If it's clearly gas-related and project is solo-luce, hide it
  if (commodityType === 'solo-luce' && isGasRelated && !isLuceRelated) {
    return false;
  }
  
  // If it's clearly luce-related and project is solo-gas, hide it
  if (commodityType === 'solo-gas' && isLuceRelated && !isGasRelated) {
    return false;
  }
  
  return true;
};

// Categorize cost into one of the four tabs
const categorizeCost = (cost: ProjectCost): keyof typeof COST_CATEGORIES => {
  // Passthrough costs
  if ((cost as any).is_passthrough === true) {
    return 'passthrough';
  }
  
  const name = cost.name.toLowerCase();
  
  // Commercial costs
  const commercialPatterns = ['agent', 'provvigion', 'marketing', 'promozion', 'vendita', 'acquisizione', 'lead', 'campagna'];
  if (cost.cost_type === 'commercial' || commercialPatterns.some(p => name.includes(p))) {
    return 'commercial';
  }
  
  // Infrastructure costs (structural, setup, one-time)
  const infraPatterns = ['fidejussion', 'garanz', 'costituzione', 'notaio', 'licenza', 'setup', 'assicurazione', 'consulenza', 'legale', 'ufficio', 'arredamento'];
  if (cost.cost_type === 'structural' || infraPatterns.some(p => name.includes(p))) {
    return 'infrastructure';
  }
  
  // Default to operational (indirect costs, ongoing operations)
  return 'operational';
};

export const CostTabsView = ({
  costs,
  categories,
  commodityType,
  onEdit,
  onDelete,
  onAdd,
}: CostTabsViewProps) => {
  // Filter and categorize costs
  const categorizedCosts = useMemo(() => {
    const filtered = costs.filter(cost => filterByCommodity(cost, commodityType));
    
    const result: Record<keyof typeof COST_CATEGORIES, { costs: ProjectCost[]; total: number }> = {
      passthrough: { costs: [], total: 0 },
      operational: { costs: [], total: 0 },
      commercial: { costs: [], total: 0 },
      infrastructure: { costs: [], total: 0 },
    };
    
    filtered.forEach(cost => {
      const category = categorizeCost(cost);
      const amount = cost.amount * cost.quantity;
      result[category].costs.push(cost);
      result[category].total += amount;
    });
    
    return result;
  }, [costs, commodityType]);
  
  const totalCosts = Object.values(categorizedCosts).reduce((sum, cat) => sum + cat.total, 0);
  
  const renderCostTable = (costList: ProjectCost[]) => {
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
          {costList.map(cost => (
            <TableRow key={cost.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {cost.name.toLowerCase().includes('gas') || cost.name.toLowerCase().includes('smc') ? (
                    <Flame className="h-4 w-4 text-orange-500" />
                  ) : cost.name.toLowerCase().includes('energia') || cost.name.toLowerCase().includes('kwh') ? (
                    <Zap className="h-4 w-4 text-yellow-500" />
                  ) : null}
                  {cost.name}
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
          ))}
        </TableBody>
      </Table>
    );
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestione Costi per Categoria</CardTitle>
          <CardDescription>
            Totale costi: {formatCurrency(totalCosts)}
            {commodityType && (
              <Badge variant="secondary" className="ml-2">
                {commodityType === 'solo-luce' ? 'Solo Energia Elettrica' : 
                 commodityType === 'solo-gas' ? 'Solo Gas' : 'Dual Fuel'}
              </Badge>
            )}
          </CardDescription>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Costo
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="passthrough">
          <TabsList className="grid w-full grid-cols-4">
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
                      {category.costs.length} {category.costs.length === 1 ? 'voce' : 'voci'}
                    </p>
                  </div>
                </div>
                
                {renderCostTable(category.costs)}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
