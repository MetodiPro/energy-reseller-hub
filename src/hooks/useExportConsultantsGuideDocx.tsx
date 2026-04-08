import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  consultantTaskTemplates,
  consultantTypeLabels,
  type ConsultantType,
} from '@/data/consultantTasks';

const phaseLabels: Record<string, string> = {
  startup: 'Fase di Avvio',
  operational: 'Fase Operativa',
  ongoing: 'Attività Ricorrenti',
};

const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
};

const recurrenceLabels: Record<string, string> = {
  monthly: 'Mensile',
  quarterly: 'Trimestrale',
  yearly: 'Annuale',
};

const typeColors: Record<string, string> = {
  commercialista: '22C55E',
  legale: '3B82F6',
  formazione: 'A855F7',
  it_software: 'EC4899',
  operativo: 'F97316',
  entrambi: '6B7280',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

export const useExportConsultantsGuideDocx = () => {
  const exportGuideDocx = async (projectName?: string) => {
    const templates = consultantTaskTemplates;
    const types: ConsultantType[] = ['commercialista', 'legale', 'formazione', 'it_software', 'operativo', 'entrambi'];
    const grandTotal = templates.reduce((s, t) => s + t.estimatedCost, 0);
    const children: any[] = [];

    // Title
    children.push(
      new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
        new TextRun({ text: 'Guida Completa Consulenti', bold: true, size: 48, color: '7C3AED' }),
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: 'Tutte le attività necessarie per avviare un reseller energia', size: 24, color: '6B7280' }),
      ]}),
    );
    if (projectName) {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: projectName, size: 22, bold: true, color: '7C3AED' }),
      ]}));
    }
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [
      new TextRun({ text: `Generato il ${new Date().toLocaleDateString('it-IT')}`, size: 18, color: '999999' }),
    ]}));

    // Summary table
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 }, children: [
      new TextRun({ text: 'Riepilogo per Tipologia Consulente', bold: true, size: 28, color: '7C3AED' }),
    ]}));

    const summaryHeader = new TableRow({ children: ['Consulente', 'N° Attività', 'Avvio', 'Operativo', 'Ricorrente', 'Costo Stimato'].map(h =>
      new TableCell({ borders: cellBorders, margins: cellMargins, shading: { fill: '7C3AED', type: ShadingType.CLEAR },
        width: { size: h === 'Consulente' ? 2800 : 1300, type: WidthType.DXA },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF' })] })],
      })
    )});

    const summaryRows = types.map(type => {
      const tasks = templates.filter(t => t.consultantType === type);
      if (tasks.length === 0) return null;
      const vals = [
        consultantTypeLabels[type],
        String(tasks.length),
        String(tasks.filter(t => t.phase === 'startup').length),
        String(tasks.filter(t => t.phase === 'operational').length),
        String(tasks.filter(t => t.phase === 'ongoing').length),
        formatCurrency(tasks.reduce((s, t) => s + t.estimatedCost, 0)),
      ];
      return new TableRow({ children: vals.map((v, i) =>
        new TableCell({ borders: cellBorders, margins: cellMargins,
          width: { size: i === 0 ? 2800 : 1300, type: WidthType.DXA },
          children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER, children: [new TextRun({ text: v, size: 18 })] })],
        })
      )});
    }).filter(Boolean) as TableRow[];

    const footerRow = new TableRow({ children: ['TOTALE', String(templates.length), '', '', '', formatCurrency(grandTotal)].map((v, i) =>
      new TableCell({ borders: cellBorders, margins: cellMargins, shading: { fill: 'F5F3FF', type: ShadingType.CLEAR },
        width: { size: i === 0 ? 2800 : 1300, type: WidthType.DXA },
        children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER, children: [new TextRun({ text: v, bold: true, size: 18 })] })],
      })
    )});

    children.push(new Table({
      width: { size: 9300, type: WidthType.DXA },
      columnWidths: [2800, 1300, 1300, 1300, 1300, 1300],
      rows: [summaryHeader, ...summaryRows, footerRow],
    }));

    // Detail per type
    types.forEach(type => {
      const tasks = templates.filter(t => t.consultantType === type);
      if (tasks.length === 0) return;
      const color = typeColors[type] || '6B7280';
      const label = consultantTypeLabels[type];

      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 100, after: 100 }, children: [
        new TextRun({ text: label, bold: true, size: 32, color }),
      ]}));
      children.push(new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun({ text: `${tasks.length} attività — Costo stimato totale: ${formatCurrency(tasks.reduce((s, t) => s + t.estimatedCost, 0))}`, size: 20, color: '6B7280' }),
      ]}));

      const phases = ['startup', 'operational', 'ongoing'] as const;
      phases.forEach(phase => {
        const phaseTasks = tasks.filter(t => t.phase === phase);
        if (phaseTasks.length === 0) return;

        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 150 }, children: [
          new TextRun({ text: phaseLabels[phase], bold: true, size: 24, color }),
        ]}));

        // Table header
        const headers = ['Attività', 'Descrizione', 'Categoria', 'Priorità', 'Ric.', 'Costo'];
        const colWidths = [2000, 3200, 1500, 800, 800, 1000];

        const headerRow = new TableRow({ children: headers.map((h, i) =>
          new TableCell({ borders: cellBorders, margins: cellMargins,
            shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
            width: { size: colWidths[i], type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 16 })] })],
          })
        )});

        const dataRows = phaseTasks.map(t => {
          const vals = [
            t.title,
            t.description,
            t.category + (t.subcategory ? ` / ${t.subcategory}` : ''),
            priorityLabels[t.priority],
            t.isRecurring ? (recurrenceLabels[t.recurrencePattern || ''] || 'Sì') : 'No',
            formatCurrency(t.estimatedCost),
          ];
          return new TableRow({ children: vals.map((v, i) =>
            new TableCell({ borders: cellBorders, margins: cellMargins,
              width: { size: colWidths[i], type: WidthType.DXA },
              children: [new Paragraph({
                alignment: i >= 3 ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [new TextRun({ text: v, size: 16, bold: i === 0 })],
              })],
            })
          )});
        });

        children.push(new Table({
          width: { size: 9300, type: WidthType.DXA },
          columnWidths: colWidths,
          rows: [headerRow, ...dataRows],
        }));
      });
    });

    // Legend
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 }, children: [
      new TextRun({ text: 'Legenda e Note', bold: true, size: 28, color: '7C3AED' }),
    ]}));
    const legendItems = [
      'Le attività sono organizzate per tipologia di consulente e fase (Avvio, Operativa, Ricorrente).',
      'I costi stimati sono indicativi e possono variare in base al professionista e alla complessità del progetto.',
      'Le attività ricorrenti (Mensile / Trimestrale / Annuale) rappresentano costi periodici da sostenere dopo l\'avvio.',
      'Le priorità (Alta, Media, Bassa) indicano l\'urgenza relativa nel percorso di avvio del reseller.',
      'Si consiglia di personalizzare le stime di costo in base ai preventivi effettivi ricevuti dai professionisti.',
    ];
    legendItems.forEach(item => {
      children.push(new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: '• ', size: 20 }),
        new TextRun({ text: item, size: 20 }),
      ]}));
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 20 } } },
      },
      sections: [{
        properties: {
          page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } },
        },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
            new TextRun({ text: 'Guida Consulenti — Energy Start Buddy', size: 16, color: 'AAAAAA' }),
          ]})] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: 'Pagina ', size: 16, color: 'AAAAAA' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: 'AAAAAA' }),
          ]})] }),
        },
        children,
      }],
    });

    const buffer = await Packer.toBlob(doc);
    const fileName = `guida-consulenti-${projectName ? projectName.replace(/\s+/g, '-').toLowerCase() + '-' : ''}${new Date().toISOString().split('T')[0]}.docx`;
    saveAs(buffer, fileName);
  };

  return { exportGuideDocx };
};
