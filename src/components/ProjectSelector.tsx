import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, FolderOpen, Plus, Check, Building2 } from 'lucide-react';
import type { Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface ProjectSelectorProps {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
}

export const ProjectSelector = ({
  projects,
  currentProject,
  loading,
  onSelectProject,
  onNewProject,
}: ProjectSelectorProps) => {
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
        <FolderOpen className="h-4 w-4 text-white/60" />
        <span className="text-white/60 text-sm">Caricamento...</span>
      </div>
    );
  }

  if (!currentProject && projects.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewProject}
        className="text-white hover:bg-white/10 gap-2"
      >
        <Plus className="h-4 w-4" />
        Crea Progetto
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 gap-2 max-w-[280px]"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium">
            {currentProject?.name || 'Seleziona Progetto'}
          </span>
          <Badge variant="secondary" className="ml-1 text-xs bg-white/20 text-white shrink-0">
            {projects.length}
          </Badge>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-[300px] z-50 bg-popover border shadow-lg"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          I tuoi Progetti
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {projects.length === 0 ? (
          <div className="px-2 py-4 text-center text-muted-foreground text-sm">
            Nessun progetto creato
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => {
                  onSelectProject(project);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-start gap-3 px-3 py-3 cursor-pointer',
                  currentProject?.id === project.id && 'bg-primary/10'
                )}
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{project.name}</span>
                    {currentProject?.id === project.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Creato il {new Date(project.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            onNewProject();
            setOpen(false);
          }}
          className="gap-2 text-primary cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium">Nuovo Progetto</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
