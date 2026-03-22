import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const systemPrompt = `Sei un consulente strategico senior specializzato nel settore energia italiano (reseller luce e gas).
Devi generare un REPORT DIREZIONALE professionale destinato al titolare/CEO dell'azienda.

REGOLE:
- Scrivi in italiano professionale e chiaro
- Ogni dato deve essere commentato e spiegato: cosa significa, perché è rilevante, quali rischi o opportunità comporta
- Usa un tono autorevole ma accessibile, come se stessi presentando dal vivo al consiglio di amministrazione
- Struttura il report con sezioni chiare e titoli in markdown (##)
- Includi raccomandazioni operative concrete alla fine
- Quando citi numeri, contestualizzali con benchmark di settore dove possibile
- Segnala esplicitamente criticità e punti di forza
- Non limitarti a ripetere i numeri: INTERPRETA, SPIEGA e CONSIGLIA`;

    const userPrompt = `Genera un Report Direzionale completo basato sui seguenti dati del progetto reseller energia.

--- DATI DEL PROGETTO ---
${JSON.stringify(financialData, null, 2)}
--- FINE DATI ---

Struttura il report con le seguenti sezioni:

## 1. Sintesi Esecutiva
Un riassunto di 5-6 frasi che catturi lo stato complessivo del progetto, i risultati chiave e le decisioni urgenti.

## 2. Analisi del Modello di Business
Commenta la struttura dei ricavi (CCV, Spread, servizi), la coerenza dei parametri scelti e come si posiziona rispetto agli standard di mercato.

## 3. Performance Finanziaria
Analizza fatturato, margini (lordo, netto, contributivo), break-even e ROI. Spiega cosa significano questi numeri per la sostenibilità del business.

## 4. Analisi della Liquidità e Cash Flow
Commenta il flusso di cassa, l'esposizione massima, il payback period. Evidenzia i mesi critici e le necessità di capitale.

## 5. Struttura dei Costi
Analizza la ripartizione tra costi passanti, commerciali e strutturali. Identifica dove ci sono margini di ottimizzazione.

## 6. Canali di Vendita e Acquisizione Clienti
Commenta l'efficacia dei canali configurati, il costo di acquisizione per cliente, il tasso di attivazione e churn.

## 7. Rischi e Criticità
Elenca i principali rischi identificati dai dati (margini bassi, dipendenza da un canale, esposizione eccessiva, ecc.).

## 8. Raccomandazioni Strategiche
3-5 azioni concrete e prioritizzate che il management dovrebbe intraprendere.

## 9. Conclusioni
Valutazione finale sulla fattibilità e attrattività dell'investimento.`;

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
