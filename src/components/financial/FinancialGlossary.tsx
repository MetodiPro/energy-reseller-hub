import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GlossaryEntry {
  term: string;
  definition: string;
  example?: string;
}

const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    term: 'Fatturato',
    definition: 'Il totale di tutto ciò che il reseller fattura ai clienti finali. Include sia la parte che resta al reseller (il margine) sia quella che viene girata al grossista e al distributore (i costi passanti).',
    example: 'Se hai 100 clienti e ogni bolletta è di €200, il fatturato mensile è €20.000.',
  },
  {
    term: 'Margine Lordo',
    definition: 'Quanto resta in tasca al reseller dopo aver sottratto dal fatturato tutti i costi passanti (energia dal grossista, distribuzione, oneri di sistema, accise). È il vero "guadagno grezzo" su cui contare.',
    example: 'Se fatturi €20.000 e i costi passanti sono €17.000, il margine lordo è €3.000 (15%).',
  },
  {
    term: 'Margine Netto',
    definition: 'Quanto resta dopo aver sottratto dal margine lordo anche tutti i costi operativi dell\'azienda (stipendi, affitti, software, marketing, consulenze). Se è positivo, il progetto guadagna. Se è negativo, perde soldi.',
    example: 'Se il margine lordo è €3.000 ma le spese operative sono €4.000, il margine netto è -€1.000 (in perdita).',
  },
  {
    term: 'Break-Even Point (BEP)',
    definition: 'Il livello minimo di fatturato necessario per coprire tutti i costi. Sotto il BEP il progetto perde soldi, sopra inizia a guadagnare. Si calcola dividendo i costi operativi per la percentuale di margine lordo.',
    example: 'Se i costi operativi sono €5.000/mese e il margine lordo è il 15%, servono almeno €33.333 di fatturato mensile.',
  },
  {
    term: 'Costi Passanti in Fattura',
    definition: 'Tutte le componenti della bolletta che il reseller addebita al cliente e gira a terzi: materia energia (PUN + dispacciamento), trasporto rete, oneri di sistema (ASOS+ARIM) e accise. Rappresentano il volume d\'affari gestito, non un guadagno. Questa voce appare nel Conto Economico (Panoramica).',
    example: 'Se la bolletta è €200, circa €170 (85%) sono costi passanti che vanno al grossista/distributore.',
  },
  {
    term: 'Costo Energia dal Grossista (Cash Flow)',
    definition: 'Nel Cash Flow, la colonna "Energia Grossista" indica solo il costo dell\'energia acquistata dal grossista (PUN + spread grossista × kWh). Non include trasporto, oneri e accise, che sono contabilizzati separatamente nei Flussi Fiscali. Questo valore è diverso dai "Costi Passanti in Fattura" della Panoramica.',
    example: 'Se il PUN è 0.12 €/kWh e lo spread grossista è 0.005 €/kWh, il costo energia per 200 kWh è €25.',
  },
  {
    term: 'Costi Operativi',
    definition: 'Le spese reali dell\'azienda per funzionare: stipendi del personale, affitto ufficio, software e piattaforme, campagne marketing, consulenti, commercialisti, ecc. Sono i costi che il margine lordo deve coprire per generare profitto.',
    example: 'Personale €2.000 + Software €500 + Marketing €1.000 + Commercialista €300 = €3.800/mese di costi operativi.',
  },
  {
    term: 'CCV (Commercializzazione e Vendita)',
    definition: 'Una delle tre componenti controllabili dal reseller nella bolletta. È un importo fisso mensile che il reseller applica a ogni cliente come compenso per il servizio di vendita e assistenza.',
    example: 'Se il CCV è €18/mese e hai 100 clienti, guadagni €1.800/mese solo dalla CCV.',
  },
  {
    term: 'Spread',
    definition: 'Ricarico variabile che il reseller applica sul prezzo dell\'energia (PUN). Si misura in €/kWh e rappresenta la differenza tra il prezzo a cui vendi e il prezzo a cui compri l\'energia.',
    example: 'Se lo spread è 0.028 €/kWh e un cliente consuma 220 kWh/mese, lo spread genera €6.16/mese per quel cliente.',
  },
  {
    term: 'PUN (Prezzo Unico Nazionale)',
    definition: 'Il prezzo all\'ingrosso dell\'energia elettrica in Italia, determinato dal mercato. Il reseller compra l\'energia a un prezzo basato sul PUN e la rivende ai clienti applicando il suo spread.',
  },
];

export const FinancialGlossary = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Glossario Finanziario
              </span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid gap-3 md:grid-cols-2">
              {GLOSSARY_ENTRIES.map((entry) => (
                <div key={entry.term} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <p className="font-semibold text-sm text-primary">{entry.term}</p>
                  <p className="text-xs text-muted-foreground">{entry.definition}</p>
                  {entry.example && (
                    <p className="text-xs italic text-muted-foreground/80 border-t border-border/50 pt-1 mt-1">
                      📌 {entry.example}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
