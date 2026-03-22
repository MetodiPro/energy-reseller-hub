/**
 * Motore di calcolo unificato per la simulazione reseller energia.
 * 
 * Questo modulo centralizza TUTTA la logica di:
 * - Ciclo di vita clienti (contratti → attivazioni → churn → attivi → fatturati)
 * - Calcolo componenti per-cliente (passanti, margine, fattura)
 * - Deposito cauzionale
 * - Incassi (collection waterfall)
 * 
 * Viene consumato da useSimulationSummary, useCashFlowAnalysis e useTaxFlows
 * per garantire coerenza assoluta dei dati.
 */

import { RevenueSimulationParams, MonthlyContractsTarget } from '@/hooks/useRevenueSimulation';

// ─── Costanti ────────────────────────────────────────────────
const MONTHS_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
export const SIM_MONTHS = 14; // 12 mesi operativi + 2 di coda

// ─── Tipi ────────────────────────────────────────────────────

/** Componenti economici per singolo cliente/mese */
export interface PerClientAmounts {
  materiaEnergia: number;
  trasporto: number;
  oneriSistema: number;
  accise: number;
  passantiTotale: number;
  ccv: number;
  spread: number;
  altroServizi: number;
  margineTotale: number;
  imponibile: number;
  iva: number;
  fattura: number;
}

/** Dati mensili del ciclo di vita clienti */
export interface MonthlyCustomerData {
  month: number;
  monthLabel: string;
  monthIndex: number; // 0-11 (mese calendario)
  year: number;
  contrattiNuovi: number;
  attivazioni: number;
  churn: number;
  clientiAttivi: number;
  clientiFatturati: number;
}

/** Dati mensili deposito cauzionale */
export interface MonthlyDepositEngineData {
  depositoLordoAttivazioni: number;
  depositoRilasciatoChurn: number;
  pagamentiConsumi: number;
  depositoRichiesto: number;
  deltaDeposito: number;
}

/** Dati mensili incassi */
export interface MonthlyCollectionData {
  incassoScadenza: number;
  incasso30gg: number;
  incasso60gg: number;
  incassoOltre60gg: number;
  totaleIncassi: number;
}

/** Risultato completo per un singolo mese */
export interface MonthlyEngineResult {
  customer: MonthlyCustomerData;
  deposit: MonthlyDepositEngineData;
  collection: MonthlyCollectionData;
  fatturato: number;
  costiPassanti: number;
  costiGestionePod: number;
  costoEnergia: number;
  margineCommerciale: number;
}

/** Output completo del motore */
export interface SimulationEngineResult {
  perClient: PerClientAmounts;
  monthly: MonthlyEngineResult[];
}

// ─── Funzioni di calcolo ─────────────────────────────────────

/** Calcola i componenti economici per singolo cliente/mese */
export function computePerClientAmounts(params: RevenueSimulationParams): PerClientAmounts {
  const kWh = params.avgMonthlyConsumption;

  const materiaEnergia = (params.punPerKwh + params.dispacciamentoPerKwh) * kWh;
  const trasporto =
    params.trasportoQuotaFissaAnno / 12 +
    (params.trasportoQuotaPotenzaKwAnno * params.potenzaImpegnataKw) / 12 +
    params.trasportoQuotaEnergiaKwh * kWh;
  const oneriSistema = (params.oneriAsosKwh + params.oneriArimKwh) * kWh;
  const accise = params.acciseKwh * kWh;
  const passantiTotale = materiaEnergia + trasporto + oneriSistema + accise;

  const ccv = params.ccvMonthly;
  const spread = params.spreadPerKwh * kWh;
  const altroServizi = params.otherServicesMonthly;
  const margineTotale = ccv + spread + altroServizi;

  const imponibile = passantiTotale + margineTotale;
  const iva = imponibile * (params.ivaPercent / 100);
  const fattura = imponibile + iva;

  return {
    materiaEnergia,
    trasporto,
    oneriSistema,
    accise,
    passantiTotale,
    ccv,
    spread,
    altroServizi,
    margineTotale,
    imponibile,
    iva,
    fattura,
  };
}

/** Genera l'etichetta mese/anno */
export function getMonthLabel(startMonth: number, startYear: number, m: number): string {
  const monthIndex = (startMonth + m) % 12;
  const yearOffset = Math.floor((startMonth + m) / 12);
  return `${MONTHS_IT[monthIndex]} ${startYear + yearOffset}`;
}

/**
 * Esegue l'intera simulazione per 14 mesi.
 * Questa è l'UNICA fonte di verità per il ciclo di vita clienti.
 */
