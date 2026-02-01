import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Building2, 
  Calendar as CalendarIcon, 
  MapPin, 
  Phone, 
  Shield, 
  Zap, 
  Edit, 
  Save, 
  X,
  TrendingUp,
  Users,
  FileCheck,
  Flame,
  Plug
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  market_type: string | null;
  commodity_type: string | null;
  expected_volumes: number | null;
  regions: string[] | null;
  wholesaler_name: string | null;
  wholesaler_contact: string | null;
  eve_license_date: string | null;
  evg_license_date: string | null;
  arera_code: string | null;
  go_live_date: string | null;
  created_at: string;
}

interface ProjectOverviewProps {
  project: Project | null;
  onProjectUpdate: (project: Project) => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  draft: { label: 'Bozza', color: 'text-muted-foreground', bgColor: 'bg-muted', description: 'Progetto in fase di definizione iniziale' },
  in_authorization: { label: 'In Autorizzazione', color: 'text-blue-500', bgColor: 'bg-blue-500/10', description: 'In attesa di licenze e autorizzazioni' },
  setup: { label: 'In Setup', color: 'text-warning', bgColor: 'bg-warning/10', description: 'Configurazione sistemi e procedure' },
  active: { label: 'Attivo', color: 'text-success', bgColor: 'bg-success/10', description: 'Progetto operativo e funzionante' },
  operational: { label: 'Operativo', color: 'text-emerald-600', bgColor: 'bg-emerald-600/10', description: 'Piena operatività commerciale' },
  paused: { label: 'In Pausa', color: 'text-orange-500', bgColor: 'bg-orange-500/10', description: 'Temporaneamente sospeso' },
  suspended: { label: 'Sospeso', color: 'text-red-500', bgColor: 'bg-red-500/10', description: 'Sospeso per motivi regolatori o altri' },
  closed: { label: 'Chiuso', color: 'text-destructive', bgColor: 'bg-destructive/10', description: 'Progetto terminato definitivamente' },
};

const marketTypeLabels: Record<string, string> = {
  residential: 'Residenziale',
  business: 'Business',
  mixed: 'Misto',
};

const commodityTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'solo-luce': { label: 'Solo Energia Elettrica', icon: Zap, color: 'text-yellow-500' },
  'solo-gas': { label: 'Solo Gas Naturale', icon: Flame, color: 'text-orange-500' },
  'dual-fuel': { label: 'Luce + Gas (Dual Fuel)', icon: Plug, color: 'text-purple-500' },
};

const italianRegions = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia',
  'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
];

