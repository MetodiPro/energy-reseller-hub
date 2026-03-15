import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { processSteps, phases } from '@/data/processSteps';
import { format, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import type { StepProgress } from './useStepProgress';
import type { FinancialSummary } from './useProjectFinancials';
import type { CashFlowSummary } from './useCashFlowAnalysis';
import type { Project } from './useProjects';

interface CheckItem {
  label: string;
  isMet: boolean;
  severity: string;
  category: string;
}

interface TeamMember {
  name: string;
  role: string;
}

const statusLabels: Record<string, string> = {
  draft: 'Bozza', in_authorization: 'In Autorizzazione', setup: 'In Setup',
  active: 'Attivo', operational: 'Operativo', paused: 'In Pausa',
};

const primaryColor: [number, number, number] = [59, 130, 246];
const successColor: [number, number, number] = [34, 197, 94];

const fmt = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const useExportUnifiedPDF = () => {
  const exportUnifiedPDF = (
    project: Project,
    stepProgress: Record<string, StepProgress>,
    financialSummary: FinancialSummary,
    cashFlowData: CashFlowSummary,
    teamMembers: TeamMember[],
    checkItems: CheckItem[],
  ) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;

    // ====== COVER ======
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pw, 55, 'F');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('Report Unificato Progetto', pw / 2, 25, { align: 'center' });
    doc.setFontSize(16);
    doc.text(project.name, pw / 2, 42, { align: 'center' });
    y = 70;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: it })}`, pw / 2, y, { align: 'center' });
    y += 15;

    // Project info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const info = [
      ['Stato', statusLabels[project.status] || project.status],
      ['Commodity', project.commodity_type || 'N/D'],
      ['Mercato', project.market_type || 'N/D'],
      ['Grossista', project.wholesaler_name || 'N/D'],
      ['Go-Live', project.go_live_date ? format(parseISO(project.go_live_date), 'dd/MM/yyyy') : 'N/D'],
    ];
    autoTable(doc, {
      startY: y, body: info, theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    // ====== 1. PROCESSO ======
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('1. Stato Processo', 14, y);
    y += 10;

    const totalSteps = processSteps.length;
    const completedSteps = Object.values(stepProgress).filter(p => p.completed).length;

    const phaseRows = phases.map(phase => {
      const ps = processSteps.filter(s => s.phase === phase.id);
      const done = ps.filter(s => stepProgress[s.id]?.completed).length;
      return [phase.name, `${done}/${ps.length}`, `${Math.round((done / ps.length) * 100)}%`];
    });

    autoTable(doc, {
      startY: y, head: [['Fase', 'Step', '%']], body: phaseRows,
      theme: 'striped', headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Progresso totale: ${completedSteps}/${totalSteps} (${Math.round((completedSteps / totalSteps) * 100)}%)`, 14, y);
    y += 15;

    // ====== 2. FINANZA ======
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('2. Riepilogo Finanziario', 14, y);
    y += 10;

    const finRows = [
      ['Ricavi Totali (12m)', fmt(financialSummary.totalRevenue)],
      ['Costi Totali', fmt(financialSummary.totalCosts)],
      ['Margine Netto', fmt(financialSummary.netMargin)],
      ['Margine %', `${financialSummary.netMarginPercent.toFixed(1)}%`],
    ];

    if (cashFlowData.hasData) {
      finRows.push(
        ['Investimento Iniziale', fmt(cashFlowData.investimentoIniziale)],
        ['Max Esposizione Cassa', fmt(cashFlowData.massimaEsposizione)],
        ['BEP Finanziario', cashFlowData.mesePrimoPositivo || 'Non raggiunto'],
        ['Saldo Finale (14m)', fmt(cashFlowData.saldoFinale)],
      );
    }

    autoTable(doc, {
      startY: y, body: finRows, theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    // ====== 3. TEAM ======
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('3. Team di Progetto', 14, y);
    y += 10;

    if (teamMembers.length > 0) {
      autoTable(doc, {
        startY: y, head: [['Membro', 'Ruolo']], 
        body: teamMembers.map(m => [m.name, m.role]),
        theme: 'striped', headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nessun membro del team registrato.', 14, y);
      y += 15;
    }

    // ====== 4. CHECKLIST PRE-LAUNCH ======
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('4. Checklist Pre-Launch', 14, y);
    y += 10;

    const criticalItems = checkItems.filter(i => i.severity === 'critical');
    const importantItems = checkItems.filter(i => i.severity === 'important');
    const recommendedItems = checkItems.filter(i => i.severity === 'recommended');

    const allCheckRows = [
      ...criticalItems.map(i => [i.label, 'Critico', i.isMet ? 'OK' : 'MANCANTE']),
      ...importantItems.map(i => [i.label, 'Importante', i.isMet ? 'OK' : 'MANCANTE']),
      ...recommendedItems.map(i => [i.label, 'Consigliato', i.isMet ? 'OK' : 'MANCANTE']),
    ];

    autoTable(doc, {
      startY: y, head: [['Requisito', 'Priorità', 'Stato']], body: allCheckRows,
      theme: 'striped', headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 3 },
      didParseCell: (data: any) => {
        if (data.column.index === 2 && data.section === 'body') {
          data.cell.styles.textColor = data.cell.raw === 'OK' ? [34, 197, 94] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    const critDone = criticalItems.filter(i => i.isMet).length;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Requisiti critici: ${critDone}/${criticalItems.length} completati`, 14, y);

    // ====== FOOTER ======
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${project.name} - Report Unificato`, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Pagina ${i}/${pages}`, pw - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    doc.save(`report-unificato-${project.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return { exportUnifiedPDF };
};
