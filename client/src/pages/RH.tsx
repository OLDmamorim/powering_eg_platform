import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, UserPlus, Store, Car, Pencil, Trash2, Search, Wrench, Send, Mail, Eye, Loader2, AlertTriangle, Bell, CheckCircle, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RH() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLoja, setFilterLoja] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    id: 0,
    nome: "",
    codigoColaborador: "",
    cargo: "tecnico" as "responsavel_loja" | "tecnico" | "administrativo",
    tipo: "loja" as "loja" | "volante" | "recalbra",
    lojaId: null as number | null,
  });

  // Queries
  const { data: colaboradores, isLoading, refetch } = trpc.colaboradores.list.useQuery();
  const { data: lojas } = trpc.lojas.list.useQuery();
  const { data: previewData, isLoading: isLoadingPreview, refetch: refetchPreview } = trpc.colaboradores.previewRelacaoRH.useQuery(undefined, {
    enabled: isPreviewOpen,
  });
  const { data: lembreteRH, refetch: refetchLembrete } = trpc.colaboradores.verificarLembreteRH.useQuery();
  
  // Mutations
  const createMutation = trpc.colaboradores.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar colaborador: ${error.message}`);
    },
  });

  const updateMutation = trpc.colaboradores.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar colaborador: ${error.message}`);
    },
  });

  const deleteMutation = trpc.colaboradores.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador removido com sucesso!");
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao remover colaborador: ${error.message}`);
    },
  });

  const enviarRHMutation = trpc.colaboradores.enviarRelacaoRH.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsPreviewOpen(false);
      setObservacoes("");
      refetchLembrete(); // Atualizar estado do lembrete
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      id: 0,
      nome: "",
      codigoColaborador: "",
      cargo: "tecnico",
      tipo: "loja",
      lojaId: null,
    });
  };

  const handleCreate = () => {
    if (!formData.nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    if (formData.tipo === "loja" && !formData.lojaId) {
      toast.error("Selecione uma loja");
      return;
    }
    
    createMutation.mutate({
      nome: formData.nome.trim(),
      codigoColaborador: formData.codigoColaborador.trim() || null,
      cargo: formData.cargo,
      tipo: formData.tipo,
      lojaId: formData.tipo === "loja" ? formData.lojaId : null,
    });
  };

  const handleUpdate = () => {
    if (!formData.nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    
    updateMutation.mutate({
      id: formData.id,
      nome: formData.nome.trim(),
      codigoColaborador: formData.codigoColaborador.trim() || null,
      cargo: formData.cargo,
      tipo: formData.tipo,
      lojaId: formData.tipo === "loja" ? formData.lojaId : null,
    });
  };

  const openEditDialog = (colaborador: any) => {
    setFormData({
      id: colaborador.id,
      nome: colaborador.nome,
      codigoColaborador: colaborador.codigoColaborador || "",
      cargo: colaborador.cargo || "tecnico",
      tipo: colaborador.tipo || "loja",
      lojaId: colaborador.lojaId,
    });
    setIsEditOpen(true);
  };

  const handleEnviarRH = () => {
    enviarRHMutation.mutate({ observacoes: observacoes.trim() || undefined });
  };

  // Função para gerar e descarregar PDF da relação de colaboradores
  const handleDownloadPDF = async () => {
    if (!previewData) return;
    
    // Gerar HTML para o PDF
    const cargoNomesLocal: Record<string, string> = {
      'responsavel_loja': 'Responsável de Loja',
      'tecnico': 'Técnico',
      'administrativo': 'Administrativo'
    };
    
    const dataAtual = new Date().toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relação de Colaboradores - ${previewData.mes}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 20px; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .logo { font-size: 24px; font-weight: bold; color: #059669; }
          .logo-sub { font-size: 10px; color: #666; }
          .header-right { text-align: right; font-size: 10px; color: #666; }
          .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .info-label { font-weight: 600; color: #166534; }
          .section { margin-bottom: 15px; page-break-inside: avoid; }
          .section-header { background: #059669; color: white; padding: 8px 12px; font-weight: 600; border-radius: 6px 6px 0 0; font-size: 12px; }
          .section-header-volante { background: #3b82f6; }
          .section-header-recalbra { background: #f97316; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; padding: 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; font-size: 10px; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .empty-msg { padding: 12px; color: #6b7280; font-style: italic; text-align: center; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 500; }
          .badge-loja { background: #dcfce7; color: #166534; }
          .badge-volante { background: #dbeafe; color: #1e40af; }
          .badge-recalbra { background: #fed7aa; color: #9a3412; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #6b7280; }
          .total-badge { background: #059669; color: white; padding: 3px 10px; border-radius: 12px; font-weight: 600; }
          @media print { body { padding: 10px; } .section { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div>
              <div class="logo">EXPRESSGLASS</div>
              <div class="logo-sub">Relação de Colaboradores</div>
            </div>
          </div>
          <div class="header-right">
            <div>Gerado em: ${dataAtual}</div>
            <div>PoweringEG Platform</div>
          </div>
        </div>
        
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Gestor:</span>
            <span>${previewData.gestorNome}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Período:</span>
            <span style="text-transform: capitalize;">${previewData.mes}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total de Colaboradores:</span>
            <span class="total-badge">${previewData.totalColaboradores}</span>
          </div>
        </div>
    `;
    
    // Adicionar lojas com colaboradores
    for (const { loja, colaboradores } of previewData.colaboradoresPorLoja) {
      if (colaboradores.length === 0) continue; // Pular lojas sem colaboradores
      
      htmlContent += `
        <div class="section">
          <div class="section-header">
            \uD83C\uDFEA ${loja.nome} ${loja.numeroLoja ? `(Loja ${loja.numeroLoja})` : ''} - ${colaboradores.length} colaborador${colaboradores.length !== 1 ? 'es' : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 45%">Nome</th>
                <th style="width: 20%">Código</th>
                <th style="width: 35%">Cargo</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      for (const c of colaboradores) {
        htmlContent += `
          <tr>
            <td>${c.nome}</td>
            <td>${c.codigoColaborador || '-'}</td>
            <td>${cargoNomesLocal[c.cargo] || c.cargo}</td>
          </tr>
        `;
      }
      
      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    }
    
    // Adicionar volantes
    if (previewData.volantes.length > 0) {
      htmlContent += `
        <div class="section">
          <div class="section-header section-header-volante">
            \uD83D\uDE97 Volantes da Zona - ${previewData.volantes.length} colaborador${previewData.volantes.length !== 1 ? 'es' : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 45%">Nome</th>
                <th style="width: 20%">Código</th>
                <th style="width: 35%">Cargo</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      for (const v of previewData.volantes) {
        htmlContent += `
          <tr>
            <td>${v.nome} <span class="badge badge-volante">Volante</span></td>
            <td>${v.codigoColaborador || '-'}</td>
            <td>${cargoNomesLocal[v.cargo] || v.cargo}</td>
          </tr>
        `;
      }
      
      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    }
    
    // Adicionar recalbra
    if (previewData.recalbras.length > 0) {
      htmlContent += `
        <div class="section">
          <div class="section-header section-header-recalbra">
            \uD83D\uDD27 Recalbra - ${previewData.recalbras.length} colaborador${previewData.recalbras.length !== 1 ? 'es' : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 45%">Nome</th>
                <th style="width: 20%">Código</th>
                <th style="width: 35%">Cargo</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      for (const r of previewData.recalbras) {
        htmlContent += `
          <tr>
            <td>${r.nome} <span class="badge badge-recalbra">Recalbra</span></td>
            <td>${r.codigoColaborador || '-'}</td>
            <td>${cargoNomesLocal[r.cargo] || r.cargo}</td>
          </tr>
        `;
      }
      
      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    }
    
    htmlContent += `
        <div class="footer">
          <p>Documento gerado automaticamente pela plataforma PoweringEG</p>
          <p>ExpressGlass - Especialistas em Vidro Automóvel</p>
        </div>
      </body>
      </html>
    `;
    
    // Criar blob e descarregar
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Abrir numa nova janela para impressão/PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    toast.success('Documento aberto para impressão/PDF. Use Ctrl+P ou Cmd+P para guardar como PDF.');
  };

  const cargoNomes: Record<string, string> = {
    'responsavel_loja': 'Responsável de Loja',
    'tecnico': 'Técnico',
    'administrativo': 'Administrativo'
  };

  // Filter colaboradores
  const filteredColaboradores = colaboradores?.filter((c) => {
    const matchesSearch = 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.codigoColaborador?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLoja = filterLoja === "all" || 
      (filterLoja === "volante" && c.tipo === "volante") ||
      (filterLoja === "recalbra" && c.tipo === "recalbra") ||
      (c.lojaId?.toString() === filterLoja);
    
    const matchesTipo = filterTipo === "all" ||
      c.tipo === filterTipo;
    
    return matchesSearch && matchesLoja && matchesTipo;
  }) || [];

  // Stats
  const totalColaboradores = colaboradores?.length || 0;
  const totalVolantes = colaboradores?.filter(c => c.tipo === "volante").length || 0;
  const totalRecalbra = colaboradores?.filter(c => c.tipo === "recalbra").length || 0;
  const totalLojas = colaboradores?.filter(c => c.tipo === "loja").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Alerta de Lembrete RH */}
        {lembreteRH?.mostrarLembrete && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <Bell className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <span>Lembrete: Enviar Relação de Colaboradores</span>
              <Badge variant="outline" className="border-amber-500 text-amber-700">
                Dia {lembreteRH.diaAtual}
              </Badge>
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <p className="mb-2">
                É altura de enviar a relação de colaboradores para os Recursos Humanos referente a <strong className="capitalize">{lembreteRH.mesReferencia}</strong>.
              </p>
              <p className="text-sm">
                Restam <strong>{lembreteRH.diasRestantes}</strong> dias até ao final do mês.
              </p>
              <Button 
                size="sm" 
                className="mt-3 bg-amber-600 hover:bg-amber-700"
                onClick={() => {
                  setIsPreviewOpen(true);
                  refetchPreview();
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Agora
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Confirmação de envio este mês */}
        {lembreteRH?.jaEnviouEsteMes && (
          <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <AlertTitle className="text-emerald-800 dark:text-emerald-200">
              Relação de Colaboradores Enviada
            </AlertTitle>
            <AlertDescription className="text-emerald-700 dark:text-emerald-300">
              Já enviou a relação de colaboradores para os RH este mês 
              {lembreteRH.dataUltimoEnvio && (
                <span> em {new Date(lembreteRH.dataUltimoEnvio).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              )}.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
          <p className="text-muted-foreground">
            Gestão de colaboradores das lojas e volantes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Botão Enviar para RH */}
          <Button 
            variant="outline" 
            onClick={() => {
              setIsPreviewOpen(true);
              refetchPreview();
            }}
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
          >
            <Mail className="mr-2 h-4 w-4" />
            Enviar para RH
          </Button>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Colaborador</DialogTitle>
                <DialogDescription>
                  Adicione um novo colaborador a uma loja ou como volante da zona
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do colaborador"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="codigo">Código do Colaborador</Label>
                  <Input
                    id="codigo"
                    value={formData.codigoColaborador}
                    onChange={(e) => setFormData({ ...formData, codigoColaborador: e.target.value })}
                    placeholder="Código (opcional)"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Tabs 
                    value={formData.tipo} 
                    onValueChange={(v) => setFormData({ 
                      ...formData, 
                      tipo: v as "loja" | "volante" | "recalbra",
                      lojaId: v !== "loja" ? null : formData.lojaId
                    })}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="loja">
                        <Store className="mr-2 h-4 w-4" />
                        Loja
                      </TabsTrigger>
                      <TabsTrigger value="volante">
                        <Car className="mr-2 h-4 w-4" />
                        Volante
                      </TabsTrigger>
                      <TabsTrigger value="recalbra">
                        <Wrench className="mr-2 h-4 w-4" />
                        Recalbra
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {formData.tipo === "loja" && (
                  <div className="grid gap-2">
                    <Label htmlFor="loja">Loja *</Label>
                    <Select
                      value={formData.lojaId?.toString() || ""}
                      onValueChange={(v) => setFormData({ ...formData, lojaId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a loja" />
                      </SelectTrigger>
                      <SelectContent>
                        {lojas?.map((loja) => (
                          <SelectItem key={loja.id} value={loja.id.toString()}>
                            {loja.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.tipo === "volante" && (
                  <p className="text-sm text-muted-foreground">
                    O colaborador volante ficará associado à sua zona de gestão e poderá ser alocado a qualquer loja conforme necessário.
                  </p>
                )}
                {formData.tipo === "recalbra" && (
                  <p className="text-sm text-muted-foreground">
                    O colaborador Recalbra ficará associado à sua zona de gestão.
                  </p>
                )}
                <div className="grid gap-2">
                  <Label>Cargo</Label>
                  <Select
                    value={formData.cargo}
                    onValueChange={(v) => setFormData({ ...formData, cargo: v as "responsavel_loja" | "tecnico" | "administrativo" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="responsavel_loja">Responsável de Loja</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "A criar..." : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalColaboradores}</div>
              <p className="text-xs text-muted-foreground">colaboradores ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Lojas</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLojas}</div>
              <p className="text-xs text-muted-foreground">colaboradores fixos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volantes</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVolantes}</div>
              <p className="text-xs text-muted-foreground">colaboradores móveis</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recalbra</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecalbra}</div>
              <p className="text-xs text-muted-foreground">colaboradores recalbra</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Colaboradores</CardTitle>
            <CardDescription>
              Gerir colaboradores das lojas e volantes da zona
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterLoja} onValueChange={setFilterLoja}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as lojas</SelectItem>
                  <SelectItem value="volante">Volantes</SelectItem>
                  <SelectItem value="recalbra">Recalbra</SelectItem>
                  {lojas?.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id.toString()}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredColaboradores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {colaboradores?.length === 0 
                  ? "Nenhum colaborador registado. Clique em 'Novo Colaborador' para adicionar."
                  : "Nenhum colaborador encontrado com os filtros aplicados."}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Loja / Zona</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredColaboradores.map((colaborador) => (
                      <TableRow key={colaborador.id}>
                        <TableCell className="font-medium">{colaborador.nome}</TableCell>
                        <TableCell>{colaborador.codigoColaborador || "-"}</TableCell>
                        <TableCell>
                          {colaborador.tipo === "volante" ? (
                            <Badge variant="secondary">
                              <Car className="mr-1 h-3 w-3" />
                              Volante
                            </Badge>
                          ) : colaborador.tipo === "recalbra" ? (
                            <Badge variant="default" className="bg-orange-500">
                              <Wrench className="mr-1 h-3 w-3" />
                              Recalbra
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Store className="mr-1 h-3 w-3" />
                              Loja
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {cargoNomes[colaborador.cargo] || colaborador.cargo}
                          </span>
                        </TableCell>
                        <TableCell>
                          {colaborador.tipo !== "loja" 
                            ? (colaborador as any).gestorNome || "Zona do Gestor"
                            : (colaborador as any).lojaNome || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(colaborador)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(colaborador.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Colaborador</DialogTitle>
              <DialogDescription>
                Atualize os dados do colaborador
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do colaborador"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-codigo">Código do Colaborador</Label>
                <Input
                  id="edit-codigo"
                  value={formData.codigoColaborador}
                  onChange={(e) => setFormData({ ...formData, codigoColaborador: e.target.value })}
                  placeholder="Código (opcional)"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Tabs 
                  value={formData.tipo} 
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    tipo: v as "loja" | "volante" | "recalbra",
                    lojaId: v !== "loja" ? null : formData.lojaId
                  })}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="loja">
                      <Store className="mr-2 h-4 w-4" />
                      Loja
                    </TabsTrigger>
                    <TabsTrigger value="volante">
                      <Car className="mr-2 h-4 w-4" />
                      Volante
                    </TabsTrigger>
                    <TabsTrigger value="recalbra">
                      <Wrench className="mr-2 h-4 w-4" />
                      Recalbra
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {formData.tipo === "loja" && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-loja">Loja *</Label>
                  <Select
                    value={formData.lojaId?.toString() || ""}
                    onValueChange={(v) => setFormData({ ...formData, lojaId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas?.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id.toString()}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Select
                  value={formData.cargo}
                  onValueChange={(v) => setFormData({ ...formData, cargo: v as "responsavel_loja" | "tecnico" | "administrativo" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsavel_loja">Responsável de Loja</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Colaborador</AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza que deseja remover este colaborador? Esta ação pode ser revertida mais tarde.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Dialog - Enviar para RH */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Pré-visualização - Relação de Colaboradores
              </DialogTitle>
              <DialogDescription>
                Verifique os dados antes de enviar para recursoshumanos@expressglass.pt
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : previewData ? (
              <div className="space-y-6 py-4">
                {/* Info Box */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Gestor:</span>
                    <span>{previewData.gestorNome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Mês:</span>
                    <span className="capitalize">{previewData.mes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total de Colaboradores:</span>
                    <Badge variant="secondary">{previewData.totalColaboradores}</Badge>
                  </div>
                </div>

                {/* Colaboradores por Loja */}
                {previewData.colaboradoresPorLoja.map(({ loja, colaboradores }) => (
                  <div key={loja.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 dark:bg-emerald-950 px-4 py-2 font-medium flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      {loja.nome}
                      {loja.numeroLoja && <span className="text-muted-foreground">(Loja {loja.numeroLoja})</span>}
                      <Badge variant="outline" className="ml-auto">{colaboradores.length}</Badge>
                    </div>
                    {colaboradores.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Cargo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {colaboradores.map((c, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{c.nome}</TableCell>
                              <TableCell>{c.codigoColaborador || "-"}</TableCell>
                              <TableCell>{cargoNomes[c.cargo] || c.cargo}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-sm p-4 italic">
                        Sem colaboradores registados nesta loja
                      </p>
                    )}
                  </div>
                ))}

                {/* Volantes */}
                {previewData.volantes.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 dark:bg-blue-950 px-4 py-2 font-medium flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Volantes da Zona
                      <Badge variant="outline" className="ml-auto">{previewData.volantes.length}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Cargo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.volantes.map((v, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {v.nome}
                              <Badge variant="secondary" className="ml-2">Volante</Badge>
                            </TableCell>
                            <TableCell>{v.codigoColaborador || "-"}</TableCell>
                            <TableCell>{cargoNomes[v.cargo] || v.cargo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Recalbra */}
                {previewData.recalbras.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-orange-50 dark:bg-orange-950 px-4 py-2 font-medium flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Recalbra
                      <Badge variant="outline" className="ml-auto">{previewData.recalbras.length}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Cargo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.recalbras.map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {r.nome}
                              <Badge className="ml-2 bg-orange-500">Recalbra</Badge>
                            </TableCell>
                            <TableCell>{r.codigoColaborador || "-"}</TableCell>
                            <TableCell>{cargoNomes[r.cargo] || r.cargo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações (opcional)</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione observações ou notas para os RH..."
                    rows={3}
                  />
                </div>

                {/* Destinatário */}
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Destinatário:</span>
                    <span>mamorim@expressglass.pt</span>
                    <span className="text-xs text-amber-600">(modo teste)</span>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isLoadingPreview || !previewData}
                className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button 
                onClick={handleEnviarRH} 
                disabled={enviarRHMutation.isPending || isLoadingPreview}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {enviarRHMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para RH
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
