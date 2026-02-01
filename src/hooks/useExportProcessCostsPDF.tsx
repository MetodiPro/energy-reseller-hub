import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { processSteps, phases } from '@/data/processSteps';
import { stepCostsData, costCategoryLabels, StepCostCategory } from '@/types/stepCosts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

interface CostGetter {
  (stepId: string, costItemId: string): number;
}

export const useExportProcessCostsPDF = () => {
  const exportToPDF = (
    projectName: string,
    commodityType: string | null,
    getCostAmount: CostGetter
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Filter steps by commodity type
    const filterStep = (step: typeof processSteps[0]) => {
      if (!step.commodityType || step.commodityType === 'all') return true;
      if (!commodityType) return true;
      if (commodityType === 'dual-fuel') return true;
      if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
      if (commodityType === 'solo-gas') return step.commodityType === 'solo-gas';
      return true;
    };

    const visibleSteps = processSteps.filter(filterStep);
    
    // Calculate totals
    let grandTotal = 0;
    const byCategory: Record<StepCostCategory, number> = {
      licenze: 0,
      consulenza: 0,
      burocrazia: 0,
      software: 0,
      garanzie: 0,
      formazione: 0,
      personale: 0,
      infrastruttura: 0,
      altro: 0,
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

    // Header
    doc.setFillColor(124, 58, 237); // Primary violet
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Costi di Avvio Reseller', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(projectName, pageWidth / 2, 30, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 50, { align: 'center' });
    
    let yPosition = 60;
    
    // Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(124, 58, 237);
    doc.setFont(undefined, 'bold');
    doc.text('Riepilogo Investimento', 14, yPosition);
    yPosition += 12;
    
    // Total box
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(14, yPosition, pageWidth - 28, 25, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text('Investimento Totale Stimato:', 20, yPosition + 10);
    doc.setFontSize(18);
    doc.setTextColor(124, 58, 237);
    doc.setFont(undefined, 'bold');
    doc.text(formatCurrency(grandTotal), 20, yPosition + 20);
    
    // Steps count
    const stepsWithCosts = visibleSteps.filter(s => stepCostsData[s.id]).length;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'normal');
    doc.text(`${stepsWithCosts} step con costi dettagliati`, pageWidth - 20, yPosition + 15, { align: 'right' });
    
    yPosition += 35;
    
    // Category breakdown
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.setFont(undefined, 'bold');
    doc.text('Ripartizione per Categoria', 14, yPosition);
    yPosition += 8;
    
    const categoryData = Object.entries(byCategory)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => {
        const config = costCategoryLabels[category as StepCostCategory];
        const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
        return [config.label, formatCurrency(amount), formatPercent(percentage)];
      });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Categoria', 'Importo', '% su Totale']],
      body: categoryData,
      theme: 'grid',
      headStyles: {
        fillColor: [124, 58, 237],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        halign: 'right',
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 80 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      foot: [['TOTALE', formatCurrency(grandTotal), '100%']],
      footStyles: {
        fillColor: [245, 243, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'right',
      },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Phase breakdown
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.setFont(undefined, 'bold');
    doc.text('Ripartizione per Fase', 14, yPosition);
    yPosition += 8;
    
    const phaseData = phases.map(phase => {
      const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
      const phaseTotal = phaseSteps.reduce((sum, s) => sum + (stepTotals[s.id] || 0), 0);
      const percentage = grandTotal > 0 ? (phaseTotal / grandTotal) * 100 : 0;
      return [`Fase ${phase.id}: ${phase.name}`, formatCurrency(phaseTotal), formatPercent(percentage)];
    }).filter(row => row[1] !== '€0');
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Fase', 'Importo', '% su Totale']],
      body: phaseData,
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
        0: { halign: 'left', cellWidth: 80 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
    });
    
    // Detailed steps - new page
    doc.addPage();
    yPosition = 20;
    
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('Dettaglio Costi per Step', pageWidth / 2, 16, { align: 'center' });
    
    yPosition = 35;
    
    // Group steps by phase
    phases.forEach(phase => {
      const phaseSteps = visibleSteps.filter(s => s.phase === phase.id && stepCostsData[s.id]);
      if (phaseSteps.length === 0) return;
      
      // Check if we need new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(124, 58, 237);
      doc.setFont(undefined, 'bold');
      doc.text(`Fase ${phase.id}: ${phase.name}`, 14, yPosition);
      yPosition += 10;
      
      phaseSteps.forEach(step => {
        const stepData = stepCostsData[step.id];
        if (!stepData) return;
        
        // Check if we need new page
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Step title
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        doc.setFont(undefined, 'bold');
        doc.text(step.title, 14, yPosition);
        
        // Step total
        doc.setFont(undefined, 'normal');
        doc.setTextColor(124, 58, 237);
        doc.text(formatCurrency(stepTotals[step.id] || 0), pageWidth - 14, yPosition, { align: 'right' });
        yPosition += 5;
        
        // Step items table
        const itemData = stepData.items.map(item => {
          const config = costCategoryLabels[item.category];
          const amount = getCostAmount(step.id, item.id);
          return [
            item.name,
            config.label,
            item.isOptional ? 'Opzionale' : 'Necessario',
            formatCurrency(amount),
          ];
        });
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Voce', 'Categoria', 'Tipo', 'Importo']],
          body: itemData,
          theme: 'striped',
          headStyles: {
            fillColor: [226, 232, 240],
            textColor: [60, 60, 60],
            fontStyle: 'bold',
            fontSize: 8,
          },
          bodyStyles: {
            fontSize: 8,
          },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 45 },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
          },
          styles: {
            cellPadding: 3,
          },
          margin: { left: 14, right: 14 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      });
      
      yPosition += 5;
    });
    
    // Notes page
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    yPosition += 10;
    doc.setFillColor(254, 249, 195); // Yellow background
    doc.roundedRect(14, yPosition, pageWidth - 28, 40, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(113, 63, 18);
    doc.setFont(undefined, 'bold');
    doc.text('Note Importanti', 20, yPosition + 10);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const notes = [
      '• I costi indicati sono stime indicative e possono variare in base alle specifiche esigenze.',
      '• Le garanzie finanziarie (fideiussioni) dipendono dai volumi previsti e dalle condizioni del grossista.',
      '• Il reseller non versa contributi diretti a CSEA: gli oneri sono gestiti in transito verso il distributore.',
      '• Si consiglia di consultare professionisti del settore per una valutazione personalizzata.',
    ];
    
    notes.forEach((note, idx) => {
      doc.text(note, 20, yPosition + 18 + (idx * 5));
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
    
    // Save the PDF
    const fileName = `costi-avvio-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };
  
  return { exportToPDF };
};
