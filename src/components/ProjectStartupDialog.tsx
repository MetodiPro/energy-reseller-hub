import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rocket, Building2, Plus, ArrowRight, Check } from 'lucide-react';
import type { Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface ProjectStartupDialogProps {
  open: boolean;
  projects: Project[];
  loading: boolean;
  onSelectProject: (project: Project) => void;
  onCreateNew: () => void;
}

export const ProjectStartupDialog = ({
  open,
  projects,
  loading,
  onSelectProject,
  onCreateNew,
}: ProjectStartupDialogProps) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleContinue = () => {
    if (selectedProject) {
      onSelectProject(selectedProject);
    }
  };

  // Non mostrare nulla se sta caricando o non ci sono progetti
  if (loading || projects.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Bentornato!</DialogTitle>
          <DialogDescription>
            Seleziona un progetto esistente o creane uno nuovo per iniziare.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {projects.map((project) => {
                const isSelected = selectedProject?.id === project.id;
                return (
                  <Card
                    key={project.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      isSelected && 'ring-2 ring-primary bg-primary/5'
                    )}
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardHeader className="py-3 pb-1">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="truncate">{project.name}</span>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </CardTitle>
                          {project.description && (
                            <CardDescription className="text-sm truncate">
                              {project.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          Creato il {new Date(project.created_at).toLocaleDateString('it-IT')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onCreateNew}
          >
            <Plus className="h-4 w-4" />
            Crea Nuovo Progetto
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={!selectedProject}
            onClick={handleContinue}
          >
            Continua
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
