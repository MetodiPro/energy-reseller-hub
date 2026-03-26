import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RevenueSimulationParams } from '@/hooks/useRevenueSimulation';

interface WhatIfSimulatorProps {
  summary: {
    totalRevenue: number;
    totalCosts: number;
    grossMargin: number;
    grossMarginPercent: number;
    contributionMargin: number;
    contributionMarginPercent: number;
    netMargin: number;
    netMarginPercent: number;
    costiCommercialiSimulati: number;
    operationalCosts: number;
    passthroughCosts: number;
    costsByType: {
      direct: number;
      commercial: number;
      structural: number;
      indirect: number;
    };
    hasSimulationData?: boolean;
  };
  channelBreakdown: Array<{
    channel_name: string;
    commission_amount: number;
    commission_type: 'per_contract' | 'per_activation';
    contracts: number;
    activations: number;
    cost: number;
  }>;
  simulationParams?: RevenueSimulationParams;
  onApplyToSimulator?: (params: Partial<RevenueSimulationParams>) => void;
}

const fmt = (value: number, decimals = 0) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

const fmtKwh = (value: number) => `€ ${value.toFixed(3)}/kWh`;

interface Scenario {
  name: string;
  spreadReseller: number;
  ccv: number;
  spreadGrossista: number;
  feePod: number;
  recommended?: boolean;
}

// Scenarios are built dynamically inside the component based on simulationParams


