export interface ProcessStep {
  id: string;
  phase: number;
  title: string;
  description: string;
  category: 'legal' | 'administrative' | 'technical' | 'operational' | 'commercial';
  estimatedDays: number;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  documents: string[];
  costs?: {
    min: number;
    max: number;
    description: string;
  };
  notes: string[];
  checklist: string[];
}

export const processSteps: ProcessStep[] = [
  // FASE 1: COSTITUZIONE SOCIETÀ
  {
    id: 'step-1-1',
    phase: 1,
    title: 'Costituzione SRL',
    description: 'Costituzione della Società a Responsabilità Limitata con capitale minimo consigliato di €99.000',
    category: 'legal',
    estimatedDays: 10,
    priority: 'high',
    dependencies: [],
    documents: [
      'Documenti identità soci e amministratori',
      'Codici fiscali',
      'Certificato deposito capitale sociale',
      'Atto costitutivo',
      'Statuto società'
    ],
    costs: {
      min: 2500,
      max: 3000,
      description: 'Include onorario notaio, imposte di registro, diritti camerali e vidimazione libri sociali'
    },
    notes: [
      'Capitale sociale minimo: €10.000 (consigliato €99.000)',
      'Versamento minimo alla costituzione: €2.500 (25%)',
      'Preferire SRL ordinaria rispetto a semplificata',
      'Oggetto sociale deve includere: "Commercializzazione e vendita di energia elettrica e gas naturale"'
    ],
    checklist: [
      'Apertura conto corrente per deposito capitale',
      'Scelta denominazione sociale (deve contenere "SRL")',
      'Redazione atto costitutivo presso notaio',
      'Firma atto costitutivo',
      'Registrazione presso Agenzia delle Entrate'
    ]
  },
  
  // FASE 2: REGISTRAZIONI OBBLIGATORIE
  {
    id: 'step-2-1',
    phase: 2,
    title: 'Iscrizione Registro Imprese',
    description: 'Procedura ComUnica per iscrizione Registro Imprese e attribuzione Partita IVA',
    category: 'administrative',
    estimatedDays: 5,
    priority: 'high',
    dependencies: ['step-1-1'],
    documents: [
      'Atto costitutivo registrato',
      'Statuto',
      'Modulo ComUnica compilato',
      'Documento identità legale rappresentante'
    ],
    costs: {
      min: 200,
      max: 400,
      description: 'Diritti camerali e di segreteria'
    },
    notes: [
      'Tempistica: entro 20 giorni dalla costituzione',
      'Procedura telematica tramite ComUnica',
      'Include iscrizione INPS/INAIL automatica'
    ],
    checklist: [
      'Compilazione modulo ComUnica telematico',
      'Ottenimento numero REA',
      'Attribuzione Partita IVA',
      'Iscrizione posizioni previdenziali',
      'Comunicazione inizio attività'
    ]
  },
  {
    id: 'step-2-2',
    phase: 2,
    title: 'Attivazione PEC e Firma Digitale',
    description: 'Attivazione PEC aziendale e firma digitale per legale rappresentante',
    category: 'administrative',
    estimatedDays: 2,
    priority: 'high',
    dependencies: ['step-2-1'],
    documents: [
      'Documento identità legale rappresentante',
      'Certificato firma digitale'
    ],
    costs: {
      min: 80,
      max: 120,
      description: 'PEC annuale + Firma digitale triennale'
    },
    notes: [
      'PEC obbligatoria per comunicazioni ufficiali',
      'Firma digitale validità 3 anni',
      'Comunicare PEC al Registro Imprese entro 30 giorni'
    ],
    checklist: [
      'Attivazione PEC aziendale',
      'Richiesta firma digitale',
      'Comunicazione PEC al Registro Imprese',
      'Test funzionalità firma digitale'
    ]
  },

  // FASE 3: ISCRIZIONE EVE
  {
    id: 'step-3-1',
    phase: 3,
    title: 'Iscrizione EVE - Elenco Venditori Energia',
    description: 'Iscrizione all\'Elenco Venditori Energia Elettrica presso MASE',
    category: 'administrative',
    estimatedDays: 30,
    priority: 'high',
    dependencies: ['step-2-2'],
    documents: [
      'Visura camerale aggiornata',
      'Certificato carichi pendenti amministratori',
      'Autocertificazione requisiti onorabilità',
      'Descrizione struttura organizzativa',
      'Procedure gestione reclami'
    ],
    costs: {
      min: 0,
      max: 0,
      description: 'Iscrizione gratuita'
    },
    notes: [
      'Accesso con SPID/CIE del legale rappresentante',
      'URL: https://elencovenditorielettrici.mase.gov.it/eve',
      'Tempi istruttoria: 30 giorni lavorativi',
      'Rinnovo annuale entro 31 gennaio'
    ],
    checklist: [
      'Verifica requisiti giuridici',
      'Verifica requisiti onorabilità amministratori',
      'Preparazione documentazione struttura organizzativa',
      'Compilazione domanda online sezione A (Dati Societari)',
      'Compilazione sezione B (Dati Operativi)',
      'Compilazione sezione C (Dichiarazioni)',
      'Upload documenti richiesti',
      'Invio domanda',
      'Monitoraggio stato pratica'
    ]
  },

  // FASE 4: ACCORDO CON GROSSISTA
  {
    id: 'step-4-1',
    phase: 4,
    title: 'Selezione e Contrattualizzazione Grossista',
    description: 'Ricerca, valutazione e firma accordo con Utente del Dispacciamento (grossista)',
    category: 'commercial',
    estimatedDays: 20,
    priority: 'high',
    dependencies: ['step-3-1'],
    documents: [
      'Contratto di fornitura all\'ingrosso',
      'Accordo di reselling',
      'Condizioni economiche',
      'SLA servizi'
    ],
    notes: [
      'Il grossista gestisce rapporti con Terna, GME e distributori',
      'Valutare: prezzi energia, servizi inclusi, supporto tecnico',
      'Verificare copertura territoriale',
      'Negoziare margini e condizioni commerciali'
    ],
    checklist: [
      'Ricerca e selezione grossisti qualificati',
      'Richiesta preventivi e condizioni',
      'Analisi comparativa offerte',
      'Negoziazione termini contrattuali',
      'Verifica coperture assicurative',
      'Firma contratto di reselling',
      'Setup accessi portale grossista',
      'Formazione su procedure operative'
    ]
  },

  // FASE 5: SETUP OPERATIVO
  {
    id: 'step-5-1',
    phase: 5,
    title: 'Infrastruttura IT e CRM',
    description: 'Setup sistema gestionale, CRM e infrastruttura IT necessaria',
    category: 'technical',
    estimatedDays: 15,
    priority: 'high',
    dependencies: ['step-4-1'],
    documents: [
      'Licenze software',
      'Contratti fornitori IT',
      'Procedure backup dati'
    ],
    costs: {
      min: 3000,
      max: 10000,
      description: 'Software CRM, gestionale, infrastruttura IT'
    },
    notes: [
      'CRM per gestione clienti e contratti',
      'Sistema di fatturazione elettronica',
      'Portale clienti per autoletture e documenti',
      'Conformità GDPR per dati personali'
    ],
    checklist: [
      'Selezione e acquisto CRM',
      'Setup sistema fatturazione elettronica',
      'Implementazione portale clienti',
      'Configurazione backup automatici',
      'Setup procedure GDPR',
      'Formazione staff su sistemi',
      'Test integrazione con grossista'
    ]
  },
  {
    id: 'step-5-2',
    phase: 5,
    title: 'Struttura Commerciale e Contact Center',
    description: 'Organizzazione rete vendita e servizio assistenza clienti',
    category: 'operational',
    estimatedDays: 20,
    priority: 'high',
    dependencies: ['step-5-1'],
    documents: [
      'Contratti agenti/venditori',
      'Procedure assistenza clienti',
      'Script telefonici',
      'FAQ e knowledge base'
    ],
    costs: {
      min: 5000,
      max: 15000,
      description: 'Setup contact center, materiali commerciali, formazione'
    },
    notes: [
      'Numero verde per assistenza clienti',
      'Email servizio clienti dedicata',
      'Sistema ticketing per reclami',
      'SLA tempi risposta definiti'
    ],
    checklist: [
      'Selezione personale commerciale',
      'Setup numero verde',
      'Configurazione email servizio clienti',
      'Creazione procedure gestione reclami',
      'Formazione staff su prodotti e normativa',
      'Preparazione materiali commerciali',
      'Test procedure operative'
    ]
  },

  // FASE 6: COMPLIANCE E ASSICURAZIONI
  {
    id: 'step-6-1',
    phase: 6,
    title: 'Garanzie e Assicurazioni',
    description: 'Sottoscrizione polizze assicurative e garanzie richieste',
    category: 'administrative',
    estimatedDays: 10,
    priority: 'medium',
    dependencies: ['step-4-1'],
    documents: [
      'Polizza RC professionale',
      'Fideiussioni bancarie',
      'Garanzie finanziarie'
    ],
    costs: {
      min: 2000,
      max: 5000,
      description: 'Polizze assicurative annuali'
    },
    notes: [
      'RC professionale obbligatoria',
      'Copertura rischi operativi',
      'Garanzie verso grossista'
    ],
    checklist: [
      'Richiesta preventivi polizze',
      'Sottoscrizione RC professionale',
      'Attivazione fideiussioni richieste',
      'Verifica coperture adeguate',
      'Comunicazione polizze a grossista'
    ]
  },

  // FASE 7: LANCIO COMMERCIALE
  {
    id: 'step-7-1',
    phase: 7,
    title: 'Definizione Offerte Commerciali',
    description: 'Creazione listino prodotti e strategie pricing',
    category: 'commercial',
    estimatedDays: 10,
    priority: 'high',
    dependencies: ['step-5-2'],
    documents: [
      'Listino prezzi',
      'Condizioni generali vendita',
      'Modelli contrattuali',
      'Schede prodotto'
    ],
    notes: [
      'Analisi competitiva mercato',
      'Definizione margini target',
      'Segmentazione clientela (domestico/business)',
      'Servizi aggiuntivi e bundling'
    ],
    checklist: [
      'Analisi prezzi mercato',
      'Calcolo margini e pricing',
      'Creazione offerte commerciali',
      'Redazione contratti tipo',
      'Approvazione condizioni generali',
      'Preparazione materiali marketing',
      'Training forza vendita su offerte'
    ]
  },
  {
    id: 'step-7-2',
    phase: 7,
    title: 'Piano Marketing e Comunicazione',
    description: 'Sviluppo brand identity, sito web e strategie di acquisizione clienti',
    category: 'commercial',
    estimatedDays: 30,
    priority: 'high',
    dependencies: ['step-7-1'],
    documents: [
      'Brand identity manual',
      'Sito web aziendale',
      'Materiali promozionali',
      'Piano media'
    ],
    costs: {
      min: 5000,
      max: 20000,
      description: 'Sviluppo brand, sito web, materiali marketing'
    },
    notes: [
      'Sito web con area clienti',
      'Presenza social media',
      'Campagne digital marketing',
      'Materiali punto vendita'
    ],
    checklist: [
      'Sviluppo logo e brand identity',
      'Creazione sito web responsive',
      'Setup area riservata clienti',
      'Attivazione profili social',
      'Preparazione campagne Google Ads',
      'Materiali promozionali stampati',
      'Piano editorial content',
      'Budget e KPI marketing'
    ]
  },
  {
    id: 'step-7-3',
    phase: 7,
    title: 'Lancio Operativo',
    description: 'Avvio commercializzazione e acquisizione primi clienti',
    category: 'operational',
    estimatedDays: 0,
    priority: 'high',
    dependencies: ['step-7-2', 'step-6-1'],
    documents: [
      'Checklist go-live',
      'Procedure emergenza',
      'Piano acquisizione clienti'
    ],
    notes: [
      'Soft launch con target clienti limitato',
      'Monitoraggio KPI operativi',
      'Feedback e ottimizzazione processi'
    ],
    checklist: [
      'Verifica completezza setup',
      'Test end-to-end processi',
      'Formazione finale team',
      'Attivazione campagne marketing',
      'Primo contratto cliente',
      'Monitoraggio customer journey',
      'Raccolta feedback',
      'Ottimizzazione continua'
    ]
  }
];

export const phases = [
  { id: 1, name: 'Costituzione Società', color: 'primary' },
  { id: 2, name: 'Registrazioni Obbligatorie', color: 'accent' },
  { id: 3, name: 'Iscrizione EVE', color: 'success' },
  { id: 4, name: 'Accordo Grossista', color: 'warning' },
  { id: 5, name: 'Setup Operativo', color: 'primary' },
  { id: 6, name: 'Compliance', color: 'accent' },
  { id: 7, name: 'Lancio Commerciale', color: 'success' }
] as const;
