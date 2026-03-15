import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Zap, FileText, CalendarIcon, ExternalLink, Save, Loader2, ArrowDownToLine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fetchCurrentPunPrice, type PunPriceData } from "@/lib/api/punPrice";
import { fetchAreraTariffs, updateAreraTariffs, type AreraTariffData } from "@/lib/api/areraTariffs";

interface MarketTariffsSectionProps {
  onImportToSimulator?: (fields: Record<string, number>) => void;
}

export function MarketTariffsSection({ onImportToSimulator }: MarketTariffsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Tariffe di Mercato
        </h2>
        <p className="text-sm text-muted-foreground">
          Prezzi energia e componenti regolate ARERA
        </p>
      </div>
      <PunCard />
      <AreraCard onImportToSimulator={onImportToSimulator} />
    </div>
  );
}

// ─── CARD 1: PUN ──────────────────────────────────────────────

function PunCard() {
  const [loading, setLoading] = useState(false);
  const [pun, setPun] = useState<PunPriceData | null>(null);
  const [warning, setWarning] = useState<string | undefined>();

  const loadPun = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCurrentPunPrice();
      setPun(res.data);
      setWarning(res.warning);
      if (res.data.data_freshness === 'live') {
        toast.success("PUN aggiornato dai dati Terna");
      }
    } catch (err: any) {
      toast.error("Errore nel recupero del PUN: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPun();
  }, [loadPun]);

  const isLive = pun?.data_freshness === 'live';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">PUN Index GME (via Terna)</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={loadPun} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Aggiorna
          </Button>
        </div>
        <CardDescription>Prezzo Unico Nazionale dell'energia elettrica</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pun ? (
          <>
            <div className="flex items-baseline gap-4">
              <div>
                <p className="text-3xl font-bold font-mono tracking-tight">
                  €{pun.averagePriceKwh.toFixed(5)}<span className="text-sm font-normal text-muted-foreground">/kWh</span>
                </p>
                <p className="text-lg text-muted-foreground font-mono">
                  €{pun.averagePrice.toFixed(2)}<span className="text-xs">/MWh</span>
                </p>
              </div>
              <Badge variant={isLive ? "default" : "secondary"} className={cn(
                "ml-auto",
                isLive ? "bg-green-600 hover:bg-green-700 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-white"
              )}>
                <span className={cn("inline-block h-2 w-2 rounded-full mr-1.5", isLive ? "bg-green-300" : "bg-yellow-200")} />
                {isLive ? "Live" : "Stimato"}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Min: €{pun.minPrice.toFixed(2)}/MWh</span>
              <span>Max: €{pun.maxPrice.toFixed(2)}/MWh</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Dati del {pun.reference_date ? format(new Date(pun.reference_date + 'T00:00:00'), "dd/MM/yyyy") : "N/D"} — Fonte: {pun.source}
            </p>

            {!isLive && warning && (
              <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  API Terna non raggiungibile — verifica le credenziali TERNA_CLIENT_ID e TERNA_CLIENT_SECRET nei secrets del backend.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── CARD 2: ARERA ────────────────────────────────────────────

interface AreraFormState {
  quotaFissaAnno: number;
  quotaPotenzaKwAnno: number;
  quotaEnergiaKwh: number;
  asosKwh: number;
  arimKwh: number;
  domesticoKwh: number;
  altriUsiKwh: number;
  delibera: string;
  effectiveDate: Date | undefined;
  nextUpdateDate: Date | undefined;
}

function AreraCard({ onImportToSimulator }: { onImportToSimulator?: (fields: Record<string, number>) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [requiresUpdate, setRequiresUpdate] = useState(false);
  const [daysUntilUpdate, setDaysUntilUpdate] = useState(0);
  const [nextUpdateStr, setNextUpdateStr] = useState("");
  const [dataFreshness, setDataFreshness] = useState<string>("");

  const [form, setForm] = useState<AreraFormState>({
    quotaFissaAnno: 23.00,
    quotaPotenzaKwAnno: 22.00,
    quotaEnergiaKwh: 0.00812,
    asosKwh: 0.02500,
    arimKwh: 0.00700,
    domesticoKwh: 0.02270,
    altriUsiKwh: 0.01250,
    delibera: "588/2025/R/com",
    effectiveDate: new Date("2026-01-01"),
    nextUpdateDate: new Date("2026-04-01"),
  });

  const loadTariffs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAreraTariffs();
      const d = res.data;
      setForm({
        quotaFissaAnno: d.trasporto.quotaFissaAnno,
        quotaPotenzaKwAnno: d.trasporto.quotaPotenzaKwAnno,
        quotaEnergiaKwh: d.trasporto.quotaEnergiaKwh,
        asosKwh: d.oneri.asosKwh,
        arimKwh: d.oneri.arimKwh,
        domesticoKwh: d.accise.domesticoKwh,
        altriUsiKwh: d.accise.altriUsiKwh,
        delibera: d.delibera || "",
        effectiveDate: d.effective_date ? new Date(d.effective_date + 'T00:00:00') : undefined,
        nextUpdateDate: d.next_update_date ? new Date(d.next_update_date + 'T00:00:00') : undefined,
      });
      setRequiresUpdate(res.requires_update);
      setDaysUntilUpdate(res.days_until_update);
      setNextUpdateStr(res.next_update);
      setDataFreshness(res.data_freshness);
    } catch (err: any) {
      toast.error("Errore caricamento tariffe ARERA");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTariffs();
  }, [loadTariffs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        trasporto: {
          quotaFissaAnno: form.quotaFissaAnno,
          quotaPotenzaKwAnno: form.quotaPotenzaKwAnno,
          quotaEnergiaKwh: form.quotaEnergiaKwh,
        },
        oneri: {
          asosKwh: form.asosKwh,
          arimKwh: form.arimKwh,
        },
        accise: {
          domesticoKwh: form.domesticoKwh,
          altriUsiKwh: form.altriUsiKwh,
        },
        delibera: form.delibera,
        effective_date: form.effectiveDate ? format(form.effectiveDate, "yyyy-MM-dd") : undefined,
        next_update_date: form.nextUpdateDate ? format(form.nextUpdateDate, "yyyy-MM-dd") : undefined,
      };

      const res = await updateAreraTariffs(payload as any);
      setRequiresUpdate(res.requires_update);
      setDaysUntilUpdate(res.days_until_update);
      setNextUpdateStr(res.next_update);
      setDataFreshness(res.data_freshness);

      setSaved(true);
      toast.success("Tariffe ARERA aggiornate");
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error("Errore salvataggio: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = () => {
    if (!onImportToSimulator) return;
    onImportToSimulator({
      oneriAsosKwh: form.asosKwh,
      oneriArimKwh: form.arimKwh,
      trasportoQuotaFissaAnno: form.quotaFissaAnno,
      trasportoQuotaPotenzaKwAnno: form.quotaPotenzaKwAnno,
      trasportoQuotaEnergiaKwh: form.quotaEnergiaKwh,
      acciseKwh: form.domesticoKwh,
    });
    toast.success("Tariffe importate nel simulatore del progetto corrente");
  };

  const updateField = (field: keyof AreraFormState, value: number | string | Date | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Tariffe ARERA — Componenti Regolate</CardTitle>
        </div>
        <CardDescription>
          Valori aggiornabili manualmente ad ogni delibera trimestrale
          {dataFreshness === 'default_init' && (
            <Badge variant="outline" className="ml-2 text-xs">Valori iniziali</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info box con link e calendario */}
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Dove trovare i dati aggiornati
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Oneri di sistema (ASOS, ARIM):</p>
              <a href="https://www.arera.it/area-operatori/prezzi-e-tariffe/oneri-generali-di-sistema-e-ulteriori-componenti" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                ARERA — Oneri generali di sistema <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Trasporto e distribuzione:</p>
              <a href="https://www.arera.it/area-operatori/prezzi-e-tariffe/tariffe-distribuzione-e-misura-di-energia-elettrica" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                ARERA — Tariffe distribuzione e misura <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Accise ed imposte:</p>
              <a href="https://www.arera.it/area-operatori/prezzi-e-tariffe/accise-e-imposte" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                ARERA — Accise e imposte <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Delibere trimestrali:</p>
              <a href="https://www.arera.it/atti-e-provvedimenti" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                ARERA — Atti e provvedimenti <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Calendario aggiornamenti trimestrali ARERA</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded border px-2.5 py-1.5 text-center">
                <p className="font-semibold">Q1</p>
                <p className="text-muted-foreground">1 Gennaio</p>
                <p className="text-muted-foreground">Delibera entro fine Dicembre</p>
              </div>
              <div className="rounded border px-2.5 py-1.5 text-center">
                <p className="font-semibold">Q2</p>
                <p className="text-muted-foreground">1 Aprile</p>
                <p className="text-muted-foreground">Delibera entro fine Marzo</p>
              </div>
              <div className="rounded border px-2.5 py-1.5 text-center">
                <p className="font-semibold">Q3</p>
                <p className="text-muted-foreground">1 Luglio</p>
                <p className="text-muted-foreground">Delibera entro fine Giugno</p>
              </div>
              <div className="rounded border px-2.5 py-1.5 text-center">
                <p className="font-semibold">Q4</p>
                <p className="text-muted-foreground">1 Ottobre</p>
                <p className="text-muted-foreground">Delibera entro fine Settembre</p>
              </div>
            </div>
          </div>
        </div>
        {/* Update warning banner */}
        {requiresUpdate && (
          <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">
                ⚠ Aggiornamento trimestrale disponibile — Verifica la nuova delibera ARERA e aggiorna i valori.
              </p>
              <p className="text-sm">
                Prossimo aggiornamento atteso: {nextUpdateStr ? format(new Date(nextUpdateStr + 'T00:00:00'), "dd/MM/yyyy") : "N/D"}
              </p>
              <a
                href="https://www.arera.it/area-operatori/prezzi-e-tariffe/oneri-generali-di-sistema-e-ulteriori-componenti"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm underline hover:no-underline"
              >
                Consulta ARERA <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* Trasporto */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trasporto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quotaFissa" className="text-xs">Quota Fissa (€/anno)</Label>
              <Input id="quotaFissa" type="number" step="0.01" value={form.quotaFissaAnno}
                onChange={e => updateField('quotaFissaAnno', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quotaPotenza" className="text-xs">Quota Potenza (€/kW/anno)</Label>
              <Input id="quotaPotenza" type="number" step="0.01" value={form.quotaPotenzaKwAnno}
                onChange={e => updateField('quotaPotenzaKwAnno', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quotaEnergia" className="text-xs">Quota Energia (€/kWh)</Label>
              <Input id="quotaEnergia" type="number" step="0.00001" value={form.quotaEnergiaKwh}
                onChange={e => updateField('quotaEnergiaKwh', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Oneri di sistema */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Oneri di Sistema</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="asos" className="text-xs">ASOS - Oneri Sistema (€/kWh)</Label>
              <Input id="asos" type="number" step="0.00001" value={form.asosKwh}
                onChange={e => updateField('asosKwh', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arim" className="text-xs">ARIM - Oneri Rimanenti (€/kWh)</Label>
              <Input id="arim" type="number" step="0.00001" value={form.arimKwh}
                onChange={e => updateField('arimKwh', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Accise */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Accise</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="acciseDom" className="text-xs">Accisa Domestico (€/kWh)</Label>
              <Input id="acciseDom" type="number" step="0.00001" value={form.domesticoKwh}
                onChange={e => updateField('domesticoKwh', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acciseAltri" className="text-xs">Accisa Altri Usi (€/kWh)</Label>
              <Input id="acciseAltri" type="number" step="0.00001" value={form.altriUsiKwh}
                onChange={e => updateField('altriUsiKwh', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Metadata */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Riferimento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="delibera" className="text-xs">Delibera di riferimento</Label>
              <Input id="delibera" value={form.delibera}
                onChange={e => updateField('delibera', e.target.value)}
                placeholder="es. 588/2025/R/com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data entrata in vigore</Label>
              <DatePickerField date={form.effectiveDate} onSelect={d => updateField('effectiveDate', d)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prossimo aggiornamento atteso</Label>
              <DatePickerField date={form.nextUpdateDate} onSelect={d => updateField('nextUpdateDate', d)} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saved ? "Salvato ✓" : "Salva tariffe"}
          </Button>

          {saved && onImportToSimulator && (
            <Button variant="outline" onClick={handleImport}>
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Importa nel simulatore del progetto corrente
            </Button>
          )}
        </div>

        {!requiresUpdate && daysUntilUpdate > 0 && (
          <p className="text-xs text-muted-foreground">
            Prossimo aggiornamento tra {daysUntilUpdate} giorni ({nextUpdateStr ? format(new Date(nextUpdateStr + 'T00:00:00'), "dd/MM/yyyy") : ""})
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── DatePicker helper ────────────────────────────────────────

function DatePickerField({ date, onSelect }: { date: Date | undefined; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          {date ? format(date, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}
