import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export const useProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!userId) {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch all projects where user is owner or member
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('Error fetching owned projects:', ownedError);
      }

      // Fetch projects where user is a member (but not owner)
      const { data: membershipData, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      if (memberError) {
        console.error('Error fetching memberships:', memberError);
      }

      let memberProjects: Project[] = [];
      if (membershipData && membershipData.length > 0) {
        const memberProjectIds = membershipData.map(m => m.project_id);
        const ownedIds = (ownedProjects || []).map(p => p.id);
        const nonOwnedMemberIds = memberProjectIds.filter(id => !ownedIds.includes(id));

        if (nonOwnedMemberIds.length > 0) {
          const { data: memberProjectsData } = await supabase
            .from('projects')
            .select('*')
            .in('id', nonOwnedMemberIds)
            .order('created_at', { ascending: false });

          memberProjects = memberProjectsData || [];
        }
      }

      const allProjects = [...(ownedProjects || []), ...memberProjects];
      setProjects(allProjects);

      // Restore last selected project from localStorage or pick the most recent
      const storedProjectId = localStorage.getItem(`resbuilder_current_project_${userId}`);
      const storedProject = allProjects.find(p => p.id === storedProjectId);
      
      if (storedProject) {
        setCurrentProject(storedProject);
      } else if (allProjects.length > 0) {
        setCurrentProject(allProjects[0]);
        localStorage.setItem(`resbuilder_current_project_${userId}`, allProjects[0].id);
      } else {
        setCurrentProject(null);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selectProject = useCallback((project: Project) => {
    setCurrentProject(project);
    if (userId) {
      localStorage.setItem(`resbuilder_current_project_${userId}`, project.id);
    }
  }, [userId]);

  const addProject = useCallback((project: Project) => {
    setProjects(prev => [project, ...prev]);
    setCurrentProject(project);
    if (userId) {
      localStorage.setItem(`resbuilder_current_project_${userId}`, project.id);
    }
  }, [userId]);

  const refreshProjects = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    currentProject,
    loading,
    selectProject,
    addProject,
    refreshProjects,
    hasProjects: projects.length > 0,
  };
};
