import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Document {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  version: number;
  is_latest: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  uploader?: {
    email: string;
    full_name: string | null;
  };
}

export interface DocumentCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export const useDocuments = (projectId: string | null) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    fetchDocuments();
    fetchCategories();

    // Subscribe to document changes
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchDocuments = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          category:document_categories (
            id,
            name,
            color,
            icon
          )
        `)
        .eq('project_id', projectId)
        .eq('is_latest', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Errore nel caricamento dei documenti');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name');

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const uploadDocument = async (
    file: File,
    title: string,
    description: string | null,
    categoryId: string | null
  ) => {
    if (!projectId) {
      toast.error('Nessun progetto selezionato');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          title,
          description,
          category_id: categoryId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create first version record
      await supabase.from('document_versions').insert({
        document_id: document.id,
        version: 1,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: user.id,
        change_notes: 'Versione iniziale'
      });

      toast.success('Documento caricato con successo');
      await fetchDocuments();
      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Errore durante il caricamento del documento');
      return null;
    }
  };

  const uploadNewVersion = async (
    documentId: string,
    file: File,
    changeNotes: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      // Get current document
      const { data: currentDoc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      const newVersion = currentDoc.version + 1;

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_v${newVersion}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update document record
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          version: newVersion
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Create version record
      await supabase.from('document_versions').insert({
        document_id: documentId,
        version: newVersion,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: user.id,
        change_notes: changeNotes
      });

      toast.success('Nuova versione caricata con successo');
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading new version:', error);
      toast.error('Errore durante il caricamento della nuova versione');
    }
  };

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download avviato');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Errore durante il download');
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Documento eliminato');
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const updateDocument = async (
    documentId: string,
    updates: {
      title?: string;
      description?: string | null;
      category_id?: string | null;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Documento aggiornato');
      await fetchDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  return {
    documents,
    categories,
    loading,
    uploadDocument,
    uploadNewVersion,
    downloadDocument,
    deleteDocument,
    updateDocument
  };
};
