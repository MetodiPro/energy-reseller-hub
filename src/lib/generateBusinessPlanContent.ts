import { processSteps, phases } from '@/data/processSteps';
import type { StepProgress } from '@/hooks/useStepProgress';

export interface ProductInfo {
  name: string;
  contractShare: number;
  ccvMonthly: number;
  spreadPerKwh: number;
  otherServicesMonthly: number;
  avgMonthlyConsumption: number;
  clientType: string;
  ivaPercent: number;
  activationRate: number;
  churnMonth1Pct: number;
  churnMonth2Pct: number;
  churnMonth3Pct: number;
  churnDecayFactor: number;
  channelName?: string;
  uncollectibleRate: number;
  collectionMonth0: number;
  collectionMonth1: number;
  collectionMonth2: number;
  collectionMonth3Plus: number;
}

export interface ProjectContext {
  projectName: string;
  projectDescription: string | null;
  commodityType: string | null;
  marketType: string | null;
  regions: string[] | null;
  expectedVolumes: number | null;
  wholesalerName: string | null;
  plannedStartDate: string | null;
  goLiveDate: string | null;
  stepProgress: Record<string, StepProgress>;
  simulation: {
    monthlyContracts: number[];
    spreadPerKwh: number;
    spreadGasPerSmc: number;
    ccvMonthly: number;
    ccvGasMonthly: number;
    avgMonthlyConsumption: number;
    avgMonthlyConsumptionGas: number;
    activationRate: number;
    monthlyChurnRate: number;
    churnMonth1Pct: number;
    churnMonth2Pct: number;
    churnMonth3Pct: number;
    churnDecayFactor: number;
    clientType: string;
    commodityType: string;
    /** Multi-product configs – when present, per-product data takes priority */
    products?: ProductInfo[];
  } | null;
  salesChannels: Array<{
    channel_name: string;
    commission_amount: number;
    commission_type: string;
    activation_rate: number;
    contract_share: number;
    is_active: boolean;
  }>;
  totalInvestmentCosts: number;
  operationalCosts: number;
  passthroughCosts: number;
  cashFlow?: {
    massimaEsposizione: number;
    meseMassimaEsposizione: string;
    mesePrimoPositivo: string | null;
    saldoFinale: number;
    investimentoIniziale: number;
    totaleIncassi: number;
    totaleDepositi: number;
  };
  phaseData: Array<{
    name: string;
    completion: number;
    costs: number;
    days: number;
    total: number;
    completed: number;
  }>;
}

const commodityLabel = (type: string | null): string => {
  switch (type) {
    case 'solo-luce': return 'energia elettrica';
    default: return 'energia';
  }
};

const clientTypeLabel = (type: string | null): string => {
  switch (type) {
    case 'domestico': return 'clientela domestica (residenziale)';
    case 'business': return 'clientela business (PMI e aziende)';
    case 'pmi': return 'piccole e medie imprese';
    default: return 'clientela mista';
  }
};

const regionsList = (regions: string[] | null): string => {
  if (!regions || regions.length === 0) return 'su tutto il territorio nazionale';
  if (regions.length === 1) return `nella regione ${regions[0]}`;
  return `nelle regioni ${regions.slice(0, -1).join(', ')} e ${regions[regions.length - 1]}`;
};

const formatCurrency = (n: number): string => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

const totalTargetContracts = (contracts: number[]): number => {
  return contracts.reduce((s, c) => s + c, 0);
};

