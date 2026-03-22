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

interface CostBreakdownItem {
  name: string;
  value: number;
}

interface MarginWaterfallItem {
  name: string;
  value: number;
}

interface ChannelItem {
  name: string;
  costo: number;
  contratti: number;
  costoPerCliente: number;
}

interface MonthlyClientData {
  mese: string;
  contrattiNuovi: number;
  attivazioni: number;
  clientiAttivi: number;
  churn: number;
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
  costBreakdown?: CostBreakdownItem[];
  marginWaterfall?: MarginWaterfallItem[];
  channelData?: ChannelItem[];
  monthlyClients?: MonthlyClientData[];
}

const BLUE = '1E40AF';
const DARK = '1A1A2E';
const GRAY = '6B7280';
const LIGHT_BG = 'F0F4F8';
const WHITE = 'FFFFFF';
const GREEN = '166534';
const RED = '991B1B';

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const fmt = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtPerc = (n: number) => `${n.toFixed(1)}%`;

function parseMarkdownLine(text: string): TextRun[] {
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

    if (trimmed.startsWith('### ')) {
      const headingText = trimmed.slice(4).replace(/[⚠️✅❌]/g, '').trim();
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: headingText, bold: true, font: 'Calibri', size: 24, color: DARK })],
      }));
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.slice(2);
      paragraphs.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: { after: 80 },
        children: parseMarkdownLine(text),
      }));
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      paragraphs.push(new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        spacing: { after: 80 },
        children: parseMarkdownLine(text),
      }));
      continue;
    }

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
    { label: 'Max Esposizione', value: kpis.massimaEsposizione },
    { label: 'Picco nel mese', value: kpis.meseMassimaEsposizione },
    { label: 'Saldo Finale', value: kpis.saldoFinale },
  ];

  const colWidth = Math.floor(9026 / kpiEntries.length);

  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: kpiEntries.map(() => colWidth),
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

// ── Horizontal bar chart table ──
function createBarChartTable(
  title: string,
  items: Array<{ label: string; value: number; color?: string }>,
  opts?: { showPercentage?: boolean; barColor?: string }
): (Paragraph | Table)[] {
  const maxVal = Math.max(...items.map(i => Math.abs(i.value)), 1);
  const total = items.reduce((s, i) => s + Math.abs(i.value), 0);
  const BAR_WIDTH = 4000; // DXA for bar column
  const LABEL_WIDTH = 2500;
  const VALUE_WIDTH = 2526;
  const barColor = opts?.barColor || BLUE;

  const paragraphs: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text: title, font: 'Calibri', size: 24, bold: true, color: DARK })],
    }),
  ];

  const rows: TableRow[] = items.map((item) => {
    const barFillPercent = Math.abs(item.value) / maxVal;
    const filledWidth = Math.max(Math.round(BAR_WIDTH * barFillPercent), 100);
    const emptyWidth = BAR_WIDTH - filledWidth;
    const isNegative = item.value < 0;
    const fillColor = isNegative ? RED : (item.color || barColor);
    const perc = total > 0 ? (Math.abs(item.value) / total * 100) : 0;
    const valueText = `${fmt(item.value)}${opts?.showPercentage ? ` (${fmtPerc(perc)})` : ''}`;

    // Bar cell contains an inner table with filled + empty
    const barInner = new Table({
      width: { size: BAR_WIDTH, type: WidthType.DXA },
      columnWidths: [filledWidth, emptyWidth > 0 ? emptyWidth : 1],
      rows: [new TableRow({
        height: { value: 200, rule: 'exact' as any },
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: filledWidth, type: WidthType.DXA },
            shading: { fill: fillColor, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [] })],
          }),
          ...(emptyWidth > 0 ? [new TableCell({
            borders: noBorders,
            width: { size: emptyWidth, type: WidthType.DXA },
            shading: { fill: 'E5E7EB', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [] })],
          })] : []),
        ],
      })],
    });

    return new TableRow({
      children: [
        new TableCell({
          borders: noBorders,
          width: { size: LABEL_WIDTH, type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({ text: item.label, font: 'Calibri', size: 18 })],
          })],
        }),
        new TableCell({
          borders: noBorders,
          width: { size: BAR_WIDTH, type: WidthType.DXA },
          margins: { top: 60, bottom: 40, left: 40, right: 40 },
          children: [barInner],
        }),
        new TableCell({
          borders: noBorders,
          width: { size: VALUE_WIDTH, type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({
              text: valueText, font: 'Calibri', size: 18, bold: true,
              color: isNegative ? RED : DARK,
            })],
          })],
        }),
      ],
    });
  });

  paragraphs.push(new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [LABEL_WIDTH, BAR_WIDTH, VALUE_WIDTH],
    rows,
  }));

  return paragraphs;
}

