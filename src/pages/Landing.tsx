import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
import logoImage from "@/assets/logo.png";
import heroImage from "@/assets/landing-hero.jpg";
import processImage from "@/assets/landing-process.jpg";
import financeImage from "@/assets/landing-finance.jpg";
import teamImage from "@/assets/landing-team.jpg";

// --- animation helpers ---
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// --- data ---
const features = [
  {
    icon: ClipboardCheck,
    title: "Processo Guidato Step-by-Step",
    description:
      "Segui un percorso strutturato in 6 fasi: dalla costituzione societaria fino al go-live commerciale, con checklist operative, scadenze regolatorie e costi per step integrati nel cash flow.",
    image: processImage,
  },
  {
    icon: BarChart3,
    title: "Simulazione Finanziaria con IVA Separata",
    description:
      "Modella ricavi, costi e margini calcolati correttamente sull'imponibile (al netto IVA). Integra costi di avvio step nel cash flow, analisi break-even e simulazioni what-if per canale.",
    image: financeImage,
  },
  {
    icon: Users,
    title: "Gestione Team, Profilo e Consulenti",
    description:
      "Gestisci il tuo profilo utente, invita collaboratori con ruoli dedicati e coordina commercialista, avvocato e consulente ARERA in un'unica dashboard con Error Boundaries per la massima stabilità.",
    image: teamImage,
  },
];

const steps = [
  {
    number: "01",
    title: "Crea il tuo progetto",
    description:
      "Inserisci i dati della tua iniziativa: mercato target (residenziale/microbusiness) e volumi previsti.",
  },
  {
    number: "02",
    title: "Segui il processo operativo",
    description:
      "Completa gli step: licenza ARERA (EVE), contratto grossista, SII, CRM/billing, codice REMIT e adempimenti fiscali.",
  },
  {
    number: "03",
    title: "Valida la sostenibilità finanziaria",
    description:
      "Usa il simulatore per calcolare margini sull'imponibile (IVA esclusa), cash flow con costi di avvio distribuiti e punto di pareggio finanziario.",
  },
  {
    number: "04",
    title: "Lancia la tua attività",
    description:
      "Supera la checklist pre-lancio, gestisci il tuo profilo, genera il report unificato e parti con la tua attività di reseller energia elettrica.",
  },
];

