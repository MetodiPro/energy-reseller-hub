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
  margin_type?: 'fixed' | 'per_client' | 'per_kwh' | 'percentage';
  calculation_basis?: string;
  calculation_params?: {
    num_clients?: number;
    margin_per_client?: number;
    margin_per_kwh?: number;
    margin_per_smc?: number;
    consumption_kwh?: number;
    consumption_smc?: number;
    percentage?: number;
  };
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
    tax_type: 'accise_gas',
    name: 'Accise Gas Naturale',
    description: 'Imposta erariale sui consumi di gas naturale',
    recipient: 'Agenzia Dogane e Monopoli (ADM)',
    rate_type: 'per_unit',
    rate_value: 0.044,
    rate_unit: '€/Smc',
    base_amount: 50000,
    base_unit: 'Smc/anno',
    is_recurring: true,
    recurrence_period: 'monthly',
    calculation_hypothesis: 'Stima basata su 300 clienti gas x 166 Smc/mese consumo medio = 50.000 Smc/mese. Aliquota usi civili €0,044/Smc.',
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
    tax_type: 'addizionali_regionali',
    name: 'Addizionale Regionale Gas',
    description: 'Addizionale regionale sui consumi di gas naturale',
    recipient: 'Regioni',
    rate_type: 'per_unit',
    rate_value: 0.0052,
    rate_unit: '€/Smc',
    base_amount: 50000,
    base_unit: 'Smc/mese',
    is_recurring: true,
    recurrence_period: 'monthly',
    calculation_hypothesis: 'Addizionale regionale media €0,0052/Smc. Varia per regione di fornitura.',
  },
  {
    tax_type: 'iva',
    name: 'IVA su Forniture',
    description: 'Imposta sul valore aggiunto su fatture energia/gas',
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
  {
    id: 'reseller-residenziale',
    name: 'Reseller Residenziale',
    description: 'Vendita luce e gas a famiglie e utenze domestiche. Ideale per chi punta su volumi, sportelli territoriali e assistenza al consumatore.',
    icon: 'Home',
    color: 'hsl(200, 80%, 50%)',
    // COSTI PASSANTI - Vanno al grossista/distributore, non impattano il margine operativo
    passthrough_costs: [
      { 
        name: 'Energia Acquistata da Grossista (Luce)', 
        description: 'Costo all\'ingrosso energia elettrica - componente commodity da rifatturare ai clienti',
        amount: 0.12, 
        quantity: 150000, 
        unit: 'kWh/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Grossista',
        calculation_basis: '500 clienti × 300 kWh/mese × €0,12/kWh',
        calculation_params: { num_clients: 500, consumption_kwh: 300, price_per_kwh: 0.12 }
      },
      { 
        name: 'Gas Acquistato da Grossista', 
        description: 'Costo all\'ingrosso gas naturale - componente commodity da rifatturare ai clienti',
        amount: 0.80, 
        quantity: 50000, 
        unit: 'Smc/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Grossista',
        calculation_basis: '300 clienti gas × 166 Smc/mese × €0,80/Smc',
        calculation_params: { num_clients: 300, consumption_smc: 166, price_per_smc: 0.80 }
      },
      { 
        name: 'Corrispettivi Trasporto e Distribuzione', 
        description: 'Tariffe di trasporto e distribuzione stabilite da ARERA, versate al distributore locale',
        amount: 0.035, 
        quantity: 150000, 
        unit: 'kWh/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Distributore locale',
        calculation_basis: '150.000 kWh/mese × €0,035/kWh (tariffa TD media)',
        calculation_params: { consumption_kwh: 150000, price_per_kwh: 0.035 }
      },
      { 
        name: 'Corrispettivi Distribuzione Gas', 
        description: 'Tariffe di trasporto e distribuzione gas, versate al distributore locale',
        amount: 0.18, 
        quantity: 50000, 
        unit: 'Smc/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Distributore locale',
        calculation_basis: '50.000 Smc/mese × €0,18/Smc (tariffa distribuzione media)',
        calculation_params: { consumption_smc: 50000, price_per_smc: 0.18 }
      },
    ],
    // COSTI OPERATIVI - Impattano il margine del reseller
    costs: [
      // Costi Strutturali - Setup Iniziale
      { 
        name: 'Costituzione Società', 
        description: 'Notaio, Camera di Commercio, pratiche iniziali', 
        amount: 3500, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Stima notarile SRL semplificata + diritti CCIAA',
        calculation_params: { base_value: 3500 }
      },
      { 
        name: 'Consulenza Legale Iniziale', 
        description: 'Redazione contratti tipo, condizioni generali, privacy GDPR', 
        amount: 4000, 
        quantity: 1, 
        unit: 'consulenza', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Studio legale specializzato settore energia: 20-25 ore × €160-200/ora',
        calculation_params: { base_value: 4000 }
      },
      { 
        name: 'Consulenza Regolatoria ARERA', 
        description: 'Assistenza iscrizione Elenco Venditori Energia (EVE), compliance normativa', 
        amount: 8000, 
        quantity: 1, 
        unit: 'consulenza', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Consulente regolatorio: preparazione documentazione EVE + accompagnamento pratiche',
        calculation_params: { base_value: 8000 }
      },
      { 
        name: 'Garanzie Bancarie per Grossista', 
        description: 'Fideiussione bancaria a favore del grossista per approvvigionamento energia',
        amount: 25000, 
        quantity: 1, 
        unit: 'garanzia', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Fideiussione pari a 2-3 mesi di fornitura stimata. 500 clienti × €50/mese fattura media = €25.000',
        calculation_params: { num_clients: 500, price_per_client: 50, base_value: 25000 }
      },
      { 
        name: 'Rinnovo Fideiussioni', 
        description: 'Commissione annuale mantenimento garanzie bancarie (1,5-2,5% del valore)',
        amount: 500, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: '€25.000 fideiussione × 2% commissione annuale',
        calculation_params: { base_value: 25000, percentage: 2 }
      },
      { 
        name: 'Assicurazione RC Professionale', 
        description: 'Polizza responsabilità civile professionale', 
        amount: 2500, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Polizza RC con massimale €500.000, premio basato su fatturato stimato',
        calculation_params: { base_value: 2500 }
      },
      
      // Software e Sistemi SII - con ipotesi dettagliate
      { 
        name: 'Software Gestione SII', 
        description: 'Piattaforma per gestione flussi Sistema Informativo Integrato con Acquirente Unico',
        amount: 500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Licenza SaaS per operatori <1000 POD. Prezzo varia €300-800/mese in base ai volumi',
        calculation_params: { num_clients: 500, price_per_client: 1 }
      },
      { 
        name: 'Software Switching', 
        description: 'Gestione pratiche switching, volture, subentri, attivazioni',
        amount: 350, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Modulo switching per ~100 pratiche/mese. Alcuni fornitori includono nel SII',
        calculation_params: { base_value: 350 }
      },
      { 
        name: 'Integrazione SII - Setup', 
        description: 'Configurazione iniziale flussi XML con Acquirente Unico e distributori',
        amount: 5000, 
        quantity: 1, 
        unit: 'progetto', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Setup tecnico: configurazione certificati, test flussi, go-live (2-4 settimane)',
        calculation_params: { base_value: 5000 }
      },
      { 
        name: 'Licenza Software CRM', 
        description: 'CRM per gestione clienti, contratti e lead commerciali',
        amount: 150, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'CRM cloud (Salesforce, HubSpot, o specializzato energia) per 3-5 utenti',
        calculation_params: { base_value: 150 }
      },
      { 
        name: 'Piattaforma Billing', 
        description: 'Software fatturazione e generazione bollette conformi ARERA',
        amount: 300, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Sistema billing per ~500 fatture/mese. Include TXT2 obbligatorio',
        calculation_params: { num_clients: 500, price_per_client: 0.6 }
      },
      { 
        name: 'Sito Web e Portale Clienti', 
        description: 'Sviluppo sito vetrina + area riservata clienti per autoletture e pagamenti',
        amount: 5000, 
        quantity: 1, 
        unit: 'progetto', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Sviluppo web con integrazione area clienti. Range €4.000-8.000',
        calculation_params: { base_value: 5000 }
      },
      
      // Costi Commerciali - Acquisizione Clienti
      { 
        name: 'Rete Agenti - Provvigioni', 
        description: 'Commissione per ogni contratto residenziale acquisito tramite agenti',
        amount: 80, 
        quantity: 100, 
        unit: 'contratto', 
        cost_type: 'commercial', 
        is_recurring: false,
        calculation_basis: 'Primo anno: 100 contratti target. Provvigione media €60-100/contratto residenziale',
        calculation_params: { num_clients: 100, price_per_client: 80 }
      },
      { 
        name: 'Marketing Digitale', 
        description: 'Campagne Google Ads, Meta Ads per lead generation',
        amount: 1500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'commercial', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Budget ads €1.500/mese → ~50 lead/mese a €30/lead → ~15 contratti a €100/contratto',
        calculation_params: { base_value: 1500 }
      },
      { 
        name: 'Materiale Promozionale', 
        description: 'Brochure, volantini, gadget per agenti e sportelli',
        amount: 2000, 
        quantity: 1, 
        unit: 'lotto', 
        cost_type: 'commercial', 
        is_recurring: false,
        calculation_basis: 'Stampa iniziale: 5.000 brochure + 10.000 volantini + gadget',
        calculation_params: { base_value: 2000 }
      },
      { 
        name: 'Formazione Agenti', 
        description: 'Corsi formazione rete vendita su prodotti e normativa',
        amount: 1500, 
        quantity: 2, 
        unit: 'sessione', 
        cost_type: 'commercial', 
        is_recurring: false,
        calculation_basis: '2 sessioni formative per 10-15 agenti. Include materiali e docenza',
        calculation_params: { base_value: 1500 }
      },
      
      // Costi Indiretti - Operatività
      { 
        name: 'Personale Back-Office', 
        description: 'Risorsa dedicata gestione contratti, pratiche SII, assistenza clienti',
        amount: 2200, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'RAL €26.000-28.000 + contributi (~35%) = costo azienda ~€2.200/mese',
        calculation_params: { base_value: 2200 }
      },
      { 
        name: 'Operatore Pratiche SII', 
        description: 'Part-time dedicato a flussi switching e rapporti con distributori',
        amount: 1800, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Part-time 30h/settimana. RAL ~€20.000 + contributi = ~€1.800/mese',
        calculation_params: { base_value: 1800 }
      },
      { 
        name: 'Affitto Ufficio', 
        description: 'Sede operativa per back-office e eventuale sportello',
        amount: 800, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Ufficio 50-70 mq in zona semicentrale. Range €600-1.000/mese',
        calculation_params: { base_value: 800 }
      },
      { 
        name: 'Utenze e Servizi Ufficio', 
        description: 'Telefono fisso, internet fibra, energia ufficio',
        amount: 200, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Internet fibra €50 + telefonia €50 + energia €100',
        calculation_params: { base_value: 200 }
      },
      { 
        name: 'Commercialista', 
        description: 'Gestione contabile, fiscale, bilancio, dichiarazioni',
        amount: 400, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Commercialista per SRL con regime ordinario. Range €300-500/mese',
        calculation_params: { base_value: 400 }
      },
      { 
        name: 'Consulenza Aggiornamento Normativo', 
        description: 'Monitoraggio delibere ARERA e adeguamenti procedurali',
        amount: 300, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Abbonamento servizio di regulatory intelligence + ore consulenza',
        calculation_params: { base_value: 300 }
      },
      
      // Costi Regolatori e Compliance
      { 
        name: 'Audit Qualità Commerciale ARERA', 
        description: 'Verifica annuale conformità standard qualità vendita (TIQV)',
        amount: 2000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Audit interno o esterno per compliance TIQV. Obbligatorio per EVE',
        calculation_params: { base_value: 2000 }
      },
      { 
        name: 'Fondo Rischio Sanzioni', 
        description: 'Accantonamento prudenziale per eventuali sanzioni ARERA/AGCM',
        amount: 2000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Accantonamento prudenziale 0,5-1% del fatturato stimato',
        calculation_params: { base_value: 2000, percentage: 0.5 }
      },
      
      // Costi Finanziari
      { 
        name: 'Interessi Capitale Circolante', 
        description: 'Costo finanziario per anticipo acquisti energia prima di incassare bollette',
        amount: 500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Fabbisogno circolante ~€60.000 (2 mesi fatturato) × 8-10% tasso = ~€500/mese',
        calculation_params: { base_value: 60000, percentage: 10 }
      },
      { 
        name: 'Fondo Svalutazione Crediti', 
        description: 'Accantonamento per clienti morosi/insoluti (3-5% residenziale)',
        amount: 400, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Fatturato mensile €40.000 × 3% tasso morosità residenziale',
        calculation_params: { base_value: 40000, percentage: 3 }
      },
      { 
        name: 'Costi Recupero Crediti', 
        description: 'Solleciti, diffide, procedure legali per insoluti',
        amount: 150, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Costi medi sollecito + eventuale passaggio società recupero',
        calculation_params: { base_value: 150 }
      },
      
      // Costi IT/Sicurezza
      { 
        name: 'Hosting e Manutenzione Sistemi', 
        description: 'Server cloud, backup, aggiornamenti sicurezza',
        amount: 200, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'VPS/Cloud hosting + dominio + SSL + manutenzione',
        calculation_params: { base_value: 200 }
      },
      { 
        name: 'Cybersecurity', 
        description: 'Antivirus, firewall, monitoraggio sicurezza, compliance GDPR',
        amount: 100, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Suite sicurezza enterprise per 5-10 postazioni',
        calculation_params: { base_value: 100 }
      },
      { 
        name: 'Manutenzione Software Annuale', 
        description: 'Aggiornamenti CRM, billing, SII, sviluppi evolutivi',
        amount: 3000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Pacchetto ore sviluppo + supporto tecnico annuale',
        calculation_params: { base_value: 3000 }
      },
      
      // Costi Operativi Obbligatori ARERA
      { 
        name: 'Numero Verde / Contact Center', 
        description: 'Servizio assistenza clienti telefonico obbligatorio per venditori energia',
        amount: 400, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Numero verde + outsourcing contact center base (~200 chiamate/mese)',
        calculation_params: { base_value: 400 }
      },
      { 
        name: 'Gestione Reclami e Conciliazioni', 
        description: 'Procedure ADR, conciliazione paritetica, sportello consumatore',
        amount: 150, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Gestione ~5-10 reclami/mese + eventuali conciliazioni',
        calculation_params: { base_value: 150 }
      },
      { 
        name: 'Spese Postali', 
        description: 'Invio bollette cartacee, comunicazioni obbligatorie, solleciti',
        amount: 300, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: '~150 bollette cartacee/mese × €2 (stampa + spedizione)',
        calculation_params: { num_clients: 150, price_per_client: 2 }
      },
      { 
        name: 'Software Firma Elettronica', 
        description: 'Firma OTP per contratti digitali (obbligatoria per vendite a distanza)',
        amount: 50, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Pacchetto ~100 firme/mese. Alternativa: pay per use €0,50/firma',
        calculation_params: { base_value: 50 }
      },
      
      // Costi HR/Personale
      { 
        name: 'Consulente del Lavoro', 
        description: 'Gestione buste paga, adempimenti contributivi',
        amount: 150, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Elaborazione cedolini per 2-3 dipendenti + adempimenti',
        calculation_params: { base_value: 150 }
      },
      { 
        name: 'Formazione Obbligatoria Sicurezza', 
        description: 'Corsi D.Lgs 81/08 per dipendenti',
        amount: 500, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Corso base sicurezza + aggiornamenti per 2-3 dipendenti',
        calculation_params: { base_value: 500 }
      },
      { 
        name: 'Accantonamento TFR', 
        description: 'Quota mensile TFR dipendenti',
        amount: 300, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'TFR = RAL/13,5. Per 2 dipendenti RAL media €25.000 = ~€300/mese totale',
        calculation_params: { base_value: 300 }
      },
      
      // Costi Una Tantum Aggiuntivi
      { 
        name: 'Deposito Cauzionale Ufficio', 
        description: 'Cauzione affitto sede (3 mensilità)',
        amount: 2400, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: '€800/mese × 3 mensilità cauzione',
        calculation_params: { base_value: 800, num_clients: 3 }
      },
      { 
        name: 'Arredamento Ufficio', 
        description: 'Scrivanie, sedie, arredi base per ufficio operativo',
        amount: 3000, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: '3 postazioni complete + sala riunioni piccola',
        calculation_params: { base_value: 3000 }
      },
      { 
        name: 'Hardware IT', 
        description: 'PC, stampanti multifunzione, telefoni, router',
        amount: 4000, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: '3 notebook €800/cad + stampante €500 + telefonia/rete €700',
        calculation_params: { base_value: 4000 }
      },
    ],
    // RICAVI - Solo marginalità, non fatturato lordo
    revenues: [
      { 
        name: 'Margine Energia Elettrica', 
        description: 'Margine netto su vendita energia a clienti residenziali (spread su commodity)',
        amount: 8, 
        quantity: 500, 
        unit: 'cliente/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_client',
        calculation_basis: '500 clienti × €8 margine medio/cliente/mese. Margine = differenza tra prezzo vendita e costo acquisto + distribuzione',
        calculation_params: { num_clients: 500, margin_per_client: 8 }
      },
      { 
        name: 'Margine Gas Naturale', 
        description: 'Margine netto su vendita gas a clienti residenziali',
        amount: 12, 
        quantity: 300, 
        unit: 'cliente/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_client',
        calculation_basis: '300 clienti gas × €12 margine medio/cliente/mese. Margine gas tipicamente più alto del luce',
        calculation_params: { num_clients: 300, margin_per_client: 12 }
      },
      { 
        name: 'Fee Attivazione Nuovi Contratti', 
        description: 'Contributo una tantum richiesto ai nuovi clienti per costi amministrativi',
        amount: 30, 
        quantity: 100, 
        unit: 'contratto', 
        revenue_type: 'one_time', 
        status: 'expected',
        margin_type: 'fixed',
        calculation_basis: '100 nuovi contratti anno 1 × €30 fee attivazione (ove applicabile)',
        calculation_params: { num_clients: 100, margin_per_client: 30 }
      },
    ],
    // IMPOSTE E TASSE - Template standard
    taxes: standardTaxTemplates,
  },
  {
    id: 'reseller-business',
    name: 'Reseller Business (B2B)',
    description: 'Fornitura energia a PMI, partite IVA e aziende. Richiede key account manager, contratti personalizzati e garanzie bancarie più elevate.',
    icon: 'Building2',
    color: 'hsl(142, 71%, 45%)',
    passthrough_costs: [
      { 
        name: 'Energia Acquistata da Grossista (Luce)', 
        description: 'Costo all\'ingrosso energia elettrica per clienti business',
        amount: 0.11, 
        quantity: 400000, 
        unit: 'kWh/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Grossista',
        calculation_basis: '100 clienti business × 4.000 kWh/mese × €0,11/kWh (prezzo wholesale più basso per volumi)',
        calculation_params: { num_clients: 100, consumption_kwh: 4000, price_per_kwh: 0.11 }
      },
      { 
        name: 'Gas Acquistato da Grossista', 
        description: 'Costo all\'ingrosso gas naturale per clienti business',
        amount: 0.75, 
        quantity: 80000, 
        unit: 'Smc/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Grossista',
        calculation_basis: '50 clienti gas business × 1.600 Smc/mese × €0,75/Smc',
        calculation_params: { num_clients: 50, consumption_smc: 1600, price_per_smc: 0.75 }
      },
      { 
        name: 'Corrispettivi Trasporto e Distribuzione', 
        description: 'Tariffe trasporto/distribuzione energia - clienti business',
        amount: 0.028, 
        quantity: 400000, 
        unit: 'kWh/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Distributore locale',
        calculation_basis: '400.000 kWh/mese × €0,028/kWh (tariffa business più bassa)',
        calculation_params: { consumption_kwh: 400000, price_per_kwh: 0.028 }
      },
      { 
        name: 'Corrispettivi Distribuzione Gas', 
        description: 'Tariffe distribuzione gas - clienti business',
        amount: 0.15, 
        quantity: 80000, 
        unit: 'Smc/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Distributore locale',
        calculation_basis: '80.000 Smc/mese × €0,15/Smc',
        calculation_params: { consumption_smc: 80000, price_per_smc: 0.15 }
      },
    ],
    costs: [
      // Costi Strutturali - Setup B2B
      { 
        name: 'Costituzione Società', 
        description: 'Notaio, Camera di Commercio, pratiche', 
        amount: 4000, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'SRL ordinaria + capitale sociale adeguato per B2B',
        calculation_params: { base_value: 4000 }
      },
      { 
        name: 'Consulenza Legale Specializzata', 
        description: 'Contratti B2B personalizzati, SLA, condizioni commerciali complesse', 
        amount: 6000, 
        quantity: 1, 
        unit: 'consulenza', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Studio legale per contratti B2B multi-sito, SLA, penali',
        calculation_params: { base_value: 6000 }
      },
      { 
        name: 'Consulenza Regolatoria ARERA', 
        description: 'Iscrizione EVE, compliance, obblighi informativi B2B', 
        amount: 10000, 
        quantity: 1, 
        unit: 'consulenza', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Consulenza avanzata per mercato business + multi-commodity',
        calculation_params: { base_value: 10000 }
      },
      { 
        name: 'Garanzie Bancarie', 
        description: 'Fideiussioni per grossisti (volumi business più elevati)',
        amount: 50000, 
        quantity: 1, 
        unit: 'garanzia', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Fideiussione 2-3 mesi fornitura. 100 clienti × €300/mese = €30.000/mese × 2 = €60.000 (prudenziale)',
        calculation_params: { num_clients: 100, price_per_client: 300, base_value: 50000 }
      },
      { 
        name: 'Rinnovo Fideiussioni', 
        description: 'Commissione annuale mantenimento garanzie bancarie',
        amount: 1000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: '€50.000 fideiussione × 2% commissione annuale',
        calculation_params: { base_value: 50000, percentage: 2 }
      },
      { 
        name: 'Assicurazione RC Professionale', 
        description: 'Polizza annuale con massimali maggiorati per B2B', 
        amount: 4000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Polizza RC massimale €1.000.000 per clienti business',
        calculation_params: { base_value: 4000 }
      },
      
      // Software e Sistemi SII Enterprise
      { 
        name: 'Software Gestione SII Enterprise', 
        description: 'Piattaforma SII per volumi business con API avanzate',
        amount: 800, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Licenza enterprise per >1000 POD con funzionalità avanzate',
        calculation_params: { base_value: 800 }
      },
      { 
        name: 'Software Switching Avanzato', 
        description: 'Gestione massiva pratiche switching B2B, multi-POD',
        amount: 500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Modulo per clienti multi-sito e volture massive',
        calculation_params: { base_value: 500 }
      },
      { 
        name: 'Integrazione SII - Setup Enterprise', 
        description: 'Configurazione flussi XML multi-distributore',
        amount: 8000, 
        quantity: 1, 
        unit: 'progetto', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Setup complesso per gestione multi-distributore e multi-POD',
        calculation_params: { base_value: 8000 }
      },
      { 
        name: 'Connessione Portale Distributori', 
        description: 'Setup accessi e certificati per ogni distributore',
        amount: 500, 
        quantity: 10, 
        unit: 'distributore', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: '10 distributori principali × €500 setup ciascuno',
        calculation_params: { base_value: 5000 }
      },
      { 
        name: 'Licenza Software CRM Avanzato', 
        description: 'CRM con gestione offerte B2B complesse, pipeline vendita',
        amount: 250, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'CRM Salesforce/HubSpot tier business per 5-8 utenti',
        calculation_params: { base_value: 250 }
      },
      { 
        name: 'Piattaforma Billing Enterprise', 
        description: 'Fatturazione con gestione grandi volumi e multi-POD',
        amount: 500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Sistema billing enterprise per fatturazione complessa B2B',
        calculation_params: { base_value: 500 }
      },
      { 
        name: 'Sito Web B2B e Area Riservata', 
        description: 'Portale clienti business con dashboard consumi',
        amount: 8000, 
        quantity: 1, 
        unit: 'progetto', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Sviluppo portale con area clienti, analisi consumi, reporting',
        calculation_params: { base_value: 8000 }
      },
      
      // Costi Commerciali B2B
      { 
        name: 'Rete Agenti B2B - Provvigioni', 
        description: 'Commissione per contratto business acquisito',
        amount: 200, 
        quantity: 50, 
        unit: 'contratto', 
        cost_type: 'commercial', 
        is_recurring: false,
        calculation_basis: '50 contratti business anno 1. Provvigione €150-300/contratto in base ai volumi',
        calculation_params: { num_clients: 50, price_per_client: 200 }
      },
      { 
        name: 'Key Account Manager', 
        description: 'Risorsa dedicata gestione grandi clienti (stipendio + incentivi)',
        amount: 3500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'commercial', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'RAL €35.000-45.000 + bonus + contributi = ~€3.500/mese',
        calculation_params: { base_value: 3500 }
      },
      { 
        name: 'Marketing B2B', 
        description: 'LinkedIn Ads, eventi di settore, fiere B2B',
        amount: 2500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'commercial', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'LinkedIn Ads €1.500 + eventi/webinar €1.000/mese',
        calculation_params: { base_value: 2500 }
      },
      { 
        name: 'Materiale Commerciale Premium', 
        description: 'Presentazioni, case study, brochure per aziende',
        amount: 3000, 
        quantity: 1, 
        unit: 'lotto', 
        cost_type: 'commercial', 
        is_recurring: false,
        calculation_basis: 'Materiale corporate: presentazioni, case study, brochure premium',
        calculation_params: { base_value: 3000 }
      },
      
      // Costi Indiretti Operativi
      { 
        name: 'Team Back-Office', 
        description: '2 risorse gestione contratti business',
        amount: 4500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: '2 risorse × RAL €28.000 + contributi = ~€4.500/mese totale',
        calculation_params: { base_value: 4500 }
      },
      { 
        name: 'Specialista SII/Switching', 
        description: 'Gestione pratiche e rapporti distributori',
        amount: 2500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Risorsa esperta SII per gestione clienti multi-POD',
        calculation_params: { base_value: 2500 }
      },
      { 
        name: 'Affitto Ufficio Rappresentativo', 
        description: 'Sede in zona business per incontri clienti',
        amount: 1500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Ufficio 80-100 mq in zona business con sala riunioni',
        calculation_params: { base_value: 1500 }
      },
      { 
        name: 'Utenze e Servizi Ufficio', 
        description: 'Telefono, internet, energia',
        amount: 350, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Utenze ufficio più grande + banda larga business',
        calculation_params: { base_value: 350 }
      },
      { 
        name: 'Commercialista e Consulenze', 
        description: 'Gestione contabile avanzata, transfer pricing',
        amount: 600, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Commercialista per contabilità B2B complessa',
        calculation_params: { base_value: 600 }
      },
      
      // Costi Regolatori B2B
      { 
        name: 'Contributo Annuale ARERA', 
        description: 'Fee operatori settore energetico (calcolata su volumi)',
        amount: 2500, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Contributo ARERA più alto per volumi business',
        calculation_params: { base_value: 2500 }
      },
      { 
        name: 'Audit Qualità Commerciale ARERA', 
        description: 'Verifica conformità standard qualità B2B',
        amount: 3000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Audit più approfondito per mercato business',
        calculation_params: { base_value: 3000 }
      },
      { 
        name: 'Consulenza Aggiornamento Normativo', 
        description: 'Monitoraggio delibere e adeguamenti',
        amount: 500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Consulenza specializzata per normativa business + GSE',
        calculation_params: { base_value: 500 }
      },
      { 
        name: 'Fondo Rischio Sanzioni', 
        description: 'Accantonamento per eventuali sanzioni ARERA',
        amount: 5000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Accantonamento prudenziale più alto per volumi B2B',
        calculation_params: { base_value: 5000 }
      },
      
      // Costi Finanziari B2B
      { 
        name: 'Interessi Capitale Circolante', 
        description: 'Costo finanziario anticipo energia',
        amount: 1500, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Fabbisogno circolante ~€180.000 × 10% = ~€1.500/mese',
        calculation_params: { base_value: 180000, percentage: 10 }
      },
      { 
        name: 'Fondo Svalutazione Crediti', 
        description: 'Accantonamento morosità (2% business - rischio più basso)',
        amount: 800, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Fatturato €100.000/mese × 2% morosità business (più bassa)',
        calculation_params: { base_value: 100000, percentage: 2 }
      },
      { 
        name: 'Costi Recupero Crediti', 
        description: 'Solleciti, diffide, procedure legali',
        amount: 300, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Gestione insoluti business (importi maggiori)',
        calculation_params: { base_value: 300 }
      },
      
      // Costi IT/Sicurezza
      { 
        name: 'Hosting e Infrastruttura IT', 
        description: 'Server, cloud enterprise, backup avanzato',
        amount: 400, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Infrastruttura cloud più robusta per volumi business',
        calculation_params: { base_value: 400 }
      },
      { 
        name: 'Cybersecurity Avanzata', 
        description: 'Suite sicurezza enterprise, penetration test',
        amount: 200, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Sicurezza enterprise per dati sensibili business',
        calculation_params: { base_value: 200 }
      },
      { 
        name: 'Manutenzione Software', 
        description: 'Aggiornamenti e sviluppi evolutivi annuali',
        amount: 5000, 
        quantity: 1, 
        unit: 'anno', 
        cost_type: 'structural', 
        is_recurring: true, 
        recurrence_period: 'yearly',
        calculation_basis: 'Pacchetto ore sviluppo più ampio per esigenze B2B',
        calculation_params: { base_value: 5000 }
      },
      
      // Costi Operativi B2B
      { 
        name: 'Contact Center Dedicato', 
        description: 'Assistenza clienti business con SLA garantiti',
        amount: 600, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Servizio assistenza con tempi risposta garantiti per business',
        calculation_params: { base_value: 600 }
      },
      { 
        name: 'Gestione Reclami e Conciliazioni', 
        description: 'Procedure ADR e gestione dispute B2B',
        amount: 250, 
        quantity: 12, 
        unit: 'mese', 
        cost_type: 'indirect', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        calculation_basis: 'Gestione dispute commerciali B2B (importi maggiori)',
        calculation_params: { base_value: 250 }
      },
      { 
        name: 'Hardware IT', 
        description: 'PC, stampanti, telefoni, rete',
        amount: 6000, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: '5 postazioni complete + sala riunioni attrezzata',
        calculation_params: { base_value: 6000 }
      },
      { 
        name: 'Arredamento Ufficio', 
        description: 'Arredi ufficio rappresentativo',
        amount: 5000, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: 'Arredo professionale per ufficio + sala meeting',
        calculation_params: { base_value: 5000 }
      },
      { 
        name: 'Deposito Cauzionale Ufficio', 
        description: 'Cauzione affitto sede',
        amount: 4500, 
        quantity: 1, 
        unit: 'forfait', 
        cost_type: 'structural', 
        is_recurring: false,
        calculation_basis: '€1.500/mese × 3 mensilità cauzione',
        calculation_params: { base_value: 1500, num_clients: 3 }
      },
    ],
    revenues: [
      { 
        name: 'Margine Energia Elettrica Business', 
        description: 'Margine netto su vendita energia a clienti business (spread più basso ma volumi maggiori)',
        amount: 0.008, 
        quantity: 400000, 
        unit: 'kWh/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_kwh',
        calculation_basis: '400.000 kWh/mese × €0,008/kWh margine. Margine unitario più basso ma volumi compensano',
        calculation_params: { consumption_kwh: 400000, margin_per_kwh: 0.008 }
      },
      { 
        name: 'Margine Gas Naturale Business', 
        description: 'Margine netto su vendita gas a clienti business',
        amount: 0.03, 
        quantity: 80000, 
        unit: 'Smc/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_kwh',
        calculation_basis: '80.000 Smc/mese × €0,03/Smc margine',
        calculation_params: { consumption_smc: 80000, margin_per_kwh: 0.03 }
      },
      { 
        name: 'Fee Gestione Grandi Clienti', 
        description: 'Fee mensile per servizi di energy management su grandi clienti',
        amount: 100, 
        quantity: 20, 
        unit: 'cliente/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_client',
        calculation_basis: '20 clienti premium con fee gestione €100/mese per reporting e ottimizzazione',
        calculation_params: { num_clients: 20, margin_per_client: 100 }
      },
    ],
    taxes: standardTaxTemplates.map(tax => ({
      ...tax,
      // Adjust base amounts for business volumes
      base_amount: tax.tax_type === 'accise_energia' ? 400000 :
                   tax.tax_type === 'accise_gas' ? 80000 :
                   tax.tax_type === 'addizionali_comunali' ? 400000 :
                   tax.tax_type === 'addizionali_regionali' ? 80000 :
                   tax.tax_type === 'iva' ? 120000 :
                   tax.tax_type === 'csea' ? 400000 :
                   tax.tax_type === 'oneri_sistema' ? 400000 :
                   tax.base_amount,
      calculation_hypothesis: tax.calculation_hypothesis.replace('500 clienti residenziali', '100 clienti business').replace('300 clienti gas', '50 clienti gas business'),
    })),
  },
  {
    id: 'reseller-misto',
    name: 'Reseller Misto (B2B + B2C)',
    description: 'Modello ibrido con clientela residenziale e business. Richiede struttura flessibile e gestione differenziata per segmento.',
    icon: 'Users',
    color: 'hsl(262, 83%, 58%)',
    passthrough_costs: [
      { 
        name: 'Energia Acquistata (Luce) - Mix', 
        description: 'Costo commodity energia per portafoglio misto',
        amount: 0.115, 
        quantity: 275000, 
        unit: 'kWh/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Grossista',
        calculation_basis: 'Mix: 300 residenziali × 300 kWh + 50 business × 3.500 kWh = 275.000 kWh/mese',
        calculation_params: { consumption_kwh: 275000, price_per_kwh: 0.115 }
      },
      { 
        name: 'Gas Acquistato - Mix', 
        description: 'Costo commodity gas per portafoglio misto',
        amount: 0.78, 
        quantity: 65000, 
        unit: 'Smc/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Grossista',
        calculation_basis: 'Mix: 200 residenziali × 150 Smc + 30 business × 700 Smc = 65.000 Smc/mese',
        calculation_params: { consumption_smc: 65000, price_per_smc: 0.78 }
      },
      { 
        name: 'Corrispettivi Distribuzione Energia', 
        description: 'Tariffe trasporto/distribuzione mix clientela',
        amount: 0.032, 
        quantity: 275000, 
        unit: 'kWh/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Distributore locale',
        calculation_basis: 'Tariffa media ponderata residenziale/business',
        calculation_params: { consumption_kwh: 275000, price_per_kwh: 0.032 }
      },
      { 
        name: 'Corrispettivi Distribuzione Gas', 
        description: 'Tariffe distribuzione gas mix clientela',
        amount: 0.17, 
        quantity: 65000, 
        unit: 'Smc/mese', 
        cost_type: 'direct', 
        is_recurring: true, 
        recurrence_period: 'monthly',
        is_passthrough: true,
        passthrough_recipient: 'Distributore locale',
        calculation_basis: 'Tariffa media ponderata residenziale/business',
        calculation_params: { consumption_smc: 65000, price_per_smc: 0.17 }
      },
    ],
    costs: [
      // Costi strutturali medi tra B2C e B2B
      { name: 'Costituzione Società', description: 'Notaio, Camera di Commercio', amount: 3800, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: 'SRL per attività mista', calculation_params: { base_value: 3800 } },
      { name: 'Consulenza Legale', description: 'Contratti B2B e B2C, GDPR', amount: 5000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false, calculation_basis: 'Contratti per entrambi i segmenti', calculation_params: { base_value: 5000 } },
      { name: 'Consulenza Regolatoria ARERA', description: 'Iscrizione EVE dual-segment', amount: 9000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false, calculation_basis: 'Compliance per mercato misto', calculation_params: { base_value: 9000 } },
      { name: 'Garanzie Bancarie', description: 'Fideiussioni per grossisti', amount: 35000, quantity: 1, unit: 'garanzia', cost_type: 'structural', is_recurring: false, calculation_basis: 'Garanzia proporzionata a volumi misti', calculation_params: { base_value: 35000 } },
      { name: 'Rinnovo Fideiussioni', description: 'Commissione annuale', amount: 700, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: '€35.000 × 2%', calculation_params: { base_value: 35000, percentage: 2 } },
      { name: 'Assicurazione RC', description: 'Polizza annuale', amount: 3200, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly', calculation_basis: 'Massimale per clientela mista', calculation_params: { base_value: 3200 } },
      
      // Software
      { name: 'Software SII + Switching', description: 'Piattaforma gestione flussi e pratiche', amount: 650, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Licenza per volumi misti', calculation_params: { base_value: 650 } },
      { name: 'CRM + Billing', description: 'Gestione clienti e fatturazione', amount: 400, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Suite integrata per segmenti diversi', calculation_params: { base_value: 400 } },
      { name: 'Setup Sistemi', description: 'Integrazione iniziale SII e distributori', amount: 6500, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false, calculation_basis: 'Setup completo per dual-market', calculation_params: { base_value: 6500 } },
      { name: 'Sito Web + Portale', description: 'Portale differenziato B2B/B2C', amount: 6500, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false, calculation_basis: 'Sito con aree dedicate per segmento', calculation_params: { base_value: 6500 } },
      
      // Commerciale
      { name: 'Provvigioni Agenti Residenziale', description: 'Acquisizione clienti domestici', amount: 80, quantity: 80, unit: 'contratto', cost_type: 'commercial', is_recurring: false, calculation_basis: '80 contratti residenziali anno 1', calculation_params: { num_clients: 80, price_per_client: 80 } },
      { name: 'Provvigioni Agenti Business', description: 'Acquisizione clienti aziende', amount: 180, quantity: 30, unit: 'contratto', cost_type: 'commercial', is_recurring: false, calculation_basis: '30 contratti business anno 1', calculation_params: { num_clients: 30, price_per_client: 180 } },
      { name: 'Marketing Mix', description: 'Campagne digitali B2B e B2C', amount: 2000, quantity: 12, unit: 'mese', cost_type: 'commercial', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Budget diviso tra Google Ads e LinkedIn', calculation_params: { base_value: 2000 } },
      
      // Personale
      { name: 'Team Back-Office', description: '2 risorse per entrambi i segmenti', amount: 4000, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: '2 FTE polivalenti', calculation_params: { base_value: 4000 } },
      { name: 'Commercial + Account', description: 'Risorsa commerciale ibrida', amount: 2800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Profilo commerciale per entrambi i mercati', calculation_params: { base_value: 2800 } },
      
      // Operativi
      { name: 'Affitto Ufficio', description: 'Sede operativa', amount: 1100, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Ufficio 60-80 mq', calculation_params: { base_value: 1100 } },
      { name: 'Utenze Ufficio', description: 'Telefono, internet, energia', amount: 280, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Utenze standard', calculation_params: { base_value: 280 } },
      { name: 'Commercialista', description: 'Gestione contabile', amount: 500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Contabilità per SRL media', calculation_params: { base_value: 500 } },
      { name: 'Contact Center', description: 'Assistenza clienti', amount: 500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Servizio per clientela mista', calculation_params: { base_value: 500 } },
      
      // Finanziari
      { name: 'Interessi Capitale Circolante', description: 'Costo finanziario', amount: 900, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Fabbisogno €110.000 × 10%', calculation_params: { base_value: 110000, percentage: 10 } },
      { name: 'Fondo Svalutazione Crediti', description: 'Accantonamento morosità (2,5% medio)', amount: 550, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly', calculation_basis: 'Media ponderata B2B/B2C', calculation_params: { base_value: 65000, percentage: 2.5 } },
      
      // Setup
      { name: 'Hardware + Arredo', description: 'Dotazione ufficio', amount: 7500, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: '4 postazioni + sala riunioni', calculation_params: { base_value: 7500 } },
      { name: 'Deposito Cauzionale', description: 'Cauzione affitto', amount: 3300, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false, calculation_basis: '€1.100 × 3 mesi', calculation_params: { base_value: 1100, num_clients: 3 } },
    ],
    revenues: [
      { 
        name: 'Margine Energia Residenziale', 
        description: 'Margine clienti domestici',
        amount: 8, 
        quantity: 300, 
        unit: 'cliente/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_client',
        calculation_basis: '300 clienti residenziali × €8/mese',
        calculation_params: { num_clients: 300, margin_per_client: 8 }
      },
      { 
        name: 'Margine Gas Residenziale', 
        description: 'Margine gas domestici',
        amount: 12, 
        quantity: 200, 
        unit: 'cliente/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_client',
        calculation_basis: '200 clienti gas residenziali × €12/mese',
        calculation_params: { num_clients: 200, margin_per_client: 12 }
      },
      { 
        name: 'Margine Energia Business', 
        description: 'Margine clienti aziende (€/kWh)',
        amount: 0.007, 
        quantity: 175000, 
        unit: 'kWh/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_kwh',
        calculation_basis: '50 clienti business × 3.500 kWh × €0,007/kWh',
        calculation_params: { consumption_kwh: 175000, margin_per_kwh: 0.007 }
      },
      { 
        name: 'Margine Gas Business', 
        description: 'Margine gas aziende (€/Smc)',
        amount: 0.025, 
        quantity: 21000, 
        unit: 'Smc/mese', 
        revenue_type: 'recurring', 
        status: 'expected',
        margin_type: 'per_kwh',
        calculation_basis: '30 clienti gas business × 700 Smc × €0,025/Smc',
        calculation_params: { consumption_smc: 21000, margin_per_kwh: 0.025 }
      },
    ],
    taxes: standardTaxTemplates.map(tax => ({
      ...tax,
      base_amount: tax.tax_type === 'accise_energia' ? 275000 :
                   tax.tax_type === 'accise_gas' ? 65000 :
                   tax.tax_type === 'addizionali_comunali' ? 275000 :
                   tax.tax_type === 'addizionali_regionali' ? 65000 :
                   tax.tax_type === 'iva' ? 80000 :
                   tax.tax_type === 'csea' ? 275000 :
                   tax.tax_type === 'oneri_sistema' ? 275000 :
                   tax.base_amount,
      calculation_hypothesis: 'Stima per portafoglio misto residenziale + business',
    })),
  },
];
