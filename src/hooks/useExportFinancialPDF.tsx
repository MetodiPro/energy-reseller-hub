import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProjectCost } from './useProjectFinancials';

const COST_CATEGORY_LABELS: Record<string, string> = {
  operational: 'Gestionali',
  commercial: 'Commerciali',
  infrastructure: 'Infrastrutturali',
};

const COST_CATEGORY_COLORS: Record<string, number[]> = {
  operational: [59, 130, 246],
  commercial: [168, 85, 247],
  infrastructure: [234, 179, 8],
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

type CostCategory = 'operational' | 'commercial' | 'infrastructure';

const categorizeCost = (cost: ProjectCost): CostCategory | null => {
  if (cost.is_passthrough) return null;
  const name = cost.name.toLowerCase();
  const desc = (cost.description || '').toLowerCase();
  const combined = `${name} ${desc}`;

  const commercialPatterns = ['commissione', 'provvigion', 'agente', 'agenzia', 'marketing', 'pubblicità', 'promozione', 'vendita', 'commerciale', 'brand', 'crm', 'lead', 'customer acquisition'];
  const infraPatterns = ['server', 'software', 'licenz', 'hardware', 'it ', 'piattaforma', 'hosting', 'infrastruttur', 'ufficio', 'affitto', 'arredamento', 'attrezzatur', 'cloud', 'tecnolog'];

  if (cost.cost_type === 'commercial' || commercialPatterns.some(p => combined.includes(p))) return 'commercial';
  if (infraPatterns.some(p => combined.includes(p))) return 'infrastructure';
  return 'operational';
};

export const useExportFinancialPDF = () => {
  const exportToPDF = (
    projectName: string,
    costs: ProjectCost[],
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Report Costi', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.text(projectName, pageWidth / 2, 28, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 45, { align: 'center' });

    let yPosition = 55;

    // Categorize costs
    const categorized: Record<CostCategory, ProjectCost[]> = {
      operational: [],
      commercial: [],
      infrastructure: [],
    };

    costs.forEach(cost => {
      const cat = categorizeCost(cost);
      if (cat) categorized[cat].push(cost);
    });

    const totalCosts = Object.values(categorized).flat().reduce((sum, c) => sum + (c.amount * c.quantity), 0);

    // Summary table
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('Riepilogo Costi', 14, yPosition);
    yPosition += 10;

    const summaryData = (['operational', 'commercial', 'infrastructure'] as CostCategory[]).map(cat => {
      const catTotal = categorized[cat].reduce((sum, c) => sum + (c.amount * c.quantity), 0);
      const pct = totalCosts > 0 ? `${((catTotal / totalCosts) * 100).toFixed(1)}%` : '0%';
      return [COST_CATEGORY_LABELS[cat], `${categorized[cat].length} voci`, formatCurrency(catTotal), pct];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Categoria', 'Voci', 'Importo', '% su Totale']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: { halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      styles: { fontSize: 10, cellPadding: 5 },
      foot: [['TOTALE', `${Object.values(categorized).flat().length} voci`, formatCurrency(totalCosts), '100%']],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'right',
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Detail per category
    (['operational', 'commercial', 'infrastructure'] as CostCategory[]).forEach((cat) => {
      const catCosts = categorized[cat];
      if (catCosts.length === 0) return;

      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      const color = COST_CATEGORY_COLORS[cat];

      doc.setFontSize(13);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont(undefined, 'bold');
      doc.text(`Costi ${COST_CATEGORY_LABELS[cat]}`, 14, yPosition);
      yPosition += 8;

      const costData = catCosts.map(c => [
        c.name,
        c.description || '-',
        `${c.quantity} ${c.unit}`,
        formatCurrency(c.amount),
        formatCurrency(c.amount * c.quantity),
        c.is_recurring ? `Ricorrente (${c.recurrence_period || 'mensile'})` : 'Una tantum',
      ]);

      const catTotal = catCosts.reduce((sum, c) => sum + (c.amount * c.quantity), 0);

      autoTable(doc, {
        startY: yPosition,
        head: [['Descrizione', 'Note', 'Quantità', 'Costo Unit.', 'Totale', 'Tipo']],
        body: costData,
        theme: 'striped',
        headStyles: {
          fillColor: [color[0], color[1], color[2]] as [number, number, number],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { halign: 'center', cellWidth: 22 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
          5: { cellWidth: 30 },
        },
        styles: { cellPadding: 3 },
        foot: [['', '', '', `Subtotale`, formatCurrency(catTotal), '']],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    });

    // Footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Pagina ${i} di ${pageCount} - Report generato da Energy Start Buddy`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const fileName = `report-costi-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return { exportToPDF };
};
