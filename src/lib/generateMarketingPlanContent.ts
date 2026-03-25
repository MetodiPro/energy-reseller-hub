import type { ProjectContext, ProductInfo } from './generateBusinessPlanContent';

const formatCurrency = (n: number): string =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

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

export function generateTargetMarket(ctx: ProjectContext): string {
  const commodity = commodityLabel(ctx.commodityType);
  const products = ctx.simulation?.products;

  let text = `MERCATO TARGET\n\n`;
  text += `SEGMENTAZIONE DELLA CLIENTELA:\n`;

  if (products && products.length > 1) {
    text += `Il progetto "${ctx.projectName}" si rivolge a segmenti diversificati attraverso ${products.length} prodotti:\n\n`;
    products.forEach((p, i) => {
      text += `${i + 1}. ${p.name} (${p.contractShare}% dei contratti):\n`;
      text += `   • Target: ${clientTypeLabel(p.clientType)}\n`;
      text += `   • Consumo medio: ${p.avgMonthlyConsumption} kWh/mese\n`;
      text += `   • Tasso attivazione: ${p.activationRate}%\n`;
      if (p.channelName) text += `   • Canale di vendita: ${p.channelName}\n`;
      text += `\n`;
    });
  } else {
    const clientType = clientTypeLabel(ctx.simulation?.clientType || null);
    text += `Il progetto "${ctx.projectName}" si rivolge a ${clientType} per la fornitura di ${commodity} nel mercato libero italiano.\n\n`;

    text += `PROFILO DEL CLIENTE IDEALE:\n`;
    if (ctx.simulation?.clientType === 'domestico') {
      text += `• Famiglie residenziali con contratto attivo nel mercato libero o in transizione dal mercato tutelato\n`;
      text += `• Consumo medio mensile stimato: ${ctx.simulation?.avgMonthlyConsumption || 200} kWh/mese\n`;
      text += `• Sensibilità al prezzo e alla qualità del servizio clienti\n`;
      text += `• Propensione al digitale per gestione contratto e bollette online\n`;
    } else if (ctx.simulation?.clientType === 'business') {
      text += `• PMI e aziende con consumi energetici significativi\n`;
      text += `• Consumo medio mensile stimato: ${ctx.simulation?.avgMonthlyConsumption || 200} kWh/mese\n`;
      text += `• Interesse per offerte personalizzate e consulenza energetica\n`;
      text += `• Attenzione al total cost of ownership e alla stabilità tariffaria\n`;
    } else {
      text += `• Mix di clientela residenziale e business\n`;
      text += `• Consumo medio mensile stimato: ${ctx.simulation?.avgMonthlyConsumption || 200} kWh/mese\n`;
      text += `• Esigenze differenziate: prezzo competitivo (domestici) e personalizzazione (business)\n`;
    }
  }

  text += `\nAREA GEOGRAFICA:\n`;
  text += `L'attività commerciale è prevista ${regionsList(ctx.regions)}.\n\n`;

  text += `DIMENSIONE DEL MERCATO:\n`;
  if (ctx.simulation) {
    const total12m = ctx.simulation.monthlyContracts.reduce((s, c) => s + c, 0);
    text += `• Obiettivo acquisizione: ${total12m.toLocaleString('it-IT')} contratti nei primi 12 mesi\n`;
    if (products && products.length > 1) {
      const weightedActivation = products.reduce((s, p) => s + p.activationRate * p.contractShare / 100, 0);
      text += `• Tasso di attivazione ponderato: ${weightedActivation.toFixed(1)}%\n`;
      text += `• Churn differenziato per prodotto:\n`;
      products.forEach(p => {
        text += `  - ${p.name}: ${p.churnMonth1Pct}% (1°m), ${p.churnMonth2Pct}% (2°m), ${p.churnMonth3Pct}% (3°m), decay ${p.churnDecayFactor}\n`;
      });
    } else {
      text += `• Tasso di attivazione previsto: ${ctx.simulation.activationRate}%\n`;
      text += `• Churn post-attivazione: ${ctx.simulation.churnMonth1Pct}% (1° mese), ${ctx.simulation.churnMonth2Pct}% (2° mese), ${ctx.simulation.churnMonth3Pct}% (3° mese), poi decadimento esponenziale (fattore ${ctx.simulation.churnDecayFactor})\n`;
    }
  }
  if (ctx.expectedVolumes) {
    text += `• Volumi target a regime: ${ctx.expectedVolumes.toLocaleString('it-IT')} utenze\n`;
  }

  return text;
}

