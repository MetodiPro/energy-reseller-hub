import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

export interface ContractSimulationData {
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
  avgMonthlyConsumption?: number;
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
  indirizzoFornitura: string;
  tipologiaUso: string;
  potenzaKw: string;
  consumoAnnuo: number;
  consumoMensile: number;
  periodo: string;
  tensione: string;
  tipoMisuratore: string;
  distributoreLocale: string;
  exFornitore: string;
  ibanCliente: string;
}

export const defaultSampleClient: SampleClientData = {
  nome: 'Mario',
  cognome: 'Rossi',
  codiceFiscale: 'RSSMRA80A01H501Z',
  partitaIva: '12345678901',
  indirizzo: 'Via Roma 1',
  cap: '00100',
  citta: 'Roma',
  provincia: 'RM',
  telefono: '06 1234567',
  email: 'mario.rossi@email.it',
  pec: 'mario.rossi@pec.it',
  pod: 'IT001E12345678',
  indirizzoFornitura: 'Via Roma 1 - 00100 Roma',
  tipologiaUso: 'non domestico',
  potenzaKw: '6',
  consumoAnnuo: 20000,
  consumoMensile: 200,
  periodo: '01/01/2026 – 31/01/2026',
  tensione: '220 V',
  tipoMisuratore: 'orario',
  distributoreLocale: 'E-Distribuzione S.p.A.',
  exFornitore: '—',
  ibanCliente: 'IT00X0000000000000000000000',
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
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyPec?: string;
  companyWebsite?: string;
  companyCf?: string;
  companyPiva?: string;
}

interface LoadedImage {
  base64: string;
  width: number;
  height: number;
}

const loadImageWithDimensions = async (url: string): Promise<LoadedImage | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject();
      reader.readAsDataURL(blob);
    });
    const dims: { width: number; height: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = base64;
    });
    return { base64, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
};

const PRIMARY_COLOR: [number, number, number] = [30, 64, 124]; // Deep blue
const ACCENT_COLOR: [number, number, number] = [232, 121, 24]; // Orange
const LIGHT_BG: [number, number, number] = [245, 247, 250];
const today = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};
const codiceContratto = () => Math.floor(1000000 + Math.random() * 9000000).toString();

// ─── Shared layout helpers ───────────────────────────────────────────────────

const addCompanyHeader = (doc: jsPDF, logoImg: LoadedImage | null, company: string, data: ContractData) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let xStart = 14;
  if (logoImg) {
    try {
      // Maintain aspect ratio: fit within max 28w × 24h
      const maxW = 28;
      const maxH = 24;
      const ratio = Math.min(maxW / logoImg.width, maxH / logoImg.height);
      const drawW = logoImg.width * ratio;
      const drawH = logoImg.height * ratio;
      const yOffset = 8 + (maxH - drawH) / 2; // vertically center
      doc.addImage(logoImg.base64, 'PNG', 14, yOffset, drawW, drawH);
      xStart = 14 + drawW + 4;
    } catch { /* skip */ }
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(company, xStart, 18);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const details = [
    data.companyAddress || '',
    [data.companyPhone ? `Tel. ${data.companyPhone}` : '', data.companyEmail || ''].filter(Boolean).join(' – '),
    data.companyWebsite || '',
  ].filter(Boolean);
  details.forEach((line, i) => doc.text(line, xStart, 23 + i * 3.5));
  doc.setTextColor(0);

  // Separator line
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.8);
  doc.line(14, 36, pageWidth - 14, 36);
  doc.setLineWidth(0.2);
};

const addDocTitle = (doc: jsPDF, title: string, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, y, pageWidth, 10, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text(title, 14, y + 7);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  return y + 16;
};

const addPageFooter = (doc: jsPDF, company: string, data: ContractData) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(0.4);
    doc.line(14, ph - 16, pw - 14, ph - 16);
    doc.setLineWidth(0.2);
    doc.setFontSize(6);
    doc.setTextColor(100);
    const footerLine = [
      company,
      data.companyCf ? `C.F./P.IVA ${data.companyCf}` : '',
      data.companyAddress || '',
      data.companyPhone || '',
    ].filter(Boolean).join(' – ');
    doc.text(footerLine, 14, ph - 12);
    doc.text(`Pagina ${i} di ${pageCount}`, pw - 14, ph - 12, { align: 'right' });
    doc.setTextColor(0);
  }
};

const sectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(title, 14, y);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  return y + 6;
};

const bodyText = (doc: jsPDF, text: string, y: number, maxWidth = 182): number => {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, 14, y);
  return y + lines.length * 3.8 + 2;
};

const checkPageBreak = (doc: jsPDF, y: number, needed = 40): number => {
  if (y > doc.internal.pageSize.getHeight() - needed) {
    doc.addPage();
    return 20;
  }
  return y;
};

// ─── 1. PDA – Proposta di Contratto ──────────────────────────────────────────

