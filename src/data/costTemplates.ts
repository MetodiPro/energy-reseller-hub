export interface CostTemplateItem {
  name: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  cost_type: 'commercial' | 'structural' | 'direct' | 'indirect';
  is_recurring: boolean;
  recurrence_period?: string;
  // New fields for detailed hypothesis
  calculation_basis?: string; // Human-readable formula explanation
  calculation_params?: {
    num_clients?: number;
    price_per_client?: number;
    price_per_kwh?: number;
    price_per_smc?: number;
    consumption_kwh?: number;
    consumption_smc?: number;
    percentage?: number;
    base_value?: number;
  };
  is_passthrough?: boolean; // True if cost goes to wholesaler/distributor
  passthrough_recipient?: string; // grossista, distributore, erario, etc.
  commodity_filter?: 'luce' | null; // Filter by commodity type
}

export interface RevenueTemplateItem {
  name: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  revenue_type: string;
  status: string;
  // New fields
  margin_type?: 'fixed' | 'per_client' | 'per_kwh' | 'per_smc' | 'percentage';
  calculation_basis?: string;
  calculation_params?: {
    num_clients?: number;
    margin_per_client?: number;
    margin_per_kwh?: number;
    margin_per_smc?: number;
    consumption_kwh?: number;
    consumption_smc?: number;
    price_per_kwh?: number;
    price_per_smc?: number;
    percentage?: number;
  };
  commodity_filter?: 'luce' | null; // Filter by commodity type
}

export interface TaxTemplateItem {
  tax_type: string;
  name: string;
  description: string;
  recipient: string;
  rate_type: 'percentage' | 'per_unit' | 'fixed';
  rate_value: number;
  rate_unit: string;
  base_amount: number;
  base_unit: string;
  is_recurring: boolean;
  recurrence_period: string;
  calculation_hypothesis: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  costs: CostTemplateItem[];
  revenues: RevenueTemplateItem[];
  taxes: TaxTemplateItem[];
  passthrough_costs: CostTemplateItem[]; // Separated passthrough costs
}

// Standard tax templates for Italian energy resellers
export const standardTaxTemplates: TaxTemplateItem[] = [
  {
    tax_type: 'accise_energia',
    name: 'Accise Energia Elettrica',
    description: 'Imposta erariale sui consumi di energia elettrica',
    recipient: 'Agenzia Dogane e Monopoli (ADM)',
    rate_type: 'per_unit',
    rate_value: 0.0227,
    rate_unit: '€/kWh',
    base_amount: 150000, // Estimated annual kWh
    base_unit: 'kWh/anno',
    is_recurring: true,
    recurrence_period: 'monthly',
    calculation_hypothesis: 'Stima basata su 500 clienti residenziali x 300 kWh/mese consumo medio = 150.000 kWh/mese. Aliquota domestici €0,0227/kWh.',
  },
  {
    tax_type: 'addizionali_comunali',
    name: 'Addizionale Comunale Energia',
    description: 'Addizionale comunale sui consumi di energia elettrica',
    recipient: 'Comuni',
    rate_type: 'per_unit',
    rate_value: 0.018,
    rate_unit: '€/kWh',
    base_amount: 150000,
    base_unit: 'kWh/mese',
    is_recurring: true,
    recurrence_period: 'monthly',
    calculation_hypothesis: 'Addizionale media €0,018/kWh applicata ai consumi oltre soglia esenzione. Varia per comune.',
  },
  {
    tax_type: 'iva',
    name: 'IVA su Forniture',
    description: 'Imposta sul valore aggiunto su fatture energia',
    recipient: 'Erario',
    rate_type: 'percentage',
    rate_value: 10, // 10% for domestic, 22% for business
    rate_unit: '%',
    base_amount: 50000,
    base_unit: '€/mese fatturato',
    is_recurring: true,
    recurrence_period: 'monthly',
    calculation_hypothesis: 'IVA 10% per usi domestici, 22% per usi diversi. Calcolo su fatturato lordo mensile stimato €50.000. IVA incassata e versata con liquidazione periodica.',
  },
  {
    tax_type: 'csea',
    name: 'Contributi CSEA',
    description: 'Contributi alla Cassa per i Servizi Energetici e Ambientali',
    recipient: 'CSEA',
    rate_type: 'per_unit',
    rate_value: 0.0005,
    rate_unit: '€/kWh',
    base_amount: 150000,
    base_unit: 'kWh/mese',
    is_recurring: true,
    recurrence_period: 'quarterly',
    calculation_hypothesis: 'Contributo operatori vendita energia ~€0,0005/kWh. Versamento trimestrale.',
  },
  {
    tax_type: 'arera',
    name: 'Contributo Annuale ARERA',
    description: 'Contributo obbligatorio per operatori settore energetico',
    recipient: 'ARERA',
    rate_type: 'fixed',
    rate_value: 1500,
    rate_unit: '€/anno',
    base_amount: 0,
    base_unit: '',
    is_recurring: true,
    recurrence_period: 'yearly',
    calculation_hypothesis: 'Contributo fisso annuale per iscrizione Elenco Venditori Energia. Importo minimo €1.500, può variare in base ai volumi.',
  },
  {
    tax_type: 'oneri_sistema',
    name: 'Oneri di Sistema',
    description: 'Componenti tariffarie parafiscali (A2, A3, A4, A5, UC, MCT)',
    recipient: 'CSEA/Sistema',
    rate_type: 'per_unit',
    rate_value: 0.04,
    rate_unit: '€/kWh',
    base_amount: 150000,
    base_unit: 'kWh/mese',
    is_recurring: true,
    recurrence_period: 'monthly',
    calculation_hypothesis: 'Oneri di sistema medi ~€0,04/kWh (variabili per delibere ARERA). Include: A2 (nucleare), A3 (rinnovabili), A4 (regimi tariffari), UC (qualità), MCT.',
  },
];

