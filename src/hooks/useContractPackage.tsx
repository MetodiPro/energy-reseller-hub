import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

export interface ContractSimulationData {
  // Luce
  punPerKwh?: number;
  spreadPerKwh?: number;
  dispacciamentoPerKwh?: number;
  trasportoQuotaFissaAnno?: number;
  trasportoQuotaPotenzaKwAnno?: number;
  trasportoQuotaEnergiaKwh?: number;
  oneriAsosKwh?: number;
  oneriArimKwh?: number;
  acciseKwh?: number;
  ivaPercent?: number;
  ccvMonthly?: number;
  gestionePodPerPod?: number;
  potenzaImpegnataKw?: number;
  // Gas
  psvPerSmc?: number;
  spreadGasPerSmc?: number;
  trasportoGasQuotaFissaAnno?: number;
  trasportoGasQuotaEnergiaSmc?: number;
  oneriGasReSmc?: number;
  oneriGasUgSmc?: number;
  acciseGasSmc?: number;
  addizionaleRegionaleGasSmc?: number;
  ivaPercentGas?: number;
  ccvGasMonthly?: number;
  gestionePdrPerPdr?: number;
}

interface ContractData {
  projectName: string;
  logoUrl: string | null;
  commodityType: string | null;
  companyName?: string;
  areaCode?: string;
  wholesalerName?: string;
  simulation?: ContractSimulationData;
}

// Helper to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const addHeader = async (doc: jsPDF, logoBase64: string | null, title: string, subtitle: string, companyName: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', 14, 10, 30, 30);
    } catch {
      // skip if image fails
    }
  }

  // Company name
  const xStart = logoBase64 ? 50 : 14;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, xStart, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Reseller Energia – Mercato Libero Italiano', xStart, 29);
  doc.setTextColor(0);

  // Title bar
  doc.setFillColor(232, 121, 24); // primary amber
  doc.rect(0, 46, pageWidth, 12, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text(title, 14, 54);
  doc.setTextColor(0);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text(subtitle, 14, 66);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
};

const addFooter = (doc: jsPDF, companyName: string) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`${companyName} — Documento riservato`, 14, pageHeight - 10);
    doc.text(`Pagina ${i} di ${pageCount}`, pageWidth - 40, pageHeight - 10);
    doc.setTextColor(0);
  }
};