// ── Margin waterfall table ──
function createWaterfallTable(items: MarginWaterfallItem[]): (Paragraph | Table)[] {
  const colW = [3500, 2800, 2726];
  const headerRow = new TableRow({
    children: ['Voce', 'Importo', 'Variazione'].map((label, i) => new TableCell({
      borders: allBorders,
      width: { size: colW[i], type: WidthType.DXA },
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: i > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text: label, font: 'Calibri', size: 17, bold: true, color: WHITE })],
      })],
    })),
  });

  const dataRows = items.map((item, idx) => {
    const isNegative = item.value < 0;
    const isSubtotal = item.name.includes('Margine');
    const fillColor = idx % 2 === 0 ? 'F9FAFB' : WHITE;
    const indicator = isSubtotal ? '═' : (isNegative ? '▼' : '▲');
    const indicatorColor = isNegative ? RED : GREEN;

    return new TableRow({
      children: [
        new TableCell({
          borders: allBorders,
          width: { size: colW[0], type: WidthType.DXA },
          shading: { fill: isSubtotal ? LIGHT_BG : fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            children: [new TextRun({
              text: item.name, font: 'Calibri', size: 18,
              bold: isSubtotal, color: isSubtotal ? BLUE : DARK,
            })],
          })],
        }),
        new TableCell({
          borders: allBorders,
          width: { size: colW[1], type: WidthType.DXA },
          shading: { fill: isSubtotal ? LIGHT_BG : fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({
              text: fmt(item.value), font: 'Calibri', size: 18,
              bold: isSubtotal, color: isNegative ? RED : DARK,
            })],
          })],
        }),
        new TableCell({
          borders: allBorders,
          width: { size: colW[2], type: WidthType.DXA },
          shading: { fill: isSubtotal ? LIGHT_BG : fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: `${indicator} ${fmt(Math.abs(item.value))}`,
              font: 'Calibri', size: 16, color: indicatorColor,
            })],
          })],
        }),
      ],
    });
  });

  return [
    new Paragraph({
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text: 'Cascata del Margine (Waterfall)', font: 'Calibri', size: 24, bold: true, color: DARK })],
    }),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: colW,
      rows: [headerRow, ...dataRows],
    }),
  ];
}

// ── Channels table ──
function createChannelsTable(channels: ChannelItem[]): (Paragraph | Table)[] {
  if (!channels.length) return [];
  const colW = [2500, 2000, 2200, 2326];
  const headerLabels = ['Canale', 'Contratti', 'Costo Totale', 'Costo/Cliente'];

  const headerRow = new TableRow({
    children: headerLabels.map((label, i) => new TableCell({
      borders: allBorders,
      width: { size: colW[i], type: WidthType.DXA },
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: i > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text: label, font: 'Calibri', size: 17, bold: true, color: WHITE })],
      })],
    })),
  });

  const totalContratti = channels.reduce((s, c) => s + c.contratti, 0);
  const totalCosto = channels.reduce((s, c) => s + c.costo, 0);

  const dataRows = channels.map((ch, idx) => {
    const fillColor = idx % 2 === 0 ? 'F9FAFB' : WHITE;
    return new TableRow({
      children: [
        new TableCell({
          borders: allBorders, width: { size: colW[0], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: ch.name, font: 'Calibri', size: 18, bold: true })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[1], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: String(ch.contratti), font: 'Calibri', size: 18 })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[2], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(ch.costo), font: 'Calibri', size: 18, color: RED })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[3], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(ch.costoPerCliente), font: 'Calibri', size: 18 })] })],
        }),
      ],
    });
  });

  // Totals row
  const totalRow = new TableRow({
    children: [
      new TableCell({
        borders: allBorders, width: { size: colW[0], type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: 'TOTALE', font: 'Calibri', size: 18, bold: true, color: BLUE })] })],
      }),
      new TableCell({
        borders: allBorders, width: { size: colW[1], type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: String(totalContratti), font: 'Calibri', size: 18, bold: true })] })],
      }),
      new TableCell({
        borders: allBorders, width: { size: colW[2], type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(totalCosto), font: 'Calibri', size: 18, bold: true, color: RED })] })],
      }),
      new TableCell({
        borders: allBorders, width: { size: colW[3], type: WidthType.DXA },
        shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: totalContratti > 0 ? fmt(totalCosto / totalContratti) : '-', font: 'Calibri', size: 18, bold: true })] })],
      }),
    ],
  });

  return [
    new Paragraph({
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text: 'Canali di Vendita — Riepilogo Costi', font: 'Calibri', size: 24, bold: true, color: DARK })],
    }),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: colW,
      rows: [headerRow, ...dataRows, totalRow],
    }),
  ];
}

