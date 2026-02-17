import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, UserPlus, Mail, Shield, Crown, User, Clock, Trash2, X, Eye, Info,
  CheckCircle2, AlertTriangle, Lightbulb, UserCheck, Activity, BookOpen, Sparkles,
  ClipboardList, History, ArrowRight, Link2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { processSteps, phases } from '@/data/processSteps';

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
  profile?: { full_name: string | null };
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

interface StepAssignment {
  id: string;
  step_id: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
}

interface ActivityLogEntry {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  details: string | null;
  user_id: string;
  created_at: string;
}

interface ProjectTeamManagerProps {
  projectId: string | null;
  currentUserId: string | undefined;
}

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string; description: string }> = {
  owner: { label: 'Proprietario', icon: Crown, color: 'text-yellow-500', description: 'Controllo totale sul progetto' },
  admin: { label: 'Admin', icon: Shield, color: 'text-primary', description: 'Gestisce team e impostazioni' },
  member: { label: 'Membro', icon: User, color: 'text-muted-foreground', description: 'Modifica contenuti e progressi' },
  viewer: { label: 'Visualizzatore', icon: Eye, color: 'text-muted-foreground', description: 'Accesso in sola lettura' },
};

const actionTypeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  member_invited: { label: 'Invito inviato', icon: Mail, color: 'text-primary' },
  member_removed: { label: 'Membro rimosso', icon: Trash2, color: 'text-destructive' },
  role_changed: { label: 'Ruolo modificato', icon: Shield, color: 'text-warning' },
  invite_cancelled: { label: 'Invito annullato', icon: X, color: 'text-muted-foreground' },
  step_assigned: { label: 'Step assegnato', icon: ClipboardList, color: 'text-primary' },
  step_unassigned: { label: 'Assegnazione rimossa', icon: X, color: 'text-muted-foreground' },
};

