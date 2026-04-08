import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

interface ExportOptions {
  projectName: string;
  commodityType?: string | null;
  stepProgress: Record<string, StepProgress>;
}

export const useExportDetailedProcessPDF = () => {
  const exportDetailedPDF = ({ projectName, commodityType, stepProgress }: ExportOptions) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const filterStep = (step: typeof processSteps[0]) => {
      if (!step.commodityType || step.commodityType === 'all') return true;
      if (!commodityType) return true;
      if (commodityType === 'solo-luce') return step.commodityType === 'solo-luce';
      return true;
    };

    const visibleSteps = processSteps.filter(filterStep);

    // ─── Cover Page ───
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text('Guida Completa al Processo', pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Reseller Energia Elettrica', pageWidth / 2, 34, { align: 'center' });
    doc.setFontSize(14);
    doc.text(projectName, pageWidth / 2, 44, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 60, { align: 'center' });

    // Summary stats
    const totalSteps = visibleSteps.length;
    const completedSteps = visibleSteps.filter(s => stepProgress[s.id]?.completed).length;
    const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    let y = 75;
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(14, y, pageWidth - 28, 30, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Progresso: ${completedSteps}/${totalSteps} step completati (${completionRate}%)`, 20, y + 12);
    doc.text(`7 Fasi • ${totalSteps} Step Operativi`, 20, y + 22);

    // Phase overview table
    y += 45;
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.setFont(undefined!, 'bold');
    doc.text('Riepilogo Fasi', 14, y);
    y += 8;

    const phaseData = phases.map(phase => {
      const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
      const completed = phaseSteps.filter(s => stepProgress[s.id]?.completed).length;
      const totalDays = phaseSteps.reduce((sum, s) => sum + s.estimatedDays, 0);
      return [
        `Fase ${phase.id}`,
        phase.name,
        `${phaseSteps.length} step`,
        `${totalDays} gg`,
        `${completed}/${phaseSteps.length}`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Fase', 'Nome', 'Step', 'Durata', 'Completati']],
      body: phaseData,
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 55 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    });

    // ─── Detailed Steps ───
    phases.forEach(phase => {
      const phaseSteps = visibleSteps.filter(s => s.phase === phase.id);
      if (phaseSteps.length === 0) return;

      doc.addPage();
      y = 0;

      // Phase header banner
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(`Fase ${phase.id}: ${phase.name}`, pageWidth / 2, 18, { align: 'center' });
      y = 38;

      phaseSteps.forEach((step, stepIdx) => {
        const progress = stepProgress[step.id];
        const isCompleted = progress?.completed || false;

        // Check space - need at least 100px for a step header
        if (y > pageHeight - 80) {
          doc.addPage();
          y = 20;
        }

        // Step title bar
        doc.setFillColor(isCompleted ? 220, 252, 231 : 241, 245, 249);
        doc.roundedRect(14, y, pageWidth - 28, 12, 2, 2, 'F');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined!, 'bold');
        const statusIcon = isCompleted ? '✓' : '○';
        doc.text(`${statusIcon} ${step.title}`, 18, y + 8);

        // Badges on right
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined!, 'normal');
        doc.text(`${categoryLabels[step.category]} | Priorità ${priorityLabels[step.priority]} | ${step.estimatedDays} gg`, pageWidth - 16, y + 8, { align: 'right' });
        y += 17;

        // Description
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const descLines = doc.splitTextToSize(step.description, pageWidth - 36);
        doc.text(descLines, 18, y);
        y += descLines.length * 4 + 3;

        // Costs
        if (step.costs) {
          doc.setFont(undefined!, 'bold');
          doc.setTextColor(124, 58, 237);
          doc.text(`Costi stimati: ${formatCosts(step.costs)}`, 18, y);
          y += 4;
          doc.setFont(undefined!, 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(step.costs.description, 18, y);
          y += 5;
        }

        // Notes (from processSteps data - explanatory notes)
        if (step.notes && step.notes.length > 0) {
          if (y > pageHeight - 40) { doc.addPage(); y = 20; }
          doc.setFont(undefined!, 'bold');
          doc.setFontSize(9);
          doc.setTextColor(113, 63, 18);
          doc.text('Note Esplicative:', 18, y);
          y += 5;
          doc.setFont(undefined!, 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80, 70, 40);

          step.notes.forEach(note => {
            if (y > pageHeight - 15) { doc.addPage(); y = 20; }
            const noteLines = doc.splitTextToSize(`• ${note}`, pageWidth - 40);
            doc.text(noteLines, 20, y);
            y += noteLines.length * 3.5 + 1;
          });
          y += 2;
        }

        // Documents required
        if (step.documents && step.documents.length > 0) {
          if (y > pageHeight - 40) { doc.addPage(); y = 20; }
          doc.setFont(undefined!, 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 64, 175);
          doc.text('Documenti Richiesti:', 18, y);
          y += 5;
          doc.setFont(undefined!, 'normal');
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);

          step.documents.forEach(docName => {
            if (y > pageHeight - 15) { doc.addPage(); y = 20; }
            doc.text(`📄 ${docName}`, 20, y);
            y += 4;
          });
          y += 2;
        }

        // Checklist
        if (step.checklist && step.checklist.length > 0) {
          if (y > pageHeight - 40) { doc.addPage(); y = 20; }
          doc.setFont(undefined!, 'bold');
          doc.setFontSize(9);
          doc.setTextColor(22, 101, 52);
          doc.text('Checklist Operativa:', 18, y);
          y += 5;
          doc.setFont(undefined!, 'normal');
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60);

          step.checklist.forEach((item, idx) => {
            if (y > pageHeight - 15) { doc.addPage(); y = 20; }
            const checkState = progress?.checklistProgress?.[idx] ? '☑' : '☐';
            const itemLines = doc.splitTextToSize(`${checkState} ${item}`, pageWidth - 40);
            doc.text(itemLines, 20, y);
            y += itemLines.length * 3.5 + 1;
          });
          y += 2;
        }

        // Official Links
        if (step.officialLinks && step.officialLinks.length > 0) {
          if (y > pageHeight - 40) { doc.addPage(); y = 20; }
          doc.setFont(undefined!, 'bold');
          doc.setFontSize(9);
          doc.setTextColor(124, 58, 237);
          doc.text('Link Ufficiali:', 18, y);
          y += 5;
          doc.setFont(undefined!, 'normal');
          doc.setFontSize(8);

          step.officialLinks.forEach(link => {
            if (y > pageHeight - 15) { doc.addPage(); y = 20; }
            doc.setTextColor(30, 64, 175);
            doc.textWithLink(`🔗 ${link.name}`, 20, y, { url: link.url });
            if (link.description) {
              doc.setTextColor(120, 120, 120);
              doc.text(` - ${link.description}`, 20 + doc.getTextWidth(`🔗 ${link.name} `), y);
            }
            y += 4;
          });
          y += 2;
        }

        // User personal notes
        if (progress?.notes) {
          if (y > pageHeight - 30) { doc.addPage(); y = 20; }
          doc.setFillColor(254, 249, 195);
          const noteLines = doc.splitTextToSize(progress.notes, pageWidth - 44);
          const boxH = noteLines.length * 3.5 + 10;
          doc.roundedRect(18, y, pageWidth - 36, boxH, 2, 2, 'F');
          doc.setFont(undefined!, 'bold');
          doc.setFontSize(8);
          doc.setTextColor(113, 63, 18);
          doc.text('Note Personali:', 22, y + 5);
          doc.setFont(undefined!, 'normal');
          doc.text(noteLines, 22, y + 10);
          y += boxH + 4;
        }

        // Separator between steps
        if (stepIdx < phaseSteps.length - 1) {
          if (y > pageHeight - 20) { doc.addPage(); y = 20; }
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
          doc.line(20, y, pageWidth - 20, y);
          y += 8;
        }
      });
    });

    // Footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Pagina ${i} di ${pageCount} - ${projectName} - Processo Dettagliato`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    const fileName = `processo-dettagliato-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return { exportDetailedPDF };
};
