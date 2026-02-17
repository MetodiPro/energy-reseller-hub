import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Users,
  TrendingUp,
  ClipboardCheck,
  Rocket,
  Building2,
  Landmark,
  Scale,
  Monitor,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroImage from "@/assets/landing-hero.jpg";
import processImage from "@/assets/landing-process.jpg";
import financeImage from "@/assets/landing-finance.jpg";
import teamImage from "@/assets/landing-team.jpg";

const features = [
  {
    icon: ClipboardCheck,
    title: "Processo Guidato Step-by-Step",
    description:
      "Segui un percorso strutturato in 6 fasi: dalla costituzione societaria fino al go-live commerciale, con checklist operative e scadenze regolatorie integrate.",
    image: processImage,
  },
  {
    icon: BarChart3,
    title: "Simulazione Finanziaria Completa",
    description:
      "Modella ricavi, costi, spread, PUN e break-even point. Simula scenari what-if per validare la sostenibilità del tuo business prima di partire.",
    image: financeImage,
  },
  {
    icon: Users,
    title: "Gestione Team e Consulenti",
    description:
      "Assegna compiti, monitora l'avanzamento e coordina commercialista, avvocato e consulente ARERA in un'unica dashboard condivisa.",
    image: teamImage,
  },
];

const steps = [
  {
    number: "01",
    title: "Crea il tuo progetto",
    description:
      "Inserisci i dati della tua iniziativa: commodity (luce/gas/dual), mercato target e volumi previsti.",
  },
  {
    number: "02",
    title: "Segui il processo operativo",
    description:
      "Completa gli step: licenza ARERA, contratto grossista, SII, CRM/billing, codice REMIT e adempimenti fiscali.",
  },
  {
    number: "03",
    title: "Valida la sostenibilità finanziaria",
    description:
      "Usa il simulatore di ricavi per calcolare margini, cash flow e punto di pareggio su orizzonti a 12-36 mesi.",
  },
  {
    number: "04",
    title: "Lancia la tua attività",
    description:
      "Supera la checklist pre-lancio, genera il report unificato e parti con la tua attività di reseller energia.",
  },
];

const benefits = [
  "Conformità regolatoria ARERA integrata",
  "Business Plan e Marketing Plan auto-generati",
  "Simulazione ricavi con PUN/PSV in tempo reale",
  "Gestione scadenze e adempimenti fiscali",
  "Esportazione report PDF professionali",
  "Collaborazione multi-utente con ruoli",
];




const partners = [
  { name: "Consulenze ARERA", icon: Landmark },
  { name: "Studi Legali Energia", icon: Scale },
  { name: "Software CRM/Billing", icon: Monitor },
  { name: "Grossisti Energia", icon: Building2 },
  { name: "Commercialisti Settore", icon: Briefcase },
];