// --- PDA ---
const generatePDA = async (data: ContractData, logoBase64: string | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  await addHeader(doc, logoBase64, 'PROPOSTA DI ADESIONE (PDA)', 'Modulo per la sottoscrizione di contratto di fornitura energia', company);

  let y = 76;
  const left = 14;
  const lh = 7;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DATI DEL CLIENTE', left, y); y += lh;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const fields = [
    'Cognome/Ragione Sociale: ____________________________________',
    'Nome/Forma Giuridica: ____________________________________',
    'Codice Fiscale: ____________________________________',
    'Partita IVA: ____________________________________',
    'Indirizzo di residenza/sede: ____________________________________',
    'CAP: ________  Città: ____________________  Prov: ____',
    'Telefono: ____________________  Email: ____________________________',
    'PEC: ____________________________________',
  ];
  fields.forEach(f => { doc.text(f, left, y); y += lh; });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DATI PUNTO DI FORNITURA', left, y); y += lh;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const commodity = data.commodityType || 'Luce';
  const supplyFields = [
    `Tipo fornitura: ${commodity === 'dual' ? 'Energia Elettrica + Gas' : commodity === 'gas' ? 'Gas Naturale' : 'Energia Elettrica'}`,
    commodity !== 'gas' ? 'Codice POD: IT ___ E ____________________' : '',
    commodity !== 'luce' ? 'Codice PDR: ____________________________________' : '',
    'Indirizzo di fornitura: ____________________________________',
    'CAP: ________  Città: ____________________  Prov: ____',
    'Uso: [ ] Domestico residente  [ ] Domestico non residente  [ ] Business',
    commodity !== 'gas' ? 'Potenza impegnata (kW): ________  Potenza disponibile (kW): ________' : '',
    'Distributore locale: ____________________________________',
  ].filter(Boolean);
  supplyFields.forEach(f => { doc.text(f, left, y); y += lh; });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. OFFERTA ECONOMICA', left, y); y += lh;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const sim = data.simulation;
  const fmtVal = (v?: number, suffix?: string) => v != null ? `${v}${suffix || ''}` : '________';
  
  const offerFields = [
    'Nome offerta: ____________________________________',
    `Prezzo energia (€/kWh): ${sim?.punPerKwh != null && sim?.spreadPerKwh != null ? (sim.punPerKwh + sim.spreadPerKwh).toFixed(4) : '________'}`,
    'Tipologia prezzo: [ ] Fisso  [X] Variabile (PUN/PSV + spread)',
    `Spread reseller (€/kWh): ${fmtVal(sim?.spreadPerKwh)}`,
    `CCV mensile: € ${fmtVal(sim?.ccvMonthly)}`,
    'Durata contrattuale: [ ] 12 mesi  [ ] 24 mesi  [ ] Altro: ________',
    'Decorrenza fornitura: ____/____/________',
  ];
  offerFields.forEach(f => { doc.text(f, left, y); y += lh; });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. MODALITÀ DI PAGAMENTO', left, y); y += lh;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const payFields = [
    '[ ] RID/SDD – IBAN: ____________________________________',
    '[ ] Bollettino postale',
    '[ ] Bonifico bancario',
    'Frequenza fatturazione: [ ] Mensile  [ ] Bimestrale',
  ];
  payFields.forEach(f => { doc.text(f, left, y); y += lh; });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. FIRME', left, y); y += lh + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Data: ____/____/________', left, y);
  doc.text('Luogo: ____________________', left + 80, y); y += 14;
  doc.text('Firma del Cliente: ____________________________', left, y);
  doc.text(`Per ${company}: ____________________________`, left + 100, y);

  addFooter(doc, company);
  return doc;
};

