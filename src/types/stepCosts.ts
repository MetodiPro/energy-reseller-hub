// Categorie di costo per gli step del processo
export type StepCostCategory = 
  | 'licenze'       // Costi di licenze e autorizzazioni
  | 'consulenza'    // Consulenti esterni (legali, tecnici, fiscali)
  | 'burocrazia'    // Diritti, bolli, segreteria, registrazioni
  | 'software'      // Software, piattaforme, CRM, billing
  | 'garanzie'      // Fideiussioni, depositi cauzionali
  | 'formazione'    // Corsi, certificazioni, training
  | 'personale'     // Costi del personale dedicato
  | 'infrastruttura' // Hardware, uffici, attrezzature
  | 'altro';        // Altre spese non classificate

export interface StepCostItem {
  id: string;
  name: string;
  category: StepCostCategory;
  defaultAmount: number;
  description: string;
  isOptional?: boolean; // Se true, il costo non è sempre necessario
  notes?: string;
}

export interface StepCostDetail {
  min: number;
  max: number;
  description: string;
  items: StepCostItem[];
}

// Dizionario delle categorie con label e icone
export const costCategoryLabels: Record<StepCostCategory, { label: string; icon: string; color: string }> = {
  licenze: { label: 'Licenze e Autorizzazioni', icon: 'FileCheck', color: 'text-blue-600' },
  consulenza: { label: 'Consulenze', icon: 'Users', color: 'text-purple-600' },
  burocrazia: { label: 'Burocrazia e Diritti', icon: 'FileText', color: 'text-slate-600' },
  software: { label: 'Software e Piattaforme', icon: 'Monitor', color: 'text-cyan-600' },
  garanzie: { label: 'Garanzie Finanziarie', icon: 'Shield', color: 'text-orange-600' },
  formazione: { label: 'Formazione', icon: 'GraduationCap', color: 'text-green-600' },
  personale: { label: 'Personale', icon: 'UserCheck', color: 'text-pink-600' },
  infrastruttura: { label: 'Infrastruttura', icon: 'Building2', color: 'text-amber-600' },
  altro: { label: 'Altro', icon: 'MoreHorizontal', color: 'text-muted-foreground' },
};

