import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildProductsSection(prodotti: any[]): string {
  if (!prodotti || prodotti.length === 0) return 'Nessun prodotto configurato (modalità legacy single-product)';
  return prodotti.map((p: any, i: number) => `
PRODOTTO ${i + 1}: "${p.nome}" (Quota contratti: ${p.quotaContratti}%)
  - Canale di vendita: ${p.canaleVendita}
  - Tipo clientela: ${p.tipoCliente} (IVA ${p.ivaPercent}%)
  - CCV mensile: €${p.ccvMensile} | Spread: €${p.spreadPerKwh}/kWh | Altri servizi: €${p.altriServizi}/mese
  - Consumo medio: ${p.consumoMedio} kWh/mese
  - Tasso attivazione: ${p.tassoAttivazione}%
  - Churn: Mese1 ${p.churnMese1}%, Mese2 ${p.churnMese2}%, Mese3 ${p.churnMese3}%, Decay ${p.churnDecay}
  - Incassi: 0gg ${p.incassoMese0}%, 30gg ${p.incassoMese1}%, 60gg ${p.incassoMese2}%, 90+gg ${p.incassoMese3Plus}%
  - Tasso insoluti: ${p.tassoInsoluti}%
  → RISULTATI: Fatturato €${p.fatturatoTotale?.toLocaleString('it-IT') || '0'} | Margine €${p.margineTotale?.toLocaleString('it-IT') || '0'} (${p.marginePerc?.toFixed(1) || '0'}%) | Contratti ${p.contrattiTotali} | Clienti attivi finali ${p.clientiAttiviFinali} | Switch-out ${p.switchOutTotali}
`).join('\n');
}

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

    const hasMultiProduct = financialData.prodotti && financialData.prodotti.length > 0;

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

IMPORTANTE — STRUTTURA MULTI-PRODOTTO:
Il business opera con ${hasMultiProduct ? financialData.prodotti.length + ' linee di prodotto distinte' : 'un singolo prodotto'}.
${hasMultiProduct ? 'Per OGNI sezione analitica devi fornire sia il dato AGGREGATO totale sia il DETTAGLIO per ciascuna linea di prodotto, evidenziando le differenze di performance, marginalità e rischio tra le diverse offerte.' : ''}

FORMATO:
- Usa ## per i titoli di sezione e ### per le sotto-sezioni
- Usa **grassetto** per evidenziare KPI e concetti chiave
- Usa elenchi puntati solo per le raccomandazioni operative
- Il report deve essere lungo e approfondito (almeno 3000 parole)`;

    const userPrompt = `Genera un Report Direzionale completo basato sui seguenti dati del progetto reseller energia.

--- DATI PROGETTO: ${financialData.projectName} ---
Tipologia: ${financialData.commodityType || 'Luce e Gas'}

=== LINEE DI PRODOTTO ===
${buildProductsSection(financialData.prodotti)}

=== RISULTATI AGGREGATI (14 mesi) ===
RICAVI E MARGINI:
- Fatturato totale: €${financialData.fatturatoTotale?.toLocaleString('it-IT') || '0'}
- Fatturato netto (imponibile): €${financialData.fatturatoNetto?.toLocaleString('it-IT') || '0'}
- Ricavi commerciali (CCV+Spread+Servizi): €${financialData.ricaviCommerciali?.toLocaleString('it-IT') || '0'}
- Costo grossista (energia+POD): €${financialData.costoEnergiaGrossista?.toLocaleString('it-IT') || '0'}
- Margine Commerciale Lordo: €${financialData.margineCommercialeLordo?.toLocaleString('it-IT') || '0'} (${financialData.margineCommLordoPerc?.toFixed(1) || '0'}%)
- Margine Contributivo: €${financialData.margineContributivo?.toLocaleString('it-IT') || '0'} (${financialData.margineContributivoPerc?.toFixed(1) || '0'}%)
- Margine Netto: €${financialData.margineNetto?.toLocaleString('it-IT') || '0'} (${financialData.margineNettoPerc?.toFixed(1) || '0'}%)