export const ProjectTeamManager = ({ projectId, currentUserId }: ProjectTeamManagerProps) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [assignments, setAssignments] = useState<StepAssignment[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [sending, setSending] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchTeamData();
    }
  }, [projectId]);

  const fetchTeamData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('id, project_id, user_id, role, created_at')
        .eq('project_id', projectId);
      if (membersError) throw membersError;

      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const membersWithProfiles = (membersData || []).map(member => ({
        ...member,
        profile: profilesData?.find(p => p.id === member.user_id),
      }));

      // Fetch invites
      const { data: invitesData } = await supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending');

      // Fetch step assignments
      const { data: assignmentsData } = await supabase
        .from('step_assignments')
        .select('*')
        .eq('project_id', projectId);

      // Fetch activity log
      const { data: activityData } = await supabase
        .from('team_activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      setMembers(membersWithProfiles as ProjectMember[]);
      setInvites(invitesData || []);
      setAssignments(assignmentsData || []);
      setActivityLog((activityData || []) as unknown as ActivityLogEntry[]);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (actionType: string, targetType: string, targetId?: string, targetName?: string, details?: string) => {
    if (!projectId || !currentUserId) return;
    try {
      await supabase.from('team_activity_log').insert({
        project_id: projectId,
        user_id: currentUserId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId || null,
        target_name: targetName || null,
        details: details || null,
      });
    } catch (e) {
      console.error('Error logging activity:', e);
    }
  };

  const sendInvite = async () => {
    if (!projectId || !currentUserId || !inviteEmail.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('project_invites').insert({
        project_id: projectId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: currentUserId,
      });
      if (error) throw error;

      await logActivity('member_invited', 'invite', undefined, inviteEmail.trim(), `Ruolo: ${roleConfig[inviteRole].label}`);
      toast({ title: 'Invito inviato', description: `Invito inviato a ${inviteEmail}` });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      fetchTeamData();
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message || "Impossibile inviare l'invito", variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const cancelInvite = async (inviteId: string, email: string) => {
    try {
      const { error } = await supabase.from('project_invites').delete().eq('id', inviteId);
      if (error) throw error;
      await logActivity('invite_cancelled', 'invite', inviteId, email);
      setInvites(invites.filter(i => i.id !== inviteId));
      toast({ title: 'Invito annullato' });
    } catch (error) {
      console.error('Error canceling invite:', error);
    }
  };

  const updateMemberRole = async (memberId: string, memberName: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const { error } = await supabase.from('project_members').update({ role: newRole }).eq('id', memberId);
      if (error) throw error;
      await logActivity('role_changed', 'member', memberId, memberName, `Nuovo ruolo: ${roleConfig[newRole].label}`);
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
      toast({ title: 'Ruolo aggiornato' });
      fetchTeamData();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const removeMember = async (memberId: string, userId: string, memberName: string) => {
    if (userId === currentUserId) {
      toast({ title: 'Errore', description: 'Non puoi rimuovere te stesso dal progetto', variant: 'destructive' });
      return;
    }
    if (!confirm('Sei sicuro di voler rimuovere questo membro?')) return;
    try {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
      await logActivity('member_removed', 'member', memberId, memberName);
      setMembers(members.filter(m => m.id !== memberId));
      toast({ title: 'Membro rimosso' });
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const assignStep = async (stepId: string, assignedTo: string) => {
    if (!projectId || !currentUserId) return;
    try {
      // Remove existing assignment for this step
      await supabase.from('step_assignments').delete().eq('project_id', projectId).eq('step_id', stepId);

      const { error } = await supabase.from('step_assignments').insert({
        project_id: projectId,
        step_id: stepId,
        assigned_to: assignedTo,
        assigned_by: currentUserId,
      });
      if (error) throw error;

      const step = processSteps.find(s => s.id === stepId);
      const member = members.find(m => m.user_id === assignedTo);
      await logActivity('step_assigned', 'step', stepId, step?.title, `Assegnato a: ${member?.profile?.full_name || 'Utente'}`);
      toast({ title: 'Step assegnato', description: `${step?.title} assegnato a ${member?.profile?.full_name || 'utente'}` });
      fetchTeamData();
    } catch (error) {
      console.error('Error assigning step:', error);
    }
  };

  const unassignStep = async (stepId: string) => {
    if (!projectId) return;
    try {
      await supabase.from('step_assignments').delete().eq('project_id', projectId).eq('step_id', stepId);
      const step = processSteps.find(s => s.id === stepId);
      await logActivity('step_unassigned', 'step', stepId, step?.title);
      toast({ title: 'Assegnazione rimossa' });
      fetchTeamData();
    } catch (error) {
      console.error('Error unassigning step:', error);
    }
  };

  const currentMember = members.find(m => m.user_id === currentUserId);
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const adminCount = members.filter(m => m.role === 'owner' || m.role === 'admin').length;
  const memberCount = members.filter(m => m.role === 'member').length;

  const teamHealthScore = Math.min(100,
    (members.length >= 2 ? 30 : members.length * 15) +
    (adminCount >= 1 ? 20 : 0) +
    (memberCount >= 1 ? 25 : 0) +
    (members.some(m => m.profile?.full_name) ? 15 : 0) +
    (invites.length > 0 || members.length >= 3 ? 10 : 0)
  );

  const getMemberName = (userId: string) => {
    const m = members.find(m => m.user_id === userId);
    return m?.profile?.full_name || 'Utente';
  };

  const filteredStepsForAssignment = processSteps.filter(s =>
    selectedPhaseFilter === null || s.phase === selectedPhaseFilter
  );

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Team del Progetto
          </h2>
          <p className="text-muted-foreground mt-1">
            Organizza il tuo team, assegna ruoli e gestisci gli accessi al progetto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowGuide(!showGuide)}>
                  <BookOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showGuide ? 'Nascondi guida' : 'Mostra guida'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p>L'utente riceverà un invito. Se non ha un account, dovrà registrarsi con la stessa email per accedere al progetto.</p>
                  </div>
                  <div>
                    <Label>Email del collaboratore</Label>
                    <Input type="email" placeholder="collaboratore@esempio.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Ruolo</Label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex flex-col">
                            <span className="font-medium">Admin</span>
                            <span className="text-xs text-muted-foreground">Gestisce progetto, team e impostazioni</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex flex-col">
                            <span className="font-medium">Membro</span>
                            <span className="text-xs text-muted-foreground">Modifica contenuti, carica documenti, commenta</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex flex-col">
                            <span className="font-medium">Visualizzatore</span>
                            <span className="text-xs text-muted-foreground">Solo lettura, ideale per investitori o consulenti esterni</span>
                          </div>
                        </SelectItem>
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
      </div>

      {/* Guide Banner */}
      {showGuide && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-base">A cosa serve questa sezione?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    La sezione Team ti permette di <strong>invitare collaboratori</strong>, <strong>assegnare responsabili</strong> agli step del processo e monitorare l'<strong>attività del team</strong> in tempo reale.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {[
                    { n: '1', title: 'Invita', desc: 'Aggiungi collaboratori via email' },
                    { n: '2', title: 'Assegna ruoli', desc: 'Admin, Membro o Viewer' },
                    { n: '3', title: 'Assegna step', desc: 'Collega persone ad attività' },
                    { n: '4', title: 'Monitora', desc: 'Traccia le attività del team' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-2 p-2.5 rounded-lg bg-background/70">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{s.n}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowGuide(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" />Salute Team</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">{teamHealthScore}%</span>
              </div>
              <Progress value={teamHealthScore} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Membri</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{members.length}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Admin</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{adminCount}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Assegnazioni</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{assignments.length}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inviti</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Mail className={cn("h-5 w-5", invites.length > 0 ? "text-warning" : "text-muted-foreground")} /><span className="text-2xl font-bold">{invites.length}</span></div></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="members" className="gap-1.5"><UserCheck className="h-4 w-4" />Membri ({members.length})</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5"><ClipboardList className="h-4 w-4" />Assegnazioni Step</TabsTrigger>
          <TabsTrigger value="invites" className="gap-1.5"><Mail className="h-4 w-4" />Inviti ({invites.length})</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><History className="h-4 w-4" />Attività</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-4 w-4" />Ruoli</TabsTrigger>
        </TabsList>

        {/* ===== MEMBERS TAB ===== */}
        <TabsContent value="members" className="space-y-4">
          {members.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun membro nel team</h3>
              <p className="text-muted-foreground mb-4">Inizia invitando i tuoi collaboratori al progetto</p>
              {isAdmin && <Button onClick={() => setInviteDialogOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Invita il primo membro</Button>}
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Membri del Team</CardTitle>
                <CardDescription>Persone con accesso al progetto. Clicca sul ruolo per modificarlo.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => {
                    const roleInfo = roleConfig[member.role] || roleConfig.member;
                    const RoleIcon = roleInfo.icon;
                    const isCurrentUser = member.user_id === currentUserId;
                    const canModify = isAdmin && !isCurrentUser && member.role !== 'owner';
                    const memberAssignments = assignments.filter(a => a.assigned_to === member.user_id);

                    return (
                      <div key={member.id} className={cn(
                        "flex items-center justify-between p-4 rounded-lg transition-colors",
                        isCurrentUser ? "bg-primary/5 border border-primary/20" : "bg-muted/30 hover:bg-muted/50"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", member.role === 'owner' ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-muted")}>
                            <RoleIcon className={cn("h-5 w-5", roleInfo.color)} />
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {member.profile?.full_name || 'Utente senza nome'}
                              {isCurrentUser && <Badge variant="outline" className="text-xs">Tu</Badge>}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Nel team da {formatDistanceToNow(new Date(member.created_at), { locale: it })}</span>
                              {memberAssignments.length > 0 && (
                                <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{memberAssignments.length} step assegnati</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canModify ? (
                            <>
                              <Select value={member.role} onValueChange={(v: 'admin' | 'member' | 'viewer') => updateMemberRole(member.id, member.profile?.full_name || 'Utente', v)}>
                                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Membro</SelectItem>
                                  <SelectItem value="viewer">Visualizzatore</SelectItem>
                                </SelectContent>
                              </Select>
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => removeMember(member.id, member.user_id, member.profile?.full_name || 'Utente')}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Rimuovi dal progetto</TooltipContent></Tooltip></TooltipProvider>
                            </>
                          ) : (
                            <TooltipProvider><Tooltip><TooltipTrigger>
                              <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}><RoleIcon className="h-3 w-3 mr-1" />{roleInfo.label}</Badge>
                            </TooltipTrigger><TooltipContent>{roleInfo.description}</TooltipContent></Tooltip></TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {members.length === 1 && isAdmin && (
            <Card className="border-dashed border-2 border-primary/30">
              <CardContent className="py-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Stai lavorando da solo?</h3>
                  <p className="text-sm text-muted-foreground">Invita commercialisti, legali, consulenti IT o soci per collaborare su ogni sezione del progetto.</p>
                </div>
                <Button variant="outline" onClick={() => setInviteDialogOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Invita</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== STEP ASSIGNMENTS TAB ===== */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Assegnazione Responsabili Step</CardTitle>
              <CardDescription>Assegna un membro del team come responsabile di ogni step del processo. Solo admin e owner possono modificare le assegnazioni.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phase filter */}
              <div className="flex flex-wrap gap-2">
                <Button variant={selectedPhaseFilter === null ? "default" : "outline"} size="sm" onClick={() => setSelectedPhaseFilter(null)}>Tutte le Fasi</Button>
                {phases.map(p => (
                  <Button key={p.id} variant={selectedPhaseFilter === p.id ? "default" : "outline"} size="sm" onClick={() => setSelectedPhaseFilter(p.id)}>
                    Fase {p.id}
                  </Button>
                ))}
              </div>

              {members.length < 2 ? (
                <div className="rounded-lg bg-muted/50 p-6 text-center">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">Invita almeno un collaboratore</p>
                  <p className="text-sm text-muted-foreground mb-3">Per assegnare step servono almeno 2 membri nel team.</p>
                  {isAdmin && <Button size="sm" onClick={() => setInviteDialogOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Invita Membro</Button>}
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {filteredStepsForAssignment.map(step => {
                      const assignment = assignments.find(a => a.step_id === step.id);
                      const assignedMember = assignment ? members.find(m => m.user_id === assignment.assigned_to) : null;

                      return (
                        <div key={step.id} className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          assignment ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border"
                        )}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Badge variant="outline" className="text-xs shrink-0">F{step.phase}</Badge>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{step.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {assignment && assignedMember && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10">
                                <User className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-medium text-primary">{assignedMember.profile?.full_name || 'Utente'}</span>
                              </div>
                            )}
                            {isAdmin && (
                              <Select
                                value={assignment?.assigned_to || 'unassigned'}
                                onValueChange={(v) => {
                                  if (v === 'unassigned') unassignStep(step.id);
                                  else assignStep(step.id, v);
                                }}
                              >
                                <SelectTrigger className="w-40 h-8 text-xs">
                                  <SelectValue placeholder="Assegna..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">— Nessuno —</SelectItem>
                                  {members.map(m => (
                                    <SelectItem key={m.user_id} value={m.user_id}>
                                      {m.profile?.full_name || 'Utente'} ({roleConfig[m.role]?.label})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Summary per member */}
          {assignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Riepilogo Assegnazioni per Membro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map(m => {
                    const memberAssignments = assignments.filter(a => a.assigned_to === m.user_id);
                    if (memberAssignments.length === 0) return null;
                    return (
                      <div key={m.user_id} className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{m.profile?.full_name || 'Utente'}</p>
                            <p className="text-xs text-muted-foreground">{memberAssignments.length} step assegnati</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {memberAssignments.map(a => {
                            const step = processSteps.find(s => s.id === a.step_id);
                            return step ? (
                              <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ArrowRight className="h-3 w-3 shrink-0" />
                                <span className="truncate">{step.title}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== INVITES TAB ===== */}
        <TabsContent value="invites" className="space-y-4">
          {invites.length === 0 ? (
            <Card className="p-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun invito in sospeso</h3>
              <p className="text-muted-foreground mb-4">Tutti gli inviti sono stati accettati oppure non ne hai ancora inviati.</p>
              {isAdmin && <Button onClick={() => setInviteDialogOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Invia un invito</Button>}
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-warning" />Inviti in Attesa</CardTitle>
                <CardDescription>Gli utenti invitati devono registrarsi con la stessa email per accedere al progetto. Gli inviti scadono dopo 7 giorni.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invites.map((invite) => {
                    const roleInfo = roleConfig[invite.role] || roleConfig.member;
                    const isExpired = new Date(invite.expires_at) < new Date();
                    return (
                      <div key={invite.id} className={cn(
                        "flex items-center justify-between p-4 rounded-lg",
                        isExpired ? "bg-destructive/5 border border-destructive/20" : "bg-warning/5 border border-warning/20"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><Mail className="h-5 w-5 text-muted-foreground" /></div>
                          <div>
                            <p className="font-medium">{invite.email}</p>
                            <div className="text-sm text-muted-foreground">
                              {isExpired ? (
                                <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Invito scaduto — invia di nuovo</span>
                              ) : (
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Scade {formatDistanceToNow(new Date(invite.expires_at), { locale: it, addSuffix: true })}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{roleInfo.label}</Badge>
                          {isAdmin && (
                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => cancelInvite(invite.id, invite.email)}><X className="h-4 w-4 text-destructive" /></Button>
                            </TooltipTrigger><TooltipContent>Annulla invito</TooltipContent></Tooltip></TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== ACTIVITY LOG TAB ===== */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Attività Recenti del Team</CardTitle>
              <CardDescription>Cronologia delle azioni del team: inviti, modifiche ruoli, assegnazioni step e rimozioni.</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">Nessuna attività registrata</p>
                  <p className="text-sm text-muted-foreground">Le azioni del team verranno tracciate automaticamente qui.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1">
                    {activityLog.map((entry, idx) => {
                      const config = actionTypeLabels[entry.action_type] || { label: entry.action_type, icon: Activity, color: 'text-muted-foreground' };
                      const Icon = config.icon;
                      const userName = getMemberName(entry.user_id);

                      return (
                        <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-muted/50")}>
                            <Icon className={cn("h-4 w-4", config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{userName}</span>
                              {' — '}
                              <span className="text-muted-foreground">{config.label}</span>
                              {entry.target_name && <span className="font-medium"> · {entry.target_name}</span>}
                            </p>
                            {entry.details && <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                            {formatDistanceToNow(new Date(entry.created_at), { locale: it, addSuffix: true })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ROLES TAB ===== */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Guida ai Ruoli e Permessi</CardTitle>
              <CardDescription>Ogni membro del team ha un ruolo che determina cosa può fare nel progetto.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { role: 'owner', permissions: ['Accesso completo a tutte le sezioni', 'Può eliminare il progetto', 'Gestisce team, ruoli e inviti', 'Modifica impostazioni progetto'], useCase: 'Il fondatore o responsabile principale del progetto' },
                  { role: 'admin', permissions: ['Gestisce membri e inviti', 'Modifica impostazioni progetto', 'Assegna step ai membri', 'Non può eliminare il progetto'], useCase: 'Soci, co-fondatori o manager operativi' },
                  { role: 'member', permissions: ['Modifica contenuti (Business Plan, Marketing, ecc.)', 'Carica e gestisce documenti', 'Aggiorna progressi degli step', 'Inserisce costi e ricavi'], useCase: 'Collaboratori attivi: commercialista, consulente IT, legale' },
                  { role: 'viewer', permissions: ['Visualizza tutte le sezioni', 'Scarica documenti e report', 'Non può modificare nulla', 'Ideale per supervisione'], useCase: 'Investitori, mentori, consulenti esterni occasionali' },
                ].map(({ role, permissions, useCase }) => {
                  const info = roleConfig[role];
                  const Icon = info.icon;
                  return (
                    <div key={role} className="rounded-xl border p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", role === 'owner' ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-muted")}>
                          <Icon className={cn("h-4 w-4", info.color)} />
                        </div>
                        <div><h4 className="font-semibold">{info.label}</h4><p className="text-xs text-muted-foreground">{info.description}</p></div>
                      </div>
                      <ul className="space-y-1.5">
                        {permissions.map((p, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />{p}</li>
                        ))}
                      </ul>
                      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                        <Lightbulb className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground"><strong>Ideale per:</strong> {useCase}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