export function generateAcquisitionStrategy(ctx: ProjectContext): string {
  const activeChannels = ctx.salesChannels.filter(c => c.is_active && c.contract_share > 0);
  const totalContracts = ctx.simulation ? ctx.simulation.monthlyContracts.reduce((s, c) => s + c, 0) : 0;

  let text = `STRATEGIA DI ACQUISIZIONE CLIENTI\n\n`;

  if (activeChannels.length > 0) {
    text += `CANALI DI VENDITA CONFIGURATI:\n`;
    let totalCommissions = 0;
    activeChannels.forEach(ch => {
      const contracts = Math.round(totalContracts * ch.contract_share / 100);
      const activations = Math.round(contracts * ch.activation_rate / 100);
      const cost = ch.commission_type === 'per_contract'
        ? contracts * ch.commission_amount
        : activations * ch.commission_amount;
      totalCommissions += cost;
      text += `\n• ${ch.channel_name} (quota ${ch.contract_share}%):\n`;
      text += `  - Contratti stimati (12 mesi): ${contracts.toLocaleString('it-IT')}\n`;
      text += `  - Tasso attivazione: ${ch.activation_rate}% → ~${activations.toLocaleString('it-IT')} attivazioni\n`;
      text += `  - Provvigione: ${formatCurrency(ch.commission_amount)} ${ch.commission_type === 'per_contract' ? 'per contratto' : 'per attivazione'}\n`;
      text += `  - Costo provvigionale stimato: ${formatCurrency(cost)}\n`;
    });
    text += `\nCosto totale provvigioni (12 mesi): ${formatCurrency(totalCommissions)}\n`;
    text += `\nNota: il costo provvigioni riportato è una stima basata sul tasso di `;
    text += `attivazione configurato per ciascun canale. Il dato definitivo è disponibile `;
    text += `nella Dashboard Finanziaria (Panoramica → Costi Commerciali).\n\n`;
  } else {
    text += `Nessun canale di vendita configurato. Configurare i canali nella sezione "Finanze > Canali di Vendita".\n\n`;
  }

  text += `FUNNEL DI CONVERSIONE:\n`;
  text += `1. Lead Generation: campagne marketing, referral, partnership\n`;
  text += `2. Primo Contatto: presentazione offerta e simulazione risparmio\n`;
  text += `3. Proposta Contrattuale: invio offerta personalizzata conforme ARERA\n`;
  text += `4. Firma e Switching: raccolta contratto e avvio pratica di switching\n`;
  text += `5. Attivazione: conferma attivazione da parte del distributore\n`;
  text += `6. Retention: customer care proattivo e programmi di fidelizzazione\n\n`;

  text += `RAMPA COMMERCIALE (12 MESI):\n`;
  if (ctx.simulation) {
    ctx.simulation.monthlyContracts.forEach((c, i) => {
      text += `• Mese ${i + 1}: ${c} contratti target\n`;
    });
  }

  return text;
}

export function generatePricingStrategy(ctx: ProjectContext): string {
  const commodity = commodityLabel(ctx.commodityType);
  const products = ctx.simulation?.products;

  let text = `STRATEGIA DI PRICING\n\n`;
  text += `MODELLO TARIFFARIO:\n`;
  text += `L'offerta commerciale per la fornitura di ${commodity} si basa su un modello di pricing trasparente e competitivo.\n\n`;

  if (products && products.length > 1) {
    text += `OFFERTE PER PRODOTTO:\n`;
    products.forEach(p => {
      text += `\n• ${p.name} (${clientTypeLabel(p.clientType)}):\n`;
      text += `  - Spread reseller: ${(p.spreadPerKwh * 1000).toFixed(1)} €/MWh\n`;
      text += `  - CCV: ${formatCurrency(p.ccvMonthly)}/mese\n`;
      text += `  - Consumo medio: ${p.avgMonthlyConsumption} kWh/mese\n`;
      text += `  - IVA: ${p.ivaPercent}%\n`;
    });
    text += `\n`;
  } else if (ctx.simulation) {
    text += `OFFERTA ENERGIA ELETTRICA:\n`;
    text += `• Componente energia: PUN (Prezzo Unico Nazionale) + spread reseller di ${(ctx.simulation.spreadPerKwh * 1000).toFixed(1)} €/MWh\n`;
    text += `• Componente commerciale (CCV): ${formatCurrency(ctx.simulation.ccvMonthly)}/mese per cliente\n`;
    text += `• Costi passanti: trasporto, oneri di sistema, accise e IVA (addebitati al cliente secondo tariffe regolamentate)\n\n`;
  }

  text += `TIPOLOGIE DI OFFERTA:\n`;
  text += `• Offerta a prezzo variabile: indicizzata al PUN, ideale per chi vuole seguire il mercato\n`;
  text += `• Offerta a prezzo fisso: stabilità tariffaria per 12/24 mesi, maggior margine per il reseller\n\n`;

  text += `VANTAGGIO COMPETITIVO SUL PREZZO:\n`;
  text += `Il modello reseller consente di offrire tariffe competitive grazie a:\n`;
  text += `• Struttura dei costi snella (no infrastrutture proprie)\n`;
  text += `• Capacità di modulare lo spread in base al target e al volume\n`;
  text += `• Flessibilità nella composizione dell'offerta\n`;

  return text;
}