/** Simulate active clients at month 14 for a single product slice */
const simulateProductActiveMonth14 = (
  monthlyContracts: number[],
  contractShare: number,
  activationRate: number,
  churnMonth1Pct: number,
  churnMonth2Pct: number,
  churnMonth3Pct: number,
  churnDecayFactor: number,
): number => {
  const SWITCH_OUT_DELAY = 2;
  const SIM_MONTHS = 14;
  const pendingChurnExits: number[] = new Array(SIM_MONTHS + SWITCH_OUT_DELAY).fill(0);
  let active = 0;
  for (let m = 0; m < SIM_MONTHS; m++) {
    const rawContracts = m >= 2
      ? (m - 2 < monthlyContracts.length ? monthlyContracts[m - 2] : 0)
      : 0;
    const activated = Math.round(rawContracts * contractShare / 100 * activationRate / 100);
    const churnMonthIndex = m - 3;
    let churnRate = 0;
    if (m >= 3) {
      if (churnMonthIndex === 0) churnRate = churnMonth1Pct;
      else if (churnMonthIndex === 1) churnRate = churnMonth2Pct;
      else if (churnMonthIndex === 2) churnRate = churnMonth3Pct;
      else churnRate = churnMonth3Pct * Math.pow(churnDecayFactor, churnMonthIndex - 2);
    }
    const churnProgrammato = m >= 3 ? Math.round(active * churnRate / 100) : 0;
    if (churnProgrammato > 0 && (m + SWITCH_OUT_DELAY) < pendingChurnExits.length) {
      pendingChurnExits[m + SWITCH_OUT_DELAY] += churnProgrammato;
    }
    const churn = pendingChurnExits[m] ?? 0;
    active = Math.max(0, active + activated - churn);
  }
  return active;
};

/** Calculate total active clients at month 14 across all products */
const calculateActiveClientsMonth14 = (ctx: ProjectContext): number => {
  if (!ctx.simulation) return 0;
  const { monthlyContracts } = ctx.simulation;
  const products = ctx.simulation.products;

  if (products && products.length > 0) {
    return products.reduce((sum, p) => sum + simulateProductActiveMonth14(
      monthlyContracts, p.contractShare, p.activationRate,
      p.churnMonth1Pct, p.churnMonth2Pct, p.churnMonth3Pct, p.churnDecayFactor,
    ), 0);
  }

  // Fallback single-product
  const { activationRate, churnMonth1Pct, churnMonth2Pct, churnMonth3Pct, churnDecayFactor } = ctx.simulation;
  return simulateProductActiveMonth14(monthlyContracts, 100, activationRate, churnMonth1Pct, churnMonth2Pct, churnMonth3Pct, churnDecayFactor);
};

/** Helper: describe product mix for text */
const describeProducts = (products: ProductInfo[]): string => {
  if (products.length === 0) return '';
  let text = '';
  products.forEach((p, i) => {
    text += `\n${i + 1}. ${p.name} (${p.contractShare}% dei contratti):\n`;
    text += `   • Target: ${clientTypeLabel(p.clientType)}\n`;
    text += `   • CCV: ${formatCurrency(p.ccvMonthly)}/mese, Spread: ${(p.spreadPerKwh * 1000).toFixed(1)} €/MWh\n`;
    text += `   • Consumo medio: ${p.avgMonthlyConsumption} kWh/mese\n`;
    text += `   • Tasso attivazione: ${p.activationRate}%\n`;
    text += `   • Churn: ${p.churnMonth1Pct}% (1°m), ${p.churnMonth2Pct}% (2°m), ${p.churnMonth3Pct}% (3°m), decay ${p.churnDecayFactor}\n`;
    text += `   • IVA: ${p.ivaPercent}%\n`;
    if (p.channelName) text += `   • Canale: ${p.channelName}\n`;
  });
  return text;
};

