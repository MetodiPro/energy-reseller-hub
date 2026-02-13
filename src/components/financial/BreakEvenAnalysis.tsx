import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertTriangle, CheckCircle, HelpCircle, Info, Wallet } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { FinancialSummary } from '@/hooks/useProjectFinancials';

interface BreakEvenAnalysisProps {
  summary: FinancialSummary;
  breakEvenFinanziario?: string | null; // from cash flow analysis
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground inline-block ml-1 cursor-help" />
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs text-xs">
      {text}
    </TooltipContent>
  </Tooltip>
);

export const BreakEvenAnalysis = ({ summary, breakEvenFinanziario }: BreakEvenAnalysisProps) => {
  const analysis = useMemo(() => {
    // ─── Classificazione costi per il modello reseller ───
    // Costi Passanti = costi che il reseller gira al grossista/distributore (contenuti in passthroughCosts)
    // Costi Operativi = tutto ciò che resta (strutturali, commerciali, indiretti, ecc.)
    const passthroughCosts = summary.passthroughCosts;
    const operationalCosts = summary.operationalCosts;
    const totalCosts = summary.totalCosts;
    const totalRevenue = summary.totalRevenue;

    // ─── Break-Even Commerciale ───
    // Il BEP commerciale indica se il margine del reseller (fatturato - passanti) copre i costi operativi.
    // Margine Lordo = Fatturato - Passanti
    const grossMargin = summary.grossMargin;
    const grossMarginRatio = totalRevenue > 0 ? grossMargin / totalRevenue : 0;

    // BEP Commerciale = Costi Operativi / (Margine Lordo %)
    // Cioè: quanto fatturato serve per generare abbastanza margine da coprire i costi operativi
    const breakEvenRevenue = grossMarginRatio > 0
      ? operationalCosts / grossMarginRatio
      : 0;

    const revenueToBreakEven = breakEvenRevenue - totalRevenue;
    const isAboveBreakEven = totalRevenue >= breakEvenRevenue && breakEvenRevenue > 0;
    const breakEvenProgress = breakEvenRevenue > 0
      ? Math.min(100, (totalRevenue / breakEvenRevenue) * 100)
      : 0;

    // Margine di sicurezza: quanto il fatturato può calare prima di andare in perdita
    const marginOfSafety = isAboveBreakEven && totalRevenue > 0
      ? ((totalRevenue - breakEvenRevenue) / totalRevenue) * 100
      : 0;

    // Rapporti strutturali
    const passthroughRatio = totalCosts > 0 ? (passthroughCosts / totalCosts) * 100 : 0;
    const operationalRatio = totalCosts > 0 ? (operationalCosts / totalCosts) * 100 : 0;

    // Verifica coerenza con il margine netto
    const netMarginIsNegative = summary.netMarginPercent < 0;

    return {
      passthroughCosts,
      operationalCosts,
      grossMarginRatio,
      breakEvenRevenue,
      revenueToBreakEven,
      isAboveBreakEven,
      breakEvenProgress,
      marginOfSafety,
      passthroughRatio,
      operationalRatio,
      netMarginIsNegative,
    };
  }, [summary]);

  // ─── Status banner logic ───
  const getStatusContent = () => {
    if (analysis.isAboveBreakEven && !analysis.netMarginIsNegative) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        label: 'Break-Even Superato',
        badge: <Badge variant="default">{formatPercent(analysis.breakEvenProgress)} raggiunto</Badge>,
        color: 'text-green-600',
      };
    }
    if (analysis.isAboveBreakEven && analysis.netMarginIsNegative) {
      // Contraddizione apparente: BEP commerciale raggiunto ma in perdita
      return {
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        label: 'Pareggio Parziale',
        badge: <Badge variant="secondary">In perdita nonostante il BEP</Badge>,
        color: 'text-amber-500',
      };
    }
    return {
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      label: 'Sotto il Break-Even',
      badge: <Badge variant="secondary">{formatPercent(analysis.breakEvenProgress)} raggiunto</Badge>,
      color: 'text-amber-500',
    };
  };

  const status = getStatusContent();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Analisi Break-Even Point
          <InfoTip text="Il Break-Even Point (BEP) è il livello di fatturato minimo necessario per coprire tutti i costi. Se il fatturato è sotto il BEP, il progetto perde soldi." />
        </CardTitle>
        <CardDescription>
          Quanto devi fatturare per smettere di perdere soldi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Break-Even Status */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {status.icon}
              <span className="font-medium">{status.label}</span>
            </div>
            {status.badge}
          </div>

          <Progress value={analysis.breakEvenProgress} className="h-3 mb-3" />

          {/* Spiegazione se c'è contraddizione BEP raggiunto ma in perdita */}
          {analysis.isAboveBreakEven && analysis.netMarginIsNegative && (
            <div className="mb-4 p-3 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-sm space-y-1">
              <p className="font-medium text-amber-700 dark:text-amber-300">⚠️ Perché il BEP risulta raggiunto ma il progetto è in perdita?</p>
              <p className="text-muted-foreground">
                Il Break-Even calcolato qui si basa solo sui <strong>costi operativi</strong> (personale, software, marketing) e sul <strong>margine lordo</strong> (fatturato meno costi passanti).
                In pratica: il fatturato genera abbastanza margine da coprire le spese operative, ma nel calcolo complessivo ci sono costi aggiuntivi (IVA, accise, oneri) che portano il risultato netto in negativo.
              </p>
              <p className="text-xs text-muted-foreground italic">
                💡 Per raggiungere il vero pareggio, servono più clienti oppure una riduzione dei costi operativi.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground flex items-center">
                Break-Even Point
                <InfoTip text="Il fatturato minimo necessario per coprire i costi operativi con il tuo margine lordo attuale." />
              </p>
              <p className="text-lg font-bold">{formatCurrency(analysis.breakEvenRevenue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {analysis.isAboveBreakEven ? 'Eccedenza' : 'Mancante'}
              </p>
              <p className={`text-lg font-bold ${analysis.isAboveBreakEven ? 'text-green-600' : 'text-amber-500'}`}>
                {formatCurrency(Math.abs(analysis.revenueToBreakEven))}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
              Costi Passanti
              <InfoTip text="Costi che il reseller incassa dal cliente e gira al grossista/distributore (energia, trasporto, oneri, accise). Non rappresentano un guadagno." />
            </p>
            <p className="font-bold text-orange-500">{formatCurrency(analysis.passthroughCosts)}</p>
            <p className="text-xs text-muted-foreground">{formatPercent(analysis.passthroughRatio)} dei costi</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
              Costi Operativi
              <InfoTip text="Spese reali dell'azienda: personale, affitti, software, marketing, consulenze. Sono i costi che il margine lordo deve coprire per generare profitto." />
            </p>
            <p className="font-bold text-destructive">{formatCurrency(analysis.operationalCosts)}</p>
            <p className="text-xs text-muted-foreground">{formatPercent(analysis.operationalRatio)} dei costi</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
              Margine Lordo %
              <InfoTip text="Percentuale del fatturato che resta dopo aver sottratto i costi passanti. Indica quanto 'trattieni' su ogni euro fatturato." />
            </p>
            <p className="font-bold text-primary">{formatPercent(analysis.grossMarginRatio * 100)}</p>
            <p className="text-xs text-muted-foreground">su ricavi</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
              Margine Sicurezza
              <InfoTip text="Di quanto può calare il fatturato prima di andare sotto il punto di pareggio. Più è alto, più il progetto è resiliente." />
            </p>
            <p className={`font-bold ${analysis.marginOfSafety >= 20 ? 'text-green-600' : analysis.marginOfSafety >= 10 ? 'text-amber-500' : 'text-destructive'}`}>
              {formatPercent(analysis.marginOfSafety)}
            </p>
            <p className="text-xs text-muted-foreground">sopra BEP</p>
          </div>
        </div>

        {/* Come funziona */}
        <div className="pt-4 border-t space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Info className="h-4 w-4" />
            Come si calcola il Break-Even Point?
          </p>
          <div className="space-y-2 ml-6">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1</span>
              <p>Si calcola il <strong>Margine Lordo %</strong>: la percentuale di ogni euro fatturato che resta dopo aver pagato i costi passanti (energia, distribuzione, oneri).</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">2</span>
              <p>Si dividono i <strong>Costi Operativi</strong> (spese fisse dell'azienda) per il Margine Lordo %.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">3</span>
              <p>Il risultato è il <strong>fatturato minimo</strong> necessario per coprire tutte le spese e smettere di perdere soldi.</p>
            </div>
          </div>
          <div className="p-3 rounded-md bg-muted/30 text-xs font-mono">
            BEP = Costi Operativi ({formatCurrency(analysis.operationalCosts)}) ÷ Margine Lordo ({formatPercent(analysis.grossMarginRatio * 100)}) = {formatCurrency(analysis.breakEvenRevenue)}
          </div>
        </div>

        {/* Distinction between commercial and financial break-even */}
        <div className="pt-4 border-t space-y-3 text-sm">
          <p className="font-medium text-foreground flex items-center gap-2">
            <Info className="h-4 w-4" />
            Break-Even Commerciale vs Finanziario
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border bg-card space-y-1">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium">BEP Commerciale</span>
                <Badge variant={analysis.isAboveBreakEven ? 'default' : 'secondary'} className="text-xs">
                  {analysis.isAboveBreakEven ? 'Raggiunto' : 'Non raggiunto'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Indica il <strong>fatturato minimo</strong> necessario affinché il margine lordo copra i costi operativi. 
                Si basa sulla struttura dei margini (fatturato − passanti) e non tiene conto dei tempi di incasso, depositi e flussi fiscali.
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-1">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="font-medium">BEP Finanziario</span>
                <Badge variant={breakEvenFinanziario ? 'default' : 'secondary'} className="text-xs">
                  {breakEvenFinanziario || 'Non raggiunto'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Indica il <strong>primo mese</strong> in cui il saldo di cassa cumulativo diventa positivo. 
                Tiene conto dell'aging degli incassi, depositi cauzionali, investimenti iniziali, costi commerciali e flussi fiscali (IVA, accise).
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            💡 Può capitare che il BEP commerciale sia raggiunto ma quello finanziario no: i margini sono sufficienti, 
            ma la liquidità necessaria per finanziare la crescita (depositi, ritardi incasso, investimenti) supera le disponibilità di cassa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
