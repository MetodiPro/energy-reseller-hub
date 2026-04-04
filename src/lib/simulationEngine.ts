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
  costoGarantitoPerCliente: number; // Base garanzia grossista (materia + trasporto + oneri, NO accise/IVA)
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
  costoEnergia: number;          // Per Esiti Economici: PUN + spreadGrossista (senza dispacciamento)
  costoEnergiaConDisp: number;   // Per Cash Flow: PUN + dispacciamento + spreadGrossista (uscita reale di cassa)
  margineCommerciale: number;
  // Pre-computed breakdown fields for multi-product aggregation
  ivaTotale: number;
  materiaEnergiaTotale: number;
  dispacciamento: number;
  trasportoTotale: number;
  oneriSistemaTotale: number;
  acciseTotale: number;
  fatturatoStimatoAttivi: number;
  costiDeducibiliIva: number;
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

  // Le perdite di rete sono addebitate al cliente finale in bolletta
  // come componente della Materia Energia: i kWh fatturati includono la quota perdite
  // (kWhFatturati = kWhMisurati × (1 + perdite%)), allineando la base di calcolo
  // sia lato bolletta cliente sia lato acquisto dal grossista (simmetria volumi).
  const perditeRetePct = params.perditeRetePct ?? 10.2;
  const perditeRete = 1 + (perditeRetePct / 100);
  const kWhFatturati = kWh * perditeRete;
  const materiaEnergia = (params.punPerKwh + params.dispacciamentoPerKwh) * kWhFatturati;
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

  // Base garanzia grossista: componenti che il grossista anticipa per il reseller
  // Include: Materia Energia (PUN+dispacciamento+perdite), Trasporto, Oneri di Sistema
  // NON include: Accise (versate dal reseller alla dogana), IVA (versata dal reseller all'erario)
  const costoGarantitoPerCliente = materiaEnergia + trasporto + oneriSistema;

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
    costoGarantitoPerCliente,
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

  const svincoloPct = (params.depositoSvincoloPagamentiPerc ?? 0) / 100;
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

    // Churn mese 0: POD appena attivati che ricevono switch-out nello stesso mese
    // di attivazione (es. concorrente first-in wins nel mese di limbo, ripensamento
    // tardivo, doppia sottoscrizione scoperta post-attivazione).
    // La richiesta SII parte nel mese di attivazione → uscita effettiva 2 mesi dopo.
    const churnMonth0Rate = (params.churnMonth0Pct ?? 0) / 100;
    if (attivazioni > 0 && churnMonth0Rate > 0) {
      const churnMonth0 = Math.round(attivazioni * churnMonth0Rate);
      if ((m + SWITCH_OUT_DELAY) < pendingChurnExits.length) {
        pendingChurnExits[m + SWITCH_OUT_DELAY] += churnMonth0;
      }
    }

    // Calcola quanti clienti "comunicano" il recesso questo mese
    // Modello granulare: mesi 3,4,5 manuali, poi decadimento esponenziale
    const churnMonthIndex = m - 3; // 0-based index dei mesi di churn (0=primo mese)
    let churnRate = 0;
    if (m >= 3) {
      if (churnMonthIndex === 0) {
        churnRate = params.churnMonth1Pct ?? params.monthlyChurnRate;
      } else if (churnMonthIndex === 1) {
        churnRate = params.churnMonth2Pct ?? params.monthlyChurnRate;
      } else if (churnMonthIndex === 2) {
        churnRate = params.churnMonth3Pct ?? params.monthlyChurnRate;
      } else {
        // Decadimento esponenziale dal valore del 3° mese
        const baseRate = params.churnMonth3Pct ?? params.monthlyChurnRate;
        const decay = params.churnDecayFactor ?? 0.85;
        churnRate = baseRate * Math.pow(decay, churnMonthIndex - 2);
      }
    }
    const churnProgrammato = m >= 3
      ? Math.round(cumulativeActiveCustomers * (churnRate / 100))
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

    const collectFactor = 1 - (params.uncollectibleRate / 100);
    for (const invoice of invoicesToCollect) {
      const d = m - invoice.month;
      if (d === 0) incassoScadenza += invoice.amount * (params.collectionMonth0 / 100) * collectFactor;
      else if (d === 1) incasso30gg += invoice.amount * (params.collectionMonth1 / 100) * collectFactor;
      else if (d === 2) incasso60gg += invoice.amount * (params.collectionMonth2 / 100) * collectFactor;
      else if (d === 3) incassoOltre60gg += invoice.amount * (params.collectionMonth3Plus / 100) * collectFactor;
    }

    const collection: MonthlyCollectionData = {
      incassoScadenza,
      incasso30gg,
      incasso60gg,
      incassoOltre60gg,
      totaleIncassi: incassoScadenza + incasso30gg + incasso60gg + incassoOltre60gg,
    };

    // ── Deposito cauzionale ──
    // La garanzia è richiesta all'atto della richiesta di switching (1 mese dopo il contratto)
    // Base: costo garantito dal grossista (materia + trasporto + oneri + gestione POD) × N mesi
    // NO accise (versate dal reseller alla dogana), NO IVA
    const switchingRequests = m >= 1 ? Math.round((m - 1 < 12 ? monthlyContracts[m - 1] : 0) * (params.activationRate / 100)) : 0;
    const costoMensileGarantito = perClient.costoGarantitoPerCliente + gestionePodPerPod;
    const depositoLordoAttivazioni = switchingRequests * costoMensileGarantito * depositoMesi * depositoPercentuale;
    // Rilascio: quando il churn effettivo avviene, la garanzia per quei POD viene rilasciata
    const depositoRilasciatoChurn = churn * costoMensileGarantito * depositoMesi * depositoPercentuale;
    totalDepositoLordo += depositoLordoAttivazioni;
    totalDepositoRestituito += depositoRilasciatoChurn;

    const pagamentiConsumi = clientiFatturati * perClient.passantiTotale;
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
    // Perdite di rete: il grossista fattura kWh maggiorati del fattore perdite
    const perditeRete = 1 + ((params.perditeRetePct ?? 0) / 100);
    const kWhAcquistati = kWh * perditeRete;
    const costiGestionePod = m >= 2 ? cumulativeActiveCustomers * gestionePodPerPod : 0;
    const costoEnergia = m >= 2 ? cumulativeActiveCustomers * kWhAcquistati * (params.punPerKwh + params.spreadGrossistaPerKwh) : 0;
    const costoEnergiaConDisp = m >= 2 ? cumulativeActiveCustomers * kWhAcquistati * (params.punPerKwh + params.dispacciamentoPerKwh + params.spreadGrossistaPerKwh) : 0;

    // ── Costi passanti e margine (per i clienti fatturati) ──
    const costiPassanti = clientiFatturati * perClient.passantiTotale;
    const margineCommerciale = clientiFatturati * perClient.margineTotale;

    // ── Pre-computed breakdown ──
    const ivaTotale = clientiFatturati * perClient.iva;
    const materiaEnergiaTotale = clientiFatturati * perClient.materiaEnergia;
    const dispacciamentoTotale = clientiFatturati * params.dispacciamentoPerKwh * kWh;
    const trasportoTotale = clientiFatturati * perClient.trasporto;
    const oneriSistemaTotale = clientiFatturati * perClient.oneriSistema;
    const acciseTotale = clientiFatturati * perClient.accise;
    const fatturatoStimatoAttivi = cumulativeActiveCustomers * perClient.fattura;
    // Base IVA credito in reverse charge: tutta la fattura del grossista al reseller.
    // Deve usare clientiAttivi come base uniforme (il grossista fattura per POD attivi).
    // Componenti: energia (PUN+disp+spread) + trasporto + oneri + fee POD, tutti su clientiAttivi.
    const trasportoPerAttivi = cumulativeActiveCustomers * perClient.trasporto;
    const oneriPerAttivi = cumulativeActiveCustomers * perClient.oneriSistema;
    const costiDeducibiliIva = costoEnergiaConDisp + trasportoPerAttivi + oneriPerAttivi + costiGestionePod;

    monthly.push({
      customer,
      deposit,
      collection,
      fatturato,
      costiPassanti,
      costiGestionePod,
      costoEnergia,
      costoEnergiaConDisp,
      margineCommerciale,
      ivaTotale,
      materiaEnergiaTotale,
      dispacciamento: dispacciamentoTotale,
      trasportoTotale,
      oneriSistemaTotale,
      acciseTotale,
      fatturatoStimatoAttivi,
      costiDeducibiliIva,
    });
  }

  return { perClient, monthly };
}

