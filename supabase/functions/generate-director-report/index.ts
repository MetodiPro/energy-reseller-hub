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

PARAMETRI SIMULAZIONE (IPOTESI OPERATIVE — dati di input):
- PUN (prezzo energia all'ingrosso): €${financialData.parametriSimulazione?.punPerKwh || 0}/kWh
- Spread reseller al cliente: €${financialData.parametriSimulazione?.spreadPerKwh || 0}/kWh
- CCV mensile per cliente: €${financialData.parametriSimulazione?.ccvMensile || 0}
- Consumo medio mensile per cliente: ${financialData.parametriSimulazione?.consumoMedioMensile || 0} kWh
- Altri servizi mensili per cliente: €${financialData.parametriSimulazione?.altriServiziMensili || 0}
- Tasso attivazione contratti: ${financialData.parametriSimulazione?.tassoAttivazione || 0}%
- Churn mensile (tasso abbandono): ${financialData.parametriSimulazione?.tassoChurn || 0}%
- Tasso insoluti (mancati incassi): ${financialData.parametriSimulazione?.tassoInsoluti || 0}%

IPOTESI INCASSI (dilazioni pagamento):
- Incasso a 0 mesi (immediato): ${financialData.parametriSimulazione?.incassoMese0 || 70}%
- Incasso a 1 mese: ${financialData.parametriSimulazione?.incassoMese1 || 18}%
- Incasso a 2 mesi: ${financialData.parametriSimulazione?.incassoMese2 || 7}%
- Incasso a 3+ mesi: ${financialData.parametriSimulazione?.incassoMese3Plus || 3}%

IPOTESI COSTI GROSSISTA:
- Spread grossista: €${financialData.parametriSimulazione?.spreadGrossistaPerKwh ?? 0.008}/kWh
- Gestione POD/PDR: €${financialData.parametriSimulazione?.gestionePodPerPod ?? 2.50}/pod/mese
- Deposito cauzionale: ${financialData.parametriSimulazione?.depositoMesi ?? 3} mesi di garanzia
- Percentuale clienti con deposito: ${financialData.parametriSimulazione?.depositoPercentualeAttivazione ?? 85}%

IPOTESI COMPONENTI REGOLATE (passthrough):
- Dispacciamento: €${financialData.parametriSimulazione?.dispacciamentoPerKwh || 0.01}/kWh
- Trasporto quota fissa: €${financialData.parametriSimulazione?.trasportoQuotaFissaAnno || 23}/anno
- Trasporto quota potenza: €${financialData.parametriSimulazione?.trasportoQuotaPotenzaKwAnno || 22}/kW/anno (potenza impegnata: ${financialData.parametriSimulazione?.potenzaImpegnataKw || 3} kW)
- Trasporto quota energia: €${financialData.parametriSimulazione?.trasportoQuotaEnergiaKwh || 0.008}/kWh
- Oneri di sistema ASOS: €${financialData.parametriSimulazione?.oneriAsosKwh || 0.025}/kWh
- Oneri di sistema ARIM: €${financialData.parametriSimulazione?.oneriArimKwh || 0.007}/kWh
- Accise: €${financialData.parametriSimulazione?.acciseKwh || 0.0227}/kWh
- IVA: ${financialData.parametriSimulazione?.ivaPercent || 10}%

RISULTATI COMPONENTI PASSANTI (totali 14 mesi):
- Costo energia grossista: €${financialData.costoEnergiaTotale?.toLocaleString('it-IT') || '0'}
- Gestione POD totale: €${financialData.costoGestionePodTotale?.toLocaleString('it-IT') || '0'}
- Dispacciamento totale: €${financialData.costiPassantiDettaglio?.dispacciamento?.toLocaleString('it-IT') || '0'}
- Trasporto totale: €${financialData.costiPassantiDettaglio?.trasporto?.toLocaleString('it-IT') || '0'}
- Oneri di sistema totale: €${financialData.costiPassantiDettaglio?.oneriSistema?.toLocaleString('it-IT') || '0'}
- Accise totale: €${financialData.costiPassantiDettaglio?.accise?.toLocaleString('it-IT') || '0'}

PIANO CONTRATTI MENSILE:
${JSON.stringify(financialData.parametriSimulazione?.contrattiMensili || [])}

CANALI DI VENDITA:
${(financialData.canaliVendita || []).map((c: any) => `- ${c.nome} (${c.tipo}): commissione €${c.commissione} ${c.tipoCommissione}, quota ${c.quotaContratti}%, attivazione ${c.tassoAttivazione}%`).join('\n') || 'Nessun canale configurato'}

FLUSSO DI CASSA MENSILE:
${JSON.stringify(financialData.cashFlowMensile || [], null, 1)}
--- FINE DATI ---

Struttura il report con queste sezioni, ciascuna approfondita e ben argomentata:

## 1. Sintesi Esecutiva per il Management
Un executive summary di 8-10 frasi che catturi: stato del progetto, risultati chiave, fattibilità, fabbisogno di capitale, decisioni urgenti.

## 2. Il Modello di Business del Reseller
Spiega come funziona il modello reseller energia: CCV, Spread, margine, differenza tra fatturato lordo e margine proprio. Benchmark di settore.

## 3. Dettaglio delle Ipotesi Operative
Questa è la sezione PIÙ IMPORTANTE del report. Devi elencare e commentare OGNI singola ipotesi operativa con il suo valore esatto, organizzata così:

### 3.1 Ipotesi sulla Clientela
Elenca con i valori esatti: piano contratti mese per mese (riporta la tabella), consumo medio (kWh), tasso attivazione (%), churn mensile (%), tasso insoluti (%). Per ciascuno: spiega cosa significa, se è realistico vs benchmark di settore, e cosa succede se il valore reale è diverso.

### 3.2 Ipotesi sui Ricavi Unitari
Dettaglia con cifre: PUN (€/kWh), spread reseller (€/kWh), CCV mensile (€), altri servizi (€). Calcola il ricavo medio mensile per cliente risultante e commenta la competitività dell'offerta.

### 3.3 Ipotesi sui Costi Passanti e Regolati
Elenca TUTTE le componenti con valori esatti: dispacciamento (€/kWh), trasporto quota fissa (€/anno), trasporto quota potenza (€/kW/anno), trasporto quota energia (€/kWh), oneri ASOS (€/kWh), oneri ARIM (€/kWh), accise (€/kWh), IVA (%). Mostra i totali generati (dispacciamento, trasporto, oneri, accise in €). Spiega il peso sulla bolletta.

### 3.4 Ipotesi sui Costi del Grossista
Dettaglia: spread grossista (€/kWh), gestione POD (€/pod/mese), deposito cauzionale (mesi e % clienti). Mostra i totali (costo energia, gestione POD). Spiega l'impatto su cash flow e margine.

### 3.5 Ipotesi sugli Incassi e Dilazioni
Riporta la distribuzione: incasso immediato (%), a 1 mese (%), a 2 mesi (%), a 3+ mesi (%). Spiega come questa distribuzione impatta il fabbisogno di capitale circolante e la liquidità.

### 3.6 Ipotesi sui Canali di Vendita
Per ogni canale attivo riporta: nome, tipo commissione (per contratto/per attivazione), importo €, quota contratti %, tasso attivazione %. Calcola il CAC implicito per canale.

## 4. Analisi del Portafoglio Clienti
Curva di acquisizione, attivazione, churn, LTV implicito, CAC.

## 5. Performance Economica e Margini
Analisi di ogni livello di margine. Benchmark settore (margine netto 8-15%). Leve di miglioramento.

## 6. Struttura e Ottimizzazione dei Costi
Ripartizione costi passanti/commerciali/strutturali. Inefficienze e ottimizzazioni.

## 7. Analisi della Liquidità e Fabbisogno Finanziario
Curva di cassa, esposizione, payback, mesi critici. ⚠️ Segnala rischi.

## 8. Efficacia dei Canali di Vendita
CAC per canale, conversione, contributo. Raccomandazioni mix.

## 9. Analisi dei Rischi e Scenari
Almeno 5 rischi concreti con probabilità, impatto, mitigazione.

## 10. Raccomandazioni Strategiche Prioritizzate
5-7 azioni con priorità, impatto, timeline.

## 11. Conclusione e Giudizio di Fattibilità
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