export function generateExecutiveSummary(ctx: ProjectContext): string {
  const commodity = commodityLabel(ctx.commodityType);
  const totalContracts = ctx.simulation ? totalTargetContracts(ctx.simulation.monthlyContracts) : 0;
  const activeClients14 = calculateActiveClientsMonth14(ctx);
  const totalDays = processSteps.reduce((s, step) => s + step.estimatedDays, 0);
  const completedSteps = Object.values(ctx.stepProgress).filter(p => p.completed).length;
  const completionRate = processSteps.length > 0 ? Math.round((completedSteps / processSteps.length) * 100) : 0;
  const products = ctx.simulation?.products;

  let text = `EXECUTIVE SUMMARY\n\n`;
  text += `Il presente business plan descrive il progetto "${ctx.projectName}" per l'avvio di un'attività di vendita al dettaglio di ${commodity} nel mercato libero italiano, operando come reseller puro attraverso un accordo di fornitura all'ingrosso`;
  if (ctx.wholesalerName) text += ` con ${ctx.wholesalerName}`;
  text += `.\n\n`;

  if (products && products.length > 1) {
    const clientTypes = [...new Set(products.map(p => p.clientType))];
    text += `L'offerta commerciale è articolata in ${products.length} prodotti distinti, rivolti a ${clientTypes.map(t => clientTypeLabel(t)).join(' e ')} ${regionsList(ctx.regions)}.\n\n`;
  } else {
    text += `L'attività si rivolge a ${clientTypeLabel(ctx.simulation?.clientType || null)} ${regionsList(ctx.regions)}.\n\n`;
  }

  text += `OBIETTIVI PRINCIPALI:\n`;
  if (totalContracts > 0) {
    text += `• Acquisizione di ${totalContracts.toLocaleString('it-IT')} contratti nei primi 12 mesi di operatività\n`;
    text += `• Raggiungimento di una base clienti attiva di circa ${activeClients14.toLocaleString('it-IT')} utenze al 14° mese\n`;
  }
  if (ctx.expectedVolumes) {
    text += `• Volumi attesi: ${ctx.expectedVolumes.toLocaleString('it-IT')} utenze a regime\n`;
  }
  text += `• Investimento iniziale stimato: ${formatCurrency(ctx.totalInvestmentCosts)}\n`;
  text += `• Timeline di implementazione: circa ${totalDays} giorni (${Math.round(totalDays / 30)} mesi)\n\n`;

  text += `STATO AVANZAMENTO:\n`;
  text += `Il progetto è attualmente completato al ${completionRate}% (${completedSteps}/${processSteps.length} adempimenti completati).\n`;
  if (ctx.plannedStartDate) text += `Data di avvio pianificata: ${new Date(ctx.plannedStartDate).toLocaleDateString('it-IT')}.\n`;
  if (ctx.goLiveDate) text += `Data di lancio commerciale prevista: ${new Date(ctx.goLiveDate).toLocaleDateString('it-IT')}.\n`;

  return text;
}

export function generateCompanyDescription(ctx: ProjectContext): string {
  const commodity = commodityLabel(ctx.commodityType);

  let text = `DESCRIZIONE DELLA SOCIETÀ\n\n`;
  text += `La società "${ctx.projectName}" è costituita come Società a Responsabilità Limitata (SRL) con oggetto sociale dedicato alla commercializzazione e vendita di ${commodity} ai clienti finali nel mercato libero italiano.\n\n`;
  
  text += `FORMA GIURIDICA E STRUTTURA:\n`;
  text += `• Forma giuridica: SRL ordinaria\n`;
  text += `• Capitale sociale consigliato: €99.000 (versamento minimo 25% alla costituzione)\n`;
  text += `• Oggetto sociale: Commercializzazione e vendita di ${commodity}\n\n`;

  text += `MODELLO DI BUSINESS:\n`;
  text += `La società opera come reseller puro, ossia acquista ${commodity} all'ingrosso da un Utente del Dispacciamento (UDD/grossista) e la rivende ai clienti finali. Questo modello consente di:\n`;
  text += `• Non richiedere infrastrutture proprietarie di produzione o distribuzione\n`;
  text += `• Delegare al grossista le attività operative di dispacciamento, bilanciamento e switching\n`;
  text += `• Concentrare le risorse su commercializzazione, customer care e gestione contratti\n`;
  text += `• Contenere l'investimento iniziale rispetto al modello di operatore integrato\n\n`;

  if (ctx.wholesalerName) {
    text += `PARTNER GROSSISTA:\n`;
    text += `La fornitura all'ingrosso è assicurata da ${ctx.wholesalerName}, che gestisce i rapporti con Terna, GME e i distributori locali.\n\n`;
  }

  text += `AREA OPERATIVA:\n`;
  text += `L'attività è prevista ${regionsList(ctx.regions)}`;
  const products = ctx.simulation?.products;
  if (products && products.length > 1) {
    const clientTypes = [...new Set(products.map(p => p.clientType))];
    text += ` con focus su ${clientTypes.map(t => clientTypeLabel(t)).join(' e ')}.\n`;
  } else {
    text += ` con focus su ${clientTypeLabel(ctx.simulation?.clientType || null)}.\n`;
  }

  return text;
}

