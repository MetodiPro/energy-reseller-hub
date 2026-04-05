import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  Info,
  TrendingUp,
  Users,
  AlertCircle,
  Truck,
  Shield
} from 'lucide-react';
import { ProjectCost, CostCategory } from '@/hooks/useProjectFinancials';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Monthly commission breakdown by channel

// Monthly commission breakdown by channel
interface MonthlyCommissionBreakdown {
  month: number;
  monthLabel: string;
  contrattiNuovi: number;
  clientiAttivati: number;
  costiCommerciali: number;
}

// Channel breakdown for summary
interface ChannelBreakdownData {
  channel_name: string;
  commission_amount: number;
  commission_type: 'per_contract' | 'per_activation';
  contracts: number;
  activations: number;
  cost: number;
}

interface CostTabsViewProps {
  costs: ProjectCost[];
  categories: CostCategory[];
  commodityType: string | null;
  onEdit: (cost: ProjectCost) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  activeChannelNames?: string[];
  simulatedCommercial?: {
    totaleCostiCommerciali: number;
    monthlyBreakdown: MonthlyCommissionBreakdown[];
    channelBreakdown: ChannelBreakdownData[];
  };
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
      if (category === null || category === 'passthrough') return;
      if (!(category in result)) return;
      
      const amount = cost.amount * cost.quantity;
      const isDuplicate = category === 'commercial' && isCommissionDuplicate(cost, activeChannelNames);
      
      result[category].costs.push(cost);
      if (!isDuplicate) {
        result[category].total += amount;
      }
    });
    
    // Add simulated commercial costs to commercial total
    if (simulatedCommercial) {
      result.commercial.total += simulatedCommercial.totaleCostiCommerciali;
    }
    
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
            <div className="flex items-center gap-2">
              <span>Totale costi: {formatCurrency(totalCosts)}</span>
              {commodityType && (
                <Badge variant="secondary">Solo Energia Elettrica</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Costi gestionali, commerciali e infrastrutturali del progetto. 
              I costi energia e grossista sono nella pagina dedicata.
            </p>
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
                      {key === 'commercial' && simulatedCommercial
                        ? `${category.costs.length} voci manuali + provvigioni canali`
                        : `${category.costs.length} ${category.costs.length === 1 ? 'voce' : 'voci'}`}
                    </p>
                  </div>
                </div>
                
                {/* Simulated channel commissions section */}
                {key === 'commercial' && simulatedCommercial && simulatedCommercial.totaleCostiCommerciali > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-semibold text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Provvigioni Canali di Vendita (dal simulatore)
                      <Badge variant="outline" className="text-xs font-normal">Calcolate automaticamente</Badge>
                    </h4>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Canale</TableHead>
                          <TableHead>Tipo Commissione</TableHead>
                          <TableHead className="text-right">Importo Unitario</TableHead>
                          <TableHead className="text-right">Contratti</TableHead>
                          <TableHead className="text-right">Attivazioni</TableHead>
                          <TableHead className="text-right">Totale</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulatedCommercial.channelBreakdown.map(ch => (
                          <TableRow key={ch.channel_name}>
                            <TableCell className="font-medium">{ch.channel_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {ch.commission_type === 'per_contract' ? 'Per contratto' : 'Per attivazione'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(ch.commission_amount)}</TableCell>
                            <TableCell className="text-right">{ch.contracts}</TableCell>
                            <TableCell className="text-right">{ch.activations}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(ch.cost)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={5}>Totale Provvigioni Simulate</TableCell>
                          <TableCell className="text-right text-lg">{formatCurrency(simulatedCommercial.totaleCostiCommerciali)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {simulatedCommercial.monthlyBreakdown.length > 0 && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="monthly-commissions" className="border rounded-lg px-4">
                          <AccordionTrigger className="text-sm hover:no-underline py-3">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              Dettaglio mensile progressivo provvigioni
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Mese</TableHead>
                                    <TableHead className="text-right">Contratti Nuovi</TableHead>
                                    <TableHead className="text-right">Attivazioni</TableHead>
                                    <TableHead className="text-right">Provvigioni Mese</TableHead>
                                    <TableHead className="text-right font-bold">Cumulativo</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(() => {
                                    let cumulative = 0;
                                    return simulatedCommercial.monthlyBreakdown.map(m => {
                                      cumulative += m.costiCommerciali;
                                      return (
                                        <TableRow key={m.month} className={m.costiCommerciali === 0 ? 'opacity-50' : ''}>
                                          <TableCell className="font-medium">{m.monthLabel}</TableCell>
                                          <TableCell className="text-right font-mono">{m.contrattiNuovi}</TableCell>
                                          <TableCell className="text-right font-mono">{m.clientiAttivati}</TableCell>
                                          <TableCell className="text-right font-mono">{formatCurrencyShort(m.costiCommerciali)}</TableCell>
                                          <TableCell className="text-right font-bold font-mono text-primary">{formatCurrencyShort(cumulative)}</TableCell>
                                        </TableRow>
                                      );
                                    });
                                  })()}
                                  <TableRow className="bg-muted/50 font-bold">
                                    <TableCell>Totale</TableCell>
                                    <TableCell className="text-right">
                                      {simulatedCommercial.monthlyBreakdown.reduce((s, m) => s + m.contrattiNuovi, 0)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {simulatedCommercial.monthlyBreakdown.reduce((s, m) => s + m.clientiAttivati, 0)}
                                    </TableCell>
                                    <TableCell className="text-right text-lg">
                                      {formatCurrency(simulatedCommercial.totaleCostiCommerciali)}
                                    </TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                )}

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