import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Edit, Plus, Trash2, Upload, Download } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import * as XLSX from 'xlsx';
import { useDemo } from "@/contexts/DemoContext";
import { demoLojas } from "@/lib/demoData";

export default function Lojas() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { isDemo } = useDemo();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    numeroLoja: null as number | null,
    email: "",
    minimoRelatoriosLivres: 0,
    minimoRelatoriosCompletos: 0,
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para seleção múltipla
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: lojasReais, isLoading } = trpc.lojas.list.useQuery(undefined, { enabled: !isDemo });
  
  // Usar dados demo ou reais
  const lojas = isDemo ? demoLojas : lojasReais;

  const createMutation = trpc.lojas.create.useMutation({
    onSuccess: () => {
      toast.success(t('lojas.lojaCriada'));
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
      toast.success(t('lojas.lojaAtualizada'));
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
      toast.success(t('lojas.lojaEliminada'));
      utils.lojas.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteManyMutation = trpc.lojas.deleteMany.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.deleted} ${t('lojas.lojasEliminadas')}`);
      utils.lojas.list.invalidate();
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const importMutation = trpc.lojas.importExcel.useMutation({
    onSuccess: (result) => {
      const mensagens = [];
      if (result.importadas > 0) {
        mensagens.push(`${result.importadas} ${t('lojas.lojasImportadas')}`);
      }
      if (result.ignoradas > 0) {
        mensagens.push(`${result.ignoradas} ${t('lojas.lojasIgnoradas')}`);
      }
      if (result.erros.length > 0) {
        mensagens.push(`${result.erros.length} ${t('lojas.errosEncontrados')}`);
      }
      
      if (result.importadas > 0 || result.ignoradas > 0) {
        toast.success(mensagens.join(', '));
      }
      if (result.erros.length > 0) {
        toast.error(`${result.erros.length} ${t('lojas.errosEncontrados')}`);
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
      numeroLoja: null,
      email: "",
      minimoRelatoriosLivres: 0,
      minimoRelatoriosCompletos: 0,
    });
    setEditingLoja(null);
  };

  const handleOpenDialog = (loja?: any) => {
    if (loja) {
      setEditingLoja(loja);
      setFormData({
        nome: loja.nome,
        numeroLoja: loja.numeroLoja || null,
        email: loja.email || "",
        minimoRelatoriosLivres: loja.minimoRelatoriosLivres || 0,
        minimoRelatoriosCompletos: loja.minimoRelatoriosCompletos || 0,
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
    if (confirm(t('lojas.confirmarEliminar'))) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.error(t('common.selecionarTodos'));
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteSelected = () => {
    deleteManyMutation.mutate({ ids: selectedIds });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && lojas) {
      setSelectedIds(lojas.map((l: any) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const isAllSelected = lojas && lojas.length > 0 && selectedIds.length === lojas.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < (lojas?.length || 0);

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
    toast.success(t('lojas.templateDescarregado'));
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
      toast.error(t('lojas.selecionarFicheiro'));
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
            <h1 className="text-3xl font-bold tracking-tight">{t('lojas.title')}</h1>
            <p className="text-muted-foreground">
              {t('lojas.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('lojas.eliminarSelecionadas')} ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t('lojas.importarExcel')}
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              {t('lojas.novaLoja')}
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label={t('lojas.selecionarTodas')}
                      className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>{t('lojas.nome')}</TableHead>
                  <TableHead>{t('lojas.email')}</TableHead>
                  <TableHead>{t('lojas.gestor')}</TableHead>
                  <TableHead className="text-center">Colaboradores</TableHead>
                  <TableHead className="text-right">{t('lojas.acoes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lojas && lojas.length > 0 ? (
                  lojas.map((loja: any) => (
                    <TableRow key={loja.id} className={selectedIds.includes(loja.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(loja.id)}
                          onCheckedChange={(checked) => handleSelectOne(loja.id, !!checked)}
                          aria-label={`${t('common.selecionarTodos')} ${loja.nome}`}
                        />
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {loja.numeroLoja || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {loja.nome}
                        </div>
                      </TableCell>
                      <TableCell>{loja.email || "-"}</TableCell>
                      <TableCell>{loja.gestorNome || ""}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                          {loja.numColaboradores || 0}
                        </span>
                      </TableCell>
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
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {t('lojas.semLojas')}
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
              {editingLoja ? t('lojas.editarLoja') : t('lojas.novaLoja')}
            </DialogTitle>
            <DialogDescription>
              {editingLoja
                ? t('lojas.subtitle')
                : t('lojas.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">{t('lojas.nome')} *</Label>
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
                  <Label htmlFor="numeroLoja">Número da Loja</Label>
                  <Input
                    id="numeroLoja"
                    type="number"
                    min="1"
                    placeholder="Ex: 23"
                    value={formData.numeroLoja || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, numeroLoja: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('lojas.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimoLivres">{t('lojas.minimoRelatoriosLivres')}</Label>
                <Input
                  id="minimoLivres"
                  type="number"
                  min="0"
                  value={formData.minimoRelatoriosLivres}
                  onChange={(e) =>
                    setFormData({ ...formData, minimoRelatoriosLivres: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">0 = {t('common.nenhum')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimoCompletos">{t('lojas.minimoRelatoriosCompletos')}</Label>
                <Input
                  id="minimoCompletos"
                  type="number"
                  min="0"
                  value={formData.minimoRelatoriosCompletos}
                  onChange={(e) =>
                    setFormData({ ...formData, minimoRelatoriosCompletos: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">0 = {t('common.nenhum')}</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.cancelar')}
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editingLoja ? t('common.atualizar') : t('common.criar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de importação */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('lojas.importarExcel')}</DialogTitle>
            <DialogDescription>
              {t('lojas.selecionarFicheiro')}
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
                {t('lojas.descarregarTemplate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('lojas.selecionarFicheiro')}
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
                {t('common.ficheiros')}: <strong>{importFile.name}</strong>
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>{t('lojas.previewImportacao')}</Label>
                <div className="border rounded-lg max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('lojas.nome')}</TableHead>
                        <TableHead>{t('lojas.email')}</TableHead>
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
              {t('common.cancelar')}
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!importFile || importMutation.isPending}
            >
              {importMutation.isPending ? t('common.carregando') : t('lojas.importar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de eliminação em lote */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmar')}</DialogTitle>
            <DialogDescription>
              {t('lojas.confirmarEliminarMultiplas')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {t('common.cancelar')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteSelected}
              disabled={deleteManyMutation.isPending}
            >
              {deleteManyMutation.isPending ? t('common.carregando') : `${t('common.eliminar')} ${selectedIds.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
