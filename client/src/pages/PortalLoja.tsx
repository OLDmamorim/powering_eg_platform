import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";

interface LojaAuth {
  lojaId: number;
  lojaNome: string;
  lojaEmail: string | null;
  lojasRelacionadas?: Array<{ id: number; nome: string }>;
}

export default function PortalLoja() {
  const { language, setLanguage, t } = useLanguage();
  const [token, setToken] = useState<string>("");
  const [inputToken, setInputToken] = useState<string>("");
  const [lojaAuth, setLojaAuth] = useState<LojaAuth | null>(null);
  const [lojaAtualId, setLojaAtualId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "reuniao" | "pendentes" | "historico" | "tarefas" | "resultados">("home");
  const [filtroTarefas, setFiltroTarefas] = useState<"todas" | "recebidas" | "enviadas" | "internas">("todas");
  // Estado para o filtro de meses do dashboard
  const [mesesSelecionadosDashboard, setMesesSelecionadosDashboard] = useState<MesSelecionado[]>(() => {
    // Por defeito, selecionar o mês atual
    const hoje = new Date();
    return [{ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }];
  });
  const [responderTodoOpen, setResponderTodoOpen] = useState(false);
  const [respostaTodo, setRespostaTodo] = useState("");
  const [observacaoTodoOpen, setObservacaoTodoOpen] = useState(false);
  const [observacaoTodo, setObservacaoTodo] = useState("");
  const [todoComentario, setTodoComentario] = useState<string>("");
  const [todoSelecionado, setTodoSelecionado] = useState<number | null>(null);
  const [devolverTodoOpen, setDevolverTodoOpen] = useState(false);
  const [novaReuniaoOpen, setNovaReuniaoOpen] = useState(false);
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState("");
  const [novaTarefaDescricao, setNovaTarefaDescricao] = useState("");
  const [novaTarefaPrioridade, setNovaTarefaPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [novaTarefaCategoriaId, setNovaTarefaCategoriaId] = useState<number | undefined>(undefined);
  const [novaTarefaInterna, setNovaTarefaInterna] = useState(false);
  const [novaTarefaDataLimite, setNovaTarefaDataLimite] = useState<string>("");
  const [novaTarefaAnexos, setNovaTarefaAnexos] = useState<Array<{url: string; nome: string; tipo: string}>>([]);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [editarInternaOpen, setEditarInternaOpen] = useState(false);
  const [tarefaInternaEditando, setTarefaInternaEditando] = useState<any>(null);
  const [editarEnviadaOpen, setEditarEnviadaOpen] = useState(false);
  const [tarefaEnviadaEditando, setTarefaEnviadaEditando] = useState<any>(null);
  const [editarEnviadaTitulo, setEditarEnviadaTitulo] = useState("");
  const [editarEnviadaDescricao, setEditarEnviadaDescricao] = useState("");
  const [editarEnviadaPrioridade, setEditarEnviadaPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
  const [participantes, setParticipantes] = useState<string[]>([""]);
  const [reuniaoAtual, setReuniaoAtual] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [analiseIA, setAnaliseIA] = useState<any>(null);
  const [gerandoAnaliseIA, setGerandoAnaliseIA] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // PWA: Capturar evento de instalação
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar banner se ainda não instalou
      const installed = localStorage.getItem('pwa_installed');
      if (!installed) {
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Registar service worker específico do Portal da Loja
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-portal-loja.js').catch(console.error);
    }
    
    // Adicionar manifest específico do Portal da Loja
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.setAttribute('href', '/manifest-portal-loja.json');
    } else {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest-portal-loja.json';
      document.head.appendChild(manifestLink);
    }
    
    // Atualizar Apple Touch Icon
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) {
      appleIcon.setAttribute('href', '/portal-loja-apple-touch-icon.png');
    }
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      // Mostrar instruções manuais
      toast.info('Para instalar: Menu do browser > "Adicionar ao Ecrã Inicial"');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      toast.success('App instalada com sucesso!');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Atualizar meta tags para Portal da Loja
  useEffect(() => {
    // Atualizar title
    document.title = lojaAuth ? `${lojaAuth.lojaNome} - PoweringEG` : 'Portal da Loja - PoweringEG';
    
    // Atualizar meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', lojaAuth 
        ? `Portal de gestão da loja ${lojaAuth.lojaNome} - Reuniões, Tarefas e Resultados ExpressGlass`
        : 'Portal da Loja ExpressGlass - Acesso exclusivo para lojas da rede'
      );
    }
    
    // Atualizar og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', lojaAuth ? `${lojaAuth.lojaNome} - PoweringEG` : 'Portal da Loja - PoweringEG');
    }
    
    // Atualizar og:description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', 'Portal exclusivo para lojas ExpressGlass - Reuniões quinzenais, tarefas e resultados');
    }
  }, [lojaAuth]);

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
  // Usar lojaAtualId para queries quando disponível
  const lojaIdAtiva = lojaAtualId || lojaAuth?.lojaId;
  
  const { data: dadosLoja, refetch: refetchDados } = trpc.reunioesQuinzenais.getDadosLoja.useQuery(
    { token, lojaId: lojaIdAtiva },
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

  // Contar tarefas NÃO VISTAS (para alerta/badge pulsante)
  const { data: todosNaoVistos, refetch: refetchTodosNaoVistos } = trpc.todosPortalLoja.contarNaoVistos.useQuery(
    { token },
    { 
      enabled: !!token && !!lojaAuth,
      refetchInterval: 30000, // Atualizar a cada 30 segundos
    }
  );

  // Histórico de tarefas enviadas ao gestor
  const { data: historicoTarefas, refetch: refetchHistoricoTarefas } = trpc.todosPortalLoja.historicoEnviadas.useQuery(
    { token },
    { enabled: !!token && !!lojaAuth }
  );

  // Tarefas internas da loja
  const { data: tarefasInternas, refetch: refetchTarefasInternas } = trpc.todosPortalLoja.listarInternas.useQuery(
    { token, apenasAtivas: true },
    { enabled: !!token && !!lojaAuth }
  );

  // Dashboard de Resultados
  const { data: dashboardData, isLoading: dashboardLoading } = trpc.todosPortalLoja.dashboardCompleto.useQuery(
    { token, meses: mesesSelecionadosDashboard, lojaId: lojaIdAtiva },
    { enabled: !!token && !!lojaAuth && activeTab === 'resultados' && mesesSelecionadosDashboard.length > 0 }
  );

  // Mutation para Análise IA
  const analiseIAMutation = trpc.analiseIALoja.gerar.useMutation({
    onSuccess: (data) => {
      setAnaliseIA(data);
    },
    onError: (error) => {
      console.error('Erro ao gerar análise IA:', error);
      toast.error(language === 'pt' ? 'Erro ao gerar análise' : 'Error generating analysis');
    },
  });

  // Mutations
  const criarReuniaoMutation = trpc.reunioesQuinzenais.criarReuniao.useMutation({
    onSuccess: (data) => {
      toast.success(language === 'pt' ? "Reunião criada com sucesso!" : "Meeting created successfully!");
      setNovaReuniaoOpen(false);
      setReuniaoAtual(data?.id || null);
      refetchReunioes();
      setParticipantes([""]);
    },
    onError: (error) => toast.error(error.message),
  });

  const atualizarReuniaoMutation = trpc.reunioesQuinzenais.atualizarReuniao.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Reunião guardada!" : "Meeting saved!");
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
      toast.success(language === 'pt' ? "Pendente atualizado!" : "Pending item updated!");
      refetchPendentes();
    },
    onError: (error) => toast.error(error.message),
  });

  // To-Do Mutations
  const atualizarEstadoTodoMutation = trpc.todosPortalLoja.atualizarEstado.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Estado atualizado!" : "Status updated!");
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const concluirTodoMutation = trpc.todosPortalLoja.concluir.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa concluída!" : "Task completed!");
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const devolverTodoMutation = trpc.todosPortalLoja.devolver.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa devolvida ao gestor!" : "Task returned to manager!");
      setDevolverTodoOpen(false);
      setTodoComentario("");
      setTodoSelecionado(null);
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  const responderTodoMutation = trpc.todosPortalLoja.responder.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Resposta enviada ao gestor!" : "Response sent to manager!");
      setResponderTodoOpen(false);
      setRespostaTodo("");
      setTodoSelecionado(null);
      refetchHistoricoTarefas();
    },
    onError: (error) => toast.error(error.message),
  });

  const adicionarObservacaoMutation = trpc.todosPortalLoja.adicionarObservacao.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Observação enviada ao gestor!" : "Observation sent to manager!");
      setObservacaoTodoOpen(false);
      setObservacaoTodo("");
      setTodoSelecionado(null);
      refetchTodos();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutation para marcar tarefas como vistas
  const marcarVistosLojaMutation = trpc.todosPortalLoja.marcarMultiplosVistos.useMutation({
    onSuccess: () => {
      refetchTodosNaoVistos();
    },
  });

  // Mutation para upload de anexos
  const uploadAnexoMutation = trpc.uploadAnexoPortalLoja.useMutation();
  
  const criarTarefaMutation = trpc.todosPortalLoja.criar.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa criada e enviada ao gestor!" : "Task created and sent to manager!");
      setNovaTarefaOpen(false);
      setNovaTarefaTitulo("");
      setNovaTarefaDescricao("");
      setNovaTarefaPrioridade("media");
      setNovaTarefaCategoriaId(undefined);
      setNovaTarefaInterna(false);
      setNovaTarefaDataLimite("");
      setNovaTarefaAnexos([]);
      refetchTodos();
      refetchHistoricoTarefas();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations para tarefas internas
  const criarTarefaInternaMutation = trpc.todosPortalLoja.criarInterna.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa interna criada!" : "Internal task created!");
      setNovaTarefaOpen(false);
      setNovaTarefaTitulo("");
      setNovaTarefaDescricao("");
      setNovaTarefaPrioridade("media");
      setNovaTarefaCategoriaId(undefined);
      setNovaTarefaInterna(false);
      setNovaTarefaDataLimite("");
      setNovaTarefaAnexos([]);
      refetchTarefasInternas();
    },
    onError: (error) => toast.error(error.message),
  });

  const atualizarTarefaInternaMutation = trpc.todosPortalLoja.atualizarInterna.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa atualizada!" : "Task updated!");
      setEditarInternaOpen(false);
      setTarefaInternaEditando(null);
      refetchTarefasInternas();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminarTarefaInternaMutation = trpc.todosPortalLoja.eliminarInterna.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa eliminada!" : "Task deleted!");
      refetchTarefasInternas();
    },
    onError: (error) => toast.error(error.message),
  });

  const editarEnviadaMutation = trpc.todosPortalLoja.editarEnviada.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Tarefa atualizada!" : "Task updated!");
      setEditarEnviadaOpen(false);
      setTarefaEnviadaEditando(null);
      refetchHistoricoTarefas();
    },
    onError: (error) => toast.error(error.message),
  });

  // Query de categorias (via token público)
  const { data: categorias } = trpc.todoCategories.listarPublico.useQuery(
    { token, apenasAtivas: true },
    { enabled: !!token && !!lojaAuth }
  );

  const handleLogin = () => {
    if (!inputToken.trim()) {
      toast.error(language === 'pt' ? "Introduza o token de acesso" : "Enter access token");
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
      toast.error(language === 'pt' ? "Adicione pelo menos um participante" : "Add at least one participant");
      return;
    }
    criarReuniaoMutation.mutate({
      token,
      dataReuniao: new Date().toISOString(),
      participantes: participantesValidos,
    });
  };

  // Função para exportar o dashboard para PDF
  const handleExportarPDF = useCallback(async () => {
    if (!dashboardRef.current || !dashboardData) {
      toast.error(language === 'pt' ? 'Sem dados para exportar' : 'No data to export');
      return;
    }

    setExportandoPDF(true);
    toast.info(language === 'pt' ? 'A gerar PDF...' : 'Generating PDF...');

    try {
      // Aguardar um momento para os gráficos renderizarem completamente
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = dashboardRef.current;
      
      // Configurações para captura de alta qualidade
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Adicionar título
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`${language === 'pt' ? 'Relatório de Resultados' : 'Results Report'} - ${lojaAuth?.lojaNome || ''}`, 10, 15);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${language === 'pt' ? 'Período' : 'Period'}: ${dashboardData.periodoLabel || ''}`, 10, 22);
      pdf.text(`${language === 'pt' ? 'Gerado em' : 'Generated on'}: ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 10, 28);

      // Adicionar imagem do dashboard
      position = 35;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - position);

      // Adicionar páginas adicionais se necessário
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Adicionar rodapé em todas as páginas
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `PoweringEG Platform - ${language === 'pt' ? 'Página' : 'Page'} ${i} ${language === 'pt' ? 'de' : 'of'} ${pageCount}`,
          105,
          292,
          { align: 'center' }
        );
      }

      // Gerar nome do ficheiro
      const dataAtual = new Date().toISOString().split('T')[0];
      const nomeArquivo = `resultados_${lojaAuth?.lojaNome?.replace(/\s+/g, '_').toLowerCase() || 'loja'}_${dataAtual}.pdf`;
      
      pdf.save(nomeArquivo);
      toast.success(language === 'pt' ? 'PDF exportado com sucesso!' : 'PDF exported successfully!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error(language === 'pt' ? 'Erro ao gerar PDF' : 'Error generating PDF');
    } finally {
      setExportandoPDF(false);
    }
  }, [dashboardData, lojaAuth, language]);

  // Tela de login
  if (!lojaAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('portal.title')}</CardTitle>
            <CardDescription>
              {language === 'pt' ? 'Aceda ao sistema de reuniões quinzenais' : 'Access the bi-weekly meeting system'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Token de Acesso</label>
              <Input
                type="text"
                placeholder={language === 'pt' ? "Introduza o token enviado por email" : "Enter the token sent by email"}
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
      {/* Header Simplificado */}
      <header className="bg-emerald-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          {/* Linha superior: Ícone da loja + Botões de idioma e logout */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm text-emerald-100 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {dadosLoja?.gestorNome || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Seletor de Idioma */}
              <Select value={language} onValueChange={(value) => setLanguage(value as 'pt' | 'en')}>
                <SelectTrigger className="w-16 h-7 bg-white/20 border-white/30 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">PT</SelectItem>
                  <SelectItem value="en">EN</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20 h-7 w-7 p-0">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Linha inferior: Seletor de loja (ocupa toda a largura) */}
          <div className="w-full">
            {lojaAuth.lojasRelacionadas && lojaAuth.lojasRelacionadas.length > 0 ? (
              <Select 
                value={String(lojaAtualId || lojaAuth.lojaId)} 
                onValueChange={(value) => {
                  const novaLojaId = parseInt(value);
                  setLojaAtualId(novaLojaId);
                  // Recarregar dados com o novo lojaId
                  refetchDados();
                  refetchPendentes();
                  refetchReunioes();
                  refetchTodos();
                  toast.success(language === 'pt' ? 'Loja alterada!' : 'Store changed!');
                }}
              >
                <SelectTrigger className="w-full h-auto px-4 py-2 border-2 border-emerald-200 bg-white text-emerald-800 text-base font-semibold hover:bg-emerald-50 rounded-lg flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-2 truncate">
                    <Store className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="truncate">
                      {(() => {
                        const currentId = lojaAtualId || lojaAuth.lojaId;
                        if (currentId === lojaAuth.lojaId) {
                          return lojaAuth.lojaNome;
                        }
                        const lojaRelacionada = lojaAuth.lojasRelacionadas?.find(l => l.id === currentId);
                        return lojaRelacionada?.nome || lojaAuth.lojaNome;
                      })()}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(lojaAuth.lojaId)}>
                    <span className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      {lojaAuth.lojaNome}
                      <Badge variant="outline" className="text-xs">Principal</Badge>
                    </span>
                  </SelectItem>
                  {lojaAuth.lojasRelacionadas.map(loja => (
                    <SelectItem key={loja.id} value={String(loja.id)}>
                      <span className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {loja.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <h1 className="text-xl font-bold">{lojaAuth.lojaNome}</h1>
            )}
          </div>
        </div>
      </header>

      {/* Banner de Instalação PWA */}
      {showInstallBanner && (
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6" />
            <div>
              <p className="font-semibold text-sm">{language === 'pt' ? 'Instalar App' : 'Install App'}</p>
              <p className="text-xs opacity-90">{language === 'pt' ? 'Acesso rápido no ecrã inicial' : 'Quick access from home screen'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleInstallPWA}
              className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
            >
              {language === 'pt' ? 'Instalar' : 'Install'}
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setShowInstallBanner(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-6">
        {/* Página Inicial com Cards */}
        {activeTab === "home" && (
          <div className="grid grid-cols-2 gap-4">
            {/* Card Resultados */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0"
              onClick={() => setActiveTab("resultados")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <BarChart3 className="h-10 w-10 opacity-80" />
                  <TrendingUp className="h-6 w-6 opacity-60" />
                </div>
                <h3 className="text-xl font-bold mb-2">{language === 'pt' ? 'Resultados' : 'Results'}</h3>
                <p className="text-sm opacity-80">{language === 'pt' ? 'Ver KPIs, objetivos e performance' : 'View KPIs, goals and performance'}</p>
              </CardContent>
            </Card>

            {/* Card To-Do - Pisca quando há tarefas novas não lidas */}
            <Card 
              className={`cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 ${
                (todosNaoVistos || 0) > 0 ? 'animate-pulse ring-4 ring-purple-300 ring-opacity-75' : ''
              }`}
              onClick={() => {
                setActiveTab("tarefas");
                // Marcar tarefas como vistas quando clica no card
                if (todosList && todosList.length > 0) {
                  const idsNaoVistos = todosList.filter((t: any) => !t.visto).map((t: any) => t.id);
                  if (idsNaoVistos.length > 0) {
                    marcarVistosLojaMutation.mutate({ token, todoIds: idsNaoVistos });
                  }
                }
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <ListTodo className={`h-10 w-10 opacity-80 ${(todosNaoVistos || 0) > 0 ? 'animate-bounce' : ''}`} />
                  {((todosCount || 0) + (tarefasInternas?.length || 0)) > 0 && (
                    <Badge className={`text-lg px-3 border-0 ${
                      (todosNaoVistos || 0) > 0 
                        ? 'bg-yellow-400 text-purple-800 animate-bounce' 
                        : 'bg-white/20 text-white'
                    }`}>
                      {(todosNaoVistos || 0) > 0 
                        ? `${todosNaoVistos} ${language === 'pt' ? 'Nova' : 'New'}${todosNaoVistos !== 1 ? 's' : ''}!`
                        : (todosCount || 0) + (tarefasInternas?.length || 0)
                      }
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{t('tabs.tarefas')}</h3>
                <p className="text-sm opacity-80">
                  {(todosNaoVistos || 0) > 0 
                    ? (language === 'pt' ? 'Tem tarefas novas do gestor!' : 'You have new tasks from manager!')
                    : (language === 'pt' ? 'Gerir tarefas e comunicações' : 'Manage tasks and communications')
                  }
                </p>
              </CardContent>
            </Card>

            {/* Card Pendentes */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0"
              onClick={() => setActiveTab("pendentes")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="h-10 w-10 opacity-80" />
                  {pendentesAtivos.length > 0 && (
                    <Badge className="bg-white/20 text-white border-0 text-lg px-3">
                      {pendentesAtivos.length}
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{t('tabs.pendentes')}</h3>
                <p className="text-sm opacity-80">{language === 'pt' ? 'Pendentes atribuídos à loja' : 'Pending items assigned to store'}</p>
              </CardContent>
            </Card>

            {/* Card Reuniões */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0"
              onClick={() => setActiveTab("reuniao")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="h-10 w-10 opacity-80" />
                  {reuniaoRascunho && (
                    <Badge className="bg-white/20 text-white border-0">
                      {language === 'pt' ? 'Rascunho' : 'Draft'}
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{t('tabs.reuniao')}</h3>
                <p className="text-sm opacity-80">{language === 'pt' ? 'Registar reuniões quinzenais' : 'Record biweekly meetings'}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Botão Voltar - visível em todas as seções exceto home */}
        {activeTab !== "home" && (
          <Button
            variant="outline"
            onClick={() => setActiveTab("home")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Voltar' : 'Back'}
          </Button>
        )}

        {/* Tab Content */}
        {activeTab === "reuniao" && (
          <div className="space-y-4">
            {reuniaoRascunho || reuniaoAtual ? (
              <ReuniaoEditor
                key={`reuniao-editor-${reuniaoEmEdicao?.id || reuniaoRascunho?.id || reuniaoAtual || 'new'}`}
                token={token}
                reuniao={reuniaoEmEdicao || reuniaoRascunho}
                reuniaoAtualId={reuniaoAtual}
                pendentes={pendentes || []}
                onSave={(data) => {
                  atualizarReuniaoMutation.mutate({
                    token,
                    reuniaoId: reuniaoEmEdicao?.id || reuniaoRascunho?.id || 0,
                    ...data,
                  });
                }}
                onConcluir={async (data) => {
                  // Usar o reuniaoId passado pelo ReuniaoEditor, com fallbacks
                  const reuniaoId = data.reuniaoId || reuniaoEmEdicao?.id || reuniaoRascunho?.id || reuniaoAtual || 0;
                  
                  // Validar que temos um ID válido
                  if (!reuniaoId || reuniaoId === 0) {
                    toast.error('Erro: ID da reunião não encontrado. Por favor, recarregue a página.');
                    return;
                  }
                  
                  // Extrair os dados sem o reuniaoId para enviar ao servidor
                  const { reuniaoId: _, ...dadosReuniao } = data;
                  
                  // Primeiro guardar os dados
                  try {
                    await atualizarReuniaoMutation.mutateAsync({
                      token,
                      reuniaoId,
                      temasDiscutidos: dadosReuniao.temasDiscutidos || '',
                      decisoesTomadas: dadosReuniao.decisoesTomadas || '',
                      analiseResultados: dadosReuniao.analiseResultados || '',
                      planosAcao: dadosReuniao.planosAcao || '',
                      observacoes: dadosReuniao.observacoes || '',
                    });

                  } catch (error) {
                    console.error('[onConcluir] Erro ao guardar dados:', error);
                    toast.error('Erro ao guardar os dados da reunião');
                    return;
                  }
                  
                  // Depois concluir e enviar
                  concluirReuniaoMutation.mutate({
                    token,
                    reuniaoId,
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

        {/* Tab Tarefas Unificada */}
        {activeTab === "tarefas" && (
          <div className="space-y-4">
            {/* Botões de Criação lado a lado + Filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Botões de Criação */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setNovaTarefaInterna(false);
                    setNovaTarefaOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Nova para Gestor
                </Button>
                <Button
                  onClick={() => {
                    setNovaTarefaInterna(true);
                    setNovaTarefaOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Nova Interna
                </Button>
              </div>
              
              {/* Filtros */}
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                <Button
                  size="sm"
                  variant={filtroTarefas === "todas" ? "default" : "ghost"}
                  onClick={() => setFiltroTarefas("todas")}
                  className="text-xs"
                >
                  Todas
                </Button>
                <Button
                  size="sm"
                  variant={filtroTarefas === "recebidas" ? "default" : "ghost"}
                  onClick={() => setFiltroTarefas("recebidas")}
                  className="text-xs"
                >
                  Recebidas
                  {(todosCount || 0) > 0 && <Badge variant="secondary" className="ml-1 text-xs">{todosCount}</Badge>}
                </Button>
                <Button
                  size="sm"
                  variant={filtroTarefas === "enviadas" ? "default" : "ghost"}
                  onClick={() => setFiltroTarefas("enviadas")}
                  className="text-xs"
                >
                  Enviadas
                  {(historicoTarefas?.length || 0) > 0 && <Badge variant="secondary" className="ml-1 text-xs">{historicoTarefas?.length}</Badge>}
                </Button>
                <Button
                  size="sm"
                  variant={filtroTarefas === "internas" ? "default" : "ghost"}
                  onClick={() => setFiltroTarefas("internas")}
                  className="text-xs"
                >
                  Internas
                  {(tarefasInternas?.length || 0) > 0 && <Badge variant="secondary" className="ml-1 text-xs">{tarefasInternas?.length}</Badge>}
                </Button>
              </div>
            </div>
            
            {/* Lista de Tarefas Filtrada */}
            {(() => {
              // Combinar todas as tarefas com tipo
              const todasTarefas = [
                ...(todosList || []).map((t: any) => ({ ...t, tipo: 'recebida' as const })),
                ...(historicoTarefas || []).map((t: any) => ({ ...t, tipo: 'enviada' as const })),
                ...(tarefasInternas || []).map((t: any) => ({ ...t, tipo: 'interna' as const })),
              ];
              
              // Filtrar conforme seleção
              const tarefasFiltradas = todasTarefas.filter(t => {
                if (filtroTarefas === 'todas') return true;
                if (filtroTarefas === 'recebidas') return t.tipo === 'recebida';
                if (filtroTarefas === 'enviadas') return t.tipo === 'enviada';
                if (filtroTarefas === 'internas') return t.tipo === 'interna';
                return true;
              });
              
              // Ordenar por data (mais recentes primeiro)
              tarefasFiltradas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              
              if (tarefasFiltradas.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <ListTodo className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Sem tarefas</h3>
                      <p className="text-muted-foreground">
                        {filtroTarefas === 'todas' ? 'Não existem tarefas.' :
                         filtroTarefas === 'recebidas' ? 'Não existem tarefas recebidas do gestor.' :
                         filtroTarefas === 'enviadas' ? 'Não enviou nenhuma tarefa ao gestor.' :
                         'Não existem tarefas internas.'}
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              
              return tarefasFiltradas.map((todo: any) => (
                <Card 
                  key={`${todo.tipo}-${todo.id}`} 
                  className={`hover:shadow-md transition-shadow ${
                    todo.tipo === 'interna' ? 'border-l-4 border-l-purple-500' :
                    todo.tipo === 'enviada' ? 'border-l-4 border-l-emerald-500' :
                    'border-l-4 border-l-blue-500'
                  }`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {/* Ícone por tipo */}
                          {todo.tipo === 'interna' && <Store className="h-4 w-4 text-purple-500" />}
                          {todo.tipo === 'enviada' && <Send className="h-4 w-4 text-emerald-500" />}
                          {todo.tipo === 'recebida' && (
                            todo.estado === 'pendente' ? <Clock className="h-4 w-4 text-gray-500" /> :
                            todo.estado === 'em_progresso' ? <Clock className="h-4 w-4 text-blue-500" /> :
                            todo.estado === 'concluida' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                            <RotateCcw className="h-4 w-4 text-orange-500" />
                          )}
                          
                          <h3 className="font-semibold">{todo.titulo}</h3>
                          
                          {/* Badge de tipo */}
                          <Badge variant="outline" className={
                            todo.tipo === 'interna' ? 'bg-purple-50 text-purple-700' :
                            todo.tipo === 'enviada' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-blue-50 text-blue-700'
                          }>
                            {todo.tipo === 'interna' ? 'Interna' :
                             todo.tipo === 'enviada' ? 'Enviada' : 'Recebida'}
                          </Badge>
                          
                          {/* Badge de prioridade */}
                          <Badge className={
                            todo.prioridade === 'urgente' ? 'bg-red-100 text-red-800' :
                            todo.prioridade === 'alta' ? 'bg-orange-100 text-orange-800' :
                            todo.prioridade === 'media' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {todo.prioridade}
                          </Badge>
                          
                          {/* Badge de estado */}
                          <Badge variant="outline" className={
                            todo.estado === 'pendente' ? 'bg-gray-50' :
                            todo.estado === 'em_progresso' ? 'bg-blue-50 text-blue-700' :
                            todo.estado === 'concluida' ? 'bg-green-50 text-green-700' :
                            'bg-orange-50 text-orange-700'
                          }>
                            {todo.estado === 'pendente' ? 'Pendente' : 
                             todo.estado === 'em_progresso' ? 'Em Progresso' :
                             todo.estado === 'concluida' ? 'Concluída' : 'Devolvida'}
                          </Badge>
                          
                          {/* Badge vista pelo gestor (para enviadas) */}
                          {todo.tipo === 'enviada' && todo.visto && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600">
                              Vista pelo Gestor
                            </Badge>
                          )}
                          
                          {/* Badge "Pode editar" - para tarefas enviadas que ainda não foram vistas pelo gestor */}
                          {todo.tipo === 'enviada' && !todo.visto && (
                            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50">
                              <Edit className="h-3 w-3 mr-1" />
                              Pode editar
                            </Badge>
                          )}
                          
                          {/* Categoria */}
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
                        
                        {/* Resposta do gestor (para tarefas enviadas) */}
                        {todo.tipo === 'enviada' && todo.comentario && (
                          <div className="p-3 bg-blue-50 rounded-lg mb-3">
                            <strong className="text-blue-700 text-sm">Resposta do Gestor:</strong>
                            <p className="text-blue-600 text-sm mt-1">{todo.comentario}</p>
                          </div>
                        )}
                        
                        {/* Resposta da loja (se já respondeu) - para tarefas enviadas */}
                        {todo.tipo === 'enviada' && todo.respostaLoja && (
                          <div className="p-3 bg-emerald-50 rounded-lg mb-3">
                            <strong className="text-emerald-700 text-sm">Sua Resposta:</strong>
                            <p className="text-emerald-600 text-sm mt-1">{todo.respostaLoja}</p>
                          </div>
                        )}
                        
                        {/* Observação da loja (se já adicionou) - para tarefas recebidas */}
                        {todo.tipo === 'recebida' && todo.respostaLoja && (
                          <div className="p-3 bg-teal-50 rounded-lg mb-3">
                            <strong className="text-teal-700 text-sm">Sua Observação:</strong>
                            <p className="text-teal-600 text-sm mt-1">{todo.respostaLoja}</p>
                          </div>
                        )}
                        
                        {/* Anexos */}
                        {todo.anexos && (() => {
                          try {
                            const anexosList = typeof todo.anexos === 'string' ? JSON.parse(todo.anexos) : todo.anexos;
                            if (Array.isArray(anexosList) && anexosList.length > 0) {
                              return (
                                <div className="mb-3">
                                  <span className="text-sm font-medium flex items-center gap-1 mb-2">
                                    <Paperclip className="h-4 w-4" />
                                    Anexos ({anexosList.length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {anexosList.map((anexo: {url: string; nome: string; tipo: string}, idx: number) => (
                                      <a
                                        key={idx}
                                        href={anexo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm hover:bg-secondary/80 transition-colors"
                                      >
                                        {anexo.tipo === 'imagem' ? (
                                          <ImageIcon className="h-3 w-3 text-blue-500" />
                                        ) : (
                                          <FileText className="h-3 w-3 text-orange-500" />
                                        )}
                                        <span className="max-w-[150px] truncate">{anexo.nome}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {}
                          return null;
                        })()}
                        
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {todo.criadoPorNome && <span>Criado por: {todo.criadoPorNome}</span>}
                          <span>{new Date(todo.createdAt).toLocaleDateString('pt-PT')}</span>
                          {todo.dataLimite && (
                            <span className="text-orange-600">
                              Prazo: {new Date(todo.dataLimite).toLocaleDateString('pt-PT')}
                            </span>
                          )}
                          {todo.dataConclusao && (
                            <span className="text-green-600">
                              Concluída: {new Date(todo.dataConclusao).toLocaleDateString('pt-PT')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Ações */}
                      <div className="flex flex-col gap-2">
                        {/* Ações para tarefas RECEBIDAS (do gestor) */}
                        {todo.tipo === 'recebida' && todo.estado !== 'concluida' && (
                          <>
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-teal-600 border-teal-300 hover:bg-teal-50"
                              onClick={() => {
                                setTodoSelecionado(todo.id);
                                setObservacaoTodo(todo.respostaLoja || '');
                                setObservacaoTodoOpen(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {todo.respostaLoja ? 'Editar Obs.' : 'Adicionar Obs.'}
                            </Button>
                          </>
                        )}
                        
                        {/* Ações para tarefas ENVIADAS (ao gestor) */}
                        {/* Botão Editar - apenas se não foi vista pelo gestor */}
                        {todo.tipo === 'enviada' && !todo.visto && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={() => {
                              setTarefaEnviadaEditando(todo);
                              setEditarEnviadaTitulo(todo.titulo);
                              setEditarEnviadaDescricao(todo.descricao || '');
                              setEditarEnviadaPrioridade(todo.prioridade || 'media');
                              setEditarEnviadaOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
                        {/* Botão Responder - apenas se o gestor já respondeu */}
                        {todo.tipo === 'enviada' && todo.comentario && !todo.respostaLoja && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-cyan-600 border-cyan-300 hover:bg-cyan-50"
                            onClick={() => {
                              setTodoSelecionado(todo.id);
                              setResponderTodoOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Responder
                          </Button>
                        )}
                        
                        {/* Ações para tarefas INTERNAS */}
                        {todo.tipo === 'interna' && todo.estado !== 'concluida' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTarefaInternaEditando(todo);
                                setEditarInternaOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => atualizarTarefaInternaMutation.mutate({
                                token,
                                todoId: todo.id,
                                estado: 'concluida',
                              })}
                              disabled={atualizarTarefaInternaMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Concluir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => {
                                if (confirm('Tem a certeza que deseja eliminar esta tarefa?')) {
                                  eliminarTarefaInternaMutation.mutate({
                                    token,
                                    todoId: todo.id,
                                  });
                                }
                              }}
                              disabled={eliminarTarefaInternaMutation.isPending}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ));
            })()}          </div>
        )}

        {/* Tab Resultados - Dashboard */}
        {activeTab === "resultados" && (
          <div className="space-y-6">
            {/* Cabeçalho com Data de Atualização, Filtro de Período e Botão Exportar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              {/* Data de Atualização e Indicador de Dia Útil */}
              {dashboardData?.dataAtualizacao && (() => {
                const dataAtual = new Date(dashboardData.dataAtualizacao);
                const ano = dataAtual.getFullYear();
                const mes = dataAtual.getMonth();
                const diaAtual = dataAtual.getDate();
                
                // Feriados nacionais portugueses (fixos e móveis)
                const getFeriadosPortugueses = (ano: number): Date[] => {
                  // Feriados fixos
                  const feriadosFixos = [
                    new Date(ano, 0, 1),   // Ano Novo
                    new Date(ano, 3, 25),  // Dia da Liberdade
                    new Date(ano, 4, 1),   // Dia do Trabalhador
                    new Date(ano, 5, 10),  // Dia de Portugal
                    new Date(ano, 7, 15),  // Assunção de Nossa Senhora
                    new Date(ano, 9, 5),   // Implantação da República
                    new Date(ano, 10, 1),  // Dia de Todos os Santos
                    new Date(ano, 11, 1),  // Restauração da Independência
                    new Date(ano, 11, 8),  // Imaculada Conceição
                    new Date(ano, 11, 25), // Natal
                  ];
                  
                  // Cálculo da Páscoa (Algoritmo de Meeus/Jones/Butcher)
                  const a = ano % 19;
                  const b = Math.floor(ano / 100);
                  const c = ano % 100;
                  const d = Math.floor(b / 4);
                  const e = b % 4;
                  const f = Math.floor((b + 8) / 25);
                  const g = Math.floor((b - f + 1) / 3);
                  const h = (19 * a + b - d - g + 15) % 30;
                  const i = Math.floor(c / 4);
                  const k = c % 4;
                  const l = (32 + 2 * e + 2 * i - h - k) % 7;
                  const m = Math.floor((a + 11 * h + 22 * l) / 451);
                  const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31) - 1;
                  const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;
                  const pascoa = new Date(ano, mesPascoa, diaPascoa);
                  
                  // Feriados móveis baseados na Páscoa
                  const sextaFeiraSanta = new Date(pascoa);
                  sextaFeiraSanta.setDate(pascoa.getDate() - 2);
                  
                  const corpusChristi = new Date(pascoa);
                  corpusChristi.setDate(pascoa.getDate() + 60);
                  
                  return [...feriadosFixos, pascoa, sextaFeiraSanta, corpusChristi];
                };
                
                const feriados = getFeriadosPortugueses(ano);
                
                // Função para verificar se uma data é feriado
                const ehFeriado = (data: Date): boolean => {
                  return feriados.some(f => 
                    f.getDate() === data.getDate() && 
                    f.getMonth() === data.getMonth() && 
                    f.getFullYear() === data.getFullYear()
                  );
                };
                
                // Calcular dias úteis do mês (excluir sábados, domingos e feriados)
                const calcularDiasUteis = (ano: number, mes: number, ateDia?: number) => {
                  const ultimoDia = ateDia || new Date(ano, mes + 1, 0).getDate();
                  let diasUteis = 0;
                  for (let dia = 1; dia <= ultimoDia; dia++) {
                    const data = new Date(ano, mes, dia);
                    const diaSemana = data.getDay();
                    // Não é domingo (0), sábado (6) nem feriado
                    if (diaSemana !== 0 && diaSemana !== 6 && !ehFeriado(data)) {
                      diasUteis++;
                    }
                  }
                  return diasUteis;
                };
                
                const totalDiasUteisMes = calcularDiasUteis(ano, mes);
                const diasUteisAteHoje = calcularDiasUteis(ano, mes, diaAtual);
                const diasUteisRestantes = totalDiasUteisMes - diasUteisAteHoje;
                const percentagemMes = Math.round((diasUteisAteHoje / totalDiasUteisMes) * 100);
                
                // Calcular previsão de serviços para atingir objetivo
                const servicosAtuais = dashboardData.resultados?.totalServicos || 0;
                const objetivoMensal = dashboardData.resultados?.objetivoMensal || 0;
                const servicosFaltam = Math.max(0, objetivoMensal - servicosAtuais);
                const servicosPorDia = diasUteisRestantes > 0 ? Math.ceil(servicosFaltam / diasUteisRestantes) : 0;
                const atingiuObjetivo = servicosAtuais >= objetivoMensal;
                
                // Contar feriados no mês atual
                const feriadosNoMes = feriados.filter(f => f.getMonth() === mes).length;
                
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {language === 'pt' ? 'Atualizado em: ' : 'Updated on: '}
                        {dataAtual.toLocaleDateString('pt-PT', { 
                          weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
                        })}, {dataAtual.toLocaleTimeString('pt-PT', { 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium text-foreground">
                          {language === 'pt' 
                            ? `Dia ${diasUteisAteHoje} de ${totalDiasUteisMes} dias úteis`
                            : `Day ${diasUteisAteHoje} of ${totalDiasUteisMes} working days`}
                          {feriadosNoMes > 0 && (
                            <span className="text-muted-foreground ml-1">({feriadosNoMes} {language === 'pt' ? 'feriado(s)' : 'holiday(s)'})</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-[100px] bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              percentagemMes >= 80 ? 'bg-red-500' : 
                              percentagemMes >= 60 ? 'bg-amber-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${percentagemMes}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{percentagemMes}%</span>
                      </div>
                    </div>
                    
                    {/* Alerta de fim de mês */}
                    {diasUteisRestantes <= 5 && diasUteisRestantes > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-amber-700 font-medium">
                          {language === 'pt' 
                            ? `Atenção: Faltam apenas ${diasUteisRestantes} dias úteis para o fim do mês!`
                            : `Warning: Only ${diasUteisRestantes} working days left this month!`}
                        </span>
                      </div>
                    )}
                    
                    {/* Previsão de serviços para objetivo */}
                    {objetivoMensal > 0 && !atingiuObjetivo && diasUteisRestantes > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-md px-2 py-1">
                        <Target className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-blue-700">
                          {language === 'pt' 
                            ? `Para atingir o objetivo: ${servicosFaltam} serviços em ${diasUteisRestantes} dias = `
                            : `To reach goal: ${servicosFaltam} services in ${diasUteisRestantes} days = `}
                          <span className="font-bold">
                            {servicosPorDia} {language === 'pt' ? 'serviços/dia' : 'services/day'}
                          </span>
                        </span>
                      </div>
                    )}
                    
                    {/* Mensagem de objetivo atingido */}
                    {objetivoMensal > 0 && atingiuObjetivo && (
                      <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-md px-2 py-1">
                        <Award className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          {language === 'pt' 
                            ? `Parabéns! Objetivo mensal atingido (+${servicosAtuais - objetivoMensal} acima)`
                            : `Congratulations! Monthly goal reached (+${servicosAtuais - objetivoMensal} above)`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="flex items-center gap-3">
                {/* Botão Exportar PDF */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarPDF}
                  disabled={exportandoPDF || !dashboardData?.resultados}
                  className="flex items-center gap-2"
                >
                  {exportandoPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {language === 'pt' ? 'Exportar PDF' : 'Export PDF'}
                </Button>
                
                {/* Filtro de Meses com Checkboxes */}
                <FiltroMesesCheckbox
                  mesesSelecionados={mesesSelecionadosDashboard}
                  onMesesChange={setMesesSelecionadosDashboard}
                  placeholder={language === 'pt' ? 'Selecionar meses' : 'Select months'}
                />
              </div>
            </div>
            
            {/* Label do Período Selecionado */}
            {dashboardData?.periodoLabel && (
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">
                  {dashboardData.periodoLabel}
                </h2>
              </div>
            )}

            {dashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : !dashboardData?.resultados ? (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="py-8 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold text-amber-800">
                    {language === 'pt' ? 'Sem dados disponíveis' : 'No data available'}
                  </h3>
                  <p className="text-amber-600 mt-2">
                    {language === 'pt' 
                      ? 'Não existem resultados para o período selecionado.'
                      : 'No results available for the selected period.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div ref={dashboardRef} className="space-y-6 bg-white p-4 rounded-lg">
                {/* KPIs Principais - Primeiro no topo */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Serviços */}
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Wrench className="h-8 w-8 opacity-80" />
                        <div className="text-right">
                          <p className="text-2xl font-bold">{dashboardData.resultados.totalServicos || 0}</p>
                          <p className="text-xs opacity-80">{language === 'pt' ? 'Serviços' : 'Services'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Objetivo */}
                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Target className="h-8 w-8 opacity-80" />
                        <div className="text-right">
                          <p className="text-2xl font-bold">{dashboardData.resultados.objetivoMensal || 0}</p>
                          <p className="text-xs opacity-80">{language === 'pt' ? 'Objetivo' : 'Goal'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Desvio vs Objetivo Diário - Cores graduais baseadas na magnitude */}
                  <Card className={`bg-gradient-to-br ${(() => {
                    const desvio = parseFloat(String(dashboardData.resultados.desvioPercentualDia || 0)) * 100;
                    if (desvio >= 20) return 'from-green-600 to-green-700'; // Excelente: +20% ou mais
                    if (desvio >= 10) return 'from-green-500 to-green-600'; // Muito bom: +10% a +20%
                    if (desvio >= 0) return 'from-green-400 to-green-500';  // Bom: 0% a +10%
                    if (desvio >= -10) return 'from-red-400 to-red-500';    // Atenção: -10% a 0%
                    if (desvio >= -20) return 'from-red-500 to-red-600';    // Alerta: -20% a -10%
                    return 'from-red-600 to-red-700';                       // Crítico: abaixo de -20%
                  })()} text-white`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {parseFloat(String(dashboardData.resultados.desvioPercentualDia || 0)) >= 0 ? (
                          <TrendingUp className="h-8 w-8 opacity-80" />
                        ) : (
                          <TrendingDown className="h-8 w-8 opacity-80" />
                        )}
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {dashboardData.resultados.desvioPercentualDia !== null 
                              ? `${parseFloat(String(dashboardData.resultados.desvioPercentualDia)) >= 0 ? '+' : ''}${(parseFloat(String(dashboardData.resultados.desvioPercentualDia)) * 100).toFixed(1)}%`
                              : '-'}
                          </p>
                          <p className="text-xs opacity-80">{language === 'pt' ? 'Desvio Obj. Diário' : 'Daily Goal Dev.'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Taxa Reparação */}
                  <Card className={`bg-gradient-to-br ${
                    parseFloat(String(dashboardData.resultados.taxaReparacao || 0)) >= 0.22 
                      ? 'from-green-500 to-green-600' 
                      : 'from-amber-500 to-amber-600'
                  } text-white`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Award className="h-8 w-8 opacity-80" />
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {dashboardData.resultados.taxaReparacao !== null 
                              ? `${(parseFloat(String(dashboardData.resultados.taxaReparacao)) * 100).toFixed(1)}%`
                              : '-'}
                          </p>
                          <p className="text-xs opacity-80">{language === 'pt' ? 'Taxa Rep.' : 'Repair Rate'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Alertas - Agora depois dos KPIs */}
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

                        {/* Cards com valores */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg text-center">
                            <p className="text-xs text-blue-600 font-medium">Escovas</p>
                            <p className="text-xl font-bold text-blue-700">{dashboardData.complementares.escovasQtd || 0}</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg text-center">
                            <p className="text-xs text-purple-600 font-medium">Polimento</p>
                            <p className="text-xl font-bold text-purple-700">{dashboardData.complementares.polimentoQtd || 0}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg text-center">
                            <p className="text-xs text-green-600 font-medium">Tratamento</p>
                            <p className="text-xl font-bold text-green-700">{dashboardData.complementares.tratamentoQtd || 0}</p>
                          </div>
                          <div className="p-3 bg-gray-100 rounded-lg text-center">
                            <p className="text-xs text-gray-600 font-medium">Outros</p>
                            <p className="text-xl font-bold text-gray-700">{dashboardData.complementares.outrosQtd || 0}</p>
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
                        {language === 'pt' ? 'Comparação com Mês Anterior' : 'Comparison with Previous Month'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Serviços */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">{language === 'pt' ? 'Serviços' : 'Services'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                              {Number(dashboardData.resultados?.totalServicos || 0)}
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
                              {Number(dashboardData.resultados?.totalReparacoes || 0)}
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

                {/* Gráfico de Evolução Mensal - Chart.js */}
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
                                    label: language === 'pt' ? 'Objetivo (22%)' : 'Goal (22%)',
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
                                        const value = context.parsed.y ?? 0;
                                        return `${context.dataset.label}: ${value.toFixed(1)}%`;
                                      },
                                    },
                                  },
                                },
                                scales: {
                                  y: {
                                    min: 0,
                                    max: Math.max(40, ...taxasReparacao) + 5,
                                    ticks: {
                                      callback: (value) => `${value ?? 0}%`,
                                    },
                                  },
                                },
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Tabela de Evolução Mensal */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {language === 'pt' ? 'Detalhes da Evolução' : 'Evolution Details'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">{language === 'pt' ? 'Mês' : 'Month'}</th>
                                  <th className="text-right py-2">{language === 'pt' ? 'Serviços' : 'Services'}</th>
                                  <th className="text-right py-2">{language === 'pt' ? 'Objetivo' : 'Goal'}</th>
                                  <th className="text-right py-2">{language === 'pt' ? 'Desvio' : 'Deviation'}</th>
                                  <th className="text-right py-2">{language === 'pt' ? 'Taxa Rep.' : 'Repair Rate'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {evolucaoData.map((e: any, idx: number) => (
                                  <tr key={idx} className="border-b">
                                    <td className="py-2">
                                      {new Date(e.ano, e.mes - 1).toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' })}
                                    </td>
                                    <td className="text-right py-2">{e.totalServicos || 0}</td>
                                    <td className="text-right py-2">{e.objetivoMensal || 0}</td>
                                    <td className={`text-right py-2 font-medium ${
                                      parseFloat(String(e.desvioPercentualMes || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {e.desvioPercentualMes !== null 
                                        ? `${(parseFloat(String(e.desvioPercentualMes)) * 100).toFixed(1)}%`
                                        : '-'}
                                    </td>
                                    <td className={`text-right py-2 font-medium ${
                                      parseFloat(String(e.taxaReparacao || 0)) >= 0.22 ? 'text-green-600' : 'text-amber-600'
                                    }`}>
                                      {e.taxaReparacao !== null 
                                        ? `${(parseFloat(String(e.taxaReparacao)) * 100).toFixed(1)}%`
                                        : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
                        ? 'Análise inteligente com recomendações personalizadas para a sua loja'
                        : 'Smart analysis with personalized recommendations for your store'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!analiseIA ? (
                      <div className="text-center py-6">
                        <Sparkles className="h-12 w-12 mx-auto text-purple-400 mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {language === 'pt' 
                            ? 'Clique para gerar uma análise inteligente dos seus resultados'
                            : 'Click to generate an intelligent analysis of your results'}
                        </p>
                        <Button
                          onClick={() => {
                            analiseIAMutation.mutate({
                              token,
                              meses: mesesSelecionadosDashboard.map((m: MesSelecionado) => ({ mes: m.mes, ano: m.ano }))
                            });
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
                              analiseIAMutation.mutate({
                                token,
                                meses: mesesSelecionadosDashboard.map((m: MesSelecionado) => ({ mes: m.mes, ano: m.ano }))
                              });
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
            )}
          </div>
        )}

        {/* Dialog Devolver Tarefa */}
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
                    toast.error(language === 'pt' ? "Deve indicar o motivo da devolução" : "Must indicate the reason for return");
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

        {/* Dialog Responder Tarefa (quando gestor já respondeu) */}
        <Dialog open={responderTodoOpen} onOpenChange={setResponderTodoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Responder ao Gestor</DialogTitle>
              <DialogDescription>
                Escreva a sua resposta ao comentário do gestor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Escreva a sua resposta..."
                value={respostaTodo}
                onChange={(e) => setRespostaTodo(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setResponderTodoOpen(false);
                setRespostaTodo("");
                setTodoSelecionado(null);
              }}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!respostaTodo.trim()) {
                    toast.error(language === 'pt' ? "Deve escrever uma resposta" : "Must write a response");
                    return;
                  }
                  if (todoSelecionado) {
                    responderTodoMutation.mutate({
                      token,
                      todoId: todoSelecionado,
                      resposta: respostaTodo.trim(),
                    });
                  }
                }}
                disabled={responderTodoMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {responderTodoMutation.isPending ? "A enviar..." : "Enviar Resposta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Adicionar Observação (para tarefas recebidas do gestor) */}
        <Dialog open={observacaoTodoOpen} onOpenChange={setObservacaoTodoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Observação</DialogTitle>
              <DialogDescription>
                Adicione uma observação ou comentário sobre esta tarefa. O gestor será notificado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Escreva a sua observação..."
                value={observacaoTodo}
                onChange={(e) => setObservacaoTodo(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setObservacaoTodoOpen(false);
                setObservacaoTodo("");
                setTodoSelecionado(null);
              }}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!observacaoTodo.trim()) {
                    toast.error(language === 'pt' ? "Deve escrever uma observação" : "Must write an observation");
                    return;
                  }
                  if (todoSelecionado) {
                    adicionarObservacaoMutation.mutate({
                      token,
                      todoId: todoSelecionado,
                      observacao: observacaoTodo.trim(),
                    });
                  }
                }}
                disabled={adicionarObservacaoMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {adicionarObservacaoMutation.isPending ? "A enviar..." : "Enviar Observação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Nova Tarefa */}
        <Dialog open={novaTarefaOpen} onOpenChange={(open) => {
          setNovaTarefaOpen(open);
          if (!open) {
            setNovaTarefaInterna(false);
            setNovaTarefaDataLimite("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {novaTarefaInterna ? (
                  <><Store className="h-5 w-5 text-purple-600" />Nova Tarefa Interna</>
                ) : (
                  <><Plus className="h-5 w-5 text-emerald-600" />Nova Tarefa para o Gestor</>
                )}
              </DialogTitle>
              <DialogDescription>
                {novaTarefaInterna 
                  ? "Crie uma tarefa para organizar o trabalho interno da loja."
                  : "Crie uma tarefa que será enviada ao gestor responsável pela sua loja."
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder={novaTarefaInterna ? "Ex: Organizar stock" : "Ex: Precisamos de formação sobre novo produto"}
                  value={novaTarefaTitulo}
                  onChange={(e) => setNovaTarefaTitulo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{language === 'pt' ? "Descrição" : "Description"}</label>
                <Textarea
                  placeholder="Descreva a tarefa com mais detalhes..."
                  value={novaTarefaDescricao}
                  onChange={(e) => setNovaTarefaDescricao(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'pt' ? "Prioridade" : "Priority"}</label>
                  <Select
                    value={novaTarefaPrioridade}
                    onValueChange={(value) => setNovaTarefaPrioridade(value as typeof novaTarefaPrioridade)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">{language === 'pt' ? "Urgente" : "Urgent"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'pt' ? "Categoria" : "Category"}</label>
                  <Select
                    value={novaTarefaCategoriaId?.toString() || "none"}
                    onValueChange={(value) => setNovaTarefaCategoriaId(value === "none" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categorias?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {novaTarefaInterna && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Limite (opcional)</label>
                  <Input
                    type="date"
                    value={novaTarefaDataLimite}
                    onChange={(e) => setNovaTarefaDataLimite(e.target.value)}
                  />
                </div>
              )}
              
              {/* Upload de Anexos */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Anexos (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingAnexo || novaTarefaAnexos.length >= 5}
                    onClick={() => document.getElementById("tarefa-anexo-upload")?.click()}
                  >
                    {uploadingAnexo ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" />Adicionar Ficheiros</>
                    )}
                  </Button>
                  <input
                    id="tarefa-anexo-upload"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      
                      if (novaTarefaAnexos.length + files.length > 5) {
                        toast.error(language === 'pt' ? "Máximo de 5 anexos permitidos" : "Maximum 5 attachments allowed");
                        return;
                      }
                      
                      setUploadingAnexo(true);
                      try {
                        const novosAnexos: Array<{url: string; nome: string; tipo: string}> = [];
                        
                        for (const file of files) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error(`${file.name} é muito grande (máx 10MB)`);
                            continue;
                          }
                          
                          const isImage = file.type.startsWith("image/");
                          const tipo = isImage ? "imagem" : "documento";
                          
                          const arrayBuffer = await file.arrayBuffer();
                          const buffer = new Uint8Array(arrayBuffer);
                          let binary = '';
                          for (let i = 0; i < buffer.length; i++) {
                            binary += String.fromCharCode(buffer[i]);
                          }
                          const base64 = btoa(binary);
                          
                          const { url } = await uploadAnexoMutation.mutateAsync({
                            token,
                            fileName: file.name,
                            fileData: base64,
                            contentType: file.type || 'application/octet-stream',
                          });
                          
                          novosAnexos.push({ url, nome: file.name, tipo });
                        }
                        
                        setNovaTarefaAnexos([...novaTarefaAnexos, ...novosAnexos]);
                        if (novosAnexos.length > 0) {
                          toast.success(`${novosAnexos.length} ficheiro(s) adicionado(s)`);
                        }
                      } catch (error) {
                        console.error("Erro ao fazer upload:", error);
                        toast.error(language === 'pt' ? "Erro ao fazer upload dos ficheiros" : "Error uploading files");
                      } finally {
                        setUploadingAnexo(false);
                        e.target.value = "";
                      }
                    }}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {novaTarefaAnexos.length}/5 ficheiros
                  </span>
                </div>
                
                {novaTarefaAnexos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {novaTarefaAnexos.map((anexo, index) => (
                      <div key={index} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-sm">
                        {anexo.tipo === "imagem" ? (
                          <ImageIcon className="h-3 w-3" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        <span className="max-w-[120px] truncate">{anexo.nome}</span>
                        <button
                          type="button"
                          onClick={() => setNovaTarefaAnexos(novaTarefaAnexos.filter((_, i) => i !== index))}
                          className="ml-1 rounded-sm hover:bg-secondary-foreground/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Formatos: Imagens, PDF, Word, Excel, PowerPoint (máx 10MB/ficheiro)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setNovaTarefaOpen(false);
                setNovaTarefaTitulo("");
                setNovaTarefaDescricao("");
                setNovaTarefaPrioridade("media");
                setNovaTarefaCategoriaId(undefined);
                setNovaTarefaInterna(false);
                setNovaTarefaDataLimite("");
                setNovaTarefaAnexos([]);
              }}>
                Cancelar
              </Button>
              <Button
                className={novaTarefaInterna ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"}
                onClick={() => {
                  if (!novaTarefaTitulo.trim()) {
                    toast.error(language === 'pt' ? "O título é obrigatório" : "Title is required");
                    return;
                  }
                  if (novaTarefaInterna) {
                    criarTarefaInternaMutation.mutate({
                      token,
                      titulo: novaTarefaTitulo.trim(),
                      descricao: novaTarefaDescricao.trim() || undefined,
                      prioridade: novaTarefaPrioridade,
                      categoriaId: novaTarefaCategoriaId,
                      dataLimite: novaTarefaDataLimite || undefined,
                      anexos: novaTarefaAnexos.length > 0 ? novaTarefaAnexos : undefined,
                    });
                  } else {
                    criarTarefaMutation.mutate({
                      token,
                      titulo: novaTarefaTitulo.trim(),
                      descricao: novaTarefaDescricao.trim() || undefined,
                      prioridade: novaTarefaPrioridade,
                      categoriaId: novaTarefaCategoriaId,
                      anexos: novaTarefaAnexos.length > 0 ? novaTarefaAnexos : undefined,
                    });
                  }
                }}
                disabled={criarTarefaMutation.isPending || criarTarefaInternaMutation.isPending}
              >
                {(criarTarefaMutation.isPending || criarTarefaInternaMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    A criar...
                  </>
                ) : novaTarefaInterna ? (
                  <>
                    <Store className="h-4 w-4 mr-2" />
                    Criar Tarefa Interna
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar ao Gestor
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Tarefa Interna */}
        <Dialog open={editarInternaOpen} onOpenChange={setEditarInternaOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-600" />
                Editar Tarefa Interna
              </DialogTitle>
            </DialogHeader>
            {tarefaInternaEditando && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título *</label>
                  <Input
                    value={tarefaInternaEditando.titulo}
                    onChange={(e) => setTarefaInternaEditando({...tarefaInternaEditando, titulo: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'pt' ? "Descrição" : "Description"}</label>
                  <Textarea
                    value={tarefaInternaEditando.descricao || ''}
                    onChange={(e) => setTarefaInternaEditando({...tarefaInternaEditando, descricao: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{language === 'pt' ? "Prioridade" : "Priority"}</label>
                    <Select
                      value={tarefaInternaEditando.prioridade}
                      onValueChange={(value) => setTarefaInternaEditando({...tarefaInternaEditando, prioridade: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">{language === 'pt' ? "Urgente" : "Urgent"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{language === 'pt' ? "Estado" : "Status"}</label>
                    <Select
                      value={tarefaInternaEditando.estado}
                      onValueChange={(value) => setTarefaInternaEditando({...tarefaInternaEditando, estado: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">{language === 'pt' ? "Pendente" : "Pending"}</SelectItem>
                        <SelectItem value="em_progresso">{language === 'pt' ? "Em Progresso" : "In Progress"}</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditarInternaOpen(false);
                setTarefaInternaEditando(null);
              }}>
                Cancelar
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  if (!tarefaInternaEditando?.titulo?.trim()) {
                    toast.error(language === 'pt' ? "O título é obrigatório" : "Title is required");
                    return;
                  }
                  atualizarTarefaInternaMutation.mutate({
                    token,
                    todoId: tarefaInternaEditando.id,
                    titulo: tarefaInternaEditando.titulo.trim(),
                    descricao: tarefaInternaEditando.descricao?.trim() || undefined,
                    prioridade: tarefaInternaEditando.prioridade,
                    estado: tarefaInternaEditando.estado,
                  });
                }}
                disabled={atualizarTarefaInternaMutation.isPending}
              >
                {atualizarTarefaInternaMutation.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar tarefa enviada */}
        <Dialog open={editarEnviadaOpen} onOpenChange={setEditarEnviadaOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-amber-600" />
                {language === 'pt' ? 'Editar Tarefa Enviada' : 'Edit Sent Task'}
              </DialogTitle>
              <DialogDescription>
                {language === 'pt' ? 'Pode editar esta tarefa porque o gestor ainda não a visualizou.' : 'You can edit this task because the manager has not viewed it yet.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{language === 'pt' ? 'Título' : 'Title'}</label>
                <Input
                  value={editarEnviadaTitulo}
                  onChange={(e) => setEditarEnviadaTitulo(e.target.value)}
                  placeholder={language === 'pt' ? 'Título da tarefa' : 'Task title'}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'pt' ? 'Descrição' : 'Description'}</label>
                <Textarea
                  value={editarEnviadaDescricao}
                  onChange={(e) => setEditarEnviadaDescricao(e.target.value)}
                  placeholder={language === 'pt' ? 'Descrição da tarefa (opcional)' : 'Task description (optional)'}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'pt' ? 'Prioridade' : 'Priority'}</label>
                <Select
                  value={editarEnviadaPrioridade}
                  onValueChange={(value: "baixa" | "media" | "alta" | "urgente") => setEditarEnviadaPrioridade(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">{language === 'pt' ? 'Baixa' : 'Low'}</SelectItem>
                    <SelectItem value="media">{language === 'pt' ? 'Média' : 'Medium'}</SelectItem>
                    <SelectItem value="alta">{language === 'pt' ? 'Alta' : 'High'}</SelectItem>
                    <SelectItem value="urgente">{language === 'pt' ? 'Urgente' : 'Urgent'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditarEnviadaOpen(false);
                setTarefaEnviadaEditando(null);
              }}>
                {language === 'pt' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => {
                  if (!editarEnviadaTitulo.trim()) {
                    toast.error(language === 'pt' ? 'O título é obrigatório' : 'Title is required');
                    return;
                  }
                  editarEnviadaMutation.mutate({
                    token,
                    todoId: tarefaEnviadaEditando.id,
                    titulo: editarEnviadaTitulo.trim(),
                    descricao: editarEnviadaDescricao.trim() || undefined,
                    prioridade: editarEnviadaPrioridade,
                  });
                }}
                disabled={editarEnviadaMutation.isPending}
              >
                {editarEnviadaMutation.isPending ? (language === 'pt' ? 'A guardar...' : 'Saving...') : (language === 'pt' ? 'Guardar' : 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Botão Flutuante de Acesso Rápido às Tarefas - Pulsa quando há NOVAS */}
      {activeTab !== 'tarefas' && (
        <button
          onClick={() => {
            setActiveTab('tarefas');
            // Marcar tarefas como vistas quando clica no botão flutuante
            if (todosList && todosList.length > 0) {
              const idsNaoVistos = todosList.filter((t: any) => !t.visto).map((t: any) => t.id);
              if (idsNaoVistos.length > 0) {
                marcarVistosLojaMutation.mutate({ token, todoIds: idsNaoVistos });
              }
            }
          }}
          className={`fixed bottom-6 right-6 z-50 text-white rounded-full p-4 shadow-2xl transition-all hover:scale-110 group ${
            (todosNaoVistos || 0) > 0 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-300' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title="Minhas Tarefas"
        >
          <ListTodo className={`h-6 w-6 ${(todosNaoVistos || 0) > 0 ? 'animate-bounce' : ''}`} />
          {/* Badge de contagem - destaca NOVAS */}
          {(todosNaoVistos || 0) > 0 ? (
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-red-800 text-xs rounded-full h-7 w-7 flex items-center justify-center font-bold animate-bounce border-2 border-white">
              {todosNaoVistos}
            </span>
          ) : (todosCount || 0) > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
              {todosCount}
            </span>
          )}
          {/* Tooltip */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {(todosNaoVistos || 0) > 0 ? `${todosNaoVistos} Tarefa${todosNaoVistos !== 1 ? 's' : ''} Nova${todosNaoVistos !== 1 ? 's' : ''}!` : 'Minhas Tarefas'}
          </span>
        </button>
      )}
    </div>
  );
}

// Componente de edição de reunião
function ReuniaoEditor({
  token,
  reuniao,
  reuniaoAtualId,
  pendentes,
  onSave,
  onConcluir,
  onAtualizarPendente,
  isSaving,
  isConcluindo,
}: {
  token: string;
  reuniao: any;
  reuniaoAtualId: number | null;
  pendentes: any[];
  onSave: (data: any) => void;
  onConcluir: (data: any) => void;
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
            <label className="text-sm font-medium mb-2 block">Temas Discutidos <span className="text-red-500">*</span></label>
            <Textarea
              placeholder="Quais temas foram abordados na reunião?"
              value={temasDiscutidos}
              onChange={(e) => setTemasDiscutidos(e.target.value)}
              rows={3}
              className={!temasDiscutidos.trim() ? 'border-red-300' : ''}
            />
            {!temasDiscutidos.trim() && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Decisões Tomadas <span className="text-red-500">*</span></label>
            <Textarea
              placeholder="Que decisões foram tomadas?"
              value={decisoesTomadas}
              onChange={(e) => setDecisoesTomadas(e.target.value)}
              rows={3}
              className={!decisoesTomadas.trim() ? 'border-red-300' : ''}
            />
            {!decisoesTomadas.trim() && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Análise de Resultados <span className="text-red-500">*</span></label>
            <Textarea
              placeholder="Como estão os resultados da loja? O que pode melhorar?"
              value={analiseResultados}
              onChange={(e) => setAnaliseResultados(e.target.value)}
              rows={3}
              className={!analiseResultados.trim() ? 'border-red-300' : ''}
            />
            {!analiseResultados.trim() && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Planos de Ação <span className="text-red-500">*</span></label>
            <Textarea
              placeholder="Quais ações serão implementadas?"
              value={planosAcao}
              onChange={(e) => setPlanosAcao(e.target.value)}
              rows={3}
              className={!planosAcao.trim() ? 'border-red-300' : ''}
            />
            {!planosAcao.trim() && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
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
        <Button onClick={() => {
          // Validar campos obrigatórios
          const camposVazios = [];
          if (!temasDiscutidos.trim()) camposVazios.push('Temas Discutidos');
          if (!decisoesTomadas.trim()) camposVazios.push('Decisões Tomadas');
          if (!analiseResultados.trim()) camposVazios.push('Análise de Resultados');
          if (!planosAcao.trim()) camposVazios.push('Planos de Ação');
          
          if (camposVazios.length > 0) {
            toast.error(`Preencha os campos obrigatórios: ${camposVazios.join(', ')}`);
            return;
          }
          
          // Usar reuniaoAtualId como fallback se reuniao?.id não estiver disponível
          const reuniaoId = reuniao?.id || reuniaoAtualId;
          
          onConcluir({
            reuniaoId,
            temasDiscutidos,
            decisoesTomadas,
            analiseResultados,
            planosAcao,
            observacoes,
          });
        }} disabled={isConcluindo || !temasDiscutidos.trim() || !decisoesTomadas.trim() || !analiseResultados.trim() || !planosAcao.trim()}>
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
  const { language } = useLanguage();
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
                  <SelectItem value="pendente">{language === 'pt' ? "Pendente" : "Pending"}</SelectItem>
                  <SelectItem value="em_progresso">{language === 'pt' ? "Em Progresso" : "In Progress"}</SelectItem>
                  <SelectItem value="resolvido">{language === 'pt' ? "Resolvido" : "Resolved"}</SelectItem>
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
