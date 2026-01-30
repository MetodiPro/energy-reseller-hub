import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Crown, 
  User,
  Clock,
  Trash2,
  Check,
  X,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
  profile?: {
    full_name: string | null;
  };
  email?: string;
}

interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
}

interface ProjectTeamManagerProps {
  projectId: string | null;
  currentUserId: string | undefined;
}

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: 'Proprietario', icon: Crown, color: 'text-yellow-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-primary' },
  member: { label: 'Membro', icon: User, color: 'text-muted-foreground' },
  viewer: { label: 'Visualizzatore', icon: Eye, color: 'text-muted-foreground' },
};

export const ProjectTeamManager = ({ projectId, currentUserId }: ProjectTeamManagerProps) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchTeamData();
    }
  }, [projectId]);

  const fetchTeamData = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      // Fetch members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          id,
          project_id,
          user_id,
          role,
          created_at
        `)
        .eq('project_id', projectId);

      if (membersError) throw membersError;

      // Fetch profiles for members
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const membersWithProfiles = (membersData || []).map(member => ({
        ...member,
        profile: profilesData?.find(p => p.id === member.user_id),
      }));

      // Fetch pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending');

      if (invitesError) throw invitesError;

      setMembers(membersWithProfiles as ProjectMember[]);
      setInvites(invitesData || []);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!projectId || !currentUserId || !inviteEmail.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('project_invites')
        .insert({
          project_id: projectId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: currentUserId,
        });

      if (error) throw error;

      toast({
        title: 'Invito inviato',
        description: `Invito inviato a ${inviteEmail}`,
      });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      fetchTeamData();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile inviare l\'invito',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('project_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setInvites(invites.filter(i => i.id !== inviteId));
      toast({ title: 'Invito annullato' });
    } catch (error) {
      console.error('Error canceling invite:', error);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role: newRole as any } : m
      ));
      toast({ title: 'Ruolo aggiornato' });
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const removeMember = async (memberId: string, userId: string) => {
    if (userId === currentUserId) {
      toast({
        title: 'Errore',
        description: 'Non puoi rimuovere te stesso dal progetto',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Sei sicuro di voler rimuovere questo membro?')) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== memberId));
      toast({ title: 'Membro rimosso' });
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const currentMember = members.find(m => m.user_id === currentUserId);
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  if (!projectId) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nessun progetto selezionato</h3>
        <p className="text-muted-foreground">Seleziona un progetto per gestire il team</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Caricamento team...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team del Progetto</h2>
          <p className="text-muted-foreground">Gestisci i membri e i permessi del team</p>
        </div>
        {isAdmin && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invita Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invita un Nuovo Membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@esempio.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Ruolo</Label>
                  <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Può gestire progetto e membri</SelectItem>
                      <SelectItem value="member">Membro - Può modificare contenuti</SelectItem>
                      <SelectItem value="viewer">Visualizzatore - Solo lettura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={sendInvite} className="w-full" disabled={!inviteEmail.trim() || sending}>
                  {sending ? 'Invio in corso...' : 'Invia Invito'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Membri Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{members.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Amministratori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {members.filter(m => m.role === 'owner' || m.role === 'admin').length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Membri Attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {members.filter(m => m.role === 'member').length}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Inviti in Attesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{invites.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Membri del Team</CardTitle>
          <CardDescription>Utenti con accesso al progetto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const roleInfo = roleConfig[member.role] || roleConfig.member;
              const RoleIcon = roleInfo.icon;
              const isCurrentUser = member.user_id === currentUserId;
              const canModify = isAdmin && !isCurrentUser && member.role !== 'owner';

              return (
                <div 
                  key={member.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg",
                    isCurrentUser ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      member.role === 'owner' ? "bg-yellow-100" : "bg-muted"
                    )}>
                      <RoleIcon className={cn("h-5 w-5", roleInfo.color)} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.profile?.full_name || 'Utente'}
                        {isCurrentUser && <span className="text-primary ml-2">(Tu)</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Membro da {formatDistanceToNow(new Date(member.created_at), { locale: it, addSuffix: false })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canModify ? (
                      <>
                        <Select 
                          value={member.role} 
                          onValueChange={(v: 'admin' | 'member' | 'viewer') => updateMemberRole(member.id, v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Membro</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeMember(member.id, member.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleInfo.label}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-warning" />
              Inviti in Attesa
            </CardTitle>
            <CardDescription>Utenti invitati che non hanno ancora accettato</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map((invite) => {
                const roleInfo = roleConfig[invite.role] || roleConfig.member;
                const isExpired = new Date(invite.expires_at) < new Date();

                return (
                  <div 
                    key={invite.id} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg",
                      isExpired ? "bg-destructive/5" : "bg-warning/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {isExpired ? (
                            <span className="text-destructive">Scaduto</span>
                          ) : (
                            <span>
                              Scade {formatDistanceToNow(new Date(invite.expires_at), { locale: it, addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{roleInfo.label}</Badge>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => cancelInvite(invite.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Permessi per Ruolo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Proprietario</span>
              </div>
              <ul className="text-sm text-muted-foreground ml-6 list-disc">
                <li>Accesso completo al progetto</li>
                <li>Può eliminare il progetto</li>
                <li>Può trasferire la proprietà</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground ml-6 list-disc">
                <li>Gestione membri e inviti</li>
                <li>Modifica impostazioni progetto</li>
                <li>Accesso a tutte le funzionalità</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Membro</span>
              </div>
              <ul className="text-sm text-muted-foreground ml-6 list-disc">
                <li>Modifica contenuti e progressi</li>
                <li>Caricamento documenti</li>
                <li>Commenti e note</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Visualizzatore</span>
              </div>
              <ul className="text-sm text-muted-foreground ml-6 list-disc">
                <li>Solo lettura</li>
                <li>Visualizzazione progressi</li>
                <li>Download documenti</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
