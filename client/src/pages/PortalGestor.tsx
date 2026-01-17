import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import FiltroMesesCheckbox, { MesSelecionado } from "@/components/FiltroMesesCheckbox";
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
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
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
  Download,
  Smartphone,
  Upload,
  X,
  Image as ImageIcon,
  Paperclip,
  Edit,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Wrench,
  ArrowLeft,
  Sparkles,
  Brain,
  Zap,
  AlertCircle,
  ThumbsUp,
  Rocket,
  RefreshCw,
  Building2,
} from "lucide-react";

// Registar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export default function PortalGestor() {
  const { language, setLanguage, t } = useLanguage();
  const [lojaAtualId, setLojaAtualId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "reuniao" | "pendentes" | "historico" | "tarefas" | "resultados">("home");
  const [filtroTarefas, setFiltroTarefas] = useState<"todas" | "recebidas" | "enviadas" | "internas">("todas");
  const [mesesSelecionadosDashboard, setMesesSelecionadosDashboard] = useState<MesSelecionado[]>(() => {
    const hoje = new Date();
    return [{ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }];
  });
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [analiseIA, setAnaliseIA] = useState<any>(null);
  const [gerandoAnaliseIA, setGerandoAnaliseIA] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Buscar dados do gestor atual
  const { data: gestorData, isLoading: loadingGestor } = trpc.gestores.me.useQuery();
  
  // Buscar dados da loja selecionada
  const { data: dadosLoja, refetch: refetchDados, isLoading: loadingDados } = trpc.lojas.getDadosLojaGestor.useQuery(
    { lojaId: lojaAtualId! },
    { enabled: !!lojaAtualId }
  );
  
  // Buscar pendentes da loja
  const { data: pendentes, refetch: refetchPendentes } = trpc.lojas.getPendentesLojaGestor.useQuery(
    { lojaId: lojaAtualId! },
    { enabled: !!lojaAtualId }
  );
  
  // Buscar reuniões da loja
  const { data: reunioes, refetch: refetchReunioes } = trpc.lojas.getReunioesLojaGestor.useQuery(
    { lojaId: lojaAtualId! },
    { enabled: !!lojaAtualId }
  );
  
  // Buscar todos/tarefas da loja
  const { data: todos, refetch: refetchTodos } = trpc.lojas.getTodosLojaGestor.useQuery(
    { lojaId: lojaAtualId! },
    { enabled: !!lojaAtualId }
  );
  
  // Buscar dashboard completo
  const { data: dashboardData, refetch: refetchDashboard } = trpc.lojas.dashboardCompletoGestor.useQuery(
    { 
      lojaId: lojaAtualId!,
      meses: mesesSelecionadosDashboard 
    },
    { enabled: !!lojaAtualId }
  );

  // Selecionar primeira loja automaticamente
  useEffect(() => {
    if (gestorData?.lojas && gestorData.lojas.length > 0 && !lojaAtualId) {
      // Ordenar lojas alfabeticamente e selecionar a primeira
      const lojasOrdenadas = [...gestorData.lojas].sort((a, b) => a.nome.localeCompare(b.nome));
      setLojaAtualId(lojasOrdenadas[0].id);
    }
  }, [gestorData, lojaAtualId]);

  // Recarregar dados quando mudar de loja
  const handleLojaChange = (lojaId: string) => {
    const novaLojaId = parseInt(lojaId);
    setLojaAtualId(novaLojaId);
    setActiveTab("home");
    toast.success(language === 'pt' ? 'Loja alterada!' : 'Store changed!');
  };

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!dashboardRef.current || !dadosLoja) return;
    
    setExportandoPDF(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`resultados-${dadosLoja?.loja?.nome || 'loja'}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success(language === 'pt' ? 'PDF exportado com sucesso!' : 'PDF exported successfully!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error(language === 'pt' ? 'Erro ao exportar PDF' : 'Error exporting PDF');
    } finally {
      setExportandoPDF(false);
    }
  };

  // Loading state
  if (loadingGestor) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    );
  }

  // Se não é gestor ou não tem lojas
  if (!gestorData || !gestorData.lojas || gestorData.lojas.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Building2 className="h-16 w-16 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700">
            {language === 'pt' ? 'Sem lojas atribuídas' : 'No stores assigned'}
          </h2>
          <p className="text-gray-500 text-center max-w-md">
            {language === 'pt' 
              ? 'Não tem lojas atribuídas ao seu perfil. Contacte o administrador para associar lojas.'
              : 'You have no stores assigned to your profile. Contact the administrator to assign stores.'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Ordenar lojas alfabeticamente
  const lojasOrdenadas = [...gestorData.lojas].sort((a, b) => a.nome.localeCompare(b.nome));
  const lojaAtual = lojasOrdenadas.find(l => l.id === lojaAtualId);

  // Filtrar tarefas
  const tarefasFiltradas = todos?.filter((todo: any) => {
    if (filtroTarefas === "todas") return true;
    if (filtroTarefas === "recebidas") return todo.atribuidoLojaId === lojaAtualId && !todo.isInterna;
    if (filtroTarefas === "enviadas") return todo.criadoPorLojaId === lojaAtualId && !todo.isInterna;
    if (filtroTarefas === "internas") return todo.isInterna && todo.criadoPorLojaId === lojaAtualId;
    return true;
  }) || [];

  // Contadores de tarefas
  const contadorTarefas = {
    todas: todos?.length || 0,
    recebidas: todos?.filter((t: any) => t.atribuidoLojaId === lojaAtualId && !t.isInterna).length || 0,
    enviadas: todos?.filter((t: any) => t.criadoPorLojaId === lojaAtualId && !t.isInterna).length || 0,
    internas: todos?.filter((t: any) => t.isInterna && t.criadoPorLojaId === lojaAtualId).length || 0,
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header com seletor de loja */}
        <header className="bg-emerald-600 text-white sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            {/* Linha superior: Info do gestor */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm text-emerald-100">
                  {gestorData?.user?.name || 'Gestor'} • {lojasOrdenadas.length} {language === 'pt' ? 'lojas' : 'stores'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={(value) => setLanguage(value as 'pt' | 'en')}>
                  <SelectTrigger className="w-16 h-7 bg-white/20 border-white/30 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">PT</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Linha inferior: Seletor de loja */}
            <div className="w-full">
              <Select 
                value={String(lojaAtualId)} 
                onValueChange={handleLojaChange}
              >
                <SelectTrigger className="w-full h-auto px-4 py-2 border-2 border-emerald-200 bg-white text-emerald-800 text-base font-semibold hover:bg-emerald-50 rounded-lg flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-2 truncate">
                    <Store className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="truncate">{lojaAtual?.nome || 'Selecionar loja'}</span>
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {lojasOrdenadas.map(loja => (
                    <SelectItem key={loja.id} value={String(loja.id)}>
                      <span className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {loja.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <div className="container mx-auto px-4 py-6">
          {/* Página Inicial com Cards */}
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Grid de Cards de Navegação */}
              <div className="grid grid-cols-2 gap-4">
                {/* Card Resultados */}
                <div 
                  onClick={() => setActiveTab("resultados")}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <BarChart3 className="h-8 w-8 opacity-80" />
                    <TrendingUp className="h-5 w-5 opacity-60" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">
                    {language === 'pt' ? 'Resultados' : 'Results'}
                  </h3>
                  <p className="text-sm text-blue-100">
                    {language === 'pt' ? 'Ver KPIs, objetivos e performance' : 'View KPIs, goals and performance'}
                  </p>
                </div>

                {/* Card Tarefas */}
                <div 
                  onClick={() => setActiveTab("tarefas")}
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <ListTodo className="h-8 w-8 opacity-80" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">
                    {language === 'pt' ? 'Tarefas' : 'Tasks'}
                  </h3>
                  <p className="text-sm text-purple-100">
                    {language === 'pt' ? 'Gerir tarefas e comunicações' : 'Manage tasks and communications'}
                  </p>
                </div>

                {/* Card Pendentes */}
                <div 
                  onClick={() => setActiveTab("pendentes")}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] shadow-lg relative"
                >
                  {(pendentes?.length || 0) > 0 && (
                    <Badge className="absolute top-3 right-3 bg-white text-orange-600 hover:bg-white">
                      {pendentes?.length}
                    </Badge>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <AlertTriangle className="h-8 w-8 opacity-80" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">
                    {language === 'pt' ? 'Pendentes' : 'Pending'}
                  </h3>
                  <p className="text-sm text-orange-100">
                    {language === 'pt' ? 'Pendentes atribuídos à loja' : 'Pending items assigned to store'}
                  </p>
                </div>

                {/* Card Reunião */}
                <div 
                  onClick={() => setActiveTab("reuniao")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <FileText className="h-8 w-8 opacity-80" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">
                    {language === 'pt' ? 'Reunião' : 'Meeting'}
                  </h3>
                  <p className="text-sm text-emerald-100">
                    {language === 'pt' ? 'Registar reuniões quinzenais' : 'Record biweekly meetings'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Resultados */}
          {activeTab === "resultados" && (
            <div className="space-y-4" ref={dashboardRef}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab("home")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'pt' ? 'Voltar' : 'Back'}
              </Button>

              {/* Info de atualização */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Clock className="h-4 w-4" />
                <span>
                  {language === 'pt' ? 'Atualizado em:' : 'Updated at:'} {new Date().toLocaleString(language === 'pt' ? 'pt-PT' : 'en-GB')}
                </span>
              </div>

              {/* Filtro de meses e exportar */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exportandoPDF}
                >
                  {exportandoPDF ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {language === 'pt' ? 'Exportar PDF' : 'Export PDF'}
                </Button>
                
                <FiltroMesesCheckbox
                  mesesSelecionados={mesesSelecionadosDashboard}
                  onMesesChange={setMesesSelecionadosDashboard}
                  maxMeses={3}
                />
              </div>

              {loadingDados ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : dashboardData ? (
                <div className="space-y-4">
                  {/* KPIs principais */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-blue-500 text-white border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100 text-sm">
                              {language === 'pt' ? 'Serviços' : 'Services'}
                            </p>
                            <p className="text-3xl font-bold">{dashboardData.kpis?.servicosRealizados || 0}</p>
                          </div>
                          <Wrench className="h-8 w-8 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-500 text-white border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100 text-sm">
                              {language === 'pt' ? 'Objetivo' : 'Goal'}
                            </p>
                            <p className="text-3xl font-bold">{dashboardData.kpis?.objetivoMensal || 0}</p>
                          </div>
                          <Target className="h-8 w-8 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={`${(dashboardData.kpis?.desvioObjetivoDiario || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'} text-white border-0`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white/80 text-sm">
                              {language === 'pt' ? 'Desvio Obj. Diário' : 'Daily Goal Deviation'}
                            </p>
                            <p className="text-3xl font-bold">
                              {(dashboardData.kpis?.desvioObjetivoDiario || 0) >= 0 ? '+' : ''}
                              {(dashboardData.kpis?.desvioObjetivoDiario || 0).toFixed(1)}%
                            </p>
                          </div>
                          {(dashboardData.kpis?.desvioObjetivoDiario || 0) >= 0 ? (
                            <TrendingUp className="h-8 w-8 opacity-60" />
                          ) : (
                            <TrendingDown className="h-8 w-8 opacity-60" />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-orange-500 text-white border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-orange-100 text-sm">
                              {language === 'pt' ? 'Taxa Rep.' : 'Rep. Rate'}
                            </p>
                            <p className="text-3xl font-bold">
                              {(dashboardData.kpis?.taxaReparacao || 0).toFixed(1)}%
                            </p>
                          </div>
                          <Award className="h-8 w-8 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vendas complementares */}
                  {dashboardData.kpis?.vendasComplementares !== undefined && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-sm">
                              {language === 'pt' ? 'Vendas Complementares' : 'Complementary Sales'}
                            </p>
                            <p className="text-2xl font-bold text-emerald-600">
                              {dashboardData.kpis.vendasComplementares}
                            </p>
                          </div>
                          <Sparkles className="h-6 w-6 text-emerald-500" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      {language === 'pt' ? 'Sem dados disponíveis para este período' : 'No data available for this period'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tab Tarefas */}
          {activeTab === "tarefas" && (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab("home")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'pt' ? 'Voltar' : 'Back'}
              </Button>

              {/* Filtros de tarefas */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(['todas', 'recebidas', 'enviadas', 'internas'] as const).map(filtro => (
                  <Button
                    key={filtro}
                    variant={filtroTarefas === filtro ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTarefas(filtro)}
                    className={filtroTarefas === filtro ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    {filtro === 'todas' && (language === 'pt' ? 'Todas' : 'All')}
                    {filtro === 'recebidas' && (language === 'pt' ? 'Recebidas' : 'Received')}
                    {filtro === 'enviadas' && (language === 'pt' ? 'Enviadas' : 'Sent')}
                    {filtro === 'internas' && (language === 'pt' ? 'Internas' : 'Internal')}
                    <Badge variant="secondary" className="ml-2">
                      {contadorTarefas[filtro]}
                    </Badge>
                  </Button>
                ))}
              </div>

              {/* Lista de tarefas */}
              {tarefasFiltradas.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ListTodo className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      {language === 'pt' ? 'Sem tarefas nesta categoria' : 'No tasks in this category'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {tarefasFiltradas.map((todo: any) => (
                    <Card key={todo.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{todo.titulo}</h4>
                              <Badge 
                                variant={
                                  todo.prioridade === 'urgente' ? 'destructive' :
                                  todo.prioridade === 'alta' ? 'default' :
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {todo.prioridade}
                              </Badge>
                            </div>
                            {todo.descricao && (
                              <p className="text-sm text-gray-500 line-clamp-2">{todo.descricao}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(todo.criadoEm).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB')}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {todo.estado}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Pendentes */}
          {activeTab === "pendentes" && (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab("home")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'pt' ? 'Voltar' : 'Back'}
              </Button>

              {!pendentes || pendentes.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                    <p className="text-gray-500">
                      {language === 'pt' ? 'Sem pendentes ativos!' : 'No active pending items!'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendentes.map((pendente: any) => (
                    <Card key={pendente.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{pendente.titulo}</h4>
                            {pendente.descricao && (
                              <p className="text-sm text-gray-500 mt-1">{pendente.descricao}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {new Date(pendente.criadoEm).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB')}
                            </div>
                          </div>
                          <Badge variant={pendente.prioridade === 'urgente' ? 'destructive' : 'secondary'}>
                            {pendente.prioridade}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Reunião */}
          {activeTab === "reuniao" && (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab("home")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === 'pt' ? 'Voltar' : 'Back'}
              </Button>

              {!reunioes || reunioes.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      {language === 'pt' ? 'Sem reuniões registadas' : 'No meetings recorded'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {reunioes.map((reuniao: any) => (
                    <Card key={reuniao.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-emerald-600" />
                              <span className="font-medium">
                                {new Date(reuniao.dataReuniao).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB')}
                              </span>
                              <Badge variant={reuniao.estado === 'concluida' ? 'default' : 'secondary'}>
                                {reuniao.estado}
                              </Badge>
                            </div>
                            {reuniao.resumo && (
                              <p className="text-sm text-gray-500">{reuniao.resumo}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
