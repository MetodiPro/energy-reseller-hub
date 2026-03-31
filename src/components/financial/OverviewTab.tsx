import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, Target, Percent, Calculator, Zap, Users, Info,
  ArrowRight, Wallet, ShieldAlert, CreditCard, AlertTriangle, Landmark,
} from 'lucide-react';
import { FinancialAlerts } from './FinancialAlerts';
import { FinancialTrendChart } from './FinancialTrendChart';
import { BreakEvenAnalysis } from './BreakEvenAnalysis';
import { FinancialGlossary } from './FinancialGlossary';
import { MarketDataBar } from './MarketDataBar';
import type { SalesChannel } from '@/hooks/useSalesChannels';
import type { FinancialOverviewSummary } from '@/hooks/useFinancialSummary';
import type { SimulationSummary } from '@/hooks/useSimulationSummary';
import type { CashFlowSummary } from '@/hooks/useCashFlowAnalysis';
import type { RevenueSimulationData } from '@/hooks/useRevenueSimulation';
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const COLORS = {
  commercial: 'hsl(var(--chart-1))',
  structural: 'hsl(var(--chart-2))',
  direct: 'hsl(var(--chart-3))',
  indirect: 'hsl(var(--chart-4))',
};

const COST_TYPE_LABELS: Record<string, string> = {
  commercial: 'Commerciali',
  structural: 'Strutturali',
  direct: 'Diretti',
  indirect: 'Indiretti',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

interface OverviewTabProps {
  summary: FinancialOverviewSummary;
  simulationSummary: SimulationSummary;
  cashFlowData: CashFlowSummary;
  cashFlowLoading: boolean;
  salesChannels: SalesChannel[];
  getChannelBreakdown: (total: number) => { channel_name: string; cost: number; commission_amount: number; commission_type: string; contracts: number; activations: number }[];
  simulationData?: RevenueSimulationData;
  onUsePunLive?: (punPerKwh: number) => void;
  onNavigateToTariffs?: () => void;
}

export const OverviewTab = ({
  summary, simulationSummary, cashFlowData, cashFlowLoading,
  salesChannels, getChannelBreakdown, simulationData,
  onUsePunLive, onNavigateToTariffs,
}: OverviewTabProps) => {
  const strutturaliCosts = summary.costsByType.structural + summary.costsByType.direct + summary.costsByType.indirect;

  // Breakdown passanti per detail
  const materiaEnergiaTotale = simulationSummary.costiMensili?.reduce((s, m) => s + (m.materiaEnergia || 0), 0) || 0;
  const dispacciamentoTotale = simulationSummary.costiMensili?.reduce((s, m) => s + (m.dispacciamento || 0), 0) || 0;
  const trasportoTotale = simulationSummary.costiMensili?.reduce((s, m) => s + (m.trasporto || 0), 0) || 0;
  const oneriTotale = simulationSummary.costiMensili?.reduce((s, m) => s + (m.oneriSistema || 0), 0) || 0;
  const acciseTotale = simulationSummary.costiMensili?.reduce((s, m) => s + (m.accise || 0), 0) || 0;
  // Materia Energia include PUN+Dispacciamento; la quota PUN pura è la differenza
  const punPuroTotale = materiaEnergiaTotale - dispacciamentoTotale;

  // Pie data for cost breakdown chart
  const pieData = (() => {
    const entries: { name: string; value: number; color: string }[] = [];
    if (summary.hasSimulationData && summary.passthroughCosts > 0) {
      entries.push({ name: 'Passanti (energia, trasporto, oneri)', value: summary.passthroughCosts, color: 'hsl(var(--chart-5))' });
    }
    if (summary.costiCommercialiSimulati > 0) {
      entries.push({ name: 'Commerciali (canali vendita)', value: summary.costiCommercialiSimulati, color: COLORS.commercial });
    }
    Object.entries(summary.costsByType)
      .filter(([key, value]) => {
        if (value <= 0) return false;
        if (key === 'commercial' && summary.costiCommercialiSimulati > 0) return false;
        return true;
      })
      .forEach(([key, value]) => {
        entries.push({ name: COST_TYPE_LABELS[key] || key, value, color: COLORS[key as keyof typeof COLORS] || 'hsl(var(--chart-1))' });
      });
    return entries;
  })();

  const totalContracts = summary.contrattiTotali || 0;
  const breakdown = getChannelBreakdown(totalContracts);
  const totalChannelCost = breakdown.reduce((s, ch) => s + ch.cost, 0);
  const channelPieData = breakdown
    .filter(ch => ch.cost > 0)
    .map((ch, i) => ({
      name: ch.channel_name,
      value: ch.cost,
      percent: totalChannelCost > 0 ? (ch.cost / totalChannelCost) * 100 : 0,
      color: `hsl(var(--chart-${(i % 5) + 1}))`,
    }));

  return (
    <div className="space-y-6">
      <FinancialAlerts summary={summary} />

      {/* ═══════════════════════════════════════════════════════════════════
          SEZIONE 1 — ESITI ECONOMICI
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Esiti Economici
          </CardTitle>
          <CardDescription>
            Risultati di competenza: ricavi, costi e margini operativi del periodo di simulazione (14 mesi).
            Tutti i margini sono calcolati sul fatturato netto (imponibile, al netto dell'IVA).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <TooltipProvider delayDuration={200}>
            <div className="divide-y">
              {/* 1. Clienti Attivi */}
              <EconomicRow
                label="Clienti Attivi"
                tooltip="Numero di POD con fornitura attiva al termine del periodo (mese 14). Non coincide con i contratti firmati: solo una quota (tasso di attivazione) si converte in attivazioni SII effettive, e da queste si sottraggono le cessazioni (churn) con il delay procedurale di 2 mesi previsto dal sistema SII."
                value={String(summary.clientiAttivi)}
                detail={`Calcolo: ${summary.contrattiTotali} contratti firmati × tasso attivazione (${simulationData?.params?.activationRate ?? 85}%) = ~${Math.round(summary.contrattiTotali * (simulationData?.params?.activationRate ?? 85) / 100)} attivazioni − ${summary.contrattiTotali - summary.clientiAttivi - Math.round(summary.contrattiTotali * (100 - (simulationData?.params?.activationRate ?? 85)) / 100)} cessazioni churn (con delay 2 mesi SII) = ${summary.clientiAttivi} clienti attivi a fine periodo. Nota: i contratti non attivati (~${Math.round(summary.contrattiTotali * (100 - (simulationData?.params?.activationRate ?? 85)) / 100)}) riflettono il tasso di conversione switching.`}
                icon={<Users className="h-4 w-4" />}
              />
              {/* 2. Fatturato Lordo */}
              <EconomicRow
                label="Fatturato Lordo"
                tooltip="Volume complessivo d'affari: tutto ciò che il reseller fattura ai clienti finali. Include margine reseller, costi passanti (trasporto, oneri, accise) e IVA. Non rappresenta il guadagno ma il giro d'affari totale."
                value={formatCurrency(summary.totalRevenue)}
                valueClass="text-primary"
                detail={`Composizione: Imponibile ${formatCurrency(summary.imponibile)} + IVA ${formatCurrency(summary.totalIva)} = ${formatCurrency(summary.totalRevenue)}. Include ricavi propri del reseller e partite di giro.`}
                icon={<DollarSign className="h-4 w-4" />}
              />
              {/* 3. Fatturato Netto */}
              <EconomicRow
                label="Fatturato Netto (Imponibile)"
                tooltip="Totale dei ricavi al netto dell'IVA. Questa è la base su cui vengono calcolate tutte le percentuali di margine. Include i ricavi propri del reseller (CCV + spread) e le partite di giro (trasporto, oneri, accise)."
                value={formatCurrency(summary.imponibile)}
                valueClass="text-primary"
                detail={`Calcolo: Fatturato Lordo ${formatCurrency(summary.totalRevenue)} − IVA ${formatCurrency(summary.totalIva)} = ${formatCurrency(summary.imponibile)}.`}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              {/* 4. Costo Energia al Grossista */}
              <EconomicRow
                label="Costo Energia al Grossista"
                tooltip="Quanto il reseller paga effettivamente al grossista per l'energia: PUN (prezzo mercato) × kWh consumati + spread grossista × kWh. NON include trasporto, oneri e accise che sono partite di giro neutrali per il margine."
                value={formatCurrency(summary.costoEnergiaNetto)}
                valueClass="text-destructive"
                detail={`Calcolo: (PUN + Spread Grossista) × kWh consumati, cumulato su 14 mesi = ${formatCurrency(summary.costoEnergiaNetto)}. Non include Fee POD (${formatCurrency(summary.costoGestionePodTotale)}) né partite di giro.`}
                icon={<Zap className="h-4 w-4" />}
              />
              {/* 5. Costi Passanti Totali */}
              <EconomicRow
                label="Costi Passanti Totali"
                tooltip="Importi fatturati al cliente che transitano integralmente verso terzi, senza impatto sul margine. Composizione: (1) Materia Energia (PUN con perdite di rete): costo della commodity acquistata dal grossista. (2) Dispacciamento: incassato in bolletta e compensato nella fattura del grossista — partita di giro nella fattura energia. (3) Trasporto DSO: riversato al distributore locale. (4) Oneri di Sistema (ASOS/ARIM): riversati al GSE/CSEA. (5) Accise: versate all'Agenzia Dogane e Monopoli. Tutte queste componenti hanno impatto netto sul margine = zero."
                value={formatCurrency(summary.passthroughCosts)}
                valueClass="text-orange-600"
                detail={`Composizione: Materia Energia PUN (→ grossista) ${formatCurrency(punPuroTotale)} + Dispacciamento (→ grossista/Terna) ${formatCurrency(dispacciamentoTotale)} + Trasporto (→ DSO) ${formatCurrency(trasportoTotale)} + Oneri ASOS/ARIM (→ GSE) ${formatCurrency(oneriTotale)} + Accise (→ ADM) ${formatCurrency(acciseTotale)} = ${formatCurrency(summary.passthroughCosts)}. Impatto netto sul margine reseller: zero.`}
                icon={<ArrowRight className="h-4 w-4" />}
              />
              {/* 6. Fee Gestione POD */}
              <EconomicRow
                label="Fee Gestione POD"
                tooltip="Costo unitario mensile che il grossista addebita al reseller per ogni POD (punto di prelievo) gestito. Copre servizi di billing, SII, gestione switching e assistenza tecnica."
                value={formatCurrency(summary.costoGestionePodTotale)}
                valueClass="text-destructive"
                detail={`Calcolo: Fee mensile per POD × clienti attivi mese per mese, cumulata su 14 mesi = ${formatCurrency(summary.costoGestionePodTotale)}.`}
                icon={<Calculator className="h-4 w-4" />}
              />
              {/* 7. Margine Commerciale Lordo */}
              <EconomicRowHighlight
                label="Margine Commerciale Lordo"
                tooltip="Ricavi propri del reseller (CCV + Spread + Altri Servizi) meno il costo reale pagato al grossista per l'energia (PUN + Spread Grossista) e la Fee POD. I Costi Passanti (trasporto, oneri, accise) sono esclusi perché sono partite di giro perfettamente neutrali: incassati dal cliente e riversati a terzi per lo stesso importo, impatto netto sul margine = zero."
                value={formatCurrency(summary.margineCommercialeLordo)}
                percentValue={formatPercent(summary.margineCommercialePercent)}
                positive={summary.margineCommercialeLordo >= 0}
                detail={`Calcolo: Ricavi Reseller (CCV + Spread) ${formatCurrency(summary.resellerMargin)} − Costo Energia Grossista ${formatCurrency(summary.costoEnergiaNetto)} − Fee POD ${formatCurrency(summary.costoGestionePodTotale)} = ${formatCurrency(summary.margineCommercialeLordo)}. I passanti (trasporto, oneri, accise, dispacciamento) sono esclusi: il reseller li incassa e li riversa per lo stesso importo.`}
                icon={<Target className="h-4 w-4" />}
              />
              {/* 8. Costi Commerciali */}
              <EconomicRow
                label="Costi Commerciali"
                tooltip="Provvigioni e commissioni pagate ai canali di vendita (agenti, teleselling, web, sportelli) per l'acquisizione e attivazione dei contratti. Calcolate in base ai tassi medi di canale configurati."
                value={formatCurrency(summary.costiCommercialiSimulati)}
                valueClass="text-orange-600"
                detail={summary.costiCommercialiSimulati > 0
                  ? `Calcolo: Σ (contratti per canale × commissione unitaria) = ${formatCurrency(summary.costiCommercialiSimulati)}. Su ${summary.contrattiTotali} contratti distribuiti tra i canali configurati.`
                  : 'Nessun canale di vendita configurato. Configura i canali nelle Ipotesi Operative per stimare le provvigioni.'}
                icon={<Users className="h-4 w-4" />}
              />
              {/* 8. Costi Strutturali */}
              <EconomicRow
                label="Costi Strutturali"
                tooltip="Costi fissi del reseller indipendenti dal volume clienti: affitto sede, personale, software gestionale, consulenze, assicurazioni. Configurati manualmente nella sezione Finanza > Costi."
                value={formatCurrency(strutturaliCosts)}
                valueClass="text-orange-600"
                detail={`Composizione: Strutturali ${formatCurrency(summary.costsByType.structural)} + Diretti ${formatCurrency(summary.costsByType.direct)} + Indiretti ${formatCurrency(summary.costsByType.indirect)} = ${formatCurrency(strutturaliCosts)}.`}
                icon={<Landmark className="h-4 w-4" />}
              />
              {/* 10. Margine di Contribuzione */}
              <EconomicRowHighlight
                label="Margine di Contribuzione"
                tooltip="Margine Commerciale Lordo meno i costi commerciali (provvigioni canali di vendita). Indica quanto resta per coprire i costi fissi strutturali."
                value={formatCurrency(summary.contributionMargin)}
                percentValue={formatPercent(summary.contributionMarginPercent)}
                positive={summary.contributionMargin >= 0}
                detail={`Calcolo: Margine Commerciale Lordo ${formatCurrency(summary.margineCommercialeLordo)} − Costi Commerciali ${formatCurrency(summary.costiCommercialiSimulati)} = ${formatCurrency(summary.contributionMargin)}. Pct: ${formatCurrency(summary.contributionMargin)} / ${formatCurrency(summary.imponibile)} × 100 = ${formatPercent(summary.contributionMarginPercent)}.`}
                icon={<Percent className="h-4 w-4" />}
              />
              {/* 11. Margine Netto Operativo */}
              <EconomicRowHighlight
                label="Margine Netto Operativo"
                tooltip="Margine Commerciale Lordo meno tutti i costi operativi (provvigioni + costi strutturali). Rappresenta il risultato operativo finale."
                value={formatCurrency(summary.netMargin)}
                percentValue={formatPercent(summary.netMarginPercent)}
                positive={summary.netMargin >= 0}
                detail={`Calcolo: Margine Commerciale Lordo ${formatCurrency(summary.margineCommercialeLordo)} − Costi Commerciali ${formatCurrency(summary.costiCommercialiSimulati)} − Costi Strutturali ${formatCurrency(strutturaliCosts)} = ${formatCurrency(summary.netMargin)}. Pct: ${formatCurrency(summary.netMargin)} / ${formatCurrency(summary.imponibile)} × 100 = ${formatPercent(summary.netMarginPercent)}.`}
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          SEZIONE 2 — ESITI FINANZIARI
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Esiti Finanziari
          </CardTitle>
          <CardDescription>
            Risultati di cassa: liquidità reale, crediti, impegni e saldo complessivo.
            A differenza degli esiti economici, qui conta quando i flussi avvengono, non quando maturano.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <TooltipProvider delayDuration={200}>
            <div className="divide-y">
              {/* 1. Totale Incassato */}
              <FinancialRow
                label="Totale Incassato"
                tooltip="Somma effettiva degli incassi ricevuti dai clienti nel periodo di simulazione. Tiene conto della waterfall di incasso (pagamento a scadenza, a 30gg, a 60gg, oltre 60gg) e del tasso di insolvenza."
                value={formatCurrency(summary.totalIncassato)}
                valueClass="text-green-600"
                detail={`Calcolo: Fatturato Lordo ${formatCurrency(summary.totalRevenue)} × waterfall di incasso (0-30-60-90+ gg) − Insoluti = ${formatCurrency(summary.totalIncassato)}. Verifica: Incassato + Crediti ${formatCurrency(simulationSummary.totalCrediti)} + Insoluti ${formatCurrency(summary.totalInsoluti)} = Fatturato Lordo.`}
                icon={<DollarSign className="h-4 w-4" />}
              />
              {/* 2. Crediti in Corso */}
              <FinancialRow
                label="Crediti in Corso"
                tooltip="Fatture emesse i cui incassi ricadono oltre la finestra di simulazione di 14 mesi. Include sia crediti commerciali attesi (clienti che pagheranno con ritardo) sia le tranche del waterfall non ancora scadute per le fatture degli ultimi 3 mesi (la coda a 30-60-90gg non si chiude entro il periodo simulato). Rappresenta un'uscita dalla cassa simulata, attesa ma non ancora materializzata."
                value={formatCurrency(simulationSummary.totalCrediti)}
                valueClass="text-blue-600"
                detail={`Calcolo: Fatturato Lordo ${formatCurrency(summary.totalRevenue)} − Incassato ${formatCurrency(summary.totalIncassato)} − Insoluti ${formatCurrency(summary.totalInsoluti)} = ${formatCurrency(simulationSummary.totalCrediti)}. Nota: include le tranche a 30-60-90gg non ancora incassate per le fatture degli ultimi mesi del periodo simulato.`}
                icon={<CreditCard className="h-4 w-4" />}
              />
              {/* 3. Depositi Cauzionali */}
              <FinancialRow
                label="Depositi Cauzionali"
                tooltip="Garanzie richieste dal grossista al reseller per operare. Sono un impegno finanziario (immobilizzazione di liquidità), non un costo operativo. Vengono progressivamente svincolati al maturare della storicità di pagamento."
                value={formatCurrency(simulationSummary.depositoMassimo)}
                valueClass="text-amber-600"
                detail={`Picco massimo: ${formatCurrency(simulationSummary.depositoMassimo)}. Deposito iniziale: ${formatCurrency(simulationSummary.depositoIniziale)}, a fine periodo: ${formatCurrency(simulationSummary.depositoFinale)}. Non è un costo: è capitale immobilizzato presso il grossista, potenzialmente recuperabile, che riduce la liquidità disponibile.`}
                icon={<ShieldAlert className="h-4 w-4" />}
              />
              {/* 4. Insoluti */}
              <FinancialRow
                label="Insoluti"
                tooltip="Quota di fatturato strutturalmente non incassabile, calcolata applicando il tasso di insolvenza configurato al fatturato totale. Rappresenta una perdita definitiva su crediti."
                value={formatCurrency(summary.totalInsoluti)}
                valueClass="text-destructive"
                detail={`Calcolo: Fatturato Lordo ${formatCurrency(summary.totalRevenue)} × tasso insoluti configurato = ${formatCurrency(summary.totalInsoluti)}. Perdita definitiva su crediti, applicata proporzionalmente a ogni scaglione dell'aging.`}
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              {/* 5. Massima Esposizione */}
              <FinancialRow
                label="Massima Esposizione"
                tooltip="Il punto di massima esposizione finanziaria (saldo cassa negativo più profondo). Indica il fabbisogno finanziario massimo che il reseller deve coprire con capitale proprio o finanziamenti."
                value={formatCurrency(Math.abs(cashFlowData.massimaEsposizione))}
                valueClass="text-destructive"
                detail={`Saldo cassa più basso: ${formatCurrency(cashFlowData.massimaEsposizione)} raggiunto a ${cashFlowData.meseEsposizioneMassima}. ${cashFlowData.mesePrimoPositivo ? `Break-even finanziario: ${cashFlowData.mesePrimoPositivo}.` : 'Il saldo non torna positivo nel periodo simulato.'} Determina il capitale circolante minimo necessario.`}
                icon={<TrendingDown className="h-4 w-4" />}
              />
              {/* 6. Saldo Cassa */}
              <FinancialRow
                label="Saldo Cassa (Fine Periodo)"
                tooltip="Saldo cumulativo di tutti i flussi di cassa al termine della simulazione. Tiene conto di incassi, costo commodity (PUN+Spread) più dispacciamento riversato al grossista, gestione POD, depositi cauzionali, investimenti, flussi fiscali (IVA, Accise, Oneri, Trasporto) e costi strutturali."
                value={formatCurrency(cashFlowData.saldoFinale)}
                valueClass={cashFlowData.saldoFinale >= 0 ? 'text-green-600' : 'text-destructive'}
                detail={`Calcolo: Incassi ${formatCurrency(cashFlowData.totaleIncassi)} − Costo commodity grossista (PUN+Spread) + Dispacciamento ${formatCurrency(cashFlowData.totaleCostiPassanti)} − Costi passanti riversati ${formatCurrency(cashFlowData.totaleOneriRiversati + cashFlowData.totaleTrasportoVersato)} (Trasporto DSO ${formatCurrency(cashFlowData.totaleTrasportoVersato)} + Oneri GSE ${formatCurrency(cashFlowData.totaleOneriRiversati)}) − Fee gestione POD ${formatCurrency(cashFlowData.totaleCostiOperativi)} − Costi commerciali ${formatCurrency(cashFlowData.totaleCostiCommerciali)} − Strutturali ${formatCurrency(cashFlowData.totaleCostiStrutturali)} − Δ Depositi cauzionali ${formatCurrency(cashFlowData.totaleDepositi)} − Flussi fiscali erariali ${formatCurrency(cashFlowData.totaleIvaVersamenti + cashFlowData.totaleAcciseVersate)} (IVA ${formatCurrency(cashFlowData.totaleIvaVersamenti)} + Accise ADM ${formatCurrency(cashFlowData.totaleAcciseVersate)}) − Investimenti processo ${formatCurrency(cashFlowData.totaleInvestimenti)} = ${formatCurrency(cashFlowData.saldoFinale)}.`}
                icon={<Wallet className="h-4 w-4" />}
              />
            </div>

            {/* Riconciliazione */}
            {summary.hasSimulationData && (
              <div className="mt-4 pt-3 border-t border-dashed border-muted-foreground/20">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Verifica contabile (algebrica): Incassato ({formatCurrency(simulationSummary.totalIncassato)})
                    + Crediti residui ({formatCurrency(simulationSummary.totalCrediti)})
                    + Insoluti ({formatCurrency(simulationSummary.totalInsoluti)})
                  </span>
                  <span className="font-medium text-foreground">
                    = {formatCurrency(simulationSummary.totalIncassato + simulationSummary.totalCrediti + simulationSummary.totalInsoluti)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1">
                  I Crediti includono anche il waterfall non chiuso degli ultimi 3 mesi: il valore si ridurrà progressivamente con l'incasso delle tranche pendenti.
                </div>
              </div>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Ripartizione Costi</CardTitle><CardDescription>Suddivisione per tipologia</CardDescription></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">Nessun costo registrato</div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate">{entry.name}</span></div>
                  <span className="font-medium">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Channel Cost Breakdown */}
        {channelPieData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Costi Commerciali per Canale</CardTitle><CardDescription>Distribuzione provvigioni ({totalContracts} contratti)</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={channelPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${percent.toFixed(0)}%`}>
                    {channelPieData.map((entry, index) => (<Cell key={`ch-cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {channelPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm font-medium">{entry.name}</span></div>
                    <div className="text-right"><span className="text-sm font-bold">{formatCurrency(entry.value)}</span><span className="text-xs text-muted-foreground ml-2">({entry.percent.toFixed(1)}%)</span></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <FinancialTrendChart cashFlowData={cashFlowData} loading={cashFlowLoading} />
      <BreakEvenAnalysis summary={summary} breakEvenFinanziario={cashFlowData.mesePrimoPositivo} />
      <FinancialGlossary />
    </div>
  );
};

/* ── Row component for Economic section ── */
const EconomicRow = ({ label, tooltip, value, valueClass, detail, icon }: {
  label: string; tooltip: string; value: string; valueClass?: string; detail: string; icon: React.ReactNode;
}) => (
  <div className="py-4 first:pt-0 last:pb-0">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <TooltipProvider delayDuration={200}>
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <span className="text-muted-foreground">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
                <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p>{tooltip}</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</p>
      </div>
      <div className={`text-xl font-bold shrink-0 ${valueClass || 'text-foreground'}`}>
        {value}
      </div>
    </div>
  </div>
);

/* ── Highlighted row for margin items ── */
const EconomicRowHighlight = ({ label, tooltip, value, percentValue, positive, detail, icon }: {
  label: string; tooltip: string; value: string; percentValue: string; positive: boolean; detail: string; icon: React.ReactNode;
}) => (
  <div className={`py-4 first:pt-0 last:pb-0 px-4 -mx-4 rounded-lg ${positive ? 'bg-green-50/50 dark:bg-green-950/10' : 'bg-red-50/50 dark:bg-red-950/10'}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <TooltipProvider delayDuration={200}>
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <span className="text-muted-foreground">{icon}</span>
                <span className="text-sm font-semibold">{label}</span>
                <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p>{tooltip}</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</p>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-xl font-bold ${positive ? 'text-green-600' : 'text-destructive'}`}>
          {value}
        </div>
        <div className="flex items-center gap-1 justify-end">
          {positive ? <ArrowUpRight className="h-3 w-3 text-green-600" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
          <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-destructive'}`}>{percentValue}</span>
          <span className="text-xs text-muted-foreground">sul fatt. netto</span>
        </div>
      </div>
    </div>
  </div>
);

/* ── Row component for Financial section ── */
const FinancialRow = ({ label, tooltip, value, valueClass, detail, icon }: {
  label: string; tooltip: string; value: string; valueClass?: string; detail: string; icon: React.ReactNode;
}) => (
  <div className="py-4 first:pt-0 last:pb-0">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <TooltipProvider delayDuration={200}>
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                <span className="text-muted-foreground">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
                <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <p>{tooltip}</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{detail}</p>
      </div>
      <div className={`text-xl font-bold shrink-0 ${valueClass || 'text-foreground'}`}>
        {value}
      </div>
    </div>
  </div>
);
