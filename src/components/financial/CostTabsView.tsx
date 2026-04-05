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
  simulatedPassthrough?: SimulatedPassthroughCosts;
  activeChannelNames?: string[];
  simulatedCommercial?: {
    totaleCostiCommerciali: number;
    monthlyBreakdown: MonthlyCommissionBreakdown[];
    channelBreakdown: ChannelBreakdownData[];
  };
}

const COST_CATEGORIES = {
  passthrough: {
    label: 'Energia & Grossista',
    description: 'Costi grossista (energia, POD) e componenti pass-through in fattura',
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
  simulatedPassthrough,
  activeChannelNames = [],
  simulatedCommercial,
}: CostTabsViewProps) => {
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
      if (category === null) return;
      
      const amount = cost.amount * cost.quantity;
      // Exclude duplicate commission costs from total when channels are active
      const isDuplicate = category === 'commercial' && isCommissionDuplicate(cost, activeChannelNames);
      
      result[category].costs.push(cost);
      if (!isDuplicate) {
        result[category].total += amount;
      }
    });
    
    if (simulatedPassthrough) {
      result.passthrough.total = simulatedPassthrough.costoEnergiaTotale + simulatedPassthrough.costoGestionePodTotale;
    }
    
    // Add simulated commercial costs to commercial total
    if (simulatedCommercial) {
      result.commercial.total += simulatedCommercial.totaleCostiCommerciali;
    }
    
    return result;
  }, [costs, commodityType, simulatedPassthrough, activeChannelNames, simulatedCommercial]);
  
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

  // Render simulated passthrough costs with full breakdown
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
      spreadGrossistaPerKwh,
      gestionePodPerPod,
      dispacciamentoPerKwh = 0,
      trasportoQuotaFissaAnno = 0,
      trasportoQuotaPotenzaKwAnno = 0,
      trasportoQuotaEnergiaKwh = 0,
      potenzaImpegnataKw = 3,
      oneriAsosKwh = 0,
      oneriArimKwh = 0,
      acciseKwh = 0,
      monthlyBreakdown = [],
    } = simulatedPassthrough;

    const costoAcquistoPerKwh = punPerKwh + spreadGrossistaPerKwh;

    // Calculate component breakdown for passthrough detail
    const kWh = consumoMedioMensile;
    const trasportoMensilePerCliente = (trasportoQuotaFissaAnno / 12) + (trasportoQuotaPotenzaKwAnno * potenzaImpegnataKw / 12) + (trasportoQuotaEnergiaKwh * kWh);
    const oneriMensilePerCliente = (oneriAsosKwh + oneriArimKwh) * kWh;
    const acciseMensilePerCliente = acciseKwh * kWh;
    const dispacciamentoMensilePerCliente = dispacciamentoPerKwh * kWh;

    // Use actual values from costiMensili (based on invoicedCustomers, month 3+)
    // NOT recalculated on clientiAttivi (month 2+) to avoid discrepancies
    const totalClientiMesi = monthlyBreakdown.reduce((sum, m) => sum + m.clientiAttivi, 0);
    const trasportoTotale = monthlyBreakdown.reduce((sum, m) => sum + m.trasporto, 0);
    const oneriTotale = monthlyBreakdown.reduce((sum, m) => sum + m.oneriSistema, 0);
    const acciseTotale = monthlyBreakdown.reduce((sum, m) => sum + m.accise, 0);
    const dispacciamentoTotale = monthlyBreakdown.reduce((sum, m) => sum + m.dispacciamento, 0);

    // Find min/max active customers for the info text
    const activeMonths = monthlyBreakdown.filter(m => m.clientiAttivi > 0);
    const minClienti = activeMonths.length > 0 ? Math.min(...activeMonths.map(m => m.clientiAttivi)) : 0;
    const maxClienti = activeMonths.length > 0 ? Math.max(...activeMonths.map(m => m.clientiAttivi)) : clientiAttivi;
    const monthsWithClients = activeMonths.length;

    return (
      <div className="space-y-6">
        {/* Info box - progressive calculation */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Calcolo progressivo mese per mese</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                I costi qui sotto <strong>non sono calcolati su {clientiAttivi} clienti per 14 mesi</strong>. 
                Ogni mese il costo è moltiplicato per i clienti effettivamente attivi in quel mese 
                (da {minClienti} al mese iniziale fino a {maxClienti} al mese finale), 
                tenendo conto delle nuove attivazioni e degli switch-out progressivi.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                I clienti iniziano a essere attivi dal 3° mese (dopo firma → invio SII → attivazione) e 
                una quota mensile ({simulatedPassthrough.monthlyBreakdown?.length ? 'churn applicato' : '~1.5%'}) cessa la fornitura.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 1: Costi Grossista (what the reseller actually pays) */}
        <div>
          <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Costi pagati al Grossista
            <Badge variant="outline" className="text-xs font-normal">Il reseller paga questi costi</Badge>
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voce</TableHead>
                <TableHead>Formula unitaria</TableHead>
                <TableHead>Logica di calcolo</TableHead>
                <TableHead className="text-right">Totale 14 mesi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Acquisto Energia
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">PUN + Spread Grossista</p>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    €{costoAcquistoPerKwh.toFixed(4)}/kWh × {consumoMedioMensile} kWh
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    = (€{punPerKwh.toFixed(4)} + €{spreadGrossistaPerKwh.toFixed(4)}) × {consumoMedioMensile}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Progressivo su {monthsWithClients} mesi attivi
                  </div>
                  <p className="text-xs mt-1">da {minClienti} a {maxClienti} clienti</p>
                </TableCell>
                <TableCell className="text-right font-semibold text-lg">
                  {formatCurrency(costoEnergiaTotale)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-500" />
                    Fee Gestione POD
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Costo fisso per punto di fornitura</p>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    €{gestionePodPerPod.toFixed(2)}/POD/mese
                  </code>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Progressivo su {monthsWithClients} mesi attivi
                  </div>
                  <p className="text-xs mt-1">da {minClienti} a {maxClienti} POD attivi</p>
                </TableCell>
                <TableCell className="text-right font-semibold text-lg">
                  {formatCurrency(costoGestionePodTotale)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={3}>Totale Costi Grossista</TableCell>
                <TableCell className="text-right text-xl">
                  {formatCurrency(costoEnergiaTotale + costoGestionePodTotale)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* SECTION 2: Dettaglio componenti passanti in fattura */}
        {(trasportoQuotaFissaAnno > 0 || oneriAsosKwh > 0 || acciseKwh > 0) && (
          <div>
            <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              Componenti Passanti in Fattura
              <Badge variant="secondary" className="text-xs font-normal">Il cliente paga, il reseller gira al destinatario</Badge>
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Queste voci compaiono nella bolletta del cliente ma il reseller le incassa e le rigira ai rispettivi destinatari. 
              Non impattano il margine.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Costo unitario /cliente/mese</TableHead>
                  <TableHead className="text-right">Totale 14 mesi (progressivo)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispacciamentoPerKwh > 0 && (
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Dispacciamento
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">Terna/GME</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        €{dispacciamentoPerKwh.toFixed(4)}/kWh × {kWh} = {formatCurrency(dispacciamentoMensilePerCliente)}
                      </code>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(dispacciamentoTotale)}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      Trasporto e Distribuzione
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Quota fissa + potenza + energia</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">Distributore locale</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <p>Fissa: €{(trasportoQuotaFissaAnno / 12).toFixed(2)}/mese</p>
                      <p>Potenza: €{(trasportoQuotaPotenzaKwAnno * potenzaImpegnataKw / 12).toFixed(2)}/mese ({potenzaImpegnataKw} kW)</p>
                      <p>Energia: €{trasportoQuotaEnergiaKwh.toFixed(4)}/kWh × {kWh} = €{(trasportoQuotaEnergiaKwh * kWh).toFixed(2)}</p>
                      <p className="font-medium mt-1">Totale: {formatCurrency(trasportoMensilePerCliente)}/cliente/mese</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(trasportoTotale)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Oneri di Sistema
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">ASOS + ARIM</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">CSEA/ARERA</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <p>ASOS (rinnovabili): €{oneriAsosKwh.toFixed(4)}/kWh</p>
                      <p>ARIM (rimanenti): €{oneriArimKwh.toFixed(4)}/kWh</p>
                      <p className="font-medium mt-1">Totale: {formatCurrency(oneriMensilePerCliente)}/cliente/mese</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(oneriTotale)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-red-500" />
                      Accise
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">Agenzia Dogane</Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      €{acciseKwh.toFixed(4)}/kWh × {kWh} = {formatCurrency(acciseMensilePerCliente)}
                    </code>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(acciseTotale)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={3} className="font-bold text-muted-foreground">
                    Totale Passanti (escluso energia grossista)
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    {formatCurrency(dispacciamentoTotale + trasportoTotale + oneriTotale + acciseTotale)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* SECTION 3: Dettaglio mensile progressivo */}
        {monthlyBreakdown.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="monthly" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Dettaglio mensile progressivo (clienti attivi e costi mese per mese)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mese</TableHead>
                      <TableHead className="text-right">Clienti</TableHead>
                      <TableHead className="text-right">Energia</TableHead>
                      <TableHead className="text-right">Fee POD</TableHead>
                      <TableHead className="text-right">Dispacc.</TableHead>
                      <TableHead className="text-right">Trasporto</TableHead>
                      <TableHead className="text-right">Oneri</TableHead>
                      <TableHead className="text-right">Accise</TableHead>
                      <TableHead className="text-right font-bold">Totale Mese</TableHead>
                      <TableHead className="text-right font-bold">Cumulativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      let cumulative = 0;
                      return monthlyBreakdown.map((m) => {
                        const totaleMese = m.costoEnergia + m.costoPod + m.dispacciamento + m.trasporto + m.oneriSistema + m.accise;
                        cumulative += totaleMese;
                        return (
                          <TableRow key={m.month} className={m.clientiAttivi === 0 ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">{m.monthLabel}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono">{m.clientiAttivi}</span>
                                {m.clientiAttivi > 0 && (
                                  <div 
                                    className="h-2 bg-primary/30 rounded-full" 
                                    style={{ width: `${Math.max(4, (m.clientiAttivi / maxClienti) * 60)}px` }}
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrencyShort(m.costoEnergia)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrencyShort(m.costoPod)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrencyShort(m.dispacciamento)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrencyShort(m.trasporto)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrencyShort(m.oneriSistema)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrencyShort(m.accise)}</TableCell>
                            <TableCell className="text-right font-semibold font-mono">{formatCurrencyShort(totaleMese)}</TableCell>
                            <TableCell className="text-right font-bold font-mono text-primary">{formatCurrencyShort(cumulative)}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Totale</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(costoEnergiaTotale)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(costoGestionePodTotale)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(dispacciamentoTotale)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(trasportoTotale)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(oneriTotale)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(acciseTotale)}</TableCell>
                      <TableCell className="text-right text-lg">
                        {formatCurrency(costoEnergiaTotale + costoGestionePodTotale + dispacciamentoTotale + trasportoTotale + oneriTotale + acciseTotale)}
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

        {/* Note: simulated vs manual passthrough */}
        <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/30 text-sm mt-4">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            I costi passanti calcolati automaticamente dal simulatore (PUN, trasporto, oneri ARERA,
            accise) sono mostrati sopra. Eventuali costi passanti inseriti manualmente dall'utente
            appaiono nella scheda dedicata.
          </p>
        </div>
      </div>
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
              * Il totale include sia i costi energetici del grossista che le partite di giro 
              (componenti fattura girate a terzi). Per l'analisi dei margini, fare riferimento 
              alla scheda Panoramica.
            </p>
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
                        ? 'Calcolati dal simulatore' 
                        : key === 'commercial' && simulatedCommercial
                        ? `${category.costs.length} voci manuali + provvigioni canali`
                        : `${category.costs.length} ${category.costs.length === 1 ? 'voce' : 'voci'}`}
                    </p>
                  </div>
                </div>
                
                {isPassthrough ? renderSimulatedPassthrough() : (
                  <>
                    {/* Simulated channel commissions section */}
                    {key === 'commercial' && simulatedCommercial && simulatedCommercial.totaleCostiCommerciali > 0 && (
                      <div className="space-y-4 mb-6">
                        <h4 className="font-semibold text-base flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Provvigioni Canali di Vendita (dal simulatore)
                          <Badge variant="outline" className="text-xs font-normal">Calcolate automaticamente</Badge>
                        </h4>
                        
                        {/* Channel breakdown summary */}
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

                        {/* Monthly progressive breakdown */}
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

                    {/* Simulator active warning for infrastructure tab */}
                    {key === 'infrastructure' && simulatedPassthrough && simulatedPassthrough.costoGestionePodTotale > 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-sm mb-4">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-400">
                            Simulatore attivo
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            La fee gestione POD e i costi energia sono già calcolati automaticamente
                            dal simulatore. Inserisci qui solo i costi strutturali aggiuntivi
                            (affitto ufficio, personale, software, consulenze) per evitare doppi conteggi.
                          </p>
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
                  </>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};