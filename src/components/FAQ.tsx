import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  HelpCircle, Scale, Landmark, Server, FileText, Users, Shield, Store,
  BookOpen, Map, Search, ChevronRight, Building2, ListTodo, BarChart3,
  DollarSign, TrendingUp, Rocket, Briefcase, FolderOpen, Calendar,
  ArrowRight, CheckCircle2, Lightbulb, Sparkles, Target, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

import guideStep1 from '@/assets/guide-step1-project.jpg';
import guideStep2 from '@/assets/guide-step2-process.jpg';
import guideStep3 from '@/assets/guide-step3-team.jpg';
import guideStep4 from '@/assets/guide-step4-finance.jpg';
import guideStep5 from '@/assets/guide-step5-strategy.jpg';
import guideStep6 from '@/assets/guide-step6-launch.jpg';

// ─── Guide Data ──────────────────────────────────────────────
interface GuideStep {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  image: string;
  sidebarSection: string;
  description: string;
  actions: string[];
  tips: string[];
  duration: string;
}

const guideSteps: GuideStep[] = [
  {
    id: 'project-setup',
    number: 1,
    title: 'Crea e Configura il Progetto',
    subtitle: 'Scheda Progetto + Dashboard',
    image: guideStep1,
    sidebarSection: 'Progetto',
    duration: '15 min',
    description: 'Inizia creando il tuo progetto reseller di energia elettrica. Compila i dati della società, il mercato target (residenziale/microbusiness) e le regioni operative. Scegli il grossista con cui opererai e imposta le date pianificate.',
    actions: [
      'Clicca "Nuovo Progetto" o usa il Wizard guidato per la creazione rapida',
      'Compila la Scheda Progetto: nome società, mercato, regioni',
      'Inserisci i dettagli del grossista (nome, contatti, codice ARERA)',
      'Imposta le date chiave: licenza EVE, go-live pianificato',
      'Controlla la Dashboard per una panoramica immediata del progresso',
    ],
    tips: [
      'Il Wizard di avvio ti guida passo-passo nella configurazione iniziale',
      'I dati del progetto alimentano automaticamente Business Plan e Marketing',
      'Puoi sempre modificare i dettagli dalla Scheda Progetto',
    ],
  },
  {
    id: 'process-tracking',
    number: 2,
    title: 'Segui il Processo Burocratico',
    subtitle: 'Processo + Timeline + Scadenze',
    image: guideStep2,
    sidebarSection: 'Operativo',
    duration: '30 min',
    description: 'Il cuore dell\'app: un percorso guidato con tutti gli step burocratici necessari per avviare un reseller di energia. Ogni step ha checklist, documenti richiesti, costi stimati e date pianificabili.',
    actions: [
      'Vai in "Processo" per vedere tutti gli step organizzati per categoria',
      'Espandi ogni step per vedere la checklist dettagliata e spuntare le attività',
      'Usa "Timeline" per la vista Gantt con le date pianificate di ogni step',
      'Pianifica le date di inizio e fine per ogni fase nella sezione date',
      'Monitora le "Scadenze" regolatorie nel calendario dedicato',
      'Collega documenti agli step nella sezione "Documenti Step"',
    ],
    tips: [
      'I costi di ogni step sono configurabili e confluiscono nel totale finanziario',
      'Puoi aggiungere note e commenti a ogni step per il team',
      'Le scadenze regolatorie inviano promemoria automatici',
    ],
  },
  {
    id: 'team-collaboration',
    number: 3,
    title: 'Organizza il Team',
    subtitle: 'Team + Consulenti',
    image: guideStep3,
    sidebarSection: 'Team',
    duration: '10 min',
    description: 'Invita collaboratori al progetto e gestisci le attività dei consulenti esterni. Ogni membro ha un ruolo (Owner, Admin, Membro, Viewer) che determina i suoi permessi.',
    actions: [
      'In "Team" invita collaboratori via email assegnando un ruolo',
      'In "Consulenti" gestisci le 59+ attività predefinite per tipo di consulente',
      'Assegna attività a Commercialista, Legale, IT, Formazione, Operativo',
      'Monitora costi stimati vs effettivi per ogni consulente',
      'Imposta scadenze e priorità per le attività dei consulenti',
      'Esporta il report consulenti in PDF per la rendicontazione',
    ],
    tips: [
      'Il ruolo "Viewer" è perfetto per investitori che devono solo monitorare',
      'Le attività dei consulenti hanno costi predefiniti basati sul mercato',
      'Il team analytics mostra le performance e la velocità di completamento',
    ],
  },
  {
    id: 'financial-planning',
    number: 4,
    title: 'Pianifica le Finanze',
    subtitle: 'Finanza (Costi, Ricavi, Simulazione, Tasse)',
    image: guideStep4,
    sidebarSection: 'Strategia',
    duration: '45 min',
    description: 'La sezione finanziaria è il motore analitico dell\'app. Gestisci costi e ricavi, simula scenari di fatturato, analizza break-even e cash flow, configura canali di vendita e regime fiscale.',
    actions: [
      'Nella tab "Costi" inserisci tutti i costi strutturali e commerciali',
      'Nella tab "Ricavi" configura le fonti di ricavo (CCV, spread, servizi)',
      'In "Simulazione" imposta contratti mensili, consumi e parametri tariffari',
      'Configura i "Canali di Vendita" con commissioni e tassi di attivazione',
      'Analizza il "Break-Even" per sapere quando raggiungerai la redditività',
      'Monitora il "Cash Flow" per la gestione della liquidità',
      'Configura "Tasse e Oneri" (accise, IVA, oneri di sistema)',
      'Usa "What-If" per simulare scenari alternativi',
    ],
    tips: [
      'Il PUN può essere aggiornato automaticamente con i dati reali ARERA',
      'I template di costi pre-caricati velocizzano l\'inserimento iniziale',
      'L\'audit log tiene traccia di ogni modifica finanziaria',
    ],
  },
  {
    id: 'strategy-docs',
    number: 5,
    title: 'Genera i Documenti Strategici',
    subtitle: 'Business Plan + Marketing + Documenti',
    image: guideStep5,
    sidebarSection: 'Strategia',
    duration: '20 min',
    description: 'L\'app genera automaticamente Business Plan e Piano Marketing basandosi sui dati già inseriti. Ogni sezione è auto-generata e personalizzabile, con sistema di verifica integrato.',
    actions: [
      'In "Business Plan" clicca "Genera Tutto" per creare i contenuti',
      'Personalizza ogni sezione (Executive Summary, Analisi Mercato, ecc.)',
      'Controlla il pannello di Verifica per correggere criticità e omissioni',
      'Esporta in PDF o Word (.docx) con formattazione professionale',
      'In "Marketing" genera il piano basato su canali e target reali',
      'Carica documenti di supporto nella sezione "Documenti"',
    ],
    tips: [
      'La generazione automatica usa i dati reali del progetto (non testo generico)',
      'Il report di verifica può essere incluso nell\'export PDF/Word',
      'I documenti hanno versioning e condivisione con permessi',
    ],
  },
  {
    id: 'launch-prep',
    number: 6,
    title: 'Prepara il Lancio',
    subtitle: 'Pre-Launch Checklist',
    image: guideStep6,
    sidebarSection: 'Lancio',
    duration: '15 min',
    description: 'La checklist pre-lancio verifica che tutto sia pronto: licenze, software, team, contratti, compliance. È l\'ultimo controllo prima di andare operativi sul mercato.',
    actions: [
      'Verifica ogni elemento della checklist pre-lancio',
      'Controlla che la licenza EVE sia ottenuta',
      'Assicurati che software, team e processi siano operativi',
      'Completa gli ultimi adempimenti regolatori',
      'Conferma la prontezza con il grossista',
    ],
    tips: [
      'Non andare live finché la checklist non è al 100%',
      'Usa il report progetto per una fotografia completa dello stato',
      'Pianifica una data di go-live con almeno 2 settimane di margine',
    ],
  },
];

