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
    const { sectionId, projectData, projectType = 'generale' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const projectTypeContext: Record<string, string> = {
      solare: 'fotovoltaico e solare termico',
      eolico: 'energia eolica on-shore e off-shore',
      efficienza_energetica: 'efficienza energetica e riqualificazione edifici',
      generale: 'energia e rinnovabili'
    };

    const context = projectTypeContext[projectType] || projectTypeContext.generale;

    const sectionPrompts: Record<string, string> = {
      target_market: `Genera una descrizione dettagliata del mercato target per un'azienda specializzata in ${context}. Includi:
- Segmentazione clientela specifica per ${context} (residenziale, PMI, grandi clienti)
- Dimensione del mercato italiano per ${context}
- Potenziale di crescita settore ${context}
- Caratteristiche demografiche e comportamentali dei clienti interessati a ${context}
- Tendenze di mercato attuali nel settore ${context}`,
      
      acquisition_strategy: `Genera una strategia di acquisizione clienti completa per un'azienda specializzata in ${context}. Includi:
- Tattiche di acquisizione specifiche per ${context}
- Funnel di conversione per servizi ${context}
- Partnership strategiche rilevanti per ${context} (es. installatori, rivenditori, consulenti)
- Programmi referral e incentivi specifici per ${context}
- Strategie di lead generation B2B e B2C ottimizzate per ${context}`,
      
      pricing_strategy: `Genera un piano prezzi dettagliato per servizi ${context}. Includi:
- Struttura tariffaria competitiva specifica per ${context}
- Offerte promozionali per nuovi clienti interessati a ${context}
- Pacchetti servizi ${context} (base, premium, enterprise)
- Sconti volume e incentivi fiscali applicabili a ${context}
- Condizioni di pagamento e modalità di fatturazione per progetti ${context}`,
      
      competitive_positioning: `Genera un'analisi di posizionamento competitivo nel mercato ${context}. Includi:
- Unique Selling Proposition (USP) distintiva per ${context}
- Differenziatori rispetto ai concorrenti nel settore ${context}
- Vantaggi competitivi sostenibili specifici per ${context}
- Barriere all'entrata nel settore ${context}
- Value proposition per diversi segmenti di clientela interessati a ${context}`,
      
      communication_channels: `Genera un mix di canali di comunicazione per un'azienda specializzata in ${context}. Includi:
- Digital marketing ottimizzato per ${context} (SEO, SEM, social media)
- Content marketing specifico per ${context} (blog, guide, case study)
- Email marketing automation per lead nurturing nel settore ${context}
- Eventi e fiere di settore ${context}
- Direct sales e telemarketing per progetti ${context}
- Partnership commerciali strategiche per ${context}`,
      
      budget_allocation: `Genera una proposta di budget marketing per un'azienda specializzata in ${context}. Includi:
- Distribuzione percentuale del budget per canale ottimizzata per ${context}
- KPI target specifici per ogni canale nel settore ${context}
- ROI atteso per investimento marketing in progetti ${context}
- Investimenti mensili e annuali consigliati per promuovere ${context}
- Metriche di performance e ottimizzazione specifiche per il settore ${context}`
    };

    const systemPrompt = `Sei un esperto di marketing strategico specializzato nel settore ${context} in Italia. 
Genera contenuti professionali, dettagliati e specifici per il mercato italiano ${context}.
Usa dati realistici e best practices del settore ${context}.
Scrivi in italiano professionale, usando termini tecnici appropriati per ${context}.`;

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