// ─── Multi-product support ──────────────────────────────────

/** Per-product configuration */
export interface ProductConfig {
  id: string;
  name: string;
  contractShare: number;
  ccvMonthly: number;
  spreadPerKwh: number;
  otherServicesMonthly: number;
  avgMonthlyConsumption: number;
  clientType: string;
  ivaPercent: number;
  activationRate: number;
  churnMonth0Pct: number;
  churnMonth1Pct: number;
  churnMonth2Pct: number;
  churnMonth3Pct: number;
  churnDecayFactor: number;
  collectionMonth0: number;
  collectionMonth1: number;
  collectionMonth2: number;
  collectionMonth3Plus: number;
  uncollectibleRate: number;
}

/** Multi-product engine result */
export interface MultiProductEngineResult {
  products: { product: ProductConfig; result: SimulationEngineResult }[];
  aggregated: SimulationEngineResult;
}

/**
 * Runs the simulation for multiple products, each with its own lifecycle,
 * and aggregates results. Falls back to single-product if no products defined.
 */
export function runMultiProductEngine(
  globalParams: RevenueSimulationParams,
  monthlyContracts: MonthlyContractsTarget,
  startDate: Date,
  products: ProductConfig[]
): MultiProductEngineResult {
  // Fallback: no products → use global params as single product
  if (products.length === 0) {
    const result = runSimulationEngine(globalParams, monthlyContracts, startDate);
    return {
      products: [{
        product: {
          id: 'default', name: 'Default', contractShare: 100,
          ccvMonthly: globalParams.ccvMonthly, spreadPerKwh: globalParams.spreadPerKwh,
          otherServicesMonthly: globalParams.otherServicesMonthly,
          avgMonthlyConsumption: globalParams.avgMonthlyConsumption,
          clientType: globalParams.clientType, ivaPercent: globalParams.ivaPercent,
          activationRate: globalParams.activationRate,
          churnMonth0Pct: globalParams.churnMonth0Pct ?? 0, churnMonth1Pct: globalParams.churnMonth1Pct, churnMonth2Pct: globalParams.churnMonth2Pct,
          churnMonth3Pct: globalParams.churnMonth3Pct, churnDecayFactor: globalParams.churnDecayFactor,
          collectionMonth0: globalParams.collectionMonth0, collectionMonth1: globalParams.collectionMonth1,
          collectionMonth2: globalParams.collectionMonth2, collectionMonth3Plus: globalParams.collectionMonth3Plus,
          uncollectibleRate: globalParams.uncollectibleRate,
        },
        result,
      }],
      aggregated: result,
    };
  }

  const productResults = products.map(product => {
    // Scale monthly contracts by product share
    const scaledContracts = monthlyContracts.map(c =>
      Math.round(c * product.contractShare / 100)
    ) as MonthlyContractsTarget;

    // Merge product-specific params with global passthrough params
    const params: RevenueSimulationParams = {
      ...globalParams,
      ccvMonthly: product.ccvMonthly,
      spreadPerKwh: product.spreadPerKwh,
      otherServicesMonthly: product.otherServicesMonthly,
      avgMonthlyConsumption: product.avgMonthlyConsumption,
      clientType: product.clientType as any,
      ivaPercent: product.ivaPercent,
      activationRate: product.activationRate,
      churnMonth1Pct: product.churnMonth1Pct,
      churnMonth2Pct: product.churnMonth2Pct,
      churnMonth3Pct: product.churnMonth3Pct,
      churnDecayFactor: product.churnDecayFactor,
      collectionMonth0: product.collectionMonth0,
      collectionMonth1: product.collectionMonth1,
      collectionMonth2: product.collectionMonth2,
      collectionMonth3Plus: product.collectionMonth3Plus,
      uncollectibleRate: product.uncollectibleRate,
    };

    return { product, result: runSimulationEngine(params, scaledContracts, startDate) };
  });

  const aggregated = aggregateProductResults(productResults);
  return { products: productResults, aggregated };
}

