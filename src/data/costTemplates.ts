export interface CostTemplateItem {
  name: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  cost_type: 'commercial' | 'structural' | 'direct' | 'indirect';
  is_recurring: boolean;
  recurrence_period?: string;
}

export interface RevenueTemplateItem {
  name: string;
  description: string;
  amount: number;
  quantity: number;
  unit: string;
  revenue_type: string;
  status: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  costs: CostTemplateItem[];
  revenues: RevenueTemplateItem[];
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'reseller-residenziale',
    name: 'Reseller Utenze Residenziali',
    description: 'Avvio attività reseller focalizzata su clienti domestici (luce e gas)',
    icon: 'Home',
    color: 'hsl(200, 80%, 50%)',
    costs: [
      // Costi Strutturali - Setup Iniziale
      { name: 'Costituzione Società', description: 'Notaio, Camera di Commercio, pratiche', amount: 3500, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Consulenza Legale Iniziale', description: 'Contratti tipo, privacy, condizioni generali', amount: 4000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false },
      { name: 'Consulenza Regolatoria ARERA', description: 'Iscrizione EVE, compliance normativa, procedure', amount: 8000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false },
      { name: 'Garanzie Bancarie', description: 'Fideiussioni per grossisti energia', amount: 25000, quantity: 1, unit: 'garanzia', cost_type: 'structural', is_recurring: false },
      { name: 'Assicurazione RC Professionale', description: 'Polizza annuale', amount: 2500, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Software e Sistemi SII
      { name: 'Software Gestione SII', description: 'Piattaforma per flussi SII (Sistema Informativo Integrato) con distributori', amount: 500, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Software Switching', description: 'Gestione pratiche switching, volture, subentri', amount: 350, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Integrazione SII - Setup', description: 'Configurazione iniziale flussi XML con Acquirente Unico', amount: 5000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false },
      { name: 'Licenza Software CRM', description: 'Gestione clienti e contratti', amount: 150, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Piattaforma Billing', description: 'Software fatturazione e gestione bollette', amount: 300, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Sito Web e Portale Clienti', description: 'Sviluppo e hosting annuale', amount: 5000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false },
      
      // Costi Commerciali - Acquisizione Clienti
      { name: 'Rete Agenti (Provvigioni)', description: 'Commissione per contratto residenziale acquisito', amount: 80, quantity: 100, unit: 'contratto', cost_type: 'commercial', is_recurring: false },
      { name: 'Marketing Digitale', description: 'Campagne Google/Social Ads', amount: 1500, quantity: 12, unit: 'mese', cost_type: 'commercial', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Materiale Promozionale', description: 'Brochure, volantini, gadget', amount: 2000, quantity: 1, unit: 'lotto', cost_type: 'commercial', is_recurring: false },
      { name: 'Formazione Agenti', description: 'Corsi e materiale formativo', amount: 1500, quantity: 2, unit: 'sessione', cost_type: 'commercial', is_recurring: false },
      
      // Costi Indiretti - Operatività
      { name: 'Personale Back-Office', description: 'Gestione contratti, pratiche SII e assistenza', amount: 2200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Operatore Pratiche SII', description: 'Gestione flussi switching e rapporti distributori', amount: 1800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Affitto Ufficio', description: 'Sede operativa', amount: 800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Utenze e Servizi Ufficio', description: 'Telefono, internet, elettricità', amount: 200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Commercialista', description: 'Gestione contabile e fiscale', amount: 400, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Diretti - Energia
      { name: 'Costo Energia Acquistata (Luce)', description: 'Acquisto energia da grossista - stima mensile', amount: 15000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Costo Gas Acquistato', description: 'Acquisto gas da grossista - stima mensile', amount: 12000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Oneri di Sistema', description: 'Quote oneri da versare', amount: 3000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Corrispettivi Distributori', description: 'Costi trasporto e distribuzione', amount: 4000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Regolatori e Compliance
      { name: 'Contributo Annuale ARERA', description: 'Fee operatori settore energetico', amount: 1500, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Audit Qualità Commerciale ARERA', description: 'Verifica conformità standard qualità', amount: 2000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Consulenza Aggiornamento Normativo', description: 'Monitoraggio delibere e adeguamenti', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Fondo Rischio Sanzioni', description: 'Accantonamento per eventuali sanzioni ARERA', amount: 2000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Costi Finanziari
      { name: 'Interessi Capitale Circolante', description: 'Costo finanziario anticipo acquisto energia', amount: 500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Rinnovo Fideiussioni', description: 'Costi annuali mantenimento garanzie bancarie', amount: 1500, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Fondo Svalutazione Crediti', description: 'Accantonamento per morosità clienti (3%)', amount: 400, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Costi Recupero Crediti', description: 'Solleciti, diffide, procedure legali', amount: 150, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi IT/Sicurezza
      { name: 'Hosting e Manutenzione Sistemi', description: 'Server, cloud, aggiornamenti', amount: 200, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Cybersecurity', description: 'Antivirus, firewall, monitoraggio sicurezza', amount: 100, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Backup e Disaster Recovery', description: 'Backup automatici e piano continuità', amount: 80, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Manutenzione Software Annuale', description: 'Aggiornamenti CRM, billing, SII', amount: 3000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Costi Operativi Aggiuntivi
      { name: 'Numero Verde / Contact Center', description: 'Servizio assistenza clienti obbligatorio ARERA', amount: 400, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Gestione Reclami e Conciliazioni', description: 'Procedure ADR e conciliazione paritetica', amount: 150, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Spese Postali', description: 'Invio bollette cartacee e comunicazioni', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Software Firma Elettronica', description: 'Firma OTP contratti digitali', amount: 50, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi HR/Personale
      { name: 'Consulente del Lavoro', description: 'Gestione buste paga e adempimenti', amount: 150, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Formazione Obbligatoria Sicurezza', description: 'Corsi D.Lgs 81/08', amount: 500, quantity: 1, unit: 'anno', cost_type: 'indirect', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Accantonamento TFR', description: 'Quota mensile TFR dipendenti', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Una Tantum Aggiuntivi
      { name: 'Deposito Cauzionale Ufficio', description: 'Cauzione affitto sede', amount: 2400, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Arredamento Ufficio', description: 'Scrivanie, sedie, arredi', amount: 3000, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Hardware IT', description: 'PC, stampanti, telefoni, router', amount: 4000, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
    ],
    revenues: [
      { name: 'Margine Energia Elettrica', description: 'Margine su vendita energia residenziale (500 clienti)', amount: 8, quantity: 500, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Margine Gas Naturale', description: 'Margine su vendita gas residenziale (300 clienti)', amount: 12, quantity: 300, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Fee Attivazione Nuovi Contratti', description: 'Contributo attivazione clienti', amount: 30, quantity: 100, unit: 'contratto', revenue_type: 'one_time', status: 'expected' },
    ],
  },
  {
    id: 'reseller-business',
    name: 'Reseller Utenze Business',
    description: 'Avvio attività reseller focalizzata su clienti aziendali (PMI e partite IVA)',
    icon: 'Building2',
    color: 'hsl(142, 71%, 45%)',
    costs: [
      // Costi Strutturali - Setup Iniziale
      { name: 'Costituzione Società', description: 'Notaio, Camera di Commercio, pratiche', amount: 4000, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Consulenza Legale Specializzata', description: 'Contratti B2B, SLA, condizioni commerciali', amount: 6000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false },
      { name: 'Consulenza Regolatoria ARERA', description: 'Iscrizione EVE, compliance, obblighi informativi', amount: 10000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false },
      { name: 'Garanzie Bancarie', description: 'Fideiussioni per grossisti (volumi maggiori)', amount: 50000, quantity: 1, unit: 'garanzia', cost_type: 'structural', is_recurring: false },
      { name: 'Assicurazione RC Professionale', description: 'Polizza annuale maggiorata', amount: 4000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Software e Sistemi SII
      { name: 'Software Gestione SII Enterprise', description: 'Piattaforma SII per volumi business con API avanzate', amount: 800, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Software Switching Avanzato', description: 'Gestione massiva pratiche switching B2B', amount: 500, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Integrazione SII - Setup Enterprise', description: 'Configurazione flussi XML multi-distributore', amount: 8000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false },
      { name: 'Connessione Portale Distributori', description: 'Setup accessi e certificati per ogni distributore locale', amount: 500, quantity: 10, unit: 'distributore', cost_type: 'structural', is_recurring: false },
      { name: 'Licenza Software CRM Avanzato', description: 'CRM con gestione offerte B2B', amount: 250, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Piattaforma Billing Enterprise', description: 'Fatturazione con gestione grandi volumi', amount: 500, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Sito Web B2B e Area Riservata', description: 'Portale clienti business', amount: 8000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false },
      
      // Costi Commerciali - Acquisizione Clienti Business
      { name: 'Rete Agenti B2B (Provvigioni)', description: 'Commissione per contratto business acquisito', amount: 200, quantity: 50, unit: 'contratto', cost_type: 'commercial', is_recurring: false },
      { name: 'Key Account Manager', description: 'Stipendio + incentivi', amount: 3500, quantity: 12, unit: 'mese', cost_type: 'commercial', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Marketing B2B', description: 'LinkedIn Ads, eventi, fiere', amount: 2500, quantity: 12, unit: 'mese', cost_type: 'commercial', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Materiale Commerciale Premium', description: 'Presentazioni, case study, brochure', amount: 3000, quantity: 1, unit: 'lotto', cost_type: 'commercial', is_recurring: false },
      
      // Costi Indiretti - Operatività
      { name: 'Team Back-Office', description: '2 risorse gestione contratti business', amount: 4500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Specialista SII/Switching', description: 'Gestione pratiche e rapporti distributori', amount: 2500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Affitto Ufficio Rappresentativo', description: 'Sede in zona business', amount: 1500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Utenze e Servizi Ufficio', description: 'Telefono, internet, elettricità', amount: 350, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Commercialista e Consulenze', description: 'Gestione contabile avanzata', amount: 600, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Diretti - Energia (volumi business)
      { name: 'Costo Energia Acquistata (Luce)', description: 'Acquisto energia da grossista - volumi business', amount: 40000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Costo Gas Acquistato', description: 'Acquisto gas da grossista - volumi business', amount: 30000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Oneri di Sistema', description: 'Quote oneri da versare', amount: 8000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Corrispettivi Distributori', description: 'Costi trasporto e distribuzione', amount: 10000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Regolatori e Compliance
      { name: 'Contributo Annuale ARERA', description: 'Fee operatori settore energetico', amount: 2500, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Audit Qualità Commerciale ARERA', description: 'Verifica conformità standard qualità B2B', amount: 3000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Consulenza Aggiornamento Normativo', description: 'Monitoraggio delibere e adeguamenti', amount: 500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Fondo Rischio Sanzioni', description: 'Accantonamento per eventuali sanzioni ARERA', amount: 5000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Costi Finanziari
      { name: 'Interessi Capitale Circolante', description: 'Costo finanziario anticipo acquisto energia', amount: 1500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Rinnovo Fideiussioni', description: 'Costi annuali mantenimento garanzie bancarie', amount: 3000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Fondo Svalutazione Crediti', description: 'Accantonamento per morosità clienti (2%)', amount: 800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Costi Recupero Crediti', description: 'Solleciti, diffide, procedure legali', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi IT/Sicurezza
      { name: 'Hosting e Manutenzione Sistemi', description: 'Server, cloud, aggiornamenti enterprise', amount: 400, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Cybersecurity Avanzata', description: 'Protezione dati aziendali sensibili', amount: 250, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Backup e Disaster Recovery', description: 'Backup automatici e piano continuità', amount: 150, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Manutenzione Software Annuale', description: 'Aggiornamenti CRM, billing, SII enterprise', amount: 6000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Costi Operativi Aggiuntivi
      { name: 'Numero Verde / Contact Center', description: 'Servizio assistenza clienti obbligatorio ARERA', amount: 600, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Gestione Reclami e Conciliazioni', description: 'Procedure ADR e conciliazione paritetica', amount: 250, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Spese Postali e Corriere', description: 'Invio fatture e documentazione business', amount: 200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Software Firma Elettronica Qualificata', description: 'Firma digitale contratti B2B', amount: 100, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi HR/Personale
      { name: 'Consulente del Lavoro', description: 'Gestione buste paga e adempimenti', amount: 250, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Formazione Obbligatoria Sicurezza', description: 'Corsi D.Lgs 81/08', amount: 800, quantity: 1, unit: 'anno', cost_type: 'indirect', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Accantonamento TFR', description: 'Quota mensile TFR dipendenti', amount: 600, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Una Tantum Aggiuntivi
      { name: 'Deposito Cauzionale Ufficio', description: 'Cauzione affitto sede business', amount: 4500, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Arredamento Ufficio Rappresentativo', description: 'Arredi professionali, sala riunioni', amount: 8000, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Hardware IT', description: 'PC, stampanti, telefoni, networking', amount: 6000, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
    ],
    revenues: [
      { name: 'Margine Energia Elettrica Business', description: 'Margine su vendita energia (100 clienti PMI)', amount: 150, quantity: 100, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Margine Gas Naturale Business', description: 'Margine su vendita gas (60 clienti PMI)', amount: 200, quantity: 60, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Fee Attivazione Nuovi Contratti', description: 'Contributo attivazione clienti business', amount: 100, quantity: 50, unit: 'contratto', revenue_type: 'one_time', status: 'expected' },
      { name: 'Servizi Consulenza Energetica', description: 'Analisi consumi e ottimizzazione', amount: 500, quantity: 20, unit: 'consulenza', revenue_type: 'one_time', status: 'expected' },
    ],
  },
  {
    id: 'reseller-misto',
    name: 'Reseller Misto (Residenziale + Business)',
    description: 'Avvio attività reseller completa per entrambi i segmenti di mercato',
    icon: 'Zap',
    color: 'hsl(45, 93%, 47%)',
    costs: [
      // Costi Strutturali - Setup Completo
      { name: 'Costituzione Società (SRL)', description: 'Notaio, Camera di Commercio, pratiche complete', amount: 4500, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Consulenza Legale Completa', description: 'Contratti B2C, B2B, GDPR, condizioni', amount: 8000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false },
      { name: 'Consulenza Regolatoria ARERA', description: 'Iscrizione EVE, compliance completa, audit', amount: 12000, quantity: 1, unit: 'consulenza', cost_type: 'structural', is_recurring: false },
      { name: 'Garanzie Bancarie', description: 'Fideiussioni per grossisti - importo combinato', amount: 60000, quantity: 1, unit: 'garanzia', cost_type: 'structural', is_recurring: false },
      { name: 'Assicurazione RC Professionale', description: 'Polizza annuale completa', amount: 5000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Software e Sistemi SII Completi
      { name: 'Piattaforma SII Completa', description: 'Gestione flussi SII multi-segmento con AU', amount: 900, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Software Switching Multi-Segmento', description: 'Gestione switching B2C e B2B integrata', amount: 600, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Integrazione SII Completa', description: 'Setup flussi XML, test, certificazione AU', amount: 10000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false },
      { name: 'Accreditamento Distributori', description: 'Setup accessi portali distributori locali', amount: 500, quantity: 15, unit: 'distributore', cost_type: 'structural', is_recurring: false },
      { name: 'Formazione Operatori SII', description: 'Training su flussi e procedure Acquirente Unico', amount: 3000, quantity: 1, unit: 'corso', cost_type: 'structural', is_recurring: false },
      { name: 'Licenza Software CRM Completo', description: 'CRM per gestione B2C e B2B', amount: 350, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Piattaforma Billing Completa', description: 'Fatturazione multi-segmento', amount: 600, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Sito Web Completo', description: 'Portale clienti residenziali e business', amount: 10000, quantity: 1, unit: 'progetto', cost_type: 'structural', is_recurring: false },
      
      // Costi Commerciali
      { name: 'Rete Agenti Residenziale', description: 'Provvigioni contratti domestici', amount: 80, quantity: 150, unit: 'contratto', cost_type: 'commercial', is_recurring: false },
      { name: 'Rete Agenti Business', description: 'Provvigioni contratti aziendali', amount: 200, quantity: 30, unit: 'contratto', cost_type: 'commercial', is_recurring: false },
      { name: 'Marketing Omnichannel', description: 'Campagne digitali e tradizionali', amount: 3000, quantity: 12, unit: 'mese', cost_type: 'commercial', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Materiale Promozionale Completo', description: 'Brochure B2C e B2B, gadget', amount: 4000, quantity: 1, unit: 'lotto', cost_type: 'commercial', is_recurring: false },
      { name: 'Formazione Rete Vendita', description: 'Training agenti multi-segmento', amount: 3000, quantity: 2, unit: 'sessione', cost_type: 'commercial', is_recurring: false },
      
      // Costi Indiretti
      { name: 'Team Operativo', description: '3 risorse back-office e customer care', amount: 6500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Team SII/Switching', description: '2 operatori gestione pratiche e distributori', amount: 4000, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Affitto Ufficio', description: 'Sede operativa adeguata', amount: 1200, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Utenze e Servizi', description: 'Telefono, internet, elettricità', amount: 300, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Commercialista', description: 'Gestione contabile e fiscale', amount: 500, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Diretti
      { name: 'Costo Energia Acquistata', description: 'Acquisto energia - volumi combinati', amount: 45000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Costo Gas Acquistato', description: 'Acquisto gas - volumi combinati', amount: 35000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Oneri di Sistema', description: 'Quote oneri da versare', amount: 10000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Corrispettivi Distributori', description: 'Costi trasporto e distribuzione', amount: 12000, quantity: 12, unit: 'mese', cost_type: 'direct', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Regolatori e Compliance
      { name: 'Contributo Annuale ARERA', description: 'Fee operatori settore energetico', amount: 3000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Audit Qualità Commerciale ARERA', description: 'Verifica conformità multi-segmento', amount: 4000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Consulenza Aggiornamento Normativo', description: 'Monitoraggio delibere e adeguamenti', amount: 600, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Fondo Rischio Sanzioni', description: 'Accantonamento per eventuali sanzioni ARERA', amount: 6000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Costi Finanziari
      { name: 'Interessi Capitale Circolante', description: 'Costo finanziario anticipo acquisto energia', amount: 1800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Rinnovo Fideiussioni', description: 'Costi annuali mantenimento garanzie bancarie', amount: 4000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Fondo Svalutazione Crediti', description: 'Accantonamento per morosità clienti (2.5%)', amount: 1000, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Costi Recupero Crediti', description: 'Solleciti, diffide, procedure legali', amount: 400, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi IT/Sicurezza
      { name: 'Hosting e Manutenzione Sistemi', description: 'Server, cloud, aggiornamenti', amount: 500, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Cybersecurity', description: 'Protezione dati e sistemi', amount: 300, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Backup e Disaster Recovery', description: 'Backup automatici e piano continuità', amount: 200, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Manutenzione Software Annuale', description: 'Aggiornamenti CRM, billing, SII', amount: 8000, quantity: 1, unit: 'anno', cost_type: 'structural', is_recurring: true, recurrence_period: 'yearly' },
      
      // Costi Operativi Aggiuntivi
      { name: 'Numero Verde / Contact Center', description: 'Servizio assistenza clienti obbligatorio ARERA', amount: 800, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Gestione Reclami e Conciliazioni', description: 'Procedure ADR e conciliazione paritetica', amount: 350, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Spese Postali', description: 'Invio bollette e comunicazioni', amount: 400, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Software Firma Elettronica', description: 'Firma OTP e qualificata contratti', amount: 120, quantity: 12, unit: 'mese', cost_type: 'structural', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi HR/Personale
      { name: 'Consulente del Lavoro', description: 'Gestione buste paga e adempimenti', amount: 350, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      { name: 'Formazione Obbligatoria Sicurezza', description: 'Corsi D.Lgs 81/08', amount: 1200, quantity: 1, unit: 'anno', cost_type: 'indirect', is_recurring: true, recurrence_period: 'yearly' },
      { name: 'Accantonamento TFR', description: 'Quota mensile TFR dipendenti', amount: 900, quantity: 12, unit: 'mese', cost_type: 'indirect', is_recurring: true, recurrence_period: 'monthly' },
      
      // Costi Una Tantum Aggiuntivi
      { name: 'Deposito Cauzionale Ufficio', description: 'Cauzione affitto sede', amount: 3600, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Arredamento Ufficio', description: 'Scrivanie, sedie, sala riunioni', amount: 6000, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
      { name: 'Hardware IT', description: 'PC, stampanti, telefoni, networking', amount: 5000, quantity: 1, unit: 'forfait', cost_type: 'structural', is_recurring: false },
    ],
    revenues: [
      { name: 'Margine Energia Residenziale', description: 'Margine luce domestica (400 clienti)', amount: 8, quantity: 400, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Margine Gas Residenziale', description: 'Margine gas domestico (250 clienti)', amount: 12, quantity: 250, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Margine Energia Business', description: 'Margine luce PMI (80 clienti)', amount: 150, quantity: 80, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Margine Gas Business', description: 'Margine gas PMI (50 clienti)', amount: 200, quantity: 50, unit: 'cliente/mese', revenue_type: 'recurring', status: 'expected' },
      { name: 'Fee Attivazione', description: 'Contributi attivazione nuovi clienti', amount: 50, quantity: 180, unit: 'contratto', revenue_type: 'one_time', status: 'expected' },
    ],
  },
];
