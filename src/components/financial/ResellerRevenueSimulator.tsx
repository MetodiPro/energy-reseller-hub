import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Zap, 
  TrendingUp,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  Download
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
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { useEngineResult } from '@/hooks/useEngineResult';
import { InvoiceBreakdownTable } from './InvoiceBreakdownTable';
import { exportSimulationToExcel } from '@/lib/exportSimulationExcel';
import { useToast } from '@/hooks/use-toast';

/**
 * MODELLO COMPLETO FATTURA ENERGIA ELETTRICA
 * 
 * COMPONENTI FATTURA:
 * 1. MATERIA ENERGIA (passante)
 *    - PUN (Prezzo Unico Nazionale) - costo materia prima
 *    - Dispacciamento - bilanciamento rete
 *    - Spread Reseller (MARGINE) - ricarico su PUN
 * 
 * 2. TRASPORTO E DISTRIBUZIONE (passante)
 *    - Quota fissa annua
 *    - Quota potenza (€/kW/anno)
 *    - Quota energia (€/kWh)
 * 
 * 3. ONERI DI SISTEMA (passante)
 *    - ASOS - sostegno rinnovabili
 *    - ARIM - altri oneri
 * 
 * 4. IMPOSTE
 *    - Accise (€/kWh)
 *    - IVA (10% domestico, 22% business)
 * 
 * 5. COMPONENTI COMMERCIALI RESELLER (MARGINE)
 *    - CCV - Commercializzazione e Vendita
 *    - Altri servizi
 * 
 * Ciclo di vita cliente:
 * - Mese X: Contratto firmato
 * - Mese X+1: Invio a Grossista → SII
 * - Mese X+2: Inizio fornitura
 * - Mese X+3: Prima fattura + incasso
 */

interface ResellerRevenueSimulatorProps {
  projectId: string;
  simulationHook: ReturnType<typeof useRevenueSimulation>;
}

interface MonthData {
  month: number;
  label: string;
  
  // Contratti
  newContracts: number;
  sentToWholesaler: number;
  activatedCustomers: number;
  churnedCustomers: number;
  activeCustomers: number;
  invoicedCustomers: number;
  
  // Componenti fattura per mese (valori totali per tutti i clienti)
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  commercialeReseller: number;
  imponibileTotale: number;
  iva: number;
  fatturaTotale: number;
  
  // Di cui margine reseller
  margineCCV: number;
  margineSpread: number;
  margineAltro: number;
  margineTotale: number;
  
  // Incassi
  expectedCollection: number;
  cumulativeCollection: number;
  cumulativeUncollected: number;
  pendingReceivables: number;
  
  // Legacy (per compatibilità)
  invoicedAmount: number;
  revenueCCV: number;
  revenueSpread: number;
  revenueOther: number;
}



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