/** Aggregates multiple product results into a single SimulationEngineResult */
function aggregateProductResults(
  productResults: { product: ProductConfig; result: SimulationEngineResult }[]
): SimulationEngineResult {
  if (productResults.length === 1) return productResults[0].result;

  const monthCount = productResults[0].result.monthly.length;
  const monthly: MonthlyEngineResult[] = [];

  for (let m = 0; m < monthCount; m++) {
    const sources = productResults.map(pr => pr.result.monthly[m]);
    const s = (fn: (x: MonthlyEngineResult) => number) => sources.reduce((acc, x) => acc + (fn(x) ?? 0), 0);

    monthly.push({
      customer: {
        month: sources[0].customer.month,
        monthLabel: sources[0].customer.monthLabel,
        monthIndex: sources[0].customer.monthIndex,
        year: sources[0].customer.year,
        contrattiNuovi: s(x => x.customer.contrattiNuovi),
        attivazioni: s(x => x.customer.attivazioni),
        churn: s(x => x.customer.churn),
        clientiAttivi: s(x => x.customer.clientiAttivi),
        clientiFatturati: s(x => x.customer.clientiFatturati),
      },
      deposit: {
        depositoLordoAttivazioni: s(x => x.deposit.depositoLordoAttivazioni),
        depositoRilasciatoChurn: s(x => x.deposit.depositoRilasciatoChurn),
        pagamentiConsumi: s(x => x.deposit.pagamentiConsumi),
        depositoRichiesto: s(x => x.deposit.depositoRichiesto),
        deltaDeposito: s(x => x.deposit.deltaDeposito),
      },
      collection: {
        incassoScadenza: s(x => x.collection.incassoScadenza),
        incasso30gg: s(x => x.collection.incasso30gg),
        incasso60gg: s(x => x.collection.incasso60gg),
        incassoOltre60gg: s(x => x.collection.incassoOltre60gg),
        totaleIncassi: s(x => x.collection.totaleIncassi),
      },
      fatturato: s(x => x.fatturato),
      costiPassanti: s(x => x.costiPassanti),
      costiGestionePod: s(x => x.costiGestionePod),
      costoEnergia: s(x => x.costoEnergia),
      costoEnergiaConDisp: s(x => x.costoEnergiaConDisp),
      margineCommerciale: s(x => x.margineCommerciale),
      ivaTotale: s(x => x.ivaTotale),
      materiaEnergiaTotale: s(x => x.materiaEnergiaTotale),
      dispacciamento: s(x => x.dispacciamento),
      trasportoTotale: s(x => x.trasportoTotale),
      oneriSistemaTotale: s(x => x.oneriSistemaTotale),
      acciseTotale: s(x => x.acciseTotale),
      fatturatoStimatoAttivi: s(x => x.fatturatoStimatoAttivi),
      costiDeducibiliIva: s(x => x.costiDeducibiliIva),
    });
  }

  // Use first product's perClient as representative (consumers should use monthly pre-computed fields)
  const perClient = productResults[0].result.perClient;
  return { perClient, monthly };
}
