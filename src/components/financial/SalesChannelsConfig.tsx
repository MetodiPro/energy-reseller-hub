import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Phone, 
  Globe, 
  Store, 
  UserPlus, 
  Plus, 
  Trash2, 
  Percent,
  Euro,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useSalesChannels, SalesChannel, PREDEFINED_CHANNELS } from '@/hooks/useSalesChannels';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SalesChannelsConfigProps {
  projectId: string | null;
  onChannelChange?: () => void;
}

const getChannelIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('agent')) return Users;
  if (lowerName.includes('call')) return Phone;
  if (lowerName.includes('web') || lowerName.includes('online')) return Globe;
  if (lowerName.includes('sportel')) return Store;
  if (lowerName.includes('referral')) return UserPlus;
  return Users;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const SalesChannelsConfig = ({ projectId, onChannelChange }: SalesChannelsConfigProps) => {
  const {
    channels,
    loading,
    initializePredefinedChannels,
    addChannel,
    updateChannel,
    deleteChannel,
    getWeightedActivationRate,
  } = useSalesChannels(projectId);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChannel, setNewChannel] = useState<{
    channel_name: string;
    commission_amount: number;
    commission_type: 'per_contract' | 'per_activation';
    activation_rate: number;
    contract_share: number;
  }>({
    channel_name: '',
    commission_amount: 50,
    commission_type: 'per_activation',
    activation_rate: 85,
    contract_share: 0,
  });

  // Check if total share is 100%
  const totalShare = channels.reduce((sum, c) => c.is_active ? sum + c.contract_share : sum, 0);
  const shareValid = Math.abs(totalShare - 100) < 0.01;

  const handleInitialize = async () => {
    await initializePredefinedChannels();
    onChannelChange?.();
  };

  const handleAddChannel = async () => {
    if (!newChannel.channel_name.trim()) return;

    await addChannel({
      channel_name: newChannel.channel_name,
      channel_type: 'custom',
      commission_amount: newChannel.commission_amount,
      commission_type: newChannel.commission_type,
      activation_rate: newChannel.activation_rate,
      contract_share: newChannel.contract_share,
      is_active: true,
      notes: null,
    });

    setNewChannel({
      channel_name: '',
      commission_amount: 50,
      commission_type: 'per_activation',
      activation_rate: 85,
      contract_share: 0,
    });
    setShowAddDialog(false);
    onChannelChange?.();
  };

  const handleShareChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateChannel(id, { contract_share: Math.min(100, Math.max(0, numValue)) }).then(() => onChannelChange?.());
  };

  const handleCommissionChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateChannel(id, { commission_amount: Math.max(0, numValue) }).then(() => onChannelChange?.());
  };

  const handleActivationRateChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateChannel(id, { activation_rate: Math.min(100, Math.max(0, numValue)) }).then(() => onChannelChange?.());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (channels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Canali di Vendita
          </CardTitle>
          <CardDescription>
            Configura i canali di acquisizione clienti con relative commissioni e tassi di attivazione
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nessun canale configurato</h3>
          <p className="text-muted-foreground mb-6">
            Inizia con i canali predefiniti o aggiungi i tuoi canali personalizzati
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleInitialize}>
              <Plus className="h-4 w-4 mr-2" />
              Inizializza Canali Predefiniti
            </Button>
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              Aggiungi Canale Custom
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weightedRate = getWeightedActivationRate();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Canali di Vendita
            </CardTitle>
            <CardDescription>
              Configura commissioni e tassi di attivazione per ogni canale
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Canale
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Canale di Vendita</DialogTitle>
                <DialogDescription>
                  Crea un nuovo canale con commissioni e tasso di attivazione personalizzati
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome Canale</Label>
                  <Input
                    value={newChannel.channel_name}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, channel_name: e.target.value }))}
                    placeholder="Es. Partner Locali"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commissione (€)</Label>
                    <Input
                      type="number"
                      value={newChannel.commission_amount}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, commission_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pagamento</Label>
                    <Select
                      value={newChannel.commission_type}
                      onValueChange={(v) => setNewChannel(prev => ({ ...prev, commission_type: v as 'per_contract' | 'per_activation' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_contract">A contratto</SelectItem>
                        <SelectItem value="per_activation">Ad attivazione</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tasso Attivazione (%)</Label>
                    <Input
                      type="number"
                      value={newChannel.activation_rate}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, activation_rate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>% Contratti</Label>
                    <Input
                      type="number"
                      value={newChannel.contract_share}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, contract_share: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annulla
                </Button>
                <Button onClick={handleAddChannel} disabled={!newChannel.channel_name.trim()}>
                  Aggiungi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Alert */}
        {!shareValid && channels.some(c => c.is_active) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attenzione:</strong> La somma delle quote dei canali attivi è {totalShare.toFixed(0)}% (deve essere esattamente 100%). Il simulatore distribuirà i contratti in modo errato finché non correggi questa configurazione.
              {totalShare > 100 && (
                <span className="block mt-1 text-xs">Riduci la quota di {(totalShare - 100).toFixed(0)}% su uno o più canali.</span>
              )}
              {totalShare < 100 && (
                <span className="block mt-1 text-xs">Aggiungi {(100 - totalShare).toFixed(0)}% su uno o più canali, o disattiva i canali non utilizzati.</span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  const activeChannels = channels.filter(c => c.is_active);
                  if (activeChannels.length === 0) return;
                  const sharePerChannel = Math.floor(100 / activeChannels.length);
                  const remainder = 100 - (sharePerChannel * activeChannels.length);
                  for (let i = 0; i < activeChannels.length; i++) {
                    const share = i === 0 ? sharePerChannel + remainder : sharePerChannel;
                    await updateChannel(activeChannels[i].id, { contract_share: share });
                  }
                  onChannelChange?.();
                }}
              >
                Auto-bilancia (distribuzione equa)
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {shareValid && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <span>Tasso di attivazione medio ponderato: <strong>{weightedRate.toFixed(1)}%</strong></span>
              <Badge variant="outline" className="text-green-600">Configurazione valida</Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Channels Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canale</TableHead>
                <TableHead className="text-center">Attivo</TableHead>
                <TableHead className="text-right">% Contratti</TableHead>
                <TableHead className="text-right">Commissione</TableHead>
                <TableHead className="text-center">Pagamento</TableHead>
                <TableHead className="text-right">Tasso Attiv.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((channel) => {
                const IconComponent = getChannelIcon(channel.channel_name);
                return (
                  <TableRow key={channel.id} className={!channel.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{channel.channel_name}</span>
                        {channel.channel_type === 'custom' && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={channel.is_active}
                        onCheckedChange={(checked) => updateChannel(channel.id, { is_active: checked }).then(() => onChannelChange?.())}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={channel.contract_share}
                          onChange={(e) => handleShareChange(channel.id, e.target.value)}
                          className="w-16 text-right h-8"
                          disabled={!channel.is_active}
                        />
                        <Percent className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        <Input
                          type="number"
                          value={channel.commission_amount}
                          onChange={(e) => handleCommissionChange(channel.id, e.target.value)}
                          className="w-20 text-right h-8"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Select
                        value={channel.commission_type}
                        onValueChange={(v) => updateChannel(channel.id, { commission_type: v as 'per_contract' | 'per_activation' }).then(() => onChannelChange?.())}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_contract">A contratto</SelectItem>
                          <SelectItem value="per_activation">Ad attivazione</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={channel.activation_rate}
                          onChange={(e) => handleActivationRateChange(channel.id, e.target.value)}
                          className="w-16 text-right h-8"
                        />
                        <Percent className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {channel.channel_type === 'custom' && (
                        <Button
                          variant="ghost"
                          size="icon"
                           className="h-8 w-8 text-destructive hover:text-destructive"
                           onClick={() => deleteChannel(channel.id).then(() => onChannelChange?.())}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
