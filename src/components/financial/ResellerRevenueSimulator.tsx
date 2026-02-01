import { useMemo, useState } from 'react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Loader2,
  ChevronDown,
  Receipt
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
import { useRevenueSimulation, type RevenueSimulationParams } from '@/hooks/useRevenueSimulation';
import { InvoiceComponentsInput } from './InvoiceComponentsInput';
import { InvoiceBreakdownTable } from './InvoiceBreakdownTable';

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
  const [showInvoiceParams, setShowInvoiceParams] = useState(false);

  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();

  // Calcola proiezione 14 mesi con fattura completa
  const projection = useMemo(() => {
    const months: MonthData[] = [];
    const invoicesToCollect: { month: number; amount: number }[] = [];
    
    let cumulativeActiveCustomers = 0;
    let cumulativeCollection = 0;
    let cumulativeUncollected = 0;
    
    // Calcola costi mensili per singolo cliente
    const kWh = params.avgMonthlyConsumption;
    
    // Componenti passanti per cliente/mese
    const materiaEnergiaPerCliente = (params.punPerKwh + params.dispacciamentoPerKwh) * kWh;
    const trasportoPerCliente = 
      (params.trasportoQuotaFissaAnno / 12) + 
      (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw / 12) +
      (params.trasportoQuotaEnergiaKwh * kWh);
    const oneriPerCliente = (params.oneriAsosKwh + params.oneriArimKwh) * kWh;
    const accisePerCliente = params.acciseKwh * kWh;
    
    // Componenti margine per cliente/mese
    const ccvPerCliente = params.ccvMonthly;
    const spreadPerCliente = params.spreadPerKwh * kWh;
    const altroPerCliente = params.otherServicesMonthly;
    const marginePerCliente = ccvPerCliente + spreadPerCliente + altroPerCliente;
    
    // Totale imponibile per cliente
    const imponibilePerCliente = materiaEnergiaPerCliente + trasportoPerCliente + 
                                  oneriPerCliente + accisePerCliente + marginePerCliente;
    const ivaPerCliente = imponibilePerCliente * (params.ivaPercent / 100);
    const fatturaPerCliente = imponibilePerCliente + ivaPerCliente;
    
    for (let m = 0; m < 14; m++) {
      const monthIndex = (startMonth + m) % 12;
      const year = startYear + Math.floor((startMonth + m) / 12);
      const label = `${MONTHS_IT[monthIndex]} ${year}`;
      
      // Contratti firmati questo mese
      const newContracts = m < 12 ? monthlyContracts[m] : 0;
      
      // Invio grossista: contratti del mese precedente
      const sentToWholesaler = m >= 1 ? (m - 1 < 12 ? monthlyContracts[m - 1] : 0) : 0;
      
      // Attivazioni: contratti di 2 mesi fa dopo scrematura SII
      const activatedCustomers = m >= 2
        ? Math.round((m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)) 
        : 0;
      
      // Calcola churn (switch-out) - applicato ai clienti già attivi dal mese precedente
      // Il churn si applica solo ai clienti già in fornitura (dal mese 3 in poi hanno clienti attivi)
      const churnedCustomers = m >= 3 
        ? Math.round(cumulativeActiveCustomers * (params.monthlyChurnRate / 100))
        : 0;
      
      // Aggiorna clienti attivi: nuovi meno churned
      cumulativeActiveCustomers = Math.max(0, cumulativeActiveCustomers + activatedCustomers - churnedCustomers);
      
      // Clienti da fatturare = tutti i clienti attivi al mese precedente
      // Prima fattura arriva al mese X+3 (1 mese dopo attivazione)
      const invoicedCustomers = m >= 3 
        ? Math.max(0, cumulativeActiveCustomers)
        : 0;
      
      // Calcolo fattura totale per questo mese
      const materiaEnergia = invoicedCustomers * materiaEnergiaPerCliente;
      const trasporto = invoicedCustomers * trasportoPerCliente;
      const oneriSistema = invoicedCustomers * oneriPerCliente;
      const accise = invoicedCustomers * accisePerCliente;
      
      const margineCCV = invoicedCustomers * ccvPerCliente;
      const margineSpread = invoicedCustomers * spreadPerCliente;
      const margineAltro = invoicedCustomers * altroPerCliente;
      const commercialeReseller = margineCCV + margineSpread + margineAltro;
      const margineTotale = commercialeReseller;
      
      const imponibileTotale = materiaEnergia + trasporto + oneriSistema + accise + commercialeReseller;
      const iva = imponibileTotale * (params.ivaPercent / 100);
      const fatturaTotale = imponibileTotale + iva;
      
      // Aggiungi alla coda degli incassi
      if (fatturaTotale > 0) {
        invoicesToCollect.push({ month: m, amount: fatturaTotale });
      }
      
      // Calcola incassi per questo mese
      let expectedCollection = 0;
      
      invoicesToCollect.forEach(invoice => {
        const monthsAfterInvoice = m - invoice.month;
        
        if (monthsAfterInvoice === 0) {
          expectedCollection += invoice.amount * (params.collectionMonth0 / 100);
        } else if (monthsAfterInvoice === 1) {
          expectedCollection += invoice.amount * (params.collectionMonth1 / 100);
        } else if (monthsAfterInvoice === 2) {
          expectedCollection += invoice.amount * (params.collectionMonth2 / 100);
        } else if (monthsAfterInvoice === 3) {
          expectedCollection += invoice.amount * (params.collectionMonth3Plus / 100);
        }
        if (monthsAfterInvoice === 4) {
          cumulativeUncollected += invoice.amount * (params.uncollectibleRate / 100);
        }
      });
      
      cumulativeCollection += expectedCollection;
      
      const totalInvoiced = invoicesToCollect.reduce((sum, inv) => sum + inv.amount, 0);
      const pendingReceivables = totalInvoiced - cumulativeCollection - cumulativeUncollected;
      
      months.push({
        month: m,
        label,
        newContracts,
        sentToWholesaler,
        activatedCustomers,
        churnedCustomers,
        activeCustomers: cumulativeActiveCustomers,
        invoicedCustomers,
        
        // Componenti fattura
        materiaEnergia,
        trasporto,
        oneriSistema,
        accise,
        commercialeReseller,
        imponibileTotale,
        iva,
        fatturaTotale,
        
        // Margine
        margineCCV,
        margineSpread,
        margineAltro,
        margineTotale,
        
        // Incassi
        expectedCollection,
        cumulativeCollection,
        cumulativeUncollected,
        pendingReceivables: Math.max(0, pendingReceivables),
        
        // Legacy
        invoicedAmount: fatturaTotale,
        revenueCCV: margineCCV,
        revenueSpread: margineSpread,
        revenueOther: margineAltro,
      });
    }
    
    return months;
  }, [params, startMonth, startYear, monthlyContracts]);

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
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Simulatore Fatturazione Reseller Energia
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Modello completo: fattura cliente → componenti passanti → margine reseller → incasso
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
            {/* Data Inizio */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Inizio Attività Commerciali
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mese</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

            {/* Clienti per Mese */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contratti Target per Mese
              </h4>
              <div className="grid grid-cols-3 gap-2">
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
                <span className="font-medium">Totale: </span>
                {monthlyContracts.reduce((a, b) => a + b, 0)} contratti
              </div>
            </div>

            <Separator />

            {/* Consumo e Attivazione */}
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
                        <p>Residenziale tipico: 150-250 kWh/mese</p>
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
                <Label>Tasso attivazione (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={params.activationRate}
                  onChange={(e) => updateParams('activationRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Switch-out mensile (%)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>
                        <p>Percentuale di clienti che abbandonano ogni mese</p>
                        <p className="text-xs text-muted-foreground">Tipico mercato libero: 1-3%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={params.monthlyChurnRate}
                  onChange={(e) => updateParams('monthlyChurnRate', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground text-orange-600">
                  = ~{Math.round((1 - Math.pow(1 - params.monthlyChurnRate/100, 12)) * 100)}% abbandono annuo
                </p>
              </div>
            </div>

            <Separator />

            {/* Componenti Margine Reseller */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                Margine Reseller
              </h4>
              
              <div className="space-y-2">
                <Label>CCV (€/mese)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={params.ccvMonthly}
                  onChange={(e) => updateParams('ccvMonthly', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Spread su PUN (€/kWh)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={params.spreadPerKwh}
                  onChange={(e) => updateParams('spreadPerKwh', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  = {formatCurrencyDecimal(params.spreadPerKwh * params.avgMonthlyConsumption)}/mese
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
                <p className="text-sm font-medium text-green-700">Margine per cliente/mese</p>
                <p className="text-xl font-bold text-green-800">
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
                  <Label className="text-xs">Alla scadenza (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth0}
                    onChange={(e) => updateParams('collectionMonth0', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entro 30gg (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth1}
                    onChange={(e) => updateParams('collectionMonth1', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entro 60gg (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth2}
                    onChange={(e) => updateParams('collectionMonth2', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Oltre 60gg (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={params.collectionMonth3Plus}
                    onChange={(e) => updateParams('collectionMonth3Plus', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Insoluti definitivi (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={params.uncollectibleRate}
                  onChange={(e) => updateParams('uncollectibleRate', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <Separator />

            {/* Componenti Fattura (collapsible) */}
            <Collapsible open={showInvoiceParams} onOpenChange={setShowInvoiceParams}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Componenti Fattura Passanti
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showInvoiceParams ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <InvoiceComponentsInput params={params} onUpdate={updateParams} />
              </CollapsibleContent>
            </Collapsible>

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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mese</TableHead>
                        <TableHead className="text-right">Contratti</TableHead>
                        <TableHead className="text-right">Attivati</TableHead>
                        <TableHead className="text-right">Switch-out</TableHead>
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
