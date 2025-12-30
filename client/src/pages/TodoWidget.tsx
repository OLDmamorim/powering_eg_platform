import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Store,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ListTodo,
  Plus,
  ExternalLink,
  Loader2,
  Tag,
  RotateCcw,
  Filter,
  User,
  LogIn,
  Download,
} from "lucide-react";
import { getLoginUrl } from "@/const";

// Hook para instalação PWA
function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Adicionar manifest específico do gestor
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.setAttribute('href', '/manifest-gestor.json');
    } else {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest-gestor.json';
      document.head.appendChild(link);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  return { isInstallable, isInstalled, install };
}

export default function TodoWidget() {
  const { user, loading: authLoading } = useAuth();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filtroLoja, setFiltroLoja] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("ativos");

  // Queries
  const { data: todos, refetch: refetchTodos, isLoading } = trpc.todos.listar.useQuery(
    {
      lojaId: filtroLoja !== "todas" ? parseInt(filtroLoja) : undefined,
      estado: filtroEstado === "ativos" ? undefined : filtroEstado !== "todos" ? filtroEstado : undefined,
      apenasMeus: false,
    },
    { 
      enabled: !!user,
      refetchInterval: 30000, // Atualizar a cada 30 segundos
    }
  );

  const { data: lojas } = trpc.lojas.getByGestor.useQuery(undefined, { enabled: !!user });
  const { data: estatisticas } = trpc.todos.estatisticas.useQuery(undefined, { enabled: !!user });

  // Mutations
  const concluirMutation = trpc.todos.concluir.useMutation({
    onSuccess: () => {
      toast.success("Tarefa concluída!");
      refetchTodos();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const atualizarMutation = trpc.todos.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Estado atualizado!");
      refetchTodos();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchTodos();
    setIsRefreshing(false);
    toast.success("Atualizado!");
  };

  // Tela de login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 mx-auto text-blue-600 mb-4" />
            <h1 className="text-xl font-bold mb-2">Widget Tarefas</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Faça login para ver as suas tarefas
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.href = getLoginUrl()}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtrar tarefas ativas (não concluídas)
  const todosFiltrados = filtroEstado === "ativos" 
    ? todos?.filter((t: any) => t.estado !== 'concluida') 
    : todos;

  const pendentes = todosFiltrados?.filter((t: any) => t.estado === 'pendente') || [];
  const emProgresso = todosFiltrados?.filter((t: any) => t.estado === 'em_progresso') || [];
  const devolvidas = todosFiltrados?.filter((t: any) => t.estado === 'devolvida') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Compacto */}
      <header className="bg-blue-600 text-white p-3 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            <div>
              <h1 className="font-semibold text-sm leading-tight">To-Do Gestor</h1>
              <p className="text-xs text-blue-100">
                {user?.name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isInstallable && !isInstalled && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-blue-700 h-8 px-2 text-xs"
                onClick={async () => {
                  const success = await install();
                  if (success) {
                    toast.success("App instalada com sucesso!");
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Instalar
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-blue-700 h-8 w-8 p-0"
              onClick={() => window.location.href = '/todos'}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Filtros Compactos */}
      <div className="p-3 bg-white/80 backdrop-blur-sm border-b flex gap-2">
        <Select value={filtroLoja} onValueChange={setFiltroLoja}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <Store className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as lojas</SelectItem>
            {lojas?.map((loja: any) => (
              <SelectItem key={loja.id} value={loja.id.toString()}>
                {loja.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="h-8 text-xs w-32">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="em_progresso">Em Progresso</SelectItem>
            <SelectItem value="devolvida">Devolvidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contadores Rápidos */}
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-amber-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">Pendentes</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{pendentes.length}</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 text-blue-500" />
            <span className="text-[10px] text-muted-foreground">Progresso</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{emProgresso.length}</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3 text-orange-500" />
            <span className="text-[10px] text-muted-foreground">Devolvidas</span>
          </div>
          <p className="text-xl font-bold text-orange-600">{devolvidas.length}</p>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="p-3 space-y-2">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-muted-foreground mt-2">A carregar...</p>
          </div>
        ) : !todosFiltrados || todosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground">
                Não há tarefas {filtroEstado === "ativos" ? "ativas" : ""}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tarefas ordenadas por prioridade e estado */}
            {todosFiltrados
              .sort((a: any, b: any) => {
                // Primeiro por estado (devolvidas primeiro, depois pendentes, depois em progresso)
                const estadoOrdem = { devolvida: 0, pendente: 1, em_progresso: 2, concluida: 3 };
                const estadoDiff = (estadoOrdem[a.estado as keyof typeof estadoOrdem] || 2) - 
                                   (estadoOrdem[b.estado as keyof typeof estadoOrdem] || 2);
                if (estadoDiff !== 0) return estadoDiff;
                
                // Depois por prioridade
                const prioridadeOrdem = { urgente: 0, alta: 1, media: 2, baixa: 3 };
                return (prioridadeOrdem[a.prioridade as keyof typeof prioridadeOrdem] || 2) - 
                       (prioridadeOrdem[b.prioridade as keyof typeof prioridadeOrdem] || 2);
              })
              .map((todo: any) => (
                <Card 
                  key={todo.id} 
                  className={`overflow-hidden ${
                    todo.estado === 'devolvida' ? 'border-l-4 border-l-orange-500 bg-orange-50/50' :
                    todo.prioridade === 'urgente' ? 'border-l-4 border-l-red-500 bg-red-50/50' :
                    todo.prioridade === 'alta' ? 'border-l-4 border-l-orange-500' :
                    todo.estado === 'em_progresso' ? 'border-l-4 border-l-blue-500' :
                    'border-l-4 border-l-gray-300'
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap mb-1">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 ${
                              todo.prioridade === 'urgente' ? 'bg-red-100 text-red-800 border-red-300' :
                              todo.prioridade === 'alta' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              todo.prioridade === 'media' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {todo.prioridade === 'urgente' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                            {todo.prioridade}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 ${
                              todo.estado === 'em_progresso' ? 'bg-blue-50 text-blue-700' :
                              todo.estado === 'devolvida' ? 'bg-orange-50 text-orange-700' :
                              todo.estado === 'concluida' ? 'bg-green-50 text-green-700' : ''
                            }`}
                          >
                            {todo.estado === 'pendente' ? 'Pendente' : 
                             todo.estado === 'em_progresso' ? 'Em Progresso' :
                             todo.estado === 'devolvida' ? 'Devolvida' : 'Concluída'}
                          </Badge>
                          {todo.categoriaNome && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0"
                              style={{ borderColor: todo.categoriaCor || undefined, color: todo.categoriaCor || undefined }}
                            >
                              <Tag className="h-2 w-2 mr-0.5" />
                              {todo.categoriaNome}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-sm leading-tight">{todo.titulo}</h3>
                        {todo.descricao && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {todo.descricao}
                          </p>
                        )}
                        {/* Loja atribuída */}
                        {todo.lojaNome && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600">
                            <Store className="h-2.5 w-2.5" />
                            {todo.lojaNome}
                          </div>
                        )}
                        {/* Comentário de devolução */}
                        {todo.estado === 'devolvida' && todo.comentarioDevolucao && (
                          <div className="mt-1 p-1.5 bg-orange-100 rounded text-[10px] text-orange-800">
                            <strong>Motivo:</strong> {todo.comentarioDevolucao}
                          </div>
                        )}
                        {todo.dataLimite && (
                          <p className="text-[10px] text-orange-600 mt-1">
                            Prazo: {new Date(todo.dataLimite).toLocaleDateString('pt-PT')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {todo.estado !== 'concluida' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                            onClick={() => concluirMutation.mutate({ id: todo.id })}
                            disabled={concluirMutation.isPending}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Concluir
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </>
        )}
      </div>

      {/* Botão Flutuante - Nova Tarefa */}
      <Button
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        onClick={() => window.location.href = '/todos'}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
