import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Receipt, 
  Building2, 
  Landmark, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useTaxFlows, TaxFlowsSummary } from '@/hooks/useTaxFlows';
import { useRevenueSimulation, RevenueSimulationData } from '@/hooks/useRevenueSimulation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TaxRegimeConfig } from './TaxRegimeConfig';
import { TaxDeadlinesAlert } from './TaxDeadlinesAlert';

interface TaxFlowsDashboardProps {
  projectId: string | null;
  simulationData?: { data: RevenueSimulationData; loading: boolean };
  onUpdateParams?: (key: string, value: any) => void;
  onSaveSimulation?: () => Promise<any>;
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
    maximumFractionDigits: 2,
  }).format(value);
};

export const TaxFlowsDashboard = ({ projectId, simulationData, onUpdateParams, onSaveSimulation }: TaxFlowsDashboardProps) => {
  const ownSimHook = useRevenueSimulation(simulationData ? null : projectId);
  const simData = simulationData?.data ?? ownSimHook.data;
  const simLoading = simulationData?.loading ?? ownSimHook.loading;
  const updateParams = onUpdateParams ?? ownSimHook.updateParams;
  const saveSimulation = onSaveSimulation ?? ownSimHook.saveSimulation;
  const ivaRegime = simData.params.ivaPaymentRegime;
  const { taxFlows, loading } = useTaxFlows(projectId, ivaRegime, { simulationData: { data: simData, loading: simLoading } });

  const handleIvaRegimeChange = async (regime: 'monthly' | 'quarterly') => {
    updateParams('ivaPaymentRegime', regime);
    // Auto-save after a short delay
    setTimeout(() => saveSimulation(), 500);
  };

  if (loading || simLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!taxFlows.hasData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Nessun dato disponibile.</p>
          <p className="text-sm">Configura prima il simulatore di ricavi per vedere i flussi fiscali.</p>
        </CardContent>
      </Card>
    );
  }

  // Identify months with significant tax payments for highlighting
  const quarterlyPaymentMonths = taxFlows.monthlyData.filter(m => m.acciseVersamento > 0);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* IVA Summary */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              IVA Netta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(taxFlows.totaleIvaDebito - taxFlows.totaleIvaCredito)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Debito (incassata):</span>
                <span className="text-red-600">{formatCurrency(taxFlows.totaleIvaDebito)}</span>
              </div>
              <div className="flex justify-between">
                <span>Credito (su costi):</span>
                <span className="text-green-600">-{formatCurrency(taxFlows.totaleIvaCredito)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accise Summary */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4 text-amber-600" />
              Accise (ADM)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Versamento trimestrale all'Agenzia delle Dogane</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(taxFlows.totaleAcciseVersate)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <div className="flex justify-between">
                <span>Incassate dai clienti:</span>
                <span>{formatCurrency(taxFlows.totaleAcciseIncassate)}</span>
              </div>
              <Badge variant="outline" className="mt-1 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Trimestrale
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Oneri Sistema */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              Oneri Sistema
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>ASOS + ARIM riversati ai Distributori (DSO)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {formatCurrency(taxFlows.totaleOneriRiversati)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <div className="flex justify-between">
                <span>Incassati:</span>
                <span>{formatCurrency(taxFlows.totaleOneriIncassati)}</span>
              </div>
              <Badge variant="outline" className="mt-1 text-xs">
                Mensile → DSO
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Tax Outflows */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Uscite Fiscali Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {formatCurrency(taxFlows.totaleTaxOutflows)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <div className="flex justify-between">
                <span>F24 (IVA):</span>
                <span>{formatCurrency(taxFlows.totaleIvaVersamenti)}</span>
              </div>
              <div className="flex justify-between">
                <span>Trasporto:</span>
                <span>{formatCurrency(taxFlows.totaleTrasportoVersato)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important Notice */}
      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-400">
                Flussi Fiscali ≠ Costi
              </p>
              <p className="text-muted-foreground mt-1">
                Questi flussi rappresentano <strong>partite di giro</strong>: importi incassati dai clienti e riversati a terzi (Erario, ADM, DSO). 
                Non sono costi operativi ma impattano la liquidità per il timing di incasso vs pagamento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Deadlines Alert */}
      <TaxDeadlinesAlert 
        projectId={projectId} 
        startDate={simData.startDate} 
        ivaRegime={ivaRegime}
        sharedTaxFlows={{ taxFlows, loading }}
      />

      {/* Tax Regime Configuration */}
      <TaxRegimeConfig 
        ivaRegime={ivaRegime} 
        onIvaRegimeChange={handleIvaRegimeChange} 
      />

      {/* Detailed Tabs */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Dettaglio Mensile</TabsTrigger>
          <TabsTrigger value="iva">Posizione IVA</TabsTrigger>
          <TabsTrigger value="accise">Scadenze Accise</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flussi Fiscali Mensili</CardTitle>
              <CardDescription>
                Dettaglio incassi e versamenti per categoria fiscale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mese</TableHead>
                      <TableHead className="text-right">Clienti</TableHead>
                      <TableHead className="text-right text-blue-600">IVA Debito</TableHead>
                      <TableHead className="text-right text-green-600">IVA Credito</TableHead>
                      <TableHead className="text-right text-blue-700">F24 IVA</TableHead>
                      <TableHead className="text-right text-amber-600">Accise Inc.</TableHead>
                      <TableHead className="text-right text-amber-700">Accise Vers.</TableHead>
                      <TableHead className="text-right text-purple-600">Oneri</TableHead>
                      <TableHead className="text-right text-red-600 font-medium">Tot. Uscite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxFlows.monthlyData.map((month) => (
                      <TableRow 
                        key={month.month}
                        className={month.acciseVersamento > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                      >
                        <TableCell className="font-medium">
                          {month.monthLabel}
                          {month.acciseVersamento > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">Q</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{month.clientiFatturati}</TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrencyDecimal(month.ivaDebito)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          -{formatCurrencyDecimal(month.ivaCredito)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-700">
                          {month.ivaPayment > 0 ? formatCurrencyDecimal(month.ivaPayment) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          {formatCurrencyDecimal(month.acciseIncassate)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-700">
                          {month.acciseVersamento > 0 ? formatCurrencyDecimal(month.acciseVersamento) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-purple-600">
                          {formatCurrencyDecimal(month.oneriRiversamento)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrencyDecimal(month.totaleTaxOutflows)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iva" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Posizione IVA Mensile
              </CardTitle>
              <CardDescription>
                Calcolo della posizione netta IVA e scadenze F24
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                      IVA a Debito
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(taxFlows.totaleIvaDebito)}
                    </div>
                    <div className="text-xs text-muted-foreground">Incassata da clienti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                      IVA a Credito
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(taxFlows.totaleIvaCredito)}
                    </div>
                    <div className="text-xs text-muted-foreground">Pagata su acquisti</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Versamenti F24</div>
                    <div className="text-xl font-bold text-blue-600">
                      {formatCurrency(taxFlows.totaleIvaVersamenti)}
                    </div>
                    <div className="text-xs text-muted-foreground">Pagati all'Erario</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mese</TableHead>
                      <TableHead className="text-right">Fatturato</TableHead>
                      <TableHead className="text-right">IVA Debito</TableHead>
                      <TableHead className="text-right">IVA Credito</TableHead>
                      <TableHead className="text-right">Posizione Netta</TableHead>
                      <TableHead className="text-right">F24 (16 mese succ.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxFlows.monthlyData.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.monthLabel}</TableCell>
                        <TableCell className="text-right">{formatCurrency(month.fatturato)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrencyDecimal(month.ivaDebito)}</TableCell>
                        <TableCell className="text-right text-green-600">-{formatCurrencyDecimal(month.ivaCredito)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrencyDecimal(month.ivaNetPosition)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          {month.ivaPayment > 0 ? formatCurrencyDecimal(month.ivaPayment) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accise" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Scadenze Accise (ADM)
              </CardTitle>
              <CardDescription>
                Versamenti trimestrali all'Agenzia delle Dogane e dei Monopoli
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">Calendario Versamenti</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium">Q1</div>
                      <div className="text-xs text-muted-foreground">Entro 16 Aprile</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium">Q2</div>
                      <div className="text-xs text-muted-foreground">Entro 16 Luglio</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium">Q3</div>
                      <div className="text-xs text-muted-foreground">Entro 16 Ottobre</div>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <div className="font-medium">Q4</div>
                      <div className="text-xs text-muted-foreground">Entro 16 Gennaio</div>
                    </div>
                  </div>
                </div>

                {quarterlyPaymentMonths.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mese Versamento</TableHead>
                        <TableHead className="text-right">Accise Incassate (Q)</TableHead>
                        <TableHead className="text-right">Importo Versamento</TableHead>
                        <TableHead>Destinatario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quarterlyPaymentMonths.map((month) => (
                        <TableRow key={month.month} className="bg-amber-50/50 dark:bg-amber-950/20">
                          <TableCell className="font-medium">
                            {month.monthLabel}
                            <Badge variant="outline" className="ml-2">Scadenza Q</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(month.acciseIncassate * 3)}</TableCell>
                          <TableCell className="text-right font-bold text-amber-700">
                            {formatCurrency(month.acciseVersamento)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">ADM</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Landmark className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nessuna scadenza accise nel periodo simulato.</p>
                    <p className="text-sm">Le accise saranno visibili quando ci saranno clienti fatturati.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
