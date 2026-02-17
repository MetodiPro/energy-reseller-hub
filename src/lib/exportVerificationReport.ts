import type { BusinessPlanIssue } from './businessPlanValidator';
import type { MarketingPlanIssue } from './marketingPlanValidator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  AlignmentType,
  PageBreak,
  BorderStyle,
} from 'docx';

type AnyIssue = BusinessPlanIssue | MarketingPlanIssue;

interface IssueSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
  score: number;
}

function getSummary(issues: AnyIssue[]): IssueSummary {
  const critical = issues.filter(i => i.severity === 'critical').length;
  const warning = issues.filter(i => i.severity === 'warning').length;
  const info = issues.filter(i => i.severity === 'info').length;
  return {
    critical,
    warning,
    info,
    total: issues.length,
    score: Math.max(0, 100 - critical * 25 - warning * 8 - info * 2),
  };
}

function severityLabel(s: string): string {
  switch (s) {
    case 'critical': return 'CRITICO';
    case 'warning': return 'ATTENZIONE';
    case 'info': return 'SUGGERIMENTO';
    default: return s;
  }
}

function severityColor(s: string): [number, number, number] {
  switch (s) {
    case 'critical': return [220, 38, 38];
    case 'warning': return [234, 179, 8];
    case 'info': return [59, 130, 246];
    default: return [100, 100, 100];
  }
}

function severityHex(s: string): string {
  switch (s) {
    case 'critical': return 'DC2626';
    case 'warning': return 'EAB308';
    case 'info': return '3B82F6';
    default: return '666666';
  }
}

// ─── PDF ─────────────────────────────────────────────

export function addVerificationReportToPDF(
  doc: jsPDF,
  issues: AnyIssue[],
  accentColor: [number, number, number],
  startPageNum: number
): number {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let currentPage = startPageNum;

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Pagina ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, margin, pageHeight - 10);
  };

  doc.addPage();
  addFooter();
  currentPage++;
  let y = margin;

  // Header
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(margin, y, pageWidth - 2 * margin, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Report di Verifica', margin + 5, y + 10);
  y += 25;

  if (issues.length === 0) {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('[OK] Nessuna criticita rilevata', margin, y);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    y += 10;
    doc.text('Tutti i dati del progetto risultano coerenti e completi.', margin, y);
    return currentPage;
  }

  const summary = getSummary(issues);

  // Score card
  const scoreColor: [number, number, number] = summary.score >= 80 ? [34, 197, 94] : summary.score >= 50 ? [234, 179, 8] : [220, 38, 38];
  doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 3, 3, 'S');
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${summary.score}%`, margin + 10, y + 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text('Punteggio completezza dati', margin + 40, y + 12);
  doc.text(
    `${summary.critical} critici  |  ${summary.warning} avvisi  |  ${summary.info} suggerimenti`,
    margin + 40,
    y + 22
  );
  y += 40;

  // Issues table
  const tableData = issues.map(issue => [
    severityLabel(issue.severity),
    issue.title,
    issue.description,
    issue.action,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Severita', 'Problema', 'Descrizione', 'Azione Consigliata']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [accentColor[0], accentColor[1], accentColor[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 55 },
      3: { cellWidth: 50 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const val = data.cell.raw as string;
        if (val === 'CRITICO') {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (val === 'ATTENZIONE') {
          data.cell.styles.textColor = [180, 130, 0];
        } else {
          data.cell.styles.textColor = [59, 130, 246];
        }
      }
    },
  });

  return currentPage;
}

// ─── DOCX ────────────────────────────────────────────

export function createVerificationReportDocx(
  issues: AnyIssue[],
  accentHex: string
): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  children.push(new Paragraph({ children: [new PageBreak()] }));

  children.push(
    new Paragraph({
      text: 'Report di Verifica',
      heading: 'Heading1' as any,
      spacing: { before: 200, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: accentHex } },
    })
  );

  if (issues.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Nessuna criticità rilevata', bold: true, size: 28, color: '16A34A' })],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Tutti i dati del progetto risultano coerenti e completi.', size: 22, color: '6B7280' })],
        spacing: { after: 200 },
      })
    );
    return children;
  }

  const summary = getSummary(issues);
  const scoreHex = summary.score >= 80 ? '16A34A' : summary.score >= 50 ? 'EAB308' : 'DC2626';

  // Score summary
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Punteggio completezza: `, size: 24 }),
        new TextRun({ text: `${summary.score}%`, bold: true, size: 32, color: scoreHex }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${summary.critical} critici  •  ${summary.warning} avvisi  •  ${summary.info} suggerimenti`, size: 20, color: '6B7280' }),
      ],
      spacing: { after: 300 },
    })
  );

  // Issues table
  const headerRow = new TableRow({
    children: ['Severità', 'Problema', 'Descrizione', 'Azione'].map(h =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })],
        shading: { type: ShadingType.SOLID, color: accentHex },
      })
    ),
  });

  const issueRows = issues.map((issue, idx) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: severityLabel(issue.severity), bold: true, size: 18, color: severityHex(issue.severity) })],
            alignment: AlignmentType.CENTER,
          })],
          shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: 'F3F4F6' } : undefined,
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: issue.title, bold: true, size: 18 })] })],
          shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: 'F3F4F6' } : undefined,
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: issue.description, size: 18 })] })],
          shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: 'F3F4F6' } : undefined,
          width: { size: 35, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: issue.action, italics: true, size: 18, color: '6B7280' })] })],
          shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: 'F3F4F6' } : undefined,
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
      ],
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...issueRows],
    })
  );

  return children;
}
