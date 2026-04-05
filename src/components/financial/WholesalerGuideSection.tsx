import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  BookOpen, Scale, Calculator, Clock, Shield, CreditCard,
  Settings, TrendingUp, CheckSquare, ExternalLink, FileText
} from 'lucide-react';

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <AccordionItem value={title}>
    <AccordionTrigger className="text-left">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        {title}
      </span>
    </AccordionTrigger>
    <AccordionContent>
      <div className="text-sm text-muted-foreground space-y-3 pl-6">
        {children}
      </div>
    </AccordionContent>
  </AccordionItem>
);

const TableRow = ({ cells, header = false }: { cells: string[]; header?: boolean }) => (
  <tr className={header ? 'border-b bg-muted/50' : 'border-b'}>
    {cells.map((cell, i) => header ? (
      <th key={i} className="text-left py-2 px-3 text-xs font-semibold">{cell}</th>
    ) : (
      <td key={i} className="py-2 px-3 text-xs">{cell}</td>
    ))}
  </tr>
);

export const WholesalerGuideSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Guida Metodologica — Garanzie Finanziarie al Grossista (UDD)
        </CardTitle>
        <CardDescription>
          Base concettuale, normativa e tecnica del modello di garanzia implementato nel simulatore.
          Struttura, calcolo e gestione del deposito cauzionale nel contratto reseller–grossista nel mercato elettrico italiano.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">

          {/* 1. Rapporto economico */}
          <Section icon={Scale} title="1. Il rapporto economico reseller–grossista">
            <p>
              Il reseller acquista la totalità delle componenti di consumo dal grossista (UDD), ad eccezione di accise e IVA
              — che gestisce direttamente con Agenzia delle Dogane ed Erario. Il grossista, in quanto Utente del Dispacciamento,
              anticipa per conto del reseller i costi verso Terna, i Distributori locali e il GME, e li riaddebita mensilmente in fattura.
            </p>
            <p className="font-medium text-foreground">La fattura mensile del grossista include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Materia Prima Energia:</strong> PUN × kWh acquistati (maggiorati delle perdite di rete)</li>
              <li><strong>Spread Grossista:</strong> ricarico negoziale sul PUN (es. 0,004–0,010 €/kWh)</li>
              <li><strong>Dispacciamento:</strong> corrispettivo PD + uplift Terna/GME (tariffato ARERA, passante)</li>
              <li><strong>Trasporto e Distribuzione:</strong> tariffe DSO — quota fissa/anno, quota energia €/kWh, quota potenza €/kW/anno</li>
              <li><strong>Oneri di Sistema:</strong> ASOS + ARIM (CSEA/ARERA, passanti, aggiornati trimestralmente)</li>
              <li><strong>Fee Gestione POD:</strong> corrispettivo fisso per ogni punto di fornitura attivo (€/POD/mese)</li>
            </ul>
            <div className="bg-muted/50 rounded p-3 text-xs mt-2">
              <p className="font-medium text-foreground">NON incluse nella fattura grossista:</p>
              <p>Accise (versate dal reseller ad ADM) e IVA (meccanismo reverse charge art. 17 c.6 lett. d-quater DPR 633/72 — operazione netta tra soggetti passivi IVA).</p>
              <p className="italic mt-1">Il reverse charge sull'IVA è confermato dalla risposta all'interpello n. 59 dell'Agenzia delle Entrate del 2 novembre 2018.</p>
            </div>
          </Section>

          {/* 2. Struttura e logica */}
          <Section icon={Shield} title="2. La garanzia finanziaria: struttura e logica">
            <p>
              Il grossista è strutturalmente esposto al rischio di insolvenza del reseller: anticipa mensilmente i costi verso Terna,
              i Distributori e il GME (costi regolati non dilazionabili), mentre il reseller incassa dai propri clienti finali con un
              ritardo di 30–90 giorni. Per coprire questa esposizione, il grossista richiede al reseller la costituzione di una garanzia preventiva.
            </p>
            <p className="font-medium text-foreground">Forma prevalente: deposito cauzionale in denaro</p>
            <p>
              Versato al grossista, infruttifero o con tasso minimo concordato. È la forma più diffusa
              nel mercato italiano del reselling energetico, specialmente per operatori in avvio o startup.
            </p>

            <p className="font-medium text-foreground mt-4">Componenti coperte dalla garanzia:</p>
            <div className="overflow-auto">
              <table className="w-full text-xs border">
                <thead>
                  <TableRow header cells={['Componente', 'Coperta?', 'Pagata da']} />
                </thead>
                <tbody>
                  <TableRow cells={['Materia Prima (PUN)', '✅ SÌ', 'Grossista → riaddebita al reseller']} />
                  <TableRow cells={['Dispacciamento (PD + uplift)', '✅ SÌ', 'Grossista → riaddebita al reseller']} />
                  <TableRow cells={['Trasporto e Distribuzione', '✅ SÌ', 'Grossista → riaddebita al reseller']} />
                  <TableRow cells={['Oneri di Sistema (ASOS, ARIM)', '✅ SÌ', 'Grossista → riaddebita al reseller']} />
                  <TableRow cells={['Spread Grossista', '❌ NO', 'Non è un\'anticipazione — fatturato sui consumi']} />
                  <TableRow cells={['Fee Gestione POD', '❌ NO', 'Margine del grossista — fatturato sui consumi']} />
                  <TableRow cells={['Accise', '❌ NO', 'Reseller → Agenzia Dogane (diretto)']} />
                  <TableRow cells={['IVA', '❌ NO', 'Reverse charge neutro (Reseller → Erario)']} />
                </tbody>
              </table>
            </div>
          </Section>

          {/* 3. Formula di calcolo */}
          <Section icon={Calculator} title="3. Formula di calcolo del deposito">
            <div className="bg-muted rounded p-4 font-mono text-xs">
              <p className="font-semibold text-foreground">Deposito = POD_attivati × Costo_mensile_garantito × N_mesi × %_applicata</p>
            </div>
            <p className="mt-2">Dove:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>POD_attivati:</strong> numero di punti di fornitura per cui viene richiesto lo switching (mese successivo alla firma)</li>
              <li><strong>Costo_mensile_garantito:</strong> (PUN + Dispacciamento) × kWh_medi + Trasporto + Oneri — calcolato su consumo medio per POD</li>
              <li><strong>N_mesi:</strong> mesi di copertura richiesti dal grossista (tipicamente 2–4, fino a 6 in startup)</li>
              <li><strong>%_applicata:</strong> percentuale del costo effettivamente richiesta come deposito (range 70–100%)</li>
            </ul>

            <div className="bg-muted/50 rounded p-3 mt-3">
              <p className="font-medium text-foreground text-xs">Esempio numerico:</p>
              <p className="text-xs mt-1">
                100 POD, consumo 200 kWh/mese, PUN 0,12 €/kWh, disp. 0,02 €/kWh, perdite 10,2%,
                trasporto 4,50 €/mese, oneri 3,00 €/mese, 3 mesi copertura, 85%:
              </p>
              <div className="font-mono text-xs mt-2 space-y-0.5">
                <p>kWh_fatturati = 200 × 1,102 = 220,4 kWh/mese/POD</p>
                <p>Materia+Disp = (0,12 + 0,02) × 220,4 = 30,86 €/mese/POD</p>
                <p>Costo_garantito = 30,86 + 4,50 + 3,00 = <strong>38,36 €/mese/POD</strong></p>
                <p>Deposito = 100 × 38,36 × 3 × 85% = <strong>€ 9.782</strong></p>
              </div>
              <p className="text-xs mt-2 italic">
                Spread (es. 0,008 €/kWh × 220,4 = 1,76 €/POD/mese) e fee POD (es. 2,50 €/POD/mese)
                NON entrano nel deposito.
              </p>
            </div>
          </Section>

          {/* 4. Timeline */}
          <Section icon={Clock} title="4. Timeline del deposito nel simulatore">
            <div className="overflow-auto">
              <table className="w-full text-xs border">
                <thead>
                  <TableRow header cells={['Mese', 'Evento', 'Impatto sul deposito']} />
                </thead>
                <tbody>
                  <TableRow cells={['M (attivazioni)', 'Contratti firmati, dossier al grossista', 'Nessuno — garanzia non ancora richiesta']} />
                  <TableRow cells={['M+1 (switching)', 'SE1 caricata nel SII — switching effettivo', 'DEPOSITO VERSATO — calcolato sui POD in attivazione']} />
                  <TableRow cells={['M+2 in poi', 'Nuove attivazioni ogni mese', 'DELTA deposito: solo l\'incremento netto']} />
                  <TableRow cells={['Mesi con churn', 'POD escono dalla fornitura (switch-out)', 'RILASCIO parziale per i POD usciti']} />
                  <TableRow cells={['Fine simulazione', 'Base clienti stabile o in contrazione', 'Il deposito si stabilizza o diminuisce']} />
                </tbody>
              </table>
            </div>
            <p className="italic text-xs mt-2">
              Il deposito iniziale coincide con il valore impostato nella Fase 4 — Garanzie Finanziarie Grossista del processo.
            </p>
          </Section>

          {/* 5. Forme alternative */}
          <Section icon={CreditCard} title="5. Forme alternative di garanzia">
            <div className="overflow-auto">
              <table className="w-full text-xs border">
                <thead>
                  <TableRow header cells={['Forma', 'Impatto cash flow', 'Tipico per']} />
                </thead>
                <tbody>
                  <TableRow cells={['Deposito cauzionale cash', 'Esborso immediato — immobilizza liquidità', 'Startup, operatori in avvio']} />
                  <TableRow cells={['Fideiussione bancaria', 'Solo premio (0,5–2% annuo)', 'Operatori con accesso al credito']} />
                  <TableRow cells={['Fideiussione assicurativa', 'Solo premio assicurativo (spesso più basso)', 'PMI senza banca di riferimento']} />
                  <TableRow cells={['Pre-payment', 'Anticipo intero mese prima di incassare', 'Operatori senza storia creditizia']} />
                  <TableRow cells={['Open credit', 'Nessun esborso iniziale', 'Operatori con rating elevato']} />
                  <TableRow cells={['Reverse factoring', 'Commissioni di factoring; migliora cash flow', 'Portafoglio consolidato']} />
                  <TableRow cells={['Lettera di patronage', 'Nessun esborso (condizionale)', 'Subsidiary di gruppi industriali']} />
                  <TableRow cells={['Plafond garantito', 'Nessun esborso, volume limitato', 'Startup selezionate']} />
                </tbody>
              </table>
            </div>
          </Section>

          {/* 6. Pagamento consumi */}
          <Section icon={TrendingUp} title="6. Pagamento mensile dei consumi reali">
            <div className="overflow-auto">
              <table className="w-full text-xs border">
                <thead>
                  <TableRow header cells={['Mese', 'Evento', 'Flusso']} />
                </thead>
                <tbody>
                  <TableRow cells={['M', 'Clienti consumano energia', 'Nessun flusso ancora']} />
                  <TableRow cells={['M+1 (15-20 gg)', 'Grossista emette fattura al reseller', 'Reseller riceve fattura']} />
                  <TableRow cells={['M+1 (scadenza)', 'Reseller paga il grossista', 'Reseller → Grossista']} />
                  <TableRow cells={['M+1 / M+2', 'Reseller emette bolletta ai clienti', 'Clienti ricevono bolletta']} />
                  <TableRow cells={['M+2 / M+3', 'Clienti finali pagano', 'Clienti → Reseller (waterfall)']} />
                </tbody>
              </table>
            </div>
            <p className="mt-2">
              Il gap strutturale tra il pagamento al grossista e l'incasso dai clienti finali (30–60 giorni)
              costituisce il secondo fabbisogno di liquidità del business, distinto dal deposito cauzionale.
            </p>
            <div className="bg-muted/50 rounded p-3 mt-2 text-xs">
              <strong>Punto chiave:</strong> spread grossista e fee POD sono fatturati sui CONSUMI REALI mese per mese
              e NON entrano nella base del deposito. Il deposito copre esclusivamente le componenti passanti che il grossista
              anticipa (materia energia + dispacciamento + trasporto + oneri di sistema).
            </div>
          </Section>

          {/* 7. Impatto cash flow */}
          <Section icon={TrendingUp} title="7. Impatto sul cash flow: riepilogo">
            <div className="overflow-auto">
              <table className="w-full text-xs border">
                <thead>
                  <TableRow header cells={['Componente', 'Timing', 'Natura']} />
                </thead>
                <tbody>
                  <TableRow cells={['Deposito cauzionale iniziale', 'Mese 1 switching (Fase 4)', 'Esborso una-tantum — liquidità immobilizzata']} />
                  <TableRow cells={['Adeguamento deposito (delta)', 'Ogni mese con attivazioni/churn', 'Solo variazione netta rispetto al versato']} />
                  <TableRow cells={['Pagamento fattura consumi', 'Ogni mese, 15–30 gg dopo consumo', 'Uscita ricorrente (prima degli incassi clienti)']} />
                </tbody>
              </table>
            </div>
            <p className="italic mt-2">
              Il deposito cauzionale non è una spesa operativa: viene restituito al reseller quando il portafoglio
              si riduce o alla cessazione del rapporto. Va modellato come variazione di attivo circolante, non come costo.
            </p>
          </Section>

          {/* 8. Checklist */}
          <Section icon={CheckSquare} title="8. Checklist operativa per il reseller">
            <ul className="space-y-2">
              {[
                'Negoziare prima dell\'avvio il numero di mesi di copertura (target: 2 mesi se possibile, non più di 3)',
                'Verificare che la percentuale applicata al deposito sia chiaramente scritta nel contratto col grossista',
                'Chiedere al grossista la clausola di adeguamento automatico (mensile) in base ai POD attivi',
                'Negoziare la forma di garanzia ottimale: fideiussione bancaria se disponibile (libera cassa)',
                'Includere nel contratto: SLA caricamento SE1 ≤ 24 ore, notifica esiti OK/KO entro giornata, svincolo garanzia entro 30 gg dallo switch-out',
                'Monitorare mensilmente il rapporto deposito versato / deposito teorico: evitare eccessi (liquidità immobilizzata) e difetti (richiesta integrativa)',
                'Registrare in contabilità il deposito come credito verso il grossista (attivo circolante), non come costo',
                'Per operatori in rapida crescita: prevedere un piano di adeguamento trimestrale in linea con la customer base',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckSquare className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 9. Fonti e riferimenti */}
          <Section icon={FileText} title="9. Fonti normative e bibliografia">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-foreground mb-2">Normativa primaria</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>D.Lgs. 79/1999 (Decreto Bersani) — Liberalizzazione del mercato elettrico</li>
                  <li>D.Lgs. 164/2000 (Decreto Letta) — Liberalizzazione del mercato del gas</li>
                  <li>DPR 633/72, art. 17 c.6 lett. d-quater — Reverse charge cessioni di energia elettrica</li>
                  <li>L. 124/2017 (Legge Concorrenza) — Fine tutela e mercato libero</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-foreground mb-2">Delibere ARERA</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Delibera 111/06 — Codice di rete tipo per la distribuzione dell'energia elettrica (TIC)</li>
                  <li>Delibera 654/2015/R/eel — Disciplina del dispacciamento (TIDE)</li>
                  <li>Delibera 487/2015/R/eel — Regolazione dei processi di switching nel SII</li>
                  <li>Delibera 302/2016/R/eel — Tariffe di trasporto e distribuzione</li>
                  <li>Delibera 503/2022/R/com — Aggiornamento trimestrale oneri di sistema (ASOS + ARIM)</li>
                  <li>Delibera 922/2024/R/eel — Condizioni economiche di riferimento per il servizio di vendita al dettaglio</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-foreground mb-2">Prassi e interpelli</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Agenzia delle Entrate, Interpello n. 59 del 2 novembre 2018 — Conferma del meccanismo di reverse charge per cessioni di energia tra soggetti passivi IVA</li>
                  <li>Circolare AdE n. 36/E del 2006 — Chiarimenti sull'ambito applicativo del reverse charge nel settore energetico</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-foreground mb-2">Fonti di mercato e dati</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>GME (Gestore Mercati Energetici) — Pubblicazione PUN giornaliero e serie storica</li>
                  <li>CSEA (Cassa per i Servizi Energetici e Ambientali) — Aliquote oneri di sistema (ASOS, ARIM) per trimestre</li>
                  <li>ARERA — Tariffe di distribuzione aggiornate (TD), perdite di rete convenzionali</li>
                  <li>Acquirente Unico — Dati di mercato, indici di prezzo, statistiche switching</li>
                  <li>ADM (Agenzia delle Dogane e dei Monopoli) — Aliquote accise energia elettrica e gas</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-foreground mb-2">Standard contrattuali</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Contratto tipo UDD (Utente del Dispacciamento) — Standard EFET con allegati tecnici nazionali</li>
                  <li>Codice di condotta commerciale ARERA — Tutela dei clienti finali (Delibera 104/10)</li>
                  <li>SII (Sistema Informativo Integrato di AU) — Protocolli di switching, validazione SE1, tempistiche</li>
                </ul>
              </div>
            </div>

            <div className="bg-muted/50 rounded p-3 mt-4 text-xs">
              <p className="font-medium text-foreground">Nota:</p>
              <p>
                Le delibere ARERA sono soggette ad aggiornamento periodico. I valori utilizzati nel simulatore
                (PUN, tariffe di trasporto, oneri di sistema, accise) vengono aggiornati trimestralmente in linea con
                le pubblicazioni ufficiali. Per calcoli definitivi si rimanda alla consulenza professionale e alla
                documentazione ARERA più recente.
              </p>
            </div>
          </Section>

        </Accordion>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          <p>Nota Metodologica — Garanzie Finanziarie al Grossista (UDD) — Metodi RES Builder — Versione 1.0 — Aprile 2026</p>
        </div>
      </CardContent>
    </Card>
  );
};
