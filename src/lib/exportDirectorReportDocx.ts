import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';

interface KpiData {
  fatturato: string;
  margineNetto: string;
  margineNettoPerc: string;
  clientiAttivi: string;
  breakEven: string;
  roi: string;
  massimaEsposizione: string;
  meseMassimaEsposizione: string;
  saldoFinale: string;
}

interface ExportParams {
  projectName: string;
  reportContent: string;
  kpis: KpiData;
  date: string;
  cashFlowMonthly?: Array<{
    mese: string;
    incassato: number;
    costiTotali: number;
    flussoNetto: number;
    saldoCumulativo: number;
  }>;
}

const BLUE = '1E40AF';
const DARK = '1A1A2E';
const GRAY = '6B7280';
const LIGHT_BG = 'F0F4F8';
const WHITE = 'FFFFFF';

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function parseMarkdownLine(text: string): TextRun[] {
  // Handle **bold** segments
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return new TextRun({ text: part.slice(2, -2), bold: true, font: 'Calibri', size: 21 });
    }
    return new TextRun({ text: part, font: 'Calibri', size: 21 });
  });
}

function buildReportParagraphs(content: string): Paragraph[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
      continue;
    }

    // ## Heading 2
    if (trimmed.startsWith('## ')) {
      const headingText = trimmed.slice(3).replace(/[⚠️✅❌]/g, '').trim();
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 200 },
        children: [new TextRun({ text: headingText, bold: true, font: 'Calibri', size: 28, color: BLUE })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: BLUE, space: 4 } },
      }));
      continue;
    }

    // ### Heading 3
    if (trimmed.startsWith('### ')) {
      const headingText = trimmed.slice(4).replace(/[⚠️✅❌]/g, '').trim();
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: headingText, bold: true, font: 'Calibri', size: 24, color: DARK })],
      }));
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2);
      paragraphs.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: { after: 80 },
        children: parseMarkdownLine(text),
      }));
      continue;
    }

    // Numbered items
    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      paragraphs.push(new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        spacing: { after: 80 },
        children: parseMarkdownLine(text),
      }));
      continue;
    }

    // Regular paragraph
    paragraphs.push(new Paragraph({
      spacing: { after: 120, line: 300 },
      children: parseMarkdownLine(trimmed),
    }));
  }

  return paragraphs;
}

function createKpiTable(kpis: KpiData): Table {
  const kpiEntries = [
    { label: 'Fatturato', value: kpis.fatturato },
    { label: 'Margine Netto', value: `${kpis.margineNetto} (${kpis.margineNettoPerc})` },
    { label: 'Clienti Attivi', value: kpis.clientiAttivi },
    { label: 'Break-Even', value: kpis.breakEven },
    { label: 'ROI (14m)', value: kpis.roi },
    { label: 'Massima Esposizione', value: kpis.massimaEsposizione },
    { label: 'Picco nel mese', value: kpis.meseMassimaEsposizione },
    { label: 'Saldo Finale (14m)', value: kpis.saldoFinale },
  ];

  const colWidth = Math.floor(9026 / kpiEntries.length);
  const columnWidths = kpiEntries.map(() => colWidth);

  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        children: kpiEntries.map(kpi =>
          new TableCell({
            borders: noBorders,
            width: { size: colWidth, type: WidthType.DXA },
            shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 40, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: kpi.label, font: 'Calibri', size: 16, color: GRAY })],
            })],
          })
        ),
      }),
      new TableRow({
        children: kpiEntries.map(kpi =>
          new TableCell({
            borders: noBorders,
            width: { size: colWidth, type: WidthType.DXA },
            shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
            margins: { top: 40, bottom: 100, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: kpi.value, font: 'Calibri', size: 22, bold: true, color: DARK })],
            })],
          })
        ),
      }),
    ],
  });
}

