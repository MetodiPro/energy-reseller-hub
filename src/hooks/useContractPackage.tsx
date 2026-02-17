import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  // Consumi medi
  avgMonthlyConsumption?: number;
  avgMonthlyConsumptionGas?: number;
}

export interface SampleClientData {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  partitaIva: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  telefono: string;
  email: string;
  pec: string;
  pod: string;
  pdr: string;
  indirizzoFornitura: string;
  tipologiaUso: string;
  potenzaKw: string;
  consumoMensile: number;
  consumoMensileGas: number;
  periodo: string;
}

export const defaultSampleClient: SampleClientData = {
  nome: 'Mario',
  cognome: 'Rossi',
  codiceFiscale: 'RSSMRA80A01H501Z',
  partitaIva: '',
  indirizzo: 'Via Roma 1',
  cap: '00100',
  citta: 'Roma',
  provincia: 'RM',
  telefono: '333 1234567',
  email: 'mario.rossi@email.it',
  pec: '',
  pod: 'IT001E12345678',
  pdr: '12345678901234',
  indirizzoFornitura: 'Via Roma 1, 00100 Roma (RM)',
  tipologiaUso: 'Domestico residente',
  potenzaKw: '3',
  consumoMensile: 200,
  consumoMensileGas: 80,
  periodo: '01/01/2026 – 31/01/2026',
};

