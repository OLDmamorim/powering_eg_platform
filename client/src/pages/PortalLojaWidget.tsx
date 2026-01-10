import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface LojaAuth {
  lojaId: number;
  lojaNome: string;
  lojaEmail: string | null;
}

export default function PortalLojaWidget() {
  const { language } = useLanguage();
  const [token, setToken] = useState<string>("");
  const [lojaAuth, setLojaAuth] = useState<LojaAuth | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    },
    onError: () => {
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

  // Query de To-Dos
  const { data: todosList, refetch: refetchTodos, isLoading } = trpc.todosPortalLoja.listar.useQuery(
    { token, apenasAtivos: true },
    { 
      enabled: !!token && !!lojaAuth,
      refetchInterval: 30000, // Atualizar a cada 30 segundos
    }
  );

  const { data: todosCount } = trpc.todosPortalLoja.contar.useQuery(
    { token },
    { enabled: !!token && !!lojaAuth }
  );

  // Mutations
  const atualizarEstadoMutation = trpc.todosPortalLoja.atualizarEstado.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa iniciada!" : "Task started!");
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const concluirMutation = trpc.todosPortalLoja.concluir.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa concluída!" : "Task completed!");
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchTodos();
    setIsRefreshing(false);
    toast.success(language === 'pt' ? "Atualizado!" : "Updated!");
  };

  // Tela de login compacta
  if (!lojaAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <Store className="h-12 w-12 mx-auto text-emerald-600 mb-4" />
            <h1 className="text-xl font-bold mb-2">Widget Tarefas</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Aceda ao Portal da Loja para autenticar
            </p>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => window.location.href = '/portal-loja'}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendentes = todosList?.filter((t: any) => t.estado === 'pendente') || [];
  const emProgresso = todosList?.filter((t: any) => t.estado === 'em_progresso') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header Compacto */}
      <header className="bg-emerald-600 text-white p-3 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            <div>
              <h1 className="font-semibold text-sm leading-tight">{lojaAuth.lojaNome}</h1>
              <p className="text-xs text-emerald-100">
                {todosCount || 0} tarefas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-emerald-700 h-8 w-8 p-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-emerald-700 h-8 w-8 p-0"
              onClick={() => window.location.href = '/portal-loja'}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Contadores Rápidos */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-amber-500">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Pendentes</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendentes.length}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Em Progresso</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{emProgresso.length}</p>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="p-3 space-y-2">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
            <p className="text-sm text-muted-foreground mt-2">A carregar...</p>
          </div>
        ) : !todosList || todosList.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground">
                Não há tarefas pendentes
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tarefas Urgentes primeiro */}
            {todosList
              .sort((a: any, b: any) => {
                const prioridadeOrdem = { urgente: 0, alta: 1, media: 2, baixa: 3 };
                return (prioridadeOrdem[a.prioridade as keyof typeof prioridadeOrdem] || 2) - 
                       (prioridadeOrdem[b.prioridade as keyof typeof prioridadeOrdem] || 2);
              })
              .map((todo: any) => (
                <Card 
                  key={todo.id} 
                  className={`overflow-hidden ${
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
                              todo.estado === 'em_progresso' ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            {todo.estado === 'pendente' ? 'Pendente' : 'Em Progresso'}
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
                        {todo.dataLimite && (
                          <p className="text-[10px] text-orange-600 mt-1">
                            Prazo: {new Date(todo.dataLimite).toLocaleDateString('pt-PT')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {todo.estado === 'pendente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => atualizarEstadoMutation.mutate({
                              token,
                              todoId: todo.id,
                              estado: 'em_progresso',
                            })}
                            disabled={atualizarEstadoMutation.isPending}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Iniciar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => concluirMutation.mutate({
                            token,
                            todoId: todo.id,
                          })}
                          disabled={concluirMutation.isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Concluir
                        </Button>
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
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg"
        onClick={() => window.location.href = '/portal-loja?tab=todos'}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
