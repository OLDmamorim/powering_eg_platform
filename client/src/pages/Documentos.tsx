import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
// Toast functionality
import { Upload, FileText, Trash2, Edit, Download, Calendar, User, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Documentos() {
  const [, navigate] = useLocation();
  const toast = (opts: { title: string; description?: string; variant?: string }) => {
    if (opts.variant === 'destructive') {
      alert('Erro: ' + opts.title + (opts.description ? '\n' + opts.description : ''));
    } else {
      alert(opts.title);
    }
  };
  const utils = trpc.useUtils();
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetLojas, setTargetLojas] = useState<'todas' | 'especificas'>('todas');
  const [lojasEspecificas, setLojasEspecificas] = useState<number[]>([]);

  const { data: documentos, isLoading } = trpc.documentos.listar.useQuery();
  const { data: gestorData } = trpc.gestores.me.useQuery();
  const minhasLojas = gestorData?.lojas || [];
  
  const uploadMutation = trpc.documentos.upload.useMutation({
    onSuccess: () => {
      toast({ title: 'Documento enviado com sucesso!' });
      utils.documentos.listar.invalidate();
      setIsUploadOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar documento', description: error.message, variant: 'destructive' });
    },
  });

  const editarMutation = trpc.documentos.editar.useMutation({
    onSuccess: () => {
      toast({ title: 'Documento atualizado!' });
      utils.documentos.listar.invalidate();
      setIsEditOpen(false);
      setEditingDoc(null);
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const eliminarMutation = trpc.documentos.eliminar.useMutation({
    onSuccess: () => {
      toast({ title: 'Documento eliminado!' });
      utils.documentos.listar.invalidate();
    },
    onError: (error) => {
      toast({ title: 'Erro ao eliminar', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setSelectedFile(null);
    setTargetLojas('todas');
    setLojasEspecificas([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({ title: 'Apenas ficheiros PDF são permitidos', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!titulo || !selectedFile) {
      toast({ title: 'Preencha o título e selecione um ficheiro', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (!base64) return;

      uploadMutation.mutate({
        titulo,
        descricao,
        fileData: base64,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        targetLojas: targetLojas === 'todas' ? undefined : lojasEspecificas,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleEdit = (doc: any) => {
    setEditingDoc(doc);
    setTitulo(doc.titulo);
    setDescricao(doc.descricao || '');
    const targetIds = doc.targetLojas ? JSON.parse(doc.targetLojas) : null;
    setTargetLojas(targetIds ? 'especificas' : 'todas');
    setLojasEspecificas(targetIds || []);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingDoc || !titulo) return;

    editarMutation.mutate({
      id: editingDoc.id,
      titulo,
      descricao,
      targetLojas: targetLojas === 'todas' ? undefined : lojasEspecificas,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem a certeza que deseja eliminar este documento?')) {
      eliminarMutation.mutate({ id });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Breadcrumb e Botão Voltar */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Documentos
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos e Circulares</h1>
          <p className="text-muted-foreground mt-1">Gerir documentos partilhados com as lojas</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsUploadOpen(true); }}>
              <Upload className="mr-2 h-4 w-4" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enviar Novo Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Circular 01/2026 - Novos Procedimentos"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve descrição do conteúdo..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="file">Ficheiro PDF *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <Label>Visibilidade</Label>
                <Select value={targetLojas} onValueChange={(v: any) => setTargetLojas(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as minhas lojas</SelectItem>
                    <SelectItem value="especificas">Lojas específicas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetLojas === 'especificas' && minhasLojas && (
                <div>
                  <Label>Selecionar Lojas</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {minhasLojas.map((loja: any) => (
                      <label key={loja.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lojasEspecificas.includes(loja.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLojasEspecificas([...lojasEspecificas, loja.id]);
                            } else {
                              setLojasEspecificas(lojasEspecificas.filter(id => id !== loja.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{loja.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? 'A enviar...' : 'Enviar Documento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8">
      {isLoading ? (
        <div className="text-center py-12">A carregar documentos...</div>
      ) : documentos && documentos.length > 0 ? (
        <div className="grid gap-4">
          {documentos.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{doc.titulo}</h3>
                    {doc.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{doc.descricao}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.createdAt).toLocaleDateString('pt-PT')}
                      </span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>
                        {doc.targetLojas ? `${JSON.parse(doc.targetLojas).length} loja(s)` : 'Todas as lojas'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(doc)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    disabled={eliminarMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum documento enviado</h3>
          <p className="text-muted-foreground mb-4">
            Comece por enviar o primeiro documento para as suas lojas
          </p>
          <Button onClick={() => { resetForm(); setIsUploadOpen(true); }}>
            <Upload className="mr-2 h-4 w-4" />
            Enviar Primeiro Documento
          </Button>
        </Card>
      )}

      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-titulo">Título *</Label>
              <Input
                id="edit-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label>Visibilidade</Label>
              <Select value={targetLojas} onValueChange={(v: any) => setTargetLojas(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as minhas lojas</SelectItem>
                  <SelectItem value="especificas">Lojas específicas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetLojas === 'especificas' && minhasLojas && (
              <div>
                <Label>Selecionar Lojas</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {minhasLojas.map((loja: any) => (
                    <label key={loja.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lojasEspecificas.includes(loja.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLojasEspecificas([...lojasEspecificas, loja.id]);
                          } else {
                            setLojasEspecificas(lojasEspecificas.filter(id => id !== loja.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{loja.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={editarMutation.isPending}>
                {editarMutation.isPending ? 'A guardar...' : 'Guardar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
