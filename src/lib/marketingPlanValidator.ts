import type { ProjectContext } from './generateBusinessPlanContent';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface MarketingPlanIssue {
  id: string;
  severity: IssueSeverity;
  section: string;
  title: string;
  description: string;
  action: string;
  navigationHint?: string;
}

export function validateMarketingPlan(ctx: ProjectContext): MarketingPlanIssue[] {
  const issues: MarketingPlanIssue[] = [];

  if (!ctx.simulation) {
    issues.push({
      id: 'mp_missing_simulation', severity: 'critical', section: 'target_market',
      title: 'Simulazione ricavi assente',
      description: 'Senza simulazione non è possibile generare target, pricing o budget realistici.',
      action: 'Configura la simulazione nella sezione Finanze > Ipotesi Operative.',
      navigationHint: 'finance',
    });
  }

  if (!ctx.commodityType) {
    issues.push({
      id: 'mp_missing_commodity', severity: 'critical', section: 'pricing_strategy',
      title: 'Tipologia commodity non definita',
      description: 'Determina l\'intera strategia di pricing e comunicazione.',
      action: 'Seleziona la commodity nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  const activeChannels = ctx.salesChannels.filter(c => c.is_active);
  if (activeChannels.length === 0) {
    issues.push({
      id: 'mp_no_channels', severity: 'critical', section: 'acquisition_strategy',
      title: 'Nessun canale di vendita attivo',
      description: 'Strategia di acquisizione e budget non calcolabili.',
      action: 'Configura almeno un canale nella sezione Finanze > Canali di Vendita.',
      navigationHint: 'finance',
    });
  }

  if (ctx.simulation) {
    const totalContracts = ctx.simulation.monthlyContracts.reduce((s, c) => s + c, 0);
    if (totalContracts === 0) {
      issues.push({
        id: 'mp_zero_contracts', severity: 'warning', section: 'target_market',
        title: 'Target contratti a zero',
        description: 'Il piano marketing non avrà obiettivi quantitativi.',
        action: 'Inserisci i target mensili in Finanze > Ipotesi Operative.',
        navigationHint: 'finance',
      });
    }

    const products = ctx.simulation.products;
    if (products && products.length > 0) {
      products.forEach(p => {
        if (p.spreadPerKwh <= 0) {
          issues.push({
            id: `mp_zero_spread_${p.name}`, severity: 'warning', section: 'pricing_strategy',
            title: `Spread a zero per "${p.name}"`,
            description: `Il pricing del prodotto "${p.name}" non mostra margini realistici.`,
            action: `Configura lo spread in Ipotesi Operative > Prodotti.`,
            navigationHint: 'hypotheses',
          });
        }
      });

      const totalShare = products.reduce((s, p) => s + p.contractShare, 0);
      if (Math.abs(totalShare - 100) > 1) {
        issues.push({
          id: 'mp_product_share_mismatch', severity: 'warning', section: 'target_market',
          title: `Quote prodotto non sommano al 100% (${totalShare.toFixed(0)}%)`,
          description: 'La distribuzione dei contratti tra prodotti non è coerente.',
          action: 'Ribilancia le quote in Ipotesi Operative > Prodotti.',
          navigationHint: 'hypotheses',
        });
      }

      const hasZeroChurn = products.some(p => p.churnMonth1Pct <= 0);
      if (hasZeroChurn) {
        issues.push({
          id: 'mp_zero_churn_product', severity: 'info', section: 'budget_allocation',
          title: 'Churn non configurato per alcuni prodotti',
          description: 'Senza churn rate il budget non considera costi di retention.',
          action: 'Imposta i tassi di churn in Ipotesi Operative > Prodotti.',
          navigationHint: 'hypotheses',
        });
      }
    } else {
      if (!ctx.simulation.clientType) {
        issues.push({
          id: 'mp_missing_client_type', severity: 'warning', section: 'target_market',
          title: 'Tipo cliente non specificato',
          description: 'Segmentazione generica.',
          action: 'Seleziona il tipo cliente in Finanze > Ipotesi Operative.',
          navigationHint: 'finance',
        });
      }

      if (ctx.simulation.spreadPerKwh <= 0 && ctx.simulation.commodityType !== 'gas') {
        issues.push({
          id: 'mp_zero_spread_luce', severity: 'warning', section: 'pricing_strategy',
          title: 'Spread reseller luce a zero',
          description: 'Il pricing non mostra margini realistici.',
          action: 'Configura lo spread luce in Finanze > Ipotesi Operative.',
          navigationHint: 'finance',
        });
      }

      if ((ctx.simulation.churnMonth1Pct ?? ctx.simulation.monthlyChurnRate) <= 0) {
        issues.push({
          id: 'mp_zero_churn', severity: 'info', section: 'budget_allocation',
          title: 'Tasso di churn non configurato',
          description: 'Senza churn rate il budget non considera costi di retention.',
          action: 'Imposta i tassi di churn in Finanze > Ipotesi Operative.',
          navigationHint: 'finance',
        });
      }
    }
  }

  if (activeChannels.length > 0) {
    const totalShare = activeChannels.reduce((s, c) => s + c.contract_share, 0);
    if (Math.abs(totalShare - 100) > 1) {
      issues.push({
        id: 'mp_channel_share_mismatch', severity: 'warning', section: 'acquisition_strategy',
        title: `Quote canali non sommano al 100% (${totalShare.toFixed(0)}%)`,
        description: 'Stime di contratti e costi per canale imprecise.',
        action: 'Ribilancia le quote in Finanze > Canali di Vendita.',
        navigationHint: 'finance',
      });
    }

    const zeroCommChannels = activeChannels.filter(c => c.commission_amount <= 0);
    if (zeroCommChannels.length > 0) {
      issues.push({
        id: 'mp_zero_commissions', severity: 'warning', section: 'budget_allocation',
        title: `${zeroCommChannels.length} canal${zeroCommChannels.length > 1 ? 'i' : 'e'} con provvigione a zero`,
        description: `I canali ${zeroCommChannels.map(c => c.channel_name).join(', ')} hanno provvigione nulla.`,
        action: 'Configura le provvigioni in Finanze > Canali di Vendita.',
        navigationHint: 'finance',
      });
    }
  }

  if (!ctx.regions || ctx.regions.length === 0) {
    issues.push({
      id: 'mp_missing_regions', severity: 'warning', section: 'target_market',
      title: 'Area geografica non definita',
      description: 'Segmentazione area operativa non possibile.',
      action: 'Seleziona le regioni target nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.wholesalerName) {
    issues.push({
      id: 'mp_missing_wholesaler', severity: 'warning', section: 'competitive_positioning',
      title: 'Grossista non specificato',
      description: 'Posizionamento competitivo incompleto.',
      action: 'Inserisci il nome del grossista nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.projectDescription) {
    issues.push({
      id: 'mp_missing_description', severity: 'info', section: 'competitive_positioning',
      title: 'Descrizione progetto assente',
      description: 'Arricchirebbe il posizionamento competitivo.',
      action: 'Aggiungi una descrizione nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (!ctx.expectedVolumes) {
    issues.push({
      id: 'mp_missing_volumes', severity: 'info', section: 'target_market',
      title: 'Volumi target a regime non definiti',
      description: 'Sezione Mercato Target incompleta.',
      action: 'Imposta i volumi attesi nelle Impostazioni Progetto.',
      navigationHint: 'settings',
    });
  }

  if (ctx.totalInvestmentCosts === 0) {
    issues.push({
      id: 'mp_zero_investment', severity: 'info', section: 'budget_allocation',
      title: 'Investimento iniziale a zero',
      description: 'Quadro degli investimenti incompleto.',
      action: 'Configura i costi in Processo o Finanze > Costi e Ricavi.',
      navigationHint: 'process',
    });
  }

  return issues;
}

export function getMarketingIssueSummary(issues: MarketingPlanIssue[]) {
  return {
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    total: issues.length,
    score: Math.max(0, 100 - issues.filter(i => i.severity === 'critical').length * 25 - issues.filter(i => i.severity === 'warning').length * 8 - issues.filter(i => i.severity === 'info').length * 2),
  };
}