export const ProjectOverview = ({ project, onProjectUpdate }: ProjectOverviewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({});

  if (!project) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nessun progetto selezionato</h3>
        <p className="text-muted-foreground">Seleziona o crea un progetto per visualizzare i dettagli</p>
      </Card>
    );
  }

  const startEditing = () => {
    setFormData({
      status: project.status,
      market_type: project.market_type,
      expected_volumes: project.expected_volumes,
      regions: project.regions,
      wholesaler_name: project.wholesaler_name,
      wholesaler_contact: project.wholesaler_contact,
      eve_license_date: project.eve_license_date,
      evg_license_date: project.evg_license_date,
      arera_code: project.arera_code,
      go_live_date: project.go_live_date,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormData({});
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          status: formData.status,
          market_type: formData.market_type,
          expected_volumes: formData.expected_volumes,
          regions: formData.regions,
          wholesaler_name: formData.wholesaler_name,
          wholesaler_contact: formData.wholesaler_contact,
          eve_license_date: formData.eve_license_date,
          evg_license_date: formData.evg_license_date,
          arera_code: formData.arera_code,
          go_live_date: formData.go_live_date,
        })
        .eq('id', project.id)
        .select()
        .single();

      if (error) throw error;

      onProjectUpdate(data as Project);
      setIsEditing(false);
      toast({
        title: 'Progetto aggiornato',
        description: 'Le modifiche sono state salvate con successo',
      });
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare le modifiche',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleRegion = (region: string) => {
    const currentRegions = formData.regions || [];
    if (currentRegions.includes(region)) {
      setFormData({ ...formData, regions: currentRegions.filter(r => r !== region) });
    } else {
      setFormData({ ...formData, regions: [...currentRegions, region] });
    }
  };

  const status = statusConfig[project.status] || statusConfig.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scheda Progetto</h2>
          <p className="text-muted-foreground">Panoramica completa del reseller</p>
        </div>
        {!isEditing ? (
          <Button onClick={startEditing}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEditing}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={saveChanges} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        )}
      </div>

      {/* Status & Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Stato</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Select 
                value={formData.status || 'draft'} 
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn(status.bgColor, status.color, 'text-base px-3 py-1')}>
                {status.label}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tipo Fornitura</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const commodityConfig = project.commodity_type ? commodityTypeConfig[project.commodity_type] : null;
              const CommodityIcon = commodityConfig?.icon || Plug;
              return (
                <div className="flex items-center gap-2">
                  <CommodityIcon className={cn("h-5 w-5", commodityConfig?.color || 'text-muted-foreground')} />
                  <span className="font-medium">
                    {commodityConfig?.label || 'Non definito'}
                  </span>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Mercato Target</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Select 
                value={formData.market_type || ''} 
                onValueChange={(v) => setFormData({ ...formData, market_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residenziale</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="mixed">Misto</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {project.market_type ? marketTypeLabels[project.market_type] : 'Non definito'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Volumi Previsti</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Input
                type="number"
                placeholder="POD/anno"
                value={formData.expected_volumes || ''}
                onChange={(e) => setFormData({ ...formData, expected_volumes: parseInt(e.target.value) || null })}
              />
            ) : (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {project.expected_volumes ? `${project.expected_volumes.toLocaleString()} POD/anno` : 'Non definito'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Licenses & Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Licenze e Registrazioni
          </CardTitle>
          <CardDescription>Autorizzazioni obbligatorie per l'attività</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Helper to determine which licenses to show */}
          {(() => {
            const showEVE = !project.commodity_type || project.commodity_type === 'solo-luce' || project.commodity_type === 'dual-fuel';
            const showEVG = !project.commodity_type || project.commodity_type === 'solo-gas' || project.commodity_type === 'dual-fuel';
            const gridCols = showEVE && showEVG ? 'md:grid-cols-3' : 'md:grid-cols-2';

            return (
              <div className={cn("grid grid-cols-1 gap-6", gridCols)}>
                {showEVE && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Iscrizione EVE (Energia Elettrica)
                    </Label>
                    {isEditing ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {formData.eve_license_date 
                              ? format(new Date(formData.eve_license_date), 'dd/MM/yyyy', { locale: it })
                              : 'Seleziona data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.eve_license_date ? new Date(formData.eve_license_date) : undefined}
                            onSelect={(date) => setFormData({ ...formData, eve_license_date: date?.toISOString().split('T')[0] || null })}
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="flex items-center gap-2">
                        {project.eve_license_date ? (
                          <Badge variant="default" className="bg-success/10 text-success">
                            <FileCheck className="h-3 w-3 mr-1" />
                            {format(new Date(project.eve_license_date), 'dd/MM/yyyy', { locale: it })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Non registrato</Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {showEVG && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Iscrizione EVG (Gas Naturale)
                    </Label>
                    {isEditing ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {formData.evg_license_date 
                              ? format(new Date(formData.evg_license_date), 'dd/MM/yyyy', { locale: it })
                              : 'Seleziona data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.evg_license_date ? new Date(formData.evg_license_date) : undefined}
                            onSelect={(date) => setFormData({ ...formData, evg_license_date: date?.toISOString().split('T')[0] || null })}
                            locale={it}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="flex items-center gap-2">
                        {project.evg_license_date ? (
                          <Badge variant="default" className="bg-success/10 text-success">
                            <FileCheck className="h-3 w-3 mr-1" />
                            {format(new Date(project.evg_license_date), 'dd/MM/yyyy', { locale: it })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Non registrato</Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Codice Operatore ARERA</Label>
                  {isEditing ? (
                    <Input
                      placeholder="Es. VEN-123456"
                      value={formData.arera_code || ''}
                      onChange={(e) => setFormData({ ...formData, arera_code: e.target.value || null })}
                    />
                  ) : (
                    <div className="font-mono text-sm">
                      {project.arera_code || <span className="text-muted-foreground">Non assegnato</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Wholesaler & Go-Live */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Grossista Partner
            </CardTitle>
            <CardDescription>Fornitore all'ingrosso di energia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Grossista</Label>
              {isEditing ? (
                <Input
                  placeholder="Es. Axpo Italia, Enel Trade, etc."
                  value={formData.wholesaler_name || ''}
                  onChange={(e) => setFormData({ ...formData, wholesaler_name: e.target.value || null })}
                />
              ) : (
                <div className="font-medium">
                  {project.wholesaler_name || <span className="text-muted-foreground">Non definito</span>}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Contatto</Label>
              {isEditing ? (
                <Input
                  placeholder="Email o telefono"
                  value={formData.wholesaler_contact || ''}
                  onChange={(e) => setFormData({ ...formData, wholesaler_contact: e.target.value || null })}
                />
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {project.wholesaler_contact || <span className="text-muted-foreground">Non definito</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Go-Live
            </CardTitle>
            <CardDescription>Data prevista di avvio operativo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Data Go-Live</Label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {formData.go_live_date 
                          ? format(new Date(formData.go_live_date), 'dd/MM/yyyy', { locale: it })
                          : 'Seleziona data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.go_live_date ? new Date(formData.go_live_date) : undefined}
                        onSelect={(date) => setFormData({ ...formData, go_live_date: date?.toISOString().split('T')[0] || null })}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="text-lg font-semibold">
                    {project.go_live_date 
                      ? format(new Date(project.go_live_date), 'dd MMMM yyyy', { locale: it })
                      : <span className="text-muted-foreground font-normal">Non pianificato</span>
                    }
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operating Regions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Regioni Operative
          </CardTitle>
          <CardDescription>Aree geografiche di operatività</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {italianRegions.map((region) => (
                <Badge
                  key={region}
                  variant={(formData.regions || []).includes(region) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleRegion(region)}
                >
                  {region}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {project.regions && project.regions.length > 0 ? (
                project.regions.map((region) => (
                  <Badge key={region} variant="secondary">{region}</Badge>
                ))
              ) : (
                <span className="text-muted-foreground">Tutte le regioni (nessuna limitazione)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