STRUTTURA COSTI:
- Costi operativi totali: €${financialData.costiOperativi?.toLocaleString('it-IT') || '0'}
- Costi commerciali (provvigioni): €${financialData.costiCommerciali?.toLocaleString('it-IT') || '0'}
- Costi passanti totali: €${financialData.costiPassanti?.toLocaleString('it-IT') || '0'}
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
- Mese break-even: ${financialData.mesePrimoPositivo || 'Non raggiunto'}
- Massima esposizione finanziaria: €${financialData.massimaEsposizione?.toLocaleString('it-IT') || '0'} (${financialData.meseEsposizioneMassima || 'N/D'})
- ROI a 14 mesi: ${financialData.roi?.toFixed(1) || '0'}%

PARAMETRI GLOBALI (condivisi tra i prodotti):
- PUN: €${financialData.parametriSimulazione?.punPerKwh || 0}/kWh
- Spread grossista: €${financialData.parametriSimulazione?.spreadGrossistaPerKwh ?? 0.008}/kWh
- Gestione POD/PDR: €${financialData.parametriSimulazione?.gestionePodPerPod ?? 2.50}/pod/mese
- Deposito cauzionale: ${financialData.parametriSimulazione?.depositoMesi ?? 3} mesi (${financialData.parametriSimulazione?.depositoPercentualeAttivazione ?? 85}% clienti)
- Dispacciamento: €${financialData.parametriSimulazione?.dispacciamentoPerKwh || 0.01}/kWh
- Trasporto: fissa €${financialData.parametriSimulazione?.trasportoQuotaFissaAnno || 23}/anno, potenza €${financialData.parametriSimulazione?.trasportoQuotaPotenzaKwAnno || 22}/kW/anno (${financialData.parametriSimulazione?.potenzaImpegnataKw || 3} kW), energia €${financialData.parametriSimulazione?.trasportoQuotaEnergiaKwh || 0.008}/kWh
- Oneri ASOS: €${financialData.parametriSimulazione?.oneriAsosKwh || 0.025}/kWh | ARIM: €${financialData.parametriSimulazione?.oneriArimKwh || 0.007}/kWh
- Accise: €${financialData.parametriSimulazione?.acciseKwh || 0.0227}/kWh

COSTI PASSANTI TOTALI (14 mesi):
- Dispacciamento: €${financialData.costiPassantiDettaglio?.dispacciamento?.toLocaleString('it-IT') || '0'}
- Trasporto: €${financialData.costiPassantiDettaglio?.trasporto?.toLocaleString('it-IT') || '0'}
- Oneri di sistema: €${financialData.costiPassantiDettaglio?.oneriSistema?.toLocaleString('it-IT') || '0'}
- Accise: €${financialData.costiPassantiDettaglio?.accise?.toLocaleString('it-IT') || '0'}
- Costo energia grossista: €${financialData.costoEnergiaTotale?.toLocaleString('it-IT') || '0'}
- Gestione POD totale: €${financialData.costoGestionePodTotale?.toLocaleString('it-IT') || '0'}

CANALI DI VENDITA:
${(financialData.canaliVendita || []).map((c: any) => `- ${c.nome} (${c.tipo}): commissione €${c.commissione} ${c.tipoCommissione}, quota ${c.quotaContratti}%, attivazione ${c.tassoAttivazione}%`).join('\n') || 'Nessun canale configurato'}

FLUSSO DI CASSA MENSILE:
${JSON.stringify(financialData.cashFlowMensile || [], null, 1)}
--- FINE DATI ---

Struttura il report con queste sezioni, ciascuna approfondita e ben argomentata:

## 1. Sintesi Esecutiva per il Management
Executive summary di 8-10 frasi: stato del progetto, risultati chiave, fattibilità, fabbisogno di capitale, decisioni urgenti.
${hasMultiProduct ? 'Evidenzia il MIX di prodotti e la strategia multi-offerta.' : ''}

## 2. Il Modello di Business del Reseller
Come funziona il modello reseller energia: CCV, Spread, margine, differenza tra fatturato lordo e margine proprio. Benchmark di settore.

