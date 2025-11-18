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
    const { sectionId, projectData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const sectionPrompts: Record<string, string> = {
      target_market: `Genera una descrizione dettagliata del mercato target per un'azienda nel settore energia. Includi:
- Segmentazione clientela (residenziale, PMI, grandi clienti)
- Dimensione del mercato italiano energia
- Potenziale di crescita settore energie rinnovabili
- Caratteristiche demografiche e comportamentali dei clienti
- Tendenze di mercato attuali nel settore energia`,
      
      acquisition_strategy: `Genera una strategia di acquisizione clienti completa per un'azienda nel settore energia. Includi:
- Tattiche di acquisizione specifiche per il settore energia
- Funnel di conversione per servizi energetici
- Partnership strategiche (es. installatori, rivenditori)
- Programmi referral e incentivi
- Strategie di lead generation B2B e B2C`,
      
      pricing_strategy: `Genera un piano prezzi dettagliato per servizi energetici. Includi:
- Struttura tariffaria competitiva
- Offerte promozionali per nuovi clienti
- Pacchetti servizi (base, premium, enterprise)
- Sconti volume per grandi clienti
- Condizioni di pagamento e modalità di fatturazione`,
      
      competitive_positioning: `Genera un'analisi di posizionamento competitivo nel mercato energia. Includi:
- Unique Selling Proposition (USP) distintiva
- Differenziatori rispetto ai concorrenti
- Vantaggi competitivi sostenibili
- Barriere all'entrata nel settore
- Value proposition per diversi segmenti di clientela`,
      
      communication_channels: `Genera un mix di canali di comunicazione per un'azienda nel settore energia. Includi:
- Digital marketing (SEO, SEM, social media)
- Content marketing (blog, guide energia)
- Email marketing automation
- Eventi e fiere di settore
- Direct sales e telemarketing
- Partnership commerciali`,
      
      budget_allocation: `Genera una proposta di budget marketing per un'azienda nel settore energia. Includi:
- Distribuzione percentuale del budget per canale
- KPI target per ogni canale
- ROI atteso per investimento marketing
- Investimenti mensili e annuali consigliati
- Metriche di performance e ottimizzazione`
    };

    const systemPrompt = `Sei un esperto di marketing strategico specializzato nel settore energia italiano. 
Genera contenuti professionali, dettagliati e specifici per il mercato italiano dell'energia.
Usa dati realistici e best practices del settore.
Scrivi in italiano professionale, usando termini tecnici appropriati.`;

    const userPrompt = sectionPrompts[sectionId] || `Genera contenuto per la sezione ${sectionId}`;

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
          { role: "user", content: userPrompt }
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
          JSON.stringify({ error: "Crediti esauriti. Aggiungi crediti al workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Errore AI gateway" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-marketing-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