export function generateMarketAnalysis(ctx: ProjectContext): string {
  const commodity = commodityLabel(ctx.commodityType);
  const products = ctx.simulation?.products;

  let text = `ANALISI DI MERCATO\n\n`;
  text += `CONTESTO DI RIFERIMENTO:\n`;
  text += `Il mercato libero dell'energia in Italia ha completato la transizione dal mercato tutelato, aprendo significative opportunità per nuovi operatori. Il settore della vendita di ${commodity} è caratterizzato da:\n`;
  text += `• Oltre 700 operatori attivi nella vendita di energia elettrica\n`;
  text += `• Crescente sensibilità dei consumatori alla comparazione delle offerte\n`;
  text += `• Digitalizzazione crescente dei processi di switching e gestione contratti\n`;
  text += `• Obbligo di pubblicazione offerte sul Portale Offerte ARERA\n\n`;

  text += `TARGET DI MERCATO:\n`;
  if (products && products.length > 1) {
    text += `Il progetto si rivolge a segmenti di clientela diversificati attraverso ${products.length} prodotti distinti:\n`;
    text += describeProducts(products);
    text += `\n`;
  } else {
    text += `Il progetto si rivolge a ${clientTypeLabel(ctx.simulation?.clientType || null)}`;
    if (ctx.regions && ctx.regions.length > 0) text += ` ${regionsList(ctx.regions)}`;
    text += `.\n\n`;
  }

  if (ctx.simulation) {
    text += `DIMENSIONAMENTO:\n`;
    const total12m = totalTargetContracts(ctx.simulation.monthlyContracts);
    text += `• Obiettivo acquisizione: ${total12m.toLocaleString('it-IT')} contratti nei primi 12 mesi\n`;
    if (products && products.length > 1) {
      const weightedConsumption = products.reduce((s, p) => s + p.avgMonthlyConsumption * p.contractShare / 100, 0);
      text += `• Consumo medio ponderato: ${Math.round(weightedConsumption)} kWh/mese\n`;
    } else {
      text += `• Consumo medio stimato per utente: ${ctx.simulation.avgMonthlyConsumption} kWh/mese\n`;
    }
    if (products && products.length > 1) {
      const weightedActivation = products.reduce((s, p) => s + p.activationRate * p.contractShare / 100, 0);
      text += `• Tasso di attivazione ponderato: ${weightedActivation.toFixed(1)}%\n`;
    } else {
      text += `• Tasso di attivazione previsto: ${ctx.simulation.activationRate}%\n`;
    }
    text += `• Base clienti attiva prevista al 14° mese: ~${calculateActiveClientsMonth14(ctx).toLocaleString('it-IT')} utenze\n\n`;
  }

  text += `POSIZIONAMENTO COMPETITIVO:\n`;
  text += `Il modello reseller consente un posizionamento competitivo basato su:\n`;
  text += `• Costi di ingresso contenuti rispetto agli operatori integrati\n`;
  text += `• Flessibilità nell'offerta commerciale e nel pricing\n`;
  text += `• Focalizzazione sul servizio al cliente e sulla qualità della relazione commerciale\n`;
  text += `• Agilità operativa nella risposta alle dinamiche di mercato\n`;

  return text;
}

