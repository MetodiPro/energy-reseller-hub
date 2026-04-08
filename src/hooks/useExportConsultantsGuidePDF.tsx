import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  consultantTaskTemplates,
  consultantTypeLabels,
  type ConsultantTaskTemplate,
  type ConsultantType,
} from '@/data/consultantTasks';

const phaseLabels: Record<string, string> = {
  startup: '🚀 Fase di Avvio',
  operational: '⚙️ Fase Operativa',
  ongoing: '🔄 Attività Ricorrenti',
};

const priorityLabels: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
};

const recurrenceLabels: Record<string, string> = {
  monthly: 'Mensile',
  quarterly: 'Trimestrale',
  yearly: 'Annuale',
};

const typeColors: Record<string, [number, number, number]> = {
  commercialista: [34, 197, 94],
  legale: [59, 130, 246],
  formazione: [168, 85, 247],
  it_software: [236, 72, 153],
  operativo: [249, 115, 22],
  entrambi: [107, 114, 128],
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export const useExportConsultantsGuidePDF = () => {
  const exportGuidePDF = (projectName?: string) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const templates = consultantTaskTemplates;

    // --- Cover ---
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, pw, 50, 'F');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined as any, 'bold');
    doc.text('Guida Completa Consulenti', pw / 2, 22, { align: 'center' });
    doc.setFontSize(13);
    doc.text('Tutte le attività necessarie per avviare un reseller energia', pw / 2, 34, { align: 'center' });
    if (projectName) {
      doc.setFontSize(11);
      doc.text(projectName, pw / 2, 44, { align: 'center' });
    }

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined as any, 'normal');
    doc.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, pw / 2, 60, { align: 'center' });

    let y = 70;

    // --- Summary table ---
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.setFont(undefined as any, 'bold');
    doc.text('Riepilogo per Tipologia Consulente', 14, y);
    y += 8;

    const types: ConsultantType[] = ['commercialista', 'legale', 'formazione', 'it_software', 'operativo', 'entrambi'];
    const summaryData = types.map(type => {
      const tasks = templates.filter(t => t.consultantType === type);
      if (tasks.length === 0) return null;
      const total = tasks.reduce((s, t) => s + t.estimatedCost, 0);
      const startup = tasks.filter(t => t.phase === 'startup').length;
      const oper = tasks.filter(t => t.phase === 'operational').length;
      const ongoing = tasks.filter(t => t.phase === 'ongoing').length;
      return [
        consultantTypeLabels[type] || type,
        String(tasks.length),
        String(startup),
        String(oper),
        String(ongoing),
        formatCurrency(total),
      ];
    }).filter(Boolean) as string[][];

    const grandTotal = templates.reduce((s, t) => s + t.estimatedCost, 0);

    autoTable(doc, {
      startY: y,
      head: [['Consulente', 'Totale', 'Avvio', 'Operativo', 'Ricorrente', 'Costo Stimato']],
      body: summaryData,
      foot: [['TOTALE', String(templates.length), '', '', '', formatCurrency(grandTotal)]],
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 9, halign: 'center' },
      footStyles: { fillColor: [245, 243, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { halign: 'left', cellWidth: 45 }, 5: { halign: 'right' } },
      styles: { cellPadding: 4 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // --- Detail per type and phase ---
    types.forEach(type => {
      const tasks = templates.filter(t => t.consultantType === type);
      if (tasks.length === 0) return;

      const color = typeColors[type] || [100, 100, 100];
      const label = consultantTypeLabels[type] || type;

      // Check page space
      if (y > 220) { doc.addPage(); y = 20; }

      // Type header
      doc.setFillColor(...color);
      doc.rect(14, y, pw - 28, 12, 'F');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined as any, 'bold');
      doc.text(label, 20, y + 8);
      doc.setFontSize(10);
      doc.text(`${tasks.length} attività • ${formatCurrency(tasks.reduce((s, t) => s + t.estimatedCost, 0))}`, pw - 20, y + 8, { align: 'right' });
      y += 18;

      // Group by phase
      const phases = ['startup', 'operational', 'ongoing'] as const;
      phases.forEach(phase => {
        const phaseTasks = tasks.filter(t => t.phase === phase);
        if (phaseTasks.length === 0) return;

        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(11);
        doc.setTextColor(...color);
        doc.setFont(undefined as any, 'bold');
        doc.text(phaseLabels[phase] || phase, 14, y);
        y += 6;

        const rows = phaseTasks.map(t => [
          t.title,
          t.description,
          t.category + (t.subcategory ? ` / ${t.subcategory}` : ''),
          priorityLabels[t.priority] || t.priority,
          t.isRecurring ? (recurrenceLabels[t.recurrencePattern || ''] || 'Sì') : 'No',
          formatCurrency(t.estimatedCost),
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Attività', 'Descrizione', 'Categoria', 'Priorità', 'Ricorrente', 'Costo']],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: [226, 232, 240], textColor: [60, 60, 60], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7.5, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold' },
            1: { cellWidth: 55 },
            2: { cellWidth: 32 },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 22, halign: 'right' },
          },
          styles: { overflow: 'linebreak' },
          margin: { left: 14, right: 14 },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      });

      y += 5;
    });

    // --- Legend ---
    if (y > 230) { doc.addPage(); y = 20; }
    y += 5;
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(14, y, pw - 28, 40, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(113, 63, 18);
    doc.setFont(undefined as any, 'bold');
    doc.text('Legenda', 20, y + 10);
    doc.setFontSize(8);
    doc.setFont(undefined as any, 'normal');
    const notes = [
      '• Le attività sono organizzate per tipologia di consulente e fase (Avvio, Operativa, Ricorrente).',
      '• I costi stimati sono indicativi e possono variare in base al professionista e alla complessità.',
      '• Le attività ricorrenti (Mensile / Trimestrale / Annuale) rappresentano costi periodici da sostenere.',
      '• Le priorità (Alta, Media, Bassa) indicano l\'urgenza relativa nel percorso di avvio.',
    ];
    notes.forEach((n, i) => doc.text(n, 20, y + 18 + i * 5));

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${i} di ${pageCount} — Guida Consulenti • Energy Start Buddy`, pw / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    const fileName = `guida-consulenti-${projectName ? projectName.replace(/\s+/g, '-').toLowerCase() + '-' : ''}${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return { exportGuidePDF };
};
