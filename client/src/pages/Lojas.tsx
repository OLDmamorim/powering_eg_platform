import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Edit, Plus, Trash2, Upload, Download } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import * as XLSX from 'xlsx';

export default function Lojas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: lojas, isLoading } = trpc.lojas.list.useQuery();

  const createMutation = trpc.lojas.create.useMutation({
    onSuccess: () => {
      toast.success("Loja criada com sucesso");
      utils.lojas.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.lojas.update.useMutation({
    onSuccess: () => {
      toast.success("Loja atualizada com sucesso");
      utils.lojas.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.lojas.delete.useMutation({
    onSuccess: () => {
      toast.success("Loja eliminada com sucesso");
      utils.lojas.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const importMutation = trpc.lojas.importExcel.useMutation({
    onSuccess: (result) => {
      const mensagens = [];
      if (result.importadas > 0) {
        mensagens.push(`${result.importadas} loja(s) importada(s)`);
      }
      if (result.ignoradas > 0) {
        mensagens.push(`${result.ignoradas} loja(s) ignorada(s) (já existem)`);
      }
      if (result.erros.length > 0) {
        mensagens.push(`${result.erros.length} erro(s)`);
      }
      
      if (result.importadas > 0 || result.ignoradas > 0) {
        toast.success(mensagens.join(', '));
      }
      if (result.erros.length > 0) {
        toast.error(`${result.erros.length} erro(s) encontrado(s)`);
      }
      
      utils.lojas.list.invalidate();
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
    });
    setEditingLoja(null);
  };

  const handleOpenDialog = (loja?: any) => {
    if (loja) {
      setEditingLoja(loja);
      setFormData({
        nome: loja.nome,
        email: loja.email || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLoja) {
      updateMutation.mutate({ id: editingLoja.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem a certeza que deseja eliminar esta loja?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      { Nome: 'Exemplo Loja 1', Email: 'loja1@example.com' },
      { Nome: 'Exemplo Loja 2', Email: 'loja2@example.com' },
      { Nome: 'Exemplo Loja 3', Email: 'loja3@example.com' },
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lojas');
    XLSX.writeFile(wb, 'template_lojas.xlsx');
    toast.success('Template descarregado com sucesso');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Ler ficheiro e mostrar preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Mostrar apenas primeiras 10 linhas no preview
      setImportPreview(jsonData.slice(0, 10));
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Selecione um ficheiro Excel');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      // Remover prefixo data:application/...;base64,
      const base64 = base64Data.split(',')[1];
      
      importMutation.mutate({ base64Data: base64 });
    };
    reader.readAsDataURL(importFile);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lojas</h1>
            <p className="text-muted-foreground">
              Gerir lojas da rede Express Glass
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Loja
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lojas && lojas.length > 0 ? (
                  lojas.map((loja: any) => (
                    <TableRow key={loja.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {loja.nome}
                        </div>
                      </TableCell>
                      <TableCell>{loja.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(loja)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(loja.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhuma loja registada
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLoja ? "Editar Loja" : "Nova Loja"}
            </DialogTitle>
            <DialogDescription>
              {editingLoja
                ? "Atualize as informações da loja"
                : "Preencha os dados da nova loja"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editingLoja ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de importação */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Lojas por Excel</DialogTitle>
            <DialogDescription>
              Carregue um ficheiro Excel (.xlsx) com as colunas: Nome (coluna A), Email (coluna B)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Descarregar Template
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Ficheiro
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {importFile && (
              <div className="text-sm text-muted-foreground">
                Ficheiro selecionado: <strong>{importFile.name}</strong>
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (primeiras 10 linhas)</Label>
                <div className="border rounded-lg max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((row: any, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{row.Nome || '-'}</TableCell>
                          <TableCell>{row.Email || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportFile(null);
                setImportPreview([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!importFile || importMutation.isPending}
            >
              {importMutation.isPending ? 'A importar...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
