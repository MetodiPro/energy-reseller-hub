import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, Download, Upload, Image, Loader2, Trash2, CheckCircle2, 
  FileCheck, BookOpen, Scale, Receipt, ClipboardList, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useContractPackage, type SampleClientData } from '@/hooks/useContractPackage';
import { useProjectLogo } from '@/hooks/useProjectLogo';
import { useRevenueSimulation } from '@/hooks/useRevenueSimulation';
import { ContractPreviewDialog } from '@/components/ContractPreviewDialog';

interface ContractPackagePageProps {
  project: {
    id?: string;
    name?: string;
    arera_code: string | null;
    wholesaler_name: string | null;
    go_live_date: string | null;
    commodity_type?: string | null;
    logo_url?: string | null;
    company_address?: string | null;
    company_phone?: string | null;
    company_email?: string | null;
    company_pec?: string | null;
    company_website?: string | null;
    company_cf?: string | null;
    company_piva?: string | null;
  } | null;
  projectId?: string | null;
}

const documents = [
  { icon: ClipboardList, title: 'Proposta di Contratto (PDA)', description: 'Documento vincolante ai sensi dell\'art. 1329 c.c. con dati cliente, condizioni di prezzo, consensi privacy e clausole artt. 1341-1342.' },
  { icon: Receipt, title: 'Condizioni Particolari di Fornitura', description: 'Condizioni economiche specifiche: PUN + spread, dispacciamento, ASOS, ARIM, CCV, trasporto, accise e IVA con incidenza percentuale.' },
  { icon: BookOpen, title: 'Condizioni Generali di Fornitura', description: '12 articoli che regolano il rapporto contrattuale: oggetto, mandati, durata, recesso, fatturazione, sospensione, garanzie, reclami, conciliazione ARERA, GDPR e foro competente.' },
  { icon: Scale, title: 'Scheda Sintetica ARERA 426/2020', description: 'Documento obbligatorio per clienti BT: condizioni economiche, oneri di sistema per fascia di potenza, trasporto, imposte, modalità recesso e livelli di qualità commerciale.' },
  { icon: FileCheck, title: 'Punti di Prelievo (PDP)', description: 'Allegato tecnico con dati POD, distributore locale, consumi, regime IVA, mandato SEPA e referente aziendale.' },
  { icon: ShieldCheck, title: 'Informativa Privacy (GDPR)', description: 'Informativa completa ai sensi degli artt. 13-14 del Reg. UE 2016/679: titolare, finalità, basi giuridiche, destinatari, conservazione, diritti dell\'interessato e trasferimento dati.' },
  { icon: FileText, title: 'Fattura Tipo – Bolletta 2.0', description: 'Fac-simile conforme alla struttura Bolletta 2.0 ARERA con sintesi spesa, dettaglio componenti, letture/consumi e glossario essenziale.' },
];

