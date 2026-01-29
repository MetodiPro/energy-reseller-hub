import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProjectCost, ProjectRevenue, FinancialSummary } from './useProjectFinancials';

const COST_TYPE_LABELS = {
  commercial: 'Commerciali',
  structural: 'Strutturali',
  direct: 'Diretti',
  indirect: 'Indiretti',
};

const STATUS_LABELS: Record<string, string> = {
  expected: 'Previsto',
  invoiced: 'Fatturato',
  received: 'Incassato',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

export const useExportFinancialPDF = () => {
  const exportToPDF = (
    projectName: string,
    costs: ProjectCost[],
    revenues: ProjectRevenue[],
    summary: FinancialSummary
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Report Finanziario', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(projectName, pageWidth / 2, 28, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 45, { align: 'center' });
    
    let yPosition = 55;
    
    // Executive Summary Section
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('Riepilogo Esecutivo', 14, yPosition);
    yPosition += 10;
    
    // Summary KPIs Table
    autoTable(doc, {
      startY: yPosition,
      head: [['Indicatore', 'Valore', '% sui Ricavi']],
      body: [
        ['Ricavi Totali', formatCurrency(summary.totalRevenue), '100%'],
        ['Costi Totali', formatCurrency(summary.totalCosts), formatPercent((summary.totalCosts / summary.totalRevenue) * 100 || 0)],
        ['Margine Lordo', formatCurrency(summary.grossMargin), formatPercent(summary.grossMarginPercent)],
        ['Margine di Contribuzione', formatCurrency(summary.contributionMargin), formatPercent(summary.contributionMarginPercent)],
        ['Margine Netto', formatCurrency(summary.netMargin), formatPercent(summary.netMarginPercent)],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        halign: 'right',
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Cost Breakdown by Type
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.setFont(undefined, 'bold');
    doc.text('Ripartizione Costi per Tipologia', 14, yPosition);
    yPosition += 10;
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Tipologia', 'Importo', '% su Costi Totali']],
      body: [
        ['Costi Diretti', formatCurrency(summary.costsByType.direct), formatPercent((summary.costsByType.direct / summary.totalCosts) * 100 || 0)],
        ['Costi Commerciali', formatCurrency(summary.costsByType.commercial), formatPercent((summary.costsByType.commercial / summary.totalCosts) * 100 || 0)],
        ['Costi Strutturali', formatCurrency(summary.costsByType.structural), formatPercent((summary.costsByType.structural / summary.totalCosts) * 100 || 0)],
        ['Costi Indiretti', formatCurrency(summary.costsByType.indirect), formatPercent((summary.costsByType.indirect / summary.totalCosts) * 100 || 0)],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        halign: 'right',
      },
      columnStyles: {
        0: { halign: 'left' },
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      foot: [['TOTALE', formatCurrency(summary.totalCosts), '100%']],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'right',
      },
    });
    
    // New page for detailed P&L
    doc.addPage();
    yPosition = 20;
    
    // P&L Statement
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Conto Economico (P&L)', pageWidth / 2, 16, { align: 'center' });
    
    yPosition = 35;
    
    // Revenues Section
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.setFont(undefined, 'bold');
    doc.text('RICAVI', 14, yPosition);
    yPosition += 8;
    
    if (revenues.length > 0) {
      const revenueData = revenues.map(r => [
        r.name,
        r.description || '-',
        `${r.quantity} ${r.unit}`,
        formatCurrency(r.amount),
        formatCurrency(r.amount * r.quantity),
        STATUS_LABELS[r.status] || r.status,
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Descrizione', 'Note', 'Quantità', 'Prezzo Unit.', 'Totale', 'Stato']],
        body: revenueData,
        theme: 'striped',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 35 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
          5: { halign: 'center', cellWidth: 22 },
        },
        styles: {
          cellPadding: 3,
        },
        foot: [['', '', '', 'TOTALE RICAVI', formatCurrency(summary.totalRevenue), '']],
        footStyles: {
          fillColor: [220, 252, 231],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      doc.text('Nessun ricavo registrato', 14, yPosition);
      yPosition += 15;
    }
    
    // Check if we need new page
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Costs Section
    doc.setFontSize(14);
    doc.setTextColor(239, 68, 68);
    doc.setFont(undefined, 'bold');
    doc.text('COSTI', 14, yPosition);
    yPosition += 8;
    
    // Group costs by type
    const costTypes: Array<'direct' | 'commercial' | 'structural' | 'indirect'> = ['direct', 'commercial', 'structural', 'indirect'];
    
    costTypes.forEach((costType) => {
      const typeCosts = costs.filter(c => c.cost_type === costType);
      if (typeCosts.length === 0) return;
      
      // Check if we need new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'bold');
      doc.text(`${COST_TYPE_LABELS[costType]}`, 14, yPosition);
      yPosition += 6;
      
      const costData = typeCosts.map(c => [
        c.name,
        c.description || '-',
        `${c.quantity} ${c.unit}`,
        formatCurrency(c.amount),
        formatCurrency(c.amount * c.quantity),
        c.is_recurring ? `Ricorrente (${c.recurrence_period || 'mensile'})` : 'Una tantum',
      ]);
      
      const typeTotal = typeCosts.reduce((sum, c) => sum + (c.amount * c.quantity), 0);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Descrizione', 'Note', 'Quantità', 'Costo Unit.', 'Totale', 'Tipo']],
        body: costData,
        theme: 'striped',
        headStyles: {
          fillColor: [239, 68, 68],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { halign: 'center', cellWidth: 22 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
          5: { cellWidth: 30 },
        },
        styles: {
          cellPadding: 3,
        },
        foot: [['', '', '', `Subtotale ${COST_TYPE_LABELS[costType]}`, formatCurrency(typeTotal), '']],
        footStyles: {
          fillColor: [254, 226, 226],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    });
    
    // Final Summary
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }
    
    yPosition += 5;
    doc.setFillColor(30, 41, 59);
    doc.rect(14, yPosition, pageWidth - 28, 50, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    
    const boxY = yPosition + 12;
    doc.text('RIEPILOGO FINALE', pageWidth / 2, boxY, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const col1X = 24;
    const col2X = pageWidth / 2 + 10;
    
    doc.text(`Ricavi Totali: ${formatCurrency(summary.totalRevenue)}`, col1X, boxY + 12);
    doc.text(`Costi Totali: ${formatCurrency(summary.totalCosts)}`, col2X, boxY + 12);
    
    doc.text(`Margine Lordo: ${formatCurrency(summary.grossMargin)} (${formatPercent(summary.grossMarginPercent)})`, col1X, boxY + 22);
    doc.text(`Margine Contribuzione: ${formatCurrency(summary.contributionMargin)} (${formatPercent(summary.contributionMarginPercent)})`, col2X, boxY + 22);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const marginColor = summary.netMargin >= 0 ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(marginColor[0], marginColor[1], marginColor[2]);
    doc.text(`MARGINE NETTO: ${formatCurrency(summary.netMargin)} (${formatPercent(summary.netMarginPercent)})`, pageWidth / 2, boxY + 35, { align: 'center' });
    
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
    
    // Save the PDF
    const fileName = `report-finanziario-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };
  
  return { exportToPDF };
};