export function generateOrganization(ctx: ProjectContext): string {
  const activeChannels = ctx.salesChannels.filter(c => c.is_active);

  let text = `STRUTTURA ORGANIZZATIVA\n\n`;
  text += `MODELLO ORGANIZZATIVO:\n`;
  text += `La struttura organizzativa è progettata per essere snella ed efficiente, coerentemente con il modello di business reseller che esternalizza le attività operative al grossista.\n\n`;

  text += `AREE FUNZIONALI:\n`;
  text += `• Direzione Generale: strategia, compliance normativa, rapporti con grossista\n`;
  text += `• Area Commerciale: vendita, gestione rete agenti, marketing\n`;
  text += `• Area Amministrativa: fatturazione, incassi, gestione accise e adempimenti fiscali\n`;
  text += `• Customer Care: gestione clienti, reclami, volture e switching\n`;
  text += `• Compliance e Legale: adempimenti ARERA, GDPR, codice di condotta\n\n`;

  text += `ATTIVITÀ DELEGATE AL GROSSISTA:\n`;
  text += `• Dispacciamento e bilanciamento energia\n`;
  text += `• Gestione rapporti con distributori locali (switching, volture, attivazioni)\n`;
  text += `• Accesso al SII (Sistema Informativo Integrato)\n`;
  text += `• Gestione flussi con Terna e GME\n\n`;

  if (activeChannels.length > 0) {
    text += `RETE COMMERCIALE:\n`;
    text += `La rete di vendita è articolata sui seguenti canali:\n`;
    activeChannels.forEach(ch => {
      text += `• ${ch.channel_name}: ${ch.contract_share}% dei contratti, provvigione ${formatCurrency(ch.commission_amount)} ${ch.commission_type === 'per_contract' ? 'per contratto' : 'per attivazione'} (tasso attivazione ${ch.activation_rate}%)\n`;
    });
    text += `\n`;
  }

  text += `CONSULENTI ESTERNI PREVISTI:\n`;
  text += `• Consulente energetico/normativo: supporto adempimenti ARERA e compliance\n`;
  text += `• Commercialista: gestione fiscale, accise ADM, dichiarazioni periodiche\n`;
  text += `• Legale: contrattualistica, GDPR, codice di condotta commerciale\n`;

  return text;
}

export function generateProductsServices(ctx: ProjectContext): string {
  const commodity = commodityLabel(ctx.commodityType);
  const products = ctx.simulation?.products;

  let text = `PRODOTTI E SERVIZI\n\n`;
  text += `OFFERTA COMMERCIALE:\n`;
  text += `L'offerta si basa sulla vendita di ${commodity} a clienti finali`;

  if (products && products.length > 1) {
    text += `, articolata in ${products.length} prodotti distinti:\n`;
    text += describeProducts(products);
  } else {
    text += ` con le seguenti caratteristiche:\n\n`;
    if (ctx.commodityType !== 'solo-gas') {
      text += `OFFERTA ENERGIA ELETTRICA:\n`;
      if (ctx.simulation) {
        text += `• Prezzo: PUN + spread reseller di ${(ctx.simulation.spreadPerKwh * 1000).toFixed(1)} €/MWh\n`;
        text += `• Componente commerciale (CCV): ${formatCurrency(ctx.simulation.ccvMonthly)}/mese per cliente\n`;
      }
      text += `• Offerte a prezzo variabile (indicizzate al PUN) e/o a prezzo fisso\n`;
      text += `• Trasparenza tariffaria conforme alle disposizioni ARERA\n`;
      text += `• Pubblicazione obbligatoria sul Portale Offerte\n`;
    }
  }

  text += `\nSERVIZI COMPLEMENTARI:\n`;
  text += `• Area clienti online per consultazione bollette e consumi\n`;
  text += `• Supporto clienti multicanale (telefono, email, web)\n`;
  text += `• Fatturazione elettronica conforme alla normativa vigente\n`;
  text += `• Gestione completa pratiche di switching, voltura e subentro (tramite grossista)\n`;
  text += `• Consulenza personalizzata per l'ottimizzazione dei consumi\n`;

  return text;
}

