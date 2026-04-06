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

interface ResellerRevenueSimulatorProps {
  projectId: string;
  simulationHook: ReturnType<typeof useRevenueSimulation>;
}

interface MonthData {
  month: number;
  label: string;
  newContracts: number;
  sentToWholesaler: number;
  activatedCustomers: number;
  churnedCustomers: number;
  activeCustomers: number;
  invoicedCustomers: number;
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  commercialeReseller: number;
  imponibileTotale: number;
  iva: number;
  fatturaTotale: number;
  margineCCV: number;
  margineSpread: number;
  margineAltro: number;
  margineTotale: number;
  expectedCollection: number;
  cumulativeCollection: number;
  cumulativeUncollected: number;
  pendingReceivables: number;
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

  const { engineResult } = useEngineResult(projectId, {
    simulationData: { data, loading },
  });

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
      materiaEnergia: m.materiaEnergiaTotale,
      trasporto: m.trasportoTotale,
      oneriSistema: m.oneriSistemaTotale,
      accise: m.acciseTotale,
      commercialeReseller: m.margineCommerciale,
      imponibileTotale: m.fatturato - m.ivaTotale,
      iva: m.ivaTotale,
      fatturaTotale: m.fatturato,
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

    let cumCollection = 0;
    let cumUncollected = 0;
    let cumInvoiced = 0;
    for (const md of mapped) {
      cumInvoiced += md.fatturaTotale;
      cumCollection += md.expectedCollection;
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

  const chartData = projection.map(m => ({
    name: m.label,
    fatturato: m.fatturaTotale,
    margine: m.margineTotale,
    incassato: m.expectedCollection,
    clientiAttivi: m.activeCustomers,
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Caricamento configurazione...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline ciclo di vita */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Simulatore Fatturazione Reseller Energia
              </CardTitle>
              <CardDescription>
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
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Mese X</p>
                <p className="text-muted-foreground text-xs">Contratto firmato</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <Clock className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+1</p>
                <p className="text-muted-foreground text-xs">Invio a Grossista / SII</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-medium">Mese X+2</p>
                <p className="text-muted-foreground text-xs">Inizio fornitura e fattura</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <CreditCard className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Mese X+3</p>
                <p className="text-muted-foreground text-xs">Primo incasso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proiezione */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Composizione Fatturato */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Composizione Fatturato</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Materia Energia (PUN+Disp)</span>
                    <span className="text-sm font-medium">{formatCurrency(projection.reduce((s, m) => s + m.materiaEnergia, 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trasporto & Distribuzione</span>
                    <span className="text-sm font-medium">{formatCurrency(projection.reduce((s, m) => s + m.trasporto, 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Oneri di Sistema</span>
                    <span className="text-sm font-medium">{formatCurrency(projection.reduce((s, m) => s + m.oneriSistema, 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Accise</span>
                    <span className="text-sm font-medium">{formatCurrency(projection.reduce((s, m) => s + m.accise, 0))}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-sm font-semibold">Margine Reseller</span>
                    <span className="font-bold">{formatCurrency(totals.totalMargine)}</span>
                  </div>
                  <div className="ml-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">↳ CCV (Commercializzazione)</span>
                      <span className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">{formatCurrency(projection.reduce((s, m) => s + m.margineCCV, 0))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">↳ Spread su PUN/PSV</span>
                      <span className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">{formatCurrency(projection.reduce((s, m) => s + m.margineSpread, 0))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">↳ Altri servizi</span>
                      <span className="text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">{formatCurrency(projection.reduce((s, m) => s + m.margineAltro, 0))}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">IVA</span>
                    <span className="text-sm font-medium">{formatCurrency(totals.totalIva)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">TOTALE FATTURATO</span>
                    <span className="font-bold text-lg text-foreground">{formatCurrency(totals.totalFatturato)}</span>
                  </div>
                </div>

                {/* Stato Incassi */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Stato Incassi</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Incassato</span>
                    <span className="text-sm font-medium">{formatCurrency(totals.totalCollected)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-600 dark:text-amber-400">◷ In sospeso</span>
                    <span className="text-sm font-medium">{formatCurrency(totals.totalPending)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-destructive">✗ Insoluti</span>
                    <span className="text-sm font-medium">{formatCurrency(totals.totalUncollected)}</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="font-medium mb-2 text-sm text-foreground">💡 Cosa rappresentano questi numeri</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong className="text-foreground">Fatturato</strong>: importo totale che pagano i clienti (IVA inclusa)</li>
                  <li>• <strong className="text-foreground">Passanti</strong>: costi da girare a grossista, distributore, CSEA (PUN, trasporto, oneri)</li>
                  <li>• <strong className="text-emerald-600 dark:text-emerald-400">Margine</strong>: il ricavo effettivo del reseller (CCV + Spread + Altro)</li>
                  <li>• <strong className="text-foreground">IVA</strong>: da versare all'Erario (al netto dell'IVA sugli acquisti)</li>
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
                            I contratti firmati nel mese X vengono inviati al SII/grossista nel mese X+1 e attivati in fornitura nel mese X+2.
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
                        <TableCell className="text-right text-amber-600 dark:text-amber-400">
                          {month.sentToWholesaler > 0 ? month.sentToWholesaler : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {month.activatedCustomers > 0 ? (
                            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                              +{month.activatedCustomers}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {month.churnedCustomers > 0 ? (
                            <Badge variant="outline" className="text-destructive border-destructive/30">
                              -{month.churnedCustomers}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{month.activeCustomers}</TableCell>
                        <TableCell className="text-right">
                          {month.fatturaTotale > 0 ? formatCurrency(month.fatturaTotale) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          {month.expectedCollection > 0 ? formatCurrency(month.expectedCollection) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 dark:text-amber-400">
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
                <div className="rounded-lg border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Fatturato, Margine e Incasso</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
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
                        stroke="hsl(var(--chart-2))" 
                        fill="hsl(var(--chart-2))" 
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
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Crescita Clienti Attivi</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
