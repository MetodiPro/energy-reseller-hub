import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { processSteps, phases } from '@/data/processSteps';
import type { StepProgress } from './useStepProgress';

export const useExportPDF = () => {
  const exportToPDF = (stepProgress: Record<string, StepProgress>) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // primary color
    doc.text('Piano Operativo Completo', pageWidth / 2, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 28, { align: 'center' });
    
    let yPosition = 40;
    
    // Summary statistics
    const totalSteps = processSteps.length;
    const completedSteps = Object.values(stepProgress).filter(p => p.completed).length;
    const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Progresso Totale: ${completedSteps}/${totalSteps} step completati (${completionRate}%)`, 14, yPosition);
    yPosition += 15;
    
    // Iterate through each phase
    phases.forEach((phase, phaseIndex) => {
      const phaseSteps = processSteps.filter(step => step.phase === phase.id);
      
      if (phaseIndex > 0) {
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
        
        // Step title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        const statusIcon = isCompleted ? '✓' : '○';
        doc.text(`${statusIcon} ${step.title}`, 14, yPosition);
        yPosition += 7;
        
        // Step details
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        
        const details = [
          `Categoria: ${step.category}`,
          `Priorità: ${step.priority}`,
          `Durata stimata: ${step.estimatedDays} giorni`,
          step.costs ? `Costi: ${step.costs}` : null,
        ].filter(Boolean);
        
        details.forEach(detail => {
          doc.text(detail!, 16, yPosition);
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
          doc.setFont(undefined, 'bold');
          doc.text('Documenti richiesti:', 16, yPosition);
          yPosition += 5;
          doc.setFont(undefined, 'normal');
          
          step.documents.forEach(doc_name => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(`• ${doc_name}`, 18, yPosition);
            yPosition += 5;
          });
        }
        
        // Checklist
        if (step.checklist && step.checklist.length > 0) {
          yPosition += 3;
          doc.setFont(undefined, 'bold');
          doc.text('Checklist operativa:', 16, yPosition);
          yPosition += 5;
          doc.setFont(undefined, 'normal');
          
          step.checklist.forEach((item, idx) => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            const checkProgress = progress?.checklistProgress?.[idx] || false;
            const checkIcon = checkProgress ? '☑' : '☐';
            const itemText = doc.splitTextToSize(`${checkIcon} ${item}`, pageWidth - 36);
            doc.text(itemText, 18, yPosition);
            yPosition += itemText.length * 4 + 1;
          });
        }
        
        // Notes
        if (progress?.notes) {
          yPosition += 3;
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }
          doc.setFont(undefined, 'bold');
          doc.text('Note:', 16, yPosition);
          yPosition += 5;
          doc.setFont(undefined, 'normal');
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
    
    const timelineData = phases.map(phase => {
      const phaseSteps = processSteps.filter(s => s.phase === phase.id);
      const totalDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
      const completed = phaseSteps.filter(s => stepProgress[s.id]?.completed).length;
      const total = phaseSteps.length;
      
      return [
        `Fase ${phase.id}`,
        phase.name,
        `${totalDays} giorni`,
        `${completed}/${total}`,
        `${Math.round((completed / total) * 100)}%`
      ];
    });
    
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
        cellPadding: 5
      }
    });
    
    // Save the PDF
    const fileName = `piano-operativo-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };
  
  return { exportToPDF };
};
