import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Save, Check, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const nameSchema = z.string().trim().min(1, 'Il nome è obbligatorio').max(100, 'Il nome è troppo lungo');
const passwordSchema = z.string().min(8, 'La password deve avere almeno 8 caratteri').max(72, 'Password troppo lunga');

interface ProfilePageProps {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export function ProfilePage({ userId, userEmail, userName }: ProfilePageProps) {
  const [fullName, setFullName] = useState(userName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      if (data?.full_name) setFullName(data.full_name);
    };
    loadProfile();
  }, [userId]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    const parsed = nameSchema.safeParse(fullName);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, full_name: parsed.data, updated_at: new Date().toISOString() });
      if (error) throw error;

      // Also update user metadata for consistency
      await supabase.auth.updateUser({ data: { full_name: parsed.data } });

      setSaved(true);
      toast.success('Profilo aggiornato con successo');
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Errore nel salvataggio del profilo');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password aggiornata con successo');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error?.message || 'Errore nel cambio password');
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Il mio Profilo</h1>
        <p className="text-muted-foreground">Gestisci le informazioni del tuo account</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Informazioni personali</CardTitle>
          </div>
          <CardDescription>Aggiorna il tuo nome e le informazioni visibili</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {getInitials(fullName, userEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{fullName || 'Nome non impostato'}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <Badge variant="secondary" className="mt-1">Account attivo</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="profileName">Nome completo</Label>
              <Input
                id="profileName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Inserisci il tuo nome completo"
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profileEmail">Email</Label>
              <Input id="profileEmail" value={userEmail || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">L'email non può essere modificata direttamente</p>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saved ? (
              <><Check className="h-4 w-4 mr-2" />Salvato</>
            ) : saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvataggio...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Salva modifiche</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Cambia Password</CardTitle>
          </div>
          <CardDescription>Aggiorna la password del tuo account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="newPassword">Nuova password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Almeno 8 caratteri"
                maxLength={72}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Conferma nuova password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la nuova password"
              maxLength={72}
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
            variant="outline"
          >
            {changingPassword ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Aggiornamento...</>
            ) : (
              <><Lock className="h-4 w-4 mr-2" />Aggiorna password</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
