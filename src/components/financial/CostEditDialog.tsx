import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectCost } from '@/hooks/useProjectFinancials';

interface CostEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCost: ProjectCost | null;
  categories: { id: string; name: string; type: string }[];
  projectId: string;
  onSubmit: (data: any, isEdit: boolean, editId?: string) => Promise<void>;
}

const COST_TYPE_OPTIONS = [
  { value: 'direct', label: 'Gestionale', description: 'Software, personale, assistenza clienti, SII' },
  { value: 'commercial', label: 'Commerciale', description: 'Acquisizione clienti, agenti, marketing, provvigioni' },
  { value: 'structural', label: 'Infrastruttura', description: 'Ufficio, licenze, garanzie, consulenze, setup' },
];

export const CostEditDialog = ({ open, onOpenChange, editingCost, categories, projectId, onSubmit }: CostEditDialogProps) => {
  const [formData, setFormData] = useState<any>({
    name: '', description: '', amount: '', quantity: 1, unit: 'unità',
    cost_type: 'direct', category_id: '', is_recurring: false, recurrence_period: '', date: '', notes: '',
  });

  useEffect(() => {
    if (editingCost && open) {
      setFormData({
        name: editingCost.name,
        description: editingCost.description || '',
        amount: editingCost.amount,
        quantity: editingCost.quantity,
        unit: editingCost.unit,
        cost_type: editingCost.cost_type,
        category_id: editingCost.category_id || '',
        is_recurring: editingCost.is_recurring,
        recurrence_period: editingCost.recurrence_period || '',
        date: editingCost.date || '',
        notes: editingCost.notes || '',
      });
    } else if (!editingCost && open) {
      setFormData({
        name: '', description: '', amount: '', quantity: 1, unit: 'unità',
        cost_type: 'direct', category_id: '', is_recurring: false, recurrence_period: '', date: '', notes: '',
      });
    }
  }, [editingCost, open]);

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const costData = {
      project_id: projectId,
      name: formData.name,
      description: formData.description || null,
      amount: parseFloat(formData.amount) || 0,
      quantity: parseFloat(formData.quantity) || 1,
      unit: formData.unit || 'unità',
      cost_type: formData.cost_type,
      category_id: formData.category_id || null,
      is_recurring: formData.is_recurring,
      recurrence_period: formData.is_recurring ? formData.recurrence_period : null,
      date: formData.date || null,
      notes: formData.notes || null,
      created_by: user.id,
    };
    await onSubmit(costData, !!editingCost, editingCost?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCost ? 'Modifica' : 'Aggiungi'} Voce di Costo</DialogTitle>
          <DialogDescription>Inserisci i dettagli della voce di costo</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-name">Nome *</Label>
              <Input id="cost-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="es. Software gestionale" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-type">Tipo Costo *</Label>
              <Select value={formData.cost_type} onValueChange={(value) => setFormData({ ...formData, cost_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-amount">Importo (€) *</Label>
              <Input id="cost-amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-qty">Quantità</Label>
              <Input id="cost-qty" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-unit">Unità</Label>
              <Input id="cost-unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-desc">Descrizione</Label>
            <Textarea id="cost-desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-date">Data</Label>
              <Input id="cost-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch id="cost-recurring" checked={formData.is_recurring} onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })} />
              <Label htmlFor="cost-recurring">Costo ricorrente</Label>
            </div>
          </div>
          {formData.is_recurring && (
            <div className="space-y-2">
              <Label>Periodicità</Label>
              <Select value={formData.recurrence_period} onValueChange={(value) => setFormData({ ...formData, recurrence_period: value })}>
                <SelectTrigger><SelectValue placeholder="Seleziona periodicità" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensile</SelectItem>
                  <SelectItem value="quarterly">Trimestrale</SelectItem>
                  <SelectItem value="yearly">Annuale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cost-notes">Note</Label>
            <Textarea id="cost-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.amount}>{editingCost ? 'Salva Modifiche' : 'Aggiungi Costo'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
