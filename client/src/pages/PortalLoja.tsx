import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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
import { toast } from "sonner";
import {
  Store,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  FileText,
  History,
  LogOut,
  Loader2,
  MessageSquare,
  ListTodo,
  RotateCcw,
  Tag,
} from "lucide-react";

interface LojaAuth {
  lojaId: number;
  lojaNome: string;
  lojaEmail: string | null;
}

export default function PortalLoja() {
  const [token, setToken] = useState<string>("");
  const [inputToken, setInputToken] = useState<string>("");
  const [lojaAuth, setLojaAuth] = useState<LojaAuth | null>(null);
  const [activeTab, setActiveTab] = useState<"reuniao" | "pendentes" | "historico" | "todos">("reuniao");
  const [todoComentario, setTodoComentario] = useState<string>("");
  const [todoSelecionado, setTodoSelecionado] = useState<number | null>(null);
  const [devolverTodoOpen, setDevolverTodoOpen] = useState(false);
  const [novaReuniaoOpen, setNovaReuniaoOpen] = useState(false);
  const [participantes, setParticipantes] = useState<string[]>([""]);
  const [reuniaoAtual, setReuniaoAtual] = useState<number | null>(null);

  // Verificar token na URL ou localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    const savedToken = localStorage.getItem("loja_token");
    
    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem("loja_token", urlToken);
    } else if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Autenticar loja
  const autenticarMutation = trpc.reunioesQuinzenais.autenticarLoja.useMutation({
    onSuccess: (data) => {
      setLojaAuth(data);
      localStorage.setItem("loja_token", token);
      toast.success(`Bem-vindo, ${data.lojaNome}!`);
    },
    onError: (error) => {
      toast.error(error.message);
      localStorage.removeItem("loja_token");
      setToken("");
    },
  });

  // Autenticar quando token muda
  useEffect(() => {
    if (token && !lojaAuth) {
      autenticarMutation.mutate({ token });
    }
  }, [token]);

  // Queries
  const { data: dadosLoja, refetch: refetchDados } = trpc.reunioesQuinzenais.getDadosLoja.useQuery(
    { token },
    { enabled: !!token && !!lojaAuth }
  );

  const { data: pendentes, refetch: refetchPendentes } = trpc.reunioesQuinzenais.listarPendentes.useQuery(
    { token, apenasAtivos: false },
    { enabled: !!token && !!lojaAuth }
  );

  const { data: reunioes, refetch: refetchReunioes } = trpc.reunioesQuinzenais.listarReunioesLoja.useQuery(
    { token },
    { enabled: !!token && !!lojaAuth }
  );

  const { data: reuniaoEmEdicao } = trpc.reunioesQuinzenais.getReuniao.useQuery(
    { token, reuniaoId: reuniaoAtual! },
    { enabled: !!token && !!lojaAuth && !!reuniaoAtual }
  );

  // To-Do Queries
  const { data: todosList, refetch: refetchTodos } = trpc.todosPortalLoja.listar.useQuery(
    { token, apenasAtivos: true },
    { enabled: !!token && !!lojaAuth }
  );

  const { data: todosCount } = trpc.todosPortalLoja.contar.useQuery(
    { token },
    { enabled: !!token && !!lojaAuth }
  );

  // Mutations
  const criarReuniaoMutation = trpc.reunioesQuinzenais.criarReuniao.useMutation({
    onSuccess: (data) => {
      toast.success("Reunião criada com sucesso!");
      setNovaReuniaoOpen(false);
      setReuniaoAtual(data?.id || null);
      refetchReunioes();
      setParticipantes([""]);
    },
    onError: (error) => toast.error(error.message),
  });

  const atualizarReuniaoMutation = trpc.reunioesQuinzenais.atualizarReuniao.useMutation({
    onSuccess: () => {
      toast.success("Reunião guardada!");
      refetchReunioes();
    },
    onError: (error) => toast.error(error.message),
  });

  const concluirReuniaoMutation = trpc.reunioesQuinzenais.concluirReuniao.useMutation({
    onSuccess: (data) => {
      toast.success(`Reunião enviada para ${data.emailEnviadoPara}!`);
      setReuniaoAtual(null);
      refetchReunioes();
      refetchDados();
    },
    onError: (error) => toast.error(error.message),
  });

  const atualizarPendenteMutation = trpc.reunioesQuinzenais.atualizarPendente.useMutation({
    onSuccess: () => {
      toast.success("Pendente atualizado!");
      refetchPendentes();
    },
    onError: (error) => toast.error(error.message),
  });

  // To-Do Mutations
  const atualizarEstadoTodoMutation = trpc.todosPortalLoja.atualizarEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado atualizado!");
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const concluirTodoMutation = trpc.todosPortalLoja.concluir.useMutation({
    onSuccess: () => {
      toast.success("Tarefa concluída!");
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const devolverTodoMutation = trpc.todosPortalLoja.devolver.useMutation({
    onSuccess: () => {
      toast.success("Tarefa devolvida ao gestor!");
      setDevolverTodoOpen(false);
      setTodoComentario("");
      setTodoSelecionado(null);
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleLogin = () => {
    if (!inputToken.trim()) {
      toast.error("Introduza o token de acesso");
      return;
    }
    setToken(inputToken.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem("loja_token");
    setToken("");
    setLojaAuth(null);
    setInputToken("");
  };

  const handleCriarReuniao = () => {
    const participantesValidos = participantes.filter(p => p.trim());
    if (participantesValidos.length === 0) {
      toast.error("Adicione pelo menos um participante");
      return;
    }
    criarReuniaoMutation.mutate({
      token,
      dataReuniao: new Date().toISOString(),
      participantes: participantesValidos,
    });
  };

  // Tela de login
  if (!lojaAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Portal da Loja</CardTitle>
            <CardDescription>
              Aceda ao sistema de reuniões quinzenais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Token de Acesso</label>
              <Input
                type="text"
                placeholder="Introduza o token enviado por email"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={autenticarMutation.isPending}
            >
              {autenticarMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A verificar...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              O token foi enviado para o email da loja pelo gestor de zona.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendentesAtivos = pendentes?.filter(p => p.estado !== 'resolvido') || [];
  const reuniaoRascunho = reunioes?.find(r => r.estado === 'rascunho');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{lojaAuth.lojaNome}</h1>
              <p className="text-xs text-muted-foreground">Portal de Reuniões</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* Card Pendentes - Clicável */}
          <Card 
            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md ${activeTab === 'pendentes' ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/30' : ''}`}
            onClick={() => setActiveTab('pendentes')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{dadosLoja?.pendentesAtivos || 0}</p>
                  <p className="text-xs text-muted-foreground">Pendentes Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Card To-Do - Clicável */}
          <Card 
            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md ${activeTab === 'todos' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{todosCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Tarefas To-Do</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Card Gestor - Informativo */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{dadosLoja?.gestorNome || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Gestor</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "reuniao" ? "default" : "outline"}
            onClick={() => setActiveTab("reuniao")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Reunião
          </Button>
          <Button
            variant={activeTab === "pendentes" ? "default" : "outline"}
            onClick={() => setActiveTab("pendentes")}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Pendentes
            {pendentesAtivos.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendentesAtivos.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "historico" ? "default" : "outline"}
            onClick={() => setActiveTab("historico")}
          >
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button
            variant={activeTab === "todos" ? "default" : "outline"}
            onClick={() => setActiveTab("todos")}
          >
            <ListTodo className="h-4 w-4 mr-2" />
            To-Do
            {(todosCount || 0) > 0 && (
              <Badge variant="secondary" className="ml-2">{todosCount}</Badge>
            )}
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "reuniao" && (
          <div className="space-y-4">
            {reuniaoRascunho || reuniaoAtual ? (
              <ReuniaoEditor
                token={token}
                reuniao={reuniaoEmEdicao || reuniaoRascunho}
                pendentes={pendentes || []}
                onSave={(data) => {
                  atualizarReuniaoMutation.mutate({
                    token,
                    reuniaoId: reuniaoEmEdicao?.id || reuniaoRascunho?.id || 0,
                    ...data,
                  });
                }}
                onConcluir={() => {
                  concluirReuniaoMutation.mutate({
                    token,
                    reuniaoId: reuniaoEmEdicao?.id || reuniaoRascunho?.id || 0,
                  });
                }}
                onAtualizarPendente={(pendenteId, estado, comentario) => {
                  atualizarPendenteMutation.mutate({
                    token,
                    pendenteId,
                    estado,
                    comentario,
                    reuniaoId: reuniaoEmEdicao?.id || reuniaoRascunho?.id,
                  });
                }}
                isSaving={atualizarReuniaoMutation.isPending}
                isConcluindo={concluirReuniaoMutation.isPending}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma reunião em curso</h3>
                  <p className="text-muted-foreground mb-4">
                    Inicie uma nova reunião quinzenal para registar os temas discutidos.
                  </p>
                  <Dialog open={novaReuniaoOpen} onOpenChange={setNovaReuniaoOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Iniciar Reunião
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Reunião Quinzenal</DialogTitle>
                        <DialogDescription>
                          Adicione os participantes presentes na reunião.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <label className="text-sm font-medium">Participantes</label>
                        {participantes.map((p, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              placeholder={`Participante ${i + 1}`}
                              value={p}
                              onChange={(e) => {
                                const newP = [...participantes];
                                newP[i] = e.target.value;
                                setParticipantes(newP);
                              }}
                            />
                            {i === participantes.length - 1 && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setParticipantes([...participantes, ""])}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleCriarReuniao}
                          disabled={criarReuniaoMutation.isPending}
                        >
                          {criarReuniaoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Iniciar Reunião
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "pendentes" && (
          <div className="space-y-4">
            {pendentes?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem pendentes!</h3>
                  <p className="text-muted-foreground">
                    Não existem pendentes atribuídos a esta loja.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendentes?.map((pendente) => (
                <PendenteCard
                  key={pendente.id}
                  pendente={pendente}
                  onAtualizar={(estado, comentario) => {
                    atualizarPendenteMutation.mutate({
                      token,
                      pendenteId: pendente.id,
                      estado,
                      comentario,
                    });
                  }}
                  isUpdating={atualizarPendenteMutation.isPending}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "historico" && (
          <div className="space-y-4">
            {reunioes?.filter(r => r.estado === 'enviada').length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem histórico</h3>
                  <p className="text-muted-foreground">
                    Ainda não foram concluídas reuniões quinzenais.
                  </p>
                </CardContent>
              </Card>
            ) : (
              reunioes?.filter(r => r.estado === 'enviada').map((reuniao) => (
                <Card key={reuniao.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {new Date(reuniao.dataReuniao).toLocaleDateString('pt-PT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </CardTitle>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enviada
                      </Badge>
                    </div>
                    <CardDescription>
                      Enviada para {reuniao.emailEnviadoPara} em{" "}
                      {reuniao.dataEnvio && new Date(reuniao.dataEnvio).toLocaleDateString('pt-PT')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {reuniao.temasDiscutidos && (
                        <div>
                          <strong>Temas:</strong>
                          <p className="text-muted-foreground">{reuniao.temasDiscutidos}</p>
                        </div>
                      )}
                      {reuniao.feedbackGestor && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <strong className="text-blue-700">Feedback do Gestor:</strong>
                          <p className="text-blue-600">{reuniao.feedbackGestor}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab To-Do */}
        {activeTab === "todos" && (
          <div className="space-y-4">
            {!todosList || todosList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ListTodo className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem tarefas!</h3>
                  <p className="text-muted-foreground">
                    Não existem tarefas atribuídas a esta loja.
                  </p>
                </CardContent>
              </Card>
            ) : (
              todosList.map((todo: any) => (
                <Card key={todo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {todo.estado === 'pendente' && <Clock className="h-4 w-4 text-gray-500" />}
                          {todo.estado === 'em_progresso' && <Clock className="h-4 w-4 text-blue-500" />}
                          <h3 className="font-semibold">{todo.titulo}</h3>
                          <Badge className={
                            todo.prioridade === 'urgente' ? 'bg-red-100 text-red-800' :
                            todo.prioridade === 'alta' ? 'bg-orange-100 text-orange-800' :
                            todo.prioridade === 'media' ? 'bg-blue-100 text-blue-800' :
                            todo.prioridade === 'baixa' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {todo.prioridade}
                          </Badge>
                          <Badge variant="outline" className={
                            todo.estado === 'pendente' ? 'bg-gray-50' :
                            todo.estado === 'em_progresso' ? 'bg-blue-50 text-blue-700' : ''
                          }>
                            {todo.estado === 'pendente' ? 'Pendente' : 'Em Progresso'}
                          </Badge>
                          {todo.categoriaNome && (
                            <Badge variant="outline" style={{ borderColor: todo.categoriaCor || undefined, color: todo.categoriaCor || undefined }}>
                              <Tag className="h-3 w-3 mr-1" />
                              {todo.categoriaNome}
                            </Badge>
                          )}
                        </div>
                        
                        {todo.descricao && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {todo.descricao}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Criado por: {todo.criadoPorNome || 'N/A'}</span>
                          <span>{new Date(todo.createdAt).toLocaleDateString('pt-PT')}</span>
                          {todo.dataLimite && (
                            <span className="text-orange-600">
                              Prazo: {new Date(todo.dataLimite).toLocaleDateString('pt-PT')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {todo.estado === 'pendente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => atualizarEstadoTodoMutation.mutate({
                              token,
                              todoId: todo.id,
                              estado: 'em_progresso',
                            })}
                            disabled={atualizarEstadoTodoMutation.isPending}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Iniciar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => concluirTodoMutation.mutate({
                            token,
                            todoId: todo.id,
                          })}
                          disabled={concluirTodoMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => {
                            setTodoSelecionado(todo.id);
                            setDevolverTodoOpen(true);
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Devolver
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Dialog Devolver To-Do */}
        <Dialog open={devolverTodoOpen} onOpenChange={setDevolverTodoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Devolver Tarefa</DialogTitle>
              <DialogDescription>
                Indique o motivo pelo qual está a devolver esta tarefa ao gestor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Descreva o motivo da devolução..."
                value={todoComentario}
                onChange={(e) => setTodoComentario(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setDevolverTodoOpen(false);
                setTodoComentario("");
                setTodoSelecionado(null);
              }}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!todoComentario.trim()) {
                    toast.error("Deve indicar o motivo da devolução");
                    return;
                  }
                  if (todoSelecionado) {
                    devolverTodoMutation.mutate({
                      token,
                      todoId: todoSelecionado,
                      comentario: todoComentario.trim(),
                    });
                  }
                }}
                disabled={devolverTodoMutation.isPending}
              >
                {devolverTodoMutation.isPending ? "A devolver..." : "Devolver"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Componente de edição de reunião
function ReuniaoEditor({
  token,
  reuniao,
  pendentes,
  onSave,
  onConcluir,
  onAtualizarPendente,
  isSaving,
  isConcluindo,
}: {
  token: string;
  reuniao: any;
  pendentes: any[];
  onSave: (data: any) => void;
  onConcluir: () => void;
  onAtualizarPendente: (pendenteId: number, estado: 'pendente' | 'em_progresso' | 'resolvido', comentario?: string) => void;
  isSaving: boolean;
  isConcluindo: boolean;
}) {
  const [temasDiscutidos, setTemasDiscutidos] = useState(reuniao?.temasDiscutidos || "");
  const [decisoesTomadas, setDecisoesTomadas] = useState(reuniao?.decisoesTomadas || "");
  const [analiseResultados, setAnaliseResultados] = useState(reuniao?.analiseResultados || "");
  const [planosAcao, setPlanosAcao] = useState(reuniao?.planosAcao || "");
  const [observacoes, setObservacoes] = useState(reuniao?.observacoes || "");

  const participantes = reuniao?.participantes ? JSON.parse(reuniao.participantes) : [];
  const pendentesAtivos = pendentes.filter(p => p.estado !== 'resolvido');

  const handleSave = () => {
    onSave({
      temasDiscutidos,
      decisoesTomadas,
      analiseResultados,
      planosAcao,
      observacoes,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reunião em Curso</CardTitle>
              <CardDescription>
                {new Date(reuniao?.dataReuniao || new Date()).toLocaleDateString('pt-PT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700">
              <Clock className="h-3 w-3 mr-1" />
              Rascunho
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Participantes</label>
            <div className="flex flex-wrap gap-2">
              {participantes.map((p: string, i: number) => (
                <Badge key={i} variant="secondary">{p}</Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Temas Discutidos</label>
            <Textarea
              placeholder="Quais temas foram abordados na reunião?"
              value={temasDiscutidos}
              onChange={(e) => setTemasDiscutidos(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Decisões Tomadas</label>
            <Textarea
              placeholder="Que decisões foram tomadas?"
              value={decisoesTomadas}
              onChange={(e) => setDecisoesTomadas(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Análise de Resultados</label>
            <Textarea
              placeholder="Como estão os resultados da loja? O que pode melhorar?"
              value={analiseResultados}
              onChange={(e) => setAnaliseResultados(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Planos de Ação</label>
            <Textarea
              placeholder="Quais ações serão implementadas?"
              value={planosAcao}
              onChange={(e) => setPlanosAcao(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Observações</label>
            <Textarea
              placeholder="Outras observações relevantes..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pendentes a tratar */}
      {pendentesAtivos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pendentes a Tratar ({pendentesAtivos.length})
            </CardTitle>
            <CardDescription>
              Atualize o estado dos pendentes durante a reunião
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendentesAtivos.map((pendente) => (
              <PendenteCard
                key={pendente.id}
                pendente={pendente}
                onAtualizar={(estado, comentario) => onAtualizarPendente(pendente.id, estado, comentario)}
                compact
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Guardar Rascunho
        </Button>
        <Button onClick={onConcluir} disabled={isConcluindo}>
          {isConcluindo ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Concluir e Enviar ao Gestor
        </Button>
      </div>
    </div>
  );
}

// Componente de card de pendente
function PendenteCard({
  pendente,
  onAtualizar,
  isUpdating,
  compact,
}: {
  pendente: any;
  onAtualizar: (estado: 'pendente' | 'em_progresso' | 'resolvido', comentario?: string) => void;
  isUpdating?: boolean;
  compact?: boolean;
}) {
  const [comentario, setComentario] = useState(pendente.comentarioLoja || "");
  const [showComentario, setShowComentario] = useState(false);

  const prioridadeCores = {
    baixa: "bg-gray-100 text-gray-700",
    media: "bg-blue-100 text-blue-700",
    alta: "bg-orange-100 text-orange-700",
    urgente: "bg-red-100 text-red-700",
  };

  const estadoCores = {
    pendente: "bg-amber-100 text-amber-700",
    em_progresso: "bg-blue-100 text-blue-700",
    resolvido: "bg-green-100 text-green-700",
  };

  return (
    <Card className={compact ? "border-l-4 border-l-amber-400" : ""}>
      <CardContent className={compact ? "py-3" : "pt-4"}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className={compact ? "text-sm" : ""}>{pendente.descricao}</p>
            <div className="flex gap-2 mt-2">
              <Badge className={prioridadeCores[pendente.prioridade as keyof typeof prioridadeCores]}>
                {pendente.prioridade}
              </Badge>
              <Badge className={estadoCores[pendente.estado as keyof typeof estadoCores]}>
                {pendente.estado === 'em_progresso' ? 'Em Progresso' : pendente.estado}
              </Badge>
              {pendente.criadoPorNome && (
                <span className="text-xs text-muted-foreground">
                  por {pendente.criadoPorNome}
                </span>
              )}
            </div>
            {pendente.comentarioLoja && !showComentario && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                "{pendente.comentarioLoja}"
              </p>
            )}
          </div>
          {pendente.estado !== 'resolvido' && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComentario(!showComentario)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Select
                value={pendente.estado}
                onValueChange={(value) => onAtualizar(value as 'pendente' | 'em_progresso' | 'resolvido', comentario)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_progresso">Em Progresso</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {showComentario && (
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Adicionar comentário..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => {
                onAtualizar(pendente.estado as 'pendente' | 'em_progresso' | 'resolvido', comentario);
                setShowComentario(false);
              }}
            >
              Guardar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
