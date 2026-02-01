import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { processSteps, phases } from '@/data/processSteps';
import type { StepProgress } from './useStepProgress';
import type { CommodityType } from '@/data/processSteps';

interface ExportOptions {
  projectName?: string;
  commodityType?: CommodityType | string;
}

// Filter steps by commodity type (same logic as ProcessTracker)
const filterStepsByCommodity = (steps: typeof processSteps, commodityType?: string) => {
  if (!commodityType || commodityType === 'dual-fuel') {
    return steps;
  }
  
  return steps.filter(step => {
    if (!step.commodityType || step.commodityType === 'all') {
      return true;
    }
    if (commodityType === 'solo-luce') {
      return step.commodityType === 'solo-luce';
    }
    if (commodityType === 'solo-gas') {
      return step.commodityType === 'solo-gas';
    }
    return true;
  });
};

// Format costs safely
const formatCosts = (costs?: { min: number; max: number; description: string }): string => {
  if (!costs) return 'N/D';
  
  const formatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  if (costs.min === 0 && costs.max === 0) {
    return 'Gratuito';
  }
  
  if (costs.min === costs.max) {
    return formatter.format(costs.min);
  }
  
  return `${formatter.format(costs.min)} - ${formatter.format(costs.max)}`;
};

// Priority labels
const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
};

// Category labels
const categoryLabels: Record<string, string> = {
  legal: 'Legale',
  administrative: 'Amministrativo',
  technical: 'Tecnico',
  operational: 'Operativo',
  commercial: 'Commerciale',
};

export const useExportPDF = () => {
  const exportToPDF = (stepProgress: Record<string, StepProgress>, options?: ExportOptions) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Filter steps based on commodity type
    const filteredSteps = filterStepsByCommodity(processSteps, options?.commodityType);
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('Piano Operativo Completo', pageWidth / 2, 20, { align: 'center' });
    
    // Project name if provided
    if (options?.projectName) {
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(`Progetto: ${options.projectName}`, pageWidth / 2, 28, { align: 'center' });
    }
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateY = options?.projectName ? 36 : 28;
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, dateY, { align: 'center' });
    
    let yPosition = dateY + 12;
    
    // Summary statistics
    const totalSteps = filteredSteps.length;
    const completedSteps = filteredSteps.filter(s => stepProgress[s.id]?.completed).length;
    const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Progresso Totale: ${completedSteps}/${totalSteps} step completati (${completionRate}%)`, 14, yPosition);
    yPosition += 15;
    
    // Iterate through each phase
    phases.forEach((phase, phaseIndex) => {
      const phaseSteps = filteredSteps.filter(step => step.phase === phase.id);
      
      // Skip phases with no steps after filtering
      if (phaseSteps.length === 0) {
        return;
      }
      
      if (phaseIndex > 0 && yPosition > 40) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Phase header
      doc.setFillColor(59, 130, 246);
      doc.rect(14, yPosition - 5, pageWidth - 28, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(`Fase ${phase.id}: ${phase.name}`, 16, yPosition + 2);
      yPosition += 15;
      
      // Phase steps
      phaseSteps.forEach((step) => {
        const progress = stepProgress[step.id];
        const isCompleted = progress?.completed || false;
        
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Step title with status
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const statusIcon = isCompleted ? '[OK]' : '[ ]';
        doc.text(`${statusIcon} ${step.title}`, 14, yPosition);
        yPosition += 7;
        
        // Step details
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        
        const details = [
          `Categoria: ${categoryLabels[step.category] || step.category}`,
          `Priorita: ${priorityLabels[step.priority] || step.priority}`,
          `Durata stimata: ${step.estimatedDays} giorni`,
          `Costi: ${formatCosts(step.costs)}`,
        ];
        
        details.forEach(detail => {
          doc.text(detail, 16, yPosition);
          yPosition += 5;
        });
        
        // Description
        if (step.description) {
          yPosition += 2;
          const splitDescription = doc.splitTextToSize(step.description, pageWidth - 32);
          doc.text(splitDescription, 16, yPosition);
          yPosition += splitDescription.length * 4;
        }
        
        // Documents required
        if (step.documents && step.documents.length > 0) {
          yPosition += 3;
          if (yPosition > 265) {
            doc.addPage();
            yPosition = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text('Documenti richiesti:', 16, yPosition);
          yPosition += 5;
          doc.setFont('helvetica', 'normal');
          
          step.documents.forEach(docName => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(`- ${docName}`, 18, yPosition);
            yPosition += 5;
          });
        }
        
        // Checklist
        if (step.checklist && step.checklist.length > 0) {
          yPosition += 3;
          if (yPosition > 265) {
            doc.addPage();
            yPosition = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text('Checklist operativa:', 16, yPosition);
          yPosition += 5;
          doc.setFont('helvetica', 'normal');
          
          step.checklist.forEach((item, idx) => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            const checkProgress = progress?.checklistProgress?.[idx] || false;
            const checkIcon = checkProgress ? '[X]' : '[ ]';
            const itemText = doc.splitTextToSize(`${checkIcon} ${item}`, pageWidth - 36);
            doc.text(itemText, 18, yPosition);
            yPosition += itemText.length * 4 + 1;
          });
        }
        
        // Notes from progress
        if (progress?.notes) {
          yPosition += 3;
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text('Note:', 16, yPosition);
          yPosition += 5;
          doc.setFont('helvetica', 'normal');
          const splitNotes = doc.splitTextToSize(progress.notes, pageWidth - 32);
          doc.text(splitNotes, 18, yPosition);
          yPosition += splitNotes.length * 4;
        }
        
        yPosition += 8;
      });
    });
    
    // Timeline summary page
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Timeline Riepilogativa', pageWidth / 2, 20, { align: 'center' });
    
    const timelineData = phases
      .map(phase => {
        const phaseSteps = filteredSteps.filter(s => s.phase === phase.id);
        if (phaseSteps.length === 0) return null;
        
        const totalDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
        const completed = phaseSteps.filter(s => stepProgress[s.id]?.completed).length;
        const total = phaseSteps.length;
        
        return [
          `Fase ${phase.id}`,
          phase.name,
          `${totalDays} giorni`,
          `${completed}/${total}`,
          `${total > 0 ? Math.round((completed / total) * 100) : 0}%`
        ];
      })
      .filter(Boolean) as string[][];
    
    autoTable(doc, {
      startY: 30,
      head: [['Fase', 'Nome', 'Durata', 'Step', 'Completamento']],
      body: timelineData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
        font: 'helvetica'
      }
    });
    
    // Save the PDF
    const fileName = `piano-operativo-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };
  
  return { exportToPDF };
};