export const ContractPackagePage = ({ project, projectId }: ContractPackagePageProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { generatePackage, generating } = useContractPackage();
  const { uploadLogo, removeLogo, uploading: logoUploading } = useProjectLogo(
    project ? { id: project.id || '', name: project.name || '', description: null, owner_id: '', commodity_type: project.commodity_type || null, planned_start_date: null, go_live_date: project.go_live_date, logo_url: project.logo_url || null, created_at: '', updated_at: '' } : null
  );
  const { data: simData } = useRevenueSimulation(projectId || null);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Plico Contrattuale
          </CardTitle>
          <CardDescription>
            Genera un pacchetto documentale facsimile per il cliente finale nel mercato libero dell'energia elettrica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            Il <strong>plico contrattuale</strong> è l'insieme dei documenti che il fornitore di energia elettrica deve predisporre per la sottoscrizione 
            di un contratto di fornitura nel mercato libero. Questi documenti sono regolamentati dall'<strong>ARERA</strong> (Autorità di Regolazione per 
            Energia Reti e Ambiente) e devono rispettare specifici requisiti di trasparenza e completezza informativa verso il cliente finale.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Il pacchetto generato da questa sezione include <strong>7 documenti PDF</strong> in formato ZIP, pre-compilati con i dati del progetto 
            e i parametri della simulazione finanziaria. I dati del cliente tipo possono essere personalizzati prima della generazione tramite 
            il pannello di anteprima.
          </p>

          {/* Disclaimer */}
          <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-warning font-semibold">Facsimile essenziale e incompleto</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Il plico generato è un facsimile dimostrativo che fornisce un'idea della documentazione necessaria per lo svolgimento 
                  delle attività commerciali. Non ha valore legale né contrattuale. Per i documenti definitivi conformi alla normativa ARERA, 
                  si raccomanda di rivolgersi a un consulente legale specializzato nel settore energetico.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documenti inclusi nel plico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc.title} className="flex gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <doc.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Genera il plico</CardTitle>
          <CardDescription>Personalizza il logo e i dati del cliente tipo, poi scarica il pacchetto ZIP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            {project?.logo_url ? (
              <img src={project.logo_url} alt="Logo brand" className="h-14 w-14 object-contain rounded-md border border-border bg-background p-1" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border bg-muted">
                <Image className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">Logo del brand</p>
              <p className="text-xs text-muted-foreground">
                {project?.logo_url ? 'Il logo verrà inserito in tutti i documenti del plico.' : 'Carica il logo del fornitore per brandizzare i documenti contrattuali.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-1.5">{project?.logo_url ? 'Cambia' : 'Carica'}</span>
              </Button>
              {project?.logo_url && (
                <Button variant="ghost" size="sm" onClick={removeLogo} disabled={logoUploading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadLogo(file); e.target.value = ''; }} />
          </div>

          {/* Generate */}
          <Button size="lg" className="w-full" onClick={() => setPreviewOpen(true)} disabled={generating || !project}>
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generazione in corso...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Genera Plico Contrattuale (ZIP)</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Include: PDA, Condizioni Particolari, Condizioni Generali, Scheda Sintetica, Punti di Prelievo, Informativa Privacy, Fattura Tipo Bolletta 2.0
          </p>
          {simData.id && (
            <p className="text-xs text-success text-center flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              I prezzi vengono pre-compilati dalla simulazione finanziaria del progetto
            </p>
          )}

          <ContractPreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            generating={generating}
            commodityType={'solo-luce'}
            simAvgConsumption={simData.params.avgMonthlyConsumption}
            simAvgConsumptionGas={0}
            onGenerate={(clientData: SampleClientData) => {
              if (!project) return;
              const sp = simData.params;
              generatePackage({
                projectName: project.name || 'Reseller',
                logoUrl: project.logo_url || null,
                commodityType: 'solo-luce',
                companyName: project.name,
                areaCode: project.arera_code || undefined,
                wholesalerName: project.wholesaler_name || undefined,
                companyAddress: project.company_address || undefined,
                companyPhone: project.company_phone || undefined,
                companyEmail: project.company_email || undefined,
                companyPec: project.company_pec || undefined,
                companyWebsite: project.company_website || undefined,
                companyCf: project.company_cf || undefined,
                companyPiva: project.company_piva || undefined,
                client: clientData,
                simulation: {
                  punPerKwh: sp.punPerKwh,
                  spreadPerKwh: sp.spreadPerKwh,
                  dispacciamentoPerKwh: sp.dispacciamentoPerKwh,
                  trasportoQuotaFissaAnno: sp.trasportoQuotaFissaAnno,
                  trasportoQuotaPotenzaKwAnno: sp.trasportoQuotaPotenzaKwAnno,
                  trasportoQuotaEnergiaKwh: sp.trasportoQuotaEnergiaKwh,
                  oneriAsosKwh: sp.oneriAsosKwh,
                  oneriArimKwh: sp.oneriArimKwh,
                  acciseKwh: sp.acciseKwh,
                  ivaPercent: sp.ivaPercent,
                  ccvMonthly: sp.ccvMonthly,
                  gestionePodPerPod: sp.gestionePodPerPod,
                  potenzaImpegnataKw: sp.potenzaImpegnataKw,
                  avgMonthlyConsumption: sp.avgMonthlyConsumption,
                },
              }).then(() => setPreviewOpen(false));
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
