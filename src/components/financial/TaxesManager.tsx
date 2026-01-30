import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Receipt,
  FileSpreadsheet,
  Calculator,
  Building,
  Landmark,
  Info,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { standardTaxTemplates, TaxTemplateItem } from '@/data/costTemplates';

interface ProjectTax {
  id: string;
  project_id: string;
  tax_type: string;
  name: string;
  description: string | null;
  recipient: string;
  rate_type: 'percentage' | 'per_unit' | 'fixed';
  rate_value: number;
  rate_unit: string | null;
  base_amount: number;
  base_unit: string | null;
  calculated_amount: number;
  is_recurring: boolean;
  recurrence_period: string | null;
  due_day: number | null;
  is_active: boolean;
  notes: string | null;
  calculation_hypothesis: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TaxesManagerProps {
  projectId: string;
}

const TAX_TYPE_OPTIONS = [
  { value: 'accise_energia', label: 'Accise Energia Elettrica', recipient: 'ADM' },
  { value: 'accise_gas', label: 'Accise Gas Naturale', recipient: 'ADM' },
  { value: 'addizionali_comunali', label: 'Addizionali Comunali', recipient: 'Comuni' },
  { value: 'addizionali_regionali', label: 'Addizionali Regionali', recipient: 'Regioni' },
  { value: 'iva', label: 'IVA', recipient: 'Erario' },
  { value: 'csea', label: 'Contributi CSEA', recipient: 'CSEA' },
  { value: 'arera', label: 'Contributo ARERA', recipient: 'ARERA' },
  { value: 'oneri_sistema', label: 'Oneri di Sistema', recipient: 'CSEA/Sistema' },
  { value: 'altro', label: 'Altra Imposta', recipient: '' },
];

const RATE_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentuale', unit: '%' },
  { value: 'per_unit', label: 'Per Unità', unit: '€/unità' },
  { value: 'fixed', label: 'Importo Fisso', unit: '€' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

const getRecipientIcon = (recipient: string) => {
  if (recipient.includes('ADM') || recipient.includes('Erario')) return Landmark;
  if (recipient.includes('CSEA') || recipient.includes('ARERA')) return FileSpreadsheet;
  if (recipient.includes('Comuni') || recipient.includes('Regioni')) return Building;
  return Receipt;
};

export const TaxesManager = ({ projectId }: TaxesManagerProps) => {
  const [taxes, setTaxes] = useState<ProjectTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<ProjectTax | null>(null);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();

  const fetchTaxes = async () => {
    const { data, error } = await supabase
      .from('project_taxes')
      .select('*')
      .eq('project_id', projectId)
      .order('tax_type', { ascending: true });

    if (error) {
      console.error('Error fetching taxes:', error);
      return;
    }

    setTaxes(data as unknown as ProjectTax[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTaxes();
  }, [projectId]);

  const resetForm = () => {
    setFormData({
      tax_type: 'accise_energia',
      name: '',
      description: '',
      recipient: 'ADM',
      rate_type: 'per_unit',
      rate_value: 0,
      rate_unit: '€/kWh',
      base_amount: 0,
      base_unit: 'kWh/mese',
      is_recurring: true,
      recurrence_period: 'monthly',
      due_day: 16,
      is_active: true,
      notes: '',
      calculation_hypothesis: '',
    });
    setEditingTax(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (tax: ProjectTax) => {
    setEditingTax(tax);
    setFormData({
      tax_type: tax.tax_type,
      name: tax.name,
      description: tax.description || '',
      recipient: tax.recipient,
      rate_type: tax.rate_type,
      rate_value: tax.rate_value,
      rate_unit: tax.rate_unit || '',
      base_amount: tax.base_amount,
      base_unit: tax.base_unit || '',
      is_recurring: tax.is_recurring,
      recurrence_period: tax.recurrence_period || 'monthly',
      due_day: tax.due_day || 16,
      is_active: tax.is_active,
      notes: tax.notes || '',
      calculation_hypothesis: tax.calculation_hypothesis || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const taxData = {
      project_id: projectId,
      tax_type: formData.tax_type,
      name: formData.name || TAX_TYPE_OPTIONS.find(t => t.value === formData.tax_type)?.label || '',
      description: formData.description || null,
      recipient: formData.recipient,
      rate_type: formData.rate_type,
      rate_value: parseFloat(formData.rate_value) || 0,
      rate_unit: formData.rate_unit || null,
      base_amount: parseFloat(formData.base_amount) || 0,
      base_unit: formData.base_unit || null,
      is_recurring: formData.is_recurring,
      recurrence_period: formData.is_recurring ? formData.recurrence_period : null,
      due_day: formData.due_day ? parseInt(formData.due_day) : null,
      is_active: formData.is_active,
      notes: formData.notes || null,
      calculation_hypothesis: formData.calculation_hypothesis || null,
      created_by: user.id,
    };

    if (editingTax) {
      const { error } = await supabase
        .from('project_taxes')
        .update(taxData)
        .eq('id', editingTax.id);

      if (error) {
        toast({ title: 'Errore', description: 'Impossibile aggiornare l\'imposta', variant: 'destructive' });
        return;
      }
      toast({ title: 'Imposta aggiornata', description: 'La voce è stata modificata' });
    } else {
      const { error } = await supabase
        .from('project_taxes')
        .insert(taxData);

      if (error) {
        toast({ title: 'Errore', description: 'Impossibile aggiungere l\'imposta', variant: 'destructive' });
        return;
      }
      toast({ title: 'Imposta aggiunta', description: 'La voce è stata salvata' });
    }

    setIsDialogOpen(false);
    resetForm();
    fetchTaxes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa imposta?')) return;

    const { error } = await supabase
      .from('project_taxes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Errore', description: 'Impossibile eliminare l\'imposta', variant: 'destructive' });
      return;
    }

    toast({ title: 'Imposta eliminata', description: 'La voce è stata rimossa' });
    fetchTaxes();
  };

  const loadStandardTaxes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const taxesToInsert = standardTaxTemplates.map(tax => ({
      project_id: projectId,
      tax_type: tax.tax_type,
      name: tax.name,
      description: tax.description,
      recipient: tax.recipient,
      rate_type: tax.rate_type,
      rate_value: tax.rate_value,
      rate_unit: tax.rate_unit,
      base_amount: tax.base_amount,
      base_unit: tax.base_unit,
      is_recurring: tax.is_recurring,
      recurrence_period: tax.recurrence_period,
      calculation_hypothesis: tax.calculation_hypothesis,
      created_by: user.id,
    }));

    const { error } = await supabase
      .from('project_taxes')
      .insert(taxesToInsert);

    if (error) {
      toast({ title: 'Errore', description: 'Impossibile caricare le imposte standard', variant: 'destructive' });
      return;
    }

    toast({ title: 'Imposte caricate', description: `${standardTaxTemplates.length} voci aggiunte` });
    fetchTaxes();
  };

  const totalTaxes = taxes
    .filter(t => t.is_active)
    .reduce((sum, t) => sum + (t.calculated_amount || 0), 0);

  const taxesByRecipient = taxes.reduce((acc, tax) => {
    if (!tax.is_active) return acc;
    const recipient = tax.recipient;
    if (!acc[recipient]) acc[recipient] = { total: 0, items: [] };
    acc[recipient].total += tax.calculated_amount || 0;
    acc[recipient].items.push(tax);
    return acc;
  }, {} as Record<string, { total: number; items: ProjectTax[] }>);

  const handleTaxTypeChange = (value: string) => {
    const taxType = TAX_TYPE_OPTIONS.find(t => t.value === value);
    const template = standardTaxTemplates.find(t => t.tax_type === value);
    
    setFormData({
      ...formData,
      tax_type: value,
      name: template?.name || taxType?.label || '',
      recipient: taxType?.recipient || '',
      rate_type: template?.rate_type || 'per_unit',
      rate_value: template?.rate_value || 0,
      rate_unit: template?.rate_unit || '',
      base_unit: template?.base_unit || '',
      calculation_hypothesis: template?.calculation_hypothesis || '',
    });
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-600" />
            Imposte e Tasse
          </CardTitle>
          <CardDescription>
            Gestione accise, IVA, addizionali e contributi obbligatori
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {taxes.length === 0 && (
            <Button variant="outline" onClick={loadStandardTaxes}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Carica Standard
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Imposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTax ? 'Modifica' : 'Aggiungi'} Imposta
                </DialogTitle>
                <DialogDescription>
                  Configura i parametri di calcolo dell'imposta
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo Imposta *</Label>
                    <Select
                      value={formData.tax_type}
                      onValueChange={handleTaxTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Destinatario *</Label>
                    <Input
                      value={formData.recipient}
                      onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                      placeholder="Es. ADM, Erario, Comune..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome Imposta</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome descrittivo"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo Calcolo *</Label>
                    <Select
                      value={formData.rate_type}
                      onValueChange={(value) => setFormData({ ...formData, rate_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATE_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Aliquota/Importo *</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.rate_value}
                      onChange={(e) => setFormData({ ...formData, rate_value: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Unità</Label>
                    <Input
                      value={formData.rate_unit}
                      onChange={(e) => setFormData({ ...formData, rate_unit: e.target.value })}
                      placeholder="€/kWh, %, €..."
                    />
                  </div>
                </div>

                {formData.rate_type !== 'fixed' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Base di Calcolo</Label>
                      <Input
                        type="number"
                        value={formData.base_amount}
                        onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
                        placeholder="Valore base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unità Base</Label>
                      <Input
                        value={formData.base_unit}
                        onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                        placeholder="kWh/mese, €, Smc..."
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                    />
                    <Label>Ricorrente</Label>
                  </div>
                  
                  {formData.is_recurring && (
                    <Select
                      value={formData.recurrence_period}
                      onValueChange={(value) => setFormData({ ...formData, recurrence_period: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensile</SelectItem>
                        <SelectItem value="quarterly">Trimestrale</SelectItem>
                        <SelectItem value="yearly">Annuale</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Attiva</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Ipotesi di Calcolo
                  </Label>
                  <Textarea
                    value={formData.calculation_hypothesis}
                    onChange={(e) => setFormData({ ...formData, calculation_hypothesis: e.target.value })}
                    placeholder="Spiega come è stato stimato questo valore (es. 500 clienti × 300 kWh/mese × €0,0227/kWh)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Note Aggiuntive</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Note, riferimenti normativi, scadenze..."
                    rows={2}
                  />
                </div>

                {/* Preview calculated amount */}
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Importo Calcolato:</span>
                    <span className="text-lg font-bold text-amber-600">
                      {formatCurrency(
                        formData.rate_type === 'percentage' 
                          ? (parseFloat(formData.base_amount) || 0) * (parseFloat(formData.rate_value) || 0) / 100
                          : formData.rate_type === 'per_unit'
                          ? (parseFloat(formData.base_amount) || 0) * (parseFloat(formData.rate_value) || 0)
                          : parseFloat(formData.rate_value) || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.recipient}>
                  {editingTax ? 'Salva Modifiche' : 'Aggiungi'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {taxes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna imposta configurata</p>
            <p className="text-sm">Clicca "Carica Standard" per importare le imposte tipiche del settore energia</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary by recipient */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(taxesByRecipient).map(([recipient, data]) => {
                const Icon = getRecipientIcon(recipient);
                return (
                  <div key={recipient} className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{recipient}</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(data.total)}</p>
                    <p className="text-xs text-muted-foreground">{data.items.length} voci</p>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="font-medium">Totale Imposte e Tasse (periodo)</span>
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatCurrency(totalTaxes)}
              </span>
            </div>

            {/* Detailed accordion */}
            <Accordion type="multiple" className="w-full">
              {Object.entries(taxesByRecipient).map(([recipient, data]) => (
                <AccordionItem key={recipient} value={recipient}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>{recipient}</span>
                      <Badge variant="secondary">{formatCurrency(data.total)}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imposta</TableHead>
                          <TableHead>Formula</TableHead>
                          <TableHead>Periodicità</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map(tax => (
                          <TableRow key={tax.id} className={!tax.is_active ? 'opacity-50' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{tax.name}</p>
                                {tax.calculation_hypothesis && (
                                  <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={tax.calculation_hypothesis}>
                                    <Info className="h-3 w-3 inline mr-1" />
                                    {tax.calculation_hypothesis}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {tax.rate_type === 'fixed' 
                                  ? `${tax.rate_value} ${tax.rate_unit || '€'}`
                                  : tax.rate_type === 'percentage'
                                  ? `${tax.base_amount} ${tax.base_unit} × ${tax.rate_value}%`
                                  : `${tax.base_amount} ${tax.base_unit} × ${tax.rate_value} ${tax.rate_unit}`
                                }
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tax.recurrence_period === 'monthly' ? 'Mensile' :
                                 tax.recurrence_period === 'quarterly' ? 'Trimestrale' :
                                 tax.recurrence_period === 'yearly' ? 'Annuale' : 'Una tantum'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(tax.calculated_amount || 0)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(tax)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(tax.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Warning about passthrough */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">Nota importante</p>
                <p className="text-blue-700 dark:text-blue-400">
                  Queste imposte sono generalmente "passanti": vengono incassate dai clienti in bolletta 
                  e versate agli enti competenti. Non costituiscono un costo netto per il reseller, 
                  ma è fondamentale gestirne correttamente il flusso di cassa e le scadenze di versamento.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
