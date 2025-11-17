import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, File, Download, Trash2, Edit, Clock, Users, FileText, FolderOpen } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface DocumentManagerProps {
  projectId: string | null;
}

export const DocumentManager = ({ projectId }: DocumentManagerProps) => {
  const { documents, categories, loading, uploadDocument, downloadDocument, deleteDocument, updateDocument } = useDocuments(projectId);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadDocument(
      selectedFile,
      title,
      description || null,
      categoryId || null
    );

    // Reset form
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
    setUploadDialogOpen(false);
  };

  const handleEdit = (doc: any) => {
    setSelectedDocument(doc);
    setTitle(doc.title);
    setDescription(doc.description || '');
    setCategoryId(doc.category_id || '');
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedDocument) return;

    await updateDocument(selectedDocument.id, {
      title,
      description: description || null,
      category_id: categoryId || null
    });

    setEditDialogOpen(false);
    setSelectedDocument(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryIcon = (iconName: string | null) => {
    const icons: Record<string, any> = {
      FileText,
      FolderOpen,
      File
    };
    const Icon = iconName ? icons[iconName] || File : File;
    return Icon;
  };

  const filteredDocuments = filterCategory === 'all' 
    ? documents 
    : documents.filter(doc => doc.category_id === filterCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Caricamento documenti...</div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nessun progetto selezionato</h3>
        <p className="text-muted-foreground">Seleziona o crea un progetto per gestire i documenti</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestione Documenti</h2>
          <p className="text-muted-foreground">Organizza e condividi documenti con il team</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Carica Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Carica Nuovo Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFile.name} - {formatFileSize(selectedFile.size)}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="title">Titolo</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome del documento"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrizione (opzionale)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrizione del documento..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || !title}
                className="w-full"
              >
                Carica
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Label>Filtra per categoria:</Label>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le categorie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessun documento</h3>
          <p className="text-muted-foreground mb-4">Inizia caricando il tuo primo documento</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const category = doc.category;
            const IconComponent = getCategoryIcon(category?.icon || null);
            
            return (
              <Card key={doc.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: category?.color ? `${category.color}20` : '#6b728020' }}
                    >
                      <IconComponent 
                        className="h-5 w-5" 
                        style={{ color: category?.color || '#6b7280' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{doc.title}</h4>
                      {category && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs mt-1"
                          style={{ 
                            backgroundColor: `${category.color}20`,
                            color: category.color 
                          }}
                        >
                          {category.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="space-y-2 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <File className="h-3 w-3" />
                    <span>{formatFileSize(doc.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      v{doc.version} • {formatDistanceToNow(new Date(doc.created_at), { 
                        addSuffix: true,
                        locale: it 
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(doc)}
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(doc)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Sei sicuro di voler eliminare questo documento?')) {
                        deleteDocument(doc.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Titolo</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Salva Modifiche
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
