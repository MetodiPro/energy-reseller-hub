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
        // Get latest project owned by current user (avoid .single() when there may be 0 rows)
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (projectError) {
          console.error('Error fetching project:', projectError);
        }

        if (!project) {
          // No project yet: keep analytics empty and allow UI to render without error loops
          setCurrentProjectId(null);
          setAnalytics({
            members: [],
            assignments: [],
            comments: [],
            memberPerformance: [],
            teamVelocity: []
          });
          return;
        }

        setCurrentProjectId(project.id);

        // Get team members
        const { data: membersData } = await supabase
          .from('project_members')
          .select('user_id, role')
          .eq('project_id', project.id);

        const memberUserIds = membersData?.map(m => m.user_id) || [];

        // Get assignments
        const { data: assignmentsData } = await supabase
          .from('step_assignments')
          .select('*')
          .eq('project_id', project.id);

        // Get comments
        const { data: commentsData } = await supabase
          .from('step_comments')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });

        // Collect all unique user IDs and fetch profiles in one query
        const allUserIds = new Set<string>(memberUserIds);
        assignmentsData?.forEach(a => { allUserIds.add(a.assigned_to); allUserIds.add(a.assigned_by); });
        commentsData?.forEach(c => allUserIds.add(c.user_id));

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(allUserIds));

        const profileMap: Record<string, string | null> = {};
        profilesData?.forEach(p => { profileMap[p.id] = p.full_name; });

        const members: TeamMember[] = membersData?.map(member => ({
          id: member.user_id,
          email: '',
          full_name: profileMap[member.user_id] || null,
          role: member.role
        })) || [];

        const assignments: StepAssignment[] = assignmentsData?.map(a => ({
          id: a.id,
          step_id: a.step_id,
          assigned_to: a.assigned_to,
          assigned_by: a.assigned_by,
          created_at: a.created_at,
          assignee: {
            email: '',
            full_name: profileMap[a.assigned_to] || null
          }
        })) || [];

        const comments: StepComment[] = commentsData?.map(c => ({
          id: c.id,
          step_id: c.step_id,
          user_id: c.user_id,
          comment: c.comment,
          created_at: c.created_at,
          user: {
            email: '',
            full_name: profileMap[c.user_id] || null
          }
        })) || [];

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