export function generateCompetitivePositioning(ctx: ProjectContext): string {
  const products = ctx.simulation?.products;

  let text = `POSIZIONAMENTO COMPETITIVO\n\n`;
  text += `ANALISI COMPETITIVA:\n`;
  text += `Il mercato della vendita di energia in Italia è altamente competitivo con oltre 700 operatori attivi. Il progetto "${ctx.projectName}" si posiziona come operatore agile e focalizzato.\n\n`;

  text += `UNIQUE SELLING PROPOSITION (USP):\n`;
  text += `• Struttura snella: costi operativi ridotti rispetto ai grandi operatori\n`;
  text += `• Servizio personalizzato: rapporto diretto con il cliente, non call center massivi\n`;
  text += `• Trasparenza tariffaria: comunicazione chiara e conforme al Codice di Condotta ARERA\n`;
  text += `• Velocità decisionale: capacità di adattare offerte e strategie rapidamente\n\n`;

  text += `DIFFERENZIATORI CHIAVE:\n`;
  if (products && products.length > 1) {
    const clientTypes = [...new Set(products.map(p => p.clientType))];
    text += `• Offerta multi-prodotto (${products.length} prodotti) per ${clientTypes.map(t => clientTypeLabel(t)).join(' e ')}\n`;
  } else {
    text += `• Focus su ${clientTypeLabel(ctx.simulation?.clientType || null)} con offerte dedicate\n`;
  }
  text += `• Presenza radicata ${regionsList(ctx.regions)}\n`;
  if (ctx.wholesalerName) {
    text += `• Partnership con grossista affidabile (${ctx.wholesalerName})\n`;
  }
  text += `• Area clienti digitale per gestione autonoma del contratto\n`;
  text += `• Customer care reattivo con tempi di risposta garantiti\n\n`;

  text += `BARRIERE ALL'INGRESSO SUPERATE:\n`;
  text += `• Licenza di vendita energia (codice ARERA)\n`;
  text += `• Accordo con grossista/UDD per l'approvvigionamento\n`;
  text += `• Garanzie finanziarie verso il grossista\n`;
  text += `• Piattaforma di fatturazione e CRM operativa\n`;
  if (ctx.totalInvestmentCosts > 0) {
    text += `• Investimento iniziale: ${formatCurrency(ctx.totalInvestmentCosts)}\n`;
  }

  return text;
}

export function generateCommunicationChannels(ctx: ProjectContext): string {
  const activeChannels = ctx.salesChannels.filter(c => c.is_active);

  let text = `CANALI DI COMUNICAZIONE E MARKETING\n\n`;
  text += `STRATEGIA DI COMUNICAZIONE:\n`;
  text += `Il piano di comunicazione è progettato per massimizzare la visibilità del brand e generare lead qualificati attraverso un mix di canali online e offline.\n\n`;

  text += `CANALI DIGITALI:\n`;
  text += `• Sito web aziendale: vetrina dell'offerta, simulatore di risparmio, area clienti\n`;
  text += `• SEO/SEM: posizionamento organico e campagne Google Ads su keyword energia\n`;
  text += `• Social Media: presenza su LinkedIn (B2B) e Facebook/Instagram (B2C)\n`;
  text += `• Email Marketing: nurturing lead, comunicazioni periodiche, promozioni\n`;
  text += `• Content Marketing: blog con guide al risparmio energetico, comparazioni tariffarie\n\n`;

  text += `CANALI TRADIZIONALI:\n`;
  text += `• Rete agenti sul territorio: visibilità diretta e relazione personale\n`;
  text += `• Partnership locali: associazioni di categoria, CAF, studi professionali\n`;
  text += `• Materiale promozionale: brochure, volantini, totem in punti strategici\n\n`;

  if (activeChannels.length > 0) {
    text += `CANALI DI VENDITA ATTIVI:\n`;
    activeChannels.forEach(ch => {
      text += `• ${ch.channel_name}: quota contratti ${ch.contract_share}%\n`;
    });
    text += `\n`;
  }

  text += `COMPLIANCE COMUNICAZIONE:\n`;
  text += `Tutta la comunicazione commerciale è conforme a:\n`;
  text += `• Codice di Condotta Commerciale ARERA\n`;
  text += `• Normativa sulla pubblicità comparativa\n`;
  text += `• GDPR per trattamento dati personali e consensi marketing\n`;
  text += `• Obblighi di trasparenza nella presentazione delle offerte\n`;

  return text;
}

