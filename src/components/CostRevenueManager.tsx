import { useState } from 'react';
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
import { 
  Plus, 
  Trash2, 
  Edit, 
  TrendingDown, 
  TrendingUp,
  Package,
  Users,
  Megaphone,
  Building,
  MoreHorizontal
} from 'lucide-react';
import { ProjectCost, ProjectRevenue, CostCategory } from '@/hooks/useProjectFinancials';
import { supabase } from '@/integrations/supabase/client';

interface CostRevenueManagerProps {
  type: 'costs' | 'revenues';
  projectId: string;
  items: ProjectCost[] | ProjectRevenue[];
  categories: CostCategory[];
  onAdd: (item: any) => Promise<any>;
  onUpdate: (id: string, updates: any) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const COST_TYPE_OPTIONS = [
  { value: 'direct', label: 'Diretto', description: 'Collegato direttamente al progetto' },
  { value: 'indirect', label: 'Indiretto', description: 'Non direttamente collegato' },
  { value: 'commercial', label: 'Commerciale', description: 'Marketing e vendite' },
  { value: 'structural', label: 'Strutturale', description: 'Costi fissi aziendali' },
];

const REVENUE_TYPE_OPTIONS = [
  { value: 'one_time', label: 'Una Tantum', description: 'Pagamento unico' },
  { value: 'recurring', label: 'Ricorrente', description: 'Pagamento periodico' },
  { value: 'milestone', label: 'Milestone', description: 'Pagamento a traguardi' },
];

const REVENUE_STATUS_OPTIONS = [
  { value: 'expected', label: 'Previsto', color: 'secondary' },
  { value: 'invoiced', label: 'Fatturato', color: 'default' },
  { value: 'received', label: 'Incassato', color: 'outline' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

export const CostRevenueManager = ({
  type,
  projectId,
  items,
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: CostRevenueManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectCost | ProjectRevenue | null>(null);
  const [formData, setFormData] = useState<any>({});

  const isCosts = type === 'costs';
  const title = isCosts ? 'Gestione Costi' : 'Gestione Ricavi';
  const description = isCosts 
    ? 'Inserisci e gestisci le voci di costo del progetto' 
    : 'Inserisci e gestisci le voci di ricavo del progetto';

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: '',
      quantity: 1,
      unit: 'unità',
      cost_type: 'direct',
      category_id: '',
      is_recurring: false,
      recurrence_period: '',
      date: '',
      notes: '',
      revenue_type: 'one_time',
      status: 'expected',
    });
    setEditingItem(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: ProjectCost | ProjectRevenue) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      amount: item.amount,
      quantity: item.quantity,
      unit: item.unit,
      date: item.date || '',
      notes: item.notes || '',
      ...(isCosts && 'cost_type' in item ? {
        cost_type: item.cost_type,
        category_id: item.category_id || '',
        is_recurring: item.is_recurring,
        recurrence_period: item.recurrence_period || '',
      } : {}),
      ...(!isCosts && 'revenue_type' in item ? {
        revenue_type: item.revenue_type,
        status: item.status,
        recurrence_period: item.recurrence_period || '',
      } : {}),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const baseData = {
      project_id: projectId,
      name: formData.name,
      description: formData.description || null,
      amount: parseFloat(formData.amount) || 0,
      quantity: parseFloat(formData.quantity) || 1,
      unit: formData.unit || 'unità',
      date: formData.date || null,
      notes: formData.notes || null,
      created_by: user.id,
    };

    if (isCosts) {
      const costData = {
        ...baseData,
        cost_type: formData.cost_type,
        category_id: formData.category_id || null,
        is_recurring: formData.is_recurring,
        recurrence_period: formData.is_recurring ? formData.recurrence_period : null,
      };

      if (editingItem) {
        await onUpdate(editingItem.id, costData);
      } else {
        await onAdd(costData);
      }
    } else {
      const revenueData = {
        ...baseData,
        revenue_type: formData.revenue_type,
        status: formData.status,
        recurrence_period: formData.revenue_type === 'recurring' ? formData.recurrence_period : null,
      };

      if (editingItem) {
        await onUpdate(editingItem.id, revenueData);
      } else {
        await onAdd(revenueData);
      }
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa voce?')) {
      await onDelete(id);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const getCostTypeBadge = (costType: string) => {
    const typeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      direct: { label: 'Diretto', variant: 'default' },
      indirect: { label: 'Indiretto', variant: 'secondary' },
      commercial: { label: 'Commerciale', variant: 'outline' },
      structural: { label: 'Strutturale', variant: 'destructive' },
    };
    const config = typeConfig[costType] || { label: costType, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = REVENUE_STATUS_OPTIONS.find(s => s.value === status);
    return <Badge variant={statusConfig?.color as any || 'secondary'}>{statusConfig?.label || status}</Badge>;
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {isCosts ? <TrendingDown className="h-5 w-5 text-destructive" /> : <TrendingUp className="h-5 w-5 text-green-600" />}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi {isCosts ? 'Costo' : 'Ricavo'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Modifica' : 'Aggiungi'} {isCosts ? 'Voce di Costo' : 'Voce di Ricavo'}
              </DialogTitle>
              <DialogDescription>
                Inserisci i dettagli della voce
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isCosts ? 'es. Pannelli solari' : 'es. Vendita impianto'}
                  />
                </div>
                
                {isCosts && (
                  <div className="space-y-2">
                    <Label htmlFor="cost_type">Tipo Costo *</Label>
                    <Select
                      value={formData.cost_type}
                      onValueChange={(value) => setFormData({ ...formData, cost_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COST_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div>{option.label}</div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!isCosts && (
                  <div className="space-y-2">
                    <Label htmlFor="revenue_type">Tipo Ricavo *</Label>
                    <Select
                      value={formData.revenue_type}
                      onValueChange={(value) => setFormData({ ...formData, revenue_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REVENUE_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div>{option.label}</div>
                              <div className="text-xs text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Importo (€) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantità</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unità</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="es. pz, ore, m²"
                  />
                </div>
              </div>

              {isCosts && (
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(c => c.type === formData.cost_type)
                        .map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isCosts && (
                <div className="space-y-2">
                  <Label htmlFor="status">Stato</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REVENUE_STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione opzionale"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                
                {isCosts && (
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                    />
                    <Label htmlFor="is_recurring">Costo ricorrente</Label>
                  </div>
                )}
              </div>

              {(formData.is_recurring || formData.revenue_type === 'recurring') && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_period">Periodicità</Label>
                  <Select
                    value={formData.recurrence_period}
                    onValueChange={(value) => setFormData({ ...formData, recurrence_period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona periodicità" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensile</SelectItem>
                      <SelectItem value="quarterly">Trimestrale</SelectItem>
                      <SelectItem value="yearly">Annuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name || !formData.amount}>
                {editingItem ? 'Salva Modifiche' : 'Aggiungi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna voce registrata</p>
            <p className="text-sm">Clicca "Aggiungi" per inserire la prima voce</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  {isCosts && <TableHead>Categoria</TableHead>}
                  {!isCosts && <TableHead>Stato</TableHead>}
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Qtà</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="w-[100px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isCosts && 'cost_type' in item 
                        ? getCostTypeBadge(item.cost_type)
                        : !isCosts && 'revenue_type' in item
                        ? <Badge variant="secondary">{REVENUE_TYPE_OPTIONS.find(r => r.value === item.revenue_type)?.label}</Badge>
                        : '-'
                      }
                    </TableCell>
                    {isCosts && <TableCell>{getCategoryName((item as ProjectCost).category_id)}</TableCell>}
                    {!isCosts && <TableCell>{getStatusBadge((item as ProjectRevenue).status)}</TableCell>}
                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Totale</div>
                <div className={`text-2xl font-bold ${isCosts ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
