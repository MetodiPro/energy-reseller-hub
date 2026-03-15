import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Project } from '@/hooks/useProjects';

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

const commodityLabels: Record<string, string> = {
  'solo-luce': 'Solo Energia Elettrica',
};

export const useExportProjectOverviewPDF = () => {
  const exportProjectOverviewPDF = (project: Project) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [59, 130, 246];
    const accentColor: [number, number, number] = [245, 158, 11];

    // ============ HEADER ============
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('Scheda Progetto Reseller', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11);
    doc.text(project.name, pageWidth / 2, 40, { align: 'center' });

    let y = 65;

    // Generation date
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generato il ${format(new Date(), 'dd MMMM yyyy', { locale: it })} alle ${format(new Date(), 'HH:mm')}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // ============ DATI GENERALI ============
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Dati Generali', 14, y);
    y += 8;

    const generalData = [
      ['Stato', statusLabels[project.status] || project.status],
      ['Tipo Fornitura', project.commodity_type ? commodityLabels[project.commodity_type] || project.commodity_type : 'Non definito'],
      ['Mercato Target', project.market_type ? marketTypeLabels[project.market_type] || project.market_type : 'Non definito'],
      ['Volumi Previsti', project.expected_volumes ? `${project.expected_volumes.toLocaleString('it-IT')} POD/anno` : 'Non definiti'],
      ['Data Creazione', format(parseISO(project.created_at), 'dd/MM/yyyy', { locale: it })],
    ];

    autoTable(doc, {
      startY: y,
      body: generalData,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, textColor: [80, 80, 80] },
        1: { textColor: [30, 30, 30] },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // ============ LICENZE E REGISTRAZIONI ============
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Licenze e Registrazioni', 14, y);
    y += 8;

    const licenseData = [
      ['Iscrizione EVE (Energia Elettrica)', project.eve_license_date ? format(parseISO(project.eve_license_date), 'dd/MM/yyyy') : 'Non registrato', project.eve_license_date ? '✓ Attiva' : '✗ Mancante'],
      ['Codice Operatore ARERA', project.arera_code || 'Non assegnato', project.arera_code ? '✓ Assegnato' : '✗ Mancante'],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Licenza/Registrazione', 'Valore', 'Stato']],
      body: licenseData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        2: { halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const text = data.cell.text[0] || '';
          if (text.startsWith('✓')) {
            data.cell.styles.textColor = [34, 197, 94];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // ============ GROSSISTA PARTNER ============
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Grossista Partner', 14, y);
    y += 8;

    const wholesalerData = [
      ['Nome Grossista', project.wholesaler_name || 'Non definito'],
      ['Contatto', project.wholesaler_contact || 'Non definito'],
    ];

    autoTable(doc, {
      startY: y,
      body: wholesalerData,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, textColor: [80, 80, 80] },
        1: { textColor: [30, 30, 30] },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // ============ GO-LIVE ============
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Data Go-Live', 14, y);
    y += 10;

    if (project.go_live_date) {
      doc.setFillColor(...accentColor);
      doc.roundedRect(14, y, pageWidth - 28, 25, 3, 3, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(format(parseISO(project.go_live_date), 'dd MMMM yyyy', { locale: it }), pageWidth / 2, y + 16, { align: 'center' });
      y += 35;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text('Data Go-Live non ancora pianificata', 14, y + 5);
      y += 15;
    }

    // ============ REGIONI OPERATIVE ============
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Regioni Operative', 14, y);
    y += 10;

    if (project.regions && project.regions.length > 0) {
      const regionText = project.regions.join(', ');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(regionText, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 10;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('Tutte le regioni (nessuna limitazione)', 14, y);
      y += 10;
    }

    // ============ RIEPILOGO COMPLETEZZA ============
    y += 5;
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Riepilogo Completezza Scheda', 14, y);
    y += 8;

    const checks = [
      { label: 'Tipo Fornitura', done: !!project.commodity_type },
      { label: 'Mercato Target', done: !!project.market_type },
      { label: 'Volumi Previsti', done: !!project.expected_volumes },
      { label: 'Iscrizione EVE', done: !!project.eve_license_date },
      { label: 'Codice ARERA', done: !!project.arera_code },
      { label: 'Grossista Partner', done: !!project.wholesaler_name },
      { label: 'Data Go-Live', done: !!project.go_live_date },
      { label: 'Regioni Operative', done: !!(project.regions && project.regions.length > 0) },
    ];

    const completedChecks = checks.filter(c => c.done).length;
    const completionPercent = Math.round((completedChecks / checks.length) * 100);

    const checkData = checks.map(c => [
      c.done ? '✓' : '✗',
      c.label,
      c.done ? 'Compilato' : 'Da completare',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['', 'Campo', 'Stato']],
      body: checkData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 0 || data.column.index === 2) {
            const rowIdx = data.row.index;
            if (checks[rowIdx]?.done) {
              data.cell.styles.textColor = [34, 197, 94];
            } else {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Completion bar
    const barWidth = pageWidth - 28;
    const barHeight = 14;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(14, y, barWidth, barHeight, 2, 2, 'F');

    const fillColor: [number, number, number] = completionPercent >= 80 ? [34, 197, 94] : completionPercent >= 50 ? [245, 158, 11] : [220, 38, 38];
    doc.setFillColor(...fillColor);
    doc.roundedRect(14, y, (barWidth * completionPercent) / 100, barHeight, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${completionPercent}% completato (${completedChecks}/${checks.length})`, pageWidth / 2, y + 10, { align: 'center' });

    // ============ FOOTER ============
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${project.name} - Scheda Progetto`, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Pagina ${i} di ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    const fileName = `scheda-progetto-${project.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  return { exportProjectOverviewPDF };
};
