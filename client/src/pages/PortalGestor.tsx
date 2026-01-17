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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Loader2,
  ListTodo,
  Download,
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
  const { data: dashboardData, refetch: refetchDashboard, isLoading: dashboardLoading } = trpc.lojas.dashboardCompletoGestor.useQuery(
    { 
      lojaId: lojaAtualId!,
      meses: mesesSelecionadosDashboard 
    },
    { enabled: !!lojaAtualId && activeTab === 'resultados' && mesesSelecionadosDashboard.length > 0 }
  );

  // Mutation para Análise IA
  const analiseIAMutation = trpc.lojas.analiseIAGestor.useMutation({
    onSuccess: (data) => {
      setAnaliseIA(data);
    },
    onError: (error) => {
      console.error('Erro ao gerar análise IA:', error);
      toast.error(language === 'pt' ? 'Erro ao gerar análise' : 'Error generating analysis');
    },
  });

  // Selecionar primeira loja automaticamente
  useEffect(() => {
    if (gestorData?.lojas && gestorData.lojas.length > 0 && !lojaAtualId) {
      // Ordenar lojas alfabeticamente e selecionar a primeira
      const lojasOrdenadas = [...gestorData.lojas].sort((a, b) => a.nome.localeCompare(b.nome));
      setLojaAtualId(lojasOrdenadas[0].id);
    }
  }, [gestorData, lojaAtualId]);

  // Limpar análise IA quando mudar de loja
  useEffect(() => {
    setAnaliseIA(null);
  }, [lojaAtualId]);

  // Recarregar dados quando mudar de loja
  const handleLojaChange = (lojaId: string) => {
    const novaLojaId = parseInt(lojaId);
    setLojaAtualId(novaLojaId);
    setActiveTab("home");
    setAnaliseIA(null);
    toast.success(language === 'pt' ? 'Loja alterada!' : 'Store changed!');
  };

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!dashboardRef.current) {
      toast.error(language === 'pt' ? 'Não há conteúdo para exportar' : 'No content to export');
      return;
    }
    
    setExportandoPDF(true);
    try {
      // Aguardar um pouco para garantir que os gráficos estão renderizados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Se o conteúdo for maior que uma página, dividir em múltiplas páginas
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const nomeLoja = lojaAtual?.nome || 'loja';
      pdf.save(`resultados-${nomeLoja.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      
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

              {dashboardLoading ? (
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

                  {/* Alertas */}
                  {dashboardData.alertas && dashboardData.alertas.length > 0 && (
                    <div className="space-y-2">
                      {dashboardData.alertas.map((alerta: {tipo: string; mensagem: string}, idx: number) => (
                        <Card key={idx} className={`border-l-4 ${
                          alerta.tipo === 'danger' ? 'border-l-red-500 bg-red-50' :
                          alerta.tipo === 'warning' ? 'border-l-amber-500 bg-amber-50' :
                          'border-l-green-500 bg-green-50'
                        }`}>
                          <CardContent className="py-3 flex items-center gap-3">
                            {alerta.tipo === 'danger' ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : alerta.tipo === 'warning' ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <Award className="h-5 w-5 text-green-500" />
                            )}
                            <span className={`text-sm font-medium ${
                              alerta.tipo === 'danger' ? 'text-red-700' :
                              alerta.tipo === 'warning' ? 'text-amber-700' :
                              'text-green-700'
                            }`}>
                              {alerta.mensagem}
                            </span>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Vendas Complementares com Gráfico */}
                  {dashboardData.complementares && (() => {
                    const complementaresLabels = ['Escovas', 'Polimento', 'Tratamento', 'Outros'];
                    const complementaresData = [
                      Number(dashboardData.complementares.escovasQtd) || 0,
                      Number(dashboardData.complementares.polimentoQtd) || 0,
                      Number(dashboardData.complementares.tratamentoQtd) || 0,
                      Number(dashboardData.complementares.outrosQtd) || 0,
                    ];
                    const totalComplementares = complementaresData.reduce((a, b) => a + b, 0);
                    const complementaresColors = [
                      'rgba(59, 130, 246, 0.8)',   // Azul - Escovas
                      'rgba(168, 85, 247, 0.8)',   // Roxo - Polimento
                      'rgba(34, 197, 94, 0.8)',    // Verde - Tratamento
                      'rgba(156, 163, 175, 0.8)',  // Cinza - Outros
                    ];
                    const complementaresBorders = [
                      'rgb(59, 130, 246)',
                      'rgb(168, 85, 247)',
                      'rgb(34, 197, 94)',
                      'rgb(156, 163, 175)',
                    ];

                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            {language === 'pt' ? 'Vendas Complementares' : 'Complementary Sales'}
                          </CardTitle>
                          <CardDescription>
                            {language === 'pt' 
                              ? `Total: ${totalComplementares} vendas complementares`
                              : `Total: ${totalComplementares} complementary sales`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Gráfico de Barras Horizontal */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gráfico de Barras */}
                            <div style={{ height: '250px' }}>
                              <Bar
                                data={{
                                  labels: complementaresLabels,
                                  datasets: [
                                    {
                                      label: language === 'pt' ? 'Quantidade' : 'Quantity',
                                      data: complementaresData,
                                      backgroundColor: complementaresColors,
                                      borderColor: complementaresBorders,
                                      borderWidth: 1,
                                    },
                                  ],
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  indexAxis: 'y',
                                  plugins: {
                                    legend: {
                                      display: false,
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: (context) => {
                                          const value = context.parsed.x ?? 0;
                                          const percent = totalComplementares > 0 ? ((value / totalComplementares) * 100).toFixed(1) : '0';
                                          return `${value} (${percent}%)`;
                                        },
                                      },
                                    },
                                  },
                                  scales: {
                                    x: {
                                      beginAtZero: true,
                                      ticks: {
                                        stepSize: 1,
                                      },
                                    },
                                  },
                                }}
                              />
                            </div>

                            {/* Gráfico Doughnut */}
                            <div style={{ height: '250px' }} className="flex items-center justify-center">
                              <Doughnut
                                data={{
                                  labels: complementaresLabels,
                                  datasets: [
                                    {
                                      data: complementaresData,
                                      backgroundColor: complementaresColors,
                                      borderColor: complementaresBorders,
                                      borderWidth: 2,
                                    },
                                  ],
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'right',
                                      labels: {
                                        boxWidth: 12,
                                        padding: 8,
                                      },
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: (context) => {
                                          const value = context.parsed ?? 0;
                                          const percent = totalComplementares > 0 ? ((value / totalComplementares) * 100).toFixed(1) : '0';
                                          return `${context.label}: ${value} (${percent}%)`;
                                        },
                                      },
                                    },
                                  },
                                }}
                              />
                            </div>
                          </div>

                          {/* Escovas com barra de progresso e objetivo */}
                          <div className="border-t pt-4">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                Escovas
                              </span>
                              <span className="text-sm font-medium">
                                {dashboardData.complementares.escovasQtd || 0} 
                                <span className={`ml-2 ${
                                  parseFloat(String(dashboardData.complementares.escovasPercent || 0)) >= 0.10 
                                    ? 'text-green-600' 
                                    : parseFloat(String(dashboardData.complementares.escovasPercent || 0)) >= 0.075
                                      ? 'text-amber-600'
                                      : 'text-red-600'
                                }`}>
                                  ({dashboardData.complementares.escovasPercent !== null 
                                    ? `${(parseFloat(String(dashboardData.complementares.escovasPercent)) * 100).toFixed(1)}%`
                                    : '0%'})
                                </span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 relative">
                              <div 
                                className={`h-4 rounded-full transition-all ${
                                  parseFloat(String(dashboardData.complementares.escovasPercent || 0)) >= 0.10 
                                    ? 'bg-green-500' 
                                    : parseFloat(String(dashboardData.complementares.escovasPercent || 0)) >= 0.075
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(parseFloat(String(dashboardData.complementares.escovasPercent || 0)) * 1000, 100)}%` }}
                              />
                              {/* Marcador de objetivo 10% */}
                              <div 
                                className="absolute top-0 h-4 w-0.5 bg-gray-800"
                                style={{ left: '100%' }}
                                title="Objetivo: 10%"
                              />
                              {/* Marcador de mínimo 7.5% */}
                              <div 
                                className="absolute top-0 h-4 w-0.5 bg-amber-600"
                                style={{ left: '75%' }}
                                title="Mínimo: 7.5%"
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <p className="text-xs text-muted-foreground">
                                {language === 'pt' ? 'Objetivo: 10% | Mínimo: 7.5%' : 'Goal: 10% | Minimum: 7.5%'}
                              </p>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-amber-600" />
                                  {language === 'pt' ? 'Mínimo' : 'Minimum'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-gray-800" />
                                  {language === 'pt' ? 'Objetivo' : 'Goal'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Comparativo com Mês Anterior */}
                  {dashboardData.comparativoMesAnterior && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          {language === 'pt' ? 'Comparativo com Mês Anterior' : 'Comparison with Previous Month'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Serviços */}
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">{language === 'pt' ? 'Serviços' : 'Services'}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold">
                                {dashboardData.kpis?.servicosRealizados || 0}
                              </span>
                              {dashboardData.comparativoMesAnterior.variacaoServicos !== null && (
                                <span className={`text-sm flex items-center gap-1 ${
                                  dashboardData.comparativoMesAnterior.variacaoServicos >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {dashboardData.comparativoMesAnterior.variacaoServicos >= 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4" />
                                  )}
                                  {dashboardData.comparativoMesAnterior.variacaoServicos >= 0 ? '+' : ''}
                                  {dashboardData.comparativoMesAnterior.variacaoServicos.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'pt' ? 'Anterior: ' : 'Previous: '}
                              {Number(dashboardData.comparativoMesAnterior.servicosAnterior || 0)}
                            </p>
                          </div>
                          
                          {/* Reparações */}
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">{language === 'pt' ? 'Reparações' : 'Repairs'}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold">
                                {dashboardData.resultados?.totalReparacoes || 0}
                              </span>
                              {dashboardData.comparativoMesAnterior.variacaoReparacoes !== null && (
                                <span className={`text-sm flex items-center gap-1 ${
                                  dashboardData.comparativoMesAnterior.variacaoReparacoes >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {dashboardData.comparativoMesAnterior.variacaoReparacoes >= 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4" />
                                  )}
                                  {dashboardData.comparativoMesAnterior.variacaoReparacoes >= 0 ? '+' : ''}
                                  {dashboardData.comparativoMesAnterior.variacaoReparacoes.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'pt' ? 'Anterior: ' : 'Previous: '}
                              {Number(dashboardData.comparativoMesAnterior.reparacoesAnterior || 0)}
                            </p>
                          </div>
                          
                          {/* Escovas */}
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Escovas</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold">
                                {Number(dashboardData.complementares?.escovasQtd || 0)}
                              </span>
                              {dashboardData.comparativoMesAnterior.variacaoEscovas !== null && (
                                <span className={`text-sm flex items-center gap-1 ${
                                  dashboardData.comparativoMesAnterior.variacaoEscovas >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {dashboardData.comparativoMesAnterior.variacaoEscovas >= 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4" />
                                  )}
                                  {dashboardData.comparativoMesAnterior.variacaoEscovas >= 0 ? '+' : ''}
                                  {dashboardData.comparativoMesAnterior.variacaoEscovas.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'pt' ? 'Anterior: ' : 'Previous: '}
                              {Number(dashboardData.comparativoMesAnterior.escovasAnterior || 0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Gráfico de Evolução Mensal */}
                  {dashboardData.evolucao && dashboardData.evolucao.length > 0 && (() => {
                    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const evolucaoData = dashboardData.evolucao.slice(-12);
                    const labels = evolucaoData.map((e: any) => `${mesesNomes[e.mes - 1]} ${String(e.ano).slice(-2)}`);
                    const servicos = evolucaoData.map((e: any) => Number(e.totalServicos) || 0);
                    const objetivos = evolucaoData.map((e: any) => Number(e.objetivoMensal) || 0);
                    const desvios = evolucaoData.map((e: any) => parseFloat(String(e.desvioPercentualMes || 0)) * 100);
                    const taxasReparacao = evolucaoData.map((e: any) => parseFloat(String(e.taxaReparacao || 0)) * 100);
                    
                    return (
                      <>
                        {/* Gráfico de Linha - Serviços vs Objetivos */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              {language === 'pt' ? 'Evolução de Serviços vs Objetivo' : 'Services Evolution vs Goal'}
                            </CardTitle>
                            <CardDescription>
                              {language === 'pt' 
                                ? 'Comparação entre serviços realizados e objetivo mensal'
                                : 'Comparison between services performed and monthly goal'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div style={{ height: '300px' }}>
                              <Line
                                data={{
                                  labels,
                                  datasets: [
                                    {
                                      label: language === 'pt' ? 'Serviços Realizados' : 'Services Performed',
                                      data: servicos,
                                      borderColor: 'rgb(59, 130, 246)',
                                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                      fill: true,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6,
                                    },
                                    {
                                      label: language === 'pt' ? 'Objetivo Mensal' : 'Monthly Goal',
                                      data: objetivos,
                                      borderColor: 'rgb(34, 197, 94)',
                                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                      borderDash: [5, 5],
                                      fill: false,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6,
                                    },
                                  ],
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: (context) => {
                                          return `${context.dataset.label}: ${(context.parsed.y ?? 0).toLocaleString()}`;
                                        },
                                      },
                                    },
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      ticks: {
                                        callback: (value) => value.toLocaleString(),
                                      },
                                    },
                                  },
                                }}
                              />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Gráfico de Barras - Desvio Percentual */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <BarChart3 className="h-5 w-5" />
                              {language === 'pt' ? 'Desvio vs Objetivo (%)' : 'Deviation vs Goal (%)'}
                            </CardTitle>
                            <CardDescription>
                              {language === 'pt' 
                                ? 'Percentagem acima ou abaixo do objetivo mensal'
                                : 'Percentage above or below monthly goal'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div style={{ height: '250px' }}>
                              <Bar
                                data={{
                                  labels,
                                  datasets: [
                                    {
                                      label: language === 'pt' ? 'Desvio %' : 'Deviation %',
                                      data: desvios,
                                      backgroundColor: desvios.map((d: number) =>
                                        d >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                                      ),
                                      borderColor: desvios.map((d: number) =>
                                        d >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                                      ),
                                      borderWidth: 1,
                                    },
                                  ],
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      display: false,
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: (context) => {
                                          const value = context.parsed.y ?? 0;
                                          return `${language === 'pt' ? 'Desvio' : 'Deviation'}: ${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                                        },
                                      },
                                    },
                                  },
                                  scales: {
                                    y: {
                                      ticks: {
                                        callback: (value) => `${value ?? 0}%`,
                                      },
                                    },
                                  },
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              {language === 'pt' 
                                ? 'Verde = Acima do objetivo | Vermelho = Abaixo do objetivo'
                                : 'Green = Above goal | Red = Below goal'}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Gráfico de Linha - Taxa de Reparação */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Award className="h-5 w-5" />
                              {language === 'pt' ? 'Evolução da Taxa de Reparação' : 'Repair Rate Evolution'}
                            </CardTitle>
                            <CardDescription>
                              {language === 'pt' 
                                ? 'Objetivo mínimo: 22%'
                                : 'Minimum goal: 22%'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div style={{ height: '250px' }}>
                              <Line
                                data={{
                                  labels,
                                  datasets: [
                                    {
                                      label: language === 'pt' ? 'Taxa de Reparação' : 'Repair Rate',
                                      data: taxasReparacao,
                                      borderColor: 'rgb(168, 85, 247)',
                                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                      fill: true,
                                      tension: 0.3,
                                      pointRadius: 4,
                                      pointHoverRadius: 6,
                                    },
                                    {
                                      label: language === 'pt' ? 'Objetivo 22%' : 'Goal 22%',
                                      data: Array(labels.length).fill(22),
                                      borderColor: 'rgb(239, 68, 68)',
                                      borderDash: [5, 5],
                                      fill: false,
                                      pointRadius: 0,
                                    },
                                  ],
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: (context) => {
                                          return `${context.dataset.label}: ${(context.parsed.y ?? 0).toFixed(1)}%`;
                                        },
                                      },
                                    },
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      max: 40,
                                      ticks: {
                                        callback: (value) => `${value}%`,
                                      },
                                    },
                                  },
                                }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}

                  {/* Secção de Análise IA */}
                  <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
                        <Brain className="h-5 w-5" />
                        {language === 'pt' ? 'Análise IA dos Resultados' : 'AI Results Analysis'}
                      </CardTitle>
                      <CardDescription>
                        {language === 'pt' 
                          ? 'Análise inteligente com recomendações personalizadas para a loja'
                          : 'Smart analysis with personalized recommendations for the store'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!analiseIA ? (
                        <div className="text-center py-6">
                          <Sparkles className="h-12 w-12 mx-auto text-purple-400 mb-4" />
                          <p className="text-muted-foreground mb-4">
                            {language === 'pt' 
                              ? 'Clique para gerar uma análise inteligente dos resultados'
                              : 'Click to generate an intelligent analysis of the results'}
                          </p>
                          <Button
                            onClick={() => {
                              if (lojaAtualId) {
                                analiseIAMutation.mutate({
                                  lojaId: lojaAtualId,
                                  meses: mesesSelecionadosDashboard.map((m: MesSelecionado) => ({ mes: m.mes, ano: m.ano }))
                                });
                              }
                            }}
                            disabled={analiseIAMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {analiseIAMutation.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {language === 'pt' ? 'A gerar...' : 'Generating...'}</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-2" /> {language === 'pt' ? 'Gerar Análise IA' : 'Generate AI Analysis'}</>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Foco Urgente */}
                          {analiseIA.focoUrgente && analiseIA.focoUrgente.length > 0 && (
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-800 flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4" />
                                {language === 'pt' ? 'Foco Urgente' : 'Urgent Focus'}
                              </h4>
                              <ul className="space-y-1">
                                {analiseIA.focoUrgente.map((u: string, i: number) => (
                                  <li key={i} className="text-red-700 text-sm flex items-start gap-2">
                                    <span className="text-red-500 mt-1">•</span>
                                    {u}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Pontos Positivos */}
                          {analiseIA.pontosPositivos && analiseIA.pontosPositivos.length > 0 && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-2">
                                <ThumbsUp className="h-4 w-4" />
                                {language === 'pt' ? 'Pontos Positivos' : 'Strengths'}
                              </h4>
                              <ul className="space-y-1">
                                {analiseIA.pontosPositivos.map((p: string, i: number) => (
                                  <li key={i} className="text-green-700 text-sm flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Resumo */}
                          {analiseIA.resumo && (
                            <div className="p-5 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-3">
                                <Rocket className="h-5 w-5" />
                                {language === 'pt' ? 'Resumo' : 'Summary'}
                              </h4>
                              <p className="text-purple-700 text-base italic leading-relaxed">
                                "{analiseIA.resumo}"
                              </p>
                            </div>
                          )}

                          {/* Botão para regenerar */}
                          <div className="text-center pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (lojaAtualId) {
                                  analiseIAMutation.mutate({
                                    lojaId: lojaAtualId,
                                    meses: mesesSelecionadosDashboard.map((m: MesSelecionado) => ({ mes: m.mes, ano: m.ano }))
                                  });
                                }
                              }}
                              disabled={analiseIAMutation.isPending}
                              className="text-purple-600 border-purple-300 hover:bg-purple-50"
                            >
                              {analiseIAMutation.isPending ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {language === 'pt' ? 'A atualizar...' : 'Updating...'}</>
                              ) : (
                                <><RefreshCw className="h-4 w-4 mr-2" /> {language === 'pt' ? 'Atualizar Análise' : 'Update Analysis'}</>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