const benefits = [
  "Conformità regolatoria ARERA integrata",
  "Business Plan e Marketing Plan auto-generati",
  "Margini calcolati sull'imponibile (IVA separata)",
  "Costi di avvio step integrati nel cash flow",
  "Profilo utente con gestione password e dati",
  "Collaborazione multi-utente con ruoli e Error Boundaries",
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
    question: "Cos'è un reseller di energia elettrica?",
    answer:
      "Un reseller acquista energia elettrica all'ingrosso da un grossista autorizzato (UDD) e la rivende ai clienti finali con il proprio brand e le proprie condizioni commerciali. Non possiede infrastrutture di rete: si occupa di fatturazione, assistenza clienti e gestione contrattuale.",
  },
  {
    question: "Quali autorizzazioni servono per diventare reseller in Italia?",
    answer:
      "Serve ottenere la licenza di vendita dall'ARERA (codice EVE per l'elettricità), iscriversi al portale SII (Sistema Informativo Integrato), registrarsi al REMIT presso ACER e adempiere agli obblighi fiscali di settore (accise, IVA energia, CSEA).",
  },
  {
    question: "Quanto tempo serve per avviare l'attività?",
    answer:
      "Il percorso completo richiede mediamente 4-8 mesi, a seconda della complessità: costituzione societaria, ottenimento licenza EVE, contratto con il grossista, setup del sistema CRM/billing e adempimenti regolatori. La piattaforma ti guida in ogni fase per ridurre i tempi.",
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
      "Il grossista fornisce l'energia elettrica all'ingrosso e gestisce i flussi con il distributore locale. Tu come reseller firmi un contratto di fornitura che definisce spread, modalità di fatturazione e garanzie richieste. La piattaforma ti aiuta a configurare e simulare i parametri economici del rapporto.",
  },
  {
    question: "Posso operare su tutto il territorio nazionale?",
    answer:
      "Sì, la licenza ARERA consente di operare su tutto il territorio italiano. Puoi scegliere di concentrarti su specifiche regioni o mercati (domestico, microbusiness) in base alla tua strategia commerciale.",
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src={logoImage} alt="Metodi Res Builder" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">
              Metodi <span className="text-primary">Res Builder</span>
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
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" /> Piattaforma operativa per reseller energia elettrica
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Avvia la tua attività di{" "}
              <span className="text-primary">reseller energia elettrica</span> in Italia
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="max-w-lg text-lg text-muted-foreground">
              La piattaforma all-in-one che ti guida passo dopo passo dall'ottenimento della licenza
              ARERA (EVE) fino al lancio commerciale, con simulazioni finanziarie, gestione team e
              compliance integrata. Per il mercato residenziale e microbusiness fino a 20.000 kWh/anno.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/app")} className="text-base">
                Crea il tuo progetto <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                document.getElementById("come-funziona")?.scrollIntoView({ behavior: "smooth" });
              }} className="text-base">
                Scopri come funziona
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="overflow-hidden rounded-xl border border-border shadow-2xl">
              <img
                src={heroImage}
                alt="Dashboard Metodi Res Builder con grafici di analisi finanziaria per reseller energia elettrica"
                className="w-full"
                loading="eager"
              />
            </div>
            <motion.div
              className="absolute -bottom-4 -left-4 rounded-lg border border-border bg-card p-3 shadow-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.8 }}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span>Break-even in 8 mesi</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            className="mb-14 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Tutto ciò che serve per partire
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Dalla burocrazia alla strategia commerciale: ogni aspetto del tuo avvio è coperto.
            </p>
          </motion.div>
          <motion.div
            className="grid gap-8 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i}>
                <Card className="overflow-hidden border-border transition-shadow hover:shadow-lg h-full">
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
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="come-funziona" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            className="mb-14 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">Come funziona</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Quattro passaggi per trasformare la tua idea in un'attività operativa.
            </p>
          </motion.div>
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            {steps.map((s, i) => (
              <motion.div
                key={s.number}
                variants={fadeUp}
                custom={i}
                className="relative rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <span className="font-mono text-4xl font-bold text-primary/20">{s.number}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-border bg-card/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            className="grid items-center gap-12 lg:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl">
                Progettato per il mercato elettrico italiano
              </h2>
              <p className="mt-4 text-muted-foreground">
                Ogni funzionalità è pensata specificamente per chi vuole diventare reseller di
                energia elettrica in Italia, nel rispetto della normativa ARERA e degli
                adempimenti fiscali di settore. Focalizzato sul mercato residenziale e microbusiness
                fino a 20.000 kWh/anno.
              </p>
            </motion.div>
            <motion.div className="grid gap-3 sm:grid-cols-2" variants={stagger}>
              {benefits.map((b, i) => (
                <motion.div key={b} variants={fadeUp} custom={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{b}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Partners */}
      <motion.section
        className="border-t border-border bg-card/50 py-14"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Ecosistema di partner e competenze
          </p>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 sm:gap-12"
            variants={stagger}
          >
            {partners.map((p, i) => (
              <motion.div
                key={p.name}
                variants={fadeUp}
                custom={i}
                className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <p.icon className="h-8 w-8" />
                <span className="text-xs font-medium text-center max-w-[100px]">{p.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section
        id="faq"
        className="py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div className="mb-14 text-center" variants={fadeUp}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Domande frequenti
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Le risposte alle domande più comuni sul processo di avvio come reseller di energia elettrica in Italia.
            </p>
          </motion.div>
          <motion.div variants={fadeUp} custom={1}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className="py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-10 sm:p-14">
            <Rocket className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">
              Pronto a partire?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Crea il tuo account gratuito e inizia subito a pianificare il lancio della tua
              attività di reseller di energia elettrica.
            </p>
            <Button size="lg" className="mt-6 text-base" onClick={() => navigate("/app")}>
              Inizia ora — è gratuito <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Metodi Res Builder" className="h-7 w-7 rounded-md" />
            <span className="text-sm font-semibold">Metodi Res Builder</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Metodi Res Builder. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
