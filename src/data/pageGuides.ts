export interface PageGuideData {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
}

export const pageGuides: Record<string, PageGuideData> = {
  overview: {
    title: 'Guida – Scheda Progetto',
    description: 'Questa pagina contiene tutte le informazioni anagrafiche e operative del tuo progetto di vendita energia. Qui puoi configurare i dati fondamentali come il tipo di commodity, le date chiave, le licenze e il grossista partner.',
    steps: [
      'Compila i dati del progetto: nome, descrizione, tipo di commodity (luce, gas o dual).',
      'Inserisci le date di licenza EVE/EVG e la data di Go-Live prevista.',
      'Configura il codice operatore ARERA e il grossista partner.',
      'Definisci il mercato target (residenziale, business, misto) e le regioni operative.',
    ],
    tips: [
      'Più dati inserisci, più accurati saranno i report e le verifiche Pre-Launch.',
      'Il tipo di commodity determina quali step del processo vengono mostrati.',
    ],
  },
  dashboard: {
    title: 'Guida – Dashboard',
    description: 'La Dashboard offre una visione d\'insieme sull\'avanzamento del progetto. I grafici radiali mostrano il completamento di ciascuna fase del processo. Puoi cliccare su ogni grafico per navigare direttamente alla fase corrispondente.',
    steps: [
      'Controlla la percentuale complessiva di avanzamento.',
      'Clicca su un grafico radiale di fase per andare direttamente al dettaglio nel Processo.',
      'Verifica le statistiche per fase (step completati, in corso, da iniziare).',
    ],
    tips: [
      'La Dashboard si aggiorna in tempo reale quando completi gli step nel Processo.',
    ],
  },
  process: {
    title: 'Guida – Processo',
    description: 'Il Processo è il cuore operativo: traccia tutti gli adempimenti necessari per avviare un\'attività di vendita di energia elettrica e/o gas. Ogni step rappresenta un adempimento specifico con la sua checklist, documenti e costi associati.',
    steps: [
      'Seleziona una fase dalla barra laterale per vedere gli step relativi.',
      'Clicca su uno step per aprire il dettaglio: checklist, note, documenti, date e costi.',
      'Spunta gli item della checklist man mano che li completi.',
      'Quando tutti gli item sono completati, lo step viene marcato come concluso.',
    ],
    tips: [
      'Puoi assegnare date di inizio e fine pianificate per ogni step, che appariranno nella Timeline.',
      'Usa le note per annotare informazioni importanti su ogni adempimento.',
      'I costi inseriti negli step contribuiscono al budget complessivo nella sezione Finanza.',
    ],
  },
  gantt: {
    title: 'Guida – Timeline (Gantt)',
    description: 'La Timeline visualizza la pianificazione temporale di tutti gli step del processo in un diagramma di Gantt. Mostra date pianificate, date effettive e la data di Go-Live.',
    steps: [
      'Verifica la distribuzione temporale degli step sulle diverse fasi.',
      'Controlla eventuali sovrapposizioni o ritardi rispetto alle date pianificate.',
      'Usa le date inserite negli step del Processo per popolare la timeline.',
    ],
    tips: [
      'Definisci la data di inizio progetto e la data Go-Live nella Scheda Progetto per avere i riferimenti temporali.',
    ],
  },
  deadlines: {
    title: 'Guida – Scadenze Regolatorie',
    description: 'Lo scadenzario normativo centralizzato monitora tutti gli adempimenti obbligatori del settore: rinnovi EVE/EVG, dichiarazioni accise ADM, contributi CSEA, comunicazioni ARERA. Ricevi notifiche automatiche per le scadenze imminenti.',
    steps: [
      'Consulta il calendario delle scadenze ordinate per data.',
      'Aggiungi nuove scadenze personalizzate per il tuo progetto.',
      'Segna come completate le scadenze che hai adempiuto.',
    ],
    tips: [
      'Le scadenze ricorrenti vengono rigenerate automaticamente dopo il completamento.',
      'Configura i promemoria nelle Impostazioni per ricevere notifiche con anticipo personalizzato.',
    ],
  },
  'step-docs': {
    title: 'Guida – Documenti Step',
    description: 'Questa sezione permette di associare documenti specifici ai singoli step del processo. Puoi collegare documenti già caricati nella sezione Documenti ai rispettivi adempimenti.',
    steps: [
      'Seleziona lo step a cui vuoi associare un documento.',
      'Carica o collega un documento esistente.',
      'Verifica che ogni step critico abbia la documentazione necessaria.',
    ],
  },
  documents: {
    title: 'Guida – Gestione Documenti',
    description: 'L\'archivio documentale centralizzato permette di caricare, categorizzare e gestire tutti i documenti del progetto. Supporta il versioning e la condivisione tra membri del team.',
    steps: [
      'Carica documenti tramite il pulsante "Carica Documento".',
      'Organizza i documenti per categoria (contratti, licenze, comunicazioni, ecc.).',
      'Usa la ricerca per trovare rapidamente un documento specifico.',
      'Scarica o visualizza l\'anteprima dei documenti caricati.',
    ],
    tips: [
      'I documenti caricati possono essere collegati ai singoli step del Processo.',
      'Il sistema tiene traccia delle versioni: caricando una nuova versione, la precedente resta disponibile nello storico.',
    ],
  },
  team: {
    title: 'Guida – Gestione Team',
    description: 'Gestisci il team di progetto: invita collaboratori, assegna ruoli (owner, admin, member, viewer) e monitora le attività. Ogni membro può lavorare sugli step assegnati.',
    steps: [
      'Invita nuovi membri inserendo il loro indirizzo email.',
      'Assegna il ruolo appropriato in base alle responsabilità.',
      'Verifica lo stato degli inviti (pendenti, accettati).',
    ],
    tips: [
      'Gli admin possono gestire il team e i documenti. I viewer hanno accesso in sola lettura.',
      'Puoi assegnare specifici step del processo ai membri del team.',
    ],
  },
  consultants: {
    title: 'Guida – Gestione Consulenti',
    description: 'Traccia le attività e i costi dei consulenti esterni coinvolti nel progetto: commercialista, avvocato, consulente ARERA, tecnico, ecc. Monitora lo stato di avanzamento delle attività delegate.',
    steps: [
      'Aggiungi le attività dei consulenti specificando tipo, categoria e costi.',
      'Monitora lo stato di completamento di ogni attività.',
      'Tieni traccia dei costi stimati vs. effettivi.',
    ],
    tips: [
      'I costi dei consulenti vengono inclusi nel riepilogo finanziario del progetto.',
      'Usa le priorità per organizzare le attività più urgenti.',
    ],
  },
  financials: {
    title: 'Guida – Dashboard Finanziaria',
    description: 'La Dashboard Finanziaria offre una visione completa della situazione economica del progetto. I margini (Lordo, Contribuzione, Netto) sono calcolati correttamente sull\'imponibile, al netto dell\'IVA. I costi di avvio degli step del processo sono integrati nel cash flow, distribuiti nelle mensilità corrette.',
    steps: [
      'Configura le ipotesi operative nella tab "Ipotesi": parametri simulazione, canali vendita e costi grossista.',
      'Analizza i KPI nella "Panoramica": fatturato, margini sull\'imponibile, break-even.',
      'Inserisci costi strutturali e commerciali nella tab "Costi".',
      'Configura la simulazione ricavi con contratti mensili e parametri tariffari.',
      'Analizza il cash flow mensile nella tab "Liquidità" (include investimenti iniziali dagli step).',
      'Usa la tab "Margini" per l\'analisi dettagliata e il simulatore What-If.',
      'Esporta i report finanziari in PDF o Excel.',
    ],
    tips: [
      'I margini sono calcolati sull\'imponibile (fatturato al netto IVA), non sul fatturato lordo.',
      'I costi di ogni step del processo sono distribuiti nel cash flow in base alla fase (costituzione, licenze, ecc.).',
      'Configura i canali di vendita per una stima accurata dei costi commerciali.',
      'I parametri della simulazione vengono usati anche per pre-compilare il plico contrattuale.',
    ],
  },
  'contract-package': {
    title: 'Guida – Plico Contrattuale',
    description: 'Questa sezione genera un pacchetto documentale facsimile composto da 6 PDF in formato ZIP, conformi alla struttura prevista dalla normativa ARERA per la vendita di energia elettrica nel mercato libero. I documenti vengono pre-compilati con i dati del progetto e della simulazione finanziaria.',
    steps: [
      'Carica il logo del brand per personalizzare tutti i documenti.',
      'Clicca su "Genera Plico Contrattuale" per aprire il pannello di anteprima.',
      'Personalizza i dati del cliente tipo (anagrafica, consumi, POD) nel pannello.',
      'Scarica il pacchetto ZIP con i 6 documenti PDF.',
    ],
    tips: [
      'Il plico è un facsimile dimostrativo: per i documenti definitivi rivolgiti a un consulente legale.',
      'I parametri economici vengono pre-compilati dalla simulazione finanziaria configurata nella sezione Finanza.',
      'Include: PDA, Condizioni Particolari, Condizioni Generali, Scheda Sintetica ARERA, Punti di Prelievo e Fattura Tipo Bolletta 2.0.',
    ],
  },
  'business-plan': {
    title: 'Guida – Business Plan',
    description: 'Redigi il Business Plan strutturato del tuo progetto. Il documento è organizzato in sezioni standard: Executive Summary, Descrizione Azienda, Prodotti/Servizi, Analisi di Mercato, Strategia Marketing, Organizzazione e Piano Finanziario.',
    steps: [
      'Compila ogni sezione del Business Plan usando gli editor di testo.',
      'Usa il pulsante "Genera con AI" per ottenere bozze automatiche basate sui dati del progetto.',
      'Verifica la completezza del documento con la funzione di validazione.',
      'Esporta in PDF o DOCX per la condivisione.',
    ],
    tips: [
      'Più dati hai inserito nel progetto (finanza, team, processo), più accurata sarà la generazione AI.',
    ],
  },
  marketing: {
    title: 'Guida – Piano Marketing',
    description: 'Definisci la strategia di marketing per il lancio commerciale: mercato target, posizionamento competitivo, strategia di pricing, canali di comunicazione, acquisizione clienti e allocazione budget.',
    steps: [
      'Compila le sezioni del piano marketing.',
      'Usa la generazione AI per ottenere suggerimenti basati sul tuo progetto.',
      'Valida il piano con la funzione di verifica completezza.',
      'Esporta in PDF o DOCX.',
    ],
  },
  prelaunch: {
    title: 'Guida – Pre-Launch Checklist',
    description: 'Questa pagina verifica che tutti i prerequisiti per il Go-Live siano soddisfatti. La checklist è organizzata per categoria (legale, amministrativo, tecnico, operativo, commerciale) e severità (critico, importante, consigliato). Include anche la generazione del plico contrattuale facsimile.',
    steps: [
      'Verifica lo stato dei requisiti critici: devono essere tutti soddisfatti prima del lancio.',
      'Completa i check manuali (CRM, call center, listini, formazione) spuntando le caselle.',
      'Carica il logo del brand per personalizzare i documenti contrattuali.',
      'Genera il plico contrattuale facsimile per avere un\'anteprima della documentazione.',
    ],
    tips: [
      'I requisiti critici derivano automaticamente dallo stato degli step nel Processo.',
      'Il plico contrattuale è un facsimile dimostrativo: consulta un legale per i documenti definitivi.',
    ],
  },
  faq: {
    title: 'Guida – FAQ e Centro Supporto',
    description: 'Il Centro Supporto contiene le risposte alle domande più frequenti, organizzate per categoria. Include anche una guida interattiva in 6 step che illustra il percorso completo dal setup del progetto al Go-Live.',
    steps: [
      'Cerca una domanda specifica usando la barra di ricerca.',
      'Naviga le categorie per trovare le informazioni che ti servono.',
      'Segui la guida interattiva per un percorso guidato attraverso l\'applicazione.',
    ],
  },
  settings: {
    title: 'Guida – Impostazioni',
    description: 'Gestisci le preferenze di notifica e le impostazioni dell\'applicazione. Puoi anche riavviare il tutorial introduttivo.',
    steps: [
      'Configura le preferenze di notifica (scadenze, completamento step, aggiornamenti team).',
      'Riavvia il tutorial introduttivo se necessario.',
    ],
  },
  profile: {
    title: 'Guida – Profilo Utente',
    description: 'Gestisci le informazioni del tuo account: aggiorna il nome completo (visibile in tutto il sistema) e modifica la password di accesso.',
    steps: [
      'Aggiorna il tuo nome completo nel campo dedicato e clicca "Aggiorna Nome".',
      'Per cambiare la password, inserisci la nuova password (minimo 6 caratteri) e conferma.',
    ],
    tips: [
      'Il nome viene sincronizzato automaticamente su tutto il sistema.',
      'La password deve avere almeno 6 caratteri.',
    ],
  },
};