function createCashFlowTable(rows: Array<{ mese: string; incassato: number; costiTotali: number; flussoNetto: number; saldoCumulativo: number }>): Table {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const colW = [1600, 1800, 1800, 1800, 2026];
  const headerLabels = ['Mese', 'Incassi', 'Uscite Totali', 'Flusso Netto', 'Saldo Cumulativo'];

  const headerRow = new TableRow({
    children: headerLabels.map((label, i) => new TableCell({
      borders: allBorders,
      width: { size: colW[i], type: WidthType.DXA },
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, font: 'Calibri', size: 17, bold: true, color: WHITE })],
      })],
    })),
  });

  const dataRows = rows.map((r, idx) => {
    const isNegativeSaldo = r.saldoCumulativo < 0;
    const isNegativeFlux = r.flussoNetto < 0;
    const fillColor = idx % 2 === 0 ? 'F9FAFB' : WHITE;

    return new TableRow({
      children: [
        new TableCell({
          borders: allBorders, width: { size: colW[0], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: r.mese, font: 'Calibri', size: 18, bold: true })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[1], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.incassato), font: 'Calibri', size: 18, color: '166534' })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[2], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.costiTotali), font: 'Calibri', size: 18, color: '991B1B' })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[3], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.flussoNetto), font: 'Calibri', size: 18, color: isNegativeFlux ? '991B1B' : '166534', bold: true })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[4], type: WidthType.DXA },
          shading: { fill: isNegativeSaldo ? 'FEF2F2' : 'F0FDF4', type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.saldoCumulativo), font: 'Calibri', size: 18, bold: true, color: isNegativeSaldo ? '991B1B' : '166534' })] })],
        }),
      ],
    });
  });

  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: colW,
    rows: [headerRow, ...dataRows],
  });
}

export async function exportDirectorReportDocx({ projectName, reportContent, kpis, date, cashFlowMonthly }: ExportParams) {
  const reportParagraphs = buildReportParagraphs(reportContent);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 21 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Calibri', color: BLUE },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Calibri', color: DARK },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: 'numbers',
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB', space: 4 } },
            children: [
              new TextRun({ text: `Report Direzionale — ${projectName}`, font: 'Calibri', size: 16, color: GRAY, italics: true }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Documento riservato — Pag. ', font: 'Calibri', size: 14, color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 14, color: GRAY }),
            ],
          })],
        }),
      },
      children: [
        // ── Title Page ──
        new Paragraph({ spacing: { after: 0 }, children: [] }),
        new Paragraph({ spacing: { after: 0 }, children: [] }),
        new Paragraph({ spacing: { after: 0 }, children: [] }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: 'REPORT DIREZIONALE', font: 'Calibri', size: 40, bold: true, color: BLUE })],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 8 } },
          children: [new TextRun({ text: projectName, font: 'Calibri', size: 32, bold: true, color: DARK })],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `Analisi strategica completa — ${date}`, font: 'Calibri', size: 22, color: GRAY })],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'Indicatori Chiave di Performance', font: 'Calibri', size: 20, bold: true, color: DARK })],
        }),

        createKpiTable(kpis),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 200 },
          children: [new TextRun({
            text: 'Documento riservato — Destinato alla direzione aziendale',
            font: 'Calibri', size: 18, italics: true, color: GRAY,
          })],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── Report Content ──
        ...reportParagraphs,

        // ── Final disclaimer ──
        new Paragraph({ spacing: { before: 400 }, children: [] }),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB', space: 8 } },
          spacing: { before: 200 },
          children: [new TextRun({
            text: 'Nota: Questo report è generato automaticamente sulla base dei parametri di simulazione inseriti. I dati e le analisi hanno carattere indicativo e non sostituiscono la consulenza professionale di un commercialista o consulente finanziario.',
            font: 'Calibri', size: 17, italics: true, color: GRAY,
          })],
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: '* Le percentuali di margine sono calcolate sul margine commerciale lordo (ricavi CCV+spread meno costo energia grossista e fee POD), non sul fatturato lordo.',
            font: 'Calibri', size: 16, color: GRAY, italics: true,
          })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const fileName = `Report_Direzionale_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
  saveAs(buffer, fileName);
}