export const WhatIfSimulator = ({
  summary,
  channelBreakdown,
  simulationParams,
  onApplyToSimulator,
}: WhatIfSimulatorProps) => {
  const { toast } = useToast();

  // Commercial levers
  const [spreadReseller, setSpreadReseller] = useState(simulationParams?.spreadPerKwh ?? 0.015);
  const [ccv, setCcv] = useState(simulationParams?.ccvMonthly ?? 8.5);
  const [spreadGrossista, setSpreadGrossista] = useState(simulationParams?.spreadGrossistaPerKwh ?? 0.008);
  const [feePod, setFeePod] = useState(simulationParams?.gestionePodPerPod ?? 2.5);

  // Volume
  const [contratti3m, setContratti3m] = useState(150);
  const [contratti6m, setContratti6m] = useState(350);
  const [contratti12m, setContratti12m] = useState(650);

  // Structural
  const [costiStrutturali, setCostiStrutturali] = useState(
    (summary.costsByType?.structural || 0) > 0 ? summary.costsByType.structural : 2000
  );
  const kWh = simulationParams?.avgMonthlyConsumption ?? 200;

  // ──── CALCULATION ENGINE ────
  const calc = useMemo(() => {
    const margineNettoPerCliente = ccv + spreadReseller * kWh - spreadGrossista * kWh - feePod;

    // Invoice per client (for deposit calc)
    const pun = simulationParams?.punPerKwh ?? 0.12;
    const disp = simulationParams?.dispacciamentoPerKwh ?? 0.01;
    const trasportoFissa = (simulationParams?.trasportoQuotaFissaAnno ?? 23) / 12;
    const trasportoPotenza =
      ((simulationParams?.trasportoQuotaPotenzaKwAnno ?? 22) * (simulationParams?.potenzaImpegnataKw ?? 3)) / 12;
    const trasportoEnergia = (simulationParams?.trasportoQuotaEnergiaKwh ?? 0.008) * kWh;
    const trasporto = trasportoFissa + trasportoPotenza + trasportoEnergia;
    const oneri = ((simulationParams?.oneriAsosKwh ?? 0.025) + (simulationParams?.oneriArimKwh ?? 0.007)) * kWh;
    const accise = (simulationParams?.acciseKwh ?? 0.0227) * kWh;
    const passanti = (pun + disp) * kWh + trasporto + oneri + accise;
    const margineReseller = ccv + spreadReseller * kWh;
    const imponibile = passanti + margineReseller;
    const iva = simulationParams?.ivaPercent ?? 10;
    const fatturaPerCliente = imponibile * (1 + iva / 100);

    const depositoMesi = simulationParams?.depositoMesi ?? 3;
    const depositoPct = (simulationParams?.depositoPercentualeAttivazione ?? 85) / 100;
    const depositoPerCliente = fatturaPerCliente * depositoMesi * depositoPct;

    const investimento = summary.hasSimulationData ? 0 : 11000;

    const marginePercent = fatturaPerCliente > 0 ? (margineReseller / fatturaPerCliente) * 100 : 0;

    const breakEvenClienti =
      margineNettoPerCliente > 0 ? Math.ceil(costiStrutturali / margineNettoPerCliente) : Infinity;

    function calcolaSaldo(clienti: number, mesi: number) {
      const margineOp = margineNettoPerCliente * clienti * mesi;
      const depositoTotale = depositoPerCliente * clienti * 0.6;
      const strutturali = costiStrutturali * mesi;
      const saldoCassa = margineOp - depositoTotale - strutturali - (mesi <= 3 ? investimento : 0);
      return { margineOp, deposito: depositoTotale, strutturali, saldoCassa, investimento: mesi <= 3 ? investimento : 0 };
    }

    return {
      margineNettoPerCliente,
      fatturaPerCliente,
      depositoPerCliente,
      marginePercent,
      breakEvenClienti,
      investimento,
      proiezione3m: calcolaSaldo(contratti3m, 3),
      proiezione6m: calcolaSaldo(contratti6m, 6),
      proiezione12m: calcolaSaldo(contratti12m, 12),
    };
  }, [spreadReseller, ccv, spreadGrossista, feePod, kWh, costiStrutturali, contratti3m, contratti6m, contratti12m, simulationParams, summary.hasSimulationData]);

  // Build scenarios based on actual simulation params (not hardcoded)
  const scenarios: Scenario[] = useMemo(() => {
    const baseSpread = simulationParams?.spreadGrossistaPerKwh ?? 0.008;
    const basePod = simulationParams?.gestionePodPerPod ?? 2.5;
    const baseCcv = simulationParams?.ccvMonthly ?? 8.5;
    const baseSpreadRes = simulationParams?.spreadPerKwh ?? 0.015;
    return [
      { name: 'Attuale (da Ipotesi)', spreadReseller: baseSpreadRes, ccv: baseCcv, spreadGrossista: baseSpread, feePod: basePod },
      { name: 'Sostenibile minimo', spreadReseller: Math.max(baseSpreadRes, 0.02), ccv: Math.max(baseCcv, 10), spreadGrossista: baseSpread, feePod: basePod },
      { name: 'Raccomandato ✓', spreadReseller: Math.max(baseSpreadRes, 0.025), ccv: Math.max(baseCcv, 12), spreadGrossista: baseSpread, feePod: basePod, recommended: true },
      { name: 'Redditività alta', spreadReseller: Math.max(baseSpreadRes, 0.03), ccv: Math.max(baseCcv, 15), spreadGrossista: baseSpread, feePod: Math.min(basePod, 2.0) },
      { name: 'CCV-centric (servizi)', spreadReseller: Math.min(baseSpreadRes, 0.01), ccv: Math.max(baseCcv, 20), spreadGrossista: baseSpread, feePod: Math.min(basePod, 2.0) },
    ];
  }, [simulationParams?.spreadPerKwh, simulationParams?.ccvMonthly, simulationParams?.spreadGrossistaPerKwh, simulationParams?.gestionePodPerPod]);

  // Scenario comparison table
  const scenarioRows = useMemo(() => {
    return scenarios.map((s) => {
      const m = s.ccv + s.spreadReseller * kWh - s.spreadGrossista * kWh - s.feePod;
      const bep = m > 0 ? Math.ceil(costiStrutturali / m) : Infinity;

      const pun = simulationParams?.punPerKwh ?? 0.12;
      const disp = simulationParams?.dispacciamentoPerKwh ?? 0.01;
      const trasporto =
        (simulationParams?.trasportoQuotaFissaAnno ?? 23) / 12 +
        ((simulationParams?.trasportoQuotaPotenzaKwAnno ?? 22) * (simulationParams?.potenzaImpegnataKw ?? 3)) / 12 +
        (simulationParams?.trasportoQuotaEnergiaKwh ?? 0.008) * kWh;
      const oneri = ((simulationParams?.oneriAsosKwh ?? 0.025) + (simulationParams?.oneriArimKwh ?? 0.007)) * kWh;
      const accise = (simulationParams?.acciseKwh ?? 0.0227) * kWh;
      const passanti = (pun + disp) * kWh + trasporto + oneri + accise;
      const margineRes = s.ccv + s.spreadReseller * kWh;
      const imponibile = passanti + margineRes;
      const iva = simulationParams?.ivaPercent ?? 10;
      const fattura = imponibile * (1 + iva / 100);
      const depositoMesi = simulationParams?.depositoMesi ?? 3;
      const depositoPct = (simulationParams?.depositoPercentualeAttivazione ?? 85) / 100;
      const depPerCl = fattura * depositoMesi * depositoPct;
      const inv = summary.hasSimulationData ? 0 : 11000;

      const saldo = (clienti: number, mesi: number) => {
        return m * clienti * mesi - depPerCl * clienti * 0.6 - costiStrutturali * mesi - (mesi <= 3 ? inv : 0);
      };

      return { ...s, margine: m, bep, saldo3: saldo(contratti3m, 3), saldo6: saldo(contratti6m, 6), saldo12: saldo(contratti12m, 12) };
    });
  }, [scenarios, kWh, costiStrutturali, contratti3m, contratti6m, contratti12m, simulationParams, summary.hasSimulationData]);

  // Current custom row
  const customRow = useMemo(() => ({
    name: '📌 Personalizzato',
    margine: calc.margineNettoPerCliente,
    bep: calc.breakEvenClienti,
    saldo3: calc.proiezione3m.saldoCassa,
    saldo6: calc.proiezione6m.saldoCassa,
    saldo12: calc.proiezione12m.saldoCassa,
  }), [calc]);

  const applyScenario = (s: Scenario) => {
    setSpreadReseller(s.spreadReseller);
    setCcv(s.ccv);
    setSpreadGrossista(s.spreadGrossista);
    setFeePod(s.feePod);
  };

  const handleApplyToSimulator = () => {
    if (!onApplyToSimulator) return;
    onApplyToSimulator({
      spreadPerKwh: spreadReseller,
      ccvMonthly: ccv,
      spreadGrossistaPerKwh: spreadGrossista,
      gestionePodPerPod: feePod,
    });
    toast({
      title: 'Parametri applicati',
      description: 'Parametri applicati al simulatore — rigenera la simulazione per vedere i nuovi risultati.',
    });
  };

  const spreadBadge = (v: number) =>
    v < 0.015 ? { label: 'Basso', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' } :
    v <= 0.025 ? { label: 'Mercato', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' } :
    { label: 'Premium', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };

  const ccvBadge = (v: number) =>
    v < 8 ? { label: 'Minimo', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' } :
    v <= 15 ? { label: 'Standard', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' } :
    { label: 'Valore aggiunto', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };

  const ProiezioneCard = ({
    title,
    clienti,
    setClienti,
    proiezione,
    showInvestimento,
  }: {
    title: string;
    clienti: number;
    setClienti: (v: number) => void;
    proiezione: { margineOp: number; deposito: number; strutturali: number; saldoCassa: number; investimento: number };
    showInvestimento: boolean;
  }) => (
    <Card className={`border ${proiezione.saldoCassa >= 0 ? 'border-green-200 dark:border-green-800' : 'border-destructive/30'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            value={clienti}
            onChange={(e) => setClienti(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-7 w-24 text-sm"
            min={0}
          />
          <span className="text-xs text-muted-foreground">clienti attivi</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Margine operativo</span>
          <span className="text-green-600 font-medium">+{fmt(proiezione.margineOp)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Deposito cauzionale</span>
          <span className="text-orange-600">-{fmt(proiezione.deposito)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Costi strutturali</span>
          <span className="text-destructive">-{fmt(proiezione.strutturali)}</span>
        </div>
        {showInvestimento && proiezione.investimento > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Investimento startup</span>
            <span className="text-destructive">-{fmt(proiezione.investimento)}</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between items-center">
          <span className="font-semibold">Saldo di cassa</span>
          <span className={`text-lg font-bold ${proiezione.saldoCassa >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            {fmt(proiezione.saldoCassa)}
          </span>
        </div>
        {proiezione.saldoCassa >= 0 ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Avanzo
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Deficit — serve capitale circolante di {fmt(Math.abs(proiezione.saldoCassa))}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Ottimizzatore Profittabilità e Liquidità
        </CardTitle>
        <CardDescription>
          Trova la combinazione ottimale di spread, CCV e volumi per garantire liquidità positiva a 3, 6 e 12 mesi.{' '}
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            ⚠ Stime semplificate: non includono waterfall incassi, IVA, accise né insoluti. Per l'analisi completa usa gli Esiti Finanziari.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ─── TWO COLUMNS ─── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Commercial Parameters */}
          <div className="space-y-5">
            <h4 className="font-medium flex items-center gap-2 text-primary">
              <Zap className="h-4 w-4" /> Parametri Commerciali
            </h4>

            {/* Spread Reseller */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Spread Reseller (€/kWh)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">{fmtKwh(spreadReseller)}</span>
                  <span className="text-xs text-muted-foreground">= {fmt(spreadReseller * kWh, 2)}/cl/mese</span>
                  <Badge className={`text-xs ${spreadBadge(spreadReseller).cls}`}>{spreadBadge(spreadReseller).label}</Badge>
                </div>
              </div>
              <Slider
                value={[spreadReseller * 1000]}
                onValueChange={([v]) => setSpreadReseller(v / 1000)}
                min={5}
                max={50}
                step={1}
              />
            </div>

            {/* CCV */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">CCV Mensile (€/cliente)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">{fmt(ccv, 2)}</span>
                  <Badge className={`text-xs ${ccvBadge(ccv).cls}`}>{ccvBadge(ccv).label}</Badge>
                </div>
              </div>
              <Slider
                value={[ccv * 2]}
                onValueChange={([v]) => setCcv(v / 2)}
                min={10}
                max={60}
                step={1}
              />
              <p className="text-xs text-muted-foreground">ARERA consente fino a 25-30€/mese per servizi aggiuntivi</p>
            </div>

            {/* Spread Grossista */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Spread Grossista (€/kWh)</Label>
                <span className="text-xs font-mono">{fmtKwh(spreadGrossista)}</span>
              </div>
              <Slider
                value={[spreadGrossista * 1000]}
                onValueChange={([v]) => setSpreadGrossista(v / 1000)}
                min={3}
                max={20}
                step={1}
              />
              <p className="text-xs text-destructive">Costo — negoziabile con volumi &gt; 500 POD</p>
            </div>

            {/* Fee POD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Fee Gestione POD (€/POD/mese)</Label>
                <span className="text-xs font-mono">{fmt(feePod, 2)}</span>
              </div>
              <Slider
                value={[feePod * 4]}
                onValueChange={([v]) => setFeePod(v / 4)}
                min={4}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground">Tipicamente 1.50-3.00€, negoziabile sopra 300 POD</p>
            </div>

            {/* Costi strutturali */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Costi Strutturali Mensili (€)</Label>
                <span className="text-xs font-mono">{fmt(costiStrutturali)}</span>
              </div>
              <Slider
                value={[costiStrutturali]}
                onValueChange={([v]) => setCostiStrutturali(v)}
                min={0}
                max={10000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">Affitto, personale, software, consulenze</p>
            </div>

            <Separator />

            {/* MARGIN BOX */}
            <div
              className={`rounded-lg p-4 border-2 ${
                calc.margineNettoPerCliente >= 0
                  ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                  : 'border-destructive bg-destructive/5'
              }`}
            >
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Margine netto per cliente / mese</p>
                <p
                  className={`text-3xl font-bold ${
                    calc.margineNettoPerCliente >= 0 ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {fmt(calc.margineNettoPerCliente, 2)}
                </p>
                {calc.margineNettoPerCliente < 0 && (
                  <p className="text-xs text-destructive flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Modello non sostenibile
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Margine su fattura: {calc.marginePercent.toFixed(1)}% — Break-even struttura:{' '}
                  {calc.breakEvenClienti === Infinity ? '∞' : calc.breakEvenClienti} clienti
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Projections */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2 text-primary">
              <Target className="h-4 w-4" /> Proiezioni Liquidità
            </h4>

            <ProiezioneCard
              title="A 3 mesi"
              clienti={contratti3m}
              setClienti={setContratti3m}
              proiezione={calc.proiezione3m}
              showInvestimento
            />
            <ProiezioneCard
              title="A 6 mesi"
              clienti={contratti6m}
              setClienti={setContratti6m}
              proiezione={calc.proiezione6m}
              showInvestimento={false}
            />
            <ProiezioneCard
              title="A 12 mesi"
              clienti={contratti12m}
              setClienti={setContratti12m}
              proiezione={calc.proiezione12m}
              showInvestimento={false}
            />
          </div>
        </div>

        <Separator />

        {/* ─── SCENARIO PRESETS ─── */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" /> Scenari Preimpostati
          </h4>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((s) => {
              const m = s.ccv + s.spreadReseller * kWh - s.spreadGrossista * kWh - s.feePod;
              return (
                <Button
                  key={s.name}
                  variant={s.recommended ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyScenario(s)}
                  className="gap-1"
                >
                  {s.recommended && <CheckCircle2 className="h-3 w-3" />}
                  {s.name}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {fmt(m, 2)}/cl
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* ─── COMPARISON TABLE ─── */}
        <div className="space-y-3">
          <h4 className="font-medium">Tabella Comparativa Scenari</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead className="text-right">€/cl/mese</TableHead>
                  <TableHead className="text-right">BEP (cl)</TableHead>
                  <TableHead className="text-right">Saldo 3m</TableHead>
                  <TableHead className="text-right">Saldo 6m</TableHead>
                  <TableHead className="text-right">Saldo 12m</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarioRows.map((r) => (
                  <TableRow
                    key={r.name}
                    className={`cursor-pointer hover:bg-muted/50 ${r.recommended ? 'bg-green-50/50 dark:bg-green-950/20' : ''}`}
                    onClick={() => applyScenario(r)}
                  >
                    <TableCell className="font-medium text-sm">
                      {r.recommended && <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-600" />}
                      {r.name}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${r.margine >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {fmt(r.margine, 2)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{r.bep === Infinity ? '∞' : r.bep}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${r.saldo3 >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {fmt(r.saldo3)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${r.saldo6 >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {fmt(r.saldo6)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${r.saldo12 >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {fmt(r.saldo12)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Custom row */}
                <TableRow className="bg-primary/5 font-semibold">
                  <TableCell className="text-sm">{customRow.name}</TableCell>
                  <TableCell className={`text-right font-mono text-sm ${customRow.margine >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {fmt(customRow.margine, 2)}
                  </TableCell>
                  <TableCell className="text-right text-sm">{customRow.bep === Infinity ? '∞' : customRow.bep}</TableCell>
                  <TableCell className={`text-right font-mono text-sm ${customRow.saldo3 >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {fmt(customRow.saldo3)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${customRow.saldo6 >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {fmt(customRow.saldo6)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${customRow.saldo12 >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {fmt(customRow.saldo12)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ─── APPLY BUTTON ─── */}
        {onApplyToSimulator && (
          <>
            <Separator />
            <div className="flex justify-end">
              <Button onClick={handleApplyToSimulator} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Applica questi parametri al Simulatore Ricavi
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
