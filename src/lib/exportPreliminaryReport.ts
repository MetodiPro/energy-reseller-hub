/**
 * Report Preliminare – Documento Word completo per la valutazione
 * di fattibilità di un progetto reseller energia elettrica.
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, BorderStyle, TableRow, TableCell, Table, WidthType, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { processSteps, phases } from '@/data/processSteps';
import { RevenueSimulationData, RevenueSimulationParams } from '@/hooks/useRevenueSimulation';
import { SimulationEngineResult, computePerClientAmounts, SIM_MONTHS } from '@/lib/simulationEngine';
import { buildSimulationSummary } from '@/hooks/useSimulationSummary';
import { CashFlowSummary } from '@/hooks/useCashFlowAnalysis';
import { buildTaxFlows } from '@/hooks/useTaxFlows';
import type { Project } from '@/hooks/useProjects';

// ─── Helpers ─────────────────────────────────────────────────

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtEur = (n: number) => `€${fmt(Math.round(n))}`;

const BLUE = '1e40af';
const GRAY = '6B7280';
const LIGHT = 'F3F4F6';
const WHITE = 'FFFFFF';

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE } },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: BLUE })],
    spacing: { before: 300, after: 100 },
  });
}

function para(text: string, opts?: { bold?: boolean; italic?: boolean; color?: string; size?: number }): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      size: opts?.size ?? 22,
      bold: opts?.bold,
      italics: opts?.italic,
      color: opts?.color,
    })],
    spacing: { after: 60 },
  });
}

function expertComment(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: '💡 ', size: 22 }),
      new TextRun({ text, italics: true, size: 22, color: '1e40af' }),
    ],
    spacing: { before: 80, after: 120 },
  });
}

function bulletPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 40 },
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20 })], alignment: AlignmentType.CENTER })],
            shading: { type: ShadingType.SOLID, color: BLUE },
          })
        ),
      }),
      ...rows.map((row, idx) =>
        new TableRow({
          children: row.map((cell, ci) =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: cell, size: 20, bold: ci === 0 })],
                alignment: ci > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
              })],
              shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: LIGHT } : undefined,
            })
          ),
        })
      ),
    ],
  });
}

function spacer(size = 200): Paragraph {
  return new Paragraph({ spacing: { before: size } });
}

// ─── Main export function ────────────────────────────────────

export interface PreliminaryReportInput {
  project: Project;
  simulationData: RevenueSimulationData;
  engineResult: SimulationEngineResult;
  cashFlowData: CashFlowSummary;
  investimentoIniziale: number;
}

export async function exportPreliminaryReport(input: PreliminaryReportInput): Promise<void> {
  const { project, simulationData, engineResult, cashFlowData, investimentoIniziale } = input;
  const params = simulationData.params;
  const perClient = engineResult.perClient;
  const summary = buildSimulationSummary(engineResult, simulationData);
  const taxFlows = buildTaxFlows(engineResult, params.ivaPaymentRegime);
  const monthly = engineResult.monthly;

  const children: any[] = [];

  // ═══════════════════════════════════════════════════════════
  // COPERTINA
  // ═══════════════════════════════════════════════════════════
  children.push(
    new Paragraph({ spacing: { before: 2500 } }),
    new Paragraph({
      children: [new TextRun({ text: 'REPORT PRELIMINARE', bold: true, size: 56, color: BLUE })],
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Analisi di Fattibilità – Società di Vendita Energia Elettrica', size: 28, color: GRAY })],
      alignment: AlignmentType.CENTER, spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: project.name || 'Nuovo Progetto', bold: true, size: 36, color: BLUE })],
      alignment: AlignmentType.CENTER, spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Generato il ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        size: 22, color: GRAY,
      })],
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Documento riservato – Ad uso interno', italics: true, size: 20, color: GRAY })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // ═══════════════════════════════════════════════════════════
  // INDICE
  // ═══════════════════════════════════════════════════════════
  const sections = [
    'Executive Summary',
    'Iter Burocratico e Organizzativo',
    'Ipotesi Operative e Parametri di Simulazione',
    'Analisi della Fattura Tipo',
    'Proiezione Clienti e Fatturato (14 mesi)',
    'Analisi dei Margini',
    'Analisi della Liquidità e Cash Flow',
    'Flussi Fiscali',
    'Break-Even e ROI',
    'Valutazione dei Rischi',
    'Conclusioni e Raccomandazioni',
  ];

  children.push(
    new Paragraph({ children: [new TextRun({ text: 'INDICE', bold: true, size: 36, color: BLUE })], spacing: { after: 400 } }),
  );
  sections.forEach((s, i) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: `${i + 1}. ${s}`, size: 24 })],
      spacing: { after: 80 },
    }));
  });
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 1. EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════
  let sectionNum = 1;
  children.push(heading1(`${sectionNum}. Executive Summary`));

  const totalContratti = summary.contrattiTotali;
  const clientiFinali = summary.clientiAttivi;
  const margineNettoMensile = cashFlowData.hasData
    ? (cashFlowData.saldoFinale / SIM_MONTHS)
    : 0;

  children.push(
    para(`Il presente report analizza la fattibilità economico-finanziaria dell'avvio di un'attività di vendita di energia elettrica nel mercato libero italiano, operando come reseller tramite un Utente del Dispacciamento (grossista).`),
    spacer(100),
    para('Dati chiave del progetto:', { bold: true }),
    bulletPara(`Investimento iniziale stimato: ${fmtEur(investimentoIniziale)}`),
    bulletPara(`Contratti target (12 mesi): ${fmt(totalContratti)} contratti`),
    bulletPara(`Clienti attivi a regime: ${fmt(clientiFinali)} clienti`),
    bulletPara(`Fatturato complessivo (14 mesi): ${fmtEur(summary.totalFatturato)}`),
    bulletPara(`Margine commerciale totale: ${fmtEur(summary.totalMargine)} (${fmt(summary.marginePercent, 1)}% sull'imponibile)`),
    bulletPara(`Break-Even finanziario: ${cashFlowData.mesePrimoPositivo ?? 'Non raggiunto nel periodo'}`),
    bulletPara(`Massima esposizione di cassa: ${fmtEur(Math.abs(cashFlowData.massimaEsposizione))} (${cashFlowData.meseEsposizioneMassima})`),
    bulletPara(`Saldo di cassa a fine periodo: ${fmtEur(cashFlowData.saldoFinale)}`),
    spacer(100),
  );

  if (cashFlowData.mesePrimoPositivo) {
    children.push(expertComment(
      `Il progetto raggiunge il pareggio finanziario entro ${cashFlowData.mesePrimoPositivo}, un orizzonte ragionevole per il settore. ` +
      `L'investitore deve tuttavia disporre di una riserva di liquidità di almeno ${fmtEur(Math.abs(cashFlowData.massimaEsposizione) * 1.15)} ` +
      `(15% di margine di sicurezza) per coprire il periodo di esposizione negativa.`
    ));
  } else {
    children.push(expertComment(
      `ATTENZIONE: Il pareggio finanziario non viene raggiunto nel periodo simulato (14 mesi). ` +
      `Si consiglia di rivedere i parametri commerciali (spread, CCV) o i volumi target per migliorare la sostenibilità.`
    ));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 2. ITER BUROCRATICO
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Iter Burocratico e Organizzativo`));
  children.push(
    para('Di seguito l\'elenco completo delle attività necessarie per l\'avvio dell\'attività, organizzate per fase, con le tempistiche stimate basate sulla prassi del settore.'),
    spacer(100),
  );

  let cumulativeDays = 0;
  for (const phase of phases) {
    const phaseSteps = processSteps.filter(s => s.phase === phase.id);
    if (phaseSteps.length === 0) continue;

    const phaseDays = phaseSteps.reduce((s, st) => s + st.estimatedDays, 0);

    children.push(heading2(`Fase ${phase.id}: ${phase.name} (~${phaseDays} giorni)`));

    const stepRows = phaseSteps.map(step => {
      const costsStr = step.costs ? `${fmtEur(step.costs.min)} - ${fmtEur(step.costs.max)}` : 'Gratuito';
      return [step.title, `${step.estimatedDays} gg`, costsStr, step.priority === 'high' ? 'Alta' : step.priority === 'medium' ? 'Media' : 'Bassa'];
    });

    children.push(makeTable(['Attività', 'Durata', 'Costo Stimato', 'Priorità'], stepRows));

    // Key notes for each step
    phaseSteps.forEach(step => {
      if (step.notes.length > 0) {
        children.push(spacer(60));
        children.push(para(`${step.title}:`, { bold: true, size: 20 }));
        step.notes.slice(0, 3).forEach(note => {
          children.push(bulletPara(note));
        });
      }
    });

    cumulativeDays += phaseDays;
    children.push(spacer(100));
  }

  const totalStepDays = processSteps.reduce((s, st) => s + st.estimatedDays, 0);
  children.push(
    spacer(100),
    para(`Tempistica complessiva stimata: ${totalStepDays} giorni-lavoro`, { bold: true }),
    para(`Considerando la sovrapposizione tra fasi, il percorso realistico si completa in circa 5-7 mesi.`),
    expertComment(
      `Nell'esperienza del settore, le tempistiche più critiche riguardano l'iscrizione EVE (30 gg lavorativi di istruttoria MASE) ` +
      `e la contrattualizzazione del grossista (negoziazione + garanzie finanziarie). ` +
      `Si consiglia di avviare queste attività il prima possibile, poiché sono bloccanti per l'operatività.`
    ),
  );

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 3. IPOTESI OPERATIVE
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Ipotesi Operative e Parametri di Simulazione`));
  children.push(para('I risultati del presente report sono basati sulle seguenti ipotesi configurate nella sezione Finanza del progetto.'));

  children.push(heading2('Componenti Commerciali Reseller'));
  children.push(makeTable(['Parametro', 'Valore'], [
    ['CCV (Commercializzazione e Vendita)', `€${fmt(params.ccvMonthly, 2)}/cliente/mese`],
    ['Spread Reseller al cliente', `€${fmt(params.spreadPerKwh, 4)}/kWh`],
    ['Spread Grossista al reseller', `€${fmt(params.spreadGrossistaPerKwh, 4)}/kWh`],
    ['Spread netto (ricavo reale)', `€${fmt(params.spreadPerKwh - params.spreadGrossistaPerKwh, 4)}/kWh`],
    ['Altri servizi', `€${fmt(params.otherServicesMonthly, 2)}/cliente/mese`],
  ]));

  children.push(expertComment(
    `Lo spread netto di €${fmt((params.spreadPerKwh - params.spreadGrossistaPerKwh) * 1000, 2)}/MWh è il vero margine variabile. ` +
    `Per il mercato domestico italiano, valori tra €2 e €8/MWh sono considerati competitivi. ` +
    `Valori inferiori a €2/MWh rendono l'attività difficilmente sostenibile.`
  ));

  children.push(heading2('Tipologia Clientela e Consumi'));
  children.push(makeTable(['Parametro', 'Valore'], [
    ['Tipologia cliente', params.clientType === 'domestico' ? 'Domestico' : params.clientType === 'pmi' ? 'PMI' : 'Business'],
    ['Consumo medio mensile', `${fmt(params.avgMonthlyConsumption)} kWh/mese`],
    ['Consumo annuo stimato per cliente', `${fmt(params.avgMonthlyConsumption * 12)} kWh/anno`],
    ['Tasso attivazione', `${fmt(params.activationRate)}%`],
    ['Tasso churn mensile', `${fmt(params.monthlyChurnRate, 1)}%`],
    ['Aliquota IVA', `${fmt(params.ivaPercent)}%`],
  ]));

  children.push(heading2('Incasso e Insoluti'));
  children.push(makeTable(['Tempistica', 'Percentuale'], [
    ['Incasso alla scadenza', `${fmt(params.collectionMonth0)}%`],
    ['Incasso entro 30 gg', `${fmt(params.collectionMonth1)}%`],
    ['Incasso entro 60 gg', `${fmt(params.collectionMonth2)}%`],
    ['Incasso oltre 60 gg', `${fmt(params.collectionMonth3Plus)}%`],
    ['Insoluti definitivi', `${fmt(params.uncollectibleRate)}%`],
  ]));

  children.push(expertComment(
    `La waterfall di incasso prevede il ${fmt(params.collectionMonth0)}% alla scadenza e il ${fmt(params.uncollectibleRate)}% di insoluti. ` +
    `Nel settore energy retail, tassi di insoluto del 2-3% sono nella norma per il domestico. ` +
    `L'effetto cumulativo del ritardo di incasso genera un fabbisogno di liquidità significativo nei primi mesi.`
  ));

  children.push(heading2('Target Contratti Mensili'));
  const contractRows = simulationData.monthlyContracts.map((c, i) => [`Mese ${i + 1}`, fmt(c)]);
  children.push(makeTable(['Mese', 'Contratti Target'], contractRows));
  children.push(para(`Totale contratti obiettivo: ${fmt(simulationData.monthlyContracts.reduce((s, c) => s + c, 0))}`));

  children.push(heading2('Costi Grossista'));
  children.push(makeTable(['Parametro', 'Valore'], [
    ['Fee gestione POD', `€${fmt(params.gestionePodPerPod, 2)}/POD/mese`],
    ['Deposito cauzionale', `${fmt(params.depositoMesi)} mesi di fatturato`],
    ['% applicata al deposito', `${fmt(params.depositoPercentualeAttivazione ?? 85)}%`],
  ]));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 4. FATTURA TIPO
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Analisi della Fattura Tipo`));
  children.push(para(`Scomposizione della fattura mensile per un cliente tipo con consumo di ${fmt(params.avgMonthlyConsumption)} kWh/mese.`));

  children.push(heading2('Componenti Passanti'));
  children.push(makeTable(['Componente', 'Importo Mensile', '% su Imponibile'], [
    ['Materia energia (PUN + Dispacc.)', fmtEur(perClient.materiaEnergia), `${fmt(perClient.materiaEnergia / perClient.imponibile * 100, 1)}%`],
    ['Trasporto e distribuzione', fmtEur(perClient.trasporto), `${fmt(perClient.trasporto / perClient.imponibile * 100, 1)}%`],
    ['Oneri di sistema (ASOS + ARIM)', fmtEur(perClient.oneriSistema), `${fmt(perClient.oneriSistema / perClient.imponibile * 100, 1)}%`],
    ['Accise', fmtEur(perClient.accise), `${fmt(perClient.accise / perClient.imponibile * 100, 1)}%`],
    ['TOTALE PASSANTI', fmtEur(perClient.passantiTotale), `${fmt(perClient.passantiTotale / perClient.imponibile * 100, 1)}%`],
  ]));

  children.push(heading2('Componenti Reseller (Margine)'));
  children.push(makeTable(['Componente', 'Importo Mensile', '% su Imponibile'], [
    ['CCV', fmtEur(perClient.ccv), `${fmt(perClient.ccv / perClient.imponibile * 100, 1)}%`],
    ['Spread energia', fmtEur(perClient.spread), `${fmt(perClient.spread / perClient.imponibile * 100, 1)}%`],
    ['Altri servizi', fmtEur(perClient.altroServizi), `${fmt(perClient.altroServizi / perClient.imponibile * 100, 1)}%`],
    ['TOTALE MARGINE', fmtEur(perClient.margineTotale), `${fmt(perClient.margineTotale / perClient.imponibile * 100, 1)}%`],
  ]));

  children.push(heading2('Riepilogo Fattura'));
  children.push(makeTable(['Voce', 'Importo'], [
    ['Imponibile', fmtEur(perClient.imponibile)],
    [`IVA (${fmt(params.ivaPercent)}%)`, fmtEur(perClient.iva)],
    ['TOTALE FATTURA', fmtEur(perClient.fattura)],
  ]));

  children.push(expertComment(
    `Il margine reseller rappresenta il ${fmt(perClient.margineTotale / perClient.imponibile * 100, 1)}% dell'imponibile fattura. ` +
    `I costi passanti (${fmt(perClient.passantiTotale / perClient.imponibile * 100, 1)}%) transitano attraverso il reseller ` +
    `senza generare margine ma impattano significativamente sul fabbisogno di liquidità.`
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 5. PROIEZIONE CLIENTI E FATTURATO
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Proiezione Clienti e Fatturato (14 mesi)`));
  children.push(para(
    `La simulazione copre 14 mesi (12 operativi + 2 di coda) per modellare il ciclo di vita completo ` +
    `dei contratti: firma → invio SII (2 mesi) → attivazione → prima fatturazione.`
  ));

  const customerRows = monthly.map(m => [
    m.customer.monthLabel,
    fmt(m.customer.contrattiNuovi),
    fmt(m.customer.attivazioni),
    fmt(m.customer.churn),
    fmt(m.customer.clientiAttivi),
    fmt(m.customer.clientiFatturati),
    fmtEur(m.fatturato),
  ]);

  children.push(makeTable(
    ['Mese', 'Nuovi', 'Attivaz.', 'Churn', 'Attivi', 'Fatturati', 'Fatturato'],
    customerRows
  ));

  children.push(spacer(100));
  children.push(makeTable(['KPI', 'Valore'], [
    ['Contratti totali firmati', fmt(summary.contrattiTotali)],
    ['Switch-out totali (churn)', fmt(summary.switchOutTotali)],
    ['Clienti attivi a fine periodo', fmt(summary.clientiAttivi)],
    ['Fatturato complessivo (IVA inclusa)', fmtEur(summary.totalFatturato)],
    ['Totale incassato', fmtEur(summary.totalIncassato)],
    ['Insoluti stimati', fmtEur(summary.totalInsoluti)],
    ['Crediti pendenti', fmtEur(summary.totalCrediti)],
  ]));

  children.push(expertComment(
    `Il tasso di attivazione del ${fmt(params.activationRate)}% implica che su ${fmt(totalContratti)} contratti firmati, ` +
    `circa ${fmt(Math.round(totalContratti * (1 - params.activationRate / 100)))} non si concretizzano. ` +
    `Il churn mensile dell'${fmt(params.monthlyChurnRate, 1)}% è fisiologico nel mercato libero, ma va monitorato.`
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 6. ANALISI DEI MARGINI
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Analisi dei Margini`));

  const imponibileTotale = summary.totalFatturato - summary.totalIva;
  const spreadGrossistaTotale = cashFlowData.totaleCostiPassanti;
  const ricaviReseller = summary.totalMargine - spreadGrossistaTotale;

  children.push(makeTable(['Indicatore', 'Valore', '% su Imponibile'], [
    ['Fatturato totale (IVA incl.)', fmtEur(summary.totalFatturato), '—'],
    ['IVA totale', fmtEur(summary.totalIva), '—'],
    ['Imponibile totale', fmtEur(imponibileTotale), '100%'],
    ['Margine commerciale lordo', fmtEur(summary.totalMargine), `${fmt(summary.marginePercent, 1)}%`],
    ['(−) Spread grossista', fmtEur(spreadGrossistaTotale), `${fmt(imponibileTotale > 0 ? spreadGrossistaTotale / imponibileTotale * 100 : 0, 1)}%`],
    ['= Ricavi propri reseller', fmtEur(ricaviReseller), `${fmt(imponibileTotale > 0 ? ricaviReseller / imponibileTotale * 100 : 0, 1)}%`],
    ['(−) Costi gestione POD', fmtEur(summary.costoGestionePodTotale), `${fmt(imponibileTotale > 0 ? summary.costoGestionePodTotale / imponibileTotale * 100 : 0, 1)}%`],
    ['(−) Costi commerciali', fmtEur(cashFlowData.totaleCostiCommerciali), `${fmt(imponibileTotale > 0 ? cashFlowData.totaleCostiCommerciali / imponibileTotale * 100 : 0, 1)}%`],
  ]));

  children.push(spacer(100));
  children.push(heading2('Margine per Cliente al Mese'));

  const spreadNettoKwh = params.spreadPerKwh - params.spreadGrossistaPerKwh;
  const marginPerClient = perClient.ccv + spreadNettoKwh * params.avgMonthlyConsumption + params.otherServicesMonthly - (params.gestionePodPerPod ?? 2.5);

  children.push(makeTable(['Componente', '€/cliente/mese'], [
    ['CCV', `€${fmt(params.ccvMonthly, 2)}`],
    ['Spread netto × kWh', `€${fmt(spreadNettoKwh * params.avgMonthlyConsumption, 2)}`],
    ['Altri servizi', `€${fmt(params.otherServicesMonthly, 2)}`],
    ['(−) Fee POD grossista', `−€${fmt(params.gestionePodPerPod, 2)}`],
    ['= MARGINE NETTO/CLIENTE', `€${fmt(marginPerClient, 2)}`],
  ]));

  children.push(expertComment(
    `Un margine di €${fmt(marginPerClient, 2)}/cliente/mese è ${marginPerClient > 10 ? 'buono' : marginPerClient > 5 ? 'accettabile' : 'basso'} per il settore. ` +
    `I reseller più efficienti puntano a margini di €8-15/cliente/mese per il domestico. ` +
    `Il margine deve coprire i costi strutturali (personale, IT, sede) non inclusi in questa analisi per-cliente.`
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 7. LIQUIDITÀ E CASH FLOW
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Analisi della Liquidità e Cash Flow`));
  children.push(para(
    `L'analisi della liquidità è l'elemento più critico per la valutazione del progetto. ` +
    `Il modello integra l'investimento iniziale, i flussi di incasso con aging, i costi operativi, ` +
    `i depositi cauzionali verso il grossista e i flussi fiscali (IVA, accise, oneri).`
  ));

  children.push(heading2('Flussi di Cassa Mensili'));

  const cfRows = cashFlowData.monthlyData.map(m => [
    m.monthLabel,
    fmtEur(m.incassi),
    fmtEur(m.costiPassanti + m.costiOperativi),
    fmtEur(m.costiCommerciali),
    fmtEur(m.flussiFiscali),
    fmtEur(m.deltaDeposito),
    fmtEur(m.investimentiIniziali),
    fmtEur(m.flussoNetto),
    fmtEur(m.saldoCumulativo),
  ]);

  children.push(makeTable(
    ['Mese', 'Incassi', 'Costi Op.', 'Comm.li', 'Fiscali', 'Deposito', 'Investim.', 'Netto', 'Cumulativo'],
    cfRows
  ));

  children.push(heading2('Riepilogo Liquidità'));
  children.push(makeTable(['Indicatore', 'Valore'], [
    ['Investimento iniziale (costi di setup)', fmtEur(investimentoIniziale)],
    ['Totale incassi', fmtEur(cashFlowData.totaleIncassi)],
    ['Totale costi passanti (spread grossista)', fmtEur(cashFlowData.totaleCostiPassanti)],
    ['Totale costi operativi (gestione POD)', fmtEur(cashFlowData.totaleCostiOperativi)],
    ['Totale costi commerciali (provvigioni)', fmtEur(cashFlowData.totaleCostiCommerciali)],
    ['Totale flussi fiscali', fmtEur(cashFlowData.totaleFlussiFiscali)],
    ['Totale depositi cauzionali', fmtEur(cashFlowData.totaleDepositi)],
    ['Saldo finale di cassa', fmtEur(cashFlowData.saldoFinale)],
  ]));

  children.push(heading2('Indicatori Chiave'));
  children.push(makeTable(['Indicatore', 'Valore'], [
    ['Massima esposizione di cassa', fmtEur(Math.abs(cashFlowData.massimaEsposizione))],
    ['Mese di massima esposizione', cashFlowData.meseEsposizioneMassima],
    ['Break-Even finanziario (saldo positivo)', cashFlowData.mesePrimoPositivo ?? 'Non raggiunto'],
    ['Deposito cauzionale massimo', fmtEur(summary.depositoMassimo)],
  ]));

  children.push(expertComment(
    `La massima esposizione di cassa di ${fmtEur(Math.abs(cashFlowData.massimaEsposizione))} rappresenta il capitale ` +
    `minimo necessario per operare senza interruzioni. Si raccomanda di disporre di almeno il 120% di tale importo ` +
    `(${fmtEur(Math.abs(cashFlowData.massimaEsposizione) * 1.2)}) per far fronte a imprevisti. ` +
    `I principali driver dell'esposizione sono: (1) il deposito cauzionale verso il grossista, ` +
    `(2) il gap temporale tra emissione fattura e incasso, (3) i costi di setup concentrati nei primi mesi.`
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 8. FLUSSI FISCALI
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Flussi Fiscali`));
  children.push(para(`Regime IVA: ${params.ivaPaymentRegime === 'monthly' ? 'Mensile' : 'Trimestrale'}`));

  children.push(makeTable(['Voce', 'Incassato', 'Versato', 'Saldo'], [
    ['IVA (debito/credito)', fmtEur(taxFlows.totaleIvaDebito), fmtEur(taxFlows.totaleIvaVersamenti), fmtEur(taxFlows.totaleIvaDebito - taxFlows.totaleIvaVersamenti)],
    ['Accise energia', fmtEur(taxFlows.totaleAcciseIncassate), fmtEur(taxFlows.totaleAcciseVersate), fmtEur(taxFlows.totaleAcciseIncassate - taxFlows.totaleAcciseVersate)],
    ['Oneri di sistema', fmtEur(taxFlows.totaleOneriIncassati), fmtEur(taxFlows.totaleOneriRiversati), fmtEur(taxFlows.totaleOneriIncassati - taxFlows.totaleOneriRiversati)],
    ['Trasporto', fmtEur(taxFlows.totaleTrasportoIncassato), fmtEur(taxFlows.totaleTrasportoVersato), fmtEur(taxFlows.totaleTrasportoIncassato - taxFlows.totaleTrasportoVersato)],
    ['TOTALE USCITE FISCALI', '—', fmtEur(taxFlows.totaleTaxOutflows), '—'],
  ]));

  const ivaCredit = taxFlows.totaleIvaCredito;
  if (params.ivaPercent < 22) {
    children.push(expertComment(
      `Con clientela domestica (IVA ${fmt(params.ivaPercent)}%), gli acquisti dal grossista sono al 22%. ` +
      `Questo genera un credito IVA strutturale di ${fmtEur(ivaCredit)} nel periodo, ` +
      `che riduce i versamenti F24 e migliora la liquidità a breve termine.`
    ));
  }

  children.push(expertComment(
    `Le accise sono incassate in fattura e versate trimestralmente all'ADM. Questo sfasamento genera un beneficio ` +
    `di liquidità temporaneo che va gestito con prudenza: i fondi devono essere accantonati.`
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 9. BREAK-EVEN E ROI
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Break-Even e ROI`));

  const roi = investimentoIniziale > 0
    ? ((cashFlowData.saldoFinale) / investimentoIniziale) * 100
    : 0;

  children.push(heading2('Break-Even Point'));
  children.push(makeTable(['Tipo', 'Dettaglio'], [
    ['BEP Finanziario', cashFlowData.mesePrimoPositivo ? `Raggiunto a ${cashFlowData.mesePrimoPositivo}` : 'Non raggiunto nel periodo simulato'],
    ['Capitale necessario fino al BEP', fmtEur(Math.abs(cashFlowData.massimaEsposizione))],
  ]));

  children.push(heading2('Return on Investment'));
  children.push(makeTable(['Indicatore', 'Valore'], [
    ['Investimento iniziale (setup)', fmtEur(investimentoIniziale)],
    ['Saldo di cassa finale (14 mesi)', fmtEur(cashFlowData.saldoFinale)],
    ['ROI sull\'investimento', `${fmt(roi, 1)}%`],
  ]));

  if (roi > 0) {
    children.push(expertComment(
      `Il ROI del ${fmt(roi, 1)}% sui 14 mesi indica un rendimento ${roi > 50 ? 'molto positivo' : roi > 20 ? 'positivo' : 'modesto'}. ` +
      `Tuttavia, questo calcolo non include i costi strutturali fissi (affitto, personale amministrativo, ecc.) ` +
      `che impattano significativamente sulla redditività reale.`
    ));
  } else {
    children.push(expertComment(
      `Il ROI negativo indica che nel periodo simulato l'attività non recupera l'investimento iniziale. ` +
      `Si consiglia di estendere l'orizzonte temporale o rivedere i parametri commerciali.`
    ));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 10. VALUTAZIONE DEI RISCHI
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Valutazione dei Rischi`));

  const risks: { risk: string; impact: string; mitigation: string; level: string }[] = [
    {
      risk: 'Liquidità insufficiente nei primi mesi',
      impact: 'Impossibilità di pagare il grossista → blocco forniture',
      mitigation: `Disporre di almeno ${fmtEur(Math.abs(cashFlowData.massimaEsposizione) * 1.2)} di liquidità iniziale`,
      level: 'Alto',
    },
    {
      risk: 'Tasso di insoluto superiore alle attese',
      impact: 'Riduzione margine e tensione sulla cassa',
      mitigation: 'Verifica creditizia pre-contratto, solleciti automatici, cessione crediti',
      level: 'Medio',
    },
    {
      risk: 'Churn superiore alle previsioni',
      impact: 'Riduzione base clienti e ricavi, costi commerciali non recuperati',
      mitigation: 'Programmi di retention, qualità servizio, monitoring NPS',
      level: 'Medio',
    },
    {
      risk: 'Ritardi nell\'iter burocratico (EVE, ARERA)',
      impact: 'Slittamento del go-live e prolungamento dei costi pre-operativi',
      mitigation: 'Avviare le pratiche il prima possibile, supporto consulenziale dedicato',
      level: 'Medio',
    },
    {
      risk: 'Variazione PUN sfavorevole',
      impact: 'Impatto sulla competitività delle offerte (compensato parzialmente dal pass-through)',
      mitigation: 'Offerte a prezzo indicizzato, clausole di salvaguardia',
      level: 'Basso',
    },
    {
      risk: 'Inadempimento grossista',
      impact: 'Interruzione della fornitura, danni reputazionali',
      mitigation: 'Scegliere grossisti consolidati, prevedere clausole contrattuali di backup',
      level: 'Basso',
    },
  ];

  children.push(makeTable(['Rischio', 'Impatto', 'Mitigazione', 'Livello'],
    risks.map(r => [r.risk, r.impact, r.mitigation, r.level])
  ));

  children.push(expertComment(
    `Il rischio principale è la gestione della liquidità. Nel settore energy retail, le cause più frequenti ` +
    `di fallimento delle nuove imprese non sono la mancanza di clienti ma l'incapacità di gestire il gap ` +
    `tra esborsi (grossista, accise, depositi) e incassi (fatture a 30-60 giorni). ` +
    `Una pianificazione finanziaria conservativa è essenziale.`
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════════════════════════
  // 11. CONCLUSIONI E RACCOMANDAZIONI
  // ═══════════════════════════════════════════════════════════
  sectionNum++;
  children.push(heading1(`${sectionNum}. Conclusioni e Raccomandazioni`));

  const viable = cashFlowData.mesePrimoPositivo !== null && marginPerClient > 5;

  children.push(para(viable
    ? `Sulla base dei parametri analizzati, il progetto presenta un profilo di fattibilità ${marginPerClient > 10 ? 'positivo' : 'moderatamente positivo'} ` +
      `con un percorso verso la sostenibilità finanziaria raggiungibile entro ${cashFlowData.mesePrimoPositivo}.`
    : `Sulla base dei parametri attuali, il progetto necessita di un'attenta revisione delle condizioni commerciali ` +
      `per raggiungere la sostenibilità finanziaria nel periodo considerato.`
  ));

  children.push(spacer(100), para('Raccomandazioni:', { bold: true }));

  const recs = [
    `Assicurare una dotazione finanziaria iniziale di almeno ${fmtEur(Math.abs(cashFlowData.massimaEsposizione) * 1.2)} ` +
    `(investimento + capitale circolante + margine di sicurezza).`,
    `Avviare immediatamente le pratiche EVE e la selezione del grossista (attività bloccanti con tempi lunghi).`,
    `Implementare un sistema di monitoraggio della liquidità giornaliero con alert su soglie critiche.`,
    `Negoziare con il grossista termini di pagamento favorevoli (es. 30 gg fine mese) per ridurre l'esposizione di cassa.`,
    `Strutturare i canali di acquisizione con un mix che bilanci volumi (call center) e qualità (agenti diretti).`,
    `Prevedere un piano di contingenza per tassi di insoluto superiori al ${fmt(params.uncollectibleRate)}% previsto.`,
    `Considerare la possibilità di cessione crediti (factoring) per accelerare gli incassi nei primi mesi critici.`,
    `Verificare la possibilità di fideiussioni assicurative (meno onerose di quelle bancarie) per le garanzie al grossista.`,
  ];

  recs.forEach(r => children.push(bulletPara(r)));

  children.push(spacer(200));
  children.push(new Paragraph({
    children: [new TextRun({
      text: '— Fine del Report Preliminare —',
      italics: true, size: 22, color: GRAY,
    })],
    alignment: AlignmentType.CENTER,
  }));

  // ═══════════════════════════════════════════════════════════
  // Generazione documento
  // ═══════════════════════════════════════════════════════════
  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `report-preliminare-${project.name?.replace(/\s+/g, '-').toLowerCase() || 'progetto'}-${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, fileName);
}
