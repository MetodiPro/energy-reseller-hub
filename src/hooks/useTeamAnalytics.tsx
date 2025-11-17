import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StepProgress } from './useStepProgress';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface StepAssignment {
  id: string;
  step_id: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  assignee: {
    email: string;
    full_name: string | null;
  };
}

interface StepComment {
  id: string;
  step_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user: {
    email: string;
    full_name: string | null;
  };
}

export interface TeamAnalytics {
  members: TeamMember[];
  assignments: StepAssignment[];
  comments: StepComment[];
  memberPerformance: {
    userId: string;
    name: string;
    completedTasks: number;
    avgCompletionTime: number;
    commentsCount: number;
  }[];
  teamVelocity: {
    week: string;
    completed: number;
  }[];
}

export const useTeamAnalytics = (userId: string | undefined, stepProgress: Record<string, StepProgress>) => {
  const [analytics, setAnalytics] = useState<TeamAnalytics>({
    members: [],
    assignments: [],
    comments: [],
    memberPerformance: [],
    teamVelocity: []
  });
  const [loading, setLoading] = useState(true);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchTeamAnalytics = async () => {
      setLoading(true);
      
      try {
        // Get user's projects
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!projects) {
          setLoading(false);
          return;
        }

        setCurrentProjectId(projects.id);

        // Get team members
        const { data: membersData } = await supabase
          .from('project_members')
          .select(`
            user_id,
            role,
            profiles:user_id (
              id,
              full_name
            )
          `)
          .eq('project_id', projects.id);

        // Get user emails from auth
        const userIds = membersData?.map(m => m.user_id) || [];
        let authUsers: any = null;
        try {
          const { data } = await supabase.auth.admin.listUsers();
          authUsers = data;
        } catch (error) {
          console.error('Cannot fetch auth users:', error);
        }
        
        const members: TeamMember[] = membersData?.map(member => {
          const authUser = authUsers?.users?.find((u: any) => u.id === member.user_id);
          const profile = member.profiles as any;
          return {
            id: member.user_id,
            email: authUser?.email || '',
            full_name: profile?.full_name || null,
            role: member.role
          };
        }) || [];

        // Get assignments
        const { data: assignmentsData } = await supabase
          .from('step_assignments')
          .select(`
            *,
            assignee:assigned_to (
              id,
              full_name
            )
          `)
          .eq('project_id', projects.id);

        const assignments: StepAssignment[] = assignmentsData?.map(a => {
          const assignee = a.assignee as any;
          const authUser = authUsers?.users?.find((u: any) => u.id === a.assigned_to);
          return {
            id: a.id,
            step_id: a.step_id,
            assigned_to: a.assigned_to,
            assigned_by: a.assigned_by,
            created_at: a.created_at,
            assignee: {
              email: authUser?.email || '',
              full_name: assignee?.full_name || null
            }
          };
        }) || [];

        // Get comments
        const { data: commentsData } = await supabase
          .from('step_comments')
          .select(`
            *,
            user:user_id (
              id,
              full_name
            )
          `)
          .eq('project_id', projects.id)
          .order('created_at', { ascending: false });

        const comments: StepComment[] = commentsData?.map(c => {
          const user = c.user as any;
          const authUser = authUsers?.users?.find((u: any) => u.id === c.user_id);
          return {
            id: c.id,
            step_id: c.step_id,
            user_id: c.user_id,
            comment: c.comment,
            created_at: c.created_at,
            user: {
              email: authUser?.email || '',
              full_name: user?.full_name || null
            }
          };
        }) || [];

        // Calculate member performance
        const memberPerformance = members.map(member => {
          const memberAssignments = assignments.filter(a => a.assigned_to === member.id);
          const completedTasks = memberAssignments.filter(a => {
            const progress = stepProgress[a.step_id];
            return progress?.completed;
          }).length;

          // Calculate average completion time
          const completionTimes = memberAssignments
            .map(a => {
              const progress = stepProgress[a.step_id];
              if (progress?.completed && progress.startDate && progress.completionDate) {
                const start = new Date(progress.startDate).getTime();
                const end = new Date(progress.completionDate).getTime();
                return (end - start) / (1000 * 60 * 60 * 24); // days
              }
              return null;
            })
            .filter(t => t !== null) as number[];

          const avgCompletionTime = completionTimes.length > 0
            ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
            : 0;

          const commentsCount = comments.filter(c => c.user_id === member.id).length;

          return {
            userId: member.id,
            name: member.full_name || member.email,
            completedTasks,
            avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
            commentsCount
          };
        });

        // Calculate team velocity (tasks completed per week)
        const completedProgressEntries = Object.values(stepProgress)
          .filter(p => p.completed && p.completionDate)
          .sort((a, b) => new Date(a.completionDate!).getTime() - new Date(b.completionDate!).getTime());

        const weeklyCompletions = new Map<string, number>();
        completedProgressEntries.forEach(progress => {
          if (progress.completionDate) {
            const date = new Date(progress.completionDate);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            weeklyCompletions.set(weekKey, (weeklyCompletions.get(weekKey) || 0) + 1);
          }
        });

        const teamVelocity = Array.from(weeklyCompletions.entries())
          .map(([week, completed]) => ({
            week: new Date(week).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
            completed
          }))
          .slice(-8); // Last 8 weeks

        setAnalytics({
          members,
          assignments,
          comments,
          memberPerformance,
          teamVelocity
        });
      } catch (error) {
        console.error('Error fetching team analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAnalytics();
  }, [userId, stepProgress]);

  return { analytics, loading, currentProjectId };
};
