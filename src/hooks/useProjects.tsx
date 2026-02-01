import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  commodity_type: string | null;
  created_at: string;
  updated_at: string;
}

export const useProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const updateProject = useCallback(async (id: string, name: string, description: string | null) => {
    const { error } = await supabase
      .from('projects')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il progetto.',
        variant: 'destructive',
      });
      throw error;
    }

    // Update local state
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, name, description, updated_at: new Date().toISOString() } : p
    ));
    
    if (currentProject?.id === id) {
      setCurrentProject(prev => prev ? { ...prev, name, description } : null);
    }

    toast({
      title: 'Progetto aggiornato',
      description: 'Le modifiche sono state salvate.',
    });
  }, [currentProject, toast]);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il progetto.',
        variant: 'destructive',
      });
      throw error;
    }

    // Update local state
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    
    // If deleted project was current, switch to another one
    if (currentProject?.id === id) {
      if (newProjects.length > 0) {
        setCurrentProject(newProjects[0]);
        if (userId) {
          localStorage.setItem(`resbuilder_current_project_${userId}`, newProjects[0].id);
        }
      } else {
        setCurrentProject(null);
        if (userId) {
          localStorage.removeItem(`resbuilder_current_project_${userId}`);
        }
      }
    }

    toast({
      title: 'Progetto eliminato',
      description: 'Il progetto è stato eliminato definitivamente.',
    });
  }, [currentProject, projects, userId, toast]);

  const refreshProjects = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    currentProject,
    loading,
    selectProject,
    addProject,
    updateProject,
    deleteProject,
    refreshProjects,
    hasProjects: projects.length > 0,
  };
};