// ─── FAQ Data ──────────────────────────────────────────────
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  reseller: { label: 'Reseller vs UDD', icon: Store, color: 'text-primary', bg: 'bg-primary/10' },
  regulatory: { label: 'Regolatorio', icon: Scale, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  financial: { label: 'Finanziario', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  technical: { label: 'Tecnico', icon: Server, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  operational: { label: 'Operativo', icon: FileText, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  legal: { label: 'Legale', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  commercial: { label: 'Commerciale', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  app: { label: 'Uso dell\'App', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
};

const faqResellerData: FAQItem[] = [
  { id: 'reseller-definition', question: "Cos'è un reseller di energia elettrica e come si differenzia da un UDD?", answer: "Il RESELLER è un operatore che acquista energia elettrica da un grossista (Utente del Dispacciamento - UDD) e la rivende ai clienti finali. L'UDD invece è un operatore che ha rapporti diretti con Terna, GME e i distributori locali, gestendo dispacciamento e bilanciamento. Il reseller opera 'sotto l'ombrello' del grossista, senza accedere direttamente ai mercati all'ingrosso o al Sistema Informativo Integrato (SII).", category: 'reseller' },
  { id: 'reseller-advantages', question: "Quali sono i vantaggi di operare come reseller rispetto a diventare UDD?", answer: "I vantaggi principali sono: 1) Investimento iniziale molto più basso (no garanzie verso Terna/GME, da €500k+). 2) Complessità operativa ridotta (il grossista gestisce SII, switching, bilanciamento). 3) Tempi di avvio più rapidi (3-6 mesi vs 12-18 mesi). 4) Minori competenze tecniche richieste. 5) Focus su vendita e customer care. Svantaggi: margini potenzialmente inferiori e dipendenza dal grossista.", category: 'reseller' },
  { id: 'reseller-wholesaler-role', question: "Cosa gestisce il grossista per conto del reseller?", answer: "Il grossista/UDD gestisce per il reseller: 1) Acquisto energia sui mercati all'ingrosso (GME, contratti bilaterali). 2) Dispacciamento e bilanciamento con Terna. 3) Comunicazioni con il SII (switching, volture, subentri). 4) Rapporti con i distributori locali. 5) Gestione flussi tecnici (letture, misure). Il reseller si concentra su: acquisizione clienti, contratti, fatturazione, customer care e marketing.", category: 'reseller' },
  { id: 'reseller-sii-access', question: "Il reseller deve accreditarsi al SII (Sistema Informativo Integrato)?", answer: "NO. Il reseller NON si accredita direttamente al SII. È il grossista/UDD che gestisce tutti i flussi informativi con il Sistema Informativo Integrato. Il reseller invia le richieste di switching, volture e subentri al grossista, che le inoltra al SII per conto suo.", category: 'reseller' },
  { id: 'reseller-billing', question: "Chi fattura al cliente finale: il reseller o il grossista?", answer: "Il RESELLER fattura direttamente al cliente finale. È il reseller ad essere titolare del contratto di fornitura con il cliente, a emettere le bollette, incassare i pagamenti, gestire la morosità e il customer care. Il grossista fattura al reseller l'energia elettrica fornita all'ingrosso.", category: 'reseller' },
  { id: 'reseller-obligations', question: "Quali obblighi ha comunque il reseller verso ARERA e altri enti?", answer: "Il reseller ha obblighi propri verso: 1) MASE: iscrizione EVE (energia elettrica). 2) ARERA: registrazione Anagrafica Operatori, obblighi informativi, rispetto Codice Condotta Commerciale. 3) CSEA: dichiarazioni periodiche. 4) ADM: registrazione accise. 5) Garante Privacy: compliance GDPR.", category: 'reseller' },
  { id: 'reseller-become-udd', question: "È possibile passare da reseller a UDD in futuro?", answer: "Sì, è possibile ma richiede un investimento significativo: accreditamento Terna, iscrizione GME, accreditamento SII, garanzie finanziarie (€500k-2M) e team tecnico specializzato. Molti operatori iniziano come reseller e valutano il passaggio dopo >100 GWh/anno.", category: 'reseller' },
  { id: 'reseller-choose-wholesaler', question: "Come scegliere il grossista giusto?", answer: "Criteri chiave: 1) Pricing competitivo e trasparente. 2) Copertura territoriale. 3) Qualità dei servizi operativi e SLA. 4) Portale web per monitoraggio. 5) Supporto tecnico. 6) Garanzia finanziaria richiesta. 7) Flessibilità contrattuale.", category: 'reseller' },
  { id: 'reseller-margins', question: "Quali margini può aspettarsi un reseller?", answer: "Margini indicativi: €4-8/cliente/mese residenziale, €100-300/anno piccole imprese. I minori costi fissi del reseller (no team tecnico, no garanzie Terna) compensano parzialmente il minor margine unitario rispetto a un UDD.", category: 'reseller' },
  // Regulatory
  { id: 'eve-registration', question: "Cos'è l'iscrizione all'Elenco Venditori di Energia (EVE)?", answer: "L'EVE è l'elenco gestito da ARERA che censisce tutti i soggetti abilitati alla vendita di energia elettrica. Per iscriversi serve: società costituita (SRL/SPA), domanda ad ARERA con documentazione, requisiti tecnici e finanziari, contributo annuale. Tempi: 60-90 giorni.", category: 'regulatory' },
  { id: 'arera-obligations', question: "Quali sono gli obblighi principali verso ARERA?", answer: "Comunicazioni periodiche (Rapporto Annuale, trimestrali), standard qualità commerciale, gestione reclami entro 30 giorni, adesione Servizio Conciliazione, pubblicazione trasparenza prezzi, invio dati al SII, pagamento contributo annuale.", category: 'regulatory' },
  { id: 'quality-standards', question: "Cosa sono gli standard di qualità commerciale ARERA?", answer: "Parametri obbligatori: risposta reclami scritti (30 gg), rettifica fatturazione (60 gg), attivazione fornitura (7 gg lavorativi), cessazione (5 gg). Il mancato rispetto comporta indennizzi automatici e possibili sanzioni.", category: 'regulatory' },
  // Financial
  { id: 'bank-guarantees', question: "A quanto ammontano le garanzie bancarie necessarie?", answer: "Residenziale: €25.000-30.000, business: €50.000-80.000. Garantiscono i grossisti per l'acquisto energia. Costo annuale: 2-3% dell'importo garantito.", category: 'financial' },
  { id: 'startup-investment', question: "Qual è l'investimento iniziale complessivo?", answer: "Residenziale: €80.000-120.000. Business: €150.000-200.000. Misto: €200.000-280.000. Include costituzione, software, garanzie, marketing iniziale e 3-6 mesi di operatività.", category: 'financial' },
  { id: 'margin-structure', question: "Quali sono i margini tipici sulla vendita di energia elettrica?", answer: "Residenziale: €6-10/cliente/mese. Microbusiness: €0,002-0,005/kWh. Margini netti: 30-40% del lordo. Breakeven: 800-1.500 clienti residenziali o 100-200 microbusiness.", category: 'financial' },
  // Technical
  { id: 'software-needed', question: "Quali software sono necessari per operare?", answer: "1) Piattaforma SII/Switching. 2) Software Billing. 3) CRM. 4) Portale clienti. Costo mensile: €1.000-2.500. Esistono soluzioni integrate all-in-one.", category: 'technical' },
  { id: 'switching-process', question: "Come funziona il processo di switching?", answer: "1) Contratto firmato dal cliente. 2) Richiesta al SII (entro 1° del mese). 3) Validazione distributore (5-10 gg). 4) Attivazione dal 1° del mese successivo. Totale: 20-45 giorni.", category: 'technical' },
  // Operational
  { id: 'team-structure', question: "Quale struttura organizzativa serve?", answer: "Minimo: 1 responsabile compliance, 1-2 operatori back-office, supporto commerciale (agenti esterni). Per business: Key Account Manager. Supporto esterno: commercialista, consulente ARERA, legale.", category: 'operational' },
  { id: 'customer-service', question: "È obbligatorio un servizio clienti dedicato?", answer: "Sì. ARERA impone: contact center (risposta entro 120 sec per 80% chiamate), reclami scritti (30 gg), sportello online. Esternalizzabile a €0,50-1,50/cliente/mese.", category: 'operational' },
  // Legal
  { id: 'company-type', question: "Quale forma societaria è consigliata?", answer: "SRL: capitale minimo €10.000, responsabilità limitata, costi contenuti. Per progetti con investitori: SPA. Evitare ditte individuali per i rischi sulle fideiussioni.", category: 'legal' },
  { id: 'gdpr-compliance', question: "Quali adempimenti privacy/GDPR servono?", answer: "Nomina DPO (consigliata), registro trattamenti, informative privacy, contratti con responsabili esterni, sicurezza IT, gestione data breach. Costo consulenza: €2.000-5.000.", category: 'legal' },
  // Commercial
  { id: 'customer-acquisition', question: "Quali canali per acquisire clienti?", answer: "Residenziale: agenti porta a porta, partnership CAF, digital marketing locale. Business: agenti B2B, telemarketing, LinkedIn, fiere. Costo acquisizione: €80-120 residenziale, €200-400 business.", category: 'commercial' },
  { id: 'churn-management', question: "Come gestire il churn (abbandono)?", answer: "Tasso tipico: 15-25% residenziale, 10-15% business. Strategie: programmi fedeltà, rinnovo anticipato, servizio eccellente, bolletta chiara, app mobile. Costo retention: 3-5x inferiore all'acquisizione.", category: 'commercial' },
];

const faqAppData: FAQItem[] = [
  { id: 'app-what', question: "A cosa serve questa applicazione?", answer: "Metodi Res Builder è un gestionale completo per avviare un reseller di energia elettrica in Italia. Ti guida attraverso tutto il percorso burocratico, finanziario e strategico: dalla costituzione della società fino al go-live. Include gestione del processo, pianificazione finanziaria con simulazioni, generazione automatica di Business Plan e Piano Marketing, gestione team e consulenti.", category: 'app' },
  { id: 'app-start', question: "Da dove comincio?", answer: "Inizia creando un progetto: clicca 'Nuovo Progetto' nella barra superiore. Il Wizard ti guiderà nella compilazione dei dati essenziali. Poi segui il percorso consigliato: Scheda Progetto → Processo → Finanza → Business Plan → Pre-Launch.", category: 'app' },
  { id: 'app-process', question: "Come funziona la sezione Processo?", answer: "La sezione Processo mostra tutti gli step burocratici necessari, organizzati per fase (Costituzione, Licenze, Operativo, ecc.). Ogni step ha una checklist interattiva, documenti richiesti, costi stimati e date pianificabili. Puoi spuntare le attività completate e il progresso si aggiorna automaticamente.", category: 'app' },
  { id: 'app-finance', question: "Come uso la sezione Finanza?", answer: "La Finanza ha diverse sotto-sezioni: Costi (inserisci spese strutturali e commerciali), Ricavi (fonti di guadagno), Simulazione (proiezione ricavi su 12 mesi basata su contratti e consumi), Canali di vendita, Break-Even, Cash Flow, Tasse. I dati si integrano automaticamente con Business Plan e Marketing.", category: 'app' },
  { id: 'app-simulation', question: "Cos'è la Simulazione Ricavi e come funziona?", answer: "La Simulazione proietta i ricavi su 12 mesi basandosi su parametri reali: contratti mensili acquisiti, consumo medio, PUN, spread, CCV, tasso di attivazione e incasso. Puoi configurare ogni voce tariffaria (trasporto, oneri, accise) e vedere l'impatto sul fatturato. Focalizzata sulla vendita di energia elettrica per il mercato residenziale e microbusiness.", category: 'app' },
  { id: 'app-business-plan', question: "Come si genera il Business Plan?", answer: "Vai in Business Plan e clicca 'Genera Tutto'. L'app crea automaticamente tutte le sezioni (Executive Summary, Analisi Mercato, Piano Finanziario, ecc.) usando i dati reali del tuo progetto — non testo generico. Puoi personalizzare ogni sezione ed esportare in PDF o Word (.docx). Il sistema di Verifica segnala eventuali criticità.", category: 'app' },
  { id: 'app-marketing', question: "Come funziona il Piano Marketing?", answer: "Simile al Business Plan: clicca 'Genera Tutto' per creare contenuti basati su canali di vendita, target e dati finanziari. Include Target Mercato, Strategia di Acquisizione, Pricing, Posizionamento, Canali di Comunicazione e Budget. Anche questo ha sistema di verifica ed export PDF/Word.", category: 'app' },
  { id: 'app-team', question: "Come invito collaboratori al progetto?", answer: "Nella sezione Team clicca 'Invita Membro' e inserisci l'email. Puoi assegnare ruoli: Admin (gestisce tutto), Membro (modifica contenuti), Viewer (solo lettura, perfetto per investitori). Ogni membro accede alle sezioni in base ai suoi permessi.", category: 'app' },
  { id: 'app-consultants', question: "A cosa serve la sezione Consulenti?", answer: "Gestisci le attività dei consulenti esterni (Commercialista, Legale, IT, Formazione, Operativo). Ci sono 59+ attività predefinite con costi stimati. Puoi tracciare avanzamento, costi effettivi vs stimati, scadenze e priorità. Esporta il report in PDF per la rendicontazione.", category: 'app' },
  { id: 'app-documents', question: "Come gestisco i documenti?", answer: "La sezione Documenti permette di caricare, organizzare e condividere file. Supporta versioning (storico versioni), categorie, condivisione con permessi (view/edit) e collegamento ai singoli step del processo. I documenti sono archiviati in modo sicuro nel cloud.", category: 'app' },
  { id: 'app-export', question: "Posso esportare i dati?", answer: "Sì, puoi esportare: Business Plan e Marketing in PDF e Word (.docx), Report Progetto in PDF, Report Consulenti in PDF, Simulazione in Excel, Cash Flow in Excel. Tutti gli export includono formattazione professionale e possono includere il report di verifica.", category: 'app' },
  { id: 'app-prelaunch', question: "Cos'è la Pre-Launch Checklist?", answer: "È una verifica finale che controlla la prontezza al go-live: licenze ottenute, software configurato, team operativo, contratti con grossista firmati, compliance ARERA completata. Non andare live finché non è al 100%.", category: 'app' },
];

// ─── Step to Tab mapping ──────────────────────────────────
const guideStepToTab: Record<string, string> = {
  'project-setup': 'overview',
  'process-tracking': 'process',
  'team-collaboration': 'team',
  'financial-planning': 'financials',
  'strategy-docs': 'business-plan',
  'launch-prep': 'prelaunch',
};

const sectionToTab: Record<string, string> = {
  'Scheda Progetto': 'overview',
  'Dashboard': 'dashboard',
  'Processo': 'process',
  'Timeline': 'gantt',
  'Scadenze': 'deadlines',
  'Documenti': 'documents',
  'Team': 'team',
  'Consulenti': 'consultants',
  'Finanza': 'financials',
  'Business Plan': 'business-plan',
  'Marketing': 'marketing',
  'Pre-Launch': 'prelaunch',
};

interface FAQProps {
  onNavigate?: (tab: string) => void;
}

// ─── Component ──────────────────────────────────────────────
export const FAQ = ({ onNavigate }: FAQProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGuideStep, setActiveGuideStep] = useState(0);
  const [activeFaqCategory, setActiveFaqCategory] = useState<string | null>(null);

  const allFaq = [...faqResellerData, ...faqAppData];
  
  const filteredFaq = searchQuery.trim()
    ? allFaq.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const step = guideSteps[activeGuideStep];

  const faqCategories = activeFaqCategory
    ? { [activeFaqCategory]: allFaq.filter(f => f.category === activeFaqCategory) }
    : Object.entries(
        allFaq.reduce((acc, faq) => {
          if (!acc[faq.category]) acc[faq.category] = [];
          acc[faq.category].push(faq);
          return acc;
        }, {} as Record<string, FAQItem[]>)
      ).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, FAQItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Guida & FAQ
          </h2>
          <p className="text-muted-foreground mt-1">
            Tutto quello che ti serve per avviare il tuo reseller di energia
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca nelle FAQ... (es. 'garanzie', 'switching', 'Business Plan')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              {filteredFaq.length} risultat{filteredFaq.length === 1 ? 'o' : 'i'} per "{searchQuery}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFaq.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nessun risultato. Prova con termini diversi.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredFaq.map(faq => {
                  const config = categoryConfig[faq.category];
                  return (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left text-sm hover:no-underline gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="outline" className={cn("shrink-0 text-xs", config?.color)}>
                            {config?.label}
                          </Badge>
                          <span className="truncate">{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      {!searchQuery.trim() && (
        <Tabs defaultValue="guide" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide" className="gap-1.5">
              <Map className="h-4 w-4" />
              Guida all'Uso
            </TabsTrigger>
            <TabsTrigger value="faq-app" className="gap-1.5">
              <Zap className="h-4 w-4" />
              FAQ Applicazione
            </TabsTrigger>
            <TabsTrigger value="faq-reseller" className="gap-1.5">
              <HelpCircle className="h-4 w-4" />
              FAQ Reseller
            </TabsTrigger>
          </TabsList>

          {/* ─── GUIDE TAB ──────────────────────────── */}
          <TabsContent value="guide" className="space-y-6">
            {/* Progress Overview */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Percorso Completo: da Zero al Go-Live</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Segui questi 6 passi per configurare completamente il tuo progetto reseller. 
                  Ogni step corrisponde a una sezione della sidebar.
                </p>
                <div className="flex gap-1">
                  {guideSteps.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveGuideStep(i)}
                      className={cn(
                        "flex-1 h-2 rounded-full transition-all",
                        i === activeGuideStep ? "bg-primary" : i < activeGuideStep ? "bg-primary/40" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Step {step.number}/6</span>
                  <span className="text-xs text-muted-foreground">~{step.duration}</span>
                </div>
              </CardContent>
            </Card>

            {/* Step Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {guideSteps.map((s, i) => {
                const icons = [Building2, ListTodo, Users, DollarSign, FileText, Rocket];
                const Icon = icons[i];
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveGuideStep(i)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      i === activeGuideStep
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                        i === activeGuideStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {s.number}
                      </div>
                      <Icon className={cn("h-3.5 w-3.5", i === activeGuideStep ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <p className={cn("text-xs font-medium truncate", i === activeGuideStep ? "text-foreground" : "text-muted-foreground")}>
                      {s.title.split(' ').slice(0, 2).join(' ')}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Active Step Detail */}
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                  {/* Image */}
                  <div className="lg:col-span-2 relative overflow-hidden rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-48 lg:h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-5">
                      <div>
                        <Badge className="bg-primary/90 text-primary-foreground mb-2">
                          Step {step.number} — {step.sidebarSection}
                        </Badge>
                        <h3 className="text-lg font-bold text-white">{step.title}</h3>
                        <p className="text-sm text-white/80">{step.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:col-span-3 p-5 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>

                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-primary" />
                        Cosa fare
                      </h4>
                      <ul className="space-y-1.5">
                        {step.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <Lightbulb className="h-4 w-4 text-warning" />
                        Suggerimenti
                      </h4>
                      <ul className="space-y-1">
                        {step.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Nav Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeGuideStep === 0}
                        onClick={() => setActiveGuideStep(prev => prev - 1)}
                      >
                        ← Precedente
                      </Button>
                      {onNavigate && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => onNavigate(guideStepToTab[step.id] || 'overview')}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          Vai alla sezione
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={activeGuideStep === guideSteps.length - 1}
                        onClick={() => setActiveGuideStep(prev => prev + 1)}
                      >
                        Prossimo →
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mappa delle Sezioni</CardTitle>
                <CardDescription>Riferimento rapido per orientarti nell'applicazione</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { icon: Building2, section: 'Scheda Progetto', desc: 'Dati società, commodity, grossista, date' },
                    { icon: BarChart3, section: 'Dashboard', desc: 'Panoramica progresso e KPI principali' },
                    { icon: ListTodo, section: 'Processo', desc: 'Step burocratici con checklist interattive' },
                    { icon: BarChart3, section: 'Timeline', desc: 'Vista Gantt con date pianificate' },
                    { icon: Calendar, section: 'Scadenze', desc: 'Calendario scadenze regolatorie' },
                    { icon: FolderOpen, section: 'Documenti', desc: 'Upload, versioning e condivisione file' },
                    { icon: Users, section: 'Team', desc: 'Inviti, ruoli e permessi collaboratori' },
                    { icon: Briefcase, section: 'Consulenti', desc: '59+ attività predefinite per consulente' },
                    { icon: DollarSign, section: 'Finanza', desc: 'Costi, ricavi, simulazione, break-even, cash flow' },
                    { icon: FileText, section: 'Business Plan', desc: 'Generazione automatica + export PDF/Word' },
                    { icon: TrendingUp, section: 'Marketing', desc: 'Piano marketing auto-generato + verifica' },
                    { icon: Rocket, section: 'Pre-Launch', desc: 'Checklist finale prima del go-live' },
                  ].map(({ icon: Icon, section, desc }) => (
                    <button
                      key={section}
                      onClick={() => onNavigate?.(sectionToTab[section] || 'overview')}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all text-left group cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{section}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── FAQ APP TAB ──────────────────────────── */}
          <TabsContent value="faq-app" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  FAQ sull'Applicazione
                </CardTitle>
                <CardDescription>Come usare al meglio ogni funzionalità di Metodi Res Builder</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqAppData.map(faq => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left text-sm hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── FAQ RESELLER TAB ──────────────────────────── */}
          <TabsContent value="faq-reseller" className="space-y-4">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeFaqCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFaqCategory(null)}
              >
                Tutte
              </Button>
              {Object.entries(categoryConfig)
                .filter(([k]) => k !== 'app')
                .map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={key}
                      variant={activeFaqCategory === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFaqCategory(activeFaqCategory === key ? null : key)}
                      className="gap-1"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </Button>
                  );
                })}
            </div>

            {/* FAQ by Category */}
            {Object.entries(faqCategories)
              .filter(([k]) => k !== 'app')
              .map(([category, faqs]) => {
                const config = categoryConfig[category];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", config.bg)}>
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>
                        {config.label}
                        <Badge variant="secondary" className="ml-auto">{faqs.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {faqs.map(faq => (
                          <AccordionItem key={faq.id} value={faq.id}>
                            <AccordionTrigger className="text-left text-sm hover:no-underline">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
