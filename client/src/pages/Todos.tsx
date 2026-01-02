import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  MoreVertical,
  Trash2,
  Edit,
  Send,
  Store,
  User,
  Tag,
  Calendar,
  ListTodo,
  Settings,
  Smartphone,
  Download,
  ArrowDown,
  Inbox,
  SendHorizontal,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Todos() {
  const { user } = useAuth();
  const [filtroLoja, setFiltroLoja] = useState<string>("todas");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("todas");
  const [apenasMeus, setApenasMeus] = useState(false);
  const [tabAtivo, setTabAtivo] = useState<string>("recebidas");
  
  // Dialogs
  const [novoTodoOpen, setNovoTodoOpen] = useState(false);
  const [editarTodoOpen, setEditarTodoOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [todoSelecionado, setTodoSelecionado] = useState<any>(null);
  
  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [prioridade, setPrioridade] = useState<string>("media");
  const [atribuidoLojaId, setAtribuidoLojaId] = useState<string>("");
  const [atribuidoUserId, setAtribuidoUserId] = useState<string>("");
  const [dataLimite, setDataLimite] = useState<string>("");
  
  // Estado para mudança de status
  const [mudarStatusOpen, setMudarStatusOpen] = useState(false);
  const [novoStatus, setNovoStatus] = useState<string>("");
  const [respostaStatus, setRespostaStatus] = useState<string>("");
  
  // Categoria form
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaCor, setNovaCategoriaCor] = useState("#3B82F6");
  
  // Queries
  const { data: todos, refetch: refetchTodos } = trpc.todos.listar.useQuery({
    lojaId: filtroLoja !== "todas" ? parseInt(filtroLoja) : undefined,
    estado: filtroEstado !== "todos" ? filtroEstado : undefined,
    categoriaId: filtroCategoria !== "todas" ? parseInt(filtroCategoria) : undefined,
    prioridade: filtroPrioridade !== "todas" ? filtroPrioridade : undefined,
    apenasMeus: apenasMeus,
  });
  
  const { data: categorias, refetch: refetchCategorias } = trpc.todoCategories.listar.useQuery();
  const { data: lojas } = trpc.lojas.getByGestor.useQuery();
  // Usar endpoint acessível a gestores e admins para listar utilizadores
  const { data: utilizadores } = trpc.gestores.listarParaTodos.useQuery();
  const { data: estatisticas, refetch: refetchEstatisticas } = trpc.todos.estatisticas.useQuery();
  
  // Utils para invalidar queries
  const utils = trpc.useUtils();
  
  // Mutations
  const criarTodoMutation = trpc.todos.criar.useMutation({
    onSuccess: () => {
      toast.success("Tarefa criada com sucesso!");
      setNovoTodoOpen(false);
      resetForm();
      refetchTodos();
      refetchEstatisticas(); // Atualizar totalizadores
      utils.todos.countNaoVistos.invalidate(); // Atualizar badge
    },
    onError: (error) => toast.error(error.message),
  });
  
  const atualizarTodoMutation = trpc.todos.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Tarefa atualizada!");
      setEditarTodoOpen(false);
      setTodoSelecionado(null);
      resetForm();
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const concluirTodoMutation = trpc.todos.concluir.useMutation({
    onSuccess: () => {
      toast.success("Tarefa concluída!");
      refetchTodos();
      refetchEstatisticas(); // Atualizar totalizadores
    },
    onError: (error) => toast.error(error.message),
  });
  
  const eliminarTodoMutation = trpc.todos.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Tarefa eliminada!");
      refetchTodos();
      refetchEstatisticas(); // Atualizar totalizadores
    },
    onError: (error) => toast.error(error.message),
  });
  
  const criarCategoriaMutation = trpc.todoCategories.criar.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada!");
      setNovaCategoriaNome("");
      setNovaCategoriaCor("#3B82F6");
      refetchCategorias();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const eliminarCategoriaMutation = trpc.todoCategories.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Categoria eliminada!");
      refetchCategorias();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const marcarVistoMutation = trpc.todos.marcarVisto.useMutation({
    onSuccess: () => {
      refetchTodos();
    },
  });
  
  const mudarStatusMutation = trpc.todos.mudarStatusComResposta.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado e loja notificada!");
      setMudarStatusOpen(false);
      setTodoSelecionado(null);
      setNovoStatus("");
      setRespostaStatus("");
      refetchTodos();
      refetchEstatisticas();
    },
    onError: (error: any) => toast.error(error.message),
  });
  
  const resetForm = () => {
    setTitulo("");
    setDescricao("");
    setCategoriaId("");
    setPrioridade("media");
    setAtribuidoLojaId("");
    setAtribuidoUserId("");
    setDataLimite("");
  };
  
  const handleCriarTodo = () => {
    if (!titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    
    criarTodoMutation.mutate({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoriaId: categoriaId ? parseInt(categoriaId) : undefined,
      prioridade: prioridade as any,
      atribuidoLojaId: atribuidoLojaId ? parseInt(atribuidoLojaId) : undefined,
      atribuidoUserId: atribuidoUserId ? parseInt(atribuidoUserId) : undefined,
      dataLimite: dataLimite || undefined,
    });
  };
  
  const handleEditarTodo = () => {
    if (!todoSelecionado) return;
    
    atualizarTodoMutation.mutate({
      id: todoSelecionado.id,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoriaId: categoriaId ? parseInt(categoriaId) : null,
      prioridade: prioridade as any,
      atribuidoLojaId: atribuidoLojaId ? parseInt(atribuidoLojaId) : null,
      atribuidoUserId: atribuidoUserId ? parseInt(atribuidoUserId) : null,
      dataLimite: dataLimite || null,
    });
  };
  
  const abrirEditar = (todo: any) => {
    setTodoSelecionado(todo);
    setTitulo(todo.titulo);
    setDescricao(todo.descricao || "");
    setCategoriaId(todo.categoriaId?.toString() || "");
    setPrioridade(todo.prioridade);
    setAtribuidoLojaId(todo.atribuidoLojaId?.toString() || "");
    setAtribuidoUserId(todo.atribuidoUserId?.toString() || "");
    setDataLimite(todo.dataLimite ? new Date(todo.dataLimite).toISOString().split('T')[0] : "");
    setEditarTodoOpen(true);
  };
  
  const corPrioridade = (prioridade: string) => {
    switch (prioridade) {
      case "urgente": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "alta": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "media": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "baixa": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  const corEstado = (estado: string) => {
    switch (estado) {
      case "concluida": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "em_progresso": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "devolvida": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  
  const iconeEstado = (estado: string) => {
    switch (estado) {
      case "concluida": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "em_progresso": return <Clock className="h-4 w-4 text-blue-600" />;
      case "devolvida": return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListTodo className="h-6 w-6" />
              To-Do
            </h1>
            <p className="text-muted-foreground">Gestão de tarefas e atribuições</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => window.open('/todo-widget', '_blank')}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Instalar App
            </Button>
            {user?.role === "admin" && (
              <Button variant="outline" onClick={() => setCategoriasOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Categorias
              </Button>
            )}
            <Button onClick={() => { resetForm(); setNovoTodoOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>
        
        {/* Estatísticas - Cards Clicáveis como Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'pendente' ? 'ring-2 ring-gray-500 bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800/50'}`}
            onClick={() => setFiltroEstado(filtroEstado === 'pendente' ? 'todos' : 'pendente')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold">{estatisticas?.pendentes || 0}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'em_progresso' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-800/40' : 'bg-blue-50 dark:bg-blue-900/20'}`}
            onClick={() => setFiltroEstado(filtroEstado === 'em_progresso' ? 'todos' : 'em_progresso')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{estatisticas?.emProgresso || 0}</p>
                  <p className="text-xs text-muted-foreground">Em Progresso</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'concluida' ? 'ring-2 ring-green-500 bg-green-100 dark:bg-green-800/40' : 'bg-green-50 dark:bg-green-900/20'}`}
            onClick={() => setFiltroEstado(filtroEstado === 'concluida' ? 'todos' : 'concluida')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{estatisticas?.concluidos || 0}</p>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'devolvida' ? 'ring-2 ring-orange-500 bg-orange-100 dark:bg-orange-800/40' : 'bg-orange-50 dark:bg-orange-900/20'}`}
            onClick={() => setFiltroEstado(filtroEstado === 'devolvida' ? 'todos' : 'devolvida')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{estatisticas?.devolvidos || 0}</p>
                  <p className="text-xs text-muted-foreground">Devolvidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger className="w-[180px]">
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_progresso">Em Progresso</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="devolvida">Devolvida</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                        {cat.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={apenasMeus ? "default" : "outline"}
                size="sm"
                onClick={() => setApenasMeus(!apenasMeus)}
              >
                <User className="h-4 w-4 mr-1" />
                Apenas meus
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Tabs Recebidas/Enviadas */}
        <Tabs value={tabAtivo} onValueChange={setTabAtivo} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="recebidas" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Recebidas
              {todos && todos.filter(t => t.paraMim).filter(t => !t.visto).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 animate-pulse">
                  {todos.filter(t => t.paraMim).filter(t => !t.visto).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="enviadas" className="flex items-center gap-2">
              <SendHorizontal className="h-4 w-4" />
              Enviadas
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                {todos?.filter(t => !t.paraMim).length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="recebidas">
            <div className="space-y-3">
              {todos?.filter(t => t.paraMim).length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma tarefa recebida</p>
                  </CardContent>
                </Card>
              )}
              
              {todos?.filter(t => t.paraMim).map((todo) => (
                <TodoCard 
                  key={todo.id} 
                  todo={todo} 
                  isParaMim={true}
                  onEditar={abrirEditar}
                  onConcluir={(id) => concluirTodoMutation.mutate({ id })}
                  onEliminar={(id) => {
                    if (confirm('Tem certeza que deseja eliminar esta tarefa?')) {
                      eliminarTodoMutation.mutate({ id });
                    }
                  }}
                  onMarcarVisto={(id) => marcarVistoMutation.mutate({ id })}
                  onMudarStatus={(todo) => {
                    setTodoSelecionado(todo);
                    setNovoStatus(todo.estado);
                    setRespostaStatus("");
                    setMudarStatusOpen(true);
                  }}
                  corPrioridade={corPrioridade}
                  corEstado={corEstado}
                  iconeEstado={iconeEstado}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="enviadas">
            <div className="space-y-3">
              {todos?.filter(t => !t.paraMim).length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <SendHorizontal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma tarefa enviada</p>
                    <Button className="mt-4" onClick={() => { resetForm(); setNovoTodoOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar tarefa
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {todos?.filter(t => !t.paraMim).map((todo) => (
                <TodoCard 
                  key={todo.id} 
                  todo={todo} 
                  isParaMim={false}
                  onEditar={abrirEditar}
                  onConcluir={(id) => concluirTodoMutation.mutate({ id })}
                  onEliminar={(id) => {
                    if (confirm('Tem certeza que deseja eliminar esta tarefa?')) {
                      eliminarTodoMutation.mutate({ id });
                    }
                  }}
                  onMarcarVisto={(id) => marcarVistoMutation.mutate({ id })}
                  onMudarStatus={(todo) => {
                    setTodoSelecionado(todo);
                    setNovoStatus(todo.estado);
                    setRespostaStatus("");
                    setMudarStatusOpen(true);
                  }}
                  corPrioridade={corPrioridade}
                  corEstado={corEstado}
                  iconeEstado={iconeEstado}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Dialog Nova Tarefa */}
        <Dialog open={novoTodoOpen} onOpenChange={setNovoTodoOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
              <DialogDescription>
                Crie uma nova tarefa e atribua a uma loja ou utilizador
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título da tarefa"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição detalhada..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <Select value={categoriaId} onValueChange={setCategoriaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                            {cat.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={prioridade} onValueChange={setPrioridade}>
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
              
              <div>
                <label className="text-sm font-medium">Atribuir a Loja</label>
                <Select value={atribuidoLojaId} onValueChange={(v) => { setAtribuidoLojaId(v); setAtribuidoUserId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar loja..." />
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
                <label className="text-sm font-medium">Ou atribuir a Utilizador</label>
                <Select value={atribuidoUserId} onValueChange={(v) => { setAtribuidoUserId(v); setAtribuidoLojaId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar utilizador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {utilizadores?.map((u: any) => (
                      <SelectItem key={u.userId} value={u.userId.toString()}>
                        {u.nome} {u.role === 'admin' ? '(Admin)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Data Limite (opcional)</label>
                <Input
                  type="date"
                  value={dataLimite}
                  onChange={(e) => setDataLimite(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovoTodoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCriarTodo} disabled={criarTodoMutation.isPending}>
                {criarTodoMutation.isPending ? "A criar..." : "Criar Tarefa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog Editar Tarefa */}
        <Dialog open={editarTodoOpen} onOpenChange={setEditarTodoOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Tarefa</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título da tarefa"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição detalhada..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <Select value={categoriaId} onValueChange={setCategoriaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                            {cat.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={prioridade} onValueChange={setPrioridade}>
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
              
              <div>
                <label className="text-sm font-medium">Atribuir a Loja</label>
                <Select value={atribuidoLojaId} onValueChange={(v) => { setAtribuidoLojaId(v); setAtribuidoUserId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar loja..." />
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
                <label className="text-sm font-medium">Ou atribuir a Utilizador</label>
                <Select value={atribuidoUserId} onValueChange={(v) => { setAtribuidoUserId(v); setAtribuidoLojaId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar utilizador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {utilizadores?.map((u: any) => (
                      <SelectItem key={u.userId} value={u.userId.toString()}>
                        {u.nome} {u.role === 'admin' ? '(Admin)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Data Limite</label>
                <Input
                  type="date"
                  value={dataLimite}
                  onChange={(e) => setDataLimite(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditarTodoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditarTodo} disabled={atualizarTodoMutation.isPending}>
                {atualizarTodoMutation.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog Mudar Status */}
        <Dialog open={mudarStatusOpen} onOpenChange={setMudarStatusOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mudar Status da Tarefa</DialogTitle>
              <DialogDescription>
                Altere o estado da tarefa e adicione uma resposta para a loja
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {todoSelecionado && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{todoSelecionado.titulo}</p>
                  {todoSelecionado.lojaNome && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Store className="h-3 w-3" />
                      {todoSelecionado.lojaNome}
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Novo Status *</label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        Pendente
                      </div>
                    </SelectItem>
                    <SelectItem value="em_progresso">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-blue-500" />
                        Em Progresso
                      </div>
                    </SelectItem>
                    <SelectItem value="devolvida">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-orange-500" />
                        Devolver à Loja
                      </div>
                    </SelectItem>
                    <SelectItem value="concluida">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Concluída
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Resposta / Comentário para a Loja</label>
                <Textarea
                  value={respostaStatus}
                  onChange={(e) => setRespostaStatus(e.target.value)}
                  placeholder="Escreva uma resposta ou instruções para a loja..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A loja será notificada por email sobre esta atualização
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setMudarStatusOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  if (!novoStatus) {
                    toast.error("Selecione um status");
                    return;
                  }
                  mudarStatusMutation.mutate({
                    id: todoSelecionado.id,
                    estado: novoStatus as any,
                    resposta: respostaStatus.trim() || undefined,
                  });
                }} 
                disabled={mudarStatusMutation.isPending}
              >
                {mudarStatusMutation.isPending ? "A atualizar..." : "Atualizar Status"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Dialog Categorias */}
        <Dialog open={categoriasOpen} onOpenChange={setCategoriasOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerir Categorias</DialogTitle>
              <DialogDescription>
                Crie e gerencie categorias para organizar as tarefas
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={novaCategoriaNome}
                  onChange={(e) => setNovaCategoriaNome(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1"
                />
                <Input
                  type="color"
                  value={novaCategoriaCor}
                  onChange={(e) => setNovaCategoriaCor(e.target.value)}
                  className="w-14"
                />
                <Button 
                  onClick={() => {
                    if (novaCategoriaNome.trim()) {
                      criarCategoriaMutation.mutate({ nome: novaCategoriaNome.trim(), cor: novaCategoriaCor });
                    }
                  }}
                  disabled={criarCategoriaMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categorias?.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.cor }} />
                      <span>{cat.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Eliminar esta categoria?')) {
                          eliminarCategoriaMutation.mutate({ id: cat.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Botão Flutuante (FAB) para Criação Rápida */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="h-12 px-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-blue-600 hover:bg-blue-700 gap-2"
          onClick={() => { resetForm(); setNovoTodoOpen(true); }}
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Nova Tarefa</span>
        </Button>
      </div>
    </DashboardLayout>
  );
}

// Componente TodoCard com destaque visual
function TodoCard({
  todo,
  isParaMim,
  onEditar,
  onConcluir,
  onEliminar,
  onMarcarVisto,
  onMudarStatus,
  corPrioridade,
  corEstado,
  iconeEstado,
}: {
  todo: any;
  isParaMim: boolean;
  onEditar: (todo: any) => void;
  onConcluir: (id: number) => void;
  onEliminar: (id: number) => void;
  onMarcarVisto: (id: number) => void;
  onMudarStatus: (todo: any) => void;
  corPrioridade: (p: string) => string;
  corEstado: (e: string) => string;
  iconeEstado: (e: string) => React.ReactNode;
}) {
  // Marcar como visto ao clicar no card (se não visto e é para mim)
  const handleClick = () => {
    if (!todo.visto && isParaMim) {
      onMarcarVisto(todo.id);
    }
  };
  
  // Classes dinâmicas baseadas no estado
  const cardClasses = [
    "hover:shadow-md transition-all cursor-pointer",
    // Destaque para tarefas "para mim"
    isParaMim && "border-l-4 border-l-blue-500",
    // Animação pulse para não vistos
    !todo.visto && isParaMim && "animate-pulse-subtle bg-blue-50/50 dark:bg-blue-900/20",
    // Borda mais forte se não visto
    !todo.visto && isParaMim && "ring-2 ring-blue-400/50",
  ].filter(Boolean).join(" ");
  
  return (
    <Card className={cardClasses} onClick={handleClick}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {iconeEstado(todo.estado)}
              <h3 className="font-semibold truncate">{todo.titulo}</h3>
              
              {/* Badge "Para si" se é tarefa recebida e não vista */}
              {isParaMim && !todo.visto && (
                <Badge className="bg-blue-600 text-white animate-pulse">
                  <ArrowDown className="h-3 w-3 mr-1" />
                  Para si
                </Badge>
              )}
              
              {/* Badge "Visto" se já foi visto */}
              {isParaMim && todo.visto && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <Eye className="h-3 w-3 mr-1" />
                  Visto
                </Badge>
              )}
              
              <Badge className={corPrioridade(todo.prioridade)}>
                {todo.prioridade}
              </Badge>
              <Badge className={corEstado(todo.estado)}>
                {todo.estado.replace('_', ' ')}
              </Badge>
              {todo.categoriaNome && (
                <Badge 
                  variant="outline" 
                  style={{ borderColor: todo.categoriaCor || undefined, color: todo.categoriaCor || undefined }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {todo.categoriaNome}
                </Badge>
              )}
            </div>
            
            {todo.descricao && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {todo.descricao}
              </p>
            )}
            
            {/* Loja atribuída em destaque */}
            {todo.lojaNome && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                <Store className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-700 dark:text-blue-300">{todo.lojaNome}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {todo.atribuidoUserNome && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {todo.atribuidoUserNome}
                </span>
              )}
              {todo.dataLimite && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(todo.dataLimite).toLocaleDateString('pt-PT')}
                </span>
              )}
              <span className={todo.criadoPorLojaId ? "flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium" : ""}>
                {todo.criadoPorLojaId && <Store className="h-3 w-3" />}
                Criado por: {todo.criadoPorNome || 'N/A'}
              </span>
              <span>{new Date(todo.createdAt).toLocaleDateString('pt-PT')}</span>
            </div>
            
            {todo.comentario && (
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm">
                <strong>Comentário:</strong> {todo.comentario}
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditar(todo); }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMudarStatus(todo); }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Mudar Status
              </DropdownMenuItem>
              {todo.estado !== 'concluida' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConcluir(todo.id); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como concluída
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-red-600"
                onClick={(e) => { e.stopPropagation(); onEliminar(todo.id); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
