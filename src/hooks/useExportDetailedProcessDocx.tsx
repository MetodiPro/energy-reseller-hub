import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, WidthType, ShadingType, BorderStyle,
  PageBreak, HeadingLevel, PageNumber, ExternalHyperlink, LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import { processSteps, phases } from '@/data/processSteps';
import type { StepProgress } from './useStepProgress';

const categoryLabels: Record<string, string> = {
  legal: 'Legale',
  administrative: 'Amministrativo',
  technical: 'Tecnico',
  operational: 'Operativo',
  commercial: 'Commerciale',
};

const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
};

const formatCosts = (costs?: { min: number; max: number; description: string }): string => {
  if (!costs) return 'N/D';
  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (costs.min === 0 && costs.max === 0) return 'Gratuito';
  if (costs.min === costs.max) return fmt.format(costs.min);
  return `${fmt.format(costs.min)} - ${fmt.format(costs.max)}`;
};

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

const makeHeaderCell = (text: string, width: number) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: '7C3AED', type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 18 })] })],
  });

const makeCell = (text: string, width: number, opts?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string }) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts?.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ alignment: opts?.align ?? AlignmentType.LEFT, children: [new TextRun({ text, bold: opts?.bold, font: 'Arial', size: 18 })] })],
  });

interface ExportOptions {
  projectName: string;
  commodityType?: string | null;
  stepProgress: Record<string, StepProgress>;
}