const faqs = [
  {
    question: "Cos'è un reseller di energia elettrica e gas?",
    answer:
      "Un reseller acquista energia all'ingrosso da un grossista autorizzato e la rivende ai clienti finali con il proprio brand e le proprie condizioni commerciali. Non possiede infrastrutture di rete: si occupa di fatturazione, assistenza clienti e gestione contrattuale.",
  },
  {
    question: "Quali autorizzazioni servono per diventare reseller in Italia?",
    answer:
      "Serve ottenere la licenza di vendita dall'ARERA (codice EVE per l'elettricità, EVG per il gas), iscriversi al portale SII (Sistema Informativo Integrato), registrarsi al REMIT presso ACER e adempiere agli obblighi fiscali di settore (accise, IVA energia, CSEA).",
  },
  {
    question: "Quanto tempo serve per avviare l'attività?",
    answer:
      "Il percorso completo richiede mediamente 4-8 mesi, a seconda della complessità: costituzione societaria, ottenimento licenze ARERA, contratto con il grossista, setup del sistema CRM/billing e adempimenti regolatori. La piattaforma ti guida in ogni fase per ridurre i tempi.",
  },
  {
    question: "Qual è l'investimento iniziale necessario?",
    answer:
      "L'investimento varia in base al modello di business. I costi principali includono: costituzione societaria, consulenze legali e regolatorie, sistema CRM/billing, garanzie per il grossista e capitale circolante iniziale. Il simulatore finanziario della piattaforma ti aiuta a stimare il budget necessario.",
  },
  {
    question: "Serve avere esperienza nel settore energetico?",
    answer:
      "No. La piattaforma è progettata proprio per guidare chi parte da zero: ogni step include spiegazioni dettagliate, checklist operative e suggerimenti su quali professionisti coinvolgere (commercialista, avvocato, consulente ARERA).",
  },
  {
    question: "Come funziona il rapporto con il grossista?",
    answer:
      "Il grossista fornisce l'energia all'ingrosso e gestisce i flussi con il distributore locale. Tu come reseller firmi un contratto di fornitura che definisce spread, modalità di fatturazione e garanzie richieste. La piattaforma ti aiuta a configurare e simulare i parametri economici del rapporto.",
  },
  {
    question: "Posso operare su tutto il territorio nazionale?",
    answer:
      "Sì, la licenza ARERA consente di operare su tutto il territorio italiano. Puoi scegliere di concentrarti su specifiche regioni o mercati (domestico, business, condomini) in base alla tua strategia commerciale.",
  },
  {
    question: "La piattaforma sostituisce i consulenti professionali?",
    answer:
      "No. La piattaforma organizza e velocizza il lavoro, ma per gli aspetti legali, fiscali e regolatori è fondamentale affidarsi a professionisti qualificati. Il sistema ti aiuta a coordinare il loro lavoro e a monitorare scadenze e deliverable.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-red-500">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Power Reseller <span className="text-primary">START UP</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/app")}>
              Accedi
            </Button>
            <Button onClick={() => navigate("/app")}>
              Inizia Gratis <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" /> Piattaforma operativa per reseller energia
            </div>
            <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Avvia la tua attività di{" "}
              <span className="text-primary">reseller energia</span> in Italia
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              La piattaforma all-in-one che ti guida passo dopo passo dall'ottenimento della licenza
              ARERA fino al lancio commerciale, con simulazioni finanziarie, gestione team e
              compliance integrata.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/app")} className="text-base">
                Crea il tuo progetto <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                document.getElementById("come-funziona")?.scrollIntoView({ behavior: "smooth" });
              }} className="text-base">
                Scopri come funziona
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-border shadow-2xl">
              <img
                src={heroImage}
                alt="Dashboard Power Reseller Start Up con grafici di analisi finanziaria per reseller energia"
                className="w-full"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-lg border border-border bg-card p-3 shadow-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Break-even in 8 mesi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Tutto ciò che serve per partire
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Dalla burocrazia alla strategia commerciale: ogni aspetto del tuo avvio è coperto.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="overflow-hidden border-border transition-shadow hover:shadow-lg">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={f.image}
                    alt={f.title}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold leading-snug">{f.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="come-funziona" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">Come funziona</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Quattro passaggi per trasformare la tua idea in un'attività operativa.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.number}
                className="relative rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <span className="font-mono text-4xl font-bold text-primary/20">{s.number}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-border bg-card/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl">
                Progettato per il mercato energetico italiano
              </h2>
              <p className="mt-4 text-muted-foreground">
                Ogni funzionalità è pensata specificamente per chi vuole diventare reseller di
                energia elettrica e gas in Italia, nel rispetto della normativa ARERA e degli
                adempimenti fiscali di settore.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <div key={b} className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>



      {/* Partners */}
      <section className="border-t border-border bg-card/50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Ecosistema di partner e competenze
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {partners.map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <p.icon className="h-8 w-8" />
                <span className="text-xs font-medium text-center max-w-[100px]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Domande frequenti
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Le risposte alle domande più comuni sul processo di avvio come reseller energia in Italia.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-sm font-semibold hover:text-primary hover:no-underline sm:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-10 sm:p-14">
            <Rocket className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">
              Pronto a partire?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Crea il tuo account gratuito e inizia subito a pianificare il lancio della tua
              attività di reseller energia.
            </p>
            <Button size="lg" className="mt-6 text-base" onClick={() => navigate("/app")}>
              Inizia ora — è gratuito <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-red-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">Power Reseller Start Up</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Power Reseller Start Up. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
