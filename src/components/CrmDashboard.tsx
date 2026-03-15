import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingDown, CalendarClock, Euro, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface CrmClient {
  id: string;
  project_id: string;
  company_name: string;
  pod_pdr_code: string | null;
  contract_status: string;
  activation_date: string | null;
  annual_consumption_kwh: number;
  monthly_margin: number;
  contract_expiry_date: string | null;
  commodity_type: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CrmDashboardProps {
  projectId: string;
  userId: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  attivo: { label: 'Attivo', className: 'bg-green-600 hover:bg-green-700 text-white border-green-600' },
  sospeso: { label: 'Sospeso', className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' },
  cessato: { label: 'Cessato', className: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' },
};

const EMPTY_FORM = {
  company_name: '',
  pod_pdr_code: '',
  contract_status: 'attivo',
  activation_date: '',
  annual_consumption_kwh: 0,
  monthly_margin: 0,
  contract_expiry_date: '',
  commodity_type: 'luce',
  notes: '',
};

export function CrmDashboard({ projectId, userId }: CrmDashboardProps) {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CrmClient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCommodity, setFilterCommodity] = useState<string>('all');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_clients')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Errore nel caricamento clienti');
      console.error(error);
    } else {
      setClients((data as unknown as CrmClient[]) || []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Filtered clients
  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filterStatus !== 'all' && c.contract_status !== filterStatus) return false;
      if (filterCommodity !== 'all' && c.commodity_type !== filterCommodity) return false;
      return true;
    });
  }, [clients, filterStatus, filterCommodity]);

  // KPIs
  const kpis = useMemo(() => {
    const active = clients.filter(c => c.contract_status === 'attivo');
    const totalMargin = active.reduce((s, c) => s + (c.monthly_margin || 0), 0);
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const churnThisMonth = clients.filter(c =>
      c.contract_status === 'cessato' &&
      c.updated_at?.startsWith(thisMonth)
    ).length;
    const in30Days = addDays(now, 30);
    const expiringSoon = active.filter(c =>
      c.contract_expiry_date &&
      differenceInDays(new Date(c.contract_expiry_date), now) <= 30 &&
      differenceInDays(new Date(c.contract_expiry_date), now) >= 0
    ).length;
    return { activeCount: active.length, totalMargin, churnThisMonth, expiringSoon };
  }, [clients]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);

  const openAddDialog = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (client: CrmClient) => {
    setEditingClient(client);
    setForm({
      company_name: client.company_name,
      pod_pdr_code: client.pod_pdr_code || '',
      contract_status: client.contract_status,
      activation_date: client.activation_date || '',
      annual_consumption_kwh: client.annual_consumption_kwh || 0,
      monthly_margin: client.monthly_margin || 0,
      contract_expiry_date: client.contract_expiry_date || '',
      commodity_type: client.commodity_type || 'luce',
      notes: client.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error('Ragione Sociale obbligatoria');
      return;
    }
    setSaving(true);
    const payload = {
      project_id: projectId,
      company_name: form.company_name.trim(),
      pod_pdr_code: form.pod_pdr_code.trim() || null,
      contract_status: form.contract_status,
      activation_date: form.activation_date || null,
      annual_consumption_kwh: form.annual_consumption_kwh || 0,
      monthly_margin: form.monthly_margin || 0,
      contract_expiry_date: form.contract_expiry_date || null,
      commodity_type: form.commodity_type,
      notes: form.notes.trim() || null,
      created_by: userId,
    };

    if (editingClient) {
      const { error } = await supabase
        .from('crm_clients')
        .update(payload as any)
        .eq('id', editingClient.id);
      if (error) {
        toast.error('Errore aggiornamento cliente');
        console.error(error);
      } else {
        toast.success('Cliente aggiornato');
      }
    } else {
      const { error } = await supabase
        .from('crm_clients')
        .insert(payload as any);
      if (error) {
        toast.error('Errore inserimento cliente');
        console.error(error);
      } else {
        toast.success('Cliente aggiunto');
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    const { error } = await supabase.from('crm_clients').delete().eq('id', id);
    if (error) {
      toast.error('Errore eliminazione');
      console.error(error);
    } else {
      toast.success('Cliente eliminato');
      fetchClients();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM Clienti</h2>
          <p className="text-muted-foreground">Gestione portafoglio clienti</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Aggiungi Cliente
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clienti Attivi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margine Totale Mensile</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.totalMargin)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn del Mese</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.churnThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Scadenza (30gg)</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{kpis.expiringSoon}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Stato:</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="attivo">Attivo</SelectItem>
              <SelectItem value="sospeso">Sospeso</SelectItem>
              <SelectItem value="cessato">Cessato</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Commodity:</Label>
          <Select value={filterCommodity} onValueChange={setFilterCommodity}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="luce">Luce</SelectItem>
              <SelectItem value="gas">Gas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} client{filtered.length !== 1 ? 'i' : 'e'}
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ragione Sociale</TableHead>
                <TableHead>POD/PDR</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data Attivazione</TableHead>
                <TableHead className="text-right">Consumo Annuo kWh</TableHead>
                <TableHead className="text-right">Margine Mensile</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nessun cliente trovato
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(client => {
                  const statusCfg = STATUS_CONFIG[client.contract_status] || STATUS_CONFIG.attivo;
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.company_name}</TableCell>
                      <TableCell className="font-mono text-xs">{client.pod_pdr_code || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {client.activation_date
                          ? format(new Date(client.activation_date), 'dd/MM/yyyy', { locale: it })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {client.annual_consumption_kwh?.toLocaleString('it-IT') || '0'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(client.monthly_margin || 0)}
                      </TableCell>
                      <TableCell>
                        {client.contract_expiry_date
                          ? format(new Date(client.contract_expiry_date), 'dd/MM/yyyy', { locale: it })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(client)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(client.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Modifica Cliente' : 'Aggiungi Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company_name">Ragione Sociale *</Label>
              <Input id="company_name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pod_pdr_code">Codice POD/PDR</Label>
                <Input id="pod_pdr_code" value={form.pod_pdr_code} onChange={e => setForm(f => ({ ...f, pod_pdr_code: e.target.value }))} placeholder="IT001E..." />
              </div>
              <div className="grid gap-2">
                <Label>Commodity</Label>
                <Select value={form.commodity_type} onValueChange={v => setForm(f => ({ ...f, commodity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="luce">Luce</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Stato Contratto</Label>
                <Select value={form.contract_status} onValueChange={v => setForm(f => ({ ...f, contract_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attivo">Attivo</SelectItem>
                    <SelectItem value="sospeso">Sospeso</SelectItem>
                    <SelectItem value="cessato">Cessato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="activation_date">Data Attivazione</Label>
                <Input id="activation_date" type="date" value={form.activation_date} onChange={e => setForm(f => ({ ...f, activation_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="annual_consumption_kwh">Consumo Annuo (kWh)</Label>
                <Input id="annual_consumption_kwh" type="number" value={form.annual_consumption_kwh} onChange={e => setForm(f => ({ ...f, annual_consumption_kwh: Number(e.target.value) }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="monthly_margin">Margine Mensile (€)</Label>
                <Input id="monthly_margin" type="number" step="0.01" value={form.monthly_margin} onChange={e => setForm(f => ({ ...f, monthly_margin: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contract_expiry_date">Scadenza Contratto</Label>
              <Input id="contract_expiry_date" type="date" value={form.contract_expiry_date} onChange={e => setForm(f => ({ ...f, contract_expiry_date: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingClient ? 'Salva Modifiche' : 'Aggiungi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