export const useExportDetailedProcessDocx = () => {
  const exportDetailedDocx = async ({ projectName, commodityType, stepProgress }: ExportOptions) => {
    const filterStep = (step: typeof processSteps[0]) => {
      if (!step.commodityType || step.commodityType === 'all') return true;
      if (!commodityType) return true;
      if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
      return true;
    };

    const visibleSteps = processSteps.filter(filterStep);
    const totalSteps = visibleSteps.length;
    const completedSteps = visibleSteps.filter(s => stepProgress[s.id]?.completed).length;
    const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const children: (Paragraph | Table)[] = [];

    // ─── Title ───
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Guida Completa al Processo', bold: true, font: 'Arial', size: 36, color: '7C3AED' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Reseller Energia Elettrica', font: 'Arial', size: 28, color: '555555' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: projectName, font: 'Arial', size: 24, color: '7C3AED' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: `Generato il ${new Date().toLocaleDateString('it-IT')}`, font: 'Arial', size: 18, color: '999999' })] }));

    // Summary
    children.push(new Paragraph({ spacing: { after: 200 }, children: [
      new TextRun({ text: `Progresso: ${completedSteps}/${totalSteps} step completati (${completionRate}%)`, font: 'Arial', size: 22, bold: true }),
    ] }));
    children.push(new Paragraph({ spacing: { after: 300 }, children: [
      new TextRun({ text: `7 Fasi \u2022 ${totalSteps} Step Operativi`, font: 'Arial', size: 20, color: '888888' }),
    ] }));

    // Phase overview table
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: 'Riepilogo Fasi', bold: true, font: 'Arial', size: 28, color: '7C3AED' })] }));

    const colWidths = [1200, 3200, 1400, 1400, 2160];
    const phaseRows = [
      new TableRow({ children: [makeHeaderCell('Fase', colWidths[0]), makeHeaderCell('Nome', colWidths[1]), makeHeaderCell('Step', colWidths[2]), makeHeaderCell('Durata', colWidths[3]), makeHeaderCell('Completati', colWidths[4])] }),
      ...phases.map((phase, i) => {
        const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
        const completed = phaseSteps.filter(s => stepProgress[s.id]?.completed).length;
        const totalDays = phaseSteps.reduce((sum, s) => sum + s.estimatedDays, 0);
        const fill = i % 2 === 0 ? 'F8F9FA' : undefined;
        return new TableRow({ children: [
          makeCell(`${phase.id}`, colWidths[0], { align: AlignmentType.CENTER, fill }),
          makeCell(phase.name, colWidths[1], { fill }),
          makeCell(`${phaseSteps.length}`, colWidths[2], { align: AlignmentType.CENTER, fill }),
          makeCell(`${totalDays} gg`, colWidths[3], { align: AlignmentType.CENTER, fill }),
          makeCell(`${completed}/${phaseSteps.length}`, colWidths[4], { align: AlignmentType.CENTER, fill }),
        ] });
      }),
    ];
    children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: colWidths, rows: phaseRows }));

    // ─── Detailed Steps per Phase ───
    phases.forEach(phase => {
      const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
      if (phaseSteps.length === 0) return;

      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 300 }, children: [new TextRun({ text: `Fase ${phase.id}: ${phase.name}`, bold: true, font: 'Arial', size: 32, color: '7C3AED' })] }));

      phaseSteps.forEach(step => {
        const progress = stepProgress[step.id];
        const isCompleted = progress?.completed || false;

        // Step title
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
          shading: { fill: isCompleted ? 'DCFCE7' : 'F1F5F9', type: ShadingType.CLEAR },
          children: [
            new TextRun({ text: isCompleted ? '✓ ' : '○ ', font: 'Arial', size: 24, color: isCompleted ? '16A34A' : '888888' }),
            new TextRun({ text: step.title, bold: true, font: 'Arial', size: 24 }),
          ],
        }));

        // Metadata line
        children.push(new Paragraph({ spacing: { after: 100 }, children: [
          new TextRun({ text: `${categoryLabels[step.category]} | Priorità ${priorityLabels[step.priority]} | ${step.estimatedDays} giorni stimati`, font: 'Arial', size: 18, color: '888888' }),
        ] }));

        // Description
        children.push(new Paragraph({ spacing: { after: 150 }, children: [new TextRun({ text: step.description, font: 'Arial', size: 20, color: '444444' })] }));

        // Costs
        if (step.costs) {
          children.push(new Paragraph({ spacing: { after: 60 }, children: [
            new TextRun({ text: 'Costi stimati: ', bold: true, font: 'Arial', size: 20, color: '7C3AED' }),
            new TextRun({ text: formatCosts(step.costs), bold: true, font: 'Arial', size: 20, color: '7C3AED' }),
          ] }));
          children.push(new Paragraph({ spacing: { after: 150 }, children: [
            new TextRun({ text: step.costs.description, font: 'Arial', size: 18, italics: true, color: '888888' }),
          ] }));
        }

        // Notes
        if (step.notes.length > 0) {
          children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Note Esplicative', bold: true, font: 'Arial', size: 20, color: '92400E' })] }));
          step.notes.forEach(note => {
            children.push(new Paragraph({
              spacing: { after: 40 },
              numbering: { reference: 'notes-bullets', level: 0 },
              children: [new TextRun({ text: note, font: 'Arial', size: 18, color: '78350F' })],
            }));
          });
        }

        // Documents
        if (step.documents.length > 0) {
          children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Documenti Richiesti', bold: true, font: 'Arial', size: 20, color: '1E40AF' })] }));
          step.documents.forEach(docName => {
            children.push(new Paragraph({
              spacing: { after: 40 },
              numbering: { reference: 'doc-bullets', level: 0 },
              children: [new TextRun({ text: docName, font: 'Arial', size: 18, color: '1E3A8A' })],
            }));
          });
        }

        // Checklist
        if (step.checklist.length > 0) {
          children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Checklist Operativa', bold: true, font: 'Arial', size: 20, color: '166534' })] }));
          step.checklist.forEach((item, idx) => {
            const checked = progress?.checklistProgress?.[idx] || false;
            children.push(new Paragraph({
              spacing: { after: 40 },
              indent: { left: 360 },
              children: [
                new TextRun({ text: checked ? '☑ ' : '☐ ', font: 'Arial', size: 18, color: checked ? '16A34A' : '888888' }),
                new TextRun({ text: item, font: 'Arial', size: 18, color: '333333' }),
              ],
            }));
          });
        }

        // Official Links
        if (step.officialLinks && step.officialLinks.length > 0) {
          children.push(new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: 'Link Ufficiali', bold: true, font: 'Arial', size: 20, color: '7C3AED' })] }));
          step.officialLinks.forEach(link => {
            children.push(new Paragraph({
              spacing: { after: 40 },
              indent: { left: 360 },
              children: [
                new ExternalHyperlink({
                  children: [new TextRun({ text: link.name, style: 'Hyperlink', font: 'Arial', size: 18 })],
                  link: link.url,
                }),
                ...(link.description ? [new TextRun({ text: ` - ${link.description}`, font: 'Arial', size: 16, color: '888888' })] : []),
              ],
            }));
          });
        }

        // Personal notes
        if (progress?.notes) {
          children.push(new Paragraph({
            spacing: { before: 100, after: 60 },
            shading: { fill: 'FEF9C3', type: ShadingType.CLEAR },
            children: [new TextRun({ text: 'Note Personali:', bold: true, font: 'Arial', size: 18, color: '713F12' })],
          }));
          children.push(new Paragraph({
            spacing: { after: 100 },
            shading: { fill: 'FEF9C3', type: ShadingType.CLEAR },
            children: [new TextRun({ text: progress.notes, font: 'Arial', size: 18, color: '854D0E' })],
          }));
        }

        // Separator
        children.push(new Paragraph({ spacing: { before: 100, after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD', space: 1 } }, children: [] }));
      });
    });

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: 'notes-bullets',
            levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
          },
          {
            reference: 'doc-bullets',
            levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
          },
        ],
      },
      sections: [{
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1270, bottom: 1440, left: 1270 } },
        },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${projectName} - Processo Dettagliato`, font: 'Arial', size: 16, color: 'AAAAAA' })] })] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Pagina ', font: 'Arial', size: 16, color: 'AAAAAA' }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: 'AAAAAA' })] })] }),
        },
        children: children as any,
      }],
    });

    const buffer = await Packer.toBlob(doc);
    const fileName = `processo-dettagliato-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.docx`;
    saveAs(buffer, fileName);
  };

  return { exportDetailedDocx };
};
