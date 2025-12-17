import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Calendar, User, ChevronDown, ChevronUp, FileText, ClipboardList, Filter, Download, Image, X, Pencil, Trash2, Mail, Loader2, Tag } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { CategoriaAutocomplete } from "@/components/CategoriaAutocomplete";
import { EstadoAcompanhamentoSelect, EstadoAcompanhamentoBadge } from "@/components/EstadoAcompanhamento";

export default function Relatorios() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [expandedLivres, setExpandedLivres] = useState<number[]>([]);
  const [expandedCompletos, setExpandedCompletos] = useState<number[]>([]);
  
  // Ler query param para definir aba ativa
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const tipoParam = urlParams.get('tipo');
  const [activeTab, setActiveTab] = useState<string>(tipoParam === 'completos' ? 'completos' : 'livres');
  
  // Filtros
  const [filtroLoja, setFiltroLoja] = useState<string>("all");
  const [filtroGestor, setFiltroGestor] = useState<string>("all");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [apenasNaoVistos, setApenasNaoVistos] = useState(false);

  // Estados para edição e eliminação
  const [editingLivre, setEditingLivre] = useState<any>(null);
  const [editingCompleto, setEditingCompleto] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; tipo: 'livre' | 'completo' } | null>(null);
  const [editDescricao, setEditDescricao] = useState("");

  const utils = trpc.useUtils();

  const { data: relatoriosLivres, isLoading: loadingLivres } =
    trpc.relatoriosLivres.list.useQuery({ apenasNaoVistos });
  const { data: relatoriosCompletos, isLoading: loadingCompletos } =
    trpc.relatoriosCompletos.list.useQuery({ apenasNaoVistos });
  const { data: countLivresNaoVistos } = trpc.relatoriosLivres.countNaoVistos.useQuery();
  const { data: countCompletosNaoVistos } = trpc.relatoriosCompletos.countNaoVistos.useQuery();
  const { data: lojas } = trpc.lojas.list.useQuery();
  const { data: gestores } = trpc.gestores.list.useQuery();
  
  // Query para categorias (apenas admin)
  const { data: categorias } = trpc.categorizacao.getCategorias.useQuery(undefined, {
    enabled: user?.role === 'admin',
  });

  // Mutations
  const updateLivreMutation = trpc.relatoriosLivres.update.useMutation({
    onSuccess: () => {
      toast.success("Relatório atualizado com sucesso");
      utils.relatoriosLivres.list.invalidate();
      setEditingLivre(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar relatório");
    }
  });

  const deleteLivreMutation = trpc.relatoriosLivres.delete.useMutation({
    onSuccess: () => {
      toast.success("Relatório eliminado com sucesso");
      utils.relatoriosLivres.list.invalidate();
      utils.relatoriosLivres.countNaoVistos.invalidate();
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao eliminar relatório");
    }
  });

  const updateCompletoMutation = trpc.relatoriosCompletos.update.useMutation({
    onSuccess: () => {
      toast.success("Relatório atualizado com sucesso");
      utils.relatoriosCompletos.list.invalidate();
      setEditingCompleto(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar relatório");
    }
  });

  const deleteCompletoMutation = trpc.relatoriosCompletos.delete.useMutation({
    onSuccess: () => {
      toast.success("Relatório eliminado com sucesso");
      utils.relatoriosCompletos.list.invalidate();
      utils.relatoriosCompletos.countNaoVistos.invalidate();
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao eliminar relatório");
    }
  });

  const enviarEmailLivreMutation = trpc.relatoriosLivres.enviarEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Relatório enviado para ${data.email}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar email");
    }
  });

  // Mutations para categorização
  const updateCategoriaMutation = trpc.categorizacao.updateCategoria.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada");
      utils.relatoriosLivres.list.invalidate();
      utils.relatoriosCompletos.list.invalidate();
      utils.categorizacao.getCategorias.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar categoria");
    }
  });

  const updateEstadoMutation = trpc.categorizacao.updateEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado atualizado");
      utils.relatoriosLivres.list.invalidate();
      utils.relatoriosCompletos.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar estado");
    }
  });

  const isAdmin = user?.role === "admin";

  if (!isAdmin && user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  const toggleLivre = (id: number) => {
    setExpandedLivres(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleCompleto = (id: number) => {
    setExpandedCompletos(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Aplicar filtros
  const filtrarRelatorios = (relatorios: any[]) => {
    if (!relatorios) return [];
    
    return relatorios.filter(r => {
      // Filtro por loja
      if (filtroLoja !== "all" && r.lojaId !== parseInt(filtroLoja)) return false;
      
      // Filtro por gestor (apenas para admin)
      if (isAdmin && filtroGestor !== "all" && r.gestorId !== parseInt(filtroGestor)) return false;
      
      // Filtro por data início
      if (filtroDataInicio) {
        const dataRelatorio = new Date(r.dataVisita);
        const dataInicio = new Date(filtroDataInicio);
        if (dataRelatorio < dataInicio) return false;
      }
      
      // Filtro por data fim
      if (filtroDataFim) {
        const dataRelatorio = new Date(r.dataVisita);
        const dataFim = new Date(filtroDataFim);
        dataFim.setHours(23, 59, 59);
        if (dataRelatorio > dataFim) return false;
      }
      
      return true;
    });
  };

  const relatoriosLivresFiltrados = useMemo(() => filtrarRelatorios(relatoriosLivres || []), [relatoriosLivres, filtroLoja, filtroGestor, filtroDataInicio, filtroDataFim]);
  const relatoriosCompletosFiltrados = useMemo(() => filtrarRelatorios(relatoriosCompletos || []), [relatoriosCompletos, filtroLoja, filtroGestor, filtroDataInicio, filtroDataFim]);

  const temFiltrosAtivos = filtroLoja !== "all" || filtroGestor !== "all" || filtroDataInicio || filtroDataFim || apenasNaoVistos;

  const limparFiltros = () => {
    setFiltroLoja("all");
    setFiltroGestor("all");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setApenasNaoVistos(false);
  };

  // Função para exportar PDF
  const exportarPDF = (relatorio: any, tipo: 'livre' | 'completo') => {
    const gestorNome = relatorio.gestor?.user?.name || "Gestor";
    const lojaNome = relatorio.loja?.nome || "Loja";
    const dataVisita = new Date(relatorio.dataVisita).toLocaleDateString("pt-PT");
    
    let camposHtml = '';
    
    if (tipo === 'livre') {
      camposHtml = `
        <div class="section">
          <h2>Descrição da Visita</h2>
          <p>${relatorio.descricao?.replace(/\n/g, '<br>') || 'Sem descrição'}</p>
        </div>
      `;
    } else {
      const campos = [
        { label: 'EPIs e Fardamento', value: relatorio.episFardamento },
        { label: 'Kit Primeiros Socorros', value: relatorio.kitPrimeirosSocorros },
        { label: 'Consumíveis', value: relatorio.consumiveis },
        { label: 'Espaço Físico', value: relatorio.espacoFisico },
        { label: 'Reclamações', value: relatorio.reclamacoes },
        { label: 'Vendas Complementares', value: relatorio.vendasComplementares },
        { label: 'Fichas de Serviço', value: relatorio.fichasServico },
        { label: 'Documentação Obrigatória', value: relatorio.documentacaoObrigatoria },
        { label: 'Reunião Quinzenal', value: relatorio.reuniaoQuinzenal ? 'Sim' : 'Não' },
        { label: 'Resumo da Supervisão', value: relatorio.resumoSupervisao },
        { label: 'Colaboradores Presentes', value: relatorio.colaboradoresPresentes },
        { label: 'Pontos Positivos', value: relatorio.pontosPositivos },
        { label: 'Pontos Negativos', value: relatorio.pontosNegativos },
      ];
      
      camposHtml = campos.filter(c => c.value).map(c => `
        <div class="section">
          <h2>${c.label}</h2>
          <p>${String(c.value).replace(/\n/g, '<br>')}</p>
        </div>
      `).join('');
    }

    // Fotos
    let fotosHtml = '';
    if (relatorio.fotos) {
      try {
        const fotosArray = JSON.parse(relatorio.fotos);
        if (fotosArray.length > 0) {
          fotosHtml = `
            <div class="section">
              <h2>Fotos</h2>
              <div class="fotos">
                ${fotosArray.map((foto: string) => `<img src="${foto}" alt="Foto" />`).join('')}
              </div>
            </div>
          `;
        }
      } catch {}
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório ${tipo === 'livre' ? 'Livre' : 'Completo'} - ${lojaNome}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 10px 0; color: #333; }
    .header .meta { color: #666; font-size: 14px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 16px; color: #555; margin-bottom: 8px; border-left: 3px solid #007bff; padding-left: 10px; }
    .section p { margin: 0; line-height: 1.6; }
    .fotos { display: flex; flex-wrap: wrap; gap: 10px; }
    .fotos img { max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório ${tipo === 'livre' ? 'Livre' : 'Completo'}</h1>
    <div class="meta">
      <p><strong>Gestor:</strong> ${gestorNome}</p>
      <p><strong>Loja:</strong> ${lojaNome}</p>
      <p><strong>Data da Visita:</strong> ${dataVisita}</p>
    </div>
  </div>
  ${camposHtml}
  ${fotosHtml}
  <div class="footer">
    <p>PoweringEG Platform - Relatório gerado em ${new Date().toLocaleString('pt-PT')}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${tipo}-${lojaNome.replace(/\s+/g, '-')}-${dataVisita.replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Componente para mostrar fotos
  const FotosGaleria = ({ fotos }: { fotos: string | null }) => {
    if (!fotos) return null;
    
    let fotosArray: string[] = [];
    try {
      fotosArray = JSON.parse(fotos);
    } catch {
      return null;
    }
    
    if (fotosArray.length === 0) return null;

    return (
      <div className="mt-3">
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <Image className="h-4 w-4" />
          Fotos ({fotosArray.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {fotosArray.map((foto, index) => (
            <Dialog key={index}>
              <DialogTrigger asChild>
                <button className="relative group">
                  <img 
                    src={foto} 
                    alt={`Foto ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <img 
                  src={foto} 
                  alt={`Foto ${index + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    );
  };

  // Função para renderizar o título do relatório baseado no role
  const renderTituloRelatorio = (relatorio: any) => {
    if (isAdmin) {
      // Admin vê: Gestor → Loja
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-purple-600 dark:text-purple-400">
            {relatorio.gestor?.user?.name || "Gestor"}
          </span>
          <span className="text-muted-foreground">→</span>
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-medium">{relatorio.loja?.nome}</span>
        </div>
      );
    } else {
      // Gestor vê apenas: Loja
      return (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-medium">{relatorio.loja?.nome}</span>
        </div>
      );
    }
  };

  // Handler para eliminar
  const handleDelete = () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.tipo === 'livre') {
      deleteLivreMutation.mutate({ id: deleteConfirm.id });
    } else {
      deleteCompletoMutation.mutate({ id: deleteConfirm.id });
    }
  };

  // Handler para guardar edição de relatório livre
  const handleSaveEditLivre = () => {
    if (!editingLivre) return;
    updateLivreMutation.mutate({
      id: editingLivre.id,
      descricao: editDescricao,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Visualizar e gerir todos os relatórios de supervisão" : "Os seus relatórios de supervisão"}
            </p>
          </div>
          <Button 
            variant={showFilters ? "default" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {temFiltrosAtivos && (
              <Badge variant="secondary" className="ml-1">Ativos</Badge>
            )}
          </Button>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setApenasNaoVistos(!apenasNaoVistos)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      apenasNaoVistos 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {apenasNaoVistos ? '✓ Apenas Não Vistos' : 'Mostrar Apenas Não Vistos'}
                  </button>
                  {isAdmin && (countLivresNaoVistos || 0) + (countCompletosNaoVistos || 0) > 0 && (
                    <Badge variant="destructive">
                      {(countLivresNaoVistos || 0) + (countCompletosNaoVistos || 0)} por ver
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Loja</Label>
                  <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as lojas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as lojas</SelectItem>
                      {lojas?.map((loja: any) => (
                        <SelectItem key={loja.id} value={loja.id.toString()}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <Label>Gestor</Label>
                    <Select value={filtroGestor} onValueChange={setFiltroGestor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os gestores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os gestores</SelectItem>
                        {gestores?.filter((g: any) => g.id).map((gestor: any) => (
                          <SelectItem key={gestor.id} value={gestor.id.toString()}>
                            {gestor.user?.name || "Gestor"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input 
                    type="date" 
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input 
                    type="date" 
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
              </div>

              {temFiltrosAtivos && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-2">
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="livres">
              <FileText className="h-4 w-4 mr-2" />
              Relatórios Livres ({relatoriosLivresFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="completos">
              <ClipboardList className="h-4 w-4 mr-2" />
              Relatórios Completos ({relatoriosCompletosFiltrados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="livres" className="space-y-3">
            {loadingLivres ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : relatoriosLivresFiltrados.length > 0 ? (
              <div className="space-y-2">
                {relatoriosLivresFiltrados.map((relatorio: any) => (
                  <Collapsible 
                    key={relatorio.id} 
                    open={expandedLivres.includes(relatorio.id)}
                    onOpenChange={() => toggleLivre(relatorio.id)}
                  >
                    <Card className="transition-all hover:shadow-md">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                              {renderTituloRelatorio(relatorio)}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
                              {relatorio.fotos && JSON.parse(relatorio.fotos).length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Image className="h-3 w-3" />
                                  {JSON.parse(relatorio.fotos).length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Livre</Badge>
                              {expandedLivres.includes(relatorio.id) ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4 border-t">
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Descrição da Visita</p>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                              {relatorio.descricao}
                            </p>
                          </div>
                          
                          <FotosGaleria fotos={relatorio.fotos} />
                          
                          {/* Categorização - apenas para admin */}
                          {isAdmin && (
                            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed">
                              <div className="flex items-center gap-2 mb-3">
                                <Tag className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Categorização</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs">Categoria</Label>
                                  <CategoriaAutocomplete
                                    value={relatorio.categoria || ""}
                                    onChange={(categoria) => {
                                      updateCategoriaMutation.mutate({
                                        relatorioId: relatorio.id,
                                        tipoRelatorio: relatorio.resumoSupervisao !== undefined ? 'completo' : 'livre',
                                        categoria,
                                      });
                                    }}
                                    sugestoes={categorias || []}
                                    placeholder="Escreva ou selecione..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Estado</Label>
                                  <EstadoAcompanhamentoSelect
                                    value={relatorio.estadoAcompanhamento || null}
                                    onChange={(estado) => {
                                      if (estado) {
                                        updateEstadoMutation.mutate({
                                          relatorioId: relatorio.id,
                                          tipoRelatorio: relatorio.resumoSupervisao !== undefined ? 'completo' : 'livre',
                                          estado,
                                        });
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              Criado em: {new Date(relatorio.createdAt).toLocaleString("pt-PT")}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLivre(relatorio);
                                  setEditDescricao(relatorio.descricao);
                                }}
                                className="gap-1"
                              >
                                <Pencil className="h-3 w-3" />
                                Editar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ id: relatorio.id, tipo: 'livre' });
                                }}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                                Apagar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportarPDF(relatorio, 'livre');
                                }}
                                className="gap-1"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  enviarEmailLivreMutation.mutate({ id: relatorio.id });
                                }}
                                disabled={enviarEmailLivreMutation.isPending}
                                className="gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                {enviarEmailLivreMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Mail className="h-3 w-3" />
                                )}
                                Enviar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    {temFiltrosAtivos 
                      ? "Nenhum relatório livre encontrado com os filtros aplicados"
                      : "Nenhum relatório livre registado"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completos" className="space-y-3">
            {loadingCompletos ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : relatoriosCompletosFiltrados.length > 0 ? (
              <div className="space-y-2">
                {relatoriosCompletosFiltrados.map((relatorio: any) => (
                  <Collapsible 
                    key={relatorio.id} 
                    open={expandedCompletos.includes(relatorio.id)}
                    onOpenChange={() => toggleCompleto(relatorio.id)}
                  >
                    <Card className="transition-all hover:shadow-md">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                              {renderTituloRelatorio(relatorio)}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
                              {relatorio.fotos && JSON.parse(relatorio.fotos).length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Image className="h-3 w-3" />
                                  {JSON.parse(relatorio.fotos).length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">Completo</Badge>
                              {expandedCompletos.includes(relatorio.id) ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4 border-t">
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {relatorio.episFardamento && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">EPIs e Fardamento</p>
                                <p className="text-sm text-muted-foreground">{relatorio.episFardamento}</p>
                              </div>
                            )}
                            {relatorio.kitPrimeirosSocorros && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Kit Primeiros Socorros</p>
                                <p className="text-sm text-muted-foreground">{relatorio.kitPrimeirosSocorros}</p>
                              </div>
                            )}
                            {relatorio.consumiveis && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Consumíveis</p>
                                <p className="text-sm text-muted-foreground">{relatorio.consumiveis}</p>
                              </div>
                            )}
                            {relatorio.espacoFisico && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Espaço Físico</p>
                                <p className="text-sm text-muted-foreground">{relatorio.espacoFisico}</p>
                              </div>
                            )}
                            {relatorio.reclamacoes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Reclamações</p>
                                <p className="text-sm text-muted-foreground">{relatorio.reclamacoes}</p>
                              </div>
                            )}
                            {relatorio.vendasComplementares && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Vendas Complementares</p>
                                <p className="text-sm text-muted-foreground">{relatorio.vendasComplementares}</p>
                              </div>
                            )}
                            {relatorio.fichasServico && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Fichas de Serviço</p>
                                <p className="text-sm text-muted-foreground">{relatorio.fichasServico}</p>
                              </div>
                            )}
                            {relatorio.documentacaoObrigatoria && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Documentação Obrigatória</p>
                                <p className="text-sm text-muted-foreground">{relatorio.documentacaoObrigatoria}</p>
                              </div>
                            )}
                            {relatorio.resumoSupervisao && (
                              <div className="p-3 bg-muted rounded-lg md:col-span-2">
                                <p className="text-sm font-medium mb-1">Resumo da Supervisão</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{relatorio.resumoSupervisao}</p>
                              </div>
                            )}
                            {relatorio.colaboradoresPresentes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Colaboradores Presentes</p>
                                <p className="text-sm text-muted-foreground">{relatorio.colaboradoresPresentes}</p>
                              </div>
                            )}
                            {relatorio.pontosPositivos && (
                              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                                <p className="text-sm font-medium mb-1 text-green-700 dark:text-green-400">Pontos Positivos</p>
                                <p className="text-sm text-green-600 dark:text-green-300 whitespace-pre-wrap">{relatorio.pontosPositivos}</p>
                              </div>
                            )}
                            {relatorio.pontosNegativos && (
                              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                                <p className="text-sm font-medium mb-1 text-red-700 dark:text-red-400">Pontos Negativos</p>
                                <p className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap">{relatorio.pontosNegativos}</p>
                              </div>
                            )}
                          </div>
                          
                          <FotosGaleria fotos={relatorio.fotos} />
                          
                          {/* Categorização - apenas para admin */}
                          {isAdmin && (
                            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed">
                              <div className="flex items-center gap-2 mb-3">
                                <Tag className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Categorização</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs">Categoria</Label>
                                  <CategoriaAutocomplete
                                    value={relatorio.categoria || ""}
                                    onChange={(categoria) => {
                                      updateCategoriaMutation.mutate({
                                        relatorioId: relatorio.id,
                                        tipoRelatorio: relatorio.resumoSupervisao !== undefined ? 'completo' : 'livre',
                                        categoria,
                                      });
                                    }}
                                    sugestoes={categorias || []}
                                    placeholder="Escreva ou selecione..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Estado</Label>
                                  <EstadoAcompanhamentoSelect
                                    value={relatorio.estadoAcompanhamento || null}
                                    onChange={(estado) => {
                                      if (estado) {
                                        updateEstadoMutation.mutate({
                                          relatorioId: relatorio.id,
                                          tipoRelatorio: relatorio.resumoSupervisao !== undefined ? 'completo' : 'livre',
                                          estado,
                                        });
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              Criado em: {new Date(relatorio.createdAt).toLocaleString("pt-PT")}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCompleto(relatorio);
                                }}
                                className="gap-1"
                              >
                                <Pencil className="h-3 w-3" />
                                Editar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ id: relatorio.id, tipo: 'completo' });
                                }}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                                Apagar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportarPDF(relatorio, 'completo');
                                }}
                                className="gap-1"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    {temFiltrosAtivos 
                      ? "Nenhum relatório completo encontrado com os filtros aplicados"
                      : "Nenhum relatório completo registado"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de Edição de Relatório Livre */}
      <Dialog open={!!editingLivre} onOpenChange={(open) => !open && setEditingLivre(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Relatório Livre</DialogTitle>
            <DialogDescription>
              Altere a descrição do relatório
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                rows={6}
                placeholder="Descrição da visita..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLivre(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEditLivre}
              disabled={updateLivreMutation.isPending}
            >
              {updateLivreMutation.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Relatório Completo */}
      <Dialog open={!!editingCompleto} onOpenChange={(open) => !open && setEditingCompleto(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Relatório Completo</DialogTitle>
            <DialogDescription>
              Altere os campos do relatório
            </DialogDescription>
          </DialogHeader>
          {editingCompleto && (
            <EditarRelatorioCompletoForm 
              relatorio={editingCompleto}
              onSave={(data) => {
                updateCompletoMutation.mutate({ id: editingCompleto.id, ...data });
              }}
              onCancel={() => setEditingCompleto(null)}
              isPending={updateCompletoMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Eliminação */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminação</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja eliminar este relatório? Esta ação não pode ser revertida.
              Os pendentes associados também serão eliminados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteLivreMutation.isPending || deleteCompletoMutation.isPending}
            >
              {(deleteLivreMutation.isPending || deleteCompletoMutation.isPending) ? "A eliminar..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Componente separado para editar relatório completo
function EditarRelatorioCompletoForm({ 
  relatorio, 
  onSave, 
  onCancel,
  isPending 
}: { 
  relatorio: any; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    episFardamento: relatorio.episFardamento || "",
    kitPrimeirosSocorros: relatorio.kitPrimeirosSocorros || "",
    consumiveis: relatorio.consumiveis || "",
    espacoFisico: relatorio.espacoFisico || "",
    reclamacoes: relatorio.reclamacoes || "",
    vendasComplementares: relatorio.vendasComplementares || "",
    fichasServico: relatorio.fichasServico || "",
    documentacaoObrigatoria: relatorio.documentacaoObrigatoria || "",
    resumoSupervisao: relatorio.resumoSupervisao || "",
    colaboradoresPresentes: relatorio.colaboradoresPresentes || "",
    pontosPositivos: relatorio.pontosPositivos || "",
    pontosNegativos: relatorio.pontosNegativos || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>EPIs e Fardamento</Label>
          <Textarea
            value={formData.episFardamento}
            onChange={(e) => handleChange('episFardamento', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Kit Primeiros Socorros</Label>
          <Textarea
            value={formData.kitPrimeirosSocorros}
            onChange={(e) => handleChange('kitPrimeirosSocorros', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Consumíveis</Label>
          <Textarea
            value={formData.consumiveis}
            onChange={(e) => handleChange('consumiveis', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Espaço Físico</Label>
          <Textarea
            value={formData.espacoFisico}
            onChange={(e) => handleChange('espacoFisico', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Reclamações</Label>
          <Textarea
            value={formData.reclamacoes}
            onChange={(e) => handleChange('reclamacoes', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Vendas Complementares</Label>
          <Textarea
            value={formData.vendasComplementares}
            onChange={(e) => handleChange('vendasComplementares', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Fichas de Serviço</Label>
          <Textarea
            value={formData.fichasServico}
            onChange={(e) => handleChange('fichasServico', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Documentação Obrigatória</Label>
          <Textarea
            value={formData.documentacaoObrigatoria}
            onChange={(e) => handleChange('documentacaoObrigatoria', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Colaboradores Presentes</Label>
          <Textarea
            value={formData.colaboradoresPresentes}
            onChange={(e) => handleChange('colaboradoresPresentes', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Resumo da Supervisão</Label>
          <Textarea
            value={formData.resumoSupervisao}
            onChange={(e) => handleChange('resumoSupervisao', e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-green-600">Pontos Positivos</Label>
          <Textarea
            value={formData.pontosPositivos}
            onChange={(e) => handleChange('pontosPositivos', e.target.value)}
            rows={3}
            className="border-green-200 focus:border-green-400"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-red-600">Pontos Negativos</Label>
          <Textarea
            value={formData.pontosNegativos}
            onChange={(e) => handleChange('pontosNegativos', e.target.value)}
            rows={3}
            className="border-red-200 focus:border-red-400"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={() => onSave(formData)}
          disabled={isPending}
        >
          {isPending ? "A guardar..." : "Guardar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
