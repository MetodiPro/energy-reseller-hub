import { createContext, useContext, ReactNode } from 'react';
import { useProjects, Project } from '@/hooks/useProjects';

interface ProjectContextValue {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  hasProjects: boolean;
  selectProject: (project: Project) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, name: string, description: string | null) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProjectStartDate: (id: string, date: Date | null) => Promise<void>;
  updateProjectEndDate: (id: string, date: Date | null) => Promise<void>;
  refreshProjects: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectContext must be used within ProjectProvider');
  return ctx;
}

interface ProjectProviderProps {
  userId: string;
  children: ReactNode;
}

export function ProjectProvider({ userId, children }: ProjectProviderProps) {
  const projectsHook = useProjects(userId);

  return (
    <ProjectContext.Provider value={projectsHook}>
      {children}
    </ProjectContext.Provider>
  );
}
