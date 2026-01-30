export interface OfficialLink {
  name: string;
  url: string;
  description?: string;
}

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
  officialLinks?: OfficialLink[];
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
    ],
    officialLinks: [
      {
        name: 'Agenzia delle Entrate',
        url: 'https://www.agenziaentrate.gov.it',
        description: 'Registrazione atti e attribuzione codice fiscale'
      },
      {
        name: 'Consiglio Nazionale del Notariato',
        url: 'https://www.notariato.it',
        description: 'Ricerca notaio e informazioni atti societari'
      }
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
    ],
    officialLinks: [
      {
        name: 'Registro Imprese - ComUnica',
        url: 'https://www.registroimprese.it/comunica-starweb',
        description: 'Pratica telematica unica per avvio impresa'
      },
      {
        name: 'InfoCamere - Registro Imprese',
        url: 'https://www.registroimprese.it',
        description: 'Visure camerali e ricerca imprese'
      },
      {
        name: 'Unioncamere',
        url: 'https://www.unioncamere.gov.it',
        description: 'Sistema Camere di Commercio italiane'
      },
      {
        name: 'INPS - Iscrizione Aziende',
        url: 'https://www.inps.it/prestazioni-servizi/iscrizione-azienda',
        description: 'Gestione posizioni previdenziali'
      }
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
    ],
    officialLinks: [
      {
        name: 'INI-PEC',
        url: 'https://www.inipec.gov.it',
        description: 'Indice Nazionale Indirizzi PEC'
      },
      {
        name: 'AgID - Firma Digitale',
        url: 'https://www.agid.gov.it/it/piattaforme/firma-elettronica-qualificata',
        description: 'Elenco prestatori servizi fiduciari qualificati'
      }
    ]
  },

  // FASE 3: AUTORIZZAZIONI ARERA E ISCRIZIONE EVE
  {
    id: 'step-3-1',
    phase: 3,
    title: 'Iscrizione EVE - Elenco Venditori Energia',
    description: 'Iscrizione all\'Elenco Venditori Energia Elettrica presso MASE (Ministero Ambiente e Sicurezza Energetica)',
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
    ],
    officialLinks: [
      {
        name: 'Portale EVE - MASE',
        url: 'https://elencovenditorielettrici.mase.gov.it/eve',
        description: 'Elenco Venditori Energia Elettrica - Ministero Ambiente'
      }
    ]
  },
  {
    id: 'step-3-2',
    phase: 3,
    title: 'Registrazione Anagrafica Operatori ARERA',
    description: 'Iscrizione all\'Anagrafica Operatori dell\'Autorità di Regolazione per Energia Reti e Ambiente',
    category: 'administrative',
    estimatedDays: 15,
    priority: 'high',
    dependencies: ['step-3-1'],
    documents: [
      'Credenziali SPID/CNS legale rappresentante',
      'Visura camerale',
      'Dati societari completi',
      'Codice ATECO attività'
    ],
    costs: {
      min: 0,
      max: 0,
      description: 'Registrazione gratuita'
    },
    notes: [
      'Obbligatoria per tutti gli operatori del settore energetico',
      'Prerequisito per accesso ai sistemi ARERA',
      'Aggiornamento dati obbligatorio entro 30 giorni da variazioni'
    ],
    checklist: [
      'Accesso portale ARERA con SPID/CNS',
      'Compilazione anagrafica società',
      'Inserimento dati legale rappresentante',
      'Dichiarazione attività svolta (vendita EE/Gas)',
      'Conferma e invio registrazione',
      'Conservazione credenziali di accesso'
    ],
    officialLinks: [
      {
        name: 'Anagrafica Operatori ARERA',
        url: 'https://www.arera.it/anagrafica-operatori',
        description: 'Portale registrazione operatori energetici'
      },
      {
        name: 'Portale ARERA',
        url: 'https://www.arera.it',
        description: 'Autorità di Regolazione per Energia Reti e Ambiente'
      }
    ]
  },
  {
    id: 'step-3-3',
    phase: 3,
    title: 'Adempimenti Obblighi Informativi ARERA',
    description: 'Configurazione sistemi per rispettare gli obblighi informativi periodici verso ARERA',
    category: 'administrative',
    estimatedDays: 10,
    priority: 'high',
    dependencies: ['step-3-2'],
    documents: [
      'Manuale procedure raccolta dati',
      'Template comunicazioni periodiche',
      'Calendario scadenze ARERA'
    ],
    costs: {
      min: 2000,
      max: 5000,
      description: 'Consulenza setup procedure e formazione'
    },
    notes: [
      'Comunicazioni annuali su volumi venduti',
      'Raccolta dati qualità commerciale',
      'Segnalazioni reclami e controversie',
      'Sanzioni ARERA per inadempimenti: fino a 3% fatturato'
    ],
    checklist: [
      'Studio delibere ARERA su obblighi informativi',
      'Setup calendario scadenze comunicazioni',
      'Predisposizione procedure raccolta dati interni',
      'Test compilazione moduli ARERA',
      'Formazione personale su obblighi',
      'Nomina responsabile compliance ARERA'
    ],
    officialLinks: [
      {
        name: 'Raccolta Dati ARERA',
        url: 'https://rd.arera.it/',
        description: 'Sistema raccolta dati obbligatori ARERA'
      },
      {
        name: 'Delibere e Regolamenti ARERA',
        url: 'https://www.arera.it/atti-e-provvedimenti',
        description: 'Normativa e delibere autorità'
      }
    ]
  },

  // FASE 4: ACCORDO CON GROSSISTA E ACCESSO SII
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
  {
    id: 'step-4-2',
    phase: 4,
    title: 'Accreditamento Sistema Informativo Integrato (SII)',
    description: 'Registrazione e accreditamento presso Acquirente Unico per accesso al SII',
    category: 'technical',
    estimatedDays: 30,
    priority: 'high',
    dependencies: ['step-4-1'],
    documents: [
      'Richiesta accreditamento AU',
      'Certificati digitali per firma flussi',
      'Documentazione tecnica sistemi',
      'Test di conformità superati'
    ],
    costs: {
      min: 5000,
      max: 15000,
      description: 'Setup tecnico, certificati, test conformità'
    },
    notes: [
      'SII gestito da Acquirente Unico (AU)',
      'Necessario per switching, volture, attivazioni',
      'Flussi XML standardizzati secondo specifiche AU',
      'Test obbligatori prima della messa in produzione'
    ],
    checklist: [
      'Richiesta credenziali portale Acquirente Unico',
      'Acquisizione certificati digitali per firma flussi',
      'Setup ambiente di test SII',
      'Configurazione software gestione flussi XML',
      'Esecuzione test di conformità',
      'Superamento test switching simulato',
      'Superamento test volture/subentri',
      'Richiesta passaggio in produzione',
      'Attivazione ambiente produzione SII'
    ],
    officialLinks: [
      {
        name: 'Portale Acquirente Unico - SII',
        url: 'https://www.acquirenteunico.it/sii',
        description: 'Sistema Informativo Integrato'
      },
      {
        name: 'Specifiche Tecniche SII',
        url: 'https://www.acquirenteunico.it/sii/specifiche-tecniche',
        description: 'Documentazione tecnica flussi XML'
      },
      {
        name: 'Area Operatori AU',
        url: 'https://portale.acquirenteunico.it/',
        description: 'Accesso operatori accreditati'
      }
    ]
  },
  {
    id: 'step-4-3',
    phase: 4,
    title: 'Iscrizione Agenzia Dogane e Monopoli (Accise)',
    description: 'Registrazione come operatore accise presso l\'Agenzia delle Dogane per la vendita di energia elettrica e gas naturale',
    category: 'administrative',
    estimatedDays: 30,
    priority: 'high',
    dependencies: ['step-3-2'],
    documents: [
      'Istanza di registrazione accise energia elettrica',
      'Istanza di registrazione accise gas naturale',
      'Visura camerale aggiornata',
      'Documenti identità legale rappresentante',
      'Dichiarazione inizio attività',
      'Modello di garanzia (se richiesto)'
    ],
    costs: {
      min: 500,
      max: 2000,
      description: 'Costi amministrativi e consulenza fiscale accise'
    },
    notes: [
      'Obbligatoria per tutti i venditori di energia elettrica e gas naturale',
      'Codice accise necessario per la fatturazione con addebito accise al cliente finale',
      'Dichiarazioni periodiche obbligatorie (mensili/annuali)',
      'Il reseller applica e versa le accise per conto dello Stato',
      'Sanzioni severe per inadempimenti (fino a 5 volte l\'imposta evasa)'
    ],
    checklist: [
      'Richiesta credenziali portale Agenzia Dogane',
      'Compilazione istanza registrazione energia elettrica',
      'Compilazione istanza registrazione gas naturale',
      'Predisposizione documentazione societaria',
      'Invio telematico istanze',
      'Ottenimento codice accise energia elettrica',
      'Ottenimento codice accise gas naturale',
      'Setup procedure dichiarazioni periodiche',
      'Formazione personale su normativa accise'
    ],
    officialLinks: [
      {
        name: 'Agenzia Dogane e Monopoli',
        url: 'https://www.adm.gov.it',
        description: 'Portale Agenzia delle Dogane e dei Monopoli'
      },
      {
        name: 'Accise Energia Elettrica',
        url: 'https://www.adm.gov.it/portale/energia-elettrica',
        description: 'Sezione dedicata accise energia elettrica'
      },
      {
        name: 'Accise Gas Naturale',
        url: 'https://www.adm.gov.it/portale/gas-naturale',
        description: 'Sezione dedicata accise gas naturale'
      },
      {
        name: 'Servizi Online ADM',
        url: 'https://www.adm.gov.it/portale/servizi-online',
        description: 'Accesso ai servizi telematici'
      }
    ]
  },
  {
    id: 'step-4-4',
    phase: 4,
    title: 'Familiarizzazione Portali Distributori (via Grossista)',
    description: 'Conoscenza dei principali portali distributori per monitoraggio pratiche gestite dal grossista',
    category: 'technical',
    estimatedDays: 10,
    priority: 'medium',
    dependencies: ['step-4-2'],
    documents: [
      'Documentazione procedure grossista',
      'Guida portali distributori (consultazione)',
      'Procedure escalation problematiche'
    ],
    costs: {
      min: 0,
      max: 500,
      description: 'Eventuale formazione aggiuntiva'
    },
    notes: [
      'IMPORTANTE: Come reseller, i contratti di trasporto e distribuzione sono gestiti dal grossista',
      'Il reseller NON ha rapporti diretti contrattuali con i distributori',
      'Il grossista gestisce: switching, volture, subentri, letture, interventi tecnici',
      'Il reseller può avere accesso in sola lettura per monitoraggio stato pratiche',
      'Comunicazione con distributori avviene tramite il grossista'
    ],
    checklist: [
      'Comprendere ruolo distributori nella filiera',
      'Conoscere principali distributori nelle zone operative',
      'Studiare tempi standard pratiche (switching 21gg, ecc.)',
      'Definire procedure escalation con grossista',
      'Formazione su lettura esiti pratiche SII',
      'Setup alert per pratiche critiche',
      'Documentare flussi comunicazione con grossista'
    ],
    officialLinks: [
      {
        name: 'E-Distribuzione (Enel)',
        url: 'https://www.e-distribuzione.it',
        description: 'Principale distributore nazionale'
      },
      {
        name: 'Unareti (A2A)',
        url: 'https://www.unareti.it',
        description: 'Distributore Milano/Brescia'
      },
      {
        name: 'Areti (ACEA)',
        url: 'https://www.areti.it',
        description: 'Distributore Roma e Lazio'
      }
    ]
  },

  // FASE 5: SETUP OPERATIVO E SOFTWARE
  {
    id: 'step-5-1',
    phase: 5,
    title: 'Implementazione Software SII e Switching',
    description: 'Setup piattaforma gestione flussi SII, switching, volture e subentri',
    category: 'technical',
    estimatedDays: 20,
    priority: 'high',
    dependencies: ['step-4-2'],
    documents: [
      'Contratto software SII',
      'Documentazione tecnica integrazione',
      'Procedure operative switching',
      'Manuale utente'
    ],
    costs: {
      min: 10000,
      max: 25000,
      description: 'Licenze software + setup + formazione'
    },
    notes: [
      'Software deve essere certificato per flussi AU',
      'Integrazione con CRM e billing necessaria',
      'Gestione automatica esiti e scarti',
      'Monitoraggio SLA switching (21 giorni)'
    ],
    checklist: [
      'Selezione fornitore software SII',
      'Installazione e configurazione piattaforma',
      'Integrazione con sistemi AU',
      'Configurazione flussi switching in/out',
      'Configurazione flussi volture/subentri',
      'Test end-to-end con ambiente AU test',
      'Formazione operatori su gestione pratiche',
      'Go-live ambiente produzione'
    ]
  },
  {
    id: 'step-5-2',
    phase: 5,
    title: 'Infrastruttura CRM e Billing',
    description: 'Setup sistema gestionale, CRM clienti e piattaforma fatturazione',
    category: 'technical',
    estimatedDays: 15,
    priority: 'high',
    dependencies: ['step-5-1'],
    documents: [
      'Licenze software',
      'Contratti fornitori IT',
      'Procedure backup dati'
    ],
    costs: {
      min: 5000,
      max: 15000,
      description: 'Software CRM, gestionale, billing, infrastruttura IT'
    },
    notes: [
      'CRM per gestione clienti e contratti',
      'Sistema di fatturazione elettronica SDI',
      'Integrazione con software SII',
      'Conformità GDPR per dati personali'
    ],
    checklist: [
      'Selezione e acquisto CRM',
      'Integrazione CRM con software SII',
      'Setup sistema fatturazione elettronica',
      'Configurazione invio SDI',
      'Implementazione portale clienti',
      'Configurazione backup automatici',
      'Setup procedure GDPR',
      'Formazione staff su sistemi'
    ]
  },
  {
    id: 'step-5-3',
    phase: 5,
    title: 'Struttura Commerciale e Contact Center',
    description: 'Organizzazione rete vendita e servizio assistenza clienti',
    category: 'operational',
    estimatedDays: 20,
    priority: 'high',
    dependencies: ['step-5-2'],
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
      'Numero verde per assistenza clienti (obbligatorio ARERA)',
      'Email servizio clienti dedicata',
      'Sistema ticketing per reclami (SLA ARERA)',
      'Tempi risposta reclami: max 30 giorni solari'
    ],
    checklist: [
      'Selezione personale commerciale',
      'Setup numero verde',
      'Configurazione email servizio clienti',
      'Creazione procedure gestione reclami ARERA-compliant',
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
  {
    id: 'step-6-2',
    phase: 6,
    title: 'Compliance GDPR e Privacy',
    description: 'Adeguamento completo alla normativa privacy per trattamento dati clienti',
    category: 'legal',
    estimatedDays: 15,
    priority: 'high',
    dependencies: ['step-5-2'],
    documents: [
      'Registro trattamenti dati',
      'Informative privacy',
      'Contratti DPO/Responsabili esterni',
      'Procedure data breach'
    ],
    costs: {
      min: 3000,
      max: 8000,
      description: 'Consulenza privacy, DPO, documentazione'
    },
    notes: [
      'Nomina DPO obbligatoria per trattamento dati su larga scala',
      'Informative specifiche per contratti energia',
      'Gestione consensi marketing',
      'Procedure notifica data breach (72 ore)'
    ],
    checklist: [
      'Mappatura trattamenti dati personali',
      'Redazione registro trattamenti',
      'Preparazione informative privacy',
      'Nomina DPO (se obbligatorio)',
      'Contratti con responsabili esterni',
      'Procedure gestione diritti interessati',
      'Procedure notifica data breach',
      'Formazione personale su GDPR'
    ],
    officialLinks: [
      {
        name: 'Garante Privacy',
        url: 'https://www.garanteprivacy.it',
        description: 'Autorità Garante per la Protezione dei Dati Personali'
      },
      {
        name: 'Modulistica GDPR',
        url: 'https://www.garanteprivacy.it/home/modulistica',
        description: 'Moduli e documenti ufficiali privacy'
      },
      {
        name: 'Registro Trattamenti - Template',
        url: 'https://www.garanteprivacy.it/registro-delle-attivita-di-trattamento',
        description: 'Guida e modello registro trattamenti'
      },
      {
        name: 'Notifica Data Breach',
        url: 'https://servizi.gpdp.it/databreach/s/',
        description: 'Portale notifica violazioni dati personali'
      }
    ]
  },

  // FASE 7: LANCIO COMMERCIALE
  {
    id: 'step-7-1',
    phase: 7,
    title: 'Definizione Offerte Commerciali',
    description: 'Creazione listino prodotti e strategie pricing per residenziale e business',
    category: 'commercial',
    estimatedDays: 10,
    priority: 'high',
    dependencies: ['step-5-3'],
    documents: [
      'Listino prezzi',
      'Condizioni generali vendita',
      'Modelli contrattuali',
      'Schede prodotto'
    ],
    notes: [
      'Conformità a delibere ARERA su trasparenza prezzi',
      'Definizione margini target',
      'Segmentazione clientela (domestico/business)',
      'Offerte luce, gas, dual fuel'
    ],
    checklist: [
      'Analisi prezzi mercato',
      'Calcolo margini e pricing',
      'Creazione offerte commerciali ARERA-compliant',
      'Redazione contratti tipo',
      'Approvazione condizioni generali',
      'Preparazione schede trasparenza',
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
      'Sito web con area clienti e bolletta online',
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
    dependencies: ['step-7-2', 'step-6-1', 'step-6-2'],
    documents: [
      'Checklist go-live',
      'Procedure emergenza',
      'Piano acquisizione clienti'
    ],
    notes: [
      'Soft launch con target clienti limitato',
      'Monitoraggio KPI operativi',
      'Verifica tempi switching effettivi',
      'Feedback e ottimizzazione processi'
    ],
    checklist: [
      'Verifica completezza setup',
      'Test end-to-end processi switching',
      'Verifica funzionamento flussi SII',
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
  { id: 3, name: 'Autorizzazioni ARERA', color: 'success' },
  { id: 4, name: 'Grossista e SII', color: 'warning' },
  { id: 5, name: 'Setup Operativo', color: 'primary' },
  { id: 6, name: 'Compliance', color: 'accent' },
  { id: 7, name: 'Lancio Commerciale', color: 'success' }
] as const;