export function runSimulationEngine(
  params: RevenueSimulationParams,
  monthlyContracts: MonthlyContractsTarget,
  startDate: Date
): SimulationEngineResult {
  const perClient = computePerClientAmounts(params);
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const depositoMesi = params.depositoMesi ?? 3;
  const gestionePodPerPod = params.gestionePodPerPod ?? 2.5;
  const depositoPercentuale = (params.depositoPercentualeAttivazione ?? 85) / 100;
  const kWh = params.avgMonthlyConsumption;

  const invoicesToCollect: { month: number; amount: number }[] = [];
  let cumulativeActiveCustomers = 0;
  let totalDepositoLordo = 0;
  let totalDepositoRestituito = 0;
  let previousDeposito = 0;

  const monthly: MonthlyEngineResult[] = [];

  // Coda degli switch-out: i clienti che "decidono" di uscire al mese m
  // cessano effettivamente al mese m + SWITCH_OUT_DELAY
  const SWITCH_OUT_DELAY = 2;
  const pendingChurnExits: number[] = new Array(SIM_MONTHS + SWITCH_OUT_DELAY).fill(0);

  const svincoloPct = (params.depositoSvincoloPagamentiPerc ?? 50) / 100;
  let totalPagamentiAccumulati = 0;

  for (let m = 0; m < SIM_MONTHS; m++) {
    // ── Ciclo vita clienti ──
    const contrattiNuovi = m < 12 ? monthlyContracts[m] : 0;

    const attivazioni =
      m >= 2
        ? Math.round(
            (m - 2 < 12 ? monthlyContracts[m - 2] : 0) * (params.activationRate / 100)
          )
        : 0;

    // Calcola quanti clienti "comunicano" il recesso questo mese
    // (tasso mensile applicato alla base attiva corrente)
    const churnProgrammato = m >= 3
      ? Math.round(cumulativeActiveCustomers * (params.monthlyChurnRate / 100))
      : 0;

    // Registra l'uscita effettiva 2 mesi dopo (realtà SII: switching richiede 2 mesi)
    if (churnProgrammato > 0 && (m + SWITCH_OUT_DELAY) < pendingChurnExits.length) {
      pendingChurnExits[m + SWITCH_OUT_DELAY] += churnProgrammato;
    }

    // L'uscita effettiva avviene al mese corrente solo se era stata programmata 2 mesi fa
    const churn = pendingChurnExits[m] ?? 0;

    cumulativeActiveCustomers = Math.max(
      0,
      cumulativeActiveCustomers + attivazioni - churn
    );

    const clientiFatturati = m >= 3 ? cumulativeActiveCustomers : 0;

    const monthIndex = (startMonth + m) % 12;
    const yearOffset = Math.floor((startMonth + m) / 12);

    const customer: MonthlyCustomerData = {
      month: m,
      monthLabel: `${MONTHS_IT[monthIndex]} ${startYear + yearOffset}`,
      monthIndex,
      year: startYear + yearOffset,
      contrattiNuovi,
      attivazioni,
      churn,
      clientiAttivi: cumulativeActiveCustomers,
      clientiFatturati,
    };

    // ── Fatturato ──
    const fatturato = clientiFatturati * perClient.fattura;

    // ── Incassi (collection waterfall) ──
    if (fatturato > 0) invoicesToCollect.push({ month: m, amount: fatturato });

    let incassoScadenza = 0,
      incasso30gg = 0,
      incasso60gg = 0,
      incassoOltre60gg = 0;

    for (const invoice of invoicesToCollect) {
      const d = m - invoice.month;
      if (d === 0) incassoScadenza += invoice.amount * (params.collectionMonth0 / 100);
      else if (d === 1) incasso30gg += invoice.amount * (params.collectionMonth1 / 100);
      else if (d === 2) incasso60gg += invoice.amount * (params.collectionMonth2 / 100);
      else if (d === 3) incassoOltre60gg += invoice.amount * (params.collectionMonth3Plus / 100);
    }

    const collection: MonthlyCollectionData = {
      incassoScadenza,
      incasso30gg,
      incasso60gg,
      incassoOltre60gg,
      totaleIncassi: incassoScadenza + incasso30gg + incasso60gg + incassoOltre60gg,
    };

    // ── Deposito cauzionale ──
    const depositoLordoAttivazioni = attivazioni * perClient.fattura * depositoMesi * depositoPercentuale;
    const depositoRilasciatoChurn = churn * perClient.fattura * depositoMesi * depositoPercentuale;
    totalDepositoLordo += depositoLordoAttivazioni;
    totalDepositoRestituito += depositoRilasciatoChurn;

    const pagamentiConsumi = m >= 2 ? cumulativeActiveCustomers * perClient.passantiTotale : 0;
    totalPagamentiAccumulati += pagamentiConsumi;

    const depositoRichiesto = Math.max(0, totalDepositoLordo - totalDepositoRestituito - (totalPagamentiAccumulati * svincoloPct));
    const deltaDeposito = depositoRichiesto - previousDeposito;
    previousDeposito = depositoRichiesto;

    const deposit: MonthlyDepositEngineData = {
      depositoLordoAttivazioni,
      depositoRilasciatoChurn,
      pagamentiConsumi,
      depositoRichiesto,
      deltaDeposito,
    };

    // ── Costi operativi/energia ──
    const costiGestionePod = m >= 2 ? cumulativeActiveCustomers * gestionePodPerPod : 0;
    const costoEnergia = m >= 2 ? cumulativeActiveCustomers * kWh * (params.punPerKwh + params.spreadGrossistaPerKwh) : 0;

    // ── Costi passanti e margine (per i clienti fatturati) ──
    const costiPassanti = clientiFatturati * perClient.passantiTotale;
    const margineCommerciale = clientiFatturati * perClient.margineTotale;

    monthly.push({
      customer,
      deposit,
      collection,
      fatturato,
      costiPassanti,
      costiGestionePod,
      costoEnergia,
      margineCommerciale,
    });
  }

  return { perClient, monthly };
}