export const ResellerRevenueSimulator = ({ projectId, simulationHook }: ResellerRevenueSimulatorProps) => {
  const { toast } = useToast();
  const { 
    data, 
    loading, 
    saving, 
    updateParams, 
    updateMonthlyContract, 
    updateStartDate, 
    saveSimulation 
  } = simulationHook;

  const { startDate, monthlyContracts, params } = data;
  const [showInvoiceParams, setShowInvoiceParams] = useState(false);

  // Usa il motore di calcolo condiviso (fonte unica di verità)
  const { engineResult } = useEngineResult(projectId, {
    simulationData: { data, loading },
  });

  // Mappa i risultati del motore condiviso al tipo MonthData locale
  const projection = useMemo((): MonthData[] => {
    if (!engineResult) return [];

    const mapped = engineResult.monthly.map((m): MonthData => ({
      month: m.customer.month,
      label: m.customer.monthLabel,
      newContracts: m.customer.contrattiNuovi,
      sentToWholesaler: m.customer.month >= 1
        ? (m.customer.month - 1 < 12 ? data.monthlyContracts[m.customer.month - 1] : 0)
        : 0,
      activatedCustomers: m.customer.attivazioni,
      churnedCustomers: m.customer.churn,
      activeCustomers: m.customer.clientiAttivi,
      invoicedCustomers: m.customer.clientiFatturati,
      // Pre-computed aggregated fields from engine (multi-product safe)
      materiaEnergia: m.materiaEnergiaTotale,
      trasporto: m.trasportoTotale,
      oneriSistema: m.oneriSistemaTotale,
      accise: m.acciseTotale,
      commercialeReseller: m.margineCommerciale,
      imponibileTotale: m.fatturato - m.ivaTotale,
      iva: m.ivaTotale,
      fatturaTotale: m.fatturato,
      // Breakdown margine dai componenti del motore
      margineCCV: m.margineCcvTotale,
      margineSpread: m.margineSpreadTotale,
      margineAltro: m.margineAltroTotale,
      margineTotale: m.margineCommerciale,
      expectedCollection: m.collection.totaleIncassi,
      cumulativeCollection: 0,
      cumulativeUncollected: 0,
      pendingReceivables: 0,
      invoicedAmount: m.fatturato,
      revenueCCV: m.margineCcvTotale,
      revenueSpread: m.margineSpreadTotale,
      revenueOther: m.margineAltroTotale,
    }));

    // Calcola campi cumulativi
    let cumCollection = 0;
    let cumUncollected = 0;
    let cumInvoiced = 0;
    for (const md of mapped) {
      cumInvoiced += md.fatturaTotale;
      cumCollection += md.expectedCollection;
      // Insoluti strutturali: si materializzano 4 mesi dopo la fattura
      if (md.month >= 4) {
        const invoiceMonth = engineResult.monthly[md.month - 4];
        if (invoiceMonth) {
          cumUncollected += invoiceMonth.fatturato * (data.params.uncollectibleRate / 100);
        }
      }
      md.cumulativeCollection = cumCollection;
      md.cumulativeUncollected = cumUncollected;
      md.pendingReceivables = Math.max(0, cumInvoiced - cumCollection - cumUncollected);
    }

    return mapped;
  }, [engineResult, data]);

  // Totali
  const totals = useMemo(() => {
    const lastMonth = projection[projection.length - 1];
    return {
      totalContracts: projection.reduce((sum, m) => sum + m.newContracts, 0),
      totalChurned: projection.reduce((sum, m) => sum + m.churnedCustomers, 0),
      totalActiveCustomers: lastMonth?.activeCustomers || 0,
      totalFatturato: projection.reduce((sum, m) => sum + m.fatturaTotale, 0),
      totalMargine: projection.reduce((sum, m) => sum + m.margineTotale, 0),
      totalPassanti: projection.reduce((sum, m) => sum + m.materiaEnergia + m.trasporto + m.oneriSistema + m.accise, 0),
      totalIva: projection.reduce((sum, m) => sum + m.iva, 0),
      totalCollected: lastMonth?.cumulativeCollection || 0,
      totalUncollected: lastMonth?.cumulativeUncollected || 0,
      totalPending: lastMonth?.pendingReceivables || 0,
    };
  }, [projection]);

  // Grafico dati
  const chartData = projection.map(m => ({
    name: m.label,
    fatturato: m.fatturaTotale,
    margine: m.margineTotale,
    incassato: m.expectedCollection,
    clientiAttivi: m.activeCustomers,
  }));

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
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Simulatore Fatturazione Reseller Energia
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Modello completo: fattura cliente → componenti passanti → margine reseller → incasso
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  exportSimulationToExcel('Progetto', projection, params, totals);
                  toast({
                    title: 'Export completato',
                    description: 'Il file Excel è stato scaricato',
                  });
                } catch (error) {
                  toast({
                    title: 'Errore export',
                    description: 'Impossibile esportare i dati',
                    variant: 'destructive',
                  });
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center text-sm">
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X</p>
                <p className="text-muted-foreground text-xs">Contratto firmato</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+1</p>
                <p className="text-muted-foreground text-xs">Invio a Grossista / SII (switching)</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+2</p>
                <p className="text-muted-foreground text-xs">Inizio fornitura e prima fattura</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <CreditCard className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+3</p>
                <p className="text-muted-foreground text-xs">Primo incasso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        {/* Risultati */}
        <Card>
          <CardHeader>
            <CardTitle>Proiezione 14 Mesi</CardTitle>
            <CardDescription>
              Fatturazione completa con dettaglio componenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Riepilogo</TabsTrigger>
                <TabsTrigger value="breakdown">Dettaglio Fattura</TabsTrigger>
                <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                <TabsTrigger value="chart">Grafici</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Contratti Totali</p>
                      <p className="text-2xl font-bold">{totals.totalContracts}</p>
                      <p className="text-xs text-muted-foreground">in 14 mesi</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-red-700 dark:text-red-300">Switch-out</p>
                      <p className="text-2xl font-bold text-red-600">-{totals.totalChurned}</p>
                      <p className="text-xs text-red-600">
                        Clienti finali: {totals.totalActiveCustomers}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Fatturato Totale</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(totals.totalFatturato)}</p>
                      <p className="text-xs text-muted-foreground">IVA inclusa</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-green-700 dark:text-green-300">Margine Reseller</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalMargine)}</p>
                      <p className="text-xs text-green-600">
                        {totals.totalFatturato > 0 ? ((totals.totalMargine / totals.totalFatturato) * 100).toFixed(1) : 0}% del fatturato
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 dark:bg-orange-950/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-orange-700 dark:text-orange-300">Passanti</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalPassanti)}</p>
                      <p className="text-xs text-orange-600">Da girare a grossista/DSO</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Breakdown sintesi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Composizione Fatturato</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Materia Energia (PUN+Disp)</span>
                          <span className="font-medium">{formatCurrency(projection.reduce((s, m) => s + m.materiaEnergia, 0))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Trasporto & Distribuzione</span>
                          <span className="font-medium">{formatCurrency(projection.reduce((s, m) => s + m.trasporto, 0))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Oneri di Sistema</span>
                          <span className="font-medium">{formatCurrency(projection.reduce((s, m) => s + m.oneriSistema, 0))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Accise</span>
                          <span className="font-medium">{formatCurrency(projection.reduce((s, m) => s + m.accise, 0))}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-green-600">
                          <span className="text-sm font-medium">Margine Reseller</span>
                          <span className="font-bold">{formatCurrency(totals.totalMargine)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">IVA</span>
                          <span className="font-medium">{formatCurrency(totals.totalIva)}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">TOTALE FATTURATO</span>
                          <span className="font-bold text-lg">{formatCurrency(totals.totalFatturato)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Stato Incassi</CardTitle>
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

                {/* Note */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">💡 Cosa rappresentano questi numeri</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Fatturato</strong>: importo totale che pagano i clienti (IVA inclusa)</li>
                    <li>• <strong>Passanti</strong>: costi da girare a grossista, distributore, CSEA (PUN, trasporto, oneri)</li>
                    <li>• <strong className="text-green-600">Margine</strong>: il ricavo effettivo del reseller (CCV + Spread + Altro)</li>
                    <li>• <strong>IVA</strong>: da versare all'Erario (al netto dell'IVA sugli acquisti)</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="breakdown">
                <InvoiceBreakdownTable projection={projection} params={params} />
              </TabsContent>

              <TabsContent value="cashflow">
                <TooltipProvider>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mese</TableHead>
                        <TableHead className="text-right">Contratti</TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="underline decoration-dotted cursor-help">
                              Inviati a Grossista
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              I contratti firmati nel mese X vengono inviati al SII/grossista nel mese X+1 e attivati in fornitura nel mese X+2. Questa colonna mostra i contratti in transito verso il grossista.
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right">Attivati</TableHead>
                        <TableHead className="text-right">Switch-out</TableHead>
                        <TableHead className="text-right">
                          <Tooltip>
                            <TooltipTrigger className="underline decoration-dotted cursor-help">
                              Clienti Attivi
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Clienti effettivamente in fornitura. Include tutti i clienti attivati nei mesi precedenti al netto del churn mensile.
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
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
                          <TableCell className="text-right text-yellow-600">
                            {month.sentToWholesaler > 0 ? month.sentToWholesaler : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {month.activatedCustomers > 0 ? (
                              <Badge variant="outline" className="text-green-600">
                                +{month.activatedCustomers}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {month.churnedCustomers > 0 ? (
                              <Badge variant="outline" className="text-red-600">
                                -{month.churnedCustomers}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{month.activeCustomers}</TableCell>
                          <TableCell className="text-right">
                            {month.fatturaTotale > 0 ? formatCurrency(month.fatturaTotale) : '-'}
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
                </TooltipProvider>
              </TabsContent>

              <TabsContent value="chart">
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Fatturato, Margine e Incasso</CardTitle>
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
                            fillOpacity={0.2}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="margine" 
                            name="Margine"
                            stroke="hsl(142, 76%, 36%)" 
                            fill="hsl(142, 76%, 36%)" 
                            fillOpacity={0.4}
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
