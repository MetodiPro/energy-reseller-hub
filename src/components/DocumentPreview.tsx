import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Loader2 } from 'lucide-react';
import { Document } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';

interface DocumentPreviewProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export const DocumentPreview = ({ document, open, onClose, onDownload }: DocumentPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document || !open) {
      setPreviewUrl(null);
      setError(null);
      return;
    }

    const loadPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: downloadError } = await supabase.storage
          .from('documents')
          .download(document.file_path);

        if (downloadError) throw downloadError;

        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
      } catch (err) {
        console.error('Error loading preview:', err);
        setError('Impossibile caricare l\'anteprima');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [document, open]);

  if (!document) return null;

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[600px] gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={onDownload}>Scarica comunque</Button>
        </div>
      );
    }

    if (!previewUrl) return null;

    // Image preview
    if (document.file_type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
          <img
            src={previewUrl}
            alt={document.file_name}
            className="max-h-[600px] max-w-full object-contain"
          />
        </div>
      );
    }

    // PDF preview
    if (document.file_type === 'application/pdf') {
      return (
        <iframe
          src={previewUrl}
          title={document.file_name}
          className="w-full h-[600px] rounded-lg border border-border"
        />
      );
    }

    // Text files preview
    if (
      document.file_type.startsWith('text/') ||
      document.file_type === 'application/json' ||
      document.file_type === 'application/xml'
    ) {
      return (
        <iframe
          src={previewUrl}
          title={document.file_name}
          className="w-full h-[600px] rounded-lg border border-border bg-background"
        />
      );
    }

    // Unsupported format
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <p className="text-muted-foreground">Anteprima non disponibile per questo formato</p>
        <Button onClick={onDownload}>Scarica per visualizzare</Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{document.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {document.file_name} • v{document.version}
              </p>
              {document.category && (
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: document.category.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {document.category.name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={onDownload}
                title="Scarica"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="Chiudi"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
