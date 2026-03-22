import type { ProjectContext } from './generateBusinessPlanContent';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface BusinessPlanIssue {
  id: string;
  severity: IssueSeverity;
  section: string; // which BP section it affects
  title: string;
  description: string;
  action: string; // what the user should do
  navigationHint?: string; // where to go in the app
}

export function validateBusinessPlan(ctx: ProjectContext): BusinessPlanIssue[] {
  const issues: BusinessPlanIssue[] = [];

  // --- CRITICAL: data that makes the BP unreliable ---

  if (!ctx.commodityType) {
    issues.push({
      id: 'missing_commodity',
      severity: 'critical',
      section: 'executive_summary',
      title: 'Tipologia commodity non definita',
      description: 'Il tipo di fornitura non è stato configurato. Il BP utilizza un generico "energia".',
      action: 'Vai in Impostazioni Progetto e seleziona la tipologia commodity.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.simulation) {
    issues.push({
      id: 'missing_simulation',
      severity: 'critical',
      section: 'financial_plan',
      title: 'Simulazione ricavi assente',
      description: 'Nessuna simulazione dei ricavi configurata. Le sezioni finanziarie, di mercato e marketing non possono essere generate con dati realistici.',
      action: 'Configura la simulazione nella sezione Finanze > Ipotesi Operative.',
      navigationHint: 'finance',
    });
  }

  if (ctx.totalInvestmentCosts === 0) {
    issues.push({
      id: 'zero_investment',
      severity: 'critical',
      section: 'financial_plan',
      title: 'Investimento iniziale a zero',
      description: 'Nessun costo di processo configurato. Il piano finanziario risulterà irrealistico.',
      action: 'Configura i costi degli step nella sezione Processo.',
      navigationHint: 'process',
    });
  }

  // --- WARNING: important omissions ---

  if (!ctx.wholesalerName) {
    issues.push({
      id: 'missing_wholesaler',
      severity: 'warning',
      section: 'company_description',
      title: 'Grossista non specificato',
      description: 'Il nome del grossista/UDD non è configurato. La descrizione societaria ometterà il partner di fornitura.',
      action: 'Inserisci il nome del grossista nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.regions || ctx.regions.length === 0) {
    issues.push({
      id: 'missing_regions',
      severity: 'warning',
      section: 'market_analysis',
      title: 'Area operativa non definita',
      description: 'Nessuna regione target configurata. L\'analisi di mercato indicherà genericamente "tutto il territorio nazionale".',
      action: 'Seleziona le regioni target nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.plannedStartDate) {
    issues.push({
      id: 'missing_start_date',
      severity: 'warning',
      section: 'executive_summary',
      title: 'Data di avvio non pianificata',
      description: 'La data di avvio progetto non è stata configurata. La timeline nell\'Executive Summary sarà incompleta.',
      action: 'Imposta la data di avvio nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.goLiveDate) {
    issues.push({
      id: 'missing_golive',
      severity: 'warning',
      section: 'executive_summary',
      title: 'Data di lancio commerciale assente',
      description: 'La data di go-live non è impostata. L\'Executive Summary non includerà la data di lancio prevista.',
      action: 'Imposta la data di go-live nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  const activeChannels = ctx.salesChannels.filter(c => c.is_active);
  if (activeChannels.length === 0) {
    issues.push({
      id: 'no_sales_channels',
      severity: 'warning',
      section: 'marketing_strategy',
      title: 'Nessun canale di vendita configurato',
      description: 'Senza canali di vendita attivi, le sezioni Organizzazione e Strategia Marketing non includeranno la rete commerciale.',
      action: 'Configura almeno un canale nella sezione Finanze > Canali di Vendita.',
      navigationHint: 'finance',
    });
  } else {
    const totalShare = activeChannels.reduce((s, c) => s + c.contract_share, 0);
    if (Math.abs(totalShare - 100) > 1) {
      issues.push({
        id: 'channel_share_mismatch',
        severity: 'warning',
        section: 'marketing_strategy',
        title: `Quote canali non sommano al 100% (${totalShare.toFixed(0)}%)`,
        description: 'La somma delle quote contrattuali dei canali attivi non è pari al 100%. Le proiezioni di costo per canale saranno imprecise.',
        action: 'Ribilancia le quote nella sezione Finanze > Canali di Vendita.',
        navigationHint: 'finance',
      });
    }
  }

  if (ctx.simulation) {
    const totalContracts = ctx.simulation.monthlyContracts.reduce((s, c) => s + c, 0);
    if (totalContracts === 0) {
      issues.push({
        id: 'zero_contracts',
        severity: 'warning',
        section: 'market_analysis',
        title: 'Target contratti a zero',
        description: 'I target mensili di acquisizione contratti sono tutti a zero. Le proiezioni finanziarie e di mercato risulteranno vuote.',
        action: 'Inserisci i target mensili nella sezione Finanze > Ipotesi Operative.',
        navigationHint: 'finance',
      });
    }

    if (ctx.simulation.spreadPerKwh <= 0 && ctx.simulation.commodityType !== 'gas') {
      issues.push({
        id: 'zero_spread_luce',
        severity: 'warning',
        section: 'products_services',
        title: 'Spread reseller luce a zero',
        description: 'Lo spread di margine sull\'energia elettrica è nullo. Il piano finanziario mostrerà ricavi da commodity pari a zero.',
        action: 'Configura lo spread nella sezione Finanze > Ipotesi Operative.',
        navigationHint: 'finance',
      });
    }


    if (ctx.simulation.spreadPerKwh > 0 && ctx.simulation.spreadPerKwh < 0.005) {
      issues.push({
        id: 'spread_too_low',
        severity: 'warning',
        section: 'financial_plan',
        title: 'Spread reseller molto basso',
        description: `Lo spread applicato al cliente (${(ctx.simulation.spreadPerKwh * 1000).toFixed(1)} €/MWh) è sotto la soglia minima consigliata. Dopo aver sottratto il costo grossista e la fee POD, il margine netto per cliente potrebbe essere negativo. Verificare nella dashboard Finanze il margine netto per cliente.`,
        action: 'Verifica in Finanze > Ipotesi Operative il box "Margine netto stimato per cliente/mese" e aumenta lo spread se è negativo.',
        navigationHint: 'hypotheses',
      });
    }

    if (ctx.simulation.ccvMonthly === 0 && ctx.simulation.spreadPerKwh < 0.01) {
      issues.push({
        id: 'zero_ccv_low_spread',
        severity: 'warning',
        section: 'financial_plan',
        title: 'CCV nullo con spread basso',
        description: 'Il corrispettivo commerciale mensile (CCV) è zero e lo spread è basso. Il Business Plan mostrerebbe un modello commerciale non sostenibile.',
        action: 'Configura un CCV mensile positivo in Finanze > Ipotesi Operative.',
        navigationHint: 'hypotheses',
      });
    }


      issues.push({
        id: 'zero_churn',
        severity: 'info',
        section: 'market_analysis',
        title: 'Tasso di churn non configurato',
        description: 'Il tasso di abbandono mensile è zero. Le proiezioni sono ottimistiche — un valore realistico è tra 1% e 3%.',
        action: 'Imposta un tasso di churn realistico in Finanze > Ipotesi Operative.',
        navigationHint: 'finance',
      });
    }
  }

  // --- INFO: completeness improvements ---

  if (!ctx.projectDescription) {
    issues.push({
      id: 'missing_description',
      severity: 'info',
      section: 'company_description',
      title: 'Descrizione progetto assente',
      description: 'Una descrizione del progetto arricchirebbe l\'Executive Summary e la Descrizione Società.',
      action: 'Aggiungi una descrizione nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.expectedVolumes) {
    issues.push({
      id: 'missing_volumes',
      severity: 'info',
      section: 'executive_summary',
      title: 'Volumi attesi a regime non definiti',
      description: 'I volumi attesi a regime non sono configurati. L\'Executive Summary non includerà questo obiettivo.',
      action: 'Imposta i volumi attesi nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  const completedSteps = Object.values(ctx.stepProgress).filter(p => p.completed).length;
  const totalSteps = Object.keys(ctx.stepProgress).length;
  if (totalSteps > 0 && completedSteps === 0) {
    issues.push({
      id: 'no_progress',
      severity: 'info',
      section: 'executive_summary',
      title: 'Nessun adempimento completato',
      description: 'Il tracker di processo non mostra step completati. L\'avanzamento risulta allo 0%.',
      action: 'Avanza gli adempimenti nella sezione Processo.',
      navigationHint: 'process',
    });
  }

  if (ctx.operationalCosts === 0 && ctx.totalInvestmentCosts > 0) {
    issues.push({
      id: 'no_operational_costs',
      severity: 'info',
      section: 'financial_plan',
      title: 'Costi operativi non configurati',
      description: 'Non sono presenti costi operativi ricorrenti. Il piano finanziario potrebbe sottostimare le uscite periodiche.',
      action: 'Aggiungi costi operativi nella sezione Finanze > Costi e Ricavi.',
      navigationHint: 'finance',
    });
  }

  return issues;
}

export function getIssueSummary(issues: BusinessPlanIssue[]) {
  return {
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    total: issues.length,
    score: Math.max(0, 100 - issues.filter(i => i.severity === 'critical').length * 25 - issues.filter(i => i.severity === 'warning').length * 8 - issues.filter(i => i.severity === 'info').length * 2),
  };
}
