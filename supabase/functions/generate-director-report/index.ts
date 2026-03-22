import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { financialData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Sei un consulente strategico senior con 20 anni di esperienza nel settore energia italiano (reseller luce e gas, mercato libero).
Devi generare un REPORT DIREZIONALE professionale, completo e dettagliato, destinato al titolare/CEO dell'azienda.
Questo documento sarà usato per presentare il business case al consiglio di amministrazione o a potenziali investitori.

STILE E TONO:
- Scrivi in italiano professionale, chiaro e autorevole
- Ogni dato DEVE essere interpretato, contestualizzato e commentato con benchmark di settore
- Non ripetere semplicemente i numeri: spiega COSA significano, PERCHÉ sono importanti, QUALI rischi/opportunità comportano
- Usa paragrafi articolati (minimo 4-5 frasi per sotto-sezione), non elenchi puntati telegrafici
- Includi confronti con medie di settore dove possibile (margine netto medio reseller: 8-15%, churn medio: 2-4%/mese, CAC medio: €80-150)
- Segnala con ⚠️ le criticità e con ✅ i punti di forza
- Concludi ogni sezione con una frase di sintesi che aiuti il decisore

FORMATO:
- Usa ## per i titoli di sezione e ### per le sotto-sezioni
- Usa **grassetto** per evidenziare KPI e concetti chiave
- Usa elenchi puntati solo per le raccomandazioni operative
- Il report deve essere lungo e approfondito (almeno 2500 parole)`;

    const userPrompt = `Genera un Report Direzionale completo e approfondito basato sui seguenti dati del progetto reseller energia.

--- DATI PROGETTO: ${financialData.projectName} ---
Tipologia: ${financialData.commodityType || 'Luce e Gas'}

RICAVI E MARGINI (14 mesi di simulazione):
- Fatturato totale (bollette emesse): €${financialData.fatturatoTotale?.toLocaleString('it-IT') || '0'}
- Margine Reseller (CCV + Spread): €${financialData.margineReseller?.toLocaleString('it-IT') || '0'}
- Margine Lordo: €${financialData.margineLordo?.toLocaleString('it-IT') || '0'} (${financialData.margineLordoPerc?.toFixed(1) || '0'}%)
- Margine Contributivo: €${financialData.margineContributivo?.toLocaleString('it-IT') || '0'} (${financialData.margineContributivoPerc?.toFixed(1) || '0'}%)
- Margine Netto: €${financialData.margineNetto?.toLocaleString('it-IT') || '0'} (${financialData.margineNettoPerc?.toFixed(1) || '0'}%)

STRUTTURA COSTI:
- Costi operativi totali: €${financialData.costiOperativi?.toLocaleString('it-IT') || '0'}
- Costi commerciali (provvigioni): €${financialData.costiCommerciali?.toLocaleString('it-IT') || '0'}
- Costi passanti (energia+trasporto+oneri): €${financialData.costiPassanti?.toLocaleString('it-IT') || '0'}
- Costi per tipo: Commerciali €${financialData.costiPerTipo?.commercial || 0}, Strutturali €${financialData.costiPerTipo?.structural || 0}, Diretti €${financialData.costiPerTipo?.direct || 0}, Indiretti €${financialData.costiPerTipo?.indirect || 0}

PORTAFOGLIO CLIENTI:
- Contratti totali sottoscritti: ${financialData.contrattiTotali || 0}
- Clienti attivi a fine periodo: ${financialData.clientiAttivi || 0}
- Piano contratti mensili: ${JSON.stringify(financialData.parametriSimulazione?.contrattiMensili || [])}

CASH FLOW E INVESTIMENTI:
- Totale incassato: €${financialData.incassato?.toLocaleString('it-IT') || '0'}
- Totale insoluti: €${financialData.insoluti?.toLocaleString('it-IT') || '0'}
- Investimento iniziale (setup): €${financialData.investimentoIniziale?.toLocaleString('it-IT') || '0'}
- Saldo cassa finale (14 mesi): €${financialData.saldoFinale?.toLocaleString('it-IT') || '0'}
- Mese break-even (primo saldo positivo): ${financialData.mesePrimoPositivo || 'Non raggiunto'}
- Massima esposizione finanziaria: €${financialData.massimaEsposizione?.toLocaleString('it-IT') || '0'} (${financialData.meseEsposizioneMassima || 'N/D'})
- ROI a 14 mesi: ${financialData.roi?.toFixed(1) || '0'}%

PARAMETRI SIMULAZIONE:
- PUN (prezzo energia): €${financialData.parametriSimulazione?.punPerKwh || 0}/kWh
- Spread reseller: €${financialData.parametriSimulazione?.spreadPerKwh || 0}/kWh
- CCV mensile per cliente: €${financialData.parametriSimulazione?.ccvMensile || 0}
- Consumo medio mensile: ${financialData.parametriSimulazione?.consumoMedioMensile || 0} kWh
- Tasso attivazione: ${financialData.parametriSimulazione?.tassoAttivazione || 0}%
- Churn mensile: ${financialData.parametriSimulazione?.tassoChurn || 0}%
- Tasso insoluti: ${financialData.parametriSimulazione?.tassoInsoluti || 0}%

CANALI DI VENDITA:
${(financialData.canaliVendita || []).map((c: any) => `- ${c.nome} (${c.tipo}): commissione €${c.commissione} ${c.tipoCommissione}, quota ${c.quotaContratti}%, attivazione ${c.tassoAttivazione}%`).join('\n') || 'Nessun canale configurato'}

FLUSSO DI CASSA MENSILE:
${JSON.stringify(financialData.cashFlowMensile || [], null, 1)}
--- FINE DATI ---

Struttura il report con queste sezioni, ciascuna approfondita e ben argomentata:

## 1. Sintesi Esecutiva per il Management
Un executive summary di 8-10 frasi che catturi: stato del progetto, risultati chiave, fattibilità, fabbisogno di capitale, decisioni urgenti. Deve bastare da solo per capire se il progetto è valido.

## 2. Il Modello di Business del Reseller
Spiega in dettaglio come funziona il modello reseller energia: cosa sono CCV e Spread, come si genera il margine, qual è la differenza tra fatturato lordo e margine proprio. Commenta se i parametri scelti (CCV, Spread) sono competitivi rispetto al mercato. Contestualizza con i benchmark di settore.

## 3. Analisi del Portafoglio Clienti
Commenta la curva di acquisizione (contratti mese per mese), il tasso di attivazione, l'impatto del churn sulla base clienti. Calcola e commenta il Lifetime Value implicito e il costo di acquisizione per cliente.

## 4. Performance Economica e Margini
Analisi dettagliata di ogni livello di margine (lordo, contributivo, netto). Spiega cosa erode il margine a ogni step. Confronta con i benchmark del settore reseller (margine netto tipico 8-15%). Identifica le leve per migliorare la redditività.

## 5. Struttura e Ottimizzazione dei Costi
Analisi della ripartizione tra costi passanti, commerciali e strutturali. Peso di ciascuna categoria sul totale. Dove ci sono inefficienze? Cosa si può ottimizzare? Commenta il rapporto costi fissi/variabili.

## 6. Analisi della Liquidità e Fabbisogno Finanziario
Il cuore del report per un investitore. Commenta: curva di cassa, mesi di esposizione negativa, capitale necessario, payback. Spiega perché il cash flow è diverso dal margine (dilazioni incasso, depositi, investimenti). ⚠️ Segnala i mesi critici.

## 7. Efficacia dei Canali di Vendita
Per ogni canale: costo per acquisizione, tasso di conversione, contributo al volume. Quali canali sono più efficienti? Raccomandazioni per il mix ottimale.

## 8. Analisi dei Rischi e Scenari
Identifica almeno 5 rischi concreti dai dati (margini sottili, concentrazione canali, esposizione, churn, insoluti, volatilità PUN). Per ciascuno indica probabilità, impatto e mitigazione.

## 9. Raccomandazioni Strategiche Prioritizzate
5-7 azioni concrete ordinate per priorità e impatto atteso. Per ciascuna indica: cosa fare, perché, impatto stimato, timeline.

## 10. Conclusione e Giudizio di Fattibilità
Valutazione finale: il progetto è fattibile? A quali condizioni? Qual è il verdetto per un investitore razionale? Usa un rating (es. ✅ Fattibile con riserve, ⚠️ Necessita interventi, ❌ Non raccomandato).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite richieste superato, riprova tra poco." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti. Aggiungi crediti al workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Errore nella generazione del report" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-director-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
