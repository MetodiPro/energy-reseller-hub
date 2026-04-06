import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProjectCost } from './useProjectFinancials';
import { processSteps } from '@/data/processSteps';
import { stepCostsData, costCategoryLabels, StepCostCategory } from '@/types/stepCosts';
import { stepTimingConfig, phaseDescriptions } from '@/lib/costTimingConfig';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

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

const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

type CostCategoryKey = 'operational' | 'commercial' | 'infrastructure';

const categorizeCost = (cost: ProjectCost): CostCategoryKey | null => {
  if ((cost as any).is_passthrough === true) return null;

  const name = cost.name.toLowerCase();
  const energyPatterns = ['energia acquistata', 'trasporto e distribuzione', 'corrispettivi trasporto', 'oneri di sistema'];
  if (energyPatterns.some(p => name.includes(p))) return null;

  // Use cost_type directly — aligned with CostTabsView
  if (cost.cost_type === 'commercial') return 'commercial';
  if (cost.cost_type === 'structural') return 'infrastructure';
  return 'operational';
};

const formatDateLabel = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Non impostata';
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: it });
  } catch {
    return dateStr;
  }
};

interface StartupCostEntry {
  name: string;
  category: string;
  stepName: string;
  amount: number;
}

interface ExportOptions {
  getCostAmount: (stepId: string, itemId: string) => number;
  commodityType?: string | null;
  plannedStartDate?: string | null;
  stepDates?: Record<string, string | null>;
}