export function generateMarketingStrategy(ctx: ProjectContext): string {
  const activeChannels = ctx.salesChannels.filter(c => c.is_active && c.contract_share > 0);
  const totalContracts = ctx.simulation ? totalTargetContracts(ctx.simulation.monthlyContracts) : 0;
  const products = ctx.simulation?.products;

  let text = `STRATEGIA DI MARKETING E VENDITA\n\n`;
  text += `OBIETTIVI COMMERCIALI:\n`;
  if (ctx.simulation && totalContracts > 0) {
    text += `• Target primi 12 mesi: ${totalContracts.toLocaleString('it-IT')} contratti\n`;
    if (products && products.length > 1) {
      text += `• Ripartizione per prodotto:\n`;
      products.forEach(p => {
        const pContracts = Math.round(totalContracts * p.contractShare / 100);
        text += `  - ${p.name}: ${pContracts.toLocaleString('it-IT')} contratti (${p.contractShare}%)\n`;
      });
    }
    text += `• Rampa commerciale:\n`;
    ctx.simulation.monthlyContracts.forEach((c, i) => {
      text += `  - Mese ${i + 1}: ${c} contratti\n`;
    });
    text += `\n`;
  }

  if (activeChannels.length > 0) {
    text += `CANALI DI ACQUISIZIONE:\n`;
    let totalCommissions = 0;
    activeChannels.forEach(ch => {
      const contracts = Math.round(totalContracts * ch.contract_share / 100);
      const activations = Math.round(contracts * ch.activation_rate / 100);
      const cost = ch.commission_type === 'per_contract'
        ? contracts * ch.commission_amount
        : activations * ch.commission_amount;
      totalCommissions += cost;
      text += `• ${ch.channel_name} (${ch.contract_share}% quota): ~${contracts} contratti, costo provvigioni stimato ${formatCurrency(cost)}\n`;
    });
    text += `\nCosto totale provvigioni stimato (12 mesi): ${formatCurrency(totalCommissions)}\n`;
    text += `\nNota: la stima sopra è indicativa. Il costo provvigioni preciso, calcolato \n`;
    text += `mese per mese sui clienti effettivamente attivati, è disponibile nella Dashboard \n`;
    text += `Finanziaria (Panoramica → Costi Commerciali).\n\n`;
  }

  text += `STRATEGIA DI PRICING:\n`;
  if (products && products.length > 1) {
    text += `Il posizionamento tariffario è differenziato per prodotto:\n`;
    products.forEach(p => {
      text += `• ${p.name}: spread ${(p.spreadPerKwh * 1000).toFixed(1)} €/MWh + CCV ${formatCurrency(p.ccvMonthly)}/mese (${clientTypeLabel(p.clientType)})\n`;
    });
    text += `\n`;
  } else {
    text += `Il posizionamento tariffario si basa sul modello di doppio spread:\n`;
    if (ctx.simulation) {
      text += `• Costo di acquisto: PUN + spread grossista\n`;
      text += `• Prezzo di vendita: PUN + spread reseller (${(ctx.simulation.spreadPerKwh * 1000).toFixed(1)} €/MWh)\n`;
      text += `• Margine unitario: differenza tra spread reseller e spread grossista\n\n`;
    }
  }

  text += `COMUNICAZIONE E BRANDING:\n`;
  text += `• Sviluppo brand identity e sito web aziendale con area clienti\n`;
  text += `• Campagne digital marketing (Google Ads, social media)\n`;
  text += `• Conformità al Codice di Condotta Commerciale ARERA\n`;
  text += `• Materiali commerciali conformi agli obblighi di trasparenza\n`;

  return text;
}

