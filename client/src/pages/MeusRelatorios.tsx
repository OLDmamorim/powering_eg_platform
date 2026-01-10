import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Calendar, ChevronDown, ChevronUp, FileText, ClipboardList, Search, ArrowUpDown, SortAsc, Pencil, Mail, Loader2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function MeusRelatorios() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const [expandedLivres, setExpandedLivres] = useState<number[]>([]);
  const [expandedCompletos, setExpandedCompletos] = useState<number[]>([]);
  const [lojaFiltro, setLojaFiltro] = useState<string>("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [ordenacao, setOrdenacao] = useState<"data-desc" | "data-asc" | "loja-az">("data-desc");
  
  // Estados para edição
  const [editingLivre, setEditingLivre] = useState<any>(null);
  const [editingCompleto, setEditingCompleto] = useState<any>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editDataVisita, setEditDataVisita] = useState("");
  
  // Estados para edição de relatório completo
  const [editEpisFardamento, setEditEpisFardamento] = useState("");
  const [editKitPrimeirosSocorros, setEditKitPrimeirosSocorros] = useState("");
  const [editConsumiveis, setEditConsumiveis] = useState("");
  const [editEspacoFisico, setEditEspacoFisico] = useState("");
  const [editReclamacoes, setEditReclamacoes] = useState("");
  const [editVendasComplementares, setEditVendasComplementares] = useState("");
  const [editFichasServico, setEditFichasServico] = useState("");
  const [editDocumentacaoObrigatoria, setEditDocumentacaoObrigatoria] = useState("");
  const [editReuniaoQuinzenal, setEditReuniaoQuinzenal] = useState(false);
  const [editResumoSupervisao, setEditResumoSupervisao] = useState("");
  const [editColaboradoresPresentes, setEditColaboradoresPresentes] = useState("");
  const [editPontosPositivos, setEditPontosPositivos] = useState("");
  const [editPontosNegativos, setEditPontosNegativos] = useState("");
  
  // Estado para confirmação de eliminação
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; tipo: 'livre' | 'completo' } | null>(null);
  
  const utils = trpc.useUtils();

  const { data: relatoriosLivres, isLoading: loadingLivres } =
    trpc.relatoriosLivres.list.useQuery();
  const { data: relatoriosCompletos, isLoading: loadingCompletos } =
    trpc.relatoriosCompletos.list.useQuery();

  // Mutations para edição
  const updateLivreMutation = trpc.relatoriosLivres.update.useMutation({
    onSuccess: () => {
      toast.success(t('relatorios.relatorioAtualizado'));
      utils.relatoriosLivres.list.invalidate();
      setEditingLivre(null);
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    }
  });

  const updateCompletoMutation = trpc.relatoriosCompletos.update.useMutation({
    onSuccess: () => {
      toast.success(t('relatorios.relatorioAtualizado'));
      utils.relatoriosCompletos.list.invalidate();
      setEditingCompleto(null);
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    }
  });

  // Mutations para eliminar
  const deleteLivreMutation = trpc.relatoriosLivres.delete.useMutation({
    onSuccess: () => {
      toast.success(t('relatorios.relatorioEliminado'));
      utils.relatoriosLivres.list.invalidate();
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    }
  });

  const deleteCompletoMutation = trpc.relatoriosCompletos.delete.useMutation({
    onSuccess: () => {
      toast.success(t('relatorios.relatorioEliminado'));
      utils.relatoriosCompletos.list.invalidate();
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(error.message || t('common.erro'));
    }
  });

  const enviarEmailLivreMutation = trpc.relatoriosLivres.enviarEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`${t('relatorios.emailEnviado')} - ${data.email}`);
    },
    onError: (error) => {
      toast.error(error.message || t('relatorios.erroEnviarEmail'));
    }
  });

  const enviarEmailCompletoMutation = trpc.relatoriosCompletos.enviarEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`${t('relatorios.emailEnviado')} - ${data.email}`);
    },
    onError: (error) => {
      toast.error(error.message || t('relatorios.erroEnviarEmail'));
    }
  });

  // Função para inicializar os estados de edição de relatório completo
  const iniciarEdicaoCompleto = (relatorio: any) => {
    setEditingCompleto(relatorio);
    setEditDataVisita(new Date(relatorio.dataVisita).toISOString().split('T')[0]);
    setEditEpisFardamento(relatorio.episFardamento || "");
    setEditKitPrimeirosSocorros(relatorio.kitPrimeirosSocorros || "");
    setEditConsumiveis(relatorio.consumiveis || "");
    setEditEspacoFisico(relatorio.espacoFisico || "");
    setEditReclamacoes(relatorio.reclamacoes || "");
    setEditVendasComplementares(relatorio.vendasComplementares || "");
    setEditFichasServico(relatorio.fichasServico || "");
    setEditDocumentacaoObrigatoria(relatorio.documentacaoObrigatoria || "");
    setEditReuniaoQuinzenal(relatorio.reuniaoQuinzenal || false);
    setEditResumoSupervisao(relatorio.resumoSupervisao || "");
    setEditColaboradoresPresentes(relatorio.colaboradoresPresentes || "");
    setEditPontosPositivos(relatorio.pontosPositivos || "");
    setEditPontosNegativos(relatorio.pontosNegativos || "");
  };

  if (user?.role !== "gestor") {
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
  
  // Obter lista única de lojas
  const lojasUnicas = Array.from(
    new Set(
      [...(relatoriosLivres || []), ...(relatoriosCompletos || [])]
        .map((r: any) => r.loja?.nome)
        .filter(Boolean)
    )
  ).sort();
  
  // Função de filtro e ordenação
  const filtrarEOrdenar = (relatorios: any[]) => {
    if (!relatorios) return [];
    
    let resultado = [...relatorios];
    
    // Aplicar filtro de loja
    if (lojaFiltro && lojaFiltro !== "todas") {
      resultado = resultado.filter((r: any) => r.loja?.nome === lojaFiltro);
    }
    
    // Aplicar pesquisa
    if (pesquisa) {
      resultado = resultado.filter((r: any) => 
        r.descricao?.toLowerCase().includes(pesquisa.toLowerCase())
      );
    }
    
    // Aplicar ordenação
    if (ordenacao === "data-desc") {
      resultado.sort((a: any, b: any) => new Date(b.dataVisita).getTime() - new Date(a.dataVisita).getTime());
    } else if (ordenacao === "data-asc") {
      resultado.sort((a: any, b: any) => new Date(a.dataVisita).getTime() - new Date(b.dataVisita).getTime());
    } else if (ordenacao === "loja-az") {
      resultado.sort((a: any, b: any) => (a.loja?.nome || "").localeCompare(b.loja?.nome || ""));
    }
    
    return resultado;
  };
  
  const relatoriosLivresFiltrados = filtrarEOrdenar(relatoriosLivres || []);
  const relatoriosCompletosFiltrados = filtrarEOrdenar(relatoriosCompletos || []);

  // Handler para eliminar
  const handleDelete = () => {
    if (!deleteConfirm) return;
    
    if (deleteConfirm.tipo === 'livre') {
      deleteLivreMutation.mutate({ id: deleteConfirm.id });
    } else {
      deleteCompletoMutation.mutate({ id: deleteConfirm.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Meus Relatórios
          </h1>
          <p className="text-muted-foreground">
            Histórico dos seus relatórios de supervisão
          </p>
        </div>
        
        {/* Controles de Filtro e Pesquisa */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por descrição..."
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={lojaFiltro || "todas"} onValueChange={setLojaFiltro}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojasUnicas.map((loja) => (
                    <SelectItem key={loja} value={loja}>
                      {loja}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ordenacao} onValueChange={(v: any) => setOrdenacao(v)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data-desc">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-3 w-3" />
                      Mais recente
                    </div>
                  </SelectItem>
                  <SelectItem value="data-asc">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-3 w-3" />
                      Mais antigo
                    </div>
                  </SelectItem>
                  <SelectItem value="loja-az">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-3 w-3" />
                      Loja (A-Z)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="livres" className="space-y-4">
          <TabsList>
            <TabsTrigger value="livres">
              <FileText className="h-4 w-4 mr-2" />
              Livres ({relatoriosLivresFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="completos">
              <ClipboardList className="h-4 w-4 mr-2" />
              Completos ({relatoriosCompletosFiltrados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="livres" className="space-y-3">
            {loadingLivres ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ): relatoriosLivresFiltrados && relatoriosLivresFiltrados.length > 0 ? (
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
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{relatorio.loja?.nome || "Loja"}</span>
                                {relatorio.gestor?.user?.role === 'admin' && (
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                    Criado por {relatorio.gestor?.user?.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
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
                          
                          {/* Notas do Admin */}
                          {relatorio.comentarioAdmin && (
                            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  📝 Notas do Admin
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap text-purple-900 dark:text-purple-100">
                                {relatorio.comentarioAdmin}
                              </p>
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
                                  setEditDescricao(relatorio.descricao || "");
                                  setEditDataVisita(new Date(relatorio.dataVisita).toISOString().split('T')[0]);
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
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ id: relatorio.id, tipo: 'livre' });
                                }}
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
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
                    Ainda não criou relatórios livres
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
            ): relatoriosCompletosFiltrados && relatoriosCompletosFiltrados.length > 0 ? (
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
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{relatorio.loja?.nome || "Loja"}</span>
                                {relatorio.gestor?.user?.role === 'admin' && (
                                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                    Criado por {relatorio.gestor?.user?.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
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
                          <div className="mt-3 grid gap-3">
                            {relatorio.episFardamento && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">EPIs e Fardamento</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.episFardamento}
                                </p>
                              </div>
                            )}
                            {relatorio.resumoSupervisao && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Resumo da Supervisão</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {relatorio.resumoSupervisao}
                                </p>
                              </div>
                            )}
                            {relatorio.colaboradoresPresentes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Colaboradores Presentes</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.colaboradoresPresentes}
                                </p>
                              </div>
                            )}
                            {relatorio.armazem && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Armazém</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.armazem}
                                </p>
                              </div>
                            )}
                            {relatorio.limpezaOrganizacao && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Limpeza e Organização</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.limpezaOrganizacao}
                                </p>
                              </div>
                            )}
                            {relatorio.montra && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Montra</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.montra}
                                </p>
                              </div>
                            )}
                            {relatorio.atendimentoCliente && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Atendimento ao Cliente</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.atendimentoCliente}
                                </p>
                              </div>
                            )}
                            {relatorio.formacao && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Formação</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.formacao}
                                </p>
                              </div>
                            )}
                            {relatorio.observacoes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Observações</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {relatorio.observacoes}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Notas do Admin */}
                          {relatorio.comentarioAdmin && (
                            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  📝 Notas do Admin
                                </Badge>
                              </div>
                              <p className="text-sm whitespace-pre-wrap text-purple-900 dark:text-purple-100">
                                {relatorio.comentarioAdmin}
                              </p>
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
                                  iniciarEdicaoCompleto(relatorio);
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
                                  enviarEmailCompletoMutation.mutate({ id: relatorio.id });
                                }}
                                disabled={enviarEmailCompletoMutation.isPending}
                                className="gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                {enviarEmailCompletoMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Mail className="h-3 w-3" />
                                )}
                                Enviar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ id: relatorio.id, tipo: 'completo' });
                                }}
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
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
                    Ainda não criou relatórios completos
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Edição de Relatório Livre */}
      <Dialog open={!!editingLivre} onOpenChange={(open) => !open && setEditingLivre(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Relatório Livre</DialogTitle>
            <DialogDescription>
              {editingLivre?.loja?.nome} - {editingLivre && new Date(editingLivre.dataVisita).toLocaleDateString("pt-PT")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data da Visita</Label>
              <Input
                type="date"
                value={editDataVisita}
                onChange={(e) => setEditDataVisita(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição da Visita</Label>
              <Textarea
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
            
            {/* Fotos */}
            {editingLivre?.fotos && (() => {
              try {
                const fotos = JSON.parse(editingLivre.fotos);
                if (fotos.length > 0) {
                  return (
                    <div className="space-y-2">
                      <Label>Fotos ({fotos.length})</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {fotos.map((foto: string, idx: number) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                            <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingLivre(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                updateLivreMutation.mutate({
                  id: editingLivre.id,
                  descricao: editDescricao,
                  dataVisita: editDataVisita ? new Date(editDataVisita) : undefined,
                });
              }}
              disabled={updateLivreMutation.isPending}
            >
              {updateLivreMutation.isPending ? "A guardar..." : "Guardar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Relatório Completo */}
      <Dialog open={!!editingCompleto} onOpenChange={(open) => !open && setEditingCompleto(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Relatório Completo</DialogTitle>
            <DialogDescription>
              {editingCompleto?.loja?.nome} - {editingCompleto && new Date(editingCompleto.dataVisita).toLocaleDateString("pt-PT")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data da Visita</Label>
              <Input
                type="date"
                value={editDataVisita}
                onChange={(e) => setEditDataVisita(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>EPIs e Fardamento</Label>
              <Textarea
                value={editEpisFardamento}
                onChange={(e) => setEditEpisFardamento(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Observações sobre EPIs e fardamento..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Kit de Primeiros Socorros</Label>
              <Textarea
                value={editKitPrimeirosSocorros}
                onChange={(e) => setEditKitPrimeirosSocorros(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Estado do kit de primeiros socorros..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Consumíveis</Label>
              <Textarea
                value={editConsumiveis}
                onChange={(e) => setEditConsumiveis(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Observações sobre consumíveis..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Espaço Físico</Label>
              <Textarea
                value={editEspacoFisico}
                onChange={(e) => setEditEspacoFisico(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Estado do espaço físico..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Reclamações</Label>
              <Textarea
                value={editReclamacoes}
                onChange={(e) => setEditReclamacoes(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Reclamações registadas..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Vendas Complementares</Label>
              <Textarea
                value={editVendasComplementares}
                onChange={(e) => setEditVendasComplementares(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Vendas complementares..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fichas de Serviço</Label>
              <Textarea
                value={editFichasServico}
                onChange={(e) => setEditFichasServico(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Fichas de serviço..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Documentação Obrigatória</Label>
              <Textarea
                value={editDocumentacaoObrigatoria}
                onChange={(e) => setEditDocumentacaoObrigatoria(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Estado da documentação obrigatória..."
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reuniaoQuinzenal"
                checked={editReuniaoQuinzenal}
                onChange={(e) => setEditReuniaoQuinzenal(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="reuniaoQuinzenal">Reunião Quinzenal Realizada</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Resumo da Supervisão</Label>
              <Textarea
                value={editResumoSupervisao}
                onChange={(e) => setEditResumoSupervisao(e.target.value)}
                rows={4}
                className="resize-none"
                placeholder="Resumo geral da supervisão..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Colaboradores Presentes</Label>
              <Textarea
                value={editColaboradoresPresentes}
                onChange={(e) => setEditColaboradoresPresentes(e.target.value)}
                rows={2}
                className="resize-none"
                placeholder="Nomes dos colaboradores presentes..."
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-green-700 dark:text-green-400">Pontos Positivos a Destacar</Label>
              <Textarea
                value={editPontosPositivos}
                onChange={(e) => setEditPontosPositivos(e.target.value)}
                rows={3}
                className="resize-none border-green-200 dark:border-green-800"
                placeholder="Pontos positivos observados..."
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-red-700 dark:text-red-400">Pontos Negativos a Destacar</Label>
              <Textarea
                value={editPontosNegativos}
                onChange={(e) => setEditPontosNegativos(e.target.value)}
                rows={3}
                className="resize-none border-red-200 dark:border-red-800"
                placeholder="Pontos negativos observados..."
              />
            </div>
            
            {/* Fotos */}
            {editingCompleto?.fotos && (() => {
              try {
                const fotos = JSON.parse(editingCompleto.fotos);
                if (fotos.length > 0) {
                  return (
                    <div className="space-y-2">
                      <Label>Fotos ({fotos.length})</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {fotos.map((foto: string, idx: number) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                            <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
              return null;
            })()}
          </div>
          
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setEditingCompleto(null)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                updateCompletoMutation.mutate({
                  id: editingCompleto.id,
                  dataVisita: editDataVisita ? new Date(editDataVisita) : undefined,
                  episFardamento: editEpisFardamento || undefined,
                  kitPrimeirosSocorros: editKitPrimeirosSocorros || undefined,
                  consumiveis: editConsumiveis || undefined,
                  espacoFisico: editEspacoFisico || undefined,
                  reclamacoes: editReclamacoes || undefined,
                  vendasComplementares: editVendasComplementares || undefined,
                  fichasServico: editFichasServico || undefined,
                  documentacaoObrigatoria: editDocumentacaoObrigatoria || undefined,
                  reuniaoQuinzenal: editReuniaoQuinzenal,
                  resumoSupervisao: editResumoSupervisao || undefined,
                  colaboradoresPresentes: editColaboradoresPresentes || undefined,
                  pontosPositivos: editPontosPositivos || undefined,
                  pontosNegativos: editPontosNegativos || undefined,
                }, {
                  onSuccess: () => {
                    // Após guardar, enviar email automaticamente
                    enviarEmailCompletoMutation.mutate({ id: editingCompleto.id });
                  }
                });
              }}
              disabled={updateCompletoMutation.isPending || enviarEmailCompletoMutation.isPending}
              className="gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {(updateCompletoMutation.isPending || enviarEmailCompletoMutation.isPending) ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> A processar...</>
              ) : (
                <><Mail className="h-4 w-4" /> Guardar e Enviar Email</>
              )}
            </Button>
            <Button
              onClick={() => {
                updateCompletoMutation.mutate({
                  id: editingCompleto.id,
                  dataVisita: editDataVisita ? new Date(editDataVisita) : undefined,
                  episFardamento: editEpisFardamento || undefined,
                  kitPrimeirosSocorros: editKitPrimeirosSocorros || undefined,
                  consumiveis: editConsumiveis || undefined,
                  espacoFisico: editEspacoFisico || undefined,
                  reclamacoes: editReclamacoes || undefined,
                  vendasComplementares: editVendasComplementares || undefined,
                  fichasServico: editFichasServico || undefined,
                  documentacaoObrigatoria: editDocumentacaoObrigatoria || undefined,
                  reuniaoQuinzenal: editReuniaoQuinzenal,
                  resumoSupervisao: editResumoSupervisao || undefined,
                  colaboradoresPresentes: editColaboradoresPresentes || undefined,
                  pontosPositivos: editPontosPositivos || undefined,
                  pontosNegativos: editPontosNegativos || undefined,
                });
              }}
              disabled={updateCompletoMutation.isPending}
            >
              {updateCompletoMutation.isPending ? "A guardar..." : "Guardar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Eliminação */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Eliminar Relatório</DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja eliminar este relatório? Esta ação não pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
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