export interface ContractData {
  projectName: string;
  logoUrl: string | null;
  commodityType: string | null;
  companyName?: string;
  areaCode?: string;
  wholesalerName?: string;
  simulation?: ContractSimulationData;
  client?: SampleClientData;
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

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', 14, 10, 30, 30);
    } catch { /* skip */ }
  }

  const xStart = logoBase64 ? 50 : 14;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, xStart, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Reseller Energia – Mercato Libero Italiano', xStart, 29);
  doc.setTextColor(0);

  doc.setFillColor(232, 121, 24);
  doc.rect(0, 46, pageWidth, 12, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text(title, 14, 54);
  doc.setTextColor(0);

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
  const cl = data.client || defaultSampleClient;
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
    `Cognome/Ragione Sociale: ${cl.cognome}`,
    `Nome/Forma Giuridica: ${cl.nome}`,
    `Codice Fiscale: ${cl.codiceFiscale}`,
    `Partita IVA: ${cl.partitaIva || '—'}`,
    `Indirizzo di residenza/sede: ${cl.indirizzo}`,
    `CAP: ${cl.cap}  Città: ${cl.citta}  Prov: ${cl.provincia}`,
    `Telefono: ${cl.telefono}  Email: ${cl.email}`,
    `PEC: ${cl.pec || '—'}`,
  ];
  fields.forEach(f => { doc.text(f, left, y); y += lh; });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DATI PUNTO DI FORNITURA', left, y); y += lh;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const commodity = data.commodityType || 'luce';
  const supplyFields = [
    `Tipo fornitura: ${commodity === 'dual' ? 'Energia Elettrica + Gas' : commodity === 'gas' ? 'Gas Naturale' : 'Energia Elettrica'}`,
    commodity !== 'gas' ? `Codice POD: ${cl.pod}` : '',
    commodity !== 'luce' ? `Codice PDR: ${cl.pdr}` : '',
    `Indirizzo di fornitura: ${cl.indirizzoFornitura}`,
    `Uso: ${cl.tipologiaUso}`,
    commodity !== 'gas' ? `Potenza impegnata (kW): ${cl.potenzaKw}` : '',
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
  const fmtVal = (v?: number) => v != null ? `${v}` : '________';
  
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

  autoTable(doc, {
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

    autoTable(doc, {
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

  autoTable(doc, {
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

// --- Fattura Tipo Bolletta 2.0 ---
const generateBolletta2 = async (data: ContractData, logoBase64: string | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  const pageWidth = doc.internal.pageSize.getWidth();
  const sim = data.simulation;
  const cl = data.client || defaultSampleClient;
  const left = 14;
  const consumption = cl.consumoMensile || sim?.avgMonthlyConsumption || 200;
  const commodity = data.commodityType || 'luce';

  // Helper calculations for electricity
  const punSpread = (sim?.punPerKwh ?? 0.12) + (sim?.spreadPerKwh ?? 0.015);
  const dispacc = sim?.dispacciamentoPerKwh ?? 0.01;
  const traspEnKwh = sim?.trasportoQuotaEnergiaKwh ?? 0.008;
  const traspFissaMese = (sim?.trasportoQuotaFissaAnno ?? 23) / 12;
  const potenzaKw = parseFloat(cl.potenzaKw) || sim?.potenzaImpegnataKw || 3;
  const traspPotMese = ((sim?.trasportoQuotaPotenzaKwAnno ?? 22) * potenzaKw) / 12;
  const asosKwh = sim?.oneriAsosKwh ?? 0.025;
  const arimKwh = sim?.oneriArimKwh ?? 0.007;
  const acciseKwh = sim?.acciseKwh ?? 0.0227;
  const ivaPerc = (sim?.ivaPercent ?? 10) / 100;
  const ccv = sim?.ccvMonthly ?? 8.5;
  const gestPod = sim?.gestionePodPerPod ?? 2.5;

  const spesaMateria = punSpread * consumption + dispacc * consumption + ccv + gestPod;
  const spesaTrasporto = traspFissaMese + traspPotMese + traspEnKwh * consumption;
  const spesaOneri = (asosKwh + arimKwh) * consumption;
  const imponibile = spesaMateria + spesaTrasporto + spesaOneri;
  const acciseTot = acciseKwh * consumption;
  const iva = (imponibile + acciseTot) * ivaPerc;
  const totale = imponibile + acciseTot + iva;

  // Header
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'JPEG', 14, 8, 28, 28); } catch { /* skip */ }
  }
  const xH = logoBase64 ? 48 : 14;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company, xH, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Mercato Libero – Codice Operatore ARERA: ' + (data.areaCode || '________'), xH, 27);
  doc.setTextColor(0);

  // Title bar
  doc.setFillColor(232, 121, 24);
  doc.rect(0, 40, pageWidth, 10, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text('BOLLETTA 2.0 – FATTURA TIPO ENERGIA ELETTRICA', 14, 47);
  doc.setTextColor(0);

  let y = 58;
  doc.setFontSize(8);

  // Customer data box
  doc.setDrawColor(200);
  doc.rect(left, y, pageWidth - 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('DATI CLIENTE', left + 2, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Intestatario: ${cl.nome} ${cl.cognome}`, left + 2, y + 10);
  doc.text(`Codice Fiscale: ${cl.codiceFiscale}`, left + 2, y + 15);
  doc.text(`Codice POD: ${cl.pod}`, left + 100, y + 10);
  doc.text(`Tipologia: ${cl.tipologiaUso} – ${potenzaKw} kW`, left + 100, y + 15);
  doc.text(`Periodo: ${cl.periodo}  |  Consumo: ${consumption} kWh`, left + 2, y + 22);
  y += 34;

  // SEZIONE 1: Sintesi importi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SINTESI DEGLI IMPORTI FATTURATI', left, y); y += 6;

  const summaryRows = [
    ['Spesa per la materia energia', spesaMateria.toFixed(2) + ' €'],
    ['Spesa per il trasporto e gestione del contatore', spesaTrasporto.toFixed(2) + ' €'],
    ['Spesa per oneri di sistema', spesaOneri.toFixed(2) + ' €'],
    ['Imposte (Accise + IVA)', (acciseTot + iva).toFixed(2) + ' €'],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 130 }, 1: { halign: 'right' } },
    margin: { left },
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // Total
  doc.setFillColor(245, 245, 245);
  doc.rect(left, y, pageWidth - 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTALE FATTURA', left + 2, y + 6);
  doc.text(totale.toFixed(2) + ' €', pageWidth - 14, y + 6, { align: 'right' });
  y += 14;

  // SEZIONE 2: Dettaglio Spesa Materia
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DETTAGLIO: Spesa per la materia energia', left, y); y += 5;

  const materiaRows = [
    ['Prezzo energia (PUN + spread)', `${consumption} kWh × ${punSpread.toFixed(4)} €/kWh`, (punSpread * consumption).toFixed(2)],
    ['Dispacciamento', `${consumption} kWh × ${dispacc.toFixed(4)} €/kWh`, (dispacc * consumption).toFixed(2)],
    ['CCV (Commercializzazione)', 'Quota fissa mensile', ccv.toFixed(2)],
    ['Gestione POD', 'Quota fissa mensile', gestPod.toFixed(2)],
    ['Subtotale materia', '', spesaMateria.toFixed(2)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Calcolo', 'Importo (€)']],
    body: materiaRows,
    theme: 'striped',
    headStyles: { fillColor: [232, 121, 24], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // SEZIONE 3: Dettaglio Trasporto
  doc.setFont('helvetica', 'bold');
  doc.text('DETTAGLIO: Spesa per trasporto e gestione contatore', left, y); y += 5;

  const traspRows = [
    ['Quota fissa', `${(sim?.trasportoQuotaFissaAnno ?? 23).toFixed(2)} €/anno ÷ 12`, traspFissaMese.toFixed(2)],
    ['Quota potenza', `${potenzaKw.toFixed(1)} kW × ${(sim?.trasportoQuotaPotenzaKwAnno ?? 22).toFixed(2)} €/kW/anno ÷ 12`, traspPotMese.toFixed(2)],
    ['Quota energia', `${consumption} kWh × ${traspEnKwh.toFixed(4)} €/kWh`, (traspEnKwh * consumption).toFixed(2)],
    ['Subtotale trasporto', '', spesaTrasporto.toFixed(2)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Calcolo', 'Importo (€)']],
    body: traspRows,
    theme: 'striped',
    headStyles: { fillColor: [232, 121, 24], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // SEZIONE 4: Oneri + Imposte
  doc.setFont('helvetica', 'bold');
  doc.text('DETTAGLIO: Oneri di sistema e Imposte', left, y); y += 5;

  const oneriRows = [
    ['ASOS', `${consumption} kWh × ${asosKwh.toFixed(4)} €/kWh`, (asosKwh * consumption).toFixed(2)],
    ['ARIM', `${consumption} kWh × ${arimKwh.toFixed(4)} €/kWh`, (arimKwh * consumption).toFixed(2)],
    ['Subtotale oneri', '', spesaOneri.toFixed(2)],
    ['Accise (imposta erariale)', `${consumption} kWh × ${acciseKwh.toFixed(4)} €/kWh`, acciseTot.toFixed(2)],
    ['IVA ' + ((sim?.ivaPercent ?? 10)) + '%', `su ${(imponibile + acciseTot).toFixed(2)} €`, iva.toFixed(2)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Calcolo', 'Importo (€)']],
    body: oneriRows,
    theme: 'striped',
    headStyles: { fillColor: [232, 121, 24], fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120);
  const noteText = 'Documento fac-simile generato a scopo illustrativo. Formato conforme alla struttura Bolletta 2.0 ARERA. I valori sono basati sulla simulazione finanziaria del progetto per un cliente tipo domestico residente.';
  doc.text(doc.splitTextToSize(noteText, 180), left, y);
  doc.setTextColor(0);

  addFooter(doc, company);
  return doc;
};

// --- Scontrino dell'Energia ---
const generateScontrinoEnergia = async (data: ContractData, logoBase64: string | null): Promise<jsPDF> => {
  const doc = new jsPDF({ format: [80, 200] });
  const pageWidth = doc.internal.pageSize.getWidth();
  const sim = data.simulation;
  const cl = data.client || defaultSampleClient;
  const company = data.companyName || data.projectName;
  const consumption = cl.consumoMensile || sim?.avgMonthlyConsumption || 200;
  const left = 4;
  const center = pageWidth / 2;

  const punSpread = (sim?.punPerKwh ?? 0.12) + (sim?.spreadPerKwh ?? 0.015);
  const dispacc = sim?.dispacciamentoPerKwh ?? 0.01;
  const traspEnKwh = sim?.trasportoQuotaEnergiaKwh ?? 0.008;
  const traspFissaMese = (sim?.trasportoQuotaFissaAnno ?? 23) / 12;
  const potenzaKw = parseFloat(cl.potenzaKw) || sim?.potenzaImpegnataKw || 3;
  const traspPotMese = ((sim?.trasportoQuotaPotenzaKwAnno ?? 22) * potenzaKw) / 12;
  const asosKwh = sim?.oneriAsosKwh ?? 0.025;
  const arimKwh = sim?.oneriArimKwh ?? 0.007;
  const acciseKwh = sim?.acciseKwh ?? 0.0227;
  const ivaPerc = (sim?.ivaPercent ?? 10) / 100;
  const ccv = sim?.ccvMonthly ?? 8.5;
  const gestPod = sim?.gestionePodPerPod ?? 2.5;

  const spesaMateria = punSpread * consumption + dispacc * consumption + ccv + gestPod;
  const spesaTrasporto = traspFissaMese + traspPotMese + traspEnKwh * consumption;
  const spesaOneri = (asosKwh + arimKwh) * consumption;
  const acciseTot = acciseKwh * consumption;
  const imponibile = spesaMateria + spesaTrasporto + spesaOneri;
  const iva = (imponibile + acciseTot) * ivaPerc;
  const totale = imponibile + acciseTot + iva;

  let y = 6;

  if (logoBase64) {
    try { doc.addImage(logoBase64, 'JPEG', center - 8, y, 16, 16); y += 18; } catch { /* skip */ }
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(company, center, y, { align: 'center' }); y += 4;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Cod. ARERA: ' + (data.areaCode || '________'), center, y, { align: 'center' }); y += 5;
  doc.setTextColor(0);

  const drawSep = () => {
    doc.setDrawColor(180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(left, y, pageWidth - left, y);
    doc.setLineDashPattern([], 0);
    y += 3;
  };
  drawSep();

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SCONTRINO DELL\'ENERGIA', center, y, { align: 'center' }); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(`${cl.nome} ${cl.cognome} – ${cl.tipologiaUso}`, center, y, { align: 'center' }); y += 3;
  doc.text(`Periodo: ${cl.periodo}`, center, y, { align: 'center' }); y += 3;
  doc.text('Consumo: ' + consumption + ' kWh', center, y, { align: 'center' }); y += 4;

  drawSep();

  const addLine = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(6);
    doc.text(label, left, y);
    doc.text(value, pageWidth - left, y, { align: 'right' });
    y += 3.5;
  };

  addLine('Materia energia', spesaMateria.toFixed(2) + ' €');
  addLine('  di cui PUN+spread', (punSpread * consumption).toFixed(2));
  addLine('  di cui dispacciamento', (dispacc * consumption).toFixed(2));
  addLine('  di cui CCV', ccv.toFixed(2));
  addLine('  di cui gestione POD', gestPod.toFixed(2));
  y += 1;
  addLine('Trasporto e contatore', spesaTrasporto.toFixed(2) + ' €');
  addLine('Oneri di sistema', spesaOneri.toFixed(2) + ' €');
  addLine('Accise', acciseTot.toFixed(2) + ' €');
  addLine('IVA ' + (sim?.ivaPercent ?? 10) + '%', iva.toFixed(2) + ' €');

  y += 1;
  drawSep();

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTALE', left, y);
  doc.text(totale.toFixed(2) + ' €', pageWidth - left, y, { align: 'right' });
  y += 5;
  drawSep();

  const costoKwh = totale / consumption;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Costo medio: ' + costoKwh.toFixed(4) + ' €/kWh', center, y, { align: 'center' }); y += 3;
  doc.text('Costo giornaliero: ~' + (totale / 30).toFixed(2) + ' €/giorno', center, y, { align: 'center' }); y += 5;

  doc.setFontSize(5);
  doc.setTextColor(140);
  doc.text('Documento illustrativo – Bolletta 2.0 ARERA', center, y, { align: 'center' }); y += 3;
  doc.text('Valori da simulazione finanziaria progetto', center, y, { align: 'center' });
  doc.setTextColor(0);

  return doc;
};

export const useContractPackage = () => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePackage = useCallback(async (data: ContractData) => {
    setGenerating(true);
    try {
      const logoBase64 = data.logoUrl ? await loadImageAsBase64(data.logoUrl) : null;

      const [pda, cte, condizioni, scheda, bolletta, scontrino] = await Promise.all([
        generatePDA(data, logoBase64),
        generateCTE(data, logoBase64),
        generateCondizioni(data, logoBase64),
        generateSchedaSintetica(data, logoBase64),
        generateBolletta2(data, logoBase64),
        generateScontrinoEnergia(data, logoBase64),
      ]);

      const zip = new JSZip();
      zip.file('PDA_Proposta_di_Adesione.pdf', pda.output('blob'));
      zip.file('CTE_Condizioni_Tecnico_Economiche.pdf', cte.output('blob'));
      zip.file('Condizioni_Generali_Fornitura.pdf', condizioni.output('blob'));
      zip.file('Scheda_Sintetica_Confrontabilita.pdf', scheda.output('blob'));
      zip.file('Fattura_Tipo_Bolletta_2_0.pdf', bolletta.output('blob'));
      zip.file('Scontrino_Energia.pdf', scontrino.output('blob'));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const safeName = (data.companyName || data.projectName).replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(zipBlob, `Plico_Contrattuale_${safeName}.zip`);

      toast({
        title: 'Plico contrattuale generato',
        description: '6 documenti PDF scaricati in un archivio ZIP.',
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
