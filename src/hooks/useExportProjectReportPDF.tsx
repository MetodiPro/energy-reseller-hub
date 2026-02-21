import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { processSteps, phases } from '@/data/processSteps';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { StepProgress } from './useStepProgress';
import type { ProjectCost, ProjectRevenue, FinancialSummary } from './useProjectFinancials';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  market_type: string | null;
  expected_volumes: number | null;
  regions: string[] | null;
  wholesaler_name: string | null;
  wholesaler_contact: string | null;
  eve_license_date: string | null;
  evg_license_date: string | null;
  arera_code: string | null;
  go_live_date: string | null;
  created_at: string;
}

interface RegulatoryDeadline {
  id: string;
  deadline_type: string;
  title: string;
  due_date: string;
  completed: boolean;
}

const statusLabels: Record<string, string> = {
  draft: 'Bozza',
  in_authorization: 'In Autorizzazione',
  setup: 'In Setup',
  active: 'Attivo',
  operational: 'Operativo',
  paused: 'In Pausa',
  suspended: 'Sospeso',
  closed: 'Chiuso',
};

const marketTypeLabels: Record<string, string> = {
  residential: 'Residenziale',
  business: 'Business',
  mixed: 'Misto',
};

export const useExportProjectReportPDF = () => {
  const exportProjectReportPDF = (
    project: Project,
    stepProgress: Record<string, StepProgress>,
    costs: ProjectCost[],
    revenues: ProjectRevenue[],
    financialSummary: FinancialSummary,
    deadlines: RegulatoryDeadline[],
    teamMembersCount: number
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [59, 130, 246];
    const successColor: [number, number, number] = [34, 197, 94];
    const warningColor: [number, number, number] = [234, 179, 8];
    
    let yPosition = 20;

    // ============ COVER PAGE ============
    // Title
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text('Report Progetto Reseller', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(project.name, pageWidth / 2, 45, { align: 'center' });
    
    yPosition = 80;
    
    // Generation info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${format(new Date(), 'dd MMMM yyyy', { locale: it })} alle ${format(new Date(), 'HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Project Summary Box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, yPosition, pageWidth - 28, 60, 3, 3, 'F');
    
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Riepilogo Progetto', 20, yPosition + 12);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const summaryData = [
      ['Stato:', statusLabels[project.status] || project.status],
      ['Mercato:', project.market_type ? marketTypeLabels[project.market_type] : 'Non definito'],
      ['Volumi previsti:', project.expected_volumes ? `${project.expected_volumes.toLocaleString()} POD/anno` : 'Non definiti'],
      ['Grossista:', project.wholesaler_name || 'Non definito'],
      ['Data Go-Live:', project.go_live_date ? format(parseISO(project.go_live_date), 'dd/MM/yyyy') : 'Non pianificata'],
    ];
    
    let summaryY = yPosition + 22;
    summaryData.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, 24, summaryY);
      doc.setFont(undefined, 'normal');
      doc.text(value, 70, summaryY);
      summaryY += 8;
    });
    
    yPosition += 70;

    // ============ LICENSES SECTION ============
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Licenze e Registrazioni', 14, yPosition);
    yPosition += 10;

    const licenseData = [
      ['Iscrizione EVE', project.eve_license_date ? format(parseISO(project.eve_license_date), 'dd/MM/yyyy') : 'Non registrato', project.eve_license_date ? '✓' : '✗'],
      ['Codice ARERA', project.arera_code || 'Non assegnato', project.arera_code ? '✓' : '✗'],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Licenza', 'Data/Codice', 'Stato']],
      body: licenseData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 2: { halign: 'center' } },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // ============ PROCESS PROGRESS ============
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Stato Avanzamento Processo', 14, yPosition);
    yPosition += 10;

    const phaseData = phases.map(phase => {
      const phaseSteps = processSteps.filter(s => s.phase === phase.id);
      const completed = phaseSteps.filter(s => stepProgress[s.id]?.completed).length;
      const total = phaseSteps.length;
      const percentage = Math.round((completed / total) * 100);
      
      return [
        `Fase ${phase.id}`,
        phase.name,
        `${completed}/${total}`,
        `${percentage}%`,
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Fase', 'Nome', 'Step', 'Completamento']],
      body: phaseData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Overall progress
    const totalSteps = processSteps.length;
    const completedSteps = Object.values(stepProgress).filter(p => p.completed).length;
    const overallProgress = Math.round((completedSteps / totalSteps) * 100);

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, yPosition, pageWidth - 28, 20, 2, 2, 'F');
    
    doc.setFillColor(...(overallProgress >= 75 ? successColor : overallProgress >= 50 ? warningColor : primaryColor));
    doc.roundedRect(14, yPosition, ((pageWidth - 28) * overallProgress) / 100, 20, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`Progresso Totale: ${overallProgress}% (${completedSteps}/${totalSteps} step)`, pageWidth / 2, yPosition + 13, { align: 'center' });

    // ============ NEW PAGE: FINANCIALS ============
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('Riepilogo Finanziario', 14, yPosition);
    yPosition += 15;

    // Financial summary cards
    const formatCurrency = (amount: number) => 
      `€ ${amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const financialCards = [
      { label: 'Ricavi Totali', value: formatCurrency(financialSummary.totalRevenue), color: successColor },
      { label: 'Costi Totali', value: formatCurrency(financialSummary.totalCosts), color: [220, 38, 38] as [number, number, number] },
      { label: 'Margine Netto', value: formatCurrency(financialSummary.netMargin), color: financialSummary.netMargin >= 0 ? successColor : [220, 38, 38] as [number, number, number] },
    ];

    const cardWidth = (pageWidth - 42) / 3;
    financialCards.forEach((card, idx) => {
      const x = 14 + (idx * (cardWidth + 7));
      doc.setFillColor(...card.color);
      doc.roundedRect(x, yPosition, cardWidth, 30, 2, 2, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(card.label, x + cardWidth / 2, yPosition + 10, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(card.value, x + cardWidth / 2, yPosition + 22, { align: 'center' });
    });
    
    yPosition += 45;

    // Costs breakdown by type
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Ripartizione Costi per Tipologia', 14, yPosition);
    yPosition += 10;

    const costTypeLabels: Record<string, string> = {
      commercial: 'Commerciali',
      structural: 'Strutturali',
      direct: 'Diretti',
      indirect: 'Indiretti',
    };

    const costsByTypeData = Object.entries(financialSummary.costsByType).map(([type, amount]) => [
      costTypeLabels[type] || type,
      formatCurrency(amount),
      financialSummary.totalCosts > 0 ? `${Math.round((amount / financialSummary.totalCosts) * 100)}%` : '0%',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Tipologia', 'Importo', '% sul Totale']],
      body: costsByTypeData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Top costs list
    if (costs.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text('Principali Voci di Costo', 14, yPosition);
      yPosition += 10;

      const topCosts = [...costs]
        .sort((a, b) => (b.amount * b.quantity) - (a.amount * a.quantity))
        .slice(0, 10)
        .map(cost => [
          cost.name,
          costTypeLabels[cost.cost_type] || cost.cost_type,
          formatCurrency(cost.amount * cost.quantity),
        ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Voce', 'Tipo', 'Importo']],
        body: topCosts,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // ============ NEW PAGE: TIMELINE & DEADLINES ============
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('Timeline e Scadenze', 14, yPosition);
    yPosition += 15;

    // Estimated timeline
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Timeline Stimata', 14, yPosition);
    yPosition += 10;

    let cumulativeDays = 0;
    const startDate = project.created_at ? parseISO(project.created_at) : new Date();
    
    const timelineData = phases.map(phase => {
      const phaseSteps = processSteps.filter(s => s.phase === phase.id);
      const phaseDays = phaseSteps.reduce((sum, step) => sum + step.estimatedDays, 0);
      const phaseStart = addDays(startDate, cumulativeDays);
      const phaseEnd = addDays(phaseStart, phaseDays);
      cumulativeDays += phaseDays;

      return [
        `Fase ${phase.id}: ${phase.name}`,
        format(phaseStart, 'dd/MM/yy'),
        format(phaseEnd, 'dd/MM/yy'),
        `${phaseDays} gg`,
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Fase', 'Inizio', 'Fine', 'Durata']],
      body: timelineData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Regulatory deadlines
    if (deadlines.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text('Scadenze Normative', 14, yPosition);
      yPosition += 10;

      const deadlineData = deadlines.map(d => [
        d.title,
        format(parseISO(d.due_date), 'dd/MM/yyyy'),
        d.completed ? '✓ Completato' : differenceInDays(parseISO(d.due_date), new Date()) < 0 ? '⚠ Scaduto' : 'In attesa',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Scadenza', 'Data', 'Stato']],
        body: deadlineData,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 3 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // ============ FOOTER ON ALL PAGES ============
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${project.name} - Report Progetto`, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Pagina ${i} di ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    // Save the PDF
    const fileName = `report-${project.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  return { exportProjectReportPDF };
};
