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
  Flame,
  Calculator,
  Info
} from 'lucide-react';
import { ProjectCost, CostCategory } from '@/hooks/useProjectFinancials';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Dati costi passanti dal simulatore
interface SimulatedPassthroughCosts {
  costoEnergiaTotale: number;
  costoGestionePodTotale: number;
  totalPassanti: number;
  // Dettagli per calcolo
  clientiAttivi: number;
  consumoMedioMensile: number;
  punPerKwh: number;
  spreadPerKwh: number;
  gestionePodPerPod: number;
}

interface CostTabsViewProps {
  costs: ProjectCost[];
  categories: CostCategory[];
  commodityType: string | null;
  onEdit: (cost: ProjectCost) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  // Nuovi props per costi simulati
  simulatedPassthrough?: SimulatedPassthroughCosts;
}

const COST_CATEGORIES = {
  passthrough: {
    label: 'Passanti',
    description: 'Costi calcolati dal simulatore (energia, trasporto, oneri)',
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

// Categorize cost into one of the four tabs - EXCLUDE passthrough from manual costs
const categorizeCost = (cost: ProjectCost): keyof typeof COST_CATEGORIES | null => {
  // Skip passthrough costs - they come from simulator now
  if ((cost as any).is_passthrough === true) {
    return null; // Will be filtered out
  }
  
  const name = cost.name.toLowerCase();
  
  // Skip energy-related costs (handled by simulator)
  const energyPatterns = ['energia acquistata', 'trasporto e distribuzione', 'corrispettivi trasporto', 'oneri di sistema'];
  if (energyPatterns.some(p => name.includes(p))) {
    return null; // Will be filtered out
  }
  
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
  simulatedPassthrough,
}: CostTabsViewProps) => {
  // Filter and categorize costs - excluding passthrough
  const categorizedCosts = useMemo(() => {
    const filtered = costs.filter(cost => filterByCommodity(cost, commodityType));
    
    const result: Record<keyof typeof COST_CATEGORIES, { costs: ProjectCost[]; total: number }> = {
      passthrough: { costs: [], total: 0 }, // Will use simulated data instead
      operational: { costs: [], total: 0 },
      commercial: { costs: [], total: 0 },
      infrastructure: { costs: [], total: 0 },
    };
    
    filtered.forEach(cost => {
      const category = categorizeCost(cost);
      if (category === null) return; // Skip passthrough costs
      
      const amount = cost.amount * cost.quantity;
      result[category].costs.push(cost);
      result[category].total += amount;
    });
    
    // Use simulated passthrough total
    if (simulatedPassthrough) {
      result.passthrough.total = simulatedPassthrough.costoEnergiaTotale + simulatedPassthrough.costoGestionePodTotale;
    }
    
    return result;
  }, [costs, commodityType, simulatedPassthrough]);
  
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

  // Render simulated passthrough costs
  const renderSimulatedPassthrough = () => {
    if (!simulatedPassthrough) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Configura il simulatore ricavi per vedere i costi passanti calcolati</p>
        </div>
      );
    }

    const { 
      costoEnergiaTotale, 
      costoGestionePodTotale, 
      clientiAttivi, 
      consumoMedioMensile,
      punPerKwh,
      gestionePodPerPod 
    } = simulatedPassthrough;

    // Calcola consumo totale su 14 mesi (semplificato)
    const consumoTotaleKwh = clientiAttivi * consumoMedioMensile * 14;

    const passthroughItems = [
      {
        name: 'Energia Acquistata dal Grossista',
        description: `PUN €${(punPerKwh * 1000).toFixed(2)}/MWh × ${consumoTotaleKwh.toLocaleString('it-IT')} kWh (14 mesi)`,
        amount: costoEnergiaTotale,
        icon: Zap,
        iconColor: 'text-yellow-500',
      },
      {
        name: 'Fee Gestione POD',
        description: `€${gestionePodPerPod.toFixed(2)}/POD/mese × ${clientiAttivi} clienti attivi`,
        amount: costoGestionePodTotale,
        icon: Settings,
        iconColor: 'text-blue-500',
      },
    ];

    return (
      <div className="space-y-4">
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <Calculator className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800 dark:text-orange-300">Costi Calcolati dal Simulatore</h4>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                Questi costi sono derivati automaticamente dai parametri del simulatore ricavi 
                (clienti attivi: {clientiAttivi}, consumo medio: {consumoMedioMensile} kWh/mese).
              </p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voce</TableHead>
              <TableHead>Calcolo</TableHead>
              <TableHead className="text-right">Totale 14 mesi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passthroughItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.iconColor}`} />
                      {item.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          {item.description}
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Valore calcolato dinamicamente dal simulatore</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-lg">
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={2} className="font-bold">
                Totale Costi Passanti
              </TableCell>
              <TableCell className="text-right font-bold text-xl">
                {formatCurrency(costoEnergiaTotale + costoGestionePodTotale)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestione Costi per Categoria</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Totale costi: {formatCurrency(totalCosts)}</span>
            {commodityType && (
              <Badge variant="secondary">
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
              const count = key === 'passthrough' && simulatedPassthrough ? 2 : category.costs.length;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge variant="secondary" className="ml-1">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {Object.entries(COST_CATEGORIES).map(([key, config]) => {
            const Icon = config.icon;
            const category = categorizedCosts[key as keyof typeof COST_CATEGORIES];
            const isPassthrough = key === 'passthrough';
            
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
                      {isPassthrough && simulatedPassthrough 
                        ? '2 voci (dal simulatore)' 
                        : `${category.costs.length} ${category.costs.length === 1 ? 'voce' : 'voci'}`}
                    </p>
                  </div>
                </div>
                
                {isPassthrough ? renderSimulatedPassthrough() : renderCostTable(category.costs)}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