// Costi dettagliati per ogni step (ID step -> dettagli costi)
export const stepCostsData: Record<string, StepCostDetail> = {
  // FASE 1: COSTITUZIONE SOCIETÀ
  'step-1-1': {
    min: 2500,
    max: 5000,
    description: 'Costi di costituzione SRL per attività di reseller energia',
    items: [
      {
        id: 'notaio-atto',
        name: 'Onorario Notaio',
        category: 'burocrazia',
        defaultAmount: 1500,
        description: 'Redazione e rogito atto costitutivo e statuto',
      },
      {
        id: 'imposta-registro',
        name: 'Imposta di Registro',
        category: 'burocrazia',
        defaultAmount: 200,
        description: 'Imposta fissa per registrazione atto',
      },
      {
        id: 'diritti-camerali',
        name: 'Diritti Camerali Primo Anno',
        category: 'burocrazia',
        defaultAmount: 120,
        description: 'Diritto annuale Camera di Commercio',
      },
      {
        id: 'vidimazione-libri',
        name: 'Vidimazione Libri Sociali',
        category: 'burocrazia',
        defaultAmount: 150,
        description: 'Bolli e vidimazione libri obbligatori',
      },
      {
        id: 'consulenza-costituzione',
        name: 'Consulenza Commercialista',
        category: 'consulenza',
        defaultAmount: 800,
        description: 'Assistenza nella costituzione e setup fiscale',
        isOptional: true,
      },
      {
        id: 'pec-firma',
        name: 'PEC e Firma Digitale',
        category: 'burocrazia',
        defaultAmount: 80,
        description: 'Attivazione casella PEC e firma digitale LR',
      },
    ],
  },

  // FASE 2: REGISTRAZIONI
  'step-2-1': {
    min: 200,
    max: 500,
    description: 'Iscrizione Registro Imprese e adempimenti correlati',
    items: [
      {
        id: 'diritti-segreteria',
        name: 'Diritti di Segreteria',
        category: 'burocrazia',
        defaultAmount: 90,
        description: 'Diritti per pratiche camerali',
      },
      {
        id: 'bolli-comunica',
        name: 'Bolli Pratica ComUnica',
        category: 'burocrazia',
        defaultAmount: 65,
        description: 'Imposta di bollo per pratica telematica',
      },
      {
        id: 'consulenza-comunica',
        name: 'Assistenza Commercialista',
        category: 'consulenza',
        defaultAmount: 200,
        description: 'Supporto per compilazione e invio ComUnica',
        isOptional: true,
      },
    ],
  },

  'step-2-2': {
    min: 80,
    max: 150,
    description: 'Attivazione strumenti digitali obbligatori',
    items: [
      {
        id: 'pec-annuale',
        name: 'PEC Aziendale (annuale)',
        category: 'software',
        defaultAmount: 25,
        description: 'Canone annuale casella PEC',
      },
      {
        id: 'firma-digitale',
        name: 'Firma Digitale (3 anni)',
        category: 'software',
        defaultAmount: 80,
        description: 'Kit firma digitale con validità triennale',
      },
    ],
  },

  // FASE 3: AUTORIZZAZIONI
  'step-3-1': {
    min: 500,
    max: 2000,
    description: 'Iscrizione EVE - Elenco Venditori Energia Elettrica',
    items: [
      {
        id: 'eve-iscrizione',
        name: 'Iscrizione EVE',
        category: 'licenze',
        defaultAmount: 0,
        description: 'Iscrizione gratuita al MASE',
      },
      {
        id: 'casellario-giudiziale',
        name: 'Certificati Casellario',
        category: 'burocrazia',
        defaultAmount: 50,
        description: 'Certificati casellario per amministratori',
      },
      {
        id: 'consulenza-eve',
        name: 'Consulenza Pratica EVE',
        category: 'consulenza',
        defaultAmount: 1000,
        description: 'Assistenza nella compilazione e presentazione domanda',
        isOptional: true,
      },
      {
        id: 'struttura-organizzativa',
        name: 'Redazione Documenti Organizzativi',
        category: 'consulenza',
        defaultAmount: 500,
        description: 'Preparazione procedure e organigramma richiesti',
        isOptional: true,
      },
    ],
  },

  'step-3-1c': {
    min: 500,
    max: 3000,
    description: 'Formazione specifica su normativa reseller',
    items: [
      {
        id: 'corso-normativa',
        name: 'Corso Normativa Settore Energia',
        category: 'formazione',
        defaultAmount: 1200,
        description: 'Formazione su regolamentazione ARERA e obblighi operativi',
      },
      {
        id: 'consulenza-setup',
        name: 'Consulenza Iniziale Setup',
        category: 'consulenza',
        defaultAmount: 800,
        description: 'Affiancamento consulente specializzato',
        isOptional: true,
      },
    ],
  },

  'step-3-2': {
    min: 0,
    max: 500,
    description: 'Registrazione Anagrafica Operatori ARERA',
    items: [
      {
        id: 'arera-iscrizione',
        name: 'Iscrizione ARERA',
        category: 'licenze',
        defaultAmount: 0,
        description: 'Registrazione gratuita portale ARERA',
      },
      {
        id: 'consulenza-arera',
        name: 'Assistenza Registrazione',
        category: 'consulenza',
        defaultAmount: 300,
        description: 'Supporto nella compilazione anagrafica',
        isOptional: true,
      },
    ],
  },

  'step-3-3': {
    min: 2000,
    max: 8000,
    description: 'Setup obblighi informativi ARERA',
    items: [
      {
        id: 'consulenza-compliance',
        name: 'Consulenza Compliance ARERA',
        category: 'consulenza',
        defaultAmount: 3000,
        description: 'Setup procedure raccolta dati e comunicazioni periodiche',
      },
      {
        id: 'formazione-arera',
        name: 'Formazione Personale Obblighi',
        category: 'formazione',
        defaultAmount: 800,
        description: 'Training su scadenze e moduli ARERA',
      },
      {
        id: 'software-compliance',
        name: 'Software Gestione Compliance',
        category: 'software',
        defaultAmount: 1500,
        description: 'Strumento per tracking scadenze e comunicazioni',
        isOptional: true,
      },
    ],
  },

  'step-3-4': {
    min: 0,
    max: 1000,
    description: 'Pubblicazione offerte Portale Offerte ARERA',
    items: [
      {
        id: 'portale-offerte',
        name: 'Pubblicazione Portale',
        category: 'licenze',
        defaultAmount: 0,
        description: 'Pubblicazione gratuita',
      },
      {
        id: 'consulenza-offerte',
        name: 'Consulenza Schede Offerta',
        category: 'consulenza',
        defaultAmount: 600,
        description: 'Preparazione schede conformi ai requisiti ARERA',
        isOptional: true,
      },
    ],
  },

  // FASE 4: ACCORDO GROSSISTA
  'step-4-1': {
    min: 0,
    max: 5000,
    description: 'Ricerca e selezione grossista energia',
    items: [
      {
        id: 'consulenza-grossista',
        name: 'Consulenza Selezione Grossista',
        category: 'consulenza',
        defaultAmount: 2000,
        description: 'Analisi mercato e negoziazione condizioni',
        isOptional: true,
      },
      {
        id: 'due-diligence',
        name: 'Due Diligence Commerciale',
        category: 'consulenza',
        defaultAmount: 1500,
        description: 'Verifica affidabilità e condizioni economiche',
        isOptional: true,
      },
    ],
  },

  'step-4-2': {
    min: 30000,
    max: 150000,
    description: 'Garanzie finanziarie per accordo grossista',
    items: [
      {
        id: 'deposito-cauzionale',
        name: 'Deposito Cauzionale Grossista',
        category: 'garanzie',
        defaultAmount: 50000,
        description: 'Deposito o fideiussione richiesta dal grossista (varia in base ai volumi)',
        notes: 'Tipicamente 1-3 mesi di fatturato previsto',
      },
      {
        id: 'costo-fideiussione',
        name: 'Costo Emissione Fideiussione',
        category: 'garanzie',
        defaultAmount: 2500,
        description: 'Commissione bancaria/assicurativa (1.5-3% annuo del valore garantito)',
      },
      {
        id: 'consulenza-legale-contratto',
        name: 'Consulenza Legale Contratto',
        category: 'consulenza',
        defaultAmount: 2000,
        description: 'Revisione contratto di fornitura energia',
        isOptional: true,
      },
    ],
  },

  // STEP 3-5: Codice di Condotta Commerciale
  'step-3-5': {
    min: 1000,
    max: 4000,
    description: 'Adozione Codice di Condotta Commerciale ARERA',
    items: [
      {
        id: 'consulenza-codice',
        name: 'Consulenza Adozione Codice',
        category: 'consulenza',
        defaultAmount: 1500,
        description: 'Assistenza per implementazione procedure conformi TIQV',
      },
      {
        id: 'formazione-vendita',
        name: 'Formazione Rete Vendita',
        category: 'formazione',
        defaultAmount: 1200,
        description: 'Training obbligatorio su pratiche commerciali corrette',
      },
      {
        id: 'sistema-registrazione',
        name: 'Sistema Registrazione Chiamate',
        category: 'software',
        defaultAmount: 800,
        description: 'Software per registrazione vocale contratti telefonici',
        isOptional: true,
      },
    ],
  },

  // STEP 3-6: CSEA - IMPORTANTE: Il reseller NON versa direttamente a CSEA
  'step-3-6': {
    min: 0,
    max: 1000,
    description: 'Registrazione e adempimenti CSEA - NOTA: Il reseller NON versa contributi diretti a CSEA',
    items: [
      {
        id: 'csea-registrazione',
        name: 'Registrazione Portale CSEA',
        category: 'licenze',
        defaultAmount: 0,
        description: 'Registrazione gratuita per consultazione e dichiarazioni',
      },
      {
        id: 'consulenza-csea',
        name: 'Consulenza Procedure CSEA',
        category: 'consulenza',
        defaultAmount: 500,
        description: 'Comprensione flussi oneri di sistema (gestiti via grossista)',
        isOptional: true,
        notes: 'IMPORTANTE: Gli oneri di sistema sono incassati dal cliente in bolletta e trasferiti al distributore, che poi li versa a CSEA. Il reseller NON ha rapporti diretti di versamento con CSEA.',
      },
    ],
  },

  // STEP 4-3: Accise ADM (aggiornato)
  'step-4-3': {
    min: 500,
    max: 3500,
    description: 'Registrazione Agenzia Dogane e Monopoli per Accise',
    items: [
      {
        id: 'adm-iscrizione',
        name: 'Iscrizione ADM',
        category: 'licenze',
        defaultAmount: 0,
        description: 'Registrazione gratuita per codice accise',
      },
      {
        id: 'diritto-licenza',
        name: 'Diritto di Licenza Annuale',
        category: 'burocrazia',
        defaultAmount: 25,
        description: 'Circa €23 annui per energia elettrica',
      },
      {
        id: 'consulenza-accise',
        name: 'Consulenza Fiscale Accise',
        category: 'consulenza',
        defaultAmount: 1800,
        description: 'Assistenza registrazione e setup procedure dichiarative',
      },
      {
        id: 'software-accise',
        name: 'Modulo Software Calcolo Accise',
        category: 'software',
        defaultAmount: 1200,
        description: 'Integrazione billing per calcolo e applicazione accise in bolletta',
      },
    ],
  },

  // STEP 4-3b: Formazione Portale Grossista
  'step-4-3b': {
    min: 0,
    max: 1000,
    description: 'Formazione utilizzo portale grossista',
    items: [
      {
        id: 'formazione-portale',
        name: 'Formazione Portale Grossista',
        category: 'formazione',
        defaultAmount: 0,
        description: 'Generalmente inclusa nel contratto con il grossista',
      },
      {
        id: 'consulenza-procedure',
        name: 'Consulenza Procedure Operative',
        category: 'consulenza',
        defaultAmount: 500,
        description: 'Affiancamento iniziale gestione pratiche',
        isOptional: true,
      },
    ],
  },

  // STEP 5-1: CRM e Billing (aggiornato con riferimenti reali)
  'step-5-1': {
    min: 15000,
    max: 80000,
    description: 'Software CRM e Billing per gestione clienti e fatturazione',
    items: [
      {
        id: 'crm-billing-setup',
        name: 'Setup Iniziale CRM/Billing',
        category: 'software',
        defaultAmount: 10000,
        description: 'Configurazione, personalizzazione e import dati iniziali',
        notes: 'Fornitori comuni: Trilance, Akyra, Wattsdat, IFS Italia',
      },
      {
        id: 'crm-billing-licenza',
        name: 'Licenza CRM/Billing (primo anno)',
        category: 'software',
        defaultAmount: 24000,
        description: 'Canone annuale piattaforma gestionale (costo medio €2/cliente/mese)',
        notes: 'Basato su circa 1.000 clienti residenziali previsti',
      },
      {
        id: 'integrazione-grossista',
        name: 'Integrazione Portale Grossista',
        category: 'software',
        defaultAmount: 3000,
        description: 'Configurazione flussi dati con sistema del grossista',
      },
      {
        id: 'fatturazione-sdi',
        name: 'Integrazione SDI',
        category: 'software',
        defaultAmount: 500,
        description: 'Setup fatturazione elettronica verso Sistema di Interscambio',
      },
      {
        id: 'formazione-software',
        name: 'Formazione Utilizzo Software',
        category: 'formazione',
        defaultAmount: 2000,
        description: 'Training personale su CRM e fatturazione',
      },
    ],
  },

  // STEP 5-2: Struttura Commerciale e Contact Center
  'step-5-2': {
    min: 5000,
    max: 20000,
    description: 'Setup struttura commerciale e customer care',
    items: [
      {
        id: 'contact-center-setup',
        name: 'Setup Contact Center',
        category: 'infrastruttura',
        defaultAmount: 5000,
        description: 'Attivazione linee, software ticketing, procedure operative',
      },
      {
        id: 'numero-verde',
        name: 'Numero Verde (annuale)',
        category: 'infrastruttura',
        defaultAmount: 1500,
        description: 'Canone e traffico numero verde clienti (obbligatorio ARERA)',
      },
      {
        id: 'materiale-commerciale',
        name: 'Materiale Commerciale',
        category: 'altro',
        defaultAmount: 3000,
        description: 'Brochure, contratti, depliant, materiale punto vendita',
      },
      {
        id: 'formazione-customer-care',
        name: 'Formazione Operatori',
        category: 'formazione',
        defaultAmount: 1500,
        description: 'Training gestione chiamate, reclami e procedure ARERA',
      },
      {
        id: 'procedure-reclami',
        name: 'Procedure Gestione Reclami',
        category: 'consulenza',
        defaultAmount: 1200,
        description: 'Redazione procedure conformi ARERA (SLA 30 giorni)',
      },
    ],
  },

  // STEP 6-1: Garanzie e Assicurazioni
  'step-6-1': {
    min: 2000,
    max: 8000,
    description: 'Polizze assicurative e garanzie',
    items: [
      {
        id: 'rc-professionale',
        name: 'RC Professionale (annuale)',
        category: 'garanzie',
        defaultAmount: 2500,
        description: 'Responsabilità civile professionale obbligatoria',
      },
      {
        id: 'polizza-cyber',
        name: 'Polizza Cyber Risk',
        category: 'garanzie',
        defaultAmount: 1200,
        description: 'Copertura rischi informatici e data breach',
        isOptional: true,
      },
      {
        id: 'consulenza-assicurativa',
        name: 'Consulenza Assicurativa',
        category: 'consulenza',
        defaultAmount: 500,
        description: 'Analisi rischi e selezione polizze',
        isOptional: true,
      },
    ],
  },

  // STEP 6-2: GDPR e Privacy
  'step-6-2': {
    min: 2000,
    max: 8000,
    description: 'Adeguamento GDPR e privacy clienti',
    items: [
      {
        id: 'consulenza-gdpr',
        name: 'Consulenza GDPR',
        category: 'consulenza',
        defaultAmount: 3000,
        description: 'Adeguamento completo normativa privacy',
      },
      {
        id: 'dpo-esterno',
        name: 'DPO Esterno (annuale)',
        category: 'consulenza',
        defaultAmount: 2000,
        description: 'Data Protection Officer in outsourcing',
        isOptional: true,
        notes: 'Obbligatorio se trattamento dati su larga scala',
      },
      {
        id: 'software-privacy',
        name: 'Software Gestione Privacy',
        category: 'software',
        defaultAmount: 800,
        description: 'Registro trattamenti, gestione consensi',
        isOptional: true,
      },
    ],
  },

  // STEP 7-1: Pre-lancio e test
  'step-7-1': {
    min: 2000,
    max: 10000,
    description: 'Test operativi e simulazioni pre-lancio',
    items: [
      {
        id: 'test-sistemi',
        name: 'Test Integrazione Sistemi',
        category: 'software',
        defaultAmount: 3000,
        description: 'Verifica flussi dati, integrazioni e processi',
      },
      {
        id: 'simulazione-fatturazione',
        name: 'Simulazione Ciclo Fatturazione',
        category: 'consulenza',
        defaultAmount: 1500,
        description: 'Test completo processo billing end-to-end',
      },
      {
        id: 'consulenza-go-live',
        name: 'Consulenza Go-Live',
        category: 'consulenza',
        defaultAmount: 2500,
        description: 'Affiancamento nella fase di avvio operativo',
        isOptional: true,
      },
    ],
  },
};

// Funzione helper per calcolare il totale dei costi di uno step
export const calculateStepTotal = (stepId: string, customAmounts?: Record<string, number>): { min: number; max: number; items: number } => {
  const stepData = stepCostsData[stepId];
  if (!stepData) {
    return { min: 0, max: 0, items: 0 };
  }

  let total = 0;
  let itemCount = 0;

  stepData.items.forEach(item => {
    const amount = customAmounts?.[item.id] ?? item.defaultAmount;
    total += amount;
    itemCount++;
  });

  return {
    min: stepData.min,
    max: stepData.max,
    items: itemCount,
  };
};