const generatePDA = async (data: ContractData, logoImg: LoadedImage | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  const cl = data.client || defaultSampleClient;
  const codice = codiceContratto();

  addCompanyHeader(doc, logoImg, company, data);

  let y = addDocTitle(doc, 'Proposta di Contratto', 40);

  // Codice
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Codice: ${codice}`, 14, y);
  doc.setFont('helvetica', 'normal');
  y += 6;

  // Intro text
  y = bodyText(doc, `Il Cliente, come di seguito identificato, propone a ${company} (di seguito "Fornitore") di concludere un contratto per la somministrazione di energia elettrica (di seguito "Contratto" o "Proposta") secondo i termini e le condizioni indicate nella presente proposta (di seguito "Proposta di Contratto"), nell'allegato "Condizioni Generali di Fornitura" e nell'allegato "Condizioni Particolari di Fornitura" che, unitamente agli altri allegati, costituiscono il Contratto. La presente Proposta di Contratto deve intendersi vincolante ed irrevocabile ai sensi dell'art. 1329 c.c. (proposta irrevocabile) sino alla scadenza del termine di 45 (quarantacinque) giorni dalla sottoscrizione della stessa.`, y);
  y += 2;

  // 1. Il Cliente
  y = sectionTitle(doc, '1  Il Cliente', y);

  autoTable(doc, {
    startY: y,
    body: [
      ['Ragione Sociale / Cognome e Nome', `${cl.cognome} ${cl.nome}`],
      ['Indirizzo Sede Legale', `${cl.indirizzo} - ${cl.cap} ${cl.citta} (${cl.provincia})`],
      ['Partita IVA', cl.partitaIva || '—'],
      ['Codice Fiscale', cl.codiceFiscale],
      ['Email PEC', cl.pec || '—'],
      ['Rappresentante con poteri di firma', `${cl.nome} ${cl.cognome}`],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65, textColor: PRIMARY_COLOR } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // 2. Punti di prelievo
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, '2  Punti di prelievo dell\'energia elettrica e consumi', y);
  y = bodyText(doc, `Il Cliente chiede a ${company} di approvvigionarsi di un quantitativo di energia elettrica pari a quanto indicato nell'allegato "Punti di Prelievo" e di somministrarla ai punti ivi indicati. In ragione di quanto precede, qualora in casi eccezionali il Cliente preveda una significativa variazione dei propri consumi, è tenuto a comunicarlo tempestivamente a ${company}.`, y);

  // 3. Prezzo
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, '3  Prezzo', y);
  y = bodyText(doc, `L'energia elettrica è somministrata al Cliente presso tutti i punti di prelievo di cui al paragrafo precedente, al prezzo composto e adeguato secondo le modalità descritte nella sezione "Condizioni Economiche di Fornitura" codice ${codice} dell'allegato "Condizioni Particolari di Fornitura".`, y);

  // 4. Comunicazioni
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, '4  Comunicazioni', y);
  y = bodyText(doc, `Salvo diverso accordo tra le Parti, ogni comunicazione inerente al contratto si intenderà validamente effettuata se inviata per iscritto agli indirizzi di seguito indicati, anche a mezzo e-mail:`, y);
  y = bodyText(doc, `${company}: ${data.companyAddress || '____________________'}, e-mail: ${data.companyPec || data.companyEmail || '____________________'}`, y);
  y = bodyText(doc, `Il Cliente: indirizzo indicato nel paragrafo "Il Cliente", e-mail indicata nell'allegato "Punti di Prelievo".`, y);

  // Allegati
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, 'Allegati', y);

  autoTable(doc, {
    startY: y,
    body: [
      ['Condizioni Particolari di Fornitura', 'Scheda sintetica ai sensi della delibera 426/2020', 'Carta di Identità del sottoscrittore'],
      ['Condizioni Generali di Fornitura', 'Informativa privacy', 'Fatture dei Punti di Prelievo'],
      ['Punti di Prelievo', '', ''],
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: LIGHT_BG, textColor: PRIMARY_COLOR },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Privacy consents
  y = checkPageBreak(doc, y, 50);
  y = bodyText(doc, `Il Cliente, letta l'informativa di cui all'allegato "Informativa privacy", espressamente e liberamente:`, y);
  y += 1;
  const consents = [
    'CONSENTE / NON CONSENTE il trattamento dei propri dati personali a mezzo posta cartacea ovvero mediante chiamate con operatore, per finalità di marketing e invio comunicazioni commerciali.',
    'CONSENTE / NON CONSENTE il trattamento dei propri dati personali con l\'uso di sistemi automatizzati ovvero mediante posta elettronica e/o SMS, per finalità di marketing.',
    'CONSENTE / NON CONSENTE il trattamento dei propri dati personali per le finalità di profilazione.',
  ];
  consents.forEach(c => { y = bodyText(doc, `[ ] ${c}`, y); });
  y += 4;

  // Signature section
  y = checkPageBreak(doc, y, 50);
  y = bodyText(doc, `Con la firma qui apposta il Cliente dichiara di aver letto attentamente il contenuto delle informative di cui agli allegati "Informativa privacy" ai sensi degli artt. 13 e 14 del Regolamento UE 679/2016 e di averne ricevuto copia.`, y);
  y += 4;
  doc.setFontSize(8);
  doc.text('Firma del Cliente ......................................................', 14, y);
  doc.text('Luogo e data ..............................', 120, y);
  y += 10;

  y = bodyText(doc, `Con la firma qui apposta il Cliente accetta la Proposta e gli Allegati, conferisce i mandati ivi indicati, conferma di aver preso visione della nota informativa, in occasione della proposta dell'offerta contrattuale e prima della conclusione del Contratto.`, y);
  y += 4;
  doc.text('Firma del Cliente ......................................................', 14, y);
  doc.text('Luogo e data ..............................', 120, y);
  y += 10;

  // Art. 1341-1342
  y = checkPageBreak(doc, y, 60);
  y = bodyText(doc, `Ai sensi e per gli effetti degli artt. 1341 cod. civ. (Condizioni generali di contratto) e 1342 cod. civ. (Contratto concluso mediante moduli o formulari), il Cliente dichiara di approvare specificatamente le seguenti clausole delle Condizioni Generali di Fornitura: 2 (cessione della fornitura); 3 (mandati); 5 (inizio della fornitura); 7 (durata del contratto e tacito rinnovo); 8 (recesso); 9 (penali e risarcimento del danno); 11 (rinnovo del contratto); 13 (fatturazione, rettifiche, limitazioni); 14 (sospensione della fornitura); 18 (verifica del contatore); 19 (garanzie e deposito cauzionale); 20 (clausola risolutiva espressa); 21 (modifica unilaterale); 22 (limitazioni di responsabilità); 24 (cessione del credito); 27 (foro competente).`, y);
  y += 4;
  doc.text('Firma del Cliente ......................................................', 14, y);
  doc.text('Timbro ..............................', 140, y);

  addPageFooter(doc, company, data);
  return doc;
};

// ─── 2. Condizioni Particolari di Fornitura ──────────────────────────────────

const generateCondizioniParticolari = async (data: ContractData, logoImg: LoadedImage | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  const sim = data.simulation;
  const cl = data.client || defaultSampleClient;
  const codice = codiceContratto();
  const fmtN = (v?: number, d = 4) => v != null ? v.toFixed(d) : '0,0000';
  const fmtN2 = (v?: number) => fmtN(v, 2);

  addCompanyHeader(doc, logoImg, company, data);

  let y = addDocTitle(doc, 'Condizioni Particolari di Fornitura di energia elettrica', 40);

  // subtitle
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Allegato alla Proposta di Contratto – Mercato libero per clienti finali', 14, y);
  y += 8;

  // Section 1: Condizioni Speciali
  y = sectionTitle(doc, '1  Condizioni Speciali di Fornitura', y);
  y = bodyText(doc, 'In deroga a quanto previsto dalle Condizioni Generali di Fornitura, i seguenti articoli vengono modificati come segue:', y);
  y = bodyText(doc, '- art 11.3 ("Rinnovo del Contratto" - adeguamento automatico del prezzo) non viene applicato.', y);
  y += 4;

  // Section 2: Condizioni Economiche
  y = sectionTitle(doc, `2  Condizioni Economiche di Fornitura – codice ${codice}`, y);
  y = bodyText(doc, `Tenuto conto dei consumi dichiarati dal Cliente, il prezzo della somministrazione di energia elettrica, al netto delle imposte e delle tasse che saranno applicate e per tutti i punti di prelievo indicati nell'Allegato "Punti di Prelievo", sarà composto come segue:`, y);

  const items = [
    `1. corrispettivo per il servizio di trasporto, pari a quanto pagato da ${company} al distributore locale come stabilito dalla delibera ARG/elt 199/11 dell'ARERA;`,
    `2. corrispettivi per i servizi di dispacciamento e ulteriori oneri previsti dalla delibera ARG/elt 111/06 dell'ARERA, pari a ${fmtN(sim?.dispacciamentoPerKwh)} €/kWh;`,
    `3. oneri ASOS (${fmtN(sim?.oneriAsosKwh)} €/kWh) e ARIM (${fmtN(sim?.oneriArimKwh)} €/kWh) relativi al sostegno alle energie da fonti rinnovabili e alla cogenerazione, pari all'importo determinato dall'ARERA;`,
    `4. corrispettivo a copertura dei costi di commercializzazione (CCV) pari a ${fmtN2(sim?.ccvMonthly)} €/mese per punto di prelievo;`,
    `5. corrispettivo per la vendita di energia elettrica applicato con aggiornamento mensile, in base al tipo di misuratore (orario/per fasce/integratore), definito come: prezzo PUN (Prezzo Unico Nazionale) valorizzato ora per ora più lo spread di ${fmtN(sim?.spreadPerKwh)} €/kWh;`,
    `6. gestione POD: ${fmtN2(sim?.gestionePodPerPod)} €/POD/mese;`,
    `7. quota fissa trasporto: ${fmtN2(sim?.trasportoQuotaFissaAnno)} €/anno; quota potenza: ${fmtN2(sim?.trasportoQuotaPotenzaKwAnno)} €/kW/anno; quota energia: ${fmtN(sim?.trasportoQuotaEnergiaKwh)} €/kWh;`,
    `8. accise: ${fmtN(sim?.acciseKwh)} €/kWh, secondo il D.Lgs. 26/10/1995 n. 504 (T.U.A.);`,
    `9. IVA: ${fmtN2(sim?.ivaPercent)}%, secondo il D.P.R. 26/10/1972 n. 633;`,
    `10. in ogni momento, durante il periodo di fornitura, il Cliente potrà richiedere la rinegoziazione del proprio Contratto per il passaggio ad una nuova offerta ${company} fra quelle disponibili.`,
  ];
  items.forEach(item => {
    y = checkPageBreak(doc, y, 20);
    y = bodyText(doc, item, y);
  });
  y += 2;

  y = bodyText(doc, `In sintesi, le condizioni economiche di fornitura prevedono un prezzo variabile (PUN + spread di ${fmtN(sim?.spreadPerKwh)} €/kWh).`, y);
  y += 4;

  // Section 3: Informazioni per delibera ARG/com 104/10
  y = checkPageBreak(doc, y, 80);
  y = sectionTitle(doc, '3  Informazioni corrispettivi – Delibera ARG/com 104/10', y);

  y = bodyText(doc, `Corrispettivi previsti dall'offerta codice ${codice} alla data del ${today()}.`, y);
  y += 2;

  // Cliente tipo
  y = sectionTitle(doc, 'Cliente finale tipo', y);
  autoTable(doc, {
    startY: y,
    body: [
      ['Tipologia', cl.tipologiaUso],
      ['Consumo annuo', `${cl.consumoAnnuo.toLocaleString('it-IT')} kWh`],
      ['Potenza impegnata', `${cl.potenzaKw} kW`],
      ['Tensione', cl.tensione],
      ['Tipo misuratore', cl.tipoMisuratore],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: LIGHT_BG, textColor: PRIMARY_COLOR } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Incidenza percentuale
  y = checkPageBreak(doc, y, 60);
  const potKw = parseFloat(cl.potenzaKw) || 6;
  const consumo = cl.consumoAnnuo || 20000;
  const punSp = (sim?.punPerKwh ?? 0.12) + (sim?.spreadPerKwh ?? 0.015);
  const disp = sim?.dispacciamentoPerKwh ?? 0.01;
  const traspEn = sim?.trasportoQuotaEnergiaKwh ?? 0.008;
  const traspFix = sim?.trasportoQuotaFissaAnno ?? 23;
  const traspPot = (sim?.trasportoQuotaPotenzaKwAnno ?? 22) * potKw;
  const asos = (sim?.oneriAsosKwh ?? 0.025) * consumo;
  const arim = (sim?.oneriArimKwh ?? 0.007) * consumo;
  const ccv = (sim?.ccvMonthly ?? 8.5) * 12;
  const gestPod = (sim?.gestionePodPerPod ?? 2.5) * 12;
  const totEnergia = punSp * consumo + disp * consumo + ccv + gestPod;
  const totTrasporto = traspFix + traspPot + traspEn * consumo;
  const totOneri = asos + arim;
  const totNetto = totEnergia + totTrasporto + totOneri;

  const pctTrasp = ((totTrasporto / totNetto) * 100).toFixed(0);
  const pctDisp = ((disp * consumo / totNetto) * 100).toFixed(0);
  const pctAsos = ((asos / totNetto) * 100).toFixed(0);
  const pctArim = ((arim / totNetto) * 100).toFixed(0);
  const pctEnergia = ((punSp * consumo / totNetto) * 100).toFixed(0);
  const pctComm = (((ccv + gestPod) / totNetto) * 100).toFixed(0);

  y = sectionTitle(doc, 'Incidenza percentuale dei corrispettivi (al netto delle imposte)', y);
  autoTable(doc, {
    startY: y,
    head: [['Voce', 'Incidenza']],
    body: [
      ['Trasmissione/Distribuzione/Misura', `${pctTrasp}%`],
      ['Dispacciamento', `${pctDisp}%`],
      ['Componente ASOS', `${pctAsos}%`],
      ['Componente ARIM', `${pctArim}%`],
      ['Energia/Servizi di vendita/Perdite di rete', `${pctEnergia}%`],
      ['Commercializzazione (CCV + gestione)', `${pctComm}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 120 } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Codice di condotta commerciale
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, 'Codice di condotta commerciale', y);
  y = bodyText(doc, `${company} aderisce alle procedure di ripristino per contratti e attivazioni non richieste, ai sensi della delibera R/com 228/17 dell'ARERA. ${company} aderisce inoltre al Servizio di Conciliazione dell'ARERA (conciliazione.arera.it). La procedura di conciliazione è gratuita.`, y);

  // Signature
  y += 6;
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(8);
  doc.text(`Data: ${today()}`, 14, y);
  y += 10;
  doc.text('Firma del Cliente ......................................................', 14, y);
  doc.text('Timbro ..............................', 140, y);

  addPageFooter(doc, company, data);
  return doc;
};

// ─── 3. Condizioni Generali di Fornitura ─────────────────────────────────────

const generateCondizioni = async (data: ContractData, logoImg: LoadedImage | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;

  addCompanyHeader(doc, logoImg, company, data);
  let y = addDocTitle(doc, 'Condizioni Generali di Fornitura', 40);

  const articles = [
    {
      title: 'Art. 1 – Oggetto del contratto e richiami normativi',
      text: `1.1 Oggetto esclusivo del Contratto è la fornitura di energia elettrica da ${company} al Cliente presso i punti di prelievo di cui all'allegato "Punti di Prelievo", nonché presso i punti che venissero aggiunti successivamente. I richiami al "punto di prelievo" si intendono validi per la fornitura di energia elettrica.\n\n1.2 ${company} si riserva la facoltà di richiedere un indennizzo (Corrispettivo CMOR) qualora il Cliente eserciti il recesso senza adempiere ai propri obblighi di pagamento.\n\n1.3 L'Autorità di Regolazione per Energia Reti e Ambiente viene abbreviata in "ARERA", i cui provvedimenti sono reperibili su https://arera.it.`,
    },
    {
      title: 'Art. 2 – Conclusione del contratto',
      text: `Il contratto si intende concluso con la sottoscrizione della Proposta di Contratto e l'accettazione delle presenti Condizioni Generali. Il Cliente domestico ha diritto di ripensamento entro 14 giorni dalla sottoscrizione, ai sensi del D.Lgs. 206/2005 (Codice del Consumo).`,
    },
    {
      title: 'Art. 3 – Mandati',
      text: `Il Cliente conferisce a ${company} mandato senza rappresentanza per la stipula dei contratti di trasmissione, distribuzione e dispacciamento in prelievo di cui all'art. 4 dell'Allegato A alla deliberazione n. 111/06, nonché mandato con rappresentanza per la stipula del contratto di connessione. I mandati conferiti dal Cliente a ${company} si intendono a titolo gratuito e conferiti nell'interesse del Cliente.`,
    },
    {
      title: 'Art. 4 – Inizio e durata della fornitura',
      text: `La fornitura decorre dalla data di attivazione comunicata dal distributore locale. Il contratto ha la durata indicata nella Proposta e si rinnova tacitamente alla scadenza, salvo disdetta con almeno 30 giorni di preavviso. In caso di cambio fornitore, l'attivazione avverrà il primo giorno del mese successivo o del secondo mese successivo, a seconda della data di ricezione della richiesta.`,
    },
    {
      title: 'Art. 5 – Recesso',
      text: `Il Cliente può recedere dal contratto in qualsiasi momento, senza penali per punti allacciati in bassa tensione, con comunicazione scritta. Per i clienti domestici, il recesso per cambio fornitore avviene tramite procura al venditore entrante. Per cessazione della fornitura: raccomandata A/R o PEC a ${company}.`,
    },
    {
      title: 'Art. 6 – Fatturazione e pagamenti',
      text: `La fatturazione avviene con la periodicità indicata nella Proposta, sulla base dei consumi rilevati dal distributore locale. Qualora i dati non siano disponibili, ${company} potrà fatturare in acconto. Il pagamento deve avvenire entro la scadenza indicata in fattura. Per ogni giorno di ritardo si applicano interessi moratori ai sensi del D.Lgs. 231/2002. Il tasso è pari al T.U.R. aumentato di 3,5 punti percentuali.`,
    },
    {
      title: 'Art. 7 – Sospensione della fornitura',
      text: `In caso di morosità, dopo formale costituzione in mora tramite raccomandata, ${company} potrà richiedere al distributore la sospensione della fornitura, con il preavviso previsto dalla delibera ARERA 258/2015/R/com. Il Cliente sarà tenuto al pagamento dei costi di sospensione e riattivazione determinati dal distributore.`,
    },
    {
      title: 'Art. 8 – Garanzie e deposito cauzionale',
      text: `${company} potrà richiedere un deposito cauzionale o fideiussione, secondo le modalità previste dalla regolazione ARERA. Il deposito cauzionale è produttivo di interessi al tasso individuato dall'ARERA e viene restituito con l'ultima fattura.`,
    },
    {
      title: 'Art. 9 – Reclami e qualità commerciale',
      text: `Il Cliente può presentare reclamo scritto a ${company}. La risposta motivata sarà inviata entro 30 giorni solari. ${company} si impegna al rispetto dei livelli di qualità commerciale previsti dal TIQV dell'ARERA, corrispondendo gli indennizzi automatici previsti in caso di mancato rispetto.`,
    },
    {
      title: 'Art. 10 – Conciliazione',
      text: `In caso di controversie, il Cliente può attivare la procedura di conciliazione presso il Servizio Conciliazione ARERA (conciliazione.arera.it), obbligatoria prima del ricorso giudiziario. La procedura è gratuita. ${company} si impegna a partecipare al tentativo obbligatorio di conciliazione.`,
    },
    {
      title: 'Art. 11 – Trattamento dati personali',
      text: `I dati personali del Cliente sono trattati ai sensi del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003. L'informativa completa è allegata al Contratto e disponibile sul sito di ${company}.`,
    },
    {
      title: 'Art. 12 – Foro competente',
      text: `Per le controversie derivanti dal presente contratto è competente il Foro del luogo di residenza/domicilio del Cliente consumatore. Per i clienti business, il Foro competente è quello della sede legale di ${company}.`,
    },
  ];

  doc.setFontSize(8);
  articles.forEach(a => {
    y = checkPageBreak(doc, y, 30);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text(a.title, 14, y);
    doc.setTextColor(0);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(a.text, 182);
    doc.text(lines, 14, y);
    y += lines.length * 3.8 + 5;
  });

  addPageFooter(doc, company, data);
  return doc;
};

// ─── 4. Scheda Sintetica – Delibera 426/2020 ────────────────────────────────

const generateSchedaSintetica = async (data: ContractData, logoImg: LoadedImage | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  const cl = data.client || defaultSampleClient;
  const sim = data.simulation;
  const codice = codiceContratto();
  const fmtN = (v?: number, d = 4) => v != null ? v.toFixed(d) : '—';

  addCompanyHeader(doc, logoImg, company, data);
  let y = addDocTitle(doc, 'Scheda sintetica ai sensi della delibera 426/2020', 40);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('destinata a clienti allacciati in bassa tensione', 14, y);
  y += 6;

  y = sectionTitle(doc, 'Offerta di energia elettrica', y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Codice offerta: ${codice} | Valida dal ${today()}`, 14, y);
  y += 8;

  // Venditore
  y = sectionTitle(doc, 'Venditore', y);
  const vendRows = [
    [company],
    [data.companyAddress || '____________________'],
    [data.companyPhone || '____________________'],
    [data.companyEmail || '____________________'],
    [data.companyWebsite || '____________________'],
  ];
  vendRows.forEach(r => { doc.text(r[0], 14, y); y += 4; });
  y += 4;

  // Condizioni generali
  const infoItems = [
    ['Durata del contratto', 'Fino alla data di scadenza del prezzo, a seguire tacito rinnovo annuale.'],
    ['Condizioni dell\'offerta', 'Clienti finali allacciati in bassa tensione.'],
    ['Metodi di pagamento', 'Domiciliazione bancaria (SEPA).'],
    ['Frequenza di fatturazione', 'Mensile, nel corso del mese successivo a quello di somministrazione.'],
    ['Garanzie richieste', 'Valutazione in base ai consumi e alla posizione creditizia: deposito cauzionale o fideiussione.'],
  ];
  infoItems.forEach(([label, value]) => {
    y = checkPageBreak(doc, y, 15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFontSize(8);
    doc.text(label, 14, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 4;
    doc.text(doc.splitTextToSize(value, 182), 14, y);
    y += 6;
  });

  // Condizioni economiche
  y = checkPageBreak(doc, y, 60);
  y = sectionTitle(doc, 'Condizioni economiche', y);

  autoTable(doc, {
    startY: y,
    head: [['Voce', 'Dettaglio']],
    body: [
      ['Prezzo materia prima energia', 'Prezzo variabile (PUN + spread)'],
      ['Costo per consumi', `PUN + ${fmtN(sim?.spreadPerKwh)} €/kWh`],
      ['Indice', 'PUN (Prezzo Unico Nazionale): prezzo di riferimento rilevato sulla borsa elettrica italiana'],
      ['Periodicità indice', 'Mensile'],
      ['Costo fisso anno', '0,00 €/anno'],
      ['Costo per potenza impegnata', '0,00 €/kW'],
    ],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: LIGHT_BG } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Oneri di sistema
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, 'Oneri di sistema', y);

  autoTable(doc, {
    startY: y,
    head: [['Componente', '≤3 kW', '3–6 kW', '6–10 kW', '>10 kW']],
    body: [
      ['Quota fissa (€/anno)', '39,55', '40,33', '40,33', '40,33'],
      ['di cui ASOS', '20,56', '20,96', '20,96', '20,96'],
      ['Quota energia (€/kWh)', fmtN(sim?.oneriAsosKwh), fmtN(sim?.oneriAsosKwh), fmtN(sim?.oneriAsosKwh), fmtN(sim?.oneriAsosKwh)],
      ['di cui ASOS (€/kWh)', '0,0733', '0,0733', '0,0733', '0,0733'],
      ['di cui ARIM (€/kWh)', fmtN(sim?.oneriArimKwh), fmtN(sim?.oneriArimKwh), fmtN(sim?.oneriArimKwh), fmtN(sim?.oneriArimKwh)],
    ],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: LIGHT_BG } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Trasporto e gestione contatore
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, 'Trasporto e gestione contatore', y);

  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Valore']],
    body: [
      ['Quota fissa (€/anno)', fmtN(sim?.trasportoQuotaFissaAnno, 2)],
      ['Quota energia (€/kWh)', fmtN(sim?.trasportoQuotaEnergiaKwh)],
      ['Quota potenza (€/kW/anno)', fmtN(sim?.trasportoQuotaPotenzaKwAnno, 2)],
    ],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: LIGHT_BG } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Imposte
  y = checkPageBreak(doc, y, 20);
  y = sectionTitle(doc, 'Imposte', y);
  y = bodyText(doc, `Accise stabilite in base al D.Lgs. 26/10/1995 n. 504 (T.U.A.): ${fmtN(sim?.acciseKwh)} €/kWh. IVA: ${fmtN(sim?.ivaPercent, 0)}%.`, y);
  y += 4;

  // Altre info: attivazione fornitura
  y = checkPageBreak(doc, y, 60);
  y = sectionTitle(doc, 'Attivazione della fornitura', y);
  y = bodyText(doc, `Il Cliente conferisce a ${company} mandato per la stipula dei contratti di trasmissione, distribuzione e dispacciamento. In caso di cambio fornitore: attivazione il primo giorno del mese successivo alla richiesta (se entro il giorno 10) o del secondo mese successivo (se dopo il giorno 10). In caso di voltura: non prima del 4° giorno successivo all'invio della documentazione.`, y);

  // Recesso
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, 'Modalità e oneri per il recesso', y);
  y = bodyText(doc, `Recesso senza penali per punti allacciati in bassa tensione. Recesso per cambio fornitore: procura al venditore entrante. Recesso per cessazione: comunicazione a ${company} tramite raccomandata A/R o PEC.`, y);

  // Livelli di qualità
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, 'Livelli di qualità commerciale della vendita', y);

  autoTable(doc, {
    startY: y,
    head: [['Indicatore', 'Standard', 'Indennizzo']],
    body: [
      ['Risposta motivata ai reclami scritti', '30 giorni solari', '25 €'],
      ['Rettifica di fatturazione', '60 giorni solari', '25 €'],
      ['Rettifica di doppia fatturazione', '20 giorni solari', '25 €'],
    ],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Note
  y = checkPageBreak(doc, y, 20);
  y = bodyText(doc, `Per informazioni sulla spesa personalizzata e su altre offerte: Portale Offerte Luce e Gas www.ilportaleofferte.it. Il cliente è invitato a verificare la presenza di oneri di recesso anticipato dal contratto in essere prima della sottoscrizione.`, y);

  y += 6;
  doc.setFontSize(8);
  doc.text('Firma e data: ......................................................', 14, y);

  addPageFooter(doc, company, data);
  return doc;
};

// ─── 5. Punti di Prelievo ────────────────────────────────────────────────────

const generatePDP = async (data: ContractData, logoImg: LoadedImage | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  const cl = data.client || defaultSampleClient;

  addCompanyHeader(doc, logoImg, company, data);
  let y = addDocTitle(doc, 'Punti di Prelievo – Allegato alla Proposta di Contratto', 40);

  // Punto di prelievo
  y = sectionTitle(doc, 'Punto di Prelievo n. 1', y);

  autoTable(doc, {
    startY: y,
    body: [
      ['POD', cl.pod],
      ['Indirizzo di fornitura', cl.indirizzoFornitura],
      ['Consumi annuali', `${cl.consumoAnnuo.toLocaleString('it-IT')} kWh/anno`],
      ['Tensione', cl.tensione],
      ['Potenza', `${cl.potenzaKw} kW`],
      ['Tipo misuratore', cl.tipoMisuratore],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: LIGHT_BG, textColor: PRIMARY_COLOR } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Distributore locale
  y = sectionTitle(doc, 'Distributore locale', y);
  doc.setFontSize(8);
  doc.text(cl.distributoreLocale, 14, y);
  y += 8;

  // Attuale fornitore
  y = sectionTitle(doc, 'Attuale fornitore di energia elettrica', y);
  doc.setFontSize(8);
  doc.text(cl.exFornitore || '—', 14, y);
  y += 8;

  // Fatturazione di cortesia
  y = sectionTitle(doc, 'Fatturazione di cortesia (bolletta)', y);
  autoTable(doc, {
    startY: y,
    body: [
      ['[X] SÌ – Email fattura digitale', cl.email],
      ['[ ] NO – Indirizzo postale', `${cl.indirizzo} - ${cl.cap} ${cl.citta}`],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Regime IVA
  y = sectionTitle(doc, 'Regime IVA', y);
  doc.setFontSize(8);
  const ivaPerc = data.simulation?.ivaPercent ?? 22;
  doc.text(ivaPerc <= 10 ? '[ ] ordinario (22%)    [X] agevolato (10%)' : '[X] ordinario (22%)    [ ] agevolato (10%)', 14, y);
  y += 8;

  // Pagamento SEPA
  y = sectionTitle(doc, 'Pagamento – Addebito diretto SEPA', y);
  y = bodyText(doc, `Con il presente mandato si autorizza ${company} a richiedere all'istituto di credito del Cliente debitore l'addebito sul conto corrente. Il Cliente ha diritto di richiedere la restituzione entro le tempistiche previste dalla disciplina SEPA.`, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    body: [
      ['IBAN', cl.ibanCliente],
      ['Sottoscrittore conto corrente', `${cl.nome} ${cl.cognome}`],
      ['Codice Fiscale', cl.codiceFiscale],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: LIGHT_BG, textColor: PRIMARY_COLOR } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Referente aziendale
  y = sectionTitle(doc, 'Referente aziendale', y);
  autoTable(doc, {
    startY: y,
    body: [
      ['Nome e Cognome', `${cl.nome} ${cl.cognome}`],
      ['Telefono', cl.telefono],
      ['Email', cl.email],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: LIGHT_BG, textColor: PRIMARY_COLOR } },
    margin: { left: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Immobile declaration
  y = checkPageBreak(doc, y, 30);
  y = bodyText(doc, `Consapevole delle sanzioni penali in caso di dichiarazioni mendaci (art. 76 DPR 445/2000), il Cliente dichiara di essere titolare dell'unità immobiliare allacciata.`, y);

  y += 6;
  doc.text('Firma del Cliente ......................................................', 14, y);
  doc.text('Timbro ..............................', 140, y);

  addPageFooter(doc, company, data);
  return doc;
};

// ─── 6. Informativa Privacy ──────────────────────────────────────────────────

const generateInformativaPrivacy = async (data: ContractData, logoImg: LoadedImage | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;

  addCompanyHeader(doc, logoImg, company, data);

  let y = addDocTitle(doc, 'Informativa sul trattamento dei dati personali', 40);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003 (Codice Privacy)', 14, y);
  doc.setTextColor(0);
  y += 8;

  // 1. Titolare
  y = sectionTitle(doc, '1. Titolare del trattamento', y);
  const titolareLines = [
    `Il Titolare del trattamento è ${company}`,
    data.companyAddress ? `Sede legale: ${data.companyAddress}` : '',
    data.companyCf ? `C.F./P.IVA: ${data.companyCf}` : '',
    data.companyPec ? `PEC: ${data.companyPec}` : '',
    data.companyEmail ? `Email: ${data.companyEmail}` : '',
    data.companyPhone ? `Tel.: ${data.companyPhone}` : '',
  ].filter(Boolean).join('\n');
  y = bodyText(doc, titolareLines, y);
  y += 2;

  // 2. Finalità
  y = sectionTitle(doc, '2. Finalità e base giuridica del trattamento', y);
  const finalita = [
    'a) Esecuzione del contratto: gestione della fornitura di energia elettrica, fatturazione, incasso, gestione del rapporto contrattuale, switching, volture, subentri e attivazioni presso il distributore locale (base giuridica: art. 6.1.b GDPR – esecuzione di un contratto).',
    'b) Adempimento di obblighi di legge: obblighi fiscali, contabili, regolatori (ARERA, CSEA, Agenzia delle Dogane), antiriciclaggio e segnalazioni obbligatorie (base giuridica: art. 6.1.c GDPR – obbligo legale).',
    'c) Legittimo interesse del Titolare: prevenzione frodi, recupero crediti, analisi statistiche aggregate, miglioramento del servizio (base giuridica: art. 6.1.f GDPR – legittimo interesse).',
    'd) Marketing diretto: invio di comunicazioni commerciali, offerte promozionali, newsletter relative ai servizi del Titolare, previo consenso dell\'interessato (base giuridica: art. 6.1.a GDPR – consenso).',
    'e) Profilazione: analisi delle abitudini di consumo energetico per la personalizzazione delle offerte commerciali, previo consenso dell\'interessato (base giuridica: art. 6.1.a GDPR – consenso).',
  ];
  finalita.forEach(f => {
    y = checkPageBreak(doc, y, 20);
    y = bodyText(doc, f, y);
  });
  y += 2;

  // 3. Dati trattati
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, '3. Categorie di dati personali trattati', y);
  y = bodyText(doc, 'Il Titolare tratta le seguenti categorie di dati personali:', y);
  const datiCateg = [
    '- Dati anagrafici e di contatto: nome, cognome, codice fiscale, partita IVA, indirizzo, telefono, email, PEC.',
    '- Dati relativi alla fornitura: codice POD, indirizzo di fornitura, dati tecnici del punto di prelievo, consumi storici e previsionali, dati del misuratore.',
    '- Dati di pagamento: coordinate bancarie (IBAN), storico pagamenti, eventuali morosità.',
    '- Dati di navigazione e interazione: in caso di utilizzo dell\'area riservata online, dati di log, indirizzo IP, cookie tecnici e analitici.',
  ];
  datiCateg.forEach(d => {
    y = checkPageBreak(doc, y, 15);
    y = bodyText(doc, d, y);
  });
  y += 2;

  // 4. Destinatari
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, '4. Destinatari e categorie di destinatari', y);
  y = bodyText(doc, 'I dati personali potranno essere comunicati a:', y);
  const destinatari = [
    '- Distributori locali di energia elettrica per le operazioni di switching, attivazione e gestione tecnica dei punti di prelievo.',
    '- Grossisti e operatori del mercato elettrico per l\'approvvigionamento dell\'energia.',
    '- ARERA, GSE, CSEA, Agenzia delle Dogane e Monopoli, Agenzia delle Entrate e altre autorità competenti per adempimenti regolatori e fiscali.',
    '- Istituti bancari e finanziari per la gestione degli incassi e dei pagamenti.',
    '- Società di recupero crediti, in caso di morosità del Cliente.',
    '- Fornitori di servizi IT, hosting, manutenzione software, in qualità di responsabili del trattamento ex art. 28 GDPR.',
    '- Consulenti legali, fiscali e contabili del Titolare, in qualità di soggetti autorizzati al trattamento.',
  ];
  destinatari.forEach(d => {
    y = checkPageBreak(doc, y, 15);
    y = bodyText(doc, d, y);
  });
  y += 2;

  // 5. Conservazione
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, '5. Periodo di conservazione dei dati', y);
  y = bodyText(doc, 'I dati personali saranno conservati per il periodo strettamente necessario al perseguimento delle finalità per cui sono stati raccolti:', y);
  const conservazione = [
    '- Dati contrattuali: per tutta la durata del rapporto contrattuale e per i successivi 10 anni dalla cessazione, in conformità agli obblighi civilistici e fiscali.',
    '- Dati di fatturazione: per 10 anni dalla data di emissione della fattura (art. 2220 c.c.).',
    '- Dati per finalità di marketing: fino alla revoca del consenso da parte dell\'interessato, e comunque non oltre 24 mesi dall\'ultimo contatto.',
    '- Dati per finalità di profilazione: fino alla revoca del consenso, e comunque non oltre 12 mesi dalla raccolta.',
    '- Dati regolatori (ARERA, ADM): secondo i termini previsti dalla normativa di settore applicabile.',
  ];
  conservazione.forEach(c => {
    y = checkPageBreak(doc, y, 15);
    y = bodyText(doc, c, y);
  });
  y += 2;

  // 6. Diritti
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, '6. Diritti dell\'interessato', y);
  y = bodyText(doc, 'Ai sensi degli artt. 15-22 del GDPR, l\'interessato ha il diritto di:', y);
  const diritti = [
    '- Accesso: ottenere conferma dell\'esistenza di un trattamento e accedere ai propri dati personali (art. 15).',
    '- Rettifica: ottenere la correzione dei dati inesatti o l\'integrazione dei dati incompleti (art. 16).',
    '- Cancellazione ("diritto all\'oblio"): ottenere la cancellazione dei dati, nei casi previsti dalla legge (art. 17).',
    '- Limitazione del trattamento: ottenere la limitazione del trattamento nei casi previsti (art. 18).',
    '- Portabilità: ricevere i dati in formato strutturato e leggibile da dispositivo automatico (art. 20).',
    '- Opposizione: opporsi al trattamento per motivi legittimi, incluso il marketing diretto (art. 21).',
    '- Revoca del consenso: revocare in qualsiasi momento il consenso prestato, senza pregiudizio per la liceità del trattamento basata sul consenso prima della revoca (art. 7.3).',
  ];
  diritti.forEach(d => {
    y = checkPageBreak(doc, y, 15);
    y = bodyText(doc, d, y);
  });
  y += 2;

  y = checkPageBreak(doc, y, 20);
  y = bodyText(doc, `Per esercitare i propri diritti, l'interessato può inviare una richiesta scritta a: ${data.companyPec || data.companyEmail || company}.`, y);
  y = bodyText(doc, 'L\'interessato ha inoltre il diritto di proporre reclamo all\'Autorità Garante per la protezione dei dati personali (www.garanteprivacy.it).', y);
  y += 2;

  // 7. Trasferimento dati
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, '7. Trasferimento dei dati all\'estero', y);
  y = bodyText(doc, 'I dati personali sono trattati all\'interno dell\'Unione Europea. Qualora si rendesse necessario il trasferimento verso Paesi terzi, il Titolare garantirà l\'adozione di adeguate garanzie ai sensi degli artt. 46-49 del GDPR (clausole contrattuali tipo, decisioni di adeguatezza della Commissione Europea).', y);
  y += 2;

  // 8. Conferimento obbligatorio
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, '8. Natura del conferimento dei dati', y);
  y = bodyText(doc, 'Il conferimento dei dati anagrafici, di contatto e relativi alla fornitura è necessario per la conclusione e l\'esecuzione del contratto di somministrazione di energia elettrica. Il mancato conferimento comporta l\'impossibilità di attivare e gestire la fornitura.', y);
  y = bodyText(doc, 'Il conferimento dei dati per le finalità di marketing e profilazione è facoltativo. Il mancato consenso non pregiudica in alcun modo l\'esecuzione del contratto.', y);

  // Signature
  y = checkPageBreak(doc, y, 30);
  y += 6;
  doc.setFontSize(8);
  doc.text('Il Cliente dichiara di aver ricevuto e preso visione della presente informativa.', 14, y);
  y += 8;
  doc.text('Firma del Cliente ......................................................', 14, y);
  doc.text('Luogo e data ..............................', 120, y);

  addPageFooter(doc, company, data);
  return doc;
};

// ─── 7. Fattura Tipo – Bolletta 2.0 ─────────────────────────────────────────

const generateBolletta2 = async (data: ContractData, logoImg: LoadedImage | null): Promise<jsPDF> => {
  const doc = new jsPDF();
  const company = data.companyName || data.projectName;
  const cl = data.client || defaultSampleClient;
  const sim = data.simulation;
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 14;

  const consumption = cl.consumoMensile || sim?.avgMonthlyConsumption || 200;
  const potKw = parseFloat(cl.potenzaKw) || sim?.potenzaImpegnataKw || 3;

  const punSp = (sim?.punPerKwh ?? 0.12) + (sim?.spreadPerKwh ?? 0.015);
  const disp = sim?.dispacciamentoPerKwh ?? 0.01;
  const traspEn = sim?.trasportoQuotaEnergiaKwh ?? 0.008;
  const traspFissaMese = (sim?.trasportoQuotaFissaAnno ?? 23) / 12;
  const traspPotMese = ((sim?.trasportoQuotaPotenzaKwAnno ?? 22) * potKw) / 12;
  const asosKwh = sim?.oneriAsosKwh ?? 0.025;
  const arimKwh = sim?.oneriArimKwh ?? 0.007;
  const acciseKwh = sim?.acciseKwh ?? 0.0227;
  const ivaPerc = (sim?.ivaPercent ?? 10) / 100;
  const ccv = sim?.ccvMonthly ?? 8.5;
  const gestPod = sim?.gestionePodPerPod ?? 2.5;

  const spMateria = punSp * consumption + disp * consumption + ccv + gestPod;
  const spTrasporto = traspFissaMese + traspPotMese + traspEn * consumption;
  const spOneri = (asosKwh + arimKwh) * consumption;
  const imponibile = spMateria + spTrasporto + spOneri;
  const acciseTot = acciseKwh * consumption;
  const iva = (imponibile + acciseTot) * ivaPerc;
  const totale = imponibile + acciseTot + iva;

  // ── Page 1: Header + Summary ──
  addCompanyHeader(doc, logoImg, company, data);

  let y = addDocTitle(doc, 'LA BOLLETTA DELLA TUA FORNITURA LUCE', 40);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Mercato Libero – Documento fac-simile conforme alla struttura Bolletta 2.0 ARERA', 14, y);
  doc.setTextColor(0);
  y += 8;

  // I DATI DELLA TUA FORNITURA
  y = sectionTitle(doc, 'I DATI DELLA TUA FORNITURA', y);

  autoTable(doc, {
    startY: y,
    body: [
      ['Intestatario', `${cl.nome} ${cl.cognome}`],
      ['Codice Fiscale', cl.codiceFiscale],
      ['Indirizzo fornitura', cl.indirizzoFornitura],
      ['POD', cl.pod],
      ['Tipologia cliente', cl.tipologiaUso],
      ['Potenza disponibile', `${(potKw * 1.1).toFixed(1)} kW`],
      ['Potenza impegnata', `${potKw} kW`],
      ['Tensione', cl.tensione],
      ['Distributore', cl.distributoreLocale],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, fillColor: LIGHT_BG, textColor: PRIMARY_COLOR } },
    margin: { left },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // QUANDO E QUANTO PAGHI
  y = sectionTitle(doc, 'QUANDO E QUANTO PAGHI', y);
  doc.setFontSize(8);
  doc.text(`Periodo: ${cl.periodo}  |  Consumo fatturato: ${consumption} kWh`, left, y);
  y += 6;

  // Total box
  doc.setFillColor(...PRIMARY_COLOR);
  doc.roundedRect(left, y, pageWidth - 28, 14, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text(`${totale.toFixed(2)} €`, pageWidth / 2, y + 9, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTALE DA PAGARE', pageWidth / 2, y + 4, { align: 'center' });
  doc.setTextColor(0);
  y += 20;

  doc.setFontSize(8);
  doc.text('Modalità di pagamento: ADDEBITO SU CONTO CORRENTE (SEPA)', left, y);
  y += 8;

  // SINTESI DELLA SPESA
  y = sectionTitle(doc, 'LA SINTESI DELLA SPESA', y);

  autoTable(doc, {
    startY: y,
    head: [['QUELLO CHE PAGHI', '€']],
    body: [
      ['Spesa per la materia energia', spMateria.toFixed(2)],
      ['Spesa per il trasporto e la gestione del contatore', spTrasporto.toFixed(2)],
      ['Spesa per oneri di sistema', spOneri.toFixed(2)],
      ['Imposte (accise)', acciseTot.toFixed(2)],
      ['Totale IVA', iva.toFixed(2)],
      ['TOTALE BOLLETTA', totale.toFixed(2)],
    ],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 130 }, 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left },
    didParseCell: (hookData: any) => {
      if (hookData.row.index === 5) {
        hookData.cell.styles.fillColor = LIGHT_BG;
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // HAI BISOGNO DI AIUTO
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, 'HAI BISOGNO DI AIUTO', y);
  y = bodyText(doc, `Per informazioni sulla tua utenza: ${data.companyPhone || '800 XXX XXX'}. In caso di guasto: ${cl.distributoreLocale} – Numero verde pronto intervento (attivo 24/7).`, y);

  // ── Page 2: Dettaglio ──
  doc.addPage();
  let y2 = 20;

  y2 = sectionTitle(doc, 'LETTURE E CONSUMI', y2);
  autoTable(doc, {
    startY: y2,
    head: [['Periodo', 'U.M.', 'Lettura', 'Tipo lettura', 'Consumo', 'Tipo consumo']],
    body: [
      [cl.periodo.split('–')[0]?.trim() || '01/01', 'kWh', '—', 'Rilevata', String(consumption), 'Effettivo'],
    ],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2 },
    margin: { left },
  });
  y2 = (doc as any).lastAutoTable.finalY + 8;

  // Dettaglio Materia
  y2 = sectionTitle(doc, 'DETTAGLIO – Spesa per la materia energia', y2);
  autoTable(doc, {
    startY: y2,
    head: [['Componente', 'Calcolo', 'Importo (€)']],
    body: [
      ['Energia (PUN + spread)', `${consumption} kWh × ${punSp.toFixed(4)} €/kWh`, (punSp * consumption).toFixed(2)],
      ['Dispacciamento', `${consumption} kWh × ${disp.toFixed(4)} €/kWh`, (disp * consumption).toFixed(2)],
      ['CCV (commercializzazione)', 'Quota fissa mensile', ccv.toFixed(2)],
      ['Gestione POD', 'Quota fissa mensile', gestPod.toFixed(2)],
      ['Subtotale materia', '', spMateria.toFixed(2)],
    ],
    theme: 'striped',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left },
  });
  y2 = (doc as any).lastAutoTable.finalY + 6;

  // Dettaglio Trasporto
  y2 = sectionTitle(doc, 'DETTAGLIO – Spesa per trasporto e gestione contatore', y2);
  autoTable(doc, {
    startY: y2,
    head: [['Componente', 'Calcolo', 'Importo (€)']],
    body: [
      ['Quota fissa', `${(sim?.trasportoQuotaFissaAnno ?? 23).toFixed(2)} €/anno ÷ 12`, traspFissaMese.toFixed(2)],
      ['Quota potenza', `${potKw} kW × ${(sim?.trasportoQuotaPotenzaKwAnno ?? 22).toFixed(2)} €/kW/anno ÷ 12`, traspPotMese.toFixed(2)],
      ['Quota energia', `${consumption} kWh × ${traspEn.toFixed(4)} €/kWh`, (traspEn * consumption).toFixed(2)],
      ['Subtotale trasporto', '', spTrasporto.toFixed(2)],
    ],
    theme: 'striped',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left },
  });
  y2 = (doc as any).lastAutoTable.finalY + 6;

  // Dettaglio Oneri e Imposte
  y2 = sectionTitle(doc, 'DETTAGLIO – Oneri di sistema e Imposte', y2);
  autoTable(doc, {
    startY: y2,
    head: [['Componente', 'Calcolo', 'Importo (€)']],
    body: [
      ['ASOS', `${consumption} kWh × ${asosKwh.toFixed(4)} €/kWh`, (asosKwh * consumption).toFixed(2)],
      ['ARIM', `${consumption} kWh × ${arimKwh.toFixed(4)} €/kWh`, (arimKwh * consumption).toFixed(2)],
      ['Subtotale oneri', '', spOneri.toFixed(2)],
      ['Accise', `${consumption} kWh × ${acciseKwh.toFixed(4)} €/kWh`, acciseTot.toFixed(2)],
      [`IVA ${(sim?.ivaPercent ?? 10)}%`, `su ${(imponibile + acciseTot).toFixed(2)} €`, iva.toFixed(2)],
    ],
    theme: 'striped',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left },
  });
  y2 = (doc as any).lastAutoTable.finalY + 10;

  // Glossario
  y2 = checkPageBreak(doc, y2, 60);
  y2 = sectionTitle(doc, 'GLOSSARIO ESSENZIALE', y2);
  const glossary = [
    ['Spesa per la materia energia', 'Prezzo della materia prima, costi di commercializzazione e vendita e costi di dispacciamento.'],
    ['Spesa per il trasporto', 'Costi per il trasporto, distribuzione e misura. Stabiliti e aggiornati dall\'ARERA.'],
    ['Spesa per oneri di sistema', 'Importi a copertura di costi di interesse generale per il sistema elettrico. Aggiornati trimestralmente dall\'ARERA.'],
    ['Imposte', 'Imposta di consumo (accisa) e IVA. Uguali per ciascun fornitore.'],
  ];
  glossary.forEach(([term, def]) => {
    y2 = checkPageBreak(doc, y2, 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(term + ':', left, y2);
    doc.setFont('helvetica', 'normal');
    y2 += 3.5;
    const lines = doc.splitTextToSize(def, 182);
    doc.text(lines, left, y2);
    y2 += lines.length * 3.5 + 3;
  });

  addPageFooter(doc, company, data);
  return doc;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useContractPackage = () => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePackage = useCallback(async (data: ContractData) => {
    setGenerating(true);
    try {
      const logoImg = data.logoUrl ? await loadImageWithDimensions(data.logoUrl) : null;

      const [pda, condPart, condGen, scheda, pdp, privacy, bolletta] = await Promise.all([
        generatePDA(data, logoImg),
        generateCondizioniParticolari(data, logoImg),
        generateCondizioni(data, logoImg),
        generateSchedaSintetica(data, logoImg),
        generatePDP(data, logoImg),
        generateInformativaPrivacy(data, logoImg),
        generateBolletta2(data, logoImg),
      ]);

      const zip = new JSZip();
      zip.file('01_Proposta_di_Contratto.pdf', pda.output('blob'));
      zip.file('02_Condizioni_Particolari_Fornitura.pdf', condPart.output('blob'));
      zip.file('03_Condizioni_Generali_Fornitura.pdf', condGen.output('blob'));
      zip.file('04_Scheda_Sintetica_ARERA.pdf', scheda.output('blob'));
      zip.file('05_Punti_di_Prelievo.pdf', pdp.output('blob'));
      zip.file('06_Informativa_Privacy.pdf', privacy.output('blob'));
      zip.file('07_Fattura_Tipo_Bolletta_2_0.pdf', bolletta.output('blob'));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const safeName = (data.companyName || data.projectName).replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(zipBlob, `Plico_Contrattuale_${safeName}.zip`);

      toast({
        title: 'Plico contrattuale generato',
        description: '7 documenti professionali PDF scaricati in archivio ZIP.',
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
