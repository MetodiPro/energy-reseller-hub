import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak, HeadingLevel, PageNumber } from 'docx';
import { saveAs } from 'file-saver';
import { processSteps, phases } from '@/data/processSteps';
import { stepCostsData, costCategoryLabels, StepCostCategory } from '@/types/stepCosts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

interface CostGetter {
  (stepId: string, costItemId: string): number;
}

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

const makeHeaderCell = (text: string, width: number) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: '7C3AED', type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })],
  });

const makeCell = (text: string, width: number, opts?: { bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; fill?: string }) =>
  new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts?.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ alignment: opts?.align ?? AlignmentType.LEFT, children: [new TextRun({ text, bold: opts?.bold, font: 'Arial', size: 20 })] })],
  });

export const useExportProcessCostsDocx = () => {
  const exportToDocx = async (projectName: string, commodityType: string | null, getCostAmount: CostGetter) => {
    const filterStep = (step: typeof processSteps[0]) => {
      if (!step.commodityType || step.commodityType === 'all') return true;
      if (!commodityType) return true;
      if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
      return true;
    };

    const visibleSteps = processSteps.filter(filterStep);

    let grandTotal = 0;
    const byCategory: Record<StepCostCategory, number> = {
      licenze: 0, consulenza: 0, burocrazia: 0, software: 0, garanzie: 0,
      formazione: 0, personale: 0, infrastruttura: 0, altro: 0,
    };
    const stepTotals: Record<string, number> = {};

    visibleSteps.forEach(step => {
      const stepData = stepCostsData[step.id];
      if (stepData) {
        let stepTotal = 0;
        stepData.items.forEach(item => {
          const amount = getCostAmount(step.id, item.id);
          grandTotal += amount;
          stepTotal += amount;
          byCategory[item.category] += amount;
        });
        stepTotals[step.id] = stepTotal;
      }
    });

    const children: Paragraph[] | (Paragraph | Table)[] = [];

    // Title
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Costi di Avvio Reseller', bold: true, font: 'Arial', size: 36, color: '7C3AED' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: projectName, font: 'Arial', size: 28, color: '555555' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: `Generato il ${new Date().toLocaleDateString('it-IT')}`, font: 'Arial', size: 20, color: '999999' })] }));

    // Total box
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 }, children: [new TextRun({ text: 'Riepilogo Investimento', bold: true, font: 'Arial', size: 28, color: '7C3AED' })] }));
    children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Investimento Totale Stimato: ', font: 'Arial', size: 22 }), new TextRun({ text: formatCurrency(grandTotal), bold: true, font: 'Arial', size: 28, color: '7C3AED' })] }));

    const stepsWithCosts = visibleSteps.filter(s => stepCostsData[s.id]).length;
    children.push(new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: `${stepsWithCosts} step con costi dettagliati`, font: 'Arial', size: 20, color: '999999' })] }));

    // Category table
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: 'Ripartizione per Categoria', bold: true, font: 'Arial', size: 28, color: '7C3AED' })] }));

    const categoryData = Object.entries(byCategory).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const colWidths = [4500, 2500, 2360];

    const catRows = [
      new TableRow({ children: [makeHeaderCell('Categoria', colWidths[0]), makeHeaderCell('Importo', colWidths[1]), makeHeaderCell('% su Totale', colWidths[2])] }),
      ...categoryData.map(([cat, amount], i) => {
        const config = costCategoryLabels[cat as StepCostCategory];
        const pct = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
        const fill = i % 2 === 0 ? 'F8F9FA' : undefined;
        return new TableRow({ children: [makeCell(config.label, colWidths[0], { fill }), makeCell(formatCurrency(amount), colWidths[1], { align: AlignmentType.RIGHT, fill }), makeCell(formatPercent(pct), colWidths[2], { align: AlignmentType.CENTER, fill })] });
      }),
      new TableRow({ children: [makeCell('TOTALE', colWidths[0], { bold: true, fill: 'F5F3FF' }), makeCell(formatCurrency(grandTotal), colWidths[1], { bold: true, align: AlignmentType.RIGHT, fill: 'F5F3FF' }), makeCell('100%', colWidths[2], { bold: true, align: AlignmentType.CENTER, fill: 'F5F3FF' })] }),
    ];

    children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: colWidths, rows: catRows }));

    // Phase table
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: 'Ripartizione per Fase', bold: true, font: 'Arial', size: 28, color: '7C3AED' })] }));

    const phaseRows = [
      new TableRow({ children: [makeHeaderCell('Fase', colWidths[0]), makeHeaderCell('Importo', colWidths[1]), makeHeaderCell('% su Totale', colWidths[2])] }),
      ...phases.map((phase, i) => {
        const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
        const phaseTotal = phaseSteps.reduce((sum, s) => sum + (stepTotals[s.id] || 0), 0);
        if (phaseTotal === 0) return null;
        const pct = grandTotal > 0 ? (phaseTotal / grandTotal) * 100 : 0;
        const fill = i % 2 === 0 ? 'F8F9FA' : undefined;
        return new TableRow({ children: [makeCell(`Fase ${phase.id}: ${phase.name}`, colWidths[0], { fill }), makeCell(formatCurrency(phaseTotal), colWidths[1], { align: AlignmentType.RIGHT, fill }), makeCell(formatPercent(pct), colWidths[2], { align: AlignmentType.CENTER, fill })] });
      }).filter(Boolean) as TableRow[],
    ];

    children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: colWidths, rows: phaseRows }));

    // Detail page
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 300 }, children: [new TextRun({ text: 'Dettaglio Costi per Step', bold: true, font: 'Arial', size: 28, color: '7C3AED' })] }));

    const detColWidths = [3500, 2300, 1560, 2000];

    phases.forEach(phase => {
      const phaseSteps = visibleSteps.filter(s => s.phase === phase.id && stepCostsData[s.id]);
      if (phaseSteps.length === 0) return;

      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 200 }, children: [new TextRun({ text: `Fase ${phase.id}: ${phase.name}`, bold: true, font: 'Arial', size: 24, color: '64748B' })] }));

      phaseSteps.forEach(step => {
        const stepData = stepCostsData[step.id];
        if (!stepData) return;

        children.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: step.title, bold: true, font: 'Arial', size: 22 }), new TextRun({ text: `  ${formatCurrency(stepTotals[step.id] || 0)}`, bold: true, font: 'Arial', size: 22, color: '7C3AED' })] }));

        const detRows = [
          new TableRow({ children: [makeHeaderCell('Voce', detColWidths[0]), makeHeaderCell('Categoria', detColWidths[1]), makeHeaderCell('Tipo', detColWidths[2]), makeHeaderCell('Importo', detColWidths[3])] }),
          ...stepData.items.map((item, i) => {
            const config = costCategoryLabels[item.category];
            const amount = getCostAmount(step.id, item.id);
            const fill = i % 2 === 0 ? 'F8F9FA' : undefined;
            return new TableRow({ children: [makeCell(item.name, detColWidths[0], { fill }), makeCell(config.label, detColWidths[1], { fill }), makeCell(item.isOptional ? 'Opzionale' : 'Necessario', detColWidths[2], { align: AlignmentType.CENTER, fill }), makeCell(formatCurrency(amount), detColWidths[3], { align: AlignmentType.RIGHT, bold: true, fill })] });
          }),
        ];

        children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: detColWidths, rows: detRows }));
      });
    });

    // Notes
    children.push(new Paragraph({ spacing: { before: 400, after: 100 }, children: [new TextRun({ text: 'Note Importanti', bold: true, font: 'Arial', size: 22, color: '713F12' })] }));

    const notes = [
      'I costi indicati sono stime indicative e possono variare in base alle specifiche esigenze.',
      'Le garanzie finanziarie (fideiussioni) dipendono dai volumi previsti e dalle condizioni del grossista.',
      'Il reseller non versa contributi diretti a CSEA: gli oneri sono gestiti in transito verso il distributore.',
      'Si consiglia di consultare professionisti del settore per una valutazione personalizzata.',
    ];
    notes.forEach(note => {
      children.push(new Paragraph({ spacing: { after: 60 }, numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: note, font: 'Arial', size: 18, color: '713F12' })] }));
    });

    const doc = new Document({
      numbering: {
        config: [{
          reference: 'bullets',
          levels: [{ level: 0, format: 'bullet' as any, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
        }],
      },
      sections: [{
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1270, bottom: 1440, left: 1270 } },
        },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Costi di Avvio - ' + projectName, font: 'Arial', size: 16, color: 'AAAAAA' })] })] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Pagina ', font: 'Arial', size: 16, color: 'AAAAAA' }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: 'AAAAAA' })] })] }),
        },
        children: children as any,
      }],
    });

    const buffer = await Packer.toBlob(doc);
    const fileName = `costi-avvio-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.docx`;
    saveAs(buffer, fileName);
  };

  return { exportToDocx };
};
