import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Bell, Shield, Palette, Save, Check, Sun, Moon, Monitor, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { resetOnboardingTutorial } from "@/components/OnboardingTutorial";
import { MarketTariffsSection } from "@/components/MarketTariffsSection";

interface SettingsPageProps {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export function SettingsPage({ userId, userEmail, userName }: SettingsPageProps) {
  const [fullName, setFullName] = useState(userName || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Notification preferences from database
  const { 
    preferences: notificationPrefs, 
    loading: notificationLoading, 
    saving: notificationSaving,
    updatePreferences 
  } = useNotificationPreferences(userId);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      
      if (data?.full_name) {
        setFullName(data.full_name);
      }
    };
    
    loadProfile();
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setSaved(true);
      toast.success("Profilo aggiornato con successo");
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Errore nel salvataggio del profilo");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni</h1>
        <p className="text-muted-foreground">Gestisci le preferenze del tuo account e le notifiche</p>
      </div>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>Gestisci le informazioni del tuo profilo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {getInitials(fullName, userEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{fullName || "Nome non impostato"}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <Badge variant="secondary" className="mt-1">Account attivo</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Inserisci il tuo nome completo"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={userEmail || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                L'email non può essere modificata direttamente
              </p>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvato
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifiche</CardTitle>
            {notificationSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <CardDescription>Configura come e quando ricevere le notifiche</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifiche email</Label>
                  <p className="text-sm text-muted-foreground">
                    Ricevi aggiornamenti importanti via email
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.emailNotifications}
                  onCheckedChange={(checked) => updatePreferences({ emailNotifications: checked })}
                  disabled={notificationSaving}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Promemoria scadenze</Label>
                  <p className="text-sm text-muted-foreground">
                    Ricevi avvisi per le scadenze in avvicinamento
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.deadlineReminders}
                  onCheckedChange={(checked) => updatePreferences({ deadlineReminders: checked })}
                  disabled={notificationSaving}
                />
              </div>

              {notificationPrefs.deadlineReminders && (
                <div className="ml-6 grid gap-2">
                  <Label htmlFor="reminderDays">Giorni di anticipo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="reminderDays"
                      type="number"
                      min={1}
                      max={30}
                      value={notificationPrefs.reminderDaysBefore}
                      onChange={(e) => updatePreferences({ reminderDaysBefore: Number(e.target.value) })}
                      className="w-20"
                      disabled={notificationSaving}
                    />
                    <span className="text-sm text-muted-foreground">giorni prima della scadenza</span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Completamento step</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifiche quando uno step del processo viene completato
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.stepCompletionAlerts}
                  onCheckedChange={(checked) => updatePreferences({ stepCompletionAlerts: checked })}
                  disabled={notificationSaving}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alert finanziari</Label>
                  <p className="text-sm text-muted-foreground">
                    Avvisi per variazioni significative nei dati finanziari
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.financialAlerts}
                  onCheckedChange={(checked) => updatePreferences({ financialAlerts: checked })}
                  disabled={notificationSaving}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Aggiornamenti team</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifiche quando un membro del team modifica qualcosa
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.teamUpdates}
                  onCheckedChange={(checked) => updatePreferences({ teamUpdates: checked })}
                  disabled={notificationSaving}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Sicurezza</CardTitle>
          </div>
          <CardDescription>Gestisci la sicurezza del tuo account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                Ultima modifica: non disponibile
              </p>
            </div>
            <Button variant="outline" size="sm">
              Cambia password
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Sessioni attive</p>
              <p className="text-sm text-muted-foreground">
                Gestisci i dispositivi connessi
              </p>
            </div>
            <Button variant="outline" size="sm">
              Visualizza sessioni
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tutorial Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            <CardTitle>Tutorial</CardTitle>
          </div>
          <CardDescription>Rivedi il tutorial guidato dell'applicazione</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Tutorial interattivo</p>
              <p className="text-sm text-muted-foreground">
                Riavvia la guida passo-passo che illustra le sezioni principali dell'app
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetOnboardingTutorial();
                toast.success("Tutorial riavviato! Ricarica la pagina per vederlo.");
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Riavvia Tutorial
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <AppearanceSection />

      {/* Market Tariffs Section */}
      <Separator className="my-8" />
      <MarketTariffsSection />
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Aspetto</CardTitle>
        </div>
        <CardDescription>Personalizza l'aspetto dell'applicazione</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Tema</Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("light")}
            >
              <Sun className="h-5 w-5" />
              <span className="text-xs">Chiaro</span>
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-5 w-5" />
              <span className="text-xs">Scuro</span>
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="flex flex-col items-center gap-2 h-auto py-4"
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-5 w-5" />
              <span className="text-xs">Sistema</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            La preferenza del tema viene salvata automaticamente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}