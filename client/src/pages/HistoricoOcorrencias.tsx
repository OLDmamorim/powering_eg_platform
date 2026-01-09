import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Plus, 
  AlertTriangle, 
  Globe, 
  MapPin, 
  Building2,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Pencil,
  Mail,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function HistoricoOcorrencias() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroImpacto, setFiltroImpacto] = useState<string>("todos");
  const [filtroTema, setFiltroTema] = useState<string>("todos");
  
  // Modal de detalhes
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    descricao: "",
    abrangencia: "" as "nacional" | "regional" | "zona",
    zonaAfetada: "",
    impacto: "" as "baixo" | "medio" | "alto" | "critico",
    sugestaoAcao: "",
    estado: "" as "reportado" | "em_analise" | "em_resolucao" | "resolvido",
    notasAdmin: "",
  });
  
  // Modal de imagem (popup)
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [imageList, setImageList] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const utils = trpc.useUtils();
  
  // Queries
  const isAdmin = user?.role === "admin";
  const { data: ocorrencias, isLoading } = isAdmin 
    ? trpc.ocorrenciasEstruturais.listAll.useQuery()
    : trpc.ocorrenciasEstruturais.listMinhas.useQuery();
  
  const { data: temas } = trpc.ocorrenciasEstruturais.getTemas.useQuery();
  
  // Contagem: admin vê total, gestor vê só as suas
  const { data: contagemTotal } = trpc.ocorrenciasEstruturais.countPorEstado.useQuery(undefined, {
    enabled: isAdmin
  });
  const { data: contagemGestor } = trpc.ocorrenciasEstruturais.countPorEstadoGestor.useQuery(undefined, {
    enabled: !isAdmin
  });
  
  const contagem = isAdmin ? contagemTotal : contagemGestor;
  
  // Mutations
  const editarMutation = trpc.ocorrenciasEstruturais.editar.useMutation({
    onSuccess: () => {
      toast.success("Ocorrência atualizada com sucesso");
      utils.ocorrenciasEstruturais.listAll.invalidate();
      utils.ocorrenciasEstruturais.listMinhas.invalidate();
      utils.ocorrenciasEstruturais.countPorEstado.invalidate();
      utils.ocorrenciasEstruturais.countPorEstadoGestor.invalidate();
      setShowEditModal(false);
      setShowDetailModal(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const enviarEmailMutation = trpc.ocorrenciasEstruturais.enviarEmail.useMutation({
    onSuccess: () => {
      toast.success("Email enviado com sucesso para o administrador");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (user?.role !== "gestor" && user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const handleCardClick = (ocorrencia: any) => {
    setSelectedOcorrencia(ocorrencia);
    setShowDetailModal(true);
  };

  const handleEditClick = (ocorrencia: any) => {
    setSelectedOcorrencia(ocorrencia);
    setEditData({
      descricao: ocorrencia.descricao,
      abrangencia: ocorrencia.abrangencia,
      zonaAfetada: ocorrencia.zonaAfetada || "",
      impacto: ocorrencia.impacto,
      sugestaoAcao: ocorrencia.sugestaoAcao || "",
      estado: ocorrencia.estado,
      notasAdmin: ocorrencia.notasAdmin || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedOcorrencia) return;
    
    editarMutation.mutate({
      id: selectedOcorrencia.id,
      descricao: editData.descricao,
      abrangencia: editData.abrangencia,
      zonaAfetada: editData.zonaAfetada || null,
      impacto: editData.impacto,
      sugestaoAcao: editData.sugestaoAcao || null,
      ...(isAdmin && {
        estado: editData.estado,
        notasAdmin: editData.notasAdmin || null,
      }),
    });
  };

  const handleSendEmail = (ocorrencia: any) => {
    enviarEmailMutation.mutate({ id: ocorrencia.id });
  };

  const handleImageClick = (foto: string, fotos: string[]) => {
    setSelectedImage(foto);
    setImageList(fotos);
    setCurrentImageIndex(fotos.indexOf(foto));
    setShowImageModal(true);
  };

  const handlePrevImage = () => {
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : imageList.length - 1;
    setCurrentImageIndex(newIndex);
    setSelectedImage(imageList[newIndex]);
  };

  const handleNextImage = () => {
    const newIndex = currentImageIndex < imageList.length - 1 ? currentImageIndex + 1 : 0;
    setCurrentImageIndex(newIndex);
    setSelectedImage(imageList[newIndex]);
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
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFiltroEstado("todos")}>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{contagem.total}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFiltroEstado("reportado")}>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{contagem.reportado}</div>
                <p className="text-sm text-muted-foreground">Reportadas</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFiltroEstado("em_analise")}>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{contagem.emAnalise}</div>
                <p className="text-sm text-muted-foreground">Em Análise</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFiltroEstado("em_resolucao")}>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-600">{contagem.emResolucao}</div>
                <p className="text-sm text-muted-foreground">Em Resolução</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFiltroEstado("resolvido")}>
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
              const fotos = ocorrencia.fotos ? JSON.parse(ocorrencia.fotos) : [];
              
              return (
                <Card 
                  key={ocorrencia.id} 
                  className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${ocorrencia.estado === 'resolvido' ? 'opacity-75' : ''}`}
                  onClick={() => handleCardClick(ocorrencia)}
                >
                  <CardHeader className="pb-3">
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
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Detalhes da Ocorrência
            </DialogTitle>
            <DialogDescription>
              {selectedOcorrencia?.temaNome}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOcorrencia && (
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={estadoConfig[selectedOcorrencia.estado as keyof typeof estadoConfig]?.color}>
                  {estadoConfig[selectedOcorrencia.estado as keyof typeof estadoConfig]?.label}
                </Badge>
                <Badge className={impactoConfig[selectedOcorrencia.impacto as keyof typeof impactoConfig]?.color}>
                  {impactoConfig[selectedOcorrencia.impacto as keyof typeof impactoConfig]?.label}
                </Badge>
              </div>
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Reportado por</Label>
                  <p className="font-medium">{selectedOcorrencia.gestorNome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">{new Date(selectedOcorrencia.createdAt).toLocaleDateString('pt-PT', { dateStyle: 'long' })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Abrangência</Label>
                  <p className="font-medium flex items-center gap-1">
                    {abrangenciaIcon[selectedOcorrencia.abrangencia as keyof typeof abrangenciaIcon]}
                    {selectedOcorrencia.abrangencia === 'nacional' ? 'Nacional' : selectedOcorrencia.zonaAfetada || selectedOcorrencia.abrangencia}
                  </p>
                </div>
                {selectedOcorrencia.resolvidoEm && (
                  <div>
                    <Label className="text-muted-foreground">Resolvido em</Label>
                    <p className="font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {new Date(selectedOcorrencia.resolvidoEm).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Descrição */}
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                  {selectedOcorrencia.descricao}
                </p>
              </div>
              
              {/* Sugestão de Ação */}
              {selectedOcorrencia.sugestaoAcao && (
                <div>
                  <Label className="text-muted-foreground">Sugestão de Ação</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                    {selectedOcorrencia.sugestaoAcao}
                  </p>
                </div>
              )}
              
              {/* Notas do Admin */}
              {selectedOcorrencia.notasAdmin && (
                <div>
                  <Label className="text-muted-foreground">Notas do Administrador</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
                    {selectedOcorrencia.notasAdmin}
                  </p>
                </div>
              )}
              
              {/* Fotos */}
              {(() => {
                const fotos = selectedOcorrencia.fotos ? JSON.parse(selectedOcorrencia.fotos) : [];
                if (fotos.length === 0) return null;
                
                return (
                  <div>
                    <Label className="text-muted-foreground">Evidências ({fotos.length} foto(s))</Label>
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {fotos.map((foto: string, index: number) => (
                        <div
                          key={index}
                          className="cursor-pointer rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageClick(foto, fotos);
                          }}
                        >
                          <img
                            src={foto}
                            alt={`Evidência ${index + 1}`}
                            className="w-full h-20 object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              {/* Ações */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {!isAdmin && selectedOcorrencia.estado !== 'resolvido' && (
                  <Button
                    variant="outline"
                    onClick={() => handleSendEmail(selectedOcorrencia)}
                    disabled={enviarEmailMutation.isPending}
                  >
                    {enviarEmailMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Enviar por Email
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEditClick(selectedOcorrencia);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ocorrência</DialogTitle>
            <DialogDescription>
              {selectedOcorrencia?.temaNome}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOcorrencia && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editData.descricao}
                  onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Abrangência</Label>
                  <Select 
                    value={editData.abrangencia} 
                    onValueChange={(v) => setEditData({ ...editData, abrangencia: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="zona">Zona</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Impacto</Label>
                  <Select 
                    value={editData.impacto} 
                    onValueChange={(v) => setEditData({ ...editData, impacto: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixo">Baixo</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="critico">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {editData.abrangencia !== 'nacional' && (
                <div className="space-y-2">
                  <Label>Zona Afetada</Label>
                  <Input
                    value={editData.zonaAfetada}
                    onChange={(e) => setEditData({ ...editData, zonaAfetada: e.target.value })}
                    placeholder="Ex: Norte, Sul, Lisboa..."
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Sugestão de Ação</Label>
                <Textarea
                  value={editData.sugestaoAcao}
                  onChange={(e) => setEditData({ ...editData, sugestaoAcao: e.target.value })}
                  rows={3}
                  placeholder="Sugestões para resolver esta ocorrência..."
                />
              </div>
              
              {/* Campos apenas para Admin */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={editData.estado} 
                      onValueChange={(v) => setEditData({ ...editData, estado: v as any })}
                    >
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
                      value={editData.notasAdmin}
                      onChange={(e) => setEditData({ ...editData, notasAdmin: e.target.value })}
                      rows={3}
                      placeholder="Notas internas sobre esta ocorrência..."
                    />
                  </div>
                </>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={editarMutation.isPending}
                >
                  {editarMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      A guardar...
                    </>
                  ) : (
                    "Guardar Alterações"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Imagem (Popup) */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <div className="relative">
            {/* Botão fechar */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setShowImageModal(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Navegação */}
            {imageList.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
            
            {/* Imagem */}
            <div className="flex items-center justify-center min-h-[400px] max-h-[80vh]">
              <img
                src={selectedImage}
                alt="Evidência"
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
            
            {/* Contador */}
            {imageList.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {currentImageIndex + 1} / {imageList.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