// ── Client evolution table ──
function createClientEvolutionTable(data: MonthlyClientData[]): (Paragraph | Table)[] {
  if (!data.length) return [];
  const colW = [1600, 1600, 1600, 1800, 1200, 1226];
  const headerLabels = ['Mese', 'Contratti', 'Attivazioni', 'Clienti Attivi', 'Churn', 'Variaz.'];

  const headerRow = new TableRow({
    children: headerLabels.map((label, i) => new TableCell({
      borders: allBorders,
      width: { size: colW[i], type: WidthType.DXA },
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, font: 'Calibri', size: 16, bold: true, color: WHITE })],
      })],
    })),
  });

  let prevClients = 0;
  const dataRows = data.map((row, idx) => {
    const fillColor = idx % 2 === 0 ? 'F9FAFB' : WHITE;
    const delta = row.clientiAttivi - prevClients;
    prevClients = row.clientiAttivi;
    const deltaStr = delta >= 0 ? `+${delta}` : String(delta);

    return new TableRow({
      children: [
        new TableCell({
          borders: allBorders, width: { size: colW[0], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: row.mese, font: 'Calibri', size: 17, bold: true })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[1], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.contrattiNuovi), font: 'Calibri', size: 17 })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[2], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.attivazioni), font: 'Calibri', size: 17, color: GREEN })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[3], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.clientiAttivi), font: 'Calibri', size: 17, bold: true })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[4], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row.churn), font: 'Calibri', size: 17, color: row.churn > 0 ? RED : GRAY })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[5], type: WidthType.DXA },
          shading: { fill: delta >= 0 ? 'F0FDF4' : 'FEF2F2', type: ShadingType.CLEAR },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: deltaStr, font: 'Calibri', size: 17, bold: true, color: delta >= 0 ? GREEN : RED })] })],
        }),
      ],
    });
  });

  return [
    new Paragraph({
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text: 'Evoluzione Base Clienti', font: 'Calibri', size: 24, bold: true, color: DARK })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({
        text: 'Dettaglio mensile di contratti firmati, attivazioni (switch-in M+2), clienti attivi e churn (switch-out M+2).',
        font: 'Calibri', size: 18, italics: true, color: GRAY,
      })],
    }),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: colW,
      rows: [headerRow, ...dataRows],
    }),
  ];
}

function createCashFlowTable(rows: Array<{ mese: string; incassato: number; costiTotali: number; flussoNetto: number; saldoCumulativo: number }>): Table {
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
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.incassato), font: 'Calibri', size: 18, color: GREEN })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[2], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.costiTotali), font: 'Calibri', size: 18, color: RED })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[3], type: WidthType.DXA },
          shading: { fill: fillColor, type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.flussoNetto), font: 'Calibri', size: 18, color: isNegativeFlux ? RED : GREEN, bold: true })] })],
        }),
        new TableCell({
          borders: allBorders, width: { size: colW[4], type: WidthType.DXA },
          shading: { fill: isNegativeSaldo ? 'FEF2F2' : 'F0FDF4', type: ShadingType.CLEAR },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: fmt(r.saldoCumulativo), font: 'Calibri', size: 18, bold: true, color: isNegativeSaldo ? RED : GREEN })] })],
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

// ── Section heading helper ──
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text, font: 'Calibri', size: 28, bold: true, color: BLUE })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: BLUE, space: 4 } },
  });
}

export async function exportDirectorReportDocx({
  projectName, reportContent, kpis, date,
  cashFlowMonthly, costBreakdown, marginWaterfall, channelData, monthlyClients,
}: ExportParams) {
  const reportParagraphs = buildReportParagraphs(reportContent);

  // ── Build analytics section ──
  const analyticsSections: Paragraph[] = [];

  // Cost breakdown bar chart
  if (costBreakdown && costBreakdown.length > 0) {
    analyticsSections.push(new Paragraph({ children: [new PageBreak()] }));
    analyticsSections.push(sectionHeading('ANALISI COSTI E MARGINI'));
    analyticsSections.push(...createBarChartTable(
      'Composizione dei Costi',
      costBreakdown.map(c => ({ label: c.name, value: c.value })),
      { showPercentage: true, barColor: '3B82F6' }
    ));
  }

  // Margin waterfall
  if (marginWaterfall && marginWaterfall.length > 0) {
    analyticsSections.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
    analyticsSections.push(...createWaterfallTable(marginWaterfall));
  }

  // Sales channels
  if (channelData && channelData.length > 0) {
    analyticsSections.push(new Paragraph({ children: [new PageBreak()] }));
    analyticsSections.push(sectionHeading('CANALI DI VENDITA'));
    analyticsSections.push(...createChannelsTable(channelData));
  }

  // Client evolution
  if (monthlyClients && monthlyClients.length > 0) {
    analyticsSections.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
    analyticsSections.push(...createClientEvolutionTable(monthlyClients));
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 21 } },
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
          size: { width: 11906, height: 16838 },
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

        // ── Analytics (charts as tables) ──
        ...analyticsSections,

        // ── Cash Flow Table ──
        new Paragraph({ children: [new PageBreak()] }),

        sectionHeading('ANDAMENTO MENSILE LIQUIDITÀ'),

        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({
            text: 'La tabella seguente mostra i flussi di cassa mensili previsti su 14 mesi di simulazione. ' +
                  'Il "Saldo Cumulativo" rappresenta la posizione di cassa progressiva a partire dall\'avvio: ' +
                  'il valore minimo indica la massima esposizione finanziaria (fabbisogno di copertura).',
            font: 'Calibri', size: 19, italics: true, color: GRAY,
          })],
        }),

        ...(cashFlowMonthly && cashFlowMonthly.length > 0
          ? [createCashFlowTable(cashFlowMonthly)]
          : []),

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
