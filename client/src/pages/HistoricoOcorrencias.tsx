import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Globe, 
  MapPin, 
  Building2,
  Clock,
  User,
  CheckCircle2,
  Search,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function HistoricoOcorrencias() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroImpacto, setFiltroImpacto] = useState<string>("todos");
  const [filtroTema, setFiltroTema] = useState<string>("todos");
  
  // Estado de expansão dos cards
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  
  // Modal de detalhes/edição (admin)
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [novoEstado, setNovoEstado] = useState<string>("");
  const [notasAdmin, setNotasAdmin] = useState("");

  const utils = trpc.useUtils();
  
  // Queries
  const isAdmin = user?.role === "admin";
  const { data: ocorrencias, isLoading } = isAdmin 
    ? trpc.ocorrenciasEstruturais.listAll.useQuery()
    : trpc.ocorrenciasEstruturais.listMinhas.useQuery();
  
  const { data: temas } = trpc.ocorrenciasEstruturais.getTemas.useQuery();
  const { data: contagem } = trpc.ocorrenciasEstruturais.countPorEstado.useQuery();
  
  // Mutation para atualizar estado (admin)
  const updateEstadoMutation = trpc.ocorrenciasEstruturais.updateEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado atualizado com sucesso");
      utils.ocorrenciasEstruturais.listAll.invalidate();
      utils.ocorrenciasEstruturais.countPorEstado.invalidate();
      setShowModal(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "gestor" && user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleOpenModal = (ocorrencia: any) => {
    setSelectedOcorrencia(ocorrencia);
    setNovoEstado(ocorrencia.estado);
    setNotasAdmin(ocorrencia.notasAdmin || "");
    setShowModal(true);
  };

  const handleUpdateEstado = () => {
    if (!selectedOcorrencia) return;
    
    updateEstadoMutation.mutate({
      id: selectedOcorrencia.id,
      estado: novoEstado as any,
      notasAdmin: notasAdmin.trim() || undefined,
    });
  };

  // Filtrar ocorrências
  const ocorrenciasFiltradas = ocorrencias?.filter((o) => {
    if (filtroEstado !== "todos" && o.estado !== filtroEstado) return false;
    if (filtroImpacto !== "todos" && o.impacto !== filtroImpacto) return false;
    if (filtroTema !== "todos" && o.temaNome !== filtroTema) return false;
    return true;
  }) || [];

  // Cores e labels
  const estadoConfig = {
    reportado: { label: "Reportado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    em_analise: { label: "Em Análise", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    em_resolucao: { label: "Em Resolução", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    resolvido: { label: "Resolvido", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  };

  const impactoConfig = {
    baixo: { label: "Baixo", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    medio: { label: "Médio", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    alto: { label: "Alto", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    critico: { label: "Crítico", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const abrangenciaIcon = {
    nacional: <Globe className="h-4 w-4" />,
    regional: <MapPin className="h-4 w-4" />,
    zona: <Building2 className="h-4 w-4" />,
  };

  // Obter temas únicos para filtro
  const temasUnicos = Array.from(new Set(ocorrencias?.map(o => o.temaNome) || []));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Ocorrências Estruturais</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Todas as ocorrências reportadas" : "As suas ocorrências reportadas"}
            </p>
          </div>
          <Button onClick={() => setLocation("/ocorrencias-estruturais/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Ocorrência
          </Button>
        </div>

        {/* Estatísticas */}
        {contagem && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{contagem.total}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{contagem.reportado}</div>
                <p className="text-sm text-muted-foreground">Reportadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{contagem.emAnalise}</div>
                <p className="text-sm text-muted-foreground">Em Análise</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-600">{contagem.emResolucao}</div>
                <p className="text-sm text-muted-foreground">Em Resolução</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{contagem.resolvido}</div>
                <p className="text-sm text-muted-foreground">Resolvidas</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-sm mb-1 block">Estado</Label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="reportado">Reportado</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="em_resolucao">Em Resolução</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-sm mb-1 block">Impacto</Label>
                <Select value={filtroImpacto} onValueChange={setFiltroImpacto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="baixo">Baixo</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="critico">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-sm mb-1 block">Tema</Label>
                <Select value={filtroTema} onValueChange={setFiltroTema}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {temasUnicos.map((tema) => (
                      <SelectItem key={tema} value={tema}>{tema}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Ocorrências */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : ocorrenciasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma ocorrência encontrada</h3>
              <p className="text-muted-foreground mt-2">
                {ocorrencias?.length === 0 
                  ? "Ainda não foram reportadas ocorrências estruturais."
                  : "Nenhuma ocorrência corresponde aos filtros selecionados."}
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setLocation("/ocorrencias-estruturais/nova")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Reportar Ocorrência
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {ocorrenciasFiltradas.map((ocorrencia) => {
              const isExpanded = expandedIds.has(ocorrencia.id);
              const fotos = ocorrencia.fotos ? JSON.parse(ocorrencia.fotos) : [];
              const lojasAfetadas = ocorrencia.lojasAfetadas ? JSON.parse(ocorrencia.lojasAfetadas) : [];
              
              return (
                <Collapsible key={ocorrencia.id} open={isExpanded}>
                  <Card className={`transition-all ${ocorrencia.estado === 'resolvido' ? 'opacity-75' : ''}`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader 
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => toggleExpand(ocorrencia.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-semibold">
                                {ocorrencia.temaNome}
                              </Badge>
                              <Badge className={estadoConfig[ocorrencia.estado as keyof typeof estadoConfig]?.color}>
                                {estadoConfig[ocorrencia.estado as keyof typeof estadoConfig]?.label}
                              </Badge>
                              <Badge className={impactoConfig[ocorrencia.impacto as keyof typeof impactoConfig]?.color}>
                                {impactoConfig[ocorrencia.impacto as keyof typeof impactoConfig]?.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {ocorrencia.descricao}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {abrangenciaIcon[ocorrencia.abrangencia as keyof typeof abrangenciaIcon]}
                                {ocorrencia.abrangencia === 'nacional' ? 'Nacional' : ocorrencia.zonaAfetada || ocorrencia.abrangencia}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ocorrencia.gestorNome}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(ocorrencia.createdAt).toLocaleDateString('pt-PT')}
                              </span>
                              {fotos.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  {fotos.length} foto(s)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdmin && ocorrencia.estado !== 'resolvido' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(ocorrencia);
                                }}
                              >
                                Gerir
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        {/* Descrição completa */}
                        <div>
                          <h4 className="font-medium mb-2">Descrição</h4>
                          <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                            {ocorrencia.descricao}
                          </p>
                        </div>

                        {/* Sugestão de Ação */}
                        {ocorrencia.sugestaoAcao && (
                          <div>
                            <h4 className="font-medium mb-2">Sugestão de Ação</h4>
                            <p className="text-sm whitespace-pre-wrap bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                              {ocorrencia.sugestaoAcao}
                            </p>
                          </div>
                        )}

                        {/* Notas do Admin */}
                        {ocorrencia.notasAdmin && (
                          <div>
                            <h4 className="font-medium mb-2">Notas do Administrador</h4>
                            <p className="text-sm whitespace-pre-wrap bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
                              {ocorrencia.notasAdmin}
                            </p>
                          </div>
                        )}

                        {/* Fotos */}
                        {fotos.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Evidências</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {fotos.map((foto: string, index: number) => (
                                <a
                                  key={index}
                                  href={foto}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={foto}
                                    alt={`Evidência ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-md hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Data de resolução */}
                        {ocorrencia.resolvidoEm && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Resolvido em {new Date(ocorrencia.resolvidoEm).toLocaleDateString('pt-PT')}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Gestão (Admin) */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerir Ocorrência</DialogTitle>
            <DialogDescription>
              Atualize o estado e adicione notas sobre esta ocorrência
            </DialogDescription>
          </DialogHeader>
          
          {selectedOcorrencia && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Tema</Label>
                <p className="text-sm">{selectedOcorrencia.temaNome}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Reportado por</Label>
                <p className="text-sm">{selectedOcorrencia.gestorNome}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={novoEstado} onValueChange={setNovoEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reportado">Reportado</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="em_resolucao">Em Resolução</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Notas do Administrador</Label>
                <Textarea
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  placeholder="Adicione notas ou feedback sobre esta ocorrência..."
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpdateEstado}
                  disabled={updateEstadoMutation.isPending}
                >
                  {updateEstadoMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      A guardar...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