export function generateBudgetAllocation(ctx: ProjectContext): string {
  const activeChannels = ctx.salesChannels.filter(c => c.is_active && c.contract_share > 0);
  const totalContracts = ctx.simulation ? ctx.simulation.monthlyContracts.reduce((s, c) => s + c, 0) : 0;
  const products = ctx.simulation?.products;

  let text = `BUDGET MARKETING E ALLOCAZIONE RISORSE\n\n`;

  let totalCommissions = 0;
  if (activeChannels.length > 0 && totalContracts > 0) {
    activeChannels.forEach(ch => {
      const contracts = Math.round(totalContracts * ch.contract_share / 100);
      const activations = Math.round(contracts * ch.activation_rate / 100);
      totalCommissions += ch.commission_type === 'per_contract'
        ? contracts * ch.commission_amount
        : activations * ch.commission_amount;
    });
  }

  text += `INVESTIMENTO COMPLESSIVO:\n`;
  text += `• Investimento iniziale (processo di avvio): ${formatCurrency(ctx.totalInvestmentCosts)}\n`;
  if (totalCommissions > 0) {
    text += `• Costi provvigionali stimati (12 mesi): ${formatCurrency(totalCommissions)}\n`;
    text += `  (stima indicativa — il dato preciso è nella Dashboard Finanziaria)\n`;
  }
  if (ctx.operationalCosts > 0) {
    text += `• Costi operativi configurati: ${formatCurrency(ctx.operationalCosts)}\n`;
  }
  text += `\n`;

  text += `ALLOCAZIONE BUDGET MARKETING PER CANALE:\n`;
  text += `Si consiglia la seguente distribuzione del budget marketing:\n\n`;

  text += `• Digital Marketing (SEO/SEM, Social): 30-35% del budget\n`;
  text += `  - Google Ads: focus su keyword transazionali (cambio fornitore, offerte energia)\n`;
  text += `  - Social Ads: campagne di awareness e lead generation\n\n`;

  text += `• Rete Commerciale (provvigioni, formazione): 35-40% del budget\n`;
  if (totalCommissions > 0) {
    text += `  - Provvigioni stimate: ${formatCurrency(totalCommissions)}\n`;
  }
  text += `  - Formazione e materiali di vendita\n\n`;

  text += `• Branding e Content (sito, materiali, PR): 15-20% del budget\n`;
  text += `  - Sviluppo e manutenzione sito web con area clienti\n`;
  text += `  - Produzione contenuti (blog, guide, video)\n\n`;

  text += `• Eventi e Partnership: 10-15% del budget\n`;
  text += `  - Partecipazione a fiere di settore\n`;
  text += `  - Co-marketing con partner locali\n\n`;

  text += `KPI DI MONITORAGGIO:\n`;
  text += `• Costo per Lead (CPL)\n`;
  text += `• Costo per Acquisizione (CPA)\n`;
  text += `• Tasso di conversione per canale\n`;
  text += `• Customer Lifetime Value (CLV)\n`;
  text += `• Tasso di retention mensile\n`;
  if (products && products.length > 1) {
    text += `• Churn rate per prodotto:\n`;
    products.forEach(p => {
      const churn9m = p.churnMonth3Pct * Math.pow(p.churnDecayFactor, 6);
      text += `  - ${p.name}: ${p.churnMonth1Pct}% (1°m) → ~${churn9m.toFixed(1)}% (9°m)\n`;
    });
  } else if (ctx.simulation) {
    text += `• Churn rate target: < ${ctx.simulation.churnMonth1Pct}% al 1° mese, decrescente fino a ~${(ctx.simulation.churnMonth3Pct * Math.pow(ctx.simulation.churnDecayFactor, 6)).toFixed(1)}% al 9° mese\n`;
  }

  return text;
}

export function generateAllMarketingSections(ctx: ProjectContext): Record<string, string> {
  return {
    target_market: generateTargetMarket(ctx),
    acquisition_strategy: generateAcquisitionStrategy(ctx),
    pricing_strategy: generatePricingStrategy(ctx),
    competitive_positioning: generateCompetitivePositioning(ctx),
    communication_channels: generateCommunicationChannels(ctx),
    budget_allocation: generateBudgetAllocation(ctx),
  };
}
