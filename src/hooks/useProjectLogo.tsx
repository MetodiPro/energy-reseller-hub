import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/hooks/useProjects';

export const useProjectLogo = (project: Project | null, onUpdate?: () => void) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadLogo = useCallback(async (file: File) => {
    if (!project) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `${project.id}/logo.${ext}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('project-logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-logos')
        .getPublicUrl(path);

      // Update project
      const { error: updateError } = await supabase
        .from('projects')
        .update({ logo_url: publicUrl })
        .eq('id', project.id);

      if (updateError) throw updateError;

      toast({ title: 'Logo caricato', description: 'Il logo del brand è stato aggiornato.' });
      onUpdate?.();
    } catch (err: any) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [project, toast, onUpdate]);

  const removeLogo = useCallback(async () => {
    if (!project) return;
    setUploading(true);
    try {
      // Remove from storage (best effort)
      await supabase.storage
        .from('project-logos')
        .remove([`${project.id}/logo.png`, `${project.id}/logo.jpg`, `${project.id}/logo.jpeg`, `${project.id}/logo.webp`]);

      const { error } = await supabase
        .from('projects')
        .update({ logo_url: null })
        .eq('id', project.id);

      if (error) throw error;

      toast({ title: 'Logo rimosso' });
      onUpdate?.();
    } catch (err: any) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [project, toast, onUpdate]);

  return { uploadLogo, removeLogo, uploading };
};