export const useExportFinancialPDF = () => {
  const exportToPDF = (
    projectName: string,
    costs: ProjectCost[],
    startupCosts?: ExportOptions,
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Report Costi Generali', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.text(projectName, pageWidth / 2, 28, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 45, { align: 'center' });

    let yPosition = 55;

    // ===== SECTION 1: STARTUP COSTS =====
    if (startupCosts) {
      const { getCostAmount, commodityType } = startupCosts;

      const visibleSteps = processSteps.filter(step => {
        if (!step.commodityType || step.commodityType === 'all') return true;
        if (!commodityType) return true;
        if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
        return true;
      });

      const startupEntries: StartupCostEntry[] = [];
      let startupTotal = 0;

      visibleSteps.forEach(step => {
        const stepData = stepCostsData[step.id];
        if (stepData) {
          stepData.items.forEach(item => {
            const amount = getCostAmount(step.id, item.id);
            if (amount > 0) {
              startupEntries.push({
                name: item.name,
                category: costCategoryLabels[item.category].label,
                stepName: step.title,
                amount,
              });
              startupTotal += amount;
            }
          });
        }
      });

      if (startupEntries.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined!, 'bold');
        doc.text('Riepilogo Costi di Avvio', 14, yPosition);
        yPosition += 4;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined!, 'normal');
        doc.text(`Investimento Totale Stimato: ${formatCurrency(startupTotal)}`, 14, yPosition + 5);
        yPosition += 12;

        const startupData = startupEntries.map(e => [
          e.name,
          e.category,
          e.stepName,
          formatCurrency(e.amount),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Voce', 'Categoria', 'Step di Riferimento', 'Importo']],
          body: startupData,
          theme: 'striped',
          headStyles: {
            fillColor: [34, 197, 94],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 35 },
            2: { cellWidth: 50 },
            3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
          },
          styles: { cellPadding: 3 },
          foot: [['', '', 'TOTALE', formatCurrency(startupTotal)]],
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'right',
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
    }

    // ===== SECTION 2: OPERATIONAL COSTS =====
    if (yPosition > 230) {
      doc.addPage();
      yPosition = 20;
    }

    // Categorize costs using cost_type (aligned with UI)
    const categorized: Record<CostCategoryKey, ProjectCost[]> = {
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
    doc.setFont(undefined!, 'bold');
    doc.text('Costi Operativi', 14, yPosition);
    yPosition += 4;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined!, 'normal');
    doc.text(`Totale costi gestionali, commerciali e di infrastruttura: ${formatCurrency(totalCosts)}`, 14, yPosition + 5);
    yPosition += 14;

    const summaryData = (['operational', 'commercial', 'infrastructure'] as CostCategoryKey[]).map(cat => {
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

    // Detail per category — with date column
    (['operational', 'commercial', 'infrastructure'] as CostCategoryKey[]).forEach((cat) => {
      const catCosts = categorized[cat];
      if (catCosts.length === 0) return;

      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      const color = COST_CATEGORY_COLORS[cat];

      doc.setFontSize(13);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont(undefined!, 'bold');
      doc.text(`Costi ${COST_CATEGORY_LABELS[cat]}`, 14, yPosition);
      yPosition += 8;

      const costData = catCosts.map(c => [
        c.name,
        formatDateLabel(c.date),
        `${c.quantity} ${c.unit}`,
        formatCurrency(c.amount),
        formatCurrency(c.amount * c.quantity),
        c.is_recurring ? `Ricorrente (${c.recurrence_period === 'monthly' ? 'mensile' : c.recurrence_period === 'yearly' ? 'annuale' : c.recurrence_period === 'quarterly' ? 'trimestrale' : c.recurrence_period || 'mensile'})` : 'Una tantum',
      ]);

      const catTotal = catCosts.reduce((sum, c) => sum + (c.amount * c.quantity), 0);

      autoTable(doc, {
        startY: yPosition,
        head: [['Descrizione', 'Data Inizio', 'Quantità', 'Costo Unit.', 'Totale', 'Tipo']],
        body: costData,
        theme: 'striped',
        headStyles: {
          fillColor: [color[0], color[1], color[2]] as [number, number, number],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'right', cellWidth: 25 },
          4: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
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

    // ===== SECTION 3: DINAMICA FINANZIARIA DEI COSTI =====
    if (startupCosts) {
      const { getCostAmount, commodityType, plannedStartDate, stepDates } = startupCosts;

      doc.addPage();
      yPosition = 20;

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Dinamica Finanziaria dei Costi', pageWidth / 2, 16, { align: 'center' });
      yPosition = 35;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined!, 'normal');
      doc.text('Distribuzione temporale mese per mese di tutti i costi di avvio e operativi', 14, yPosition);
      yPosition += 10;

      // Recompute the dynamics timeline (same logic as CostDynamicsTimeline)
      const MONTHS = 14;
      let baseMonth = new Date().getMonth();
      let baseYear = new Date().getFullYear();
      if (plannedStartDate) {
        const parts = plannedStartDate.split('-');
        baseYear = parseInt(parts[0], 10);
        baseMonth = parseInt(parts[1], 10) - 1;
      }

      const getMonthLabel = (offset: number) => {
        const totalMonth = baseMonth + offset;
        const m = ((totalMonth % 12) + 12) % 12;
        const y = baseYear + Math.floor(totalMonth / 12);
        return `${MONTHS_IT[m]} ${y}`;
      };

      const getMonthOffset = (dateStr: string | null | undefined): number => {
        if (!dateStr) return 0;
        const parts = dateStr.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return (y - baseYear) * 12 + (m - baseMonth);
      };

      // Build startup costs per month
      const startupByMonth: Record<number, Array<{ name: string; amount: number }>> = {};
      const visibleStepIds = processSteps
        .filter(step => {
          if (!step.commodityType || step.commodityType === 'all') return true;
          if (!commodityType) return true;
          if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
          return true;
        })
        .map(s => s.id);

      visibleStepIds.forEach(stepId => {
        const stepData = stepCostsData[stepId];
        if (!stepData) return;
        let month = stepTimingConfig[stepId] ?? 0;
        const stepPlannedEnd = stepDates?.[stepId];
        if (stepPlannedEnd) {
          const parts = stepPlannedEnd.split('-');
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const computedMonth = (y - baseYear) * 12 + (m - baseMonth);
          month = Math.max(0, Math.min(13, computedMonth));
        }
        stepData.items.forEach(item => {
          const amount = getCostAmount(stepId, item.id);
          if (amount > 0) {
            if (!startupByMonth[month]) startupByMonth[month] = [];
            startupByMonth[month].push({ name: item.name, amount });
          }
        });
      });

      // Operational costs filtered
      const operationalCosts = costs.filter(c => {
        if ((c as any).is_passthrough === true) return false;
        const name = c.name.toLowerCase();
        const energyPatterns = ['energia acquistata', 'trasporto e distribuzione', 'corrispettivi trasporto', 'oneri di sistema'];
        return !energyPatterns.some(p => name.includes(p));
      });
      const recurringCosts = operationalCosts.filter(c => c.is_recurring);
      const oneTimeCosts = operationalCosts.filter(c => !c.is_recurring);

      const monthlyRows: Array<{
        label: string;
        startup: number;
        operational: number;
        total: number;
        cumulative: number;
        details: Array<{ name: string; amount: number; type: string }>;
      }> = [];

      let cumulative = 0;
      for (let m = 0; m < MONTHS; m++) {
        const details: Array<{ name: string; amount: number; type: string }> = [];
        let startupTotal = 0;
        let opTotal = 0;

        (startupByMonth[m] || []).forEach(item => {
          details.push({ name: item.name, amount: item.amount, type: 'avvio' });
          startupTotal += item.amount;
        });

        recurringCosts.forEach(c => {
          const startMonth = Math.max(0, getMonthOffset(c.date));
          if (m >= startMonth) {
            const monthlyPortion = (c.amount * (c.quantity || 1)) / 12;
            if (monthlyPortion > 0) {
              details.push({ name: c.name, amount: monthlyPortion, type: 'operativo' });
              opTotal += monthlyPortion;
            }
          }
        });

        oneTimeCosts.forEach(c => {
          const costMonth = Math.max(0, Math.min(13, getMonthOffset(c.date)));
          if (costMonth === m) {
            const amount = c.amount * (c.quantity || 1);
            details.push({ name: c.name, amount, type: 'operativo' });
            opTotal += amount;
          }
        });

        const total = startupTotal + opTotal;
        cumulative += total;

        monthlyRows.push({
          label: getMonthLabel(m),
          startup: startupTotal,
          operational: opTotal,
          total,
          cumulative,
          details,
        });
      }

      // Render main timeline table
      const timelineBody = monthlyRows
        .filter(row => row.total > 0 || row.cumulative > 0)
        .map(row => [
          row.label,
          row.startup > 0 ? formatCurrencyShort(row.startup) : '-',
          row.operational > 0 ? formatCurrencyShort(row.operational) : '-',
          row.total > 0 ? formatCurrencyShort(row.total) : '-',
          formatCurrencyShort(row.cumulative),
        ]);

      const totalStartup = monthlyRows.reduce((s, r) => s + r.startup, 0);
      const totalOp = monthlyRows.reduce((s, r) => s + r.operational, 0);

      autoTable(doc, {
        startY: yPosition,
        head: [['Mese', 'Costi Avvio', 'Costi Operativi', 'Totale Mese', 'Cumulativo']],
        body: timelineBody,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: { fontSize: 8, halign: 'right' },
        columnStyles: {
          0: { halign: 'left', cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30, fontStyle: 'bold' },
          4: { cellWidth: 30 },
        },
        styles: { cellPadding: 3 },
        foot: [['TOTALE', formatCurrencyShort(totalStartup), formatCurrencyShort(totalOp), formatCurrencyShort(totalStartup + totalOp), '']],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'right',
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;

      // Detail breakdown per month (only months with costs)
      const monthsWithDetails = monthlyRows.filter(r => r.details.length > 0);
      if (monthsWithDetails.length > 0) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined!, 'bold');
        doc.text('Dettaglio Voci per Mese', 14, yPosition);
        yPosition += 8;

        monthsWithDetails.forEach(row => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.setFont(undefined!, 'bold');
          doc.text(`${row.label} — ${formatCurrencyShort(row.total)}`, 14, yPosition);
          yPosition += 5;

          const detailData = row.details.map(d => [
            d.name,
            d.type === 'avvio' ? 'Avvio' : 'Operativo',
            formatCurrencyShort(d.amount),
          ]);

          autoTable(doc, {
            startY: yPosition,
            body: detailData,
            theme: 'plain',
            bodyStyles: { fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
            },
            styles: { cellPadding: 2 },
            margin: { left: 18, right: 14 },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 6;
        });
      }
    }

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

    const fileName = `report-costi-generali-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return { exportToPDF };
};