// --- CTE ---
const generateCTE = async (data: ContractData, logoBase64: string | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  await addHeader(doc, logoBase64, 'CONDIZIONI TECNICO-ECONOMICHE (CTE)', 'Dettaglio delle condizioni economiche della fornitura', company);

  let y = 76;
  const left = 14;
  const lh = 6.5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. COMPONENTI DI PREZZO – ENERGIA ELETTRICA', left, y); y += lh + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const sim = data.simulation;
  const fmtN = (v?: number, decimals = 4) => v != null ? v.toFixed(decimals) : '________';
  const fmtN2 = (v?: number) => fmtN(v, 2);

  const elecRows = [
    ['Prezzo energia (PUN + spread)', '€/kWh', sim?.punPerKwh != null && sim?.spreadPerKwh != null ? (sim.punPerKwh + sim.spreadPerKwh).toFixed(4) : '________'],
    ['di cui PUN', '€/kWh', fmtN(sim?.punPerKwh)],
    ['di cui Spread reseller', '€/kWh', fmtN(sim?.spreadPerKwh)],
    ['Dispacciamento', '€/kWh', fmtN(sim?.dispacciamentoPerKwh)],
    ['Trasporto – quota fissa', '€/anno', fmtN2(sim?.trasportoQuotaFissaAnno)],
    ['Trasporto – quota potenza', '€/kW/anno', fmtN2(sim?.trasportoQuotaPotenzaKwAnno)],
    ['Trasporto – quota energia', '€/kWh', fmtN(sim?.trasportoQuotaEnergiaKwh)],
    ['Oneri di sistema (ASOS)', '€/kWh', fmtN(sim?.oneriAsosKwh)],
    ['Oneri di sistema (ARIM)', '€/kWh', fmtN(sim?.oneriArimKwh)],
    ['Accise', '€/kWh', fmtN(sim?.acciseKwh)],
    ['IVA', '%', fmtN2(sim?.ivaPercent)],
    ['CCV mensile', '€/mese', fmtN2(sim?.ccvMonthly)],
    ['Gestione POD', '€/POD/mese', fmtN2(sim?.gestionePodPerPod)],
  ];

  (doc as any).autoTable({
    startY: y,
    head: [['Componente', 'Unità', 'Valore']],
    body: elecRows,
    theme: 'striped',
    headStyles: { fillColor: [232, 121, 24], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (data.commodityType === 'gas' || data.commodityType === 'dual') {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. COMPONENTI DI PREZZO – GAS NATURALE', left, y); y += lh + 2;
    doc.setFont('helvetica', 'normal');

    const gasRows = [
      ['Prezzo materia prima (PSV + spread)', '€/Smc', sim?.psvPerSmc != null && sim?.spreadGasPerSmc != null ? (sim.psvPerSmc + sim.spreadGasPerSmc).toFixed(4) : '________'],
      ['di cui PSV', '€/Smc', fmtN(sim?.psvPerSmc)],
      ['di cui Spread reseller gas', '€/Smc', fmtN(sim?.spreadGasPerSmc)],
      ['Trasporto – quota fissa', '€/anno', fmtN2(sim?.trasportoGasQuotaFissaAnno)],
      ['Trasporto – quota energia', '€/Smc', fmtN(sim?.trasportoGasQuotaEnergiaSmc)],
      ['Oneri gas (RE)', '€/Smc', fmtN(sim?.oneriGasReSmc)],
      ['Oneri gas (UG)', '€/Smc', fmtN(sim?.oneriGasUgSmc)],
      ['Accise gas', '€/Smc', fmtN(sim?.acciseGasSmc)],
      ['Addizionale regionale', '€/Smc', fmtN(sim?.addizionaleRegionaleGasSmc)],
      ['IVA gas', '%', fmtN2(sim?.ivaPercentGas)],
      ['CCV gas mensile', '€/mese', fmtN2(sim?.ccvGasMonthly)],
      ['Gestione PDR', '€/PDR/mese', fmtN2(sim?.gestionePdrPerPdr)],
    ];

    (doc as any).autoTable({
      startY: y,
      head: [['Componente', 'Unità', 'Valore']],
      body: gasRows,
      theme: 'striped',
      headStyles: { fillColor: [232, 121, 24], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const nextSection = data.commodityType === 'gas' || data.commodityType === 'dual' ? '3' : '2';
  doc.text(`${nextSection}. CONDIZIONI CONTRATTUALI`, left, y); y += lh + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const conditions = [
    'Durata contrattuale: ________ mesi dalla data di attivazione della fornitura.',
    'Rinnovo automatico: alla scadenza il contratto si rinnova tacitamente alle condizioni di mercato vigenti.',
    'Recesso: il cliente può recedere con un preavviso di 30 giorni senza penali.',
    'Deposito cauzionale: potrà essere richiesto secondo le modalità previste dalla delibera ARERA.',
    'Morosità: in caso di mancato pagamento si applicano gli interessi moratori al tasso BCE + 3,5%.',
    `Grossista di riferimento: ${data.wholesalerName || '____________________________________'}`,
  ];
  conditions.forEach(c => {
    const lines = doc.splitTextToSize(c, 180);
    doc.text(lines, left, y);
    y += lines.length * 5 + 2;
  });

  addFooter(doc, company);
  return doc;
};

// --- Condizioni Generali ---
const generateCondizioni = async (data: ContractData, logoBase64: string | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  await addHeader(doc, logoBase64, 'CONDIZIONI GENERALI DI FORNITURA', 'Termini e condizioni del servizio di vendita energia', company);

  let y = 76;
  const left = 14;

  const articles = [
    { title: 'Art. 1 – Oggetto del contratto', text: `Le presenti condizioni generali disciplinano il rapporto di fornitura di energia elettrica e/o gas naturale tra ${company} (di seguito "Venditore") e il Cliente finale (di seguito "Cliente") nel mercato libero italiano, ai sensi del D.Lgs. 79/99 e del D.Lgs. 164/00.` },
    { title: 'Art. 2 – Conclusione del contratto', text: 'Il contratto si intende concluso con la sottoscrizione della Proposta di Adesione (PDA) e l\'accettazione delle presenti Condizioni Generali. Il contratto è soggetto a diritto di ripensamento entro 14 giorni dalla sottoscrizione, ai sensi del D.Lgs. 206/2005 (Codice del Consumo).' },
    { title: 'Art. 3 – Durata e rinnovo', text: 'Il contratto ha la durata indicata nella PDA e si rinnova tacitamente alla scadenza, salvo disdetta comunicata con almeno 30 giorni di preavviso. In caso di rinnovo, il Venditore comunicherà le nuove condizioni economiche con almeno 3 mesi di anticipo.' },
    { title: 'Art. 4 – Diritto di recesso', text: 'Il Cliente domestico ha diritto di recedere dal contratto entro 14 giorni dalla sottoscrizione senza penali né costi di disattivazione, mediante comunicazione scritta. Per contratti a distanza o fuori dai locali commerciali, si applicano le tutele del Codice del Consumo.' },
    { title: 'Art. 5 – Fatturazione e pagamenti', text: 'La fatturazione avviene con la periodicità indicata nella PDA, sulla base dei consumi rilevati dal distributore locale o stimati secondo i profili ARERA. Il pagamento deve avvenire entro la scadenza indicata in fattura tramite la modalità prescelta dal Cliente.' },
    { title: 'Art. 6 – Morosità e sospensione', text: 'In caso di mancato pagamento, il Venditore invierà sollecito e potrà applicare interessi moratori. Dopo il termine previsto dalla regolazione ARERA, potrà richiedere la sospensione della fornitura al distributore locale, previa comunicazione con preavviso.' },
    { title: 'Art. 7 – Qualità del servizio', text: 'La qualità tecnica della fornitura (continuità, tensione, pressione) è responsabilità del distributore locale. Il Venditore è responsabile della qualità commerciale del servizio (fatturazione, assistenza, gestione reclami) secondo gli standard ARERA.' },
    { title: 'Art. 8 – Reclami e conciliazione', text: `Il Cliente può presentare reclamo scritto a ${company} che risponderà entro 30 giorni solari. In caso di mancata risoluzione, il Cliente può attivare la procedura di conciliazione presso il Servizio Conciliazione di ARERA (conciliazione.arera.it).` },
    { title: 'Art. 9 – Trattamento dati personali', text: 'I dati personali del Cliente sono trattati ai sensi del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003, per le finalità connesse all\'esecuzione del contratto e agli obblighi di legge. L\'informativa completa è disponibile sul sito del Venditore.' },
    { title: 'Art. 10 – Foro competente', text: 'Per le controversie derivanti dal presente contratto è competente il Foro del luogo di residenza/domicilio del Cliente consumatore. Per i clienti business, il Foro competente è quello della sede legale del Venditore.' },
  ];

  doc.setFontSize(9);
  articles.forEach(a => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(a.title, left, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(a.text, 180);
    doc.text(lines, left, y);
    y += lines.length * 4.5 + 6;
  });

  addFooter(doc, company);
  return doc;
};

// --- Scheda Sintetica ---
const generateSchedaSintetica = async (data: ContractData, logoBase64: string | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  await addHeader(doc, logoBase64, 'SCHEDA SINTETICA DI CONFRONTABILITÀ', 'Riepilogo offerta ai sensi della regolazione ARERA', company);

  let y = 76;
  const left = 14;

  const commodity = data.commodityType || 'luce';
  const label = commodity === 'dual' ? 'Energia Elettrica e Gas Naturale' : commodity === 'gas' ? 'Gas Naturale' : 'Energia Elettrica';

  const sim = data.simulation;
  const fmtV = (v?: number, d = 4) => v != null ? v.toFixed(d) : '________';

  const infoRows = [
    ['Denominazione venditore', company],
    ['Codice ARERA', data.areaCode || '________'],
    ['Denominazione offerta', '________'],
    ['Tipologia fornitura', label],
    ['Segmento clienti', '[ ] Domestico  [ ] Business'],
    ['Tipologia prezzo', '[X] Variabile (PUN/PSV + spread)'],
    ['Durata offerta', '12 mesi'],
    ['Prezzo energia (luce)', sim?.punPerKwh != null && sim?.spreadPerKwh != null ? `${(sim.punPerKwh + sim.spreadPerKwh).toFixed(4)} €/kWh` : '________ €/kWh'],
    ['Spread reseller (luce)', `${fmtV(sim?.spreadPerKwh)} €/kWh`],
    ['CCV mensile (luce)', `${fmtV(sim?.ccvMonthly, 2)} €/mese`],
    ...(commodity === 'gas' || commodity === 'dual' ? [
      ['Prezzo energia (gas)', sim?.psvPerSmc != null && sim?.spreadGasPerSmc != null ? `${(sim.psvPerSmc + sim.spreadGasPerSmc).toFixed(4)} €/Smc` : '________ €/Smc'],
      ['Spread reseller (gas)', `${fmtV(sim?.spreadGasPerSmc)} €/Smc`],
      ['CCV mensile (gas)', `${fmtV(sim?.ccvGasMonthly, 2)} €/mese`],
    ] : []),
    ['Spesa annua stimata (ARERA)', '________ €/anno'],
    ['Deposito cauzionale', '[ ] Sì  [ ] No – Importo: ________'],
    ['Penali per recesso anticipato', 'Nessuna'],
    ['Modalità di pagamento accettate', 'RID/SDD, Bollettino, Bonifico'],
    ['Canale di vendita', '[ ] Porta a porta  [ ] Online  [ ] Telefonico  [ ] Agenzia'],
  ];

  (doc as any).autoTable({
    startY: y,
    head: [['Caratteristica', 'Dettaglio']],
    body: infoRows,
    theme: 'striped',
    headStyles: { fillColor: [232, 121, 24], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
    margin: { left },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  const note = 'Nota: La spesa annua stimata è calcolata secondo le metodologie ARERA per un cliente tipo con consumi medi. I valori effettivi possono variare in base ai consumi reali, alla zona geografica e alla tipologia di utenza. Per maggiori informazioni consultare il Portale Offerte ARERA (ilportaleofferte.it).';
  const noteLines = doc.splitTextToSize(note, 180);
  doc.text(noteLines, left, y);
  doc.setTextColor(0);

  addFooter(doc, company);
  return doc;
};

export const useContractPackage = () => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePackage = useCallback(async (data: ContractData) => {
    setGenerating(true);
    try {
      // Load logo
      const logoBase64 = data.logoUrl ? await loadImageAsBase64(data.logoUrl) : null;

      // Generate all documents
      const [pda, cte, condizioni, scheda] = await Promise.all([
        generatePDA(data, logoBase64),
        generateCTE(data, logoBase64),
        generateCondizioni(data, logoBase64),
        generateSchedaSintetica(data, logoBase64),
      ]);

      // Create ZIP
      const zip = new JSZip();
      zip.file('PDA_Proposta_di_Adesione.pdf', pda.output('blob'));
      zip.file('CTE_Condizioni_Tecnico_Economiche.pdf', cte.output('blob'));
      zip.file('Condizioni_Generali_Fornitura.pdf', condizioni.output('blob'));
      zip.file('Scheda_Sintetica_Confrontabilita.pdf', scheda.output('blob'));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const safeName = (data.companyName || data.projectName).replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(zipBlob, `Plico_Contrattuale_${safeName}.zip`);

      toast({
        title: 'Plico contrattuale generato',
        description: '4 documenti PDF scaricati in un archivio ZIP.',
      });
    } catch (err: any) {
      toast({
        title: 'Errore generazione plico',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  return { generatePackage, generating };
};
