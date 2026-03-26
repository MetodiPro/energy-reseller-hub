import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Package, Plus, Trash2, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { useSimulationProducts, SimulationProduct } from '@/hooks/useSimulationProducts';
import { useSalesChannels, SalesChannel } from '@/hooks/useSalesChannels';
import { RevenueSimulationParams } from '@/hooks/useRevenueSimulation';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ProductsConfigProps {
  projectId: string;
  defaultParams: RevenueSimulationParams;
  salesChannels?: SalesChannel[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);

export const ProductsConfig = ({ projectId, defaultParams, salesChannels: externalChannels }: ProductsConfigProps) => {
  const { products, loading, createProduct, updateProduct, deleteProduct } = useSimulationProducts(projectId);
  const { channels: ownChannels } = useSalesChannels(externalChannels ? null : projectId);
  const channels = externalChannels ?? ownChannels;
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreateFromDefaults = () => {
    createProduct({
      name: 'Prodotto Base',
      ccv_monthly: defaultParams.ccvMonthly,
      spread_per_kwh: defaultParams.spreadPerKwh,
      other_services_monthly: defaultParams.otherServicesMonthly,
      avg_monthly_consumption: defaultParams.avgMonthlyConsumption,
      client_type: defaultParams.clientType,
      iva_percent: defaultParams.ivaPercent,
      activation_rate: defaultParams.activationRate,
      churn_month1_pct: defaultParams.churnMonth1Pct,
      churn_month2_pct: defaultParams.churnMonth2Pct,
      churn_month3_pct: defaultParams.churnMonth3Pct,
      churn_decay_factor: defaultParams.churnDecayFactor,
      collection_month_0: defaultParams.collectionMonth0,
      collection_month_1: defaultParams.collectionMonth1,
      collection_month_2: defaultParams.collectionMonth2,
      collection_month_3_plus: defaultParams.collectionMonth3Plus,
      uncollectible_rate: defaultParams.uncollectibleRate,
      contract_share: 100,
    });
  };

  const handleCreate = () => {
    const existingShare = products.filter(p => p.is_active).reduce((s, p) => s + p.contract_share, 0);
    const remaining = Math.max(0, 100 - existingShare);
    createProduct({ name: `Prodotto ${products.length + 1}`, contract_share: remaining });
  };

  const handleFieldChange = (id: string, field: keyof SimulationProduct, value: number | string | boolean) => {
    updateProduct(id, { [field]: value } as any);
  };

  const activeProducts = products.filter(p => p.is_active);
  const totalShare = activeProducts.reduce((s, p) => s + p.contract_share, 0);
  const shareValid = Math.abs(totalShare - 100) < 0.1;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Caricamento prodotti...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Prodotti Commerciali
          </CardTitle>
          <Button size="sm" onClick={products.length === 0 ? handleCreateFromDefaults : handleCreate} className="gap-1">
            <Plus className="h-4 w-4" />
            Aggiungi Prodotto
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Ogni prodotto definisce margine, clientela, churn e incassi. La quota % indica la ripartizione dei contratti mensili.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nessun prodotto configurato.</p>
            <p className="text-sm mt-1">Crea il primo prodotto per iniziare la simulazione multi-prodotto.</p>
            <Button className="mt-4" onClick={handleCreateFromDefaults}>
              <Plus className="h-4 w-4 mr-2" />
              Crea dai parametri correnti
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={products.map(p => p.id)}>
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                channels={channels}
                globalParams={defaultParams}
                onChange={handleFieldChange}
                onDelete={() => setDeleteTarget(product.id)}
              />
            ))}
          </Accordion>
        )}

        {/* Share validation */}
        {products.length > 0 && (
          <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
            shareValid
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-destructive/10 text-destructive border border-destructive/30'
          }`}>
            {shareValid ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            <div>
              <p className="font-medium">
                Quote prodotti attivi: {totalShare.toFixed(1)}%
                {!shareValid && (totalShare > 100 ? ` (eccesso ${(totalShare - 100).toFixed(1)}%)` : ` (mancano ${(100 - totalShare).toFixed(1)}%)`)}
              </p>
              {!shareValid && <p className="text-xs mt-1 opacity-80">La somma delle quote dei prodotti attivi deve essere 100%.</p>}
            </div>
          </div>
        )}

        {/* Channel-Product congruity validation */}
        {products.length > 0 && channels.length > 0 && (() => {
          const activeChannels = channels.filter((c: any) => c.is_active && c.contract_share > 0);
          const activeProds = products.filter(p => p.is_active);
          const warnings: { type: string; message: string }[] = [];

          activeChannels.forEach((ch: any) => {
            const linkedProds = activeProds.filter(p => p.channel_id === ch.id);
            if (linkedProds.length === 0) return;
            const prodShareSum = linkedProds.reduce((s, p) => s + p.contract_share, 0);
            if (Math.abs(prodShareSum - ch.contract_share) > 0.5) {
              warnings.push({
                type: 'share',
                message: `Canale "${ch.channel_name}": quota canale ${ch.contract_share}% ≠ somma prodotti collegati ${prodShareSum.toFixed(1)}%`,
              });
            }
          });

          activeChannels.forEach((ch: any) => {
            const linkedProds = activeProds.filter(p => p.channel_id === ch.id);
            linkedProds.forEach(p => {
              if (Math.abs(p.activation_rate - ch.activation_rate) > 5) {
                warnings.push({
                  type: 'activation',
                  message: `"${p.name}" → tasso attivazione ${p.activation_rate}% ≠ canale "${ch.channel_name}" ${ch.activation_rate}% (scarto ${Math.abs(p.activation_rate - ch.activation_rate).toFixed(1)}pp)`,
                });
              }
            });
          });

          const unlinkedProds = activeProds.filter(p => !p.channel_id);
          if (unlinkedProds.length > 0 && activeChannels.length > 0) {
            warnings.push({
              type: 'share',
              message: `${unlinkedProds.length} prodott${unlinkedProds.length === 1 ? 'o' : 'i'} senza canale assegnato: ${unlinkedProds.map(p => `"${p.name}"`).join(', ')}`,
            });
          }

          if (warnings.length === 0) return null;

          return (
            <div className="p-3 rounded-lg text-sm border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/20 space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-orange-800 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Incongruenze Canali ↔ Prodotti
              </div>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-orange-700 dark:text-orange-400 pl-6">
                  • {w.message}
                </p>
              ))}
              <p className="text-xs text-orange-600 dark:text-orange-500 pl-6 italic">
                Allinea le quote e i tassi di attivazione per garantire coerenza nella simulazione.
              </p>
            </div>
          );
        })()}

        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Elimina prodotto"
          description="Sei sicuro di voler eliminare questo prodotto? L'operazione non è reversibile."
          confirmLabel="Elimina"
          onConfirm={() => {
            if (deleteTarget) deleteProduct(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
};

// ────────────────────────────────────────────────────
// Single product accordion card
// ────────────────────────────────────────────────────
interface ProductCardProps {
  product: SimulationProduct;
  channels: any[];
  globalParams: RevenueSimulationParams;
  onChange: (id: string, field: keyof SimulationProduct, value: number | string | boolean) => void;
  onDelete: () => void;
}

const ProductCard = ({ product, channels, globalParams, onChange, onDelete }: ProductCardProps) => {
  const id = product.id;
  const marginPerClient = product.ccv_monthly + product.spread_per_kwh * product.avg_monthly_consumption + product.other_services_monthly;
  const linkedChannel = channels.find(c => c.id === product.channel_id);

  // Compute full per-client invoice breakdown
  const kWh = product.avg_monthly_consumption;
  const materiaEnergia = (globalParams.punPerKwh + globalParams.dispacciamentoPerKwh) * kWh;
  const trasporto =
    globalParams.trasportoQuotaFissaAnno / 12 +
    (globalParams.trasportoQuotaPotenzaKwAnno * globalParams.potenzaImpegnataKw) / 12 +
    globalParams.trasportoQuotaEnergiaKwh * kWh;
  const oneriSistema = (globalParams.oneriAsosKwh + globalParams.oneriArimKwh) * kWh;
  const accise = globalParams.acciseKwh * kWh;
  const passantiTotale = materiaEnergia + trasporto + oneriSistema + accise;
  const ccv = product.ccv_monthly;
  const spread = product.spread_per_kwh * kWh;
  const altroServizi = product.other_services_monthly;
  const margineReseller = ccv + spread + altroServizi;
  const imponibile = passantiTotale + margineReseller;
  const ivaPercent = product.iva_percent;
  const iva = imponibile * (ivaPercent / 100);
  const fattura = imponibile + iva;
  const marginePerc = imponibile > 0 ? (margineReseller / imponibile) * 100 : 0;

  return (
    <AccordionItem value={id} className="border rounded-lg mb-3 px-1">
      <AccordionTrigger className="hover:no-underline py-3 px-3">
        <div className="flex items-center gap-3 w-full pr-4">
          <span className="font-medium text-left flex-1">{product.name}</span>
          <Badge variant="outline" className="shrink-0">{product.contract_share}%</Badge>
          {linkedChannel && <Badge variant="secondary" className="shrink-0 text-xs">{linkedChannel.channel_name}</Badge>}
          <Badge className="shrink-0 text-xs">{formatCurrency(marginPerClient)}/mese</Badge>
          {!product.is_active && <Badge variant="destructive" className="shrink-0 text-xs">Inattivo</Badge>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Col 1: Generale + Margine */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Generale</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Nome prodotto</Label>
                <Input value={product.name} onChange={e => onChange(id, 'name', e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quota contratti (%)</Label>
                <Input type="number" min={0} max={100} value={product.contract_share} onChange={e => onChange(id, 'contract_share', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Canale vendita</Label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={product.channel_id || ''}
                  onChange={e => onChange(id, 'channel_id', e.target.value || (null as any))}
                >
                  <option value="">— Nessuno —</option>
                  {channels.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.channel_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={product.is_active} onCheckedChange={v => onChange(id, 'is_active', v)} />
              <Label className="text-xs">Attivo</Label>
            </div>

            <Separator />

            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Margine Reseller</h4>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">CCV (€/mese)</Label>
                <Input type="number" step="0.01" value={product.ccv_monthly} onChange={e => onChange(id, 'ccv_monthly', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Spread su PUN (€/kWh)</Label>
                <Input type="number" step="0.001" value={product.spread_per_kwh} onChange={e => onChange(id, 'spread_per_kwh', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Altri servizi (€/mese)</Label>
                <Input type="number" step="0.01" value={product.other_services_monthly} onChange={e => onChange(id, 'other_services_monthly', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="p-2 bg-primary/10 rounded text-sm">
                <span className="text-xs text-muted-foreground">Margine/cliente/mese: </span>
                <span className="font-bold text-primary">{formatCurrency(marginPerClient)}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Clientela + Churn */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Clientela & Consumo</h4>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo clientela</Label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={product.client_type}
                  onChange={e => {
                    const ct = e.target.value;
                    onChange(id, 'client_type', ct);
                    onChange(id, 'iva_percent', ct === 'domestico' ? 10 : 22);
                  }}
                >
                  <option value="domestico">Domestico (IVA 10%)</option>
                  <option value="business">Business (IVA 22%)</option>
                  <option value="pmi">PMI (IVA 22%)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Consumo medio (kWh/mese)</Label>
                <Input type="number" value={product.avg_monthly_consumption} onChange={e => onChange(id, 'avg_monthly_consumption', parseInt(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tasso attivazione (%)</Label>
                <Input type="number" min={0} max={100} value={product.activation_rate} onChange={e => onChange(id, 'activation_rate', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
            </div>

            <Separator />

            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Switch-out (Churn)</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">1° mese (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={product.churn_month1_pct} onChange={e => onChange(id, 'churn_month1_pct', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">2° mese (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={product.churn_month2_pct} onChange={e => onChange(id, 'churn_month2_pct', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">3° mese (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={product.churn_month3_pct} onChange={e => onChange(id, 'churn_month3_pct', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fattore decadimento</Label>
              <Input type="number" min={0.1} max={1} step={0.05} value={product.churn_decay_factor} onChange={e => onChange(id, 'churn_decay_factor', parseFloat(e.target.value) || 0.85)} className="h-8" />
            </div>
          </div>

          {/* Col 3: Incassi */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Tassi di Incasso</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Alla scadenza (%)</Label>
                <Input type="number" min={0} max={100} value={product.collection_month_0} onChange={e => onChange(id, 'collection_month_0', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entro 30gg (%)</Label>
                <Input type="number" min={0} max={100} value={product.collection_month_1} onChange={e => onChange(id, 'collection_month_1', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entro 60gg (%)</Label>
                <Input type="number" min={0} max={100} value={product.collection_month_2} onChange={e => onChange(id, 'collection_month_2', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Oltre 60gg (%)</Label>
                <Input type="number" min={0} max={100} value={product.collection_month_3_plus} onChange={e => onChange(id, 'collection_month_3_plus', parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Insoluti definitivi (%)</Label>
              <Input type="number" min={0} max={100} value={product.uncollectible_rate} onChange={e => onChange(id, 'uncollectible_rate', parseFloat(e.target.value) || 0)} className="h-8" />
            </div>

            {(() => {
              const total = product.collection_month_0 + product.collection_month_1 + product.collection_month_2 + product.collection_month_3_plus + product.uncollectible_rate;
              const isValid = Math.abs(total - 100) < 0.1;
              return (
                <div className={`p-2 rounded text-xs flex items-center gap-1 ${isValid ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' : 'bg-destructive/10 text-destructive'}`}>
                  {isValid ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  Totale: {total.toFixed(1)}%
                </div>
              );
            })()}

            <Separator />

            <Button variant="destructive" size="sm" className="w-full gap-1" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
              Elimina prodotto
            </Button>
          </div>
        </div>

        {/* ── Dettaglio Fattura Cliente ── */}
        <Separator className="my-4" />
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Fattura Tipo Cliente (mensile)
          </h4>

          {/* Passanti cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 space-y-1">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wide">Materia Energia</p>
              <p className="text-base font-bold">{formatCurrency(materiaEnergia)}</p>
              <p className="text-[10px] text-muted-foreground">(PUN+Disp.) × {kWh} kWh</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 space-y-1">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wide">Trasporto</p>
              <p className="text-base font-bold">{formatCurrency(trasporto)}</p>
              <p className="text-[10px] text-muted-foreground">Fissa+Pot.+Energia</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 space-y-1">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wide">Oneri di Sistema</p>
              <p className="text-base font-bold">{formatCurrency(oneriSistema)}</p>
              <p className="text-[10px] text-muted-foreground">(ASOS+ARIM) × kWh</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 space-y-1">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wide">Accise</p>
              <p className="text-base font-bold">{formatCurrency(accise)}</p>
              <p className="text-[10px] text-muted-foreground">{globalParams.acciseKwh.toFixed(5)} €/kWh</p>
            </div>
          </div>

          {/* Subtotale passanti */}
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/5 border border-secondary/15 rounded-lg text-sm">
            <span className="text-muted-foreground font-medium">Subtotale Passanti (grossista/DSO)</span>
            <span className="font-bold">{formatCurrency(passantiTotale)}</span>
          </div>

          {/* Margine reseller cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border-2 border-primary/30 bg-accent space-y-1">
              <p className="text-[10px] font-bold text-accent-foreground uppercase tracking-wide">CCV</p>
              <p className="text-base font-bold text-primary">{formatCurrency(ccv)}</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-primary/30 bg-accent space-y-1">
              <p className="text-[10px] font-bold text-accent-foreground uppercase tracking-wide">Spread × kWh</p>
              <p className="text-base font-bold text-primary">{formatCurrency(spread)}</p>
            </div>
            <div className="p-3 rounded-lg border-2 border-primary/30 bg-accent space-y-1">
              <p className="text-[10px] font-bold text-accent-foreground uppercase tracking-wide">Altri Servizi</p>
              <p className="text-base font-bold text-primary">{formatCurrency(altroServizi)}</p>
            </div>
          </div>

          {/* Totali */}
          <div className="space-y-2 p-4 rounded-lg bg-card border-2 border-border shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Imponibile</span>
              <span className="font-semibold">{formatCurrency(imponibile)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA ({ivaPercent}%)</span>
              <span className="font-semibold">{formatCurrency(iva)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold pt-1">
              <span>Fattura Totale</span>
              <span>{formatCurrency(fattura)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1">
              <span className="text-primary font-semibold">di cui Margine Reseller</span>
              <span className="text-primary font-bold">{formatCurrency(margineReseller)} ({marginePerc.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
