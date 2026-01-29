import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Scale, Landmark, Server, FileText, Users, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'regulatory' | 'financial' | 'technical' | 'operational' | 'legal' | 'commercial';
}

const categoryConfig = {
  regulatory: { label: 'Regolatorio', icon: Scale, color: 'text-purple-600', bg: 'bg-purple-100' },
  financial: { label: 'Finanziario', icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-100' },
  technical: { label: 'Tecnico', icon: Server, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  operational: { label: 'Operativo', icon: FileText, color: 'text-green-600', bg: 'bg-green-100' },
  legal: { label: 'Legale', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  commercial: { label: 'Commerciale', icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
};

const faqData: FAQItem[] = [
  // Regulatory
  {
    id: 'eve-registration',
    question: "Cos'è l'iscrizione all'Elenco Venditori di Energia (EVE) e come si ottiene?",
    answer: "L'EVE è l'elenco gestito da ARERA che censisce tutti i soggetti abilitati alla vendita di energia elettrica e gas naturale ai clienti finali. Per iscriversi è necessario: costituire una società (SRL, SPA), presentare domanda ad ARERA con documentazione societaria, attestare i requisiti tecnici e finanziari, e pagare il contributo annuale. L'iscrizione richiede circa 60-90 giorni.",
    category: 'regulatory'
  },
  {
    id: 'arera-obligations',
    question: "Quali sono gli obblighi principali verso ARERA per un reseller?",
    answer: "Gli obblighi includono: comunicazioni periodiche (Rapporto Annuale, comunicazioni trimestrali), rispetto degli standard di qualità commerciale, gestione reclami entro 30 giorni, adesione al Servizio Conciliazione, pubblicazione trasparenza prezzi, invio dati al Sistema Informativo Integrato (SII), e pagamento del contributo annuale ARERA.",
    category: 'regulatory'
  },
  {
    id: 'quality-standards',
    question: "Cosa sono gli standard di qualità commerciale ARERA?",
    answer: "Sono parametri obbligatori che regolano i tempi massimi per: risposta a reclami scritti (30 giorni), rettifica fatturazione (60 giorni), attivazione fornitura (7 giorni lavorativi), cessazione (5 giorni). Il mancato rispetto comporta indennizzi automatici ai clienti e possibili sanzioni ARERA.",
    category: 'regulatory'
  },
  
  // Financial
  {
    id: 'bank-guarantees',
    question: "A quanto ammontano le garanzie bancarie necessarie?",
    answer: "Le fideiussioni variano in base ai volumi previsti: per il segmento residenziale si parte da €25.000-30.000, per il business da €50.000-80.000. Servono a garantire i grossisti energetici per l'acquisto di energia. Alcune fideiussioni sono richieste anche dai distributori per gli oneri di sistema. Il costo annuale è circa il 2-3% dell'importo garantito.",
    category: 'financial'
  },
  {
    id: 'working-capital',
    question: "Quanto capitale circolante serve per avviare l'attività?",
    answer: "Il fabbisogno di capitale circolante dipende dal modello di business: per 500 clienti residenziali servono circa €50.000-80.000 per coprire lo sfasamento tra acquisto energia (pagamento anticipato ai grossisti) e incasso bollette (30-60 giorni). Per clienti business i tempi di incasso sono più lunghi (60-90 giorni) e serve più liquidità.",
    category: 'financial'
  },
  {
    id: 'startup-investment',
    question: "Qual è l'investimento iniziale complessivo per avviare un reseller?",
    answer: "L'investimento varia per segmento: Residenziale: €80.000-120.000 (costituzione, software, garanzie, marketing iniziale, 3 mesi operatività). Business: €150.000-200.000 (garanzie maggiori, team commerciale, software enterprise). Misto: €200.000-280.000. Questi importi includono il capitale circolante per i primi 3-6 mesi.",
    category: 'financial'
  },
  {
    id: 'margin-structure',
    question: "Quali sono i margini tipici sulla vendita di energia?",
    answer: "I margini lordi variano: Residenziale luce €6-10/cliente/mese, gas €10-15/cliente/mese. Business: margini più variabili, da €0,002-0,005/kWh. I margini netti (dopo costi operativi) sono circa il 30-40% del margine lordo. Il breakeven si raggiunge tipicamente con 800-1.500 clienti residenziali o 100-200 business.",
    category: 'financial'
  },

  // Technical
  {
    id: 'sii-system',
    question: "Cos'è il Sistema Informativo Integrato (SII) e come funziona?",
    answer: "Il SII è la piattaforma gestita da Acquirente Unico che centralizza tutti i flussi informativi del mercato energetico: switching, volture, variazioni contrattuali, letture contatori. Il reseller deve dotarsi di un software certificato per lo scambio di flussi XML con il SII e formare personale dedicato. L'integrazione richiede 2-3 mesi.",
    category: 'technical'
  },
  {
    id: 'software-needed',
    question: "Quali software sono necessari per operare?",
    answer: "Servono: 1) Piattaforma SII/Switching per flussi con distributori e Acquirente Unico. 2) Software Billing per fatturazione e gestione bollette. 3) CRM per gestione clienti e contratti. 4) Portale clienti per autoletture e assistenza. Costo mensile: €1.000-2.500 a seconda della complessità. Esistono soluzioni integrate all-in-one.",
    category: 'technical'
  },
  {
    id: 'switching-process',
    question: "Come funziona il processo di switching (cambio fornitore)?",
    answer: "Lo switching richiede: 1) Acquisizione contratto firmato dal cliente. 2) Invio richiesta al SII (entro 1° del mese). 3) Validazione da parte del distributore (5-10 giorni). 4) Attivazione dal 1° del mese successivo. Tempi totali: 20-45 giorni. È fondamentale acquisire correttamente POD (luce) e PDR (gas) dal cliente.",
    category: 'technical'
  },

  // Operational
  {
    id: 'team-structure',
    question: "Quale struttura organizzativa serve per partire?",
    answer: "Struttura minima: 1 responsabile amministrativo/compliance, 1-2 operatori back-office (contratti, SII, fatturazione), supporto commerciale (agenti esterni o 1 commerciale interno). Per il business serve un Key Account Manager. Consigliato anche supporto esterno: commercialista, consulente ARERA, legale.",
    category: 'operational'
  },
  {
    id: 'customer-service',
    question: "È obbligatorio avere un servizio clienti dedicato?",
    answer: "Sì, ARERA impone standard di qualità commerciale. Serve: numero verde o contact center (risposta entro 120 secondi per l'80% delle chiamate), gestione reclami scritti (risposta entro 30 giorni), sportello online per segnalazioni. È possibile esternalizzare il servizio a società specializzate (costo €0,50-1,50/cliente/mese).",
    category: 'operational'
  },
  {
    id: 'billing-frequency',
    question: "Con quale frequenza si fattura ai clienti?",
    answer: "La frequenza dipende dal tipo cliente: Residenziali: bimestrale o mensile. Business piccoli: mensile. Business grandi: mensile con dettaglio consumi. ARERA impone regole precise su contenuto bollette, trasparenza prezzi e invio solleciti. La fatturazione elettronica (SDI) è obbligatoria per tutti i clienti B2B.",
    category: 'operational'
  },

  // Legal
  {
    id: 'company-type',
    question: "Quale forma societaria è consigliata?",
    answer: "La SRL è la scelta più comune per startup reseller: capitale minimo €10.000 (versamento 25% alla costituzione), responsabilità limitata, costi di gestione contenuti. Per progetti più ambiziosi con investitori, la SPA offre maggiore flessibilità. Evitare ditte individuali o SNC per i rischi legati alle fideiussioni.",
    category: 'legal'
  },
  {
    id: 'gdpr-compliance',
    question: "Quali sono gli adempimenti privacy/GDPR per un reseller?",
    answer: "Obblighi principali: nomina DPO (consigliata), registro trattamenti, informative privacy per clienti e agenti, contratti con responsabili esterni (software, call center), misure di sicurezza IT, gestione data breach. Costo consulenza iniziale: €2.000-5.000. Sanzioni GDPR: fino al 4% del fatturato.",
    category: 'legal'
  },
  {
    id: 'agent-contracts',
    question: "Come strutturare i contratti con gli agenti di vendita?",
    answer: "Opzioni: agenti monomandatari (esclusiva) o plurimandatari. Contratto di agenzia con: zona esclusiva o meno, provvigioni (€50-100 residenziale, €150-300 business), eventuali anticipi, patto di non concorrenza, obblighi formativi. Importante: gli agenti devono essere iscritti all'albo (Enasarco) e formati sulle normative ARERA.",
    category: 'legal'
  },

  // Commercial
  {
    id: 'customer-acquisition',
    question: "Quali sono i canali più efficaci per acquisire clienti?",
    answer: "Residenziale: rete agenti porta a porta, partnership con CAF/patronati, digital marketing locale, sportelli territoriali. Business: agenti specializzati B2B, telemarketing, LinkedIn, partecipazione a fiere, accordi con associazioni di categoria. Costo acquisizione medio: €80-120 residenziale, €200-400 business.",
    category: 'commercial'
  },
  {
    id: 'pricing-strategy',
    question: "Come definire la strategia di pricing?",
    answer: "Elementi chiave: analizzare offerte competitor (Selectra, Segugio), definire posizionamento (prezzo vs servizio), scegliere tra prezzo fisso o indicizzato, includere servizi a valore aggiunto (app, domotica, efficienza). ARERA impone trasparenza: scheda confrontabilità obbligatoria con prezzo €/kWh e costi fissi annui.",
    category: 'commercial'
  },
  {
    id: 'churn-management',
    question: "Come gestire il churn (abbandono clienti)?",
    answer: "Tasso di churn tipico: 15-25% annuo nel residenziale, 10-15% nel business. Strategie di retention: programmi fedeltà, offerte di rinnovo anticipato, servizio clienti eccellente, bolletta chiara, app mobile. Costo di retention è 3-5 volte inferiore al costo di acquisizione nuovo cliente.",
    category: 'commercial'
  },
];

export const FAQ = () => {
  const groupedFaq = faqData.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <Card className="shadow-custom-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Domande Frequenti - Avvio Reseller Energia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedFaq).map(([category, faqs]) => {
          const config = categoryConfig[category as keyof typeof categoryConfig];
          const Icon = config.icon;
          
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
