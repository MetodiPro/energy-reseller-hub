 import { jsPDF } from 'jspdf';
 import autoTable from 'jspdf-autotable';
 import type { ConsultantTask } from '@/hooks/useConsultantTasks';
 
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
 
 const consultantTypeLabels: Record<string, { label: string; color: [number, number, number] }> = {
   commercialista: { label: 'Commercialista', color: [34, 197, 94] },
   legale: { label: 'Legale', color: [59, 130, 246] },
   formazione: { label: 'Formazione', color: [168, 85, 247] },
   it_software: { label: 'IT / Software', color: [236, 72, 153] },
   operativo: { label: 'Operativo / On-Site', color: [249, 115, 22] },
 };
 
 const phaseLabels: Record<string, string> = {
   startup: 'Avvio',
   operational: 'Operatività',
   recurring: 'Ricorrenti',
 };
 
 export const useExportConsultantsPDF = () => {
   const exportToPDF = (tasks: ConsultantTask[], projectName: string) => {
     const doc = new jsPDF();
     const pageWidth = doc.internal.pageSize.getWidth();
     
     // Calculate statistics
     const totalTasks = tasks.length;
     const completedTasks = tasks.filter(t => t.isCompleted).length;
     const estimatedTotal = tasks.reduce((sum, t) => sum + t.estimatedCost, 0);
     const actualTotal = tasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
     const completedWithActual = tasks.filter(t => t.isCompleted && t.actualCost !== null);
     const variance = completedWithActual.length > 0 
       ? completedWithActual.reduce((sum, t) => sum + ((t.actualCost || 0) - t.estimatedCost), 0)
       : 0;
     
     // Group by consultant type
     const byType: Record<string, ConsultantTask[]> = {};
     tasks.forEach(task => {
       if (!byType[task.consultantType]) byType[task.consultantType] = [];
       byType[task.consultantType].push(task);
     });
     
     // Header
     doc.setFillColor(124, 58, 237);
     doc.rect(0, 0, pageWidth, 40, 'F');
     
     doc.setFontSize(22);
     doc.setTextColor(255, 255, 255);
     doc.text('Attività Consulenti', pageWidth / 2, 18, { align: 'center' });
     
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
     doc.text('Riepilogo', 14, yPosition);
     yPosition += 10;
     
     // Summary cards
     const cardWidth = (pageWidth - 42) / 3;
     
     // Card 1 - Progress
     doc.setFillColor(240, 253, 244);
     doc.roundedRect(14, yPosition, cardWidth, 30, 2, 2, 'F');
     doc.setFontSize(10);
     doc.setTextColor(100, 100, 100);
     doc.setFont(undefined, 'normal');
     doc.text('Completate', 14 + cardWidth / 2, yPosition + 10, { align: 'center' });
     doc.setFontSize(16);
     doc.setTextColor(34, 197, 94);
     doc.setFont(undefined, 'bold');
     doc.text(`${completedTasks}/${totalTasks}`, 14 + cardWidth / 2, yPosition + 22, { align: 'center' });
     
     // Card 2 - Estimated
     doc.setFillColor(245, 243, 255);
     doc.roundedRect(21 + cardWidth, yPosition, cardWidth, 30, 2, 2, 'F');
     doc.setFontSize(10);
     doc.setTextColor(100, 100, 100);
     doc.setFont(undefined, 'normal');
     doc.text('Costo Stimato', 21 + cardWidth + cardWidth / 2, yPosition + 10, { align: 'center' });
     doc.setFontSize(16);
     doc.setTextColor(124, 58, 237);
     doc.setFont(undefined, 'bold');
     doc.text(formatCurrency(estimatedTotal), 21 + cardWidth + cardWidth / 2, yPosition + 22, { align: 'center' });
     
     // Card 3 - Actual
     doc.setFillColor(254, 249, 195);
     doc.roundedRect(28 + cardWidth * 2, yPosition, cardWidth, 30, 2, 2, 'F');
     doc.setFontSize(10);
     doc.setTextColor(100, 100, 100);
     doc.setFont(undefined, 'normal');
     doc.text('Costo Effettivo', 28 + cardWidth * 2 + cardWidth / 2, yPosition + 10, { align: 'center' });
     doc.setFontSize(16);
     doc.setTextColor(202, 138, 4);
     doc.setFont(undefined, 'bold');
     doc.text(formatCurrency(actualTotal), 28 + cardWidth * 2 + cardWidth / 2, yPosition + 22, { align: 'center' });
     
     yPosition += 40;
     
     // Variance note
     if (variance !== 0) {
       doc.setFontSize(10);
       doc.setTextColor(variance > 0 ? 220 : 34, variance > 0 ? 38 : 197, variance > 0 ? 38 : 94);
       doc.setFont(undefined, 'normal');
       const varianceText = variance > 0 
         ? `Scostamento: +${formatCurrency(variance)} rispetto alle stime`
         : `Risparmio: ${formatCurrency(Math.abs(variance))} rispetto alle stime`;
       doc.text(varianceText, pageWidth / 2, yPosition, { align: 'center' });
       yPosition += 10;
     }
     
     // Breakdown by consultant type
     doc.setFontSize(14);
     doc.setTextColor(124, 58, 237);
     doc.setFont(undefined, 'bold');
     doc.text('Ripartizione per Tipologia', 14, yPosition);
     yPosition += 8;
     
     const typeData = Object.entries(byType)
       .sort((a, b) => b[1].reduce((s, t) => s + t.estimatedCost, 0) - a[1].reduce((s, t) => s + t.estimatedCost, 0))
       .map(([type, typeTasks]) => {
         const completed = typeTasks.filter(t => t.isCompleted).length;
         const estimated = typeTasks.reduce((sum, t) => sum + t.estimatedCost, 0);
         const actual = typeTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0);
         const config = consultantTypeLabels[type] || { label: type };
         return [
           config.label,
           `${completed}/${typeTasks.length}`,
           formatCurrency(estimated),
           formatCurrency(actual),
           estimatedTotal > 0 ? formatPercent((estimated / estimatedTotal) * 100) : '0%',
         ];
       });
     
     autoTable(doc, {
       startY: yPosition,
       head: [['Consulente', 'Completate', 'Stimato', 'Effettivo', '% Budget']],
       body: typeData,
       theme: 'grid',
       headStyles: {
         fillColor: [124, 58, 237],
         textColor: [255, 255, 255],
         fontStyle: 'bold',
         halign: 'center',
         fontSize: 9,
       },
       bodyStyles: {
         halign: 'center',
         fontSize: 9,
       },
       columnStyles: {
         0: { halign: 'left', cellWidth: 50 },
         1: { cellWidth: 30 },
         2: { cellWidth: 35, halign: 'right' },
         3: { cellWidth: 35, halign: 'right' },
         4: { cellWidth: 25 },
       },
       styles: {
         cellPadding: 4,
       },
       foot: [['TOTALE', `${completedTasks}/${totalTasks}`, formatCurrency(estimatedTotal), formatCurrency(actualTotal), '100%']],
       footStyles: {
         fillColor: [245, 243, 255],
         textColor: [0, 0, 0],
         fontStyle: 'bold',
         halign: 'center',
       },
     });
     
     yPosition = (doc as any).lastAutoTable.finalY + 15;
     
     // Detailed tasks by consultant type
     Object.entries(byType).forEach(([type, typeTasks]) => {
       const config = consultantTypeLabels[type] || { label: type, color: [100, 100, 100] };
       
       // Check if we need new page
       if (yPosition > 220) {
         doc.addPage();
         yPosition = 20;
       }
       
       // Section header
       doc.setFillColor(...config.color);
       doc.rect(14, yPosition, pageWidth - 28, 10, 'F');
       doc.setFontSize(12);
       doc.setTextColor(255, 255, 255);
       doc.setFont(undefined, 'bold');
       doc.text(config.label, 20, yPosition + 7);
       
       const typeCompleted = typeTasks.filter(t => t.isCompleted).length;
       doc.text(`${typeCompleted}/${typeTasks.length} completate`, pageWidth - 20, yPosition + 7, { align: 'right' });
       yPosition += 15;
       
       // Group by phase within consultant type
       const byPhase: Record<string, ConsultantTask[]> = {};
       typeTasks.forEach(task => {
         const phase = task.phase || 'operational';
         if (!byPhase[phase]) byPhase[phase] = [];
         byPhase[phase].push(task);
       });
       
       Object.entries(byPhase).forEach(([phase, phaseTasks]) => {
         // Check if we need new page
         if (yPosition > 250) {
           doc.addPage();
           yPosition = 20;
         }
         
         doc.setFontSize(10);
         doc.setTextColor(100, 100, 100);
         doc.setFont(undefined, 'bold');
         doc.text(phaseLabels[phase] || phase, 14, yPosition);
         yPosition += 5;
         
         const taskData = phaseTasks.map(task => {
           const status = task.isCompleted ? '[X]' : '[ ]';
           const recurring = task.isRecurring ? 'Ric.' : '';
           return [
             status,
             task.title,
             task.category,
             recurring,
             formatCurrency(task.estimatedCost),
             task.actualCost !== null ? formatCurrency(task.actualCost) : '-',
           ];
         });
         
         autoTable(doc, {
           startY: yPosition,
           head: [['', 'Attività', 'Categoria', '', 'Stimato', 'Effettivo']],
           body: taskData,
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
             0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
             1: { cellWidth: 55 },
             2: { cellWidth: 40 },
             3: { cellWidth: 12, halign: 'center', textColor: [168, 85, 247] },
             4: { cellWidth: 28, halign: 'right' },
             5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
           },
           styles: {
             cellPadding: 3,
           },
           margin: { left: 14, right: 14 },
           didParseCell: (data) => {
             if (data.column.index === 0 && data.section === 'body') {
               if (data.cell.raw === '[X]') {
                 data.cell.styles.textColor = [34, 197, 94];
               } else {
                 data.cell.styles.textColor = [200, 200, 200];
               }
             }
           },
         });
         
         yPosition = (doc as any).lastAutoTable.finalY + 8;
       });
       
       yPosition += 5;
     });
     
     // Notes section
     if (yPosition > 220) {
       doc.addPage();
       yPosition = 20;
     }
     
     yPosition += 10;
     doc.setFillColor(254, 249, 195);
     doc.roundedRect(14, yPosition, pageWidth - 28, 35, 3, 3, 'F');
     
     doc.setFontSize(11);
     doc.setTextColor(113, 63, 18);
     doc.setFont(undefined, 'bold');
     doc.text('Note', 20, yPosition + 10);
     
     doc.setFontSize(9);
     doc.setFont(undefined, 'normal');
     const notes = [
       '• [X] = Attività completata, [ ] = Attività da completare',
       '• Ric. = Attività ricorrente (annuale/periodica)',
       '• I costi effettivi vengono aggiornati al completamento delle attività',
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
     const fileName = `consulenti-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
     doc.save(fileName);
   };
   
   return { exportToPDF };
 };