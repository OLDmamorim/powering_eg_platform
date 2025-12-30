import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  FileText,
  Eye,
  MessageSquare,
  Copy,
  ExternalLink,
  Key,
  Store,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

export default function ReunioesQuinzenais() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [novoPendenteOpen, setNovoPendenteOpen] = useState(false);
  const [novoPendenteLojaId, setNovoPendenteLojaId] = useState<number | null>(null);
  const [novoPendenteDescricao, setNovoPendenteDescricao] = useState("");
  const [novoPendentePrioridade, setNovoPendentePrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");

  // Queries
  const { data: reunioes, refetch: refetchReunioes } = trpc.consultaReunioes.listar.useQuery(
    filtroEstado !== "todas" ? { estado: filtroEstado as any } : undefined
  );

  const { data: lojasAtrasadas } = trpc.consultaReunioes.lojasAtrasadas.useQuery(
    { diasLimite: 15 },
    { enabled: isAdmin }
  );

  const { data: estatisticas } = trpc.consultaReunioes.estatisticas.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const { data: tokens, refetch: refetchTokens } = trpc.tokensLoja.listar.useQuery();

  const { data: lojas } = trpc.lojas.list.useQuery();
  const { data: minhasLojas } = trpc.lojas.getByGestor.useQuery();

  const { data: reuniaoDetalhe } = trpc.consultaReunioes.getById.useQuery(
    { reuniaoId: reuniaoSelecionada! },
    { enabled: !!reuniaoSelecionada }
  );

  const { data: pendentesTodos, refetch: refetchPendentes } = trpc.pendentesLoja.listarTodos.useQuery();

  // Mutations
  const criarTokenMutation = trpc.tokensLoja.criarToken.useMutation({
    onSuccess: () => {
      toast.success("Token criado com sucesso!");
      refetchTokens();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleTokenMutation = trpc.tokensLoja.toggleAtivo.useMutation({
    onSuccess: () => {
      toast.success("Token atualizado!");
      refetchTokens();
    },
    onError: (error) => toast.error(error.message),
  });

  const regenerarTokenMutation = trpc.tokensLoja.regenerar.useMutation({
    onSuccess: () => {
      toast.success("Token regenerado!");
      refetchTokens();
    },
    onError: (error) => toast.error(error.message),
  });

  const enviarEmailTokenMutation = trpc.tokensLoja.enviarEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Email enviado com sucesso para ${data.email}!`);
    },
    onError: (error) => toast.error(error.message),
  });

  const adicionarFeedbackMutation = trpc.consultaReunioes.adicionarFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback adicionado!");
      setFeedbackText("");
      refetchReunioes();
    },
    onError: (error) => toast.error(error.message),
  });

  const criarPendenteMutation = trpc.pendentesLoja.criar.useMutation({
    onSuccess: () => {
      toast.success("Pendente criado!");
      setNovoPendenteOpen(false);
      setNovoPendenteDescricao("");
      setNovoPendenteLojaId(null);
      refetchPendentes();
    },
    onError: (error) => toast.error(error.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const getPortalUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/portal-loja?token=${token}`;
  };

  const estadoBadge = (estado: string) => {
    const cores = {
      rascunho: "bg-amber-100 text-amber-700",
      concluida: "bg-blue-100 text-blue-700",
      enviada: "bg-green-100 text-green-700",
    };
    const icones = {
      rascunho: <Clock className="h-3 w-3 mr-1" />,
      concluida: <CheckCircle2 className="h-3 w-3 mr-1" />,
      enviada: <Send className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge className={cores[estado as keyof typeof cores] || "bg-gray-100"}>
        {icones[estado as keyof typeof icones]}
        {estado === 'rascunho' ? 'Rascunho' : estado === 'concluida' ? 'Concluída' : 'Enviada'}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reuniões Quinzenais</h1>
            <p className="text-muted-foreground">
              Gestão das reuniões quinzenais das lojas
            </p>
          </div>
          {isAdmin && (
            <Dialog open={novoPendenteOpen} onOpenChange={setNovoPendenteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Pendente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Pendente para Loja</DialogTitle>
                  <DialogDescription>
                    Crie um pendente que a loja deverá resolver na próxima reunião.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Loja</label>
                    <Select
                      value={novoPendenteLojaId?.toString() || ""}
                      onValueChange={(v) => setNovoPendenteLojaId(parseInt(v))}
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
                  <div>
                    <label className="text-sm font-medium">Descrição</label>
                    <Textarea
                      placeholder="Descreva o pendente..."
                      value={novoPendenteDescricao}
                      onChange={(e) => setNovoPendenteDescricao(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select
                      value={novoPendentePrioridade}
                      onValueChange={(v) => setNovoPendentePrioridade(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (!novoPendenteLojaId || !novoPendenteDescricao) {
                        toast.error("Preencha todos os campos");
                        return;
                      }
                      criarPendenteMutation.mutate({
                        lojaId: novoPendenteLojaId,
                        descricao: novoPendenteDescricao,
                        prioridade: novoPendentePrioridade,
                      });
                    }}
                    disabled={criarPendenteMutation.isPending}
                  >
                    {criarPendenteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar Pendente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards (Admin) */}
        {isAdmin && estatisticas && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{estatisticas.totalReunioesEsteMes}</p>
                    <p className="text-xs text-muted-foreground">Reuniões este mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{estatisticas.lojasComReuniao}</p>
                    <p className="text-xs text-muted-foreground">Lojas com reunião</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">{estatisticas.lojasSemReuniao}</p>
                    <p className="text-xs text-muted-foreground">Lojas sem reunião</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{estatisticas.reunioesPendentes}</p>
                    <p className="text-xs text-muted-foreground">Em rascunho</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{lojasAtrasadas?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Lojas atrasadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="reunioes">
          <TabsList>
            <TabsTrigger value="reunioes">
              <FileText className="h-4 w-4 mr-2" />
              Reuniões
            </TabsTrigger>
            <TabsTrigger value="pendentes">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Pendentes
              {pendentesTodos && pendentesTodos.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendentesTodos.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tokens">
              <Key className="h-4 w-4 mr-2" />
              Tokens de Acesso
            </TabsTrigger>
            {isAdmin && lojasAtrasadas && lojasAtrasadas.length > 0 && (
              <TabsTrigger value="atrasadas">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Lojas Atrasadas
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab: Reuniões */}
          <TabsContent value="reunioes" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviada">Enviadas</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetchReunioes()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {reunioes?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem reuniões</h3>
                  <p className="text-muted-foreground">
                    Ainda não existem reuniões quinzenais registadas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loja</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Enviada para</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reunioes?.map((reuniao) => (
                      <TableRow key={reuniao.id}>
                        <TableCell className="font-medium">{reuniao.lojaNome}</TableCell>
                        <TableCell>
                          {new Date(reuniao.dataReuniao).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell>{estadoBadge(reuniao.estado)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {reuniao.emailEnviadoPara || "-"}
                        </TableCell>
                        <TableCell>
                          {reuniao.feedbackGestor ? (
                            <Badge variant="outline" className="bg-blue-50">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Com feedback
                            </Badge>
                          ) : reuniao.estado === 'enviada' ? (
                            <span className="text-xs text-muted-foreground">Sem feedback</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReuniaoSelecionada(reuniao.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  Reunião - {reuniao.lojaNome}
                                </DialogTitle>
                                <DialogDescription>
                                  {new Date(reuniao.dataReuniao).toLocaleDateString('pt-PT', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </DialogDescription>
                              </DialogHeader>
                              {reuniaoDetalhe && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    {estadoBadge(reuniaoDetalhe.estado)}
                                    {reuniaoDetalhe.dataEnvio && (
                                      <span className="text-xs text-muted-foreground">
                                        Enviada em {new Date(reuniaoDetalhe.dataEnvio).toLocaleDateString('pt-PT')}
                                      </span>
                                    )}
                                  </div>

                                  {reuniaoDetalhe.participantes && (
                                    <div>
                                      <h4 className="font-medium mb-2">Participantes</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {JSON.parse(reuniaoDetalhe.participantes).map((p: string, i: number) => (
                                          <Badge key={i} variant="secondary">{p}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {reuniaoDetalhe.temasDiscutidos && (
                                    <div>
                                      <h4 className="font-medium mb-2">Temas Discutidos</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {reuniaoDetalhe.temasDiscutidos}
                                      </p>
                                    </div>
                                  )}

                                  {reuniaoDetalhe.decisoesTomadas && (
                                    <div>
                                      <h4 className="font-medium mb-2">Decisões Tomadas</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {reuniaoDetalhe.decisoesTomadas}
                                      </p>
                                    </div>
                                  )}

                                  {reuniaoDetalhe.analiseResultados && (
                                    <div>
                                      <h4 className="font-medium mb-2">Análise de Resultados</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {reuniaoDetalhe.analiseResultados}
                                      </p>
                                    </div>
                                  )}

                                  {reuniaoDetalhe.planosAcao && (
                                    <div>
                                      <h4 className="font-medium mb-2">Planos de Ação</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {reuniaoDetalhe.planosAcao}
                                      </p>
                                    </div>
                                  )}

                                  {reuniaoDetalhe.observacoes && (
                                    <div>
                                      <h4 className="font-medium mb-2">Observações</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {reuniaoDetalhe.observacoes}
                                      </p>
                                    </div>
                                  )}

                                  {/* Feedback do Gestor */}
                                  {reuniaoDetalhe.estado === 'enviada' && (
                                    <div className="border-t pt-4">
                                      <h4 className="font-medium mb-2">Feedback do Gestor</h4>
                                      {reuniaoDetalhe.feedbackGestor ? (
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                          <p className="text-sm">{reuniaoDetalhe.feedbackGestor}</p>
                                          {reuniaoDetalhe.dataFeedback && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                              Adicionado em {new Date(reuniaoDetalhe.dataFeedback).toLocaleDateString('pt-PT')}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <Textarea
                                            placeholder="Adicione o seu feedback sobre esta reunião..."
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              if (!feedbackText.trim()) {
                                                toast.error("Escreva o feedback");
                                                return;
                                              }
                                              adicionarFeedbackMutation.mutate({
                                                reuniaoId: reuniaoDetalhe.id,
                                                feedback: feedbackText,
                                              });
                                            }}
                                            disabled={adicionarFeedbackMutation.isPending}
                                          >
                                            {adicionarFeedbackMutation.isPending && (
                                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            )}
                                            Enviar Feedback
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Pendentes */}
          <TabsContent value="pendentes" className="space-y-4">
            {pendentesTodos?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem pendentes ativos</h3>
                  <p className="text-muted-foreground">
                    Não existem pendentes ativos nas lojas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loja</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendentesTodos?.map((pendente: any) => (
                      <TableRow key={pendente.id}>
                        <TableCell className="font-medium">{pendente.lojaNome}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate">{pendente.descricao}</p>
                          {pendente.comentarioLoja && (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              "{pendente.comentarioLoja}"
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              pendente.prioridade === 'urgente' ? 'bg-red-100 text-red-700' :
                              pendente.prioridade === 'alta' ? 'bg-orange-100 text-orange-700' :
                              pendente.prioridade === 'media' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }
                          >
                            {pendente.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              pendente.estado === 'resolvido' ? 'bg-green-100 text-green-700' :
                              pendente.estado === 'em_progresso' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }
                          >
                            {pendente.estado === 'em_progresso' ? 'Em Progresso' : pendente.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(pendente.createdAt).toLocaleDateString('pt-PT')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Tokens (Admin/Gestor) */}
          <TabsContent value="tokens" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tokens de Acesso das Lojas</CardTitle>
                <CardDescription>
                  Gere tokens de acesso para as lojas acederem ao portal de reuniões.
                  {!isAdmin && " Apenas as lojas atribuídas a si são mostradas."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mostrar lojas do gestor ou todas para admin */}
                {(() => {
                  // Para gestor, mostrar TODAS as suas lojas (não só as que têm token)
                  const lojasParaMostrar = isAdmin ? lojas : minhasLojas;
                  
                  if (!lojasParaMostrar || lojasParaMostrar.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma loja encontrada.</p>
                        {!isAdmin && <p className="text-sm mt-2">Não tem lojas atribuídas. Contacte o administrador.</p>}
                      </div>
                    );
                  }
                  
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loja</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Último Acesso</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lojasParaMostrar?.map((loja) => {
                          const tokenData = tokens?.find(t => t.lojaId === loja.id);
                          return (
                            <TableRow key={loja.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-muted-foreground" />
                                  {loja.nome}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {loja.email || <span className="text-amber-600">Sem email</span>}
                              </TableCell>
                              <TableCell>
                                {tokenData ? (
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                      {tokenData.token.substring(0, 12)}...
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(getPortalUrl(tokenData.token))}
                                      title="Copiar link"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => window.open(getPortalUrl(tokenData.token), '_blank')}
                                      title="Abrir portal"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Sem token</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {tokenData ? (
                                  <Badge className={tokenData.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                    {tokenData.ativo ? "Ativo" : "Inativo"}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {tokenData?.ultimoAcesso
                                  ? new Date(tokenData.ultimoAcesso).toLocaleDateString('pt-PT')
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {tokenData ? (
                                  <div className="flex justify-end gap-2">
                                    {/* Botão Enviar Email */}
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => enviarEmailTokenMutation.mutate({ lojaId: loja.id })}
                                      disabled={!loja.email || enviarEmailTokenMutation.isPending}
                                      title={loja.email ? "Enviar token por email" : "Loja sem email configurado"}
                                    >
                                      {enviarEmailTokenMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Send className="h-4 w-4 mr-2" />
                                          Enviar Email
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleTokenMutation.mutate({
                                        tokenId: tokenData.id,
                                        ativo: !tokenData.ativo,
                                      })}
                                    >
                                      {tokenData.ativo ? "Desativar" : "Ativar"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => regenerarTokenMutation.mutate({ lojaId: loja.id })}
                                      title="Regenerar token"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => criarTokenMutation.mutate({ lojaId: loja.id })}
                                    disabled={criarTokenMutation.isPending}
                                  >
                                    {criarTokenMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Key className="h-4 w-4 mr-2" />
                                        Criar Token
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Lojas Atrasadas (Admin) */}
          {isAdmin && lojasAtrasadas && lojasAtrasadas.length > 0 && (
            <TabsContent value="atrasadas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    Lojas sem Reunião há mais de 15 dias
                  </CardTitle>
                  <CardDescription>
                    Estas lojas precisam de realizar uma reunião quinzenal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loja</TableHead>
                        <TableHead>Última Reunião</TableHead>
                        <TableHead>Dias sem Reunião</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lojasAtrasadas.map((item: any) => (
                        <TableRow key={item.loja.id}>
                          <TableCell className="font-medium">{item.loja.nome}</TableCell>
                          <TableCell>
                            {item.ultimaReuniao
                              ? new Date(item.ultimaReuniao).toLocaleDateString('pt-PT')
                              : "Nunca"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {item.diasSemReuniao === 999 ? "Nunca" : `${item.diasSemReuniao} dias`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
