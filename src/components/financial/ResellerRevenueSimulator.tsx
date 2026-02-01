import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Users, 
  Zap, 
  Calendar,
  TrendingUp,
  Info,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Save,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { useRevenueSimulation, type RevenueSimulationParams, type MonthlyContractsTarget } from '@/hooks/useRevenueSimulation';

/**
 * MODELLO RICAVI RESELLER ENERGIA ELETTRICA
 * 
 * Ciclo di vita del cliente:
 * - Mese X: Contratto commerciale firmato
 * - Mese X+1 (entro il 10): Invio richiesta al Grossista
 * - Grossista comunica al SII lo switch
 * - Parte richieste scartata dal SII
 * - Mese X+2 (dal 1°): Inizio fornitura effettiva
 * - Mese X+3 (entro il 10): Prima fattura emessa
 * - Mese X+3 (dopo 15gg): Prima scadenza incasso
 * - Incasso frazionato nel tempo con percentuale insoluti
 * 
 * Componenti fattura controllabili dal reseller:
 * - CCV: Componente Commercializzazione e Vendita (€/mese fisso)
 * - Spread: Ricarico su PUN (€/kWh)
 * - Altro: Servizi aggiuntivi
 */

interface ResellerRevenueSimulatorProps {
  projectId: string;
}

interface MonthData {
  month: number;
  label: string;
  
  // Contratti
  newContracts: number;
  sentToWholesaler: number;
  activatedCustomers: number;
  activeCustomers: number;
  
  // Fatturazione
  invoicedAmount: number;
  invoicedCustomers: number;
  
  // Componenti fattura
  revenueCCV: number;
  revenueSpread: number;
  revenueOther: number;
  
  // Incassi
  expectedCollection: number;
  cumulativeCollection: number;
  cumulativeUncollected: number;
  
  // DSO
  pendingReceivables: number;
}

const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyDecimal = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
};