## 3. Portafoglio Prodotti e Strategia Commerciale
${hasMultiProduct ? `SEZIONE CRITICA: Per ciascuno dei ${financialData.prodotti.length} prodotti (${financialData.prodotti.map((p: any) => p.nome).join(', ')}), dettaglia:
- Posizionamento e target (tipo clientela, consumo medio)
- Marginalità unitaria (CCV + Spread + Servizi vs benchmark)
- Canale di vendita associato e relativa efficienza
- Performance: fatturato, margine, clienti attivi, churn
- Confronto incrociato tra i prodotti: quale rende di più? quale ha churn più alto? quale ha il rapporto margine/rischio migliore?` : 'Descrivi il prodotto unico offerto con i suoi parametri di margine e posizionamento.'}

## 4. Dettaglio delle Ipotesi Operative
### 4.1 Ipotesi sulla Clientela (per prodotto)
${hasMultiProduct ? 'Per OGNI prodotto: contratti (% del totale), consumo medio, tasso attivazione, curva di churn (mese1/2/3 + decay), tasso insoluti. Commenta le differenze tra prodotti.' : 'Piano contratti, consumo medio, tasso attivazione, churn, insoluti.'}

### 4.2 Ipotesi sui Ricavi Unitari (per prodotto)
${hasMultiProduct ? 'Per OGNI prodotto: CCV, spread, servizi aggiuntivi. Calcola il ricavo medio mensile per cliente per ciascun prodotto e confronta.' : 'CCV, spread, servizi. Ricavo medio per cliente.'}

### 4.3 Ipotesi sui Costi Passanti e Regolati (globali)
Elenca TUTTE le componenti con valori esatti. Sono condivise tra i prodotti.

### 4.4 Ipotesi sui Costi del Grossista
Spread grossista, gestione POD, deposito cauzionale.

### 4.5 Ipotesi sugli Incassi e Dilazioni (per prodotto)
${hasMultiProduct ? 'Per OGNI prodotto: distribuzione incassi (0/30/60/90+ gg). Commenta le differenze e l\'impatto sulla liquidità.' : 'Distribuzione incassi.'}

## 5. Analisi del Portafoglio Clienti
${hasMultiProduct ? 'Analisi AGGREGATA e poi PER PRODOTTO: curva acquisizione, attivazione, churn, LTV implicito. Identifica il prodotto con miglior retention e quello più problematico.' : 'Curva acquisizione, attivazione, churn, LTV.'}

## 6. Performance Economica e Margini
${hasMultiProduct ? 'Prima il dato AGGREGATO, poi il BREAKDOWN per prodotto. Confronta i margini % tra prodotti. Identifica il prodotto "star" e quello "underperformer".' : 'Analisi margini.'}

## 7. Struttura e Ottimizzazione dei Costi
Ripartizione costi passanti/commerciali/strutturali. Inefficienze e ottimizzazioni.

## 8. Analisi della Liquidità e Fabbisogno Finanziario
Curva di cassa, esposizione, payback, mesi critici.

## 9. Efficacia dei Canali di Vendita
${hasMultiProduct ? 'Analizza la relazione prodotto-canale: ogni prodotto è legato a un canale specifico. Valuta CAC, conversione e contributo di ciascuna coppia prodotto/canale.' : 'CAC per canale, conversione, contributo.'}

## 10. Analisi dei Rischi e Scenari
Almeno 5 rischi concreti con probabilità, impatto, mitigazione.
${hasMultiProduct ? 'Includi rischi specifici per la strategia multi-prodotto (cannibalizzazione, complessità gestionale, rischio concentrazione su un prodotto).' : ''}

## 11. Raccomandazioni Strategiche Prioritizzate
5-7 azioni con priorità, impatto, timeline.
${hasMultiProduct ? 'Includi raccomandazioni specifiche sul mix di prodotti: espandere, ridurre, riposizionare.' : ''}

## 12. Conclusione e Giudizio di Fattibilità
Rating: ✅ Fattibile / ⚠️ Con riserve / ❌ Non raccomandato.`;

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