export const projectTemplates: ProjectTemplate[] = [
  // ─── TEMPLATE 1: Solo clienti domestici ───
  {
    id: 'reseller-residenziale',
    name: 'Reseller Energia – Solo Residenziale',
    description: 'Vendita esclusiva di energia elettrica a famiglie e utenze domestiche (consumo medio ~250 kWh/mese). Modello snello, ideale per chi punta su volumi e sportelli territoriali.',
    icon: 'Home',
    color: 'hsl(200, 80%, 50%)',
    passthrough_costs: [
      {
        name: 'Energia Acquistata da Grossista',
        description: 'Costo all\'ingrosso energia elettrica – componente commodity da rifatturare ai clienti',
        amount: 0.12, quantity: 150000, unit: 'kWh/mese',
        cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly',
        is_passthrough: true, passthrough_recipient: 'Grossista',
        calculation_basis: '500 clienti × 300 kWh/mese × €0,12/kWh',
        calculation_params: { num_clients: 500, consumption_kwh: 300, price_per_kwh: 0.12 },
        commodity_filter: 'luce'
      },
      {
        name: 'Corrispettivi Trasporto e Distribuzione',
        description: 'Tariffe di trasporto e distribuzione stabilite da ARERA, versate al distributore locale',
        amount: 0.035, quantity: 150000, unit: 'kWh/mese',
        cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly',
        is_passthrough: true, passthrough_recipient: 'Distributore locale',
        calculation_basis: '150.000 kWh/mese × €0,035/kWh (tariffa TD media)',
        calculation_params: { consumption_kwh: 150000, price_per_kwh: 0.035 },
        commodity_filter: 'luce'
      },
    ],
    costs: [
      // Costi Strutturali – Setup Iniziale
      { name: 'Costituzione Società', description: 'Notaio, Camera di Commercio, pratiche iniziali', amount: 3500, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: 'Stima notarile SRL semplificata + diritti CCIAA', calculation_params: { base_value: 3500 } },
      { name: 'Consulenza Legale Iniziale', description: 'Redazione contratti tipo, condizioni generali, privacy GDPR', amount: 3500, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false, calculation_basis: 'Studio legale specializzato settore energia: 18-22 ore × €160-180/ora', calculation_params: { base_value: 3500 } },
      { name: 'Consulenza Regolatoria ARERA', description: 'Assistenza iscrizione Elenco Venditori Energia (EVE), compliance normativa', amount: 6000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false, calculation_basis: 'Consulente regolatorio: preparazione documentazione EVE + accompagnamento pratiche', calculation_params: { base_value: 6000 } },
      { name: 'Garanzie Bancarie per Grossista', description: 'Fideiussione bancaria a favore del grossista per approvvigionamento energia', amount: 20000, quantity: 1, unit: 'garanzia', cost_type: 'structural', is_recurring: false, calculation_basis: 'Fideiussione pari a 2-3 mesi di fornitura stimata. 500 clienti × €40/mese = €20.000', calculation_params: { num_clients: 500, price_per_client: 40, base_value: 20000 } },
      { name: 'Rinnovo Fideiussioni', description: 'Commissione annuale mantenimento garanzie bancarie (1,5-2,5% del valore)', amount: 400, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: '€20.000 fideiussione × 2% commissione annuale', calculation_params: { base_value: 20000, percentage: 2 } },
      { name: 'Assicurazione RC Professionale', description: 'Polizza responsabilità civile professionale', amount: 2000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Polizza RC con massimale €500.000', calculation_params: { base_value: 2000 } },

      // Software e Sistemi SII
      { name: 'Software Gestione SII', description: 'Piattaforma per gestione flussi Sistema Informativo Integrato con Acquirente Unico', amount: 400, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Licenza SaaS per operatori <1000 POD', calculation_params: { num_clients: 500, price_per_client: 0.8 } },
      { name: 'Software Switching', description: 'Gestione pratiche switching, volture, subentri, attivazioni', amount: 300, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Modulo switching per ~80 pratiche/mese', calculation_params: { base_value: 300 } },
      { name: 'Integrazione SII – Setup', description: 'Configurazione iniziale flussi XML con Acquirente Unico e distributori', amount: 4000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false, calculation_basis: 'Setup tecnico: configurazione certificati, test flussi, go-live (1-2 settimane)', calculation_params: { base_value: 4000 } },
      { name: 'Licenza Software CRM', description: 'CRM per gestione clienti, contratti e lead commerciali', amount: 120, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'CRM cloud per 2-3 utenti', calculation_params: { base_value: 120 } },
      { name: 'Piattaforma Billing', description: 'Software fatturazione e generazione bollette conformi ARERA', amount: 250, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Sistema billing per ~500 fatture/mese. Include TXT2 obbligatorio', calculation_params: { num_clients: 500, price_per_client: 0.5 } },
      { name: 'Sito Web e Portale Clienti', description: 'Sviluppo sito vetrina + area riservata clienti per autoletture e pagamenti', amount: 4500, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false, calculation_basis: 'Sviluppo web con integrazione area clienti', calculation_params: { base_value: 4500 } },

      // Costi Commerciali – Acquisizione Clienti
      { name: 'Rete Agenti – Provvigioni', description: 'Commissione per ogni contratto residenziale acquisito tramite agenti', amount: 70, quantity: 100, unit: 'contratto', cost_type: 'commercial', is_recurring: false, calculation_basis: 'Primo anno: 100 contratti target. Provvigione media €60-80/contratto', calculation_params: { num_clients: 100, price_per_client: 70 } },
      { name: 'Marketing Digitale', description: 'Campagne Google Ads, Meta Ads per lead generation', amount: 1200, quantity: 12, unit: 'mese', cost_type: 'commercial', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Budget ads €1.200/mese → ~40 lead/mese a €30/lead → ~12 contratti', calculation_params: { base_value: 1200 } },
      { name: 'Materiale Promozionale', description: 'Brochure, volantini, gadget per agenti e sportelli', amount: 1500, quantity: 1, unit: 'lotto', cost_type: 'commercial', is_recurring: false, calculation_basis: 'Stampa iniziale: 3.000 brochure + 8.000 volantini + gadget', calculation_params: { base_value: 1500 } },
      { name: 'Formazione Agenti', description: 'Corsi formazione rete vendita su prodotti e normativa', amount: 1200, quantity: 1, unit: 'sessione', cost_type: 'commercial', is_recurring: false, calculation_basis: '1 sessione formativa per 8-10 agenti', calculation_params: { base_value: 1200 } },

      // Costi Indiretti – Operatività
      { name: 'Personale Back-Office', description: 'Risorsa dedicata gestione contratti, pratiche SII, assistenza clienti', amount: 2200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'RAL €26.000-28.000 + contributi (~35%) = costo azienda ~€2.200/mese', calculation_params: { base_value: 2200 } },
      { name: 'Commercialista e Consulenza Fiscale', description: 'Gestione contabilità, bilancio, dichiarazioni fiscali', amount: 350, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Studio commercialista: forfait mensile per SRL operatore energia', calculation_params: { base_value: 350 } },
      { name: 'Affitto Ufficio/Sportello', description: 'Sede operativa o sportello territoriale', amount: 600, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Ufficio 30-40mq in zona semicentrale', calculation_params: { base_value: 600 } },
      { name: 'Utenze e Cancelleria', description: 'Luce, internet, telefono, materiale ufficio', amount: 200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Stima mensile: telefonia €50 + internet €40 + energia €60 + cancelleria €50', calculation_params: { base_value: 200 } },
      { name: 'Call Center (outsourcing)', description: 'Servizio clienti esternalizzato per primo livello', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Pacchetto base call center: ~60 ore/mese a €5/ora per startup', calculation_params: { base_value: 300 } },
      { name: 'Gestione Morosità', description: 'Costo medio per gestione solleciti, messe in mora, pratiche legali', amount: 5, quantity: 500, unit: 'cliente/anno', cost_type: 'indirect', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Accantonamento €5/cliente/anno per gestione morosità (~3-5% clienti)', calculation_params: { num_clients: 500, price_per_client: 5 } },

      // Costi Diretti – Oneri Regolatori
      { name: 'Contributo Iscrizione EVE', description: 'Contributo una tantum iscrizione Elenco Venditori Energia', amount: 500, quantity: 1, unit: 'pratica', cost_type: 'direct', is_recurring: false, calculation_basis: 'Contributo ARERA per iscrizione EVE', calculation_params: { base_value: 500 } },
      { name: 'Contributo Annuale ARERA', description: 'Contributo obbligatorio annuale per operatori settore energetico', amount: 1200, quantity: 1, unit: 'anno', cost_type: 'direct', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Contributo fisso annuale EVE. Importo base €1.200 per operatori minori', calculation_params: { base_value: 1200 } },
      { name: 'Iscrizione ADM – Accise', description: 'Costi iscrizione e adempimenti Agenzia Dogane per accise energia', amount: 800, quantity: 1, unit: 'pratica', cost_type: 'direct', is_recurring: false, calculation_basis: 'Pratiche iniziali ADM + consulenza primo anno', calculation_params: { base_value: 800 } },
    ],
    revenues: [
      {
        name: 'Fatturazione Energia Residenziale',
        description: 'Ricavi da vendita energia elettrica a clienti domestici (prezzo medio rivendita)',
        amount: 0.18, quantity: 150000, unit: 'kWh/mese',
        revenue_type: 'energia_elettrica', status: 'expected', margin_type: 'per_kwh',
        calculation_basis: '500 clienti × 300 kWh/mese × €0,18/kWh (prezzo medio residenziale)',
        calculation_params: { num_clients: 500, consumption_kwh: 300, price_per_kwh: 0.18 }
      },
      {
        name: 'Margine Commerciale Luce',
        description: 'Margine effettivo sul kWh dopo costo commodity (spread)',
        amount: 0.03, quantity: 150000, unit: 'kWh/mese',
        revenue_type: 'margine', status: 'expected', margin_type: 'per_kwh',
        calculation_basis: 'Spread medio €0,03/kWh (vendita €0,18 - acquisto €0,12 - trasporto €0,035)',
        calculation_params: { num_clients: 500, consumption_kwh: 300, margin_per_kwh: 0.03 }
      },
      {
        name: 'Contributi Acquisizione Grossista',
        description: 'Bonus acquisizione riconosciuti dal grossista per nuovi POD',
        amount: 30, quantity: 100, unit: 'POD',
        revenue_type: 'incentivo', status: 'expected', margin_type: 'per_client',
        calculation_basis: 'Bonus €25-35/POD per acquisizioni primo anno (negoziabile con grossista)',
        calculation_params: { num_clients: 100, margin_per_client: 30 }
      },
    ],
    taxes: standardTaxTemplates.map(tax => ({
      ...tax,
      calculation_hypothesis: 'Stima per portafoglio 500 clienti residenziali, 300 kWh/mese consumo medio',
    })),
  },

  // ─── TEMPLATE 2: Residenziale + Partite IVA (fino a 20.000 kWh/anno) ───
  {
    id: 'reseller-residenziale-piva',
    name: 'Reseller Energia – Residenziale + P.IVA',
    description: 'Vendita di energia elettrica a famiglie e partite IVA/microbusiness con consumo fino a 20.000 kWh/anno. Struttura più articolata con gestione differenziata per segmento.',
    icon: 'Building2',
    color: 'hsl(142, 71%, 45%)',
    passthrough_costs: [
      {
        name: 'Energia Acquistata da Grossista',
        description: 'Costo all\'ingrosso energia elettrica – portafoglio misto domestici + P.IVA',
        amount: 0.115, quantity: 250000, unit: 'kWh/mese',
        cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly',
        is_passthrough: true, passthrough_recipient: 'Grossista',
        calculation_basis: '400 domestici × 300 kWh + 100 P.IVA × 1.300 kWh = ~250.000 kWh/mese × €0,115/kWh',
        calculation_params: { consumption_kwh: 250000, price_per_kwh: 0.115 },
        commodity_filter: 'luce'
      },
      {
        name: 'Corrispettivi Trasporto e Distribuzione',
        description: 'Tariffe trasporto/distribuzione – media ponderata domestici e P.IVA',
        amount: 0.032, quantity: 250000, unit: 'kWh/mese',
        cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly',
        is_passthrough: true, passthrough_recipient: 'Distributore locale',
        calculation_basis: '250.000 kWh/mese × €0,032/kWh (media ponderata TD domestici/BTA P.IVA)',
        calculation_params: { consumption_kwh: 250000, price_per_kwh: 0.032 },
        commodity_filter: 'luce'
      },
    ],
    costs: [
      // Costi Strutturali – Setup
      { name: 'Costituzione Società', description: 'Notaio, Camera di Commercio, pratiche iniziali', amount: 3800, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: 'SRL per attività con clientela mista', calculation_params: { base_value: 3800 } },
      { name: 'Consulenza Legale', description: 'Contratti per clienti domestici e P.IVA, condizioni generali, GDPR', amount: 5000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false, calculation_basis: 'Contrattualistica differenziata per i due segmenti', calculation_params: { base_value: 5000 } },
      { name: 'Consulenza Regolatoria ARERA', description: 'Iscrizione EVE, compliance normativa per clientela domestica e P.IVA', amount: 8000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false, calculation_basis: 'Consulente regolatorio per dual-segment (domestici + microbusiness)', calculation_params: { base_value: 8000 } },
      { name: 'Garanzie Bancarie per Grossista', description: 'Fideiussione bancaria – volumi maggiori per portafoglio misto', amount: 30000, quantity: 1, unit: 'garanzia', cost_type: 'structural', is_recurring: false, calculation_basis: 'Fideiussione 2-3 mesi fornitura. 500 clienti misti × €60/mese media = €30.000', calculation_params: { num_clients: 500, price_per_client: 60, base_value: 30000 } },
      { name: 'Rinnovo Fideiussioni', description: 'Commissione annuale mantenimento garanzie bancarie', amount: 600, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: '€30.000 fideiussione × 2% commissione annuale', calculation_params: { base_value: 30000, percentage: 2 } },
      { name: 'Assicurazione RC Professionale', description: 'Polizza RC con massimale adeguato per clientela P.IVA', amount: 2800, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Polizza RC massimale €750.000 per portafoglio misto', calculation_params: { base_value: 2800 } },

      // Software e Sistemi SII
      { name: 'Software Gestione SII', description: 'Piattaforma SII per gestione POD domestici e P.IVA', amount: 500, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Licenza SaaS per operatori <1500 POD con modulo P.IVA', calculation_params: { num_clients: 500, price_per_client: 1 } },
      { name: 'Software Switching', description: 'Gestione pratiche switching, volture, subentri', amount: 350, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Modulo switching per ~100 pratiche/mese (mix domestici + P.IVA)', calculation_params: { base_value: 350 } },
      { name: 'Integrazione SII – Setup', description: 'Configurazione flussi XML con Acquirente Unico e distributori', amount: 5000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false, calculation_basis: 'Setup tecnico: configurazione certificati, test flussi (2-3 settimane)', calculation_params: { base_value: 5000 } },
      { name: 'Licenza Software CRM', description: 'CRM per gestione clienti differenziata domestici/P.IVA', amount: 150, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'CRM cloud per 3-5 utenti con segmentazione clientela', calculation_params: { base_value: 150 } },
      { name: 'Piattaforma Billing', description: 'Fatturazione conforme ARERA con gestione fatture P.IVA (IVA 22%)', amount: 350, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Billing per ~500 fatture/mese con doppia aliquota IVA (10% domestici, 22% P.IVA)', calculation_params: { num_clients: 500, price_per_client: 0.7 } },
      { name: 'Sito Web e Portale Clienti', description: 'Sito con area clienti e sezione dedicata offerte P.IVA', amount: 5500, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false, calculation_basis: 'Sviluppo web con area clienti e landing P.IVA', calculation_params: { base_value: 5500 } },

      // Costi Commerciali
      { name: 'Provvigioni Agenti – Domestici', description: 'Commissioni acquisizione clienti residenziali', amount: 70, quantity: 80, unit: 'contratto', cost_type: 'commercial', is_recurring: false, calculation_basis: '80 contratti residenziali anno 1 × €70/contratto', calculation_params: { num_clients: 80, price_per_client: 70 } },
      { name: 'Provvigioni Agenti – P.IVA', description: 'Commissioni acquisizione partite IVA/microbusiness', amount: 120, quantity: 40, unit: 'contratto', cost_type: 'commercial', is_recurring: false, calculation_basis: '40 contratti P.IVA anno 1 × €120/contratto (provvigione maggiore)', calculation_params: { num_clients: 40, price_per_client: 120 } },
      { name: 'Marketing Digitale', description: 'Google Ads, Meta Ads – campagne differenziate domestici e P.IVA', amount: 1800, quantity: 12, unit: 'mese', cost_type: 'commercial', is_recurring: true, recurrence_period: 'monthly', calculation_basis: '€1.200 B2C + €600 B2B (LinkedIn/Google per P.IVA)', calculation_params: { base_value: 1800 } },
      { name: 'Materiale Promozionale', description: 'Brochure differenziate domestici e P.IVA, gadget', amount: 2000, quantity: 1, unit: 'lotto', cost_type: 'commercial', is_recurring: false, calculation_basis: 'Stampa: brochure domestici + depliant P.IVA + gadget', calculation_params: { base_value: 2000 } },
      { name: 'Formazione Agenti', description: 'Corsi su prodotto e normativa per entrambi i segmenti', amount: 1500, quantity: 2, unit: 'sessione', cost_type: 'commercial', is_recurring: false, calculation_basis: '2 sessioni (domestici + P.IVA) per 10-12 agenti', calculation_params: { base_value: 1500 } },

      // Costi Indiretti – Operatività
      { name: 'Personale Back-Office', description: 'Risorsa dedicata gestione contratti e assistenza clienti', amount: 2200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'RAL €26.000-28.000 + contributi (~35%)', calculation_params: { base_value: 2200 } },
      { name: 'Operatore Pratiche SII', description: 'Part-time dedicato a flussi switching e rapporti con distributori', amount: 1800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Part-time 30h/settimana. RAL ~€20.000 + contributi', calculation_params: { base_value: 1800 } },
      { name: 'Affitto Ufficio', description: 'Sede operativa per back-office e sportello', amount: 800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Ufficio 50-70 mq in zona semicentrale', calculation_params: { base_value: 800 } },
      { name: 'Utenze e Servizi Ufficio', description: 'Telefono, internet, energia ufficio', amount: 200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Internet fibra €50 + telefonia €50 + energia €100', calculation_params: { base_value: 200 } },
      { name: 'Commercialista', description: 'Gestione contabile, fiscale, bilancio, dichiarazioni', amount: 400, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Commercialista per SRL con regime ordinario', calculation_params: { base_value: 400 } },
      { name: 'Consulenza Aggiornamento Normativo', description: 'Monitoraggio delibere ARERA e adeguamenti procedurali', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Abbonamento regulatory intelligence + ore consulenza', calculation_params: { base_value: 300 } },

      // Costi Regolatori e Compliance
      { name: 'Audit Qualità Commerciale ARERA', description: 'Verifica annuale conformità standard qualità vendita (TIQV)', amount: 2000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Audit per compliance TIQV. Obbligatorio per EVE', calculation_params: { base_value: 2000 } },
      { name: 'Fondo Rischio Sanzioni', description: 'Accantonamento prudenziale per eventuali sanzioni ARERA/AGCM', amount: 2500, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Accantonamento prudenziale 0,5-1% del fatturato stimato', calculation_params: { base_value: 2500, percentage: 0.5 } },

      // Costi Finanziari
      { name: 'Interessi Capitale Circolante', description: 'Costo finanziario per anticipo acquisti energia', amount: 600, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Fabbisogno circolante ~€70.000 (2 mesi fatturato) × 10% tasso = ~€600/mese', calculation_params: { base_value: 70000, percentage: 10 } },
      { name: 'Fondo Svalutazione Crediti', description: 'Accantonamento per clienti morosi/insoluti (3% domestici, 2% P.IVA)', amount: 450, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Fatturato mensile €50.000 × 2,5% morosità media ponderata', calculation_params: { base_value: 50000, percentage: 2.5 } },
      { name: 'Costi Recupero Crediti', description: 'Solleciti, diffide, procedure legali per insoluti', amount: 200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Costi medi sollecito + eventuale passaggio società recupero', calculation_params: { base_value: 200 } },

      // Costi IT/Sicurezza
      { name: 'Hosting e Manutenzione Sistemi', description: 'Server cloud, backup, aggiornamenti sicurezza', amount: 200, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'VPS/Cloud hosting + dominio + SSL + manutenzione', calculation_params: { base_value: 200 } },
      { name: 'Cybersecurity', description: 'Antivirus, firewall, monitoraggio sicurezza, compliance GDPR', amount: 100, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Suite sicurezza enterprise per 5-10 postazioni', calculation_params: { base_value: 100 } },
      { name: 'Manutenzione Software Annuale', description: 'Aggiornamenti CRM, billing, SII, sviluppi evolutivi', amount: 3500, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Pacchetto ore sviluppo + supporto tecnico annuale', calculation_params: { base_value: 3500 } },

      // Costi Operativi Obbligatori ARERA
      { name: 'Numero Verde / Contact Center', description: 'Servizio assistenza clienti telefonico obbligatorio', amount: 400, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Numero verde + outsourcing contact center (~200 chiamate/mese)', calculation_params: { base_value: 400 } },
      { name: 'Gestione Reclami e Conciliazioni', description: 'Procedure ADR, conciliazione paritetica, sportello consumatore', amount: 150, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Gestione ~5-10 reclami/mese + eventuali conciliazioni', calculation_params: { base_value: 150 } },
      { name: 'Spese Postali', description: 'Invio bollette cartacee, comunicazioni obbligatorie', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: '~150 bollette cartacee/mese × €2 (stampa + spedizione)', calculation_params: { num_clients: 150, price_per_client: 2 } },
      { name: 'Software Firma Elettronica', description: 'Firma OTP per contratti digitali (obbligatoria per vendite a distanza)', amount: 50, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Pacchetto ~100 firme/mese', calculation_params: { base_value: 50 } },

      // Costi HR/Personale
      { name: 'Consulente del Lavoro', description: 'Gestione buste paga, adempimenti contributivi', amount: 150, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Elaborazione cedolini per 2-3 dipendenti + adempimenti', calculation_params: { base_value: 150 } },
      { name: 'Formazione Obbligatoria Sicurezza', description: 'Corsi D.Lgs 81/08 per dipendenti', amount: 500, quantity: 1, unit: 'anno', cost_type: 'indirect', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Corso base sicurezza + aggiornamenti per 2-3 dipendenti', calculation_params: { base_value: 500 } },
      { name: 'Accantonamento TFR', description: 'Quota mensile TFR dipendenti', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'TFR = RAL/13,5. Per 2 dipendenti RAL media €25.000', calculation_params: { base_value: 300 } },

      // Costi Una Tantum
      { name: 'Deposito Cauzionale Ufficio', description: 'Cauzione affitto sede (3 mensilità)', amount: 2400, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: '€800/mese × 3 mensilità cauzione', calculation_params: { base_value: 800, num_clients: 3 } },
      { name: 'Arredamento Ufficio', description: 'Scrivanie, sedie, arredi base per ufficio operativo', amount: 3500, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: '3-4 postazioni complete + sala riunioni piccola', calculation_params: { base_value: 3500 } },
      { name: 'Hardware IT', description: 'PC, stampanti multifunzione, telefoni, router', amount: 4500, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: '3-4 notebook + stampante + telefonia/rete', calculation_params: { base_value: 4500 } },

      // Oneri Regolatori
      { name: 'Contributo Iscrizione EVE', description: 'Contributo una tantum iscrizione Elenco Venditori Energia', amount: 500, quantity: 1, unit: 'pratica', cost_type: 'direct', is_recurring: false, calculation_basis: 'Contributo ARERA per iscrizione EVE', calculation_params: { base_value: 500 } },
      { name: 'Iscrizione ADM – Accise', description: 'Costi iscrizione e adempimenti Agenzia Dogane per accise energia', amount: 800, quantity: 1, unit: 'pratica', cost_type: 'direct', is_recurring: false, calculation_basis: 'Pratiche iniziali ADM + consulenza primo anno', calculation_params: { base_value: 800 } },
    ],
    revenues: [
      {
        name: 'Fatturato Energia – Domestici',
        description: 'Ricavi da vendita energia elettrica a clienti residenziali',
        amount: 0.25, quantity: 120000, unit: 'kWh/mese',
        revenue_type: 'energia_elettrica', status: 'expected', margin_type: 'per_kwh',
        calculation_basis: '400 clienti domestici × 300 kWh/mese × €0,25/kWh prezzo vendita finale',
        calculation_params: { num_clients: 400, consumption_kwh: 300, price_per_kwh: 0.25 }
      },
      {
        name: 'Fatturato Energia – P.IVA',
        description: 'Ricavi da vendita energia elettrica a partite IVA (fino a 20.000 kWh/anno)',
        amount: 0.22, quantity: 130000, unit: 'kWh/mese',
        revenue_type: 'energia_elettrica', status: 'expected', margin_type: 'per_kwh',
        calculation_basis: '100 P.IVA × 1.300 kWh/mese × €0,22/kWh prezzo vendita finale (IVA 22%)',
        calculation_params: { num_clients: 100, consumption_kwh: 1300, price_per_kwh: 0.22 }
      },
      {
        name: 'Fee Attivazione Nuovi Contratti',
        description: 'Contributo una tantum richiesto ai nuovi clienti per costi amministrativi',
        amount: 30, quantity: 120, unit: 'contratto',
        revenue_type: 'servizi_accessori', status: 'expected', margin_type: 'fixed',
        calculation_basis: '120 nuovi contratti anno 1 (80 domestici + 40 P.IVA) × €30 fee',
        calculation_params: { num_clients: 120, margin_per_client: 30 }
      },
    ],
    taxes: standardTaxTemplates.map(tax => ({
      ...tax,
      base_amount: tax.tax_type === 'accise_energia' ? 250000 :
                   tax.tax_type === 'addizionali_comunali' ? 250000 :
                   tax.tax_type === 'iva' ? 60000 :
                   tax.tax_type === 'csea' ? 250000 :
                   tax.tax_type === 'oneri_sistema' ? 250000 :
                   tax.base_amount,
      calculation_hypothesis: 'Stima per portafoglio misto: 400 clienti domestici (300 kWh/mese) + 100 P.IVA (1.300 kWh/mese, max 20.000 kWh/anno)',
    })),
  },
];