export const ResellerRevenueSimulator = ({ projectId }: ResellerRevenueSimulatorProps) => {
  const { 
    data, 
    loading, 
    saving, 
    updateParams, 
    updateMonthlyContract, 
    updateStartDate, 
    saveSimulation 
  } = useRevenueSimulation(projectId);

  const { startDate, monthlyContracts, params } = data;

  // Derive startMonth and startYear from startDate
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  // Calcola proiezione 14 mesi
  const projection = useMemo(() => {
    const months: MonthData[] = [];
    const invoicesToCollect: { month: number; amount: number }[] = [];
    
    let cumulativeActiveCustomers = 0;
    let cumulativeCollection = 0;
    let cumulativeUncollected = 0;
    
    for (let m = 0; m < 14; m++) {
      const monthIndex = (startMonth + m) % 12;
      const year = startYear + Math.floor((startMonth + m) / 12);
      const label = `${MONTHS_IT[monthIndex]} ${year}`;
      
      // Contratti: firmati questo mese (dai primi 10 mesi impostati, poi 0)
      const newContracts = m < 12 ? monthlyContracts[m] : 0;
      
      // Invio grossista: contratti del mese precedente (entro il 10 del mese corrente)
      const sentToWholesaler = m >= 1 ? (m - 1 < 12 ? monthlyContracts[m - 1] : 0) : 0;
      
      // Attivazioni: clienti che iniziano fornitura (contratti di 2 mesi fa, dopo scrematura SII)
      const activatedCustomers = m >= 2
        ? Math.round((m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)) 
        : 0;
      
      cumulativeActiveCustomers += activatedCustomers;
      
      // Fatturazione: clienti attivi da 1 mese fa (prima fattura emessa mese X+3)
      // I clienti attivati nel mese M vengono fatturati nel mese M+1
      const invoicedCustomers = m >= 3
        ? Math.round((m - 3 < 12 ? monthlyContracts[m - 3] : 0) * (params.activationRate / 100))
        : 0;
      
      // Per il mese 3, fatturiamo i clienti attivati nel mese 2
      // Per il mese 4, fatturiamo i clienti attivati nel mese 2 + mese 3
      // etc. Ma dobbiamo considerare i clienti CUMULATIVI attivi
      const customersToInvoice = m >= 3 
        ? cumulativeActiveCustomers - (m >= 4 ? activatedCustomers : 0)
        : 0;
      
      // Calcolo componenti ricavo per fattura
      // Ogni cliente attivo paga mensilmente: CCV + Spread*consumo + Altro
      const revenuePerCustomer = 
        params.ccvMonthly + 
        (params.spreadPerKwh * params.avgMonthlyConsumption) + 
        params.otherServicesMonthly;
      
      // Clienti da fatturare questo mese = tutti i clienti attivi fino al mese precedente
      const activeCustomersToInvoice = m >= 3 
        ? cumulativeActiveCustomers - activatedCustomers // escludiamo quelli appena attivati
        : 0;
      
      const revenueCCV = activeCustomersToInvoice * params.ccvMonthly;
      const revenueSpread = activeCustomersToInvoice * params.spreadPerKwh * params.avgMonthlyConsumption;
      const revenueOther = activeCustomersToInvoice * params.otherServicesMonthly;
      
      const invoicedAmount = revenueCCV + revenueSpread + revenueOther;
      
      // Aggiungi alla coda degli incassi
      if (invoicedAmount > 0) {
        invoicesToCollect.push({ month: m, amount: invoicedAmount });
      }
      
      // Calcola incassi per questo mese (fatture precedenti che maturano)
      let expectedCollection = 0;
      
      invoicesToCollect.forEach(invoice => {
        const monthsAfterInvoice = m - invoice.month;
        
        // Scadenza fattura = 15 gg dopo emissione = effettivamente stesso mese
        if (monthsAfterInvoice === 0) {
          expectedCollection += invoice.amount * (params.collectionMonth0 / 100);
        } else if (monthsAfterInvoice === 1) {
          expectedCollection += invoice.amount * (params.collectionMonth1 / 100);
        } else if (monthsAfterInvoice === 2) {
          expectedCollection += invoice.amount * (params.collectionMonth2 / 100);
        } else if (monthsAfterInvoice === 3) {
          expectedCollection += invoice.amount * (params.collectionMonth3Plus / 100);
        }
        // Insoluti definitivi dopo 3 mesi
        if (monthsAfterInvoice === 4) {
          cumulativeUncollected += invoice.amount * (params.uncollectibleRate / 100);
        }
      });
      
      cumulativeCollection += expectedCollection;
      
      // Crediti in sospeso
      const totalInvoiced = invoicesToCollect.reduce((sum, inv) => sum + inv.amount, 0);
      const pendingReceivables = totalInvoiced - cumulativeCollection - cumulativeUncollected;
      
      months.push({
        month: m,
        label,
        newContracts,
        sentToWholesaler,
        activatedCustomers,
        activeCustomers: cumulativeActiveCustomers,
        invoicedCustomers: activeCustomersToInvoice,
        invoicedAmount,
        revenueCCV,
        revenueSpread,
        revenueOther,
        expectedCollection,
        cumulativeCollection,
        cumulativeUncollected,
        pendingReceivables: Math.max(0, pendingReceivables),
      });
    }
    
    return months;
  }, [params, startMonth, startYear, monthlyContracts]);

  // Totali
  const totals = useMemo(() => {
    const lastMonth = projection[projection.length - 1];
    return {
      totalContracts: projection.reduce((sum, m) => sum + m.newContracts, 0),
      totalActiveCustomers: lastMonth?.activeCustomers || 0,
      totalInvoiced: projection.reduce((sum, m) => sum + m.invoicedAmount, 0),
      totalCollected: lastMonth?.cumulativeCollection || 0,
      totalUncollected: lastMonth?.cumulativeUncollected || 0,
      totalPending: lastMonth?.pendingReceivables || 0,
    };
  }, [projection]);

  // Grafico dati
  const chartData = projection.map(m => ({
    name: m.label,
    fatturato: m.invoicedAmount,
    incassato: m.expectedCollection,
    clientiAttivi: m.activeCustomers,
  }));

  const revenueBreakdown = [
    { name: 'CCV', value: projection.reduce((s, m) => s + m.revenueCCV, 0), color: 'hsl(var(--chart-1))' },
    { name: 'Spread PUN', value: projection.reduce((s, m) => s + m.revenueSpread, 0), color: 'hsl(var(--chart-2))' },
    { name: 'Altri Servizi', value: projection.reduce((s, m) => s + m.revenueOther, 0), color: 'hsl(var(--chart-3))' },
  ];

  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-muted-foreground">Caricamento configurazione...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con spiegazione */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Simulatore Ricavi Reseller Energia
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Modello completo del ciclo contratto → fornitura → fattura → incasso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X</p>
                <p className="text-muted-foreground text-xs">Firma contratto</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+1</p>
                <p className="text-muted-foreground text-xs">Invio a Grossista → SII</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+2</p>
                <p className="text-muted-foreground text-xs">Inizio fornitura</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <CreditCard className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+3</p>
                <p className="text-muted-foreground text-xs">Prima fattura + incasso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parametri Input */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Parametri Simulazione</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Inizio Attività Commerciali */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Inizio Attività Commerciali
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mese</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={startDate.getMonth()}
                    onChange={(e) => updateStartDate(new Date(startDate.getFullYear(), parseInt(e.target.value), 1))}
                  >
                    {MONTHS_IT.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Anno</Label>
                  <Input
                    type="number"
                    min="2024"
                    max="2035"
                    value={startDate.getFullYear()}
                    onChange={(e) => updateStartDate(new Date(parseInt(e.target.value) || 2026, startDate.getMonth(), 1))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Pianificazione Clienti per Mese */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clienti da Attivare per Mese
              </h4>
              <p className="text-xs text-muted-foreground">
                Imposta il numero di contratti target per ciascuno dei primi 12 mesi
              </p>
              <div className="grid grid-cols-2 gap-2">
                {monthlyContracts.map((value, index) => {
                  const monthIndex = (startMonth + index) % 12;
                  const year = startYear + Math.floor((startMonth + index) / 12);
                  return (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs">{MONTHS_IT[monthIndex]} {year}</Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-8"
                        value={value}
                        onChange={(e) => updateMonthlyContract(index, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="p-2 bg-muted rounded-lg text-sm">
                <span className="font-medium">Totale contratti target: </span>
                {monthlyContracts.reduce((a, b) => a + b, 0)}
              </div>
            </div>

            <Separator />

            {/* Clienti */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Parametri Consumo
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Consumo medio (kWh/mese)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>Consumo mensile per punto di fornitura (POD)</p>
                        <p className="text-xs text-muted-foreground">Residenziale tipico: 150-250 kWh/mese</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  value={params.avgMonthlyConsumption}
                  onChange={(e) => updateParams('avgMonthlyConsumption', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Tasso attivazione (%)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>% contratti che diventano attivi dopo scrematura SII</p>
                        <p className="text-xs text-muted-foreground">Tipico: 80-90%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={params.activationRate}
                  onChange={(e) => updateParams('activationRate', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <Separator />

            {/* Componenti Prezzo */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Componenti Ricavo Reseller
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>CCV (€/mese)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>Componente Commercializzazione e Vendita</p>
                        <p className="text-xs text-muted-foreground">Quota fissa mensile per cliente</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={params.ccvMonthly}
                  onChange={(e) => updateParams('ccvMonthly', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Spread su PUN (€/kWh)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>Ricarico aggiunto al prezzo PUN per ogni kWh</p>
                        <p className="text-xs text-muted-foreground">Tipico: 0.01 - 0.03 €/kWh</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  value={params.spreadPerKwh}
                  onChange={(e) => updateParams('spreadPerKwh', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  = {formatCurrencyDecimal(params.spreadPerKwh * params.avgMonthlyConsumption)}/mese per cliente
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Altri servizi (€/mese)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={params.otherServicesMonthly}
                  onChange={(e) => updateParams('otherServicesMonthly', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Ricavo lordo per cliente/mese
                </p>
                <p className="text-xl font-bold text-green-800 dark:text-green-200">
                  {formatCurrency(params.ccvMonthly + (params.spreadPerKwh * params.avgMonthlyConsumption) + params.otherServicesMonthly)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Tassi Incasso */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Tassi di Incasso
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Alla scadenza</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={params.collectionMonth0}
                      onChange={(e) => updateParams('collectionMonth0', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entro 30gg</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={params.collectionMonth1}
                      onChange={(e) => updateParams('collectionMonth1', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entro 60gg</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={params.collectionMonth2}
                      onChange={(e) => updateParams('collectionMonth2', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Oltre 60gg</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={params.collectionMonth3Plus}
                      onChange={(e) => updateParams('collectionMonth3Plus', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Insoluti definitivi (%)</Label>
                  <AlertCircle className="h-3 w-3 text-destructive" />
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={params.uncollectibleRate}
                  onChange={(e) => updateParams('uncollectibleRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              {(params.collectionMonth0 + params.collectionMonth1 + params.collectionMonth2 + params.collectionMonth3Plus + params.uncollectibleRate) !== 100 && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded text-xs text-yellow-700 dark:text-yellow-300">
                  ⚠️ La somma delle percentuali deve essere 100%
                </div>
              )}
            </div>

            <Separator />

            {/* Pulsante Salva */}
            <Button 
              onClick={saveSimulation} 
              disabled={saving || loading}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Configurazione
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Risultati */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Proiezione 14 Mesi</CardTitle>
            <CardDescription>
              Dal primo contratto commerciale alla stabilizzazione dei flussi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Riepilogo</TabsTrigger>
                <TabsTrigger value="table">Dettaglio Mensile</TabsTrigger>
                <TabsTrigger value="chart">Grafici</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Contratti Totali</p>
                      <p className="text-2xl font-bold">{totals.totalContracts}</p>
                      <p className="text-xs text-muted-foreground">in 14 mesi</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Clienti Attivi</p>
                      <p className="text-2xl font-bold">{totals.totalActiveCustomers}</p>
                      <p className="text-xs text-muted-foreground">al mese 14</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Fatturato Emesso</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(totals.totalInvoiced)}</p>
                      <p className="text-xs text-muted-foreground">totale 14 mesi</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Incassato</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalCollected)}</p>
                      <p className="text-xs text-muted-foreground">cash-in effettivo</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Composizione Ricavi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {revenueBreakdown.map(item => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Stato Crediti</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-600">✓ Incassato</span>
                          <span className="font-medium">{formatCurrency(totals.totalCollected)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-yellow-600">◷ In sospeso</span>
                          <span className="font-medium">{formatCurrency(totals.totalPending)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-destructive">✗ Insoluti</span>
                          <span className="font-medium">{formatCurrency(totals.totalUncollected)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline Note */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📅 Note sui tempi</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• I primi <strong>2 mesi</strong> non generano fatturato (lag operativo)</li>
                    <li>• La <strong>prima fattura</strong> viene emessa nel mese 3</li>
                    <li>• Il <strong>primo incasso</strong> avviene 15gg dopo l'emissione fattura</li>
                    <li>• I crediti maturano su un orizzonte di <strong>3-4 mesi</strong> dalla fatturazione</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="table">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mese</TableHead>
                        <TableHead className="text-right">Contratti</TableHead>
                        <TableHead className="text-right">Attivati</TableHead>
                        <TableHead className="text-right">Clienti Attivi</TableHead>
                        <TableHead className="text-right">Fatturato</TableHead>
                        <TableHead className="text-right">Incasso</TableHead>
                        <TableHead className="text-right">Crediti</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projection.map((month) => (
                        <TableRow key={month.month}>
                          <TableCell className="font-medium">{month.label}</TableCell>
                          <TableCell className="text-right">{month.newContracts}</TableCell>
                          <TableCell className="text-right">
                            {month.activatedCustomers > 0 ? (
                              <Badge variant="outline" className="text-green-600">
                                +{month.activatedCustomers}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{month.activeCustomers}</TableCell>
                          <TableCell className="text-right">
                            {month.invoicedAmount > 0 ? formatCurrency(month.invoicedAmount) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {month.expectedCollection > 0 ? formatCurrency(month.expectedCollection) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-yellow-600">
                            {month.pendingReceivables > 0 ? formatCurrency(month.pendingReceivables) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="chart">
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Fatturato vs Incasso</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="fatturato" 
                            name="Fatturato"
                            stroke="hsl(var(--chart-1))" 
                            fill="hsl(var(--chart-1))" 
                            fillOpacity={0.3}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="incassato" 
                            name="Incassato"
                            stroke="hsl(var(--chart-3))" 
                            fill="hsl(var(--chart-3))" 
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Crescita Clienti Attivi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar 
                            dataKey="clientiAttivi" 
                            name="Clienti Attivi"
                            fill="hsl(var(--chart-2))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