export function generateFinancialPlan(ctx: ProjectContext): string {
  const totalContracts = ctx.simulation ? totalTargetContracts(ctx.simulation.monthlyContracts) : 0;
  const activeClients14 = calculateActiveClientsMonth14(ctx);
  const products = ctx.simulation?.products;

  let text = `PIANO ECONOMICO-FINANZIARIO\n\n`;

  text += `INVESTIMENTO INIZIALE:\n`;
  text += `L'investimento complessivo per l'avvio dell'attività è stimato in ${formatCurrency(ctx.totalInvestmentCosts)}, così ripartito per fasi:\n\n`;

  ctx.phaseData.forEach((phase, idx) => {
    if (phase.costs > 0) {
      text += `• Fase ${idx + 1} - ${phase.name}: ${formatCurrency(phase.costs)} (~${phase.days} giorni)\n`;
    }
  });
  text += `\n`;

  text += `STRUTTURA DEI RICAVI E MARGINE:\n`;
  if (products && products.length > 1) {
    text += `L'offerta è articolata in ${products.length} prodotti, ciascuno con margini e parametri propri:\n`;
    products.forEach(p => {
      text += `\n• ${p.name} (${p.contractShare}% contratti, ${clientTypeLabel(p.clientType)}):\n`;
      text += `  - CCV: ${formatCurrency(p.ccvMonthly)}/mese, Spread: ${(p.spreadPerKwh * 1000).toFixed(1)} €/MWh\n`;
      text += `  - Consumo medio: ${p.avgMonthlyConsumption} kWh/mese, IVA: ${p.ivaPercent}%\n`;
      text += `  - Incasso: ${p.collectionMonth0}% alla scadenza, ${p.collectionMonth1}% a 30gg, ${p.collectionMonth2}% a 60gg, ${p.collectionMonth3Plus}% oltre\n`;
      text += `  - Insoluti: ${p.uncollectibleRate}%\n`;
    });
    text += `\n`;
  } else {
    text += `• Ricavi commerciali: CCV mensile + spread reseller × kWh per ogni cliente attivo\n`;
    text += `• Margine commerciale lordo: ricavi commerciali − costo energia grossista − fee POD\n`;
    text += `  = (spread_reseller − spread_grossista) × kWh + CCV − fee POD, per cliente/mese\n`;
    if (ctx.simulation) {
      text += `• Spread reseller applicato: ${(ctx.simulation.spreadPerKwh * 1000).toFixed(1)} €/MWh\n`;
      text += `• CCV mensile: ${formatCurrency(ctx.simulation.ccvMonthly)}/cliente/mese\n`;
    }
  }
  text += `• Il fatturato lordo include passanti (energia, trasporto, oneri, accise) e IVA\n`;
  text += `• Servizi aggiuntivi\n\n`;

  text += `STRUTTURA DEI COSTI:\n`;
  text += `I costi si dividono in tre categorie:\n\n`;
  text += `1. COSTI ENERGETICI (pagati al grossista):\n`;
  text += `   • Costo acquisto energia: PUN × kWh consumati dai clienti\n`;
  text += `   • Spread grossista × kWh (mark-up del fornitore all'ingrosso)\n`;
  text += `   • Fee gestione POD: corrispettivo fisso per ogni punto di fornitura attivo\n\n`;
  text += `2. COSTI PASSANTI (incassati dal cliente e girati a terzi):\n`;
  text += `   • Trasporto e distribuzione → DSO (Distributore locale)\n`;
  text += `   • Oneri di sistema ASOS/ARIM → CSEA/GSE\n`;
  text += `   • Accise → Agenzia delle Dogane (ADM)\n`;
  text += `   Nota: questi importi sono partite di giro che impattano la liquidità\n`;
  text += `   ma non il margine commerciale del reseller.\n\n`;
  text += `3. COSTI OPERATIVI PROPRI:\n`;
  if (ctx.operationalCosts > 0) {
    text += `   • Costi operativi configurati: ${formatCurrency(ctx.operationalCosts)}\n`;
  }
  text += `   • Provvigioni canali di vendita (vedi sezione Marketing)\n`;
  text += `   • Costi strutturali: personale, software, ufficio, consulenze\n\n`;

  const activeChannels = ctx.salesChannels.filter(c => c.is_active && c.contract_share > 0);
  if (activeChannels.length > 0 && totalContracts > 0) {
    let totalCommissions = 0;
    activeChannels.forEach(ch => {
      const contracts = Math.round(totalContracts * ch.contract_share / 100);
      const activations = Math.round(contracts * ch.activation_rate / 100);
      totalCommissions += ch.commission_type === 'per_contract'
        ? contracts * ch.commission_amount
        : activations * ch.commission_amount;
    });
    text += `• Provvigioni commerciali stimate (12 mesi): ${formatCurrency(totalCommissions)}\n`;
    text += `  (stima indicativa — vedi Dashboard Finanziaria per il calcolo mensile preciso)\n`;
  }
  text += `\n`;

  text += `PROIEZIONI:\n`;
  if (totalContracts > 0) {
    text += `• Contratti acquisiti (12 mesi): ${totalContracts.toLocaleString('it-IT')}\n`;
    if (products && products.length > 1) {
      text += `• Base clienti attiva al 14° mese: ~${activeClients14.toLocaleString('it-IT')} (multi-prodotto con churn differenziato per prodotto)\n`;
    } else {
      text += `• Base clienti attiva al 14° mese: ~${activeClients14.toLocaleString('it-IT')} (churn con preavviso contrattuale di 2 mesi per switching)\n`;
    }
  }
  text += `• Timeline di implementazione complessiva: ${processSteps.reduce((s, step) => s + step.estimatedDays, 0)} giorni\n\n`;

  text += `GESTIONE DEL CASH FLOW E LIQUIDITÀ:\n`;
  if (ctx.cashFlow) {
    const cf = ctx.cashFlow;
    text += `L'analisi della liquidità su 14 mesi mostra:\n\n`;
    text += `• Investimento iniziale totale: ${formatCurrency(cf.investimentoIniziale)}\n`;
    text += `• Massima esposizione finanziaria: ${formatCurrency(Math.abs(cf.massimaEsposizione))}`;
    text += ` (picco nel mese ${cf.meseMassimaEsposizione})\n`;
    text += `• Break-even di liquidità: ${cf.mesePrimoPositivo ? `mese ${cf.mesePrimoPositivo}` : 'non raggiunto nei 14 mesi'}\n`;
    text += `• Saldo cassa a fine simulazione: ${formatCurrency(cf.saldoFinale)}\n`;
    text += `• Depositi cauzionali cumulati: ${formatCurrency(cf.totaleDepositi)} (liquidità vincolata, non costo)\n\n`;
    text += `FABBISOGNO FINANZIARIO:\n`;
    text += `Per sostenere il piano, il reseller deve disporre di un capitale iniziale di almeno `;
    text += `${formatCurrency(Math.abs(cf.massimaEsposizione) + cf.investimentoIniziale)}, `;
    text += `comprensivo dell'investimento di avvio e della liquidità necessaria a coprire `;
    text += `il periodo pre-pareggio. In alternativa, è possibile strutturare una linea di `;
    text += `credito rotativa (fido di cassa) di pari importo presso l'istituto bancario.\n\n`;
  } else {
    text += `Il modello finanziario prevede:\n`;
    text += `• Deposito cauzionale verso il grossista (proporzionale ai volumi)\n`;
    text += `• Collection aging sui pagamenti dei clienti (waterfall 30/60/90 giorni)\n`;
    text += `• Versamenti periodici accise (ADM trimestrale) e IVA (F24 mensile)\n`;
    text += `• Componenti di giro (trasporto, oneri, accise) incassate e riversate a terzi\n`;
    text += `\nPer i valori numerici di dettaglio consultare la sezione Liquidità della Dashboard Finanziaria.\n`;
  }

  return text;
}

export function generateAllSections(ctx: ProjectContext): Record<string, string> {
  return {
    executive_summary: generateExecutiveSummary(ctx),
    company_description: generateCompanyDescription(ctx),
    market_analysis: generateMarketAnalysis(ctx),
    organization: generateOrganization(ctx),
    products_services: generateProductsServices(ctx),
    marketing_strategy: generateMarketingStrategy(ctx),
    financial_plan: generateFinancialPlan(ctx),
  };
}
