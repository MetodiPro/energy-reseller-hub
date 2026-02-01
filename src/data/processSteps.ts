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

  // FASE 3: AUTORIZZAZIONI MASE, ARERA E ISCRIZIONI OBBLIGATORIE
  {
    id: 'step-3-1',
    phase: 3,
    title: 'Iscrizione EVE - Elenco Venditori Energia Elettrica',
    description: 'Iscrizione all\'Elenco Venditori Energia Elettrica (EVE) presso MASE (Ministero Ambiente e Sicurezza Energetica)',
    category: 'administrative',
    estimatedDays: 30,
    priority: 'high',
    dependencies: ['step-2-2'],
    documents: [
      'Visura camerale aggiornata',
      'Certificato carichi pendenti amministratori',
      'Autocertificazione requisiti onorabilità',
      'Descrizione struttura organizzativa',
      'Procedure gestione reclami',
      'Certificato iscrizione Registro Imprese',
      'Dichiarazione requisiti finanziari minimi'
    ],
    costs: {
      min: 0,
      max: 0,
      description: 'Iscrizione gratuita'
    },
    notes: [
      'Obbligatoria per vendita energia elettrica ai clienti finali',
      'Accesso con SPID/CIE del legale rappresentante',
      'Tempi istruttoria: 30 giorni lavorativi',
      'Rinnovo annuale entro 31 gennaio con autocertificazione',
      'Requisiti onorabilità: assenza condanne penali, procedure concorsuali, interdizioni',
      'Decreto di riferimento: DM 24 luglio 2015'
    ],
    checklist: [
      'Verifica requisiti giuridici (Srl/SpA con oggetto sociale idoneo)',
      'Verifica requisiti onorabilità amministratori e soci >10%',
      'Acquisizione certificato casellario giudiziale',
      'Preparazione documentazione struttura organizzativa',
      'Accesso portale EVE con SPID/CIE',
      'Compilazione domanda online sezione A (Dati Societari)',
      'Compilazione sezione B (Dati Operativi)',
      'Compilazione sezione C (Dichiarazioni)',
      'Upload documenti richiesti',
      'Invio domanda con firma digitale',
      'Monitoraggio stato pratica',
      'Ricezione decreto iscrizione'
    ],
    officialLinks: [
      {
        name: 'Portale EVE - MASE',
        url: 'https://elencovenditorielettrici.mase.gov.it/eve',
        description: 'Elenco Venditori Energia Elettrica - Ministero Ambiente'
      },
      {
        name: 'MASE - Sezione Vendita',
        url: 'https://www.mase.gov.it/portale/vendita',
        description: 'Informazioni e decreti vendita energia'
      }
    ]
  },
  {
    id: 'step-3-1b',
    phase: 3,
    title: 'Iscrizione EVG - Elenco Venditori Gas Naturale',
    description: 'Iscrizione all\'Elenco Venditori Gas Naturale (EVG) presso MASE - Obbligatorio dal 2025',
    category: 'administrative',
    estimatedDays: 30,
    priority: 'high',
    dependencies: ['step-2-2'],
    documents: [
      'Visura camerale aggiornata',
      'Certificato carichi pendenti amministratori',
      'Autocertificazione requisiti onorabilità',
      'Descrizione struttura organizzativa',
      'Dichiarazione capacità tecnica e finanziaria',
      'Garanzia finanziaria (fideiussione o deposito cauzionale)',
      'Piano di contingenza per emergenze'
    ],
    costs: {
      min: 10000,
      max: 50000,
      description: 'Garanzia finanziaria obbligatoria (importo proporzionale ai volumi previsti)'
    },
    notes: [
      'NOVITÀ 2025: Nuovo regolamento DM 19 maggio 2025 n. 85',
      'Obbligatoria per vendita gas naturale ai clienti finali',
      'Requisiti più stringenti rispetto a EVE',
      'Garanzia finanziaria minima richiesta (varia in base ai volumi)',
      'Iscrizione provvisoria possibile in attesa documentazione completa',
      'Termine iscrizione definitiva: verificare scadenze sul portale MASE',
      'Requisiti capacità tecnica: personale qualificato, procedure operative'
    ],
    checklist: [
      'Verifica requisiti giuridici e onorabilità',
      'Valutazione volumi gas previsti per calcolo garanzia',
      'Richiesta fideiussione bancaria/assicurativa',
      'Predisposizione piano di contingenza',
      'Accesso portale EVG con SPID/CIE',
      'Compilazione domanda online',
      'Upload garanzia finanziaria',
      'Upload piano contingenza',
      'Invio domanda',
      'Ottenimento iscrizione provvisoria (se applicabile)',
      'Completamento documentazione per iscrizione definitiva',
      'Ricezione decreto iscrizione definitiva'
    ],
    officialLinks: [
      {
        name: 'Portale EVG - MASE',
        url: 'https://www.mase.gov.it/portale/vendita',
        description: 'Elenco Venditori Gas Naturale'
      },
      {
        name: 'Decreto EVG n. 85/2025',
        url: 'https://www.mase.gov.it/portale/vendita',
        description: 'Regolamento iscrizione venditori gas naturale'
      },
      {
        name: 'ARERA - Delibera 70/2024/R/gas',
        url: 'https://www.arera.it/atti-e-provvedimenti/dettaglio/24/70-24',
        description: 'Condizioni di accesso EVG'
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
  {
    id: 'step-3-4',
    phase: 3,
    title: 'Pubblicazione Offerte sul Portale Offerte ARERA',
    description: 'Registrazione e pubblicazione obbligatoria delle offerte commerciali sul Portale Offerte di ARERA/Acquirente Unico',
    category: 'administrative',
    estimatedDays: 10,
    priority: 'high',
    dependencies: ['step-3-2'],
    documents: [
      'Schede di confrontabilità offerte',
      'Condizioni economiche dettagliate',
      'Condizioni contrattuali generali'
    ],
    costs: {
      min: 0,
      max: 0,
      description: 'Pubblicazione gratuita'
    },
    notes: [
      'Obbligo di legge per tutti i venditori (L. 124/2017)',
      'Tutte le offerte per clienti domestici e microimprese devono essere pubblicate',
      'Aggiornamento entro 5 giorni lavorativi da ogni variazione',
      'Il Portale Offerte permette ai clienti di confrontare le offerte',
      'Sanzioni ARERA per mancata pubblicazione o dati non corretti'
    ],
    checklist: [
      'Registrazione operatore sul Portale Offerte',
      'Configurazione credenziali accesso',
      'Preparazione schede offerte formato richiesto',
      'Inserimento offerte energia elettrica',
      'Inserimento offerte gas naturale',
      'Inserimento offerte dual fuel (se presenti)',
      'Verifica correttezza dati pubblicati',
      'Setup procedure aggiornamento periodico',
      'Monitoraggio offerte concorrenza'
    ],
    officialLinks: [
      {
        name: 'Portale Offerte',
        url: 'https://www.ilportaleofferte.it',
        description: 'Confronto offerte luce e gas per i consumatori'
      },
      {
        name: 'Area Operatori Portale Offerte',
        url: 'https://www.ilportaleofferte.it/portaleOfferte/it/operatori.page',
        description: 'Accesso operatori per pubblicazione offerte'
      }
    ]
  },
  {
    id: 'step-3-5',
    phase: 3,
    title: 'Codice di Condotta Commerciale ARERA',
    description: 'Adozione e formazione sul Codice di Condotta Commerciale per la vendita di energia elettrica e gas',
    category: 'legal',
    estimatedDays: 10,
    priority: 'high',
    dependencies: ['step-3-2'],
    documents: [
      'Codice di Condotta Commerciale adottato',
      'Procedure vendita conformi al Codice',
      'Materiali formativi agenti',
      'Script telefonici conformi'
    ],
    costs: {
      min: 1000,
      max: 3000,
      description: 'Consulenza e formazione personale commerciale'
    },
    notes: [
      'Obbligatorio per tutti i venditori (TIQV - Delibera 413/2016)',
      'Regole su: trasparenza prezzi, contratti non richiesti, telemarketing',
      'Obbligo di verifica consenso cliente prima della stipula',
      'Registrazione vocale obbligatoria per contratti telefonici',
      'Diritto di ripensamento 14 giorni per contratti a distanza',
      'Sanzioni severe per pratiche commerciali scorrette'
    ],
    checklist: [
      'Studio completo Codice di Condotta Commerciale ARERA',
      'Adozione formale del Codice in azienda',
      'Predisposizione procedure vendita conformi',
      'Formazione obbligatoria rete vendita',
      'Implementazione sistema registrazione chiamate',
      'Procedure gestione diritto di ripensamento',
      'Procedure verifica contratti non richiesti',
      'Audit periodico conformità vendite'
    ],
    officialLinks: [
      {
        name: 'Codice di Condotta Commerciale',
        url: 'https://www.arera.it/atti-e-provvedimenti/dettaglio/16/413-16',
        description: 'Delibera ARERA 413/2016 - TIQV'
      },
      {
        name: 'Pratiche Commerciali Scorrette',
        url: 'https://www.arera.it/consumatori/segnala-pratica-commerciale-scorretta',
        description: 'Segnalazioni e sanzioni'
      }
    ]
  },
  {
    id: 'step-3-6',
    phase: 3,
    title: 'Contributi CSEA (Cassa Servizi Energetici)',
    description: 'Registrazione e adempimenti verso CSEA per contributi e oneri di sistema',
    category: 'administrative',
    estimatedDays: 15,
    priority: 'high',
    dependencies: ['step-3-2'],
    documents: [
      'Registrazione portale CSEA',
      'Documentazione per contributi',
      'Procedure versamento oneri'
    ],
    costs: {
      min: 0,
      max: 0,
      description: 'Registrazione gratuita - contributi proporzionali ai volumi'
    },
    notes: [
      'CSEA gestisce i flussi finanziari degli oneri di sistema',
      'Il reseller incassa gli oneri in bolletta e li riversa a CSEA',
      'Dichiarazioni periodiche obbligatorie',
      'Contributo annuale operatori (proporzionale ai clienti serviti)',
      'Gestione bonus sociali (erogazione/recupero)',
      'Sanzioni per ritardi nei versamenti'
    ],
    checklist: [
      'Registrazione portale CSEA',
      'Ottenimento credenziali accesso',
      'Comprensione meccanismo oneri di sistema',
      'Setup procedure dichiarazioni periodiche',
      'Configurazione flussi contabili oneri',
      'Procedure gestione bonus sociali',
      'Calendario scadenze versamenti',
      'Formazione personale amministrativo'
    ],
    officialLinks: [
      {
        name: 'CSEA - Cassa per i Servizi Energetici',
        url: 'https://www.csea.it',
        description: 'Portale Cassa Servizi Energetici e Ambientali'
      },
      {
        name: 'Area Operatori CSEA',
        url: 'https://www.csea.it/area-operatori',
        description: 'Accesso operatori e dichiarazioni'
      }
    ]
  },

  // FASE 4: ACCORDO CON GROSSISTA E ACCESSO SII
  {
    id: 'step-4-1',
    phase: 4,
    title: 'Selezione e Contrattualizzazione Grossista',
    description: 'Ricerca, valutazione e firma accordo con Utente del Dispacciamento (grossista) per fornitura energia all\'ingrosso',
    category: 'commercial',
    estimatedDays: 20,
    priority: 'high',
    dependencies: ['step-3-1'],
    documents: [
      'Contratto di fornitura all\'ingrosso',
      'Accordo di reselling',
      'Condizioni economiche e pricing',
      'SLA servizi operativi',
      'Procedure operative condivise',
      'Garanzie finanziarie richieste'
    ],
    costs: {
      min: 50000,
      max: 100000,
      description: 'Garanzia finanziaria verso grossista (fideiussione bancaria/assicurativa)'
    },
    notes: [
      'FONDAMENTALE: Il grossista gestisce tutti i rapporti con Terna, GME e distributori',
      'Come reseller NON avrai contratti diretti con distributori locali',
      'Il grossista si occupa di: bilanciamento, dispacciamento, switching, volture',
      'Valutare: prezzi energia, servizi inclusi, supporto tecnico, SLA',
      'Verificare copertura territoriale del grossista',
      'Negoziare margini e condizioni commerciali',
      'La garanzia finanziaria è obbligatoria (importo negoziabile)',
      'Principali grossisti: Enel, Edison, A2A, Eni, Axpo, Repower, ecc.'
    ],
    checklist: [
      'Identificazione e ricerca grossisti qualificati',
      'Richiesta preventivi e condizioni commerciali',
      'Analisi comparativa offerte (pricing, servizi, SLA)',
      'Valutazione requisiti garanzia finanziaria',
      'Richiesta fideiussione bancaria/assicurativa',
      'Negoziazione termini contrattuali',
      'Verifica copertura territoriale',
      'Firma contratto di reselling',
      'Consegna garanzia finanziaria',
      'Setup accessi portale grossista',
      'Formazione su procedure operative grossista'
    ]
  },
  // NOTA: L'accreditamento SII è gestito dal grossista/UDD, non dal reseller
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
      'Modello di garanzia (se richiesto)',
      'Contratto con grossista (per verifica operatività)'
    ],
    costs: {
      min: 500,
      max: 3000,
      description: 'Costi amministrativi, consulenza fiscale accise e eventuale diritto di licenza'
    },
    notes: [
      'OBBLIGATORIA per tutti i venditori di energia elettrica e gas naturale',
      'Codice accise necessario per la fatturazione con addebito accise al cliente finale',
      'Dichiarazioni periodiche: mensili per grandi volumi, annuali per tutti',
      'Dichiarazione annuale energia elettrica: entro febbraio anno successivo',
      'Dichiarazione annuale gas naturale: entro marzo anno successivo',
      'Il reseller applica e versa le accise per conto dello Stato',
      'Diritto di Licenza annuale: circa €23 per energia elettrica',
      'Sanzioni severe per inadempimenti (fino a 5 volte l\'imposta evasa)',
      'Aliquote accise: variabili per tipologia cliente (domestico/business) e zona geografica'
    ],
    checklist: [
      'Richiesta credenziali portale Agenzia Dogane (SPID/CNS)',
      'Compilazione istanza registrazione energia elettrica',
      'Compilazione istanza registrazione gas naturale',
      'Predisposizione documentazione societaria',
      'Invio telematico istanze',
      'Ottenimento codice accise energia elettrica',
      'Ottenimento codice accise gas naturale',
      'Pagamento Diritto di Licenza annuale',
      'Setup calendario scadenze dichiarazioni',
      'Configurazione software per calcolo accise in bolletta',
      'Formazione personale su normativa accise',
      'Procedure versamento periodico accise'
    ],
    officialLinks: [
      {
        name: 'Agenzia Dogane e Monopoli',
        url: 'https://www.adm.gov.it',
        description: 'Portale Agenzia delle Dogane e dei Monopoli'
      },
      {
        name: 'Dichiarazioni Annuali Energia',
        url: 'https://www.adm.gov.it/portale/en/dichiarazioni-annuali-energie',
        description: 'Modelli dichiarazioni annuali accise'
      },
      {
        name: 'Circolare Accise 2024',
        url: 'https://www.adm.gov.it/portale/accise',
        description: 'Normativa e circolari accise'
      },
      {
        name: 'Servizi Online ADM',
        url: 'https://www.adm.gov.it/portale/servizi-online',
        description: 'Accesso ai servizi telematici'
      }
    ]
  },
  {
    id: 'step-4-3b',
    phase: 4,
    title: 'Formazione Portale e Procedure Grossista',
    description: 'Formazione sull\'utilizzo del portale del grossista per monitoraggio pratiche switching, volture e comunicazione con distributori',
    category: 'technical',
    estimatedDays: 10,
    priority: 'medium',
    dependencies: ['step-4-1'],
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
  // NOTA: Il software SII è gestito dal grossista, il reseller usa il portale del grossista
  {
    id: 'step-5-1',
    phase: 5,
    title: 'Infrastruttura CRM e Billing',
    description: 'Setup sistema gestionale, CRM clienti e piattaforma fatturazione',
    category: 'technical',
    estimatedDays: 15,
    priority: 'high',
    dependencies: ['step-4-3b'],
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
      'Integrazione con portale grossista per monitoraggio pratiche',
      'Conformità GDPR per dati personali'
    ],
    checklist: [
      'Selezione e acquisto CRM',
      'Integrazione CRM con portale grossista',
      'Setup sistema fatturazione elettronica',
      'Configurazione invio SDI',
      'Implementazione portale clienti',
      'Configurazione backup automatici',
      'Setup procedure GDPR',
      'Formazione staff su sistemi'
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
    dependencies: ['step-5-2'],
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
  { id: 3, name: 'Autorizzazioni MASE/ARERA', color: 'success' },
  { id: 4, name: 'Grossista e SII', color: 'warning' },
  { id: 5, name: 'Setup Operativo', color: 'primary' },
  { id: 6, name: 'Compliance', color: 'accent' },
  { id: 7, name: 'Lancio Commerciale', color: 'success' }
] as const;
