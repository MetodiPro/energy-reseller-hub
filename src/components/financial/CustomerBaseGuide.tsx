import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Scale, ArrowRightLeft, TrendingDown, Clock, Shield, AlertTriangle, GraduationCap, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export const CustomerBaseGuide = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
      >
        <GraduationCap className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary">Guida tecnica: Switching e Customer Base</p>
          {!isExpanded && (
            <p className="text-xs text-muted-foreground truncate">
              Base concettuale, regole operative SII, dinamica switch-out e glossario tecnico
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-primary shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">

          <Accordion type="multiple" className="space-y-2">

            {/* 1. Quadro generale */}
            <AccordionItem value="quadro" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">1. Il mercato elettrico liberalizzato e la filiera del reseller</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Il mercato italiano dell'energia elettrica è completamente liberalizzato. A giugno 2026 il 76,3% dei punti domestici è servito nel mercato libero. Nel 2024, secondo ARERA, il 23,8% dei clienti domestici ha cambiato fornitore almeno una volta (contro il 18,9% del 2023).
                </p>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filiera del reseller</p>
                  <p className="text-sm text-muted-foreground">
                    Un reseller si inserisce come intermediario tra il grossista (UDD) e il cliente finale. I quattro interlocutori istituzionali sono:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                    <li><strong>Grossista (UDD)</strong>: acquisto energia e invio richieste switching al SII</li>
                    <li><strong>Agenzia delle Dogane</strong>: versamento accise clienti finali</li>
                    <li><strong>ARERA</strong>: rendicontazione attività tramite raccolta dati</li>
                    <li><strong>Acquirente Unico</strong>: gestore del SII</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">⚠️ Differenza fondamentale</p>
                  <p className="text-sm text-muted-foreground">
                    Il grossista fattura al reseller <strong>senza imposte e IVA</strong>: sarà il reseller a fatturarle al cliente finale.
                  </p>
                </div>

                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead className="text-center">Può inviare SE1?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">CC – Controparte Commerciale</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Venditore col contratto cliente. Emette bollette, gestisce rapporto commerciale.</TableCell>
                        <TableCell className="text-center"><Badge variant="destructive">NO</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">UDD – Utente Dispacciamento</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Ha contratti con Terna, GME, distributori. Responsabile del bilanciamento fisico.</TableCell>
                        <TableCell className="text-center"><Badge className="bg-emerald-600">SÌ</Badge></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Processo di switching */}
            <AccordionItem value="switching" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">2. Il processo di switching: regole operative (giugno 2026)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  A giugno 2026 si applicano le regole tradizionali (delibera ARERA 487/2015/R/eel). Lo switching lampo in 24 ore (delibera 58/2026) entrerà in vigore dal 1° dicembre 2026 solo per clienti domestici non morosi.
                </p>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">La regola della scadenza del 10</p>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando viene caricata la SE1</TableHead>
                        <TableHead>Decorrenza switching</TableHead>
                        <TableHead>Prima fattura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Entro il 10 del mese M</TableCell>
                        <TableCell>1° del mese M+1</TableCell>
                        <TableCell>Circa mese M+2</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Dopo il 10 del mese M</TableCell>
                        <TableCell>1° del mese M+2</TableCell>
                        <TableCell>Circa mese M+3</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">📋 Esempio pratico</p>
                  <p className="text-sm text-muted-foreground">
                    Contratti firmati a giugno 2026, inviati al grossista entro il 5 luglio. Grossista carica nel SII entro il 10 luglio. Decorrenza: 1° agosto. Prima fattura: settembre. Primo incasso: settembre/ottobre. <strong>Lag totale firma → incasso: circa 90-120 giorni.</strong>
                  </p>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Diritto di ripensamento</p>
                <p className="text-sm text-muted-foreground">
                  Per contratti firmati fuori sede o online, il cliente ha <strong>14 giorni</strong> di diritto di ripensamento. La rinuncia esplicita consente al grossista di caricare la SE1 immediatamente.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Conflitti SII */}
            <AccordionItem value="conflitti" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">3. Gerarchia SII sui conflitti tra richieste concorrenti</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Quando due operatori presentano richieste di switching per lo stesso POD con la stessa decorrenza, il SII applica una gerarchia a tre livelli (Specifiche Tecniche AU v3.1, §5.1.1.1).
                </p>

                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criterio</TableHead>
                        <TableHead>Condizione</TableHead>
                        <TableHead>Chi vince</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">1° — Data contratto</TableCell>
                        <TableCell className="text-sm">Decorrenza uguale, date contratto diverse</TableCell>
                        <TableCell className="text-sm font-semibold text-primary">Data contratto PIÙ RECENTE</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">2° — First-in wins</TableCell>
                        <TableCell className="text-sm">Decorrenza e data contratto uguali</TableCell>
                        <TableCell className="text-sm font-semibold text-primary">SE1 inviata PER PRIMA</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">3° — Decorrenza anticipata</TableCell>
                        <TableCell className="text-sm">Nuova richiesta con decorrenza precedente</TableCell>
                        <TableCell className="text-sm font-semibold text-primary">Nuova (se data contratto più recente)</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold text-destructive mb-1">⚠️ Attenzione</p>
                  <p className="text-sm text-muted-foreground">
                    Un cliente che firma con te oggi, poi firma con un concorrente domani, è un cliente perso. Il concorrente ha la data contratto più recente e vince automaticamente, indipendentemente da chi carica prima la SE1.
                  </p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">🛡️ Contromisura chiave</p>
                  <p className="text-sm text-muted-foreground">
                    La <strong>welcome call immediata</strong> (entro 24h dalla firma) è lo strumento più importante: conferma volontà, rileva richieste concorrenti, consolida il rapporto.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. KO e timeline */}
            <AccordionItem value="ko-timeline" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">4. Le cinque categorie di KO e la timeline dalla firma all'incasso</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria KO</TableHead>
                        <TableHead>Motivi specifici</TableHead>
                        <TableHead className="text-right">Peso stimato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Errori anagrafica / POD</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Codice POD errato, CF non corrispondente</TableCell>
                        <TableCell className="text-right">~40%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Morosità vecchio fornitore</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Fornitura sospesa, CMOR attivo</TableCell>
                        <TableCell className="text-right">~25%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">POD non commutabile</TableCell>
                        <TableCell className="text-sm text-muted-foreground">POD disattivato, switching in corso</TableCell>
                        <TableCell className="text-right">~20%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Ripensamento / recesso</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Diritto esercitato, welcome call KO</TableCell>
                        <TableCell className="text-right">~10%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Turismo energetico</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Troppi switching recenti, blacklist</TableCell>
                        <TableCell className="text-right">~5%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Timeline completa: dalla firma al primo incasso</p>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead className="text-right">POD</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Giugno 2026</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Firme contrattuali con rinuncia ripensamento</TableCell>
                        <TableCell className="text-right">100</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">29-30 luglio</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Invio dossier al grossista → caricamento SII</TableCell>
                        <TableCell className="text-right">100 inviati</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">SII</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Elaborazione: 70 OK, 30 KO definitivi</TableCell>
                        <TableCell className="text-right">70 ok / 30 ko</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">1° agosto</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Switch effettivo. POD registrati sotto il tuo brand</TableCell>
                        <TableCell className="text-right">70</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Settembre</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Prime fatture emesse per consumi di agosto</TableCell>
                        <TableCell className="text-right">70</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Set/Ott</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Primo incasso. Lag totale: 90-120 giorni</TableCell>
                        <TableCell className="text-right">70</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. Dinamica Switch-Out */}
            <AccordionItem value="churn" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">5. Dinamica degli switch-out: coorte, churn e decadimento</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Definizione di coorte</p>
                  <p className="text-sm text-muted-foreground">
                    Una coorte è l'insieme dei POD entrati in fornitura in un determinato mese M. Ogni coorte segue nel tempo un proprio profilo di decadimento determinato dalle percentuali di churn mensili. Lavorare per coorti è necessario perché le percentuali di churn dipendono dall'<strong>anzianità del cliente</strong>, non dalla data di calendario.
                  </p>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profilo di churn per coorte</p>
                <p className="text-sm text-muted-foreground">Le percentuali sono strutturate in due fasi:</p>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li><strong>Fase iniziale (mesi 1–3)</strong>: churn più elevato, fissato individualmente per ciascun mese</li>
                  <li><strong>Fase di regime (dal mese 4)</strong>: churn(N) = churn(N-1) × decay_factor, producendo una curva decrescente</li>
                </ul>

                <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs space-y-1">
                  <p>churn_rate(mese 1) = tasso_mese_1 (configurato)</p>
                  <p>churn_rate(mese 2) = tasso_mese_2 (configurato)</p>
                  <p>churn_rate(mese 3) = tasso_mese_3 (configurato)</p>
                  <p>churn_rate(mese N) = churn_rate(N-1) × decay_factor  [N ≥ 4]</p>
                  <p className="mt-2 border-t border-border pt-2">recessi(mese N) = POD_attivi_coorte(N) × churn_rate(N)</p>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">⚠️ Importante</p>
                  <p className="text-sm text-muted-foreground">
                    La percentuale si applica ai <strong>POD ancora attivi</strong>, non alla dimensione originale della coorte. Il denominatore si riduce mese dopo mese.
                  </p>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Il ritardo regolatorio SII (2 mesi)</p>
                <p className="text-sm text-muted-foreground">
                  Tra il recesso e lo switch-out effettivo trascorrono 2 mesi. Durante questo periodo il cliente è ancora attivo e fatturato.
                </p>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fase</TableHead>
                        <TableHead>Evento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Mese M</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Il cliente firma il recesso</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Mese M+1</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Pratica SII in lavorazione; cliente ancora in fornitura</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Mese M+2</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Switch-out effettivo; POD esce dalla base attiva</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 6. Aggregazione multi-coorte e POD fatturati */}
            <AccordionItem value="aggregazione" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">6. Aggregazione multi-coorte, POD attivi vs POD fatturati</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  In un business attivo, ogni mese arriva una nuova coorte. Gli switch-out osservati in un mese sono la somma dei contributi di tutte le coorti attive, ciascuna al proprio mese di vita.
                </p>

                <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs space-y-1">
                  <p>switch_out_totali(M) = Σ switch_out_effettivi_coorte_k(M)</p>
                  <p>POD_attivi(M) = POD_attivi(M-1) + attivazioni(M) − switch_out_effettivi(M)</p>
                  <p>switch_out_effettivi(M) = recessi_registrati(M-2)</p>
                  <p>POD_fatturati(M) = POD attivi la cui coorte ha almeno 2 mesi di anzianità</p>
                </div>

                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scenario</TableHead>
                        <TableHead>Condizione</TableHead>
                        <TableHead>Effetto sulla base POD</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">Crescita</TableCell>
                        <TableCell className="text-sm">Attivazioni {'>'} Switch-out</TableCell>
                        <TableCell className="text-sm">La base aumenta ogni mese</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Stabilità (regime)</TableCell>
                        <TableCell className="text-sm">Attivazioni ≈ Switch-out</TableCell>
                        <TableCell className="text-sm">Base costante</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-destructive">Contrazione</TableCell>
                        <TableCell className="text-sm">Attivazioni {'<'} Switch-out</TableCell>
                        <TableCell className="text-sm">La base diminuisce</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">POD attivi vs POD fatturati</p>
                  <p className="text-sm text-muted-foreground">
                    I POD attivati in un dato mese iniziano a consumare immediatamente, ma il primo ciclo di fatturazione si apre solo dal terzo mese dall'attivazione. Nei primi mesi della simulazione i POD fatturati sono quindi inferiori ai POD attivi.
                  </p>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Ciclo completo dal contratto allo switch-out</p>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mese</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Effetto sul modello</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">M</TableCell>
                        <TableCell className="text-sm">Firma contratto</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Incremento contrattiNuovi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">M+1</TableCell>
                        <TableCell className="text-sm">Invio richiesta SII</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Pratica in lavorazione</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">M+2</TableCell>
                        <TableCell className="text-sm">Attivazione POD</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Incremento POD attivi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">M+2 in poi</TableCell>
                        <TableCell className="text-sm">Fatturazione mensile</TableCell>
                        <TableCell className="text-sm text-muted-foreground">POD incluso in clientiFatturati</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">M+K</TableCell>
                        <TableCell className="text-sm">Cliente firma recesso</TableCell>
                        <TableCell className="text-sm text-muted-foreground">Recesso registrato</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">M+K+1</TableCell>
                        <TableCell className="text-sm">Pratica SII in lavorazione</TableCell>
                        <TableCell className="text-sm text-muted-foreground">POD ancora attivo e fatturato</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">M+K+2</TableCell>
                        <TableCell className="text-sm">Switch-out effettivo</TableCell>
                        <TableCell className="text-sm text-muted-foreground">POD esce da base attiva</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 7. Dati di mercato */}
            <AccordionItem value="benchmark" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">7. Benchmark di mercato e stagionalità</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Anno</TableHead>
                        <TableHead className="text-right">Tasso annuo</TableHead>
                        <TableHead className="text-right">Mensile equiv.</TableHead>
                        <TableHead>Fonte</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>2023</TableCell>
                        <TableCell className="text-right">18,9%</TableCell>
                        <TableCell className="text-right">~1,7%</TableCell>
                        <TableCell>ARERA 2024</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>2024</TableCell>
                        <TableCell className="text-right">23,8%</TableCell>
                        <TableCell className="text-right">~2,2%</TableCell>
                        <TableCell>ARERA 2025</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>2025-2026 (stima)</TableCell>
                        <TableCell className="text-right">~26-28%</TableCell>
                        <TableCell className="text-right">~2,4-2,6%</TableCell>
                        <TableCell>Elaborazione</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <p className="text-xs text-muted-foreground italic">Formula: churn mensile = 1 − (1 − churn annuo)^(1/12)</p>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Benchmark per segmento</p>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Segmento</TableHead>
                        <TableHead className="text-right">Churn annuo</TableHead>
                        <TableHead className="text-right">Churn mensile</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Domestici 45-70 anni</TableCell>
                        <TableCell className="text-right">10-14%</TableCell>
                        <TableCell className="text-right">~0,9-1,2%</TableCell>
                        <TableCell className="text-emerald-600 dark:text-emerald-400">Target ideale</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Domestici 18-44 anni</TableCell>
                        <TableCell className="text-right">28-35%</TableCell>
                        <TableCell className="text-right">~2,7-3,3%</TableCell>
                        <TableCell className="text-destructive">Segmento rischioso</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Business / PMI</TableCell>
                        <TableCell className="text-right">8-15%</TableCell>
                        <TableCell className="text-right">~0,7-1,3%</TableCell>
                        <TableCell className="text-primary">Più fedele, più margine</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3">Stagionalità</p>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  <li><strong>Marzo/Aprile</strong> — picco principale (~3,5-4%): rinnovi post-bolletta invernale</li>
                  <li><strong>Settembre/Ottobre</strong> (~2,5-3%): ripresa post-estiva</li>
                  <li><strong>Novembre/Dicembre</strong> (~3-3,5%): pre-inverno, clienti cercano prezzo fisso</li>
                  <li><strong>Luglio/Agosto</strong> — minimo stagionale ({'<'}1%): momento migliore per avviare relazione</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* 8. Switching lampo */}
            <AccordionItem value="lampo" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">8. Switching lampo dal 1° dicembre 2026</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Delibera ARERA 58/2026/R/eel del 3 marzo 2026.
                </p>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Caratteristica</TableHead>
                        <TableHead>Dettaglio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Entrata in vigore</TableCell>
                        <TableCell>1° dicembre 2026</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Fase tecnica SII</TableCell>
                        <TableCell>24 ore lavorative</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Processo completo</TableCell>
                        <TableCell>Fino a 5 giorni lavorativi</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Beneficiari</TableCell>
                        <TableCell>Solo clienti domestici non morosi. <strong>PMI escluse.</strong></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Decorrenza</TableCell>
                        <TableCell>Qualsiasi giorno del mese (non più vincolata al 1°)</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 9. Glossario */}
            <AccordionItem value="glossario" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">9. Glossario tecnico</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Termine</TableHead>
                        <TableHead>Definizione</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ['SII', 'Sistema Informativo Integrato — piattaforma gestita da Acquirente Unico per tutti i flussi informativi del mercato energetico.'],
                        ['RCU', 'Registro Centrale Ufficiale — banca dati del SII con l\'elenco di tutti i POD nazionali e i dati identificativi dei clienti.'],
                        ['POD', 'Point of Delivery — codice univoco del punto fisico di fornitura (es. IT001E...).'],
                        ['SE1', 'Flusso tecnico SII per la richiesta di switching. Può essere inviato solo dall\'UDD.'],
                        ['DATA_CONTRATTO', 'Campo obbligatorio della SE1: data di sottoscrizione del contratto. Criterio primario per conflitti.'],
                        ['UDD', 'Utente del Dispacciamento — unico soggetto abilitato a inviare la SE1.'],
                        ['CC', 'Controparte Commerciale — venditore con contratto col cliente finale. Il reseller si accredita al SII come CC.'],
                        ['Last-contract wins', 'Criterio primario SII: a parità di decorrenza, vince la SE1 con DATA_CONTRATTO più recente.'],
                        ['First-in wins', 'Criterio secondario SII: a parità di decorrenza e data contratto, vince la SE1 pervenuta per prima.'],
                        ['CMOR', 'Corrispettivo di Morosità — indennizzo richiedibile 6-12 mesi dallo switch-out in caso di mancato pagamento.'],
                        ['Churn rate', 'Tasso mensile di abbandono. Formula: 1−(1−churn_annuo)^(1/12). Benchmark 2026: ~2,0-2,5% medio domestici.'],
                        ['Rolling batch', 'Invio al grossista ogni giorno dei dossier del giorno precedente. Riduce finestra di vulnerabilità.'],
                        ['Turismo energetico', 'Clienti morosi che cambiano fornitore per evitare pagamento. Contrastato dal sistema CMOR.'],
                        ['Switching lampo', 'Nuovo processo dal 1° dicembre 2026: SE1 in 24h. Solo domestici non morosi, PMI escluse.'],
                        ['Pre-check', 'Servizio SII per verificare contendibilità di un POD prima della richiesta formale.'],
                      ].map(([term, def]) => (
                        <TableRow key={term}>
                          <TableCell className="font-medium font-mono text-xs">{term}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{def}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* Bibliografia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Fonti e riferimenti bibliografici
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex gap-3 items-start">
                  <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
                  <div>
                    <p className="text-sm font-medium">KB Switching v1.1</p>
                    <p className="text-xs text-muted-foreground">Metodi PRO — Aprile 2026 — Quadro generale del mercato elettrico liberalizzato, processo di switching, regole operative SII, gerarchia di priorità, gestione KO, switching lampo, glossario tecnico.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
                  <div>
                    <p className="text-sm font-medium">Dinamica degli Switch-Out nel Mercato Libero dell'Energia — Nota Metodologica v1.0</p>
                    <p className="text-xs text-muted-foreground">Metodi RES Builder — Aprile 2026 — Modello per coorte, profilo di churn, ritardo regolatorio SII, aggregazione multi-coorte, POD attivi vs fatturati, formule operative.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Riferimenti normativi</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Delibera ARERA 487/2015/R/eel — Regole operative switching tradizionale</li>
                  <li>• Delibera ARERA 58/2026/R/eel (3 marzo 2026) — Switching lampo in 24h dal 1° dicembre 2026</li>
                  <li>• Specifiche Tecniche Acquirente Unico v3.1, §5.1.1.1 — Gerarchia di priorità per richieste concorrenti (regole 5, 6, 7, 8)</li>
                  <li>• Dati ARERA Relazione Annuale 2024 e 2025 — Tassi di switching aggregati mercato domestico</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
