import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
// Imports removidos - PDF agora gerado via servidor
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
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
import { Label } from "@/components/ui/label";
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
import { ChatbotPortalLoja } from "@/components/ChatbotPortalLoja";
import { HistoricoEnviosVolante } from "@/components/HistoricoEnviosVolante";
import { useTheme } from "@/contexts/ThemeContext";
import { setAppBadge } from "@/hooks/useAppBadge";
import { usePushNotificationsLoja } from "@/hooks/usePushNotifications";
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
  Bell,
  Car,
  Check,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Moon,
  Sun,
  Globe,
  Smartphone as AppleIcon,
  Ban,
  Pencil,
  Settings,
  Trash2,
  MapPin,
  Bot,
  Filter,
  ClipboardList,
} from "lucide-react";

interface LojaAuth {
  lojaId: number;
  lojaNome: string;
  lojaEmail: string | null;
  tipoToken: 'responsavel' | 'colaborador';
  lojasRelacionadas?: Array<{ id: number; nome: string }>;
}

interface VolanteAuth {
  volanteId: number;
  volanteNome: string;
  volanteEmail: string | null;
  lojasAtribuidas: Array<{ id: number; nome: string }>;
  token: string;
  lojas: Array<{ id: number; nome: string }>;
}

export default function PortalLoja() {
  const { language, setLanguage, t } = useLanguage();
  // Inicializar token do localStorage se existir
  const [token, setToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('loja_token') || '';
    }
    return '';
  });
  const [inputToken, setInputToken] = useState<string>("");
  // Inicializar lojaAuth do localStorage se existir
  const [lojaAuth, setLojaAuth] = useState<LojaAuth | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lojaAuth');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Erro ao restaurar lojaAuth:', e);
      }
    }
    return null;
  });
  const [lojaAtualId, setLojaAtualId] = useState<number | null>(null);
  // Estado para autenticação de volante
  const [volanteAuth, setVolanteAuth] = useState<VolanteAuth | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('volanteAuth');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Erro ao restaurar volanteAuth:', e);
      }
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<"home" | "reuniao" | "pendentes" | "historico" | "tarefas" | "resultados" | "volante" | "agenda" | "chatbot" | "circulares">("home");
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
  const [novoPendenteOpen, setNovoPendenteOpen] = useState(false);
  const [novoPendenteDescricao, setNovoPendenteDescricao] = useState("");
  const [novoPendentePrioridade, setNovoPendentePrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media");
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
  
  // Push Notifications para Loja
  const pushNotifications = usePushNotificationsLoja(token);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  
  // Verificar se PWA está instalada
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
      const wasInstalled = localStorage.getItem('pwa_installed') === 'true';
      setIsPWAInstalled(isStandalone || wasInstalled);
    };
    
    checkInstalled();
    
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwa_installed', 'true');
      setIsPWAInstalled(true);
    });
  }, []);

  // Trocar manifest IMEDIATAMENTE (antes de qualquer useEffect)
  // Isto é crítico para que a PWA use o manifest correto quando instalada
  if (typeof window !== 'undefined') {
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
  }

  // PWA: Capturar evento de instalação e registar service worker
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
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    // Verificar se já está instalada
    const isInstalled = localStorage.getItem('pwa_installed') === 'true';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      toast.success(language === 'pt' 
        ? 'A app já está instalada e a correr!' 
        : 'The app is already installed and running!');
      return;
    }
    
    if (!deferredPrompt) {
      // Mostrar instruções manuais com mais detalhe
      toast.info(
        language === 'pt'
          ? 'Para instalar: Toque nos 3 pontos (menu) > "Adicionar ao Ecrã Inicial" ou "Instalar aplicação"'
          : 'To install: Tap the 3 dots (menu) > "Add to Home Screen" or "Install app"',
        { duration: 6000 }
      );
      return;
    }
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_installed', 'true');
        toast.success(language === 'pt' ? 'App instalada com sucesso!' : 'App installed successfully!');
      } else {
        toast.info(language === 'pt' 
          ? 'Instalação cancelada. Pode instalar mais tarde.' 
          : 'Installation cancelled. You can install later.');
      }
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      toast.error(language === 'pt' 
        ? 'Erro ao instalar. Tente pelo menu do browser.' 
        : 'Installation error. Try from browser menu.');
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

  // Query para validar token de volante
  const { data: volanteValidation, isLoading: isValidatingVolante } = trpc.portalVolante.validarToken.useQuery(
    { token },
    { 
      enabled: !!token && !lojaAuth && !volanteAuth,
      retry: false,
    }
  );

  // Autenticar loja
  const autenticarMutation = trpc.reunioesQuinzenais.autenticarLoja.useMutation({
    onSuccess: (data) => {
      setLojaAuth(data);
      setVolanteAuth(null);
      localStorage.setItem("loja_token", token);
      // Guardar lojaAuth no localStorage para persistir sessão na PWA
      localStorage.setItem("lojaAuth", JSON.stringify(data));
      localStorage.removeItem("volanteAuth");
      toast.success(`Bem-vindo, ${data.lojaNome}!`);
    },
    onError: (error) => {
      // Se falhou como loja, tentar como volante
      if (volanteValidation?.valid && volanteValidation.volante) {
        const volante = volanteValidation.volante;
        const lojas = volanteValidation.lojas || [];
        const volanteData: VolanteAuth = {
          volanteId: volante.id,
          volanteNome: volante.nome,
          volanteEmail: volante.email,
          lojasAtribuidas: lojas.map((l: any) => ({ id: l.id, nome: l.nome })),
        };
        setVolanteAuth(volanteData);
        setLojaAuth(null);
        localStorage.setItem("loja_token", token);
        localStorage.setItem("volanteAuth", JSON.stringify(volanteData));
        localStorage.removeItem("lojaAuth");
        setActiveTab("agenda");
        toast.success(`Bem-vindo, ${volante.nome}!`);
      } else {
        toast.error(error.message);
        localStorage.removeItem("loja_token");
        localStorage.removeItem("lojaAuth");
        localStorage.removeItem("volanteAuth");
        setToken("");
        setLojaAuth(null);
        setVolanteAuth(null);
      }
    },
  });

  // Efeito para processar validação de volante quando a query retorna
  useEffect(() => {
    if (volanteValidation?.valid && volanteValidation.volante && !lojaAuth && !volanteAuth) {
      const volante = volanteValidation.volante;
      const lojas = volanteValidation.lojas || [];
      const volanteData: VolanteAuth = {
        volanteId: volante.id,
        volanteNome: volante.nome,
        volanteEmail: volante.email,
        lojasAtribuidas: lojas.map((l: any) => ({ id: l.id, nome: l.nome })),
      };
      setVolanteAuth(volanteData);
      localStorage.setItem("loja_token", token);
      localStorage.setItem("volanteAuth", JSON.stringify(volanteData));
      setActiveTab("agenda");
      toast.success(`Bem-vindo, ${volante.nome}!`);
    }
  }, [volanteValidation, lojaAuth, volanteAuth, token]);

  // Autenticar quando token muda (ou validar sessão existente)
  useEffect(() => {
    // Se já temos volanteAuth do localStorage, não tentar autenticar como loja
    if (volanteAuth) {
      return;
    }
    // Se a validação de volante ainda está a carregar, esperar
    if (isValidatingVolante) {
      return;
    }
    // Se é um token de volante válido, não tentar autenticar como loja
    if (volanteValidation?.valid) {
      return;
    }
    if (token && !lojaAuth) {
      autenticarMutation.mutate({ token });
    } else if (token && lojaAuth) {
      // Se já temos lojaAuth do localStorage, validar se o token ainda é válido
      // fazendo uma autenticação silenciosa em background
      autenticarMutation.mutate({ token });
    }
  }, [isValidatingVolante, volanteValidation]);  // Executar quando a validação de volante terminar

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
    { 
      enabled: !!token && !!lojaAuth,
      refetchInterval: 30000, // Atualizar a cada 30 segundos
      staleTime: 10000,
      refetchOnWindowFocus: true,
    }
  );

  const { data: todosCount } = trpc.todosPortalLoja.contar.useQuery(
    { token },
    { 
      enabled: !!token && !!lojaAuth,
      refetchInterval: 30000,
      staleTime: 10000,
      refetchOnWindowFocus: true,
    }
  );

  // Contar tarefas NÃO VISTAS (para alerta/badge pulsante)
  const { data: todosNaoVistos, refetch: refetchTodosNaoVistos } = trpc.todosPortalLoja.contarNaoVistos.useQuery(
    { token },
    { 
      enabled: !!token && !!lojaAuth,
      refetchInterval: 30000, // Atualizar a cada 30 segundos
    }
  );
  
  // Atualizar App Badge quando há tarefas não vistas
  useEffect(() => {
    if (todosNaoVistos !== undefined) {
      setAppBadge(todosNaoVistos);
    }
  }, [todosNaoVistos]);

  // Histórico de tarefas enviadas ao gestor
  const { data: historicoTarefas, refetch: refetchHistoricoTarefas } = trpc.todosPortalLoja.historicoEnviadas.useQuery(
    { token },
    { 
      enabled: !!token && !!lojaAuth,
      refetchInterval: 30000,
      staleTime: 10000,
      refetchOnWindowFocus: true,
    }
  );

  // Tarefas internas da loja
  const { data: tarefasInternas, refetch: refetchTarefasInternas } = trpc.todosPortalLoja.listarInternas.useQuery(
    { token, apenasAtivas: true },
    { 
      enabled: !!token && !!lojaAuth,
      refetchInterval: 30000,
      staleTime: 10000,
      refetchOnWindowFocus: true,
    }
  );

  // Dashboard de Resultados
  const { data: dashboardData, isLoading: dashboardLoading } = trpc.todosPortalLoja.dashboardCompleto.useQuery(
    { token, meses: mesesSelecionadosDashboard, lojaId: lojaIdAtiva },
    { enabled: !!token && !!lojaAuth && activeTab === 'resultados' && mesesSelecionadosDashboard.length > 0 }
  );

  // Volante atribuído à loja (disponível para responsável E colaborador)
  const { data: volanteAtribuido } = trpc.volantes.getVolanteByLoja.useQuery(
    { lojaId: lojaAuth?.lojaId || 0 },
    { enabled: !!lojaAuth?.lojaId }
  );

  // Pedidos de apoio ao volante (para contar pendentes)
  const { data: pedidosVolante, refetch: refetchPedidosVolante } = trpc.pedidosApoio.listarPorLoja.useQuery(
    { token },
    { enabled: !!token && !!lojaAuth && !!volanteAtribuido }
  );

  const pedidosVolantePendentes = pedidosVolante?.filter((p: any) => p.estado === 'pendente').length || 0;

  // Circulares/Documentos da loja
  const { data: circulares, isLoading: circularesLoading } = trpc.documentos.listarPorLoja.useQuery(
    { lojaId: lojaAuth?.lojaId || 0 },
    { enabled: !!lojaAuth?.lojaId && activeTab === 'circulares' }
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

  const criarPendenteMutation = trpc.reunioesQuinzenais.criarPendente.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Pendente criado!" : "Pending item created!");
      setNovoPendenteOpen(false);
      setNovoPendenteDescricao("");
      setNovoPendentePrioridade("media");
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

  // Mutation para exportar PDF via servidor
  const exportarPDFMutation = trpc.todosPortalLoja.exportarPDFResultados.useMutation({
    onSuccess: (data) => {
      // Converter base64 para blob e fazer download
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(language === 'pt' ? 'PDF exportado com sucesso!' : 'PDF exported successfully!');
      setExportandoPDF(false);
    },
    onError: (error) => {
      console.error('Erro ao exportar PDF:', error);
      toast.error(language === 'pt' ? 'Erro ao gerar PDF' : 'Error generating PDF');
      setExportandoPDF(false);
    },
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
    localStorage.removeItem("lojaAuth");
    localStorage.removeItem("volanteAuth");
    setToken("");
    setLojaAuth(null);
    setVolanteAuth(null);
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

  // Função para exportar o dashboard para PDF via servidor
  const handleExportarPDF = useCallback(async () => {
    if (!dashboardData || !token) {
      toast.error(language === 'pt' ? 'Sem dados para exportar' : 'No data to export');
      return;
    }

    setExportandoPDF(true);
    toast.info(language === 'pt' ? 'A gerar PDF profissional...' : 'Generating professional PDF...');

    exportarPDFMutation.mutate({
      token,
      meses: mesesSelecionadosDashboard,
      incluirAnaliseIA: !!analiseIA,
      lojaId: lojaIdAtiva,
    });
  }, [dashboardData, token, mesesSelecionadosDashboard, analiseIA, lojaIdAtiva, language]);

  // Tela de login - mostrar se não tiver lojaAuth NEM volanteAuth
  if (!lojaAuth && !volanteAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('portal.title')}</CardTitle>
            <CardDescription>
              {language === 'pt' ? 'Aceda ao sistema de gestão da loja' : 'Access the store management system'}
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
              disabled={autenticarMutation.isPending || isValidatingVolante}
            >
              {(autenticarMutation.isPending || isValidatingVolante) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A verificar...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              O token foi enviado para o email da loja ou volante pelo gestor de zona.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se é um volante, mostrar interface do volante
  if (volanteAuth) {
    return (
      <VolanteInterface 
        token={token}
        volanteAuth={volanteAuth}
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
        t={t}
      />
    );
  }

  const pendentesAtivos = pendentes?.filter(p => p.estado !== 'resolvido') || [];
  const reuniaoRascunho = reunioes?.find(r => r.estado === 'rascunho');

  // Garantir que lojaAuth não é null (já verificado acima)
  if (!lojaAuth) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado - escondido na tab chatbot */}
      {activeTab !== "chatbot" && (
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
              {/* Badge de tipo de acesso */}
              <Badge 
                variant="outline" 
                className={`text-xs px-2 py-0.5 border-white/50 ${
                  lojaAuth.tipoToken === 'responsavel' 
                    ? 'bg-emerald-200/30 text-white' 
                    : 'bg-amber-200/30 text-white'
                }`}
              >
                {lojaAuth.tipoToken === 'responsavel' 
                  ? (language === 'pt' ? 'Responsável' : 'Manager')
                  : (language === 'pt' ? 'Colaborador' : 'Staff')
                }
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Botão Instalar App ou Ativar Notificações - apenas mobile */}
              {!isPWAInstalled ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleInstallPWA} 
                  className="md:hidden bg-white text-green-700 hover:bg-green-50 border-white h-7 px-3 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  title={language === 'pt' ? 'Instalar App no seu dispositivo' : 'Install App on your device'}
                >
                  <Download className="h-4 w-4" />
                  <span>{language === 'pt' ? 'Instalar' : 'Install'}</span>
                </Button>
              ) : pushNotifications.isSupported && !pushNotifications.isSubscribed && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => pushNotifications.subscribe()} 
                  disabled={pushNotifications.isLoading}
                  className="md:hidden bg-white text-blue-700 hover:bg-blue-50 border-white h-7 px-3 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  title={language === 'pt' ? 'Ativar notificações de novas tarefas' : 'Enable notifications for new tasks'}
                >
                  <Bell className="h-4 w-4" />
                  <span>{pushNotifications.isLoading 
                    ? (language === 'pt' ? 'A ativar...' : 'Enabling...') 
                    : (language === 'pt' ? 'Notificações' : 'Notifications')}</span>
                </Button>
              )}
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

            {/* Card Chatbot IA - Disponível para todos */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-0"
              onClick={() => setActiveTab("chatbot")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Brain className="h-10 w-10 opacity-80" />
                  <Sparkles className="h-6 w-6 opacity-60" />
                </div>
                <h3 className="text-xl font-bold mb-2">PoweringEG</h3>
                <p className="text-sm opacity-80">{language === 'pt' ? 'Consultar dados e resultados' : 'Query data and results'}</p>
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

            {/* Card Pendentes - Apenas para Responsável */}
            {lojaAuth?.tipoToken === 'responsavel' && (
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
            )}

            {/* Card Reuniões - Apenas para Responsável */}
            {lojaAuth?.tipoToken === 'responsavel' && (
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
            )}

            {/* Card Solicitar Apoio - Disponível para Responsável E Colaborador quando tem volante atribuído */}
            {volanteAtribuido && (
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-cyan-500 to-teal-600 text-white border-0"
                onClick={() => setActiveTab("volante")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Car className="h-10 w-10 opacity-80" />
                    {pedidosVolantePendentes > 0 && (
                      <Badge className="bg-white/20 text-white border-0 text-lg px-3">
                        {pedidosVolantePendentes}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{volanteAtribuido.nome}</h3>
                  <p className="text-sm opacity-80">{language === 'pt' ? 'Pedir apoio do volante' : 'Request support from mobile team'}</p>
                </CardContent>
              </Card>
            )}

            {/* Card Circulares - Disponível para todos */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-pink-500 to-rose-600 text-white border-0"
              onClick={() => setActiveTab("circulares")}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="h-10 w-10 opacity-80" />
                </div>
                <h3 className="text-xl font-bold mb-2">{language === 'pt' ? 'Circulares' : 'Circulars'}</h3>
                <p className="text-sm opacity-80">{language === 'pt' ? 'Documentos partilhados pelos gestores' : 'Documents shared by managers'}</p>
              </CardContent>
            </Card>

            {/* Card Mapa de KLM - Disponível para todos */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0"
              onClick={() => window.open('https://mapaklmeg.netlify.app', '_blank')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <MapPin className="h-10 w-10 opacity-80" />
                </div>
                <h3 className="text-xl font-bold mb-2">{language === 'pt' ? 'Mapa de KLM' : 'KLM Map'}</h3>
                <p className="text-sm opacity-80">{language === 'pt' ? 'Consultar distâncias entre lojas' : 'Check distances between stores'}</p>
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
            {/* Botão para criar pendente (apenas responsáveis) */}
            {lojaAuth?.tipoToken === 'responsavel' && (
              <div className="flex justify-end">
                <Dialog open={novoPendenteOpen} onOpenChange={setNovoPendenteOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-600 hover:bg-amber-700">
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'pt' ? 'Novo Pendente' : 'New Pending'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {language === 'pt' ? 'Criar Novo Pendente' : 'Create New Pending Item'}
                      </DialogTitle>
                      <DialogDescription>
                        {language === 'pt' 
                          ? 'Adicione um pendente para acompanhamento da loja.' 
                          : 'Add a pending item for store follow-up.'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{language === 'pt' ? 'Descrição' : 'Description'}</Label>
                        <Textarea
                          value={novoPendenteDescricao}
                          onChange={(e) => setNovoPendenteDescricao(e.target.value)}
                          placeholder={language === 'pt' ? 'Descreva o pendente...' : 'Describe the pending item...'}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>{language === 'pt' ? 'Prioridade' : 'Priority'}</Label>
                        <Select
                          value={novoPendentePrioridade}
                          onValueChange={(v) => setNovoPendentePrioridade(v as any)}
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
                      <Button
                        variant="outline"
                        onClick={() => setNovoPendenteOpen(false)}
                      >
                        {language === 'pt' ? 'Cancelar' : 'Cancel'}
                      </Button>
                      <Button
                        onClick={() => {
                          if (!novoPendenteDescricao.trim()) {
                            toast.error(language === 'pt' ? 'Descrição é obrigatória' : 'Description is required');
                            return;
                          }
                          criarPendenteMutation.mutate({
                            token,
                            descricao: novoPendenteDescricao,
                            prioridade: novoPendentePrioridade,
                          });
                        }}
                        disabled={criarPendenteMutation.isPending}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        {criarPendenteMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        {language === 'pt' ? 'Criar Pendente' : 'Create Pending'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {pendentes?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{language === 'pt' ? 'Sem pendentes!' : 'No pending items!'}</h3>
                  <p className="text-muted-foreground">
                    {language === 'pt' 
                      ? 'Não existem pendentes atribuídos a esta loja.' 
                      : 'There are no pending items assigned to this store.'}
                  </p>
                  {lojaAuth?.tipoToken === 'responsavel' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {language === 'pt' 
                        ? 'Clique em "Novo Pendente" para adicionar um.' 
                        : 'Click "New Pending" to add one.'}
                    </p>
                  )}
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
                  canResolve={lojaAuth?.tipoToken === 'responsavel'}
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
                
                // Verificar se o mês selecionado é o mês atual
                const hoje = new Date();
                const mesAtualSelecionado = mesesSelecionadosDashboard.length === 1 && 
                  mesesSelecionadosDashboard[0].mes === (hoje.getMonth() + 1) && 
                  mesesSelecionadosDashboard[0].ano === hoje.getFullYear();
                
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
                    {/* Métricas de dias úteis - SÓ mostrar para o mês atual */}
                    {mesAtualSelecionado && (
                      <>
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
                      </>
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

      {/* Tab Volante - Calendário de Requisições */}
      {activeTab === "volante" && volanteAtribuido && (
        <VolanteTab 
          token={token}
          volanteId={volanteAtribuido.id}
          volanteNome={volanteAtribuido.nome}
          language={language}
          refetchPedidos={refetchPedidosVolante}
        />
      )}

      {/* Tab Chatbot IA - Layout igual ao portal principal */}
      {activeTab === "chatbot" && (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-3 overflow-hidden">
          {/* Header compacto - igual ao AssistenteIA */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">PoweringEG</h1>
                <p className="text-xs text-muted-foreground">
                  {language === 'pt' ? 'Conversar com o assistente inteligente' : 'Chat with the intelligent assistant'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => window.location.reload()}
              className="h-8 w-8"
              title={language === 'pt' ? 'Atualizar' : 'Refresh'}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Área de Chat - Card igual ao AssistenteIA */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardContent className="h-full flex flex-col p-3 overflow-hidden">
              <ChatbotPortalLoja 
                token={token} 
                language={language} 
                isVolante={!!volanteAuth} 
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Circulares */}
      {activeTab === "circulares" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'pt' ? 'Circulares e Documentos' : 'Circulars and Documents'}
              </CardTitle>
              <CardDescription>
                {language === 'pt' ? 'Documentos partilhados pelos gestores' : 'Documents shared by managers'}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Lista de Circulares */}
          {circularesLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                <p className="text-muted-foreground">{language === 'pt' ? 'A carregar...' : 'Loading...'}</p>
              </CardContent>
            </Card>
          ) : !circulares || circulares.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{language === 'pt' ? 'Sem documentos' : 'No documents'}</h3>
                <p className="text-muted-foreground">
                  {language === 'pt' ? 'Não existem circulares partilhadas.' : 'No circulars shared.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            circulares.map((doc: any) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-lg">
                        <FileText className="h-6 w-6 text-pink-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{doc.titulo}</h3>
                        {doc.descricao && (
                          <p className="text-sm text-muted-foreground mb-2">{doc.descricao}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(doc.createdAt).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {language === 'pt' ? 'Ver PDF' : 'View PDF'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Botão Flutuante de Acesso Rápido às Tarefas - Pulsa quando há NOVAS */}
      {activeTab !== 'tarefas' && activeTab !== 'chatbot' && activeTab !== 'circulares' && (
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
  canResolve = true,
}: {
  pendente: any;
  onAtualizar: (estado: 'pendente' | 'em_progresso' | 'resolvido', comentario?: string) => void;
  isUpdating?: boolean;
  compact?: boolean;
  canResolve?: boolean;
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
          {pendente.estado !== 'resolvido' && canResolve && (
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


// Componente VolanteTab - Calendário de Requisições de Apoio
function VolanteTab({
  token,
  volanteId,
  volanteNome,
  language,
  refetchPedidos,
}: {
  token: string;
  volanteId: number;
  volanteNome: string;
  language: string;
  refetchPedidos: () => void;
}) {
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date();
    return { mes: hoje.getMonth(), ano: hoje.getFullYear() };
  });
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'manha' | 'tarde' | 'dia_todo'>('manha');
  const [tipoApoio, setTipoApoio] = useState<'cobertura_ferias' | 'substituicao_vidros' | 'outro'>('substituicao_vidros');
  const [observacoes, setObservacoes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query para obter estado dos dias do mês
  const { data: estadoDias, refetch: refetchEstadoDias } = trpc.pedidosApoio.estadoMes.useQuery(
    { token, mes: mesSelecionado.mes + 1, ano: mesSelecionado.ano },
    { enabled: !!token }
  );

  // Query para obter pedidos da loja
  const { data: meusPedidos, refetch: refetchMeusPedidos } = trpc.pedidosApoio.listarPorLoja.useQuery(
    { token },
    { enabled: !!token }
  );

  // Mutation para criar pedido
  const criarPedidoMutation = trpc.pedidosApoio.criar.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Pedido de apoio enviado!' : 'Support request sent!');
      setDialogOpen(false);
      setDiaSelecionado(null);
      setObservacoes('');
      refetchEstadoDias();
      refetchMeusPedidos();
      refetchPedidos();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para cancelar pedido
  const cancelarPedidoMutation = trpc.pedidosApoio.cancelar.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Pedido cancelado!' : 'Request cancelled!');
      refetchEstadoDias();
      refetchMeusPedidos();
      refetchPedidos();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Gerar dias do mês
  const gerarDiasMes = () => {
    const primeiroDia = new Date(mesSelecionado.ano, mesSelecionado.mes, 1);
    const ultimoDia = new Date(mesSelecionado.ano, mesSelecionado.mes + 1, 0);
    const dias: Date[] = [];
    
    // Adicionar dias vazios para alinhar com o dia da semana
    const diaSemanaInicio = primeiroDia.getDay();
    const diasVazios = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1; // Segunda = 0
    for (let i = 0; i < diasVazios; i++) {
      dias.push(new Date(0)); // Placeholder
    }
    
    // Adicionar dias do mês
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      dias.push(new Date(mesSelecionado.ano, mesSelecionado.mes, d));
    }
    
    return dias;
  };

  const dias = gerarDiasMes();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Obter cor do dia baseado no estado
  const getCorDia = (data: Date): string => {
    if (data.getTime() === 0) return 'bg-transparent';
    
    const dataStr = data.toISOString().split('T')[0];
    const estado = estadoDias?.[dataStr];
    
    if (!estado) return 'bg-white hover:bg-gray-100';
    
    switch (estado.estado) {
      case 'pendente': return 'bg-yellow-200 hover:bg-yellow-300'; // Amarelo - pedido pendente
      case 'manha_aprovada': return 'bg-purple-300 hover:bg-purple-400'; // Roxo - manhã aprovada
      case 'tarde_aprovada': return 'bg-blue-300 hover:bg-blue-400'; // Azul - tarde aprovada
      case 'dia_completo': return 'bg-red-400 text-white cursor-not-allowed'; // Vermelho - dia completo
      default: return 'bg-white hover:bg-gray-100';
    }
  };

  // Verificar se dia está disponível
  const diaDisponivel = (data: Date): boolean => {
    if (data.getTime() === 0) return false;
    if (data < hoje) return false;
    
    const dataStr = data.toISOString().split('T')[0];
    const estado = estadoDias?.[dataStr];
    
    return !estado || estado.estado !== 'dia_completo';
  };

  // Navegar entre meses
  const mesAnterior = () => {
    setMesSelecionado(prev => {
      if (prev.mes === 0) {
        return { mes: 11, ano: prev.ano - 1 };
      }
      return { mes: prev.mes - 1, ano: prev.ano };
    });
  };

  const mesProximo = () => {
    setMesSelecionado(prev => {
      if (prev.mes === 11) {
        return { mes: 0, ano: prev.ano + 1 };
      }
      return { mes: prev.mes + 1, ano: prev.ano };
    });
  };

  const nomeMes = new Date(mesSelecionado.ano, mesSelecionado.mes).toLocaleDateString(
    language === 'pt' ? 'pt-PT' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8" />
            <div>
              <h2 className="text-xl font-bold">{volanteNome}</h2>
              <p className="text-sm opacity-90">
                {language === 'pt' ? 'Pedir apoio do volante' : 'Request mobile team support'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda de Cores */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">{language === 'pt' ? 'Legenda' : 'Legend'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-200 border"></div>
              <span>{language === 'pt' ? 'Pendente' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-300 border"></div>
              <span>{language === 'pt' ? 'Manhã aprovada' : 'Morning approved'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-300 border"></div>
              <span>{language === 'pt' ? 'Tarde aprovada' : 'Afternoon approved'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-400 border"></div>
              <span>{language === 'pt' ? 'Dia completo' : 'Full day'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendário */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={mesAnterior}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg capitalize">{nomeMes}</CardTitle>
            <Button variant="ghost" size="icon" onClick={mesProximo}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia) => (
              <div key={dia} className="text-center text-sm font-medium text-muted-foreground py-2">
                {dia}
              </div>
            ))}
          </div>
          
          {/* Dias do mês */}
          <div className="grid grid-cols-7 gap-1">
            {dias.map((data, index) => {
              const ehPlaceholder = data.getTime() === 0;
              const ehHoje = !ehPlaceholder && data.toDateString() === hoje.toDateString();
              const disponivel = diaDisponivel(data);
              const passado = !ehPlaceholder && data < hoje;
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    if (!ehPlaceholder && !passado) {
                      setDiaSelecionado(data);
                      // Se o dia está disponível, abrir dialog para criar pedido
                      // Se não está disponível (fechado), abrir dialog para ver o que tem
                      setDialogOpen(true);
                    }
                  }}
                  disabled={ehPlaceholder || passado}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition-all
                    ${ehPlaceholder ? 'invisible' : ''}
                    ${ehHoje ? 'ring-2 ring-cyan-500' : ''}
                    ${passado ? 'opacity-40 cursor-not-allowed' : ''}
                    ${getCorDia(data)}
                    ${!passado ? 'cursor-pointer' : ''}
                  `}
                >
                  {!ehPlaceholder && data.getDate()}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Meus Pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'pt' ? 'Meus Pedidos' : 'My Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!meusPedidos || meusPedidos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {language === 'pt' ? 'Nenhum pedido de apoio' : 'No support requests'}
            </p>
          ) : (
            <div className="space-y-3">
              {meusPedidos.map((pedido: any) => (
                <div
                  key={pedido.id}
                  className={`p-4 rounded-lg border ${
                    pedido.estado === 'pendente' ? 'bg-yellow-50 border-yellow-200' :
                    pedido.estado === 'aprovado' ? 'bg-green-50 border-green-200' :
                    pedido.estado === 'rejeitado' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {new Date(pedido.data).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pedido.periodo === 'manha' ? (language === 'pt' ? 'Manhã' : 'Morning') 
                          : pedido.periodo === 'tarde' ? (language === 'pt' ? 'Tarde' : 'Afternoon')
                          : (language === 'pt' ? 'Dia Todo' : 'Full Day')}
                        {' • '}
                        {pedido.tipoApoio === 'cobertura_ferias' ? (language === 'pt' ? 'Cobertura de férias' : 'Holiday cover') :
                         pedido.tipoApoio === 'substituicao_vidros' ? (language === 'pt' ? 'Substituição de vidros' : 'Glass replacement') :
                         (language === 'pt' ? 'Outro' : 'Other')}
                      </p>
                      {pedido.observacoes && (
                        <p className="text-sm mt-1">{pedido.observacoes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        pedido.estado === 'pendente' ? 'secondary' :
                        pedido.estado === 'aprovado' ? 'default' :
                        'destructive'
                      }>
                        {pedido.estado === 'pendente' ? (language === 'pt' ? 'Pendente' : 'Pending') :
                         pedido.estado === 'aprovado' ? (language === 'pt' ? 'Aprovado' : 'Approved') :
                         (language === 'pt' ? 'Rejeitado' : 'Rejected')}
                      </Badge>
                      {pedido.estado === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelarPedidoMutation.mutate({ token, pedidoId: pedido.id })}
                          disabled={cancelarPedidoMutation.isPending}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar pedido ou ver dia fechado */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {(() => {
            // Verificar se o dia está disponível
            const dataStr = diaSelecionado?.toISOString().split('T')[0];
            const estadoDia = dataStr ? estadoDias?.[dataStr] : null;
            const diaFechado = estadoDia?.estado === 'dia_completo';
            const pedidosDoDia = estadoDia?.pedidos || [];
            
            if (diaFechado) {
              // Mostrar informação do dia fechado
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      {language === 'pt' ? 'Dia Ocupado' : 'Day Occupied'}
                    </DialogTitle>
                    <DialogDescription>
                      {diaSelecionado && diaSelecionado.toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700 font-medium mb-3">
                        {language === 'pt' 
                          ? 'Este dia já está completamente ocupado. Veja os apoios agendados:'
                          : 'This day is fully booked. See scheduled support:'}
                      </p>
                      <div className="space-y-2">
                        {pedidosDoDia.filter((p: any) => p.estado === 'aprovado').map((pedido: any, idx: number) => (
                          <div key={idx} className="bg-white rounded p-3 border">
                            <p className="font-medium text-sm">{pedido.loja?.nome || 'Loja'}</p>
                            <p className="text-xs text-gray-500">
                              {pedido.periodo === 'manha' ? (language === 'pt' ? 'Manhã (9h-13h)' : 'Morning') 
                                : pedido.periodo === 'tarde' ? (language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon')
                                : (language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day')}
                              {' • '}
                              {pedido.tipoApoio === 'cobertura_ferias' ? (language === 'pt' ? 'Cobertura de férias' : 'Holiday cover') :
                               pedido.tipoApoio === 'substituicao_vidros' ? (language === 'pt' ? 'Substituição de vidros' : 'Glass replacement') :
                               (language === 'pt' ? 'Outro' : 'Other')}
                            </p>
                            {pedido.observacoes && (
                              <p className="text-xs text-gray-400 mt-1">{pedido.observacoes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      {language === 'pt' ? 'Fechar' : 'Close'}
                    </Button>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setDialogOpen(false);
                        // Scroll para a secção de serviços
                        setTimeout(() => {
                          const el = document.getElementById('registar-servicos-hoje');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 300);
                      }}
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      {language === 'pt' ? 'Registar Serviços' : 'Register Services'}
                    </Button>
                  </DialogFooter>
                </>
              );
            }
            
            // Formulário para criar pedido
            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {language === 'pt' ? 'Pedir Apoio' : 'Request Support'}
                  </DialogTitle>
                  <DialogDescription>
                    {diaSelecionado && diaSelecionado.toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Mostrar aviso se algum período já está ocupado */}
                  {estadoDia?.estado === 'manha_ocupada' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
                      {language === 'pt' ? 'A manhã deste dia já está ocupada' : 'Morning is already booked'}
                    </div>
                  )}
                  {estadoDia?.estado === 'tarde_ocupada' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                      {language === 'pt' ? 'A tarde deste dia já está ocupada' : 'Afternoon is already booked'}
                    </div>
                  )}
                  
                  {/* Período */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {language === 'pt' ? 'Período' : 'Period'}
                    </label>
                    <Select value={periodoSelecionado} onValueChange={(v) => setPeriodoSelecionado(v as 'manha' | 'tarde' | 'dia_todo')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manha" disabled={estadoDia?.estado === 'manha_ocupada'}>
                          {language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)'}
                          {estadoDia?.estado === 'manha_ocupada' && ' ✘'}
                        </SelectItem>
                        <SelectItem value="tarde" disabled={estadoDia?.estado === 'tarde_ocupada'}>
                          {language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)'}
                          {estadoDia?.estado === 'tarde_ocupada' && ' ✘'}
                        </SelectItem>
                        <SelectItem value="dia_todo" disabled={estadoDia?.estado !== undefined && estadoDia?.estado !== 'livre'}>
                          {language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9am-6pm)'}
                          {estadoDia?.estado !== undefined && estadoDia?.estado !== 'livre' && ' ✘'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo de Apoio */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {language === 'pt' ? 'Tipo de Apoio' : 'Support Type'}
                    </label>
                    <Select value={tipoApoio} onValueChange={(v) => setTipoApoio(v as typeof tipoApoio)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="substituicao_vidros">
                          {language === 'pt' ? 'Substituição de vidros' : 'Glass replacement'}
                        </SelectItem>
                        <SelectItem value="cobertura_ferias">
                          {language === 'pt' ? 'Cobertura de férias' : 'Holiday cover'}
                        </SelectItem>
                        <SelectItem value="outro">
                          {language === 'pt' ? 'Outro' : 'Other'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {language === 'pt' ? 'Observações' : 'Notes'}
                    </label>
                    <Textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder={language === 'pt' ? 'Ex: 3 para-brisas' : 'Ex: 3 windshields'}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {language === 'pt' ? 'Cancelar' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={() => {
                      if (diaSelecionado) {
                        // Verificar se o dia está bloqueado
                        const dataStr = diaSelecionado.toISOString().split('T')[0];
                        const estadoDia = estadoDias?.[dataStr];
                        const bloqueiosDia = estadoDia?.bloqueios || [];
                        
                        // Verificar se o período está bloqueado
                        const periodoBloqueado = bloqueiosDia.some((b: any) => 
                          b.periodo === periodoSelecionado || b.periodo === 'dia_todo' || periodoSelecionado === 'dia_todo'
                        );
                        
                        if (periodoBloqueado) {
                          toast.error(language === 'pt' 
                            ? 'Este dia/período está bloqueado pelo volante. Por favor, escolha outro dia.'
                            : 'This day/period is blocked by the mobile unit. Please choose another day.'
                          );
                          return;
                        }
                        
                        criarPedidoMutation.mutate({
                          token,
                          data: diaSelecionado.toISOString(),
                          periodo: periodoSelecionado,
                          tipoApoio,
                          observacoes: observacoes || undefined,
                        });
                      }
                    }}
                    disabled={criarPedidoMutation.isPending}
                  >
                    {criarPedidoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {language === 'pt' ? 'Enviar Pedido' : 'Send Request'}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ==================== INTERFACE DO VOLANTE ====================
function VolanteInterface({
  token,
  volanteAuth,
  onLogout,
  language,
  setLanguage,
  t,
}: {
  token: string;
  volanteAuth: VolanteAuth;
  onLogout: () => void;
  language: 'pt' | 'en';
  setLanguage: (lang: 'pt' | 'en') => void;
  t: (key: string) => string;
}) {
  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState<"menu" | "agenda" | "resultados" | "historico" | "dashboard" | "circulares" | "configuracoes">("menu");
  const [activeTab, setActiveTab] = useState<"agenda" | "resultados">("agenda");
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date();
    return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
  });
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any>(null);
  const [motivoReprovacao, setMotivoReprovacao] = useState("");
  const [reprovarDialogOpen, setReprovarDialogOpen] = useState(false);
  const [anularDialogOpen, setAnularDialogOpen] = useState(false);
  const [editarDialogOpen, setEditarDialogOpen] = useState(false);
  const [motivoAnulacao, setMotivoAnulacao] = useState("");
  const [editarData, setEditarData] = useState("");
  const [editarPeriodo, setEditarPeriodo] = useState<'manha' | 'tarde' | 'dia_todo'>('manha');
  const [editarTipoApoio, setEditarTipoApoio] = useState<'cobertura_ferias' | 'substituicao_vidros' | 'outro'>('cobertura_ferias');
  const [editarObservacoes, setEditarObservacoes] = useState("");
  const [lojaResultadosSelecionada, setLojaResultadosSelecionada] = useState<number | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [mesesSelecionadosVolante, setMesesSelecionadosVolante] = useState<Array<{mes: number; ano: number}>>(() => {
    const hoje = new Date();
    return [{ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }];
  });
  const [diaDetalheOpen, setDiaDetalheOpen] = useState(false);
  const [diaDetalheSelecionado, setDiaDetalheSelecionado] = useState<{data: string; pedidos: any[]; bloqueios?: any[]; agendamentos?: any[]}>({ data: '', pedidos: [], bloqueios: [], agendamentos: [] });
  
  // Estados para criar agendamento
  const [criarAgendamentoOpen, setCriarAgendamentoOpen] = useState(false);
  const [novoAgendamentoData, setNovoAgendamentoData] = useState('');
  const [novoAgendamentoPeriodo, setNovoAgendamentoPeriodo] = useState<'manha' | 'tarde' | 'dia_todo'>('manha');
  const [novoAgendamentoLojaId, setNovoAgendamentoLojaId] = useState<number | null>(null);
  const [novoAgendamentoTipoApoio, setNovoAgendamentoTipoApoio] = useState<'cobertura_ferias' | 'substituicao_vidros' | 'outro' | null>(null);
  const [novoAgendamentoTitulo, setNovoAgendamentoTitulo] = useState('');
  const [novoAgendamentoDescricao, setNovoAgendamentoDescricao] = useState('');
  
  // Estados para editar agendamento
  const [editarAgendamentoOpen, setEditarAgendamentoOpen] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [editarAgendamentoData, setEditarAgendamentoData] = useState('');
  const [editarAgendamentoPeriodo, setEditarAgendamentoPeriodo] = useState<'manha' | 'tarde' | 'dia_todo'>('manha');
  const [editarAgendamentoLojaId, setEditarAgendamentoLojaId] = useState<number | null>(null);
  const [editarAgendamentoTipoApoio, setEditarAgendamentoTipoApoio] = useState<'cobertura_ferias' | 'substituicao_vidros' | 'outro' | null>(null);
  const [editarAgendamentoTitulo, setEditarAgendamentoTitulo] = useState('');
  const [editarAgendamentoDescricao, setEditarAgendamentoDescricao] = useState('');
  
  // Estados para bloquear dia
  const [bloquearDiaOpen, setBloquearDiaOpen] = useState(false);
  const [bloqueioData, setBloqueioData] = useState('');
  const [bloqueioPeriodo, setBloqueioPeriodo] = useState<'manha' | 'tarde' | 'dia_todo'>('dia_todo');
  const [bloqueioTipo, setBloqueioTipo] = useState<'ferias' | 'falta' | 'formacao' | 'pessoal' | 'outro'>('ferias');
  const [bloqueioMotivo, setBloqueioMotivo] = useState('');

  // Query para obter pedidos de apoio do volante
  const { data: pedidosApoio, refetch: refetchPedidos, isLoading: loadingPedidos } = trpc.pedidosApoio.listarPorVolante.useQuery(
    { token },
    { enabled: !!token }
  );

  // Query para obter estado dos dias do mês (calendário)
  const { data: estadoMes, refetch: refetchEstadoMes } = trpc.pedidosApoio.estadoCompletoMes.useQuery(
    { token, ano: mesSelecionado.ano, mes: mesSelecionado.mes },
    { enabled: !!token }
  );

  // Query para obter resultados das lojas (lista simples)
  const { data: resultadosLojas, isLoading: loadingResultados } = trpc.portalVolante.resultadosLojas.useQuery(
    { token, ano: mesSelecionado.ano, mes: mesSelecionado.mes },
    { enabled: !!token && activeView === "resultados" && !lojaResultadosSelecionada }
  );

  // Query para obter dashboard completo de uma loja específica
  const { data: dashboardLojaVolante, isLoading: loadingDashboardLoja } = trpc.portalVolante.dashboardLoja.useQuery(
    { token, lojaId: lojaResultadosSelecionada!, meses: mesesSelecionadosVolante },
    { enabled: !!token && activeView === "resultados" && !!lojaResultadosSelecionada && mesesSelecionadosVolante.length > 0 }
  );

  // Query para obter configurações do Telegram
  const { data: telegramConfig, refetch: refetchTelegramConfig } = trpc.portalVolante.getTelegramConfig.useQuery(
    { token },
    { enabled: !!token && activeView === "configuracoes" }
  );
  
  // Queries para estatísticas de serviços realizados (Dashboard)
  const mesesFormatados = mesesSelecionadosVolante.map(m => `${m.ano}-${String(m.mes).padStart(2, '0')}`);
  
  const { data: estatisticasServicos, isLoading: loadingServicos } = trpc.portalVolante.getEstatisticasServicos.useQuery(
    { token, mesesSelecionados: mesesFormatados },
    { enabled: !!token && activeView === "dashboard" }
  );
  
  const { data: topLojasServicos } = trpc.portalVolante.getTopLojasServicos.useQuery(
    { token, limit: 5, mesesSelecionados: mesesFormatados },
    { enabled: !!token && activeView === "dashboard" }
  );
  
  // Mutation para exportar dashboard para PDF
  const exportarDashboardPDFMutation = trpc.portalVolante.exportarDashboardPDF.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(language === 'pt' ? 'PDF exportado com sucesso!' : 'PDF exported successfully!');
    },
    onError: (error) => {
      console.error('Erro ao exportar PDF:', error);
      toast.error(language === 'pt' ? 'Erro ao exportar PDF' : 'Error exporting PDF');
    },
  });

  // Atualizar estados quando telegramConfig mudar
  useEffect(() => {
    if (telegramConfig) {
      setTelegramChatId(telegramConfig.telegramChatId || "");
      setTelegramUsername(telegramConfig.telegramUsername || "");
    }
  }, [telegramConfig]);

  // Mutation para configurar Telegram
  const configurarTelegramMutation = trpc.portalVolante.configurarTelegram.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Telegram configurado com sucesso!' : 'Telegram configured successfully!');
      refetchTelegramConfig();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Mutation para testar notificações
  const testarNotificacoesMutation = trpc.portalVolante.testarNotificacoes.useMutation({
    onSuccess: (data) => {
      if (data.enviados > 0) {
        toast.success(
          language === 'pt' 
            ? `Notificações enviadas com sucesso! (${data.enviados}/${data.total})` 
            : `Notifications sent successfully! (${data.enviados}/${data.total})`
        );
      } else {
        toast.info(
          language === 'pt' 
            ? data.mensagem || 'Nenhuma notificação enviada' 
            : data.mensagem || 'No notifications sent'
        );
      }
      
      if (data.erros && data.erros.length > 0) {
        toast.warning(
          language === 'pt' 
            ? `Alguns erros: ${data.erros.join(', ')}` 
            : `Some errors: ${data.erros.join(', ')}`
        );
      }
    },
    onError: (error: any) => {
      toast.error(
        language === 'pt' 
          ? `Erro ao enviar notificações: ${error.message}` 
          : `Error sending notifications: ${error.message}`
      );
    },
  });

  // Mutation para aprovar pedido
  const aprovarMutation = trpc.pedidosApoio.aprovar.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Pedido aprovado com sucesso!' : 'Request approved successfully!');
      refetchPedidos();
      refetchEstadoMes();
      setPedidoSelecionado(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para anular pedido
  const anularMutation = trpc.portalVolante.anularPedido.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Pedido anulado com sucesso!' : 'Request cancelled successfully!');
      refetchPedidos();
      refetchEstadoMes();
      setPedidoSelecionado(null);
      setAnularDialogOpen(false);
      setMotivoAnulacao("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para editar pedido
  const editarMutation = trpc.portalVolante.editarPedido.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Pedido atualizado com sucesso!' : 'Request updated successfully!');
      refetchPedidos();
      refetchEstadoMes();
      setPedidoSelecionado(null);
      setEditarDialogOpen(false);
      setEditarData("");
      setEditarPeriodo('manha');
      setEditarTipoApoio('cobertura_ferias');
      setEditarObservacoes("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para reprovar pedido
  const reprovarMutation = trpc.pedidosApoio.reprovar.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Pedido reprovado' : 'Request rejected');
      refetchPedidos();
      refetchEstadoMes();
      setPedidoSelecionado(null);
      setReprovarDialogOpen(false);
      setMotivoReprovacao("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para criar agendamento pelo volante
  const criarAgendamentoMutation = trpc.pedidosApoio.criarAgendamento.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Agendamento criado com sucesso!' : 'Appointment created successfully!');
      refetchPedidos();
      refetchEstadoMes();
      setCriarAgendamentoOpen(false);
      setNovoAgendamentoData('');
      setNovoAgendamentoPeriodo('manha');
      setNovoAgendamentoLojaId(null);
      setNovoAgendamentoTipoApoio(null);
      setNovoAgendamentoTitulo('');
      setNovoAgendamentoDescricao('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para eliminar agendamento
  const eliminarAgendamentoMutation = trpc.pedidosApoio.eliminarAgendamento.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Agendamento eliminado!' : 'Appointment deleted!');
      refetchPedidos();
      refetchEstadoMes();
      setDiaDetalheOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para editar agendamento
  const editarAgendamentoMutation = trpc.pedidosApoio.editarAgendamento.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Agendamento atualizado!' : 'Appointment updated!');
      refetchPedidos();
      refetchEstadoMes();
      setEditarAgendamentoOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para criar bloqueio
  const criarBloqueioMutation = trpc.pedidosApoio.criarBloqueio.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Dia bloqueado com sucesso!' : 'Day blocked successfully!');
      refetchPedidos();
      refetchEstadoMes();
      setBloquearDiaOpen(false);
      setBloqueioData('');
      setBloqueioPeriodo('dia_todo');
      setBloqueioTipo('ferias');
      setBloqueioMotivo('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para eliminar bloqueio
  const eliminarBloqueioMutation = trpc.pedidosApoio.eliminarBloqueio.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Bloqueio removido!' : 'Block removed!');
      refetchPedidos();
      refetchEstadoMes();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Agrupar pedidos por estado
  const pedidosPendentes = pedidosApoio?.filter((p: any) => p.estado === 'pendente') || [];
  // Próximos apoios: apenas aprovados com data >= hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  // Todos os pedidos aprovados (incluindo históricos) para dashboard
  const todosAprovados = pedidosApoio?.filter((p: any) => p.estado === 'aprovado').sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime()) || [];
  
  // Pedidos aprovados futuros para calendário
  const pedidosAprovados = pedidosApoio?.filter((p: any) => {
    if (p.estado !== 'aprovado') return false;
    const dataPedido = new Date(p.data);
    dataPedido.setHours(0, 0, 0, 0);
    return dataPedido >= hoje;
  }).sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime()) || [];
  const pedidosReprovados = pedidosApoio?.filter((p: any) => p.estado === 'reprovado') || [];

  // Função para gerar links de calendário
  const gerarLinksCalendario = (pedido: any) => {
    const dataInicio = new Date(pedido.data);
    const horaInicio = pedido.periodo === 'manha' ? 9 : pedido.periodo === 'tarde' ? 14 : 9;
    const horaFim = pedido.periodo === 'manha' ? 13 : pedido.periodo === 'tarde' ? 18 : 18;
    
    dataInicio.setHours(horaInicio, 0, 0, 0);
    const dataFim = new Date(dataInicio);
    dataFim.setHours(horaFim, 0, 0, 0);

    const titulo = encodeURIComponent(`Apoio: ${pedido.loja?.nome || 'Loja'} - ${pedido.tipoApoio === 'cobertura_ferias' ? 'Cobertura Férias' : pedido.tipoApoio === 'substituicao_vidros' ? 'Substituição Vidros' : 'Outro'}`);
    const descricao = encodeURIComponent(pedido.observacoes || '');
    const local = encodeURIComponent(pedido.loja?.nome || '');

    // Formato para Google Calendar
    const formatoGoogle = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${formatoGoogle(dataInicio)}/${formatoGoogle(dataFim)}&details=${descricao}&location=${local}`;

    // Formato para Outlook
    const formatoOutlook = (date: Date) => date.toISOString();
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${titulo}&startdt=${formatoOutlook(dataInicio)}&enddt=${formatoOutlook(dataFim)}&body=${descricao}&location=${local}`;

    // Formato ICS (Apple Calendar)
    const formatoICS = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatoICS(dataInicio)}
DTEND:${formatoICS(dataFim)}
SUMMARY:${decodeURIComponent(titulo)}
DESCRIPTION:${decodeURIComponent(descricao)}
LOCATION:${decodeURIComponent(local)}
END:VEVENT
END:VCALENDAR`;
    const icsBlob = new Blob([icsContent], { type: 'text/calendar' });
    const icsUrl = URL.createObjectURL(icsBlob);

    return { googleUrl, outlookUrl, icsUrl };
  };

  // Renderizar calendário
  const renderCalendario = () => {
    const primeiroDia = new Date(mesSelecionado.ano, mesSelecionado.mes - 1, 1);
    const ultimoDia = new Date(mesSelecionado.ano, mesSelecionado.mes, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();

    const dias = [];
    
    // Dias vazios no início
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(<div key={`empty-${i}`} className="h-20 bg-gray-50 rounded-lg"></div>);
    }

    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataStr = `${mesSelecionado.ano}-${String(mesSelecionado.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const estadoDia = estadoMes?.[dataStr];
      // Filtrar pedidos rejeitados - não devem aparecer no calendário
      const todosPedidosDia = estadoDia?.pedidos || [];
      const pedidosDia = todosPedidosDia.filter((p: any) => p.estado !== 'reprovado' && p.estado !== 'anulado' && p.estado !== 'cancelado');
      // Obter agendamentos do volante
      const agendamentosDia = estadoDia?.agendamentos || [];
      // Obter bloqueios
      const bloqueiosDia = estadoDia?.bloqueios || [];
      
      let bgColor = 'bg-white';
      let borderColor = 'border-gray-200';
      
      // Recalcular estado baseado em pedidos, agendamentos e bloqueios
      const pedidosAprovados = pedidosDia.filter((p: any) => p.estado === 'aprovado');
      const manhaAprovada = pedidosAprovados.some((p: any) => p.periodo === 'manha');
      const tardeAprovada = pedidosAprovados.some((p: any) => p.periodo === 'tarde');
      const diaTodoAprovado = pedidosAprovados.some((p: any) => p.periodo === 'dia_todo');
      const temPendente = pedidosDia.some((p: any) => p.estado === 'pendente');
      
      // Verificar agendamentos do volante
      const manhaAgendada = agendamentosDia.some((a: any) => a.agendamento_volante_periodo === 'manha' || a.agendamento_volante_periodo === 'dia_todo');
      const tardeAgendada = agendamentosDia.some((a: any) => a.agendamento_volante_periodo === 'tarde' || a.agendamento_volante_periodo === 'dia_todo');
      const diaTodoAgendado = agendamentosDia.some((a: any) => a.agendamento_volante_periodo === 'dia_todo');
      
      // Verificar bloqueios
      const manhaBloqueada = bloqueiosDia.some((b: any) => b.periodo === 'manha' || b.periodo === 'dia_todo');
      const tardeBloqueada = bloqueiosDia.some((b: any) => b.periodo === 'tarde' || b.periodo === 'dia_todo');
      const diaTodoBloqueado = bloqueiosDia.some((b: any) => b.periodo === 'dia_todo');
      
      // Determinar cor de fundo baseado no estado
      // PRIORIDADE 1: Bloqueios (sempre cinza)
      if (diaTodoBloqueado || (manhaBloqueada && tardeBloqueada)) {
        bgColor = 'bg-gray-300';
        borderColor = 'border-gray-500';
      } else if (manhaBloqueada && !tardeAprovada && !tardeAgendada) {
        // Manhã bloqueada, tarde livre
        bgColor = 'bg-gray-200';
        borderColor = 'border-gray-400';
      } else if (tardeBloqueada && !manhaAprovada && !manhaAgendada) {
        // Tarde bloqueada, manhã livre
        bgColor = 'bg-gray-200';
        borderColor = 'border-gray-400';
      }
      // PRIORIDADE 2: Dia completo ocupado (pedidos + agendamentos)
      else if (diaTodoAprovado || diaTodoAgendado || (manhaAprovada && tardeAprovada) || (manhaAgendada && tardeAgendada) || 
               (manhaAprovada && tardeAgendada) || (manhaAgendada && tardeAprovada)) {
        bgColor = 'bg-red-100';
        borderColor = 'border-red-300';
      }
      // PRIORIDADE 3: Bloqueio parcial + ocupação parcial
      else if ((manhaBloqueada && (tardeAprovada || tardeAgendada)) || (tardeBloqueada && (manhaAprovada || manhaAgendada))) {
        bgColor = 'bg-orange-100';
        borderColor = 'border-orange-300';
      }
      // PRIORIDADE 4: Períodos individuais aprovados
      else if (manhaAprovada) {
        bgColor = 'bg-purple-100';
        borderColor = 'border-purple-300';
      } else if (tardeAprovada) {
        bgColor = 'bg-blue-100';
        borderColor = 'border-blue-300';
      }
      // PRIORIDADE 5: Períodos individuais agendados
      else if (manhaAgendada) {
        bgColor = 'bg-teal-100';
        borderColor = 'border-teal-300';
      } else if (tardeAgendada) {
        bgColor = 'bg-teal-100';
        borderColor = 'border-teal-300';
      }
      // PRIORIDADE 6: Pendentes
      else if (temPendente) {
        bgColor = 'bg-yellow-100';
        borderColor = 'border-yellow-300';
      }

      const handleDiaClick = () => {
        if (pedidosDia.length > 0 || agendamentosDia.length > 0 || bloqueiosDia.length > 0) {
          setDiaDetalheSelecionado({ data: dataStr, pedidos: pedidosDia, bloqueios: bloqueiosDia, agendamentos: agendamentosDia });
          setDiaDetalheOpen(true);
        }
      };

      // Combinar pedidos e agendamentos para mostrar no calendário
      const itensParaMostrar = [
        ...pedidosDia.map((p: any) => ({ tipo: 'pedido', ...p })),
        ...agendamentosDia.map((a: any) => ({ tipo: 'agendamento', ...a })),
        ...bloqueiosDia.map((b: any) => ({ tipo: 'bloqueio', ...b }))
      ];

      dias.push(
        <div 
          key={dia} 
          className={`h-20 ${bgColor} border ${borderColor} rounded-lg p-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
          onClick={handleDiaClick}
        >
          <div className="text-xs font-medium text-gray-700 mb-0.5">{dia}</div>
          <div className="space-y-0.5">
            {itensParaMostrar.slice(0, 2).map((item: any, idx: number) => (
              <div 
                key={idx}
                className={`text-[10px] px-1 py-0.5 rounded truncate ${
                  item.tipo === 'bloqueio' ? 'bg-gray-400 text-white' :
                  item.tipo === 'agendamento' ? 'bg-teal-400 text-white' :
                  item.estado === 'pendente' ? 'bg-yellow-300 text-yellow-900' :
                  item.estado === 'aprovado' ? (item.periodo === 'manha' ? 'bg-purple-400 text-white' : item.periodo === 'tarde' ? 'bg-blue-400 text-white' : 'bg-green-400 text-white') :
                  'bg-gray-300 text-gray-700'
                }`}
                title={item.tipo === 'bloqueio' ? `Bloqueado - ${item.tipo}` : item.tipo === 'agendamento' ? `${item.loja?.nome || item.titulo || 'Agendamento'} - ${item.agendamento_volante_periodo === 'manha' ? 'Manhã' : item.agendamento_volante_periodo === 'tarde' ? 'Tarde' : 'Dia Todo'}` : `${item.loja?.nome || 'Loja'} - ${item.periodo === 'manha' ? 'Manhã' : item.periodo === 'tarde' ? 'Tarde' : 'Dia Todo'}`}
              >
                {item.tipo === 'bloqueio' ? 'Bloqueado' : item.tipo === 'agendamento' ? (item.loja?.nome?.substring(0, 8) || item.titulo?.substring(0, 8) || 'Agend.') : (item.loja?.nome?.substring(0, 8) || 'Loja')}
              </div>
            ))}
            {itensParaMostrar.length > 2 && (
              <div className="text-[10px] text-gray-500">+{itensParaMostrar.length - 2}</div>
            )}
          </div>
        </div>
      );
    }

    return dias;
  };

  const nomesMeses = language === 'pt' 
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const diasSemana = language === 'pt'
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Se está na vista de menu, mostrar os dois cards de entrada
  if (activeView === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex flex-col p-4">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{volanteAuth.volanteNome}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {volanteAuth.lojasAtribuidas.length} {language === 'pt' ? 'lojas atribuídas' : 'assigned stores'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Toggle Tema */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:text-gray-400 dark:hover:text-gray-200"
                title={theme === 'light' ? (language === 'pt' ? 'Modo Escuro' : 'Dark Mode') : (language === 'pt' ? 'Modo Claro' : 'Light Mode')}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              {/* Seletor Idioma */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:text-gray-400 dark:hover:text-gray-200"
                title={language === 'pt' ? 'English' : 'Português'}
              >
                <Globe className="h-4 w-4" />
              </Button>
              {/* Logout */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onLogout}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:text-gray-400 dark:hover:text-gray-200"
                title={language === 'pt' ? 'Sair' : 'Logout'}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            {language === 'pt' ? 'O que pretende fazer?' : 'What would you like to do?'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'pt' ? 'Selecione uma opção para continuar' : 'Select an option to continue'}
          </p>
        </div>

        {/* Cards Selecionáveis */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
            {/* Card Calendário */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-teal-400 group"
              onClick={() => setActiveView("agenda")}
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50 transition-colors">
                  <Calendar className="h-12 w-12 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {language === 'pt' ? 'Calendário' : 'Calendar'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'pt' ? 'Agenda de apoios e pedidos pendentes' : 'Support schedule and pending requests'}
                </p>
                {pedidosPendentes.length > 0 && (
                  <Badge className="mt-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {pedidosPendentes.length} {language === 'pt' ? 'pendente(s)' : 'pending'}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Card Resultados */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-blue-400 group"
              onClick={() => setActiveView("resultados")}
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <BarChart3 className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {language === 'pt' ? 'Resultados' : 'Results'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'pt' ? 'Faturação e serviços das lojas' : 'Store revenue and services'}
                </p>
              </div>
            </Card>

            {/* Card Histórico */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-orange-400 group"
              onClick={() => setActiveView("historico")}
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                  <History className="h-12 w-12 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {language === 'pt' ? 'Histórico' : 'History'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'pt' ? 'Apoios realizados e concluídos' : 'Completed support visits'}
                </p>
                {pedidosAprovados.length > 0 && (
                  <Badge className="mt-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {pedidosAprovados.length} {language === 'pt' ? 'realizado(s)' : 'completed'}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Card Dashboard */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-purple-400 group"
              onClick={() => setActiveView("dashboard")}
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <BarChart3 className="h-12 w-12 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {language === 'pt' ? 'Dashboard' : 'Dashboard'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'pt' ? 'Estatísticas e gráficos de atividade' : 'Activity statistics and charts'}
                </p>
              </div>
            </Card>

            {/* Card Circulares */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-green-400 group"
              onClick={() => setActiveView("circulares")}
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                  <FileText className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {language === 'pt' ? 'Circulares' : 'Circulars'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'pt' ? 'Documentos e informações importantes' : 'Important documents and information'}
                </p>
              </div>
            </Card>

            {/* Card Configurações */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-400 group"
              onClick={() => setActiveView("configuracoes")}
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                  <Settings className="h-12 w-12 text-gray-600 dark:text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {language === 'pt' ? 'Configurações' : 'Settings'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'pt' ? 'Notificações Telegram' : 'Telegram notifications'}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-gray-400 dark:text-gray-500 text-xs text-center mt-6">
          PoweringEG Platform 2.0 - {language === 'pt' ? 'a IA ao serviço da ExpressGlass' : 'AI at the service of ExpressGlass'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-teal-600 text-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveView("menu")}
                className="text-white hover:bg-white/20 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{volanteAuth.volanteNome}</h1>
                <p className="text-xs text-teal-100">
                  {activeView === "agenda" 
                    ? (language === 'pt' ? 'Calendário de Apoios' : 'Support Calendar')
                    : activeView === "historico"
                      ? (language === 'pt' ? 'Histórico de Apoios' : 'Support History')
                      : activeView === "dashboard"
                        ? (language === 'pt' ? 'Dashboard de Estatísticas' : 'Statistics Dashboard')
                        : activeView === "circulares"
                          ? (language === 'pt' ? 'Circulares e Documentos' : 'Circulars and Documents')
                          : activeView === "historico-servicos"
                            ? (language === 'pt' ? 'Histórico de Serviços' : 'Service History')
                            : activeView === "configuracoes"
                              ? (language === 'pt' ? 'Configurações' : 'Settings')
                              : (language === 'pt' ? 'Resultados das Lojas' : 'Store Results')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Toggle Tema */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                title={theme === 'light' ? (language === 'pt' ? 'Modo Escuro' : 'Dark Mode') : (language === 'pt' ? 'Modo Claro' : 'Light Mode')}
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              {/* Seletor Idioma */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                title={language === 'pt' ? 'English' : 'Português'}
              >
                <Globe className="h-4 w-4" />
              </Button>
              {/* Logout */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onLogout}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                title={language === 'pt' ? 'Sair' : 'Logout'}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {activeView === "agenda" && (
          <div className="space-y-6">
            {/* Pedidos Pendentes */}
            {pedidosPendentes.length > 0 && (
              <Card className="border-yellow-300 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Clock className="h-5 w-5" />
                    {language === 'pt' ? 'Pedidos Pendentes' : 'Pending Requests'} ({pedidosPendentes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pedidosPendentes.map((pedido: any) => (
                      <div 
                        key={pedido.id} 
                        className="bg-white p-4 rounded-lg border border-yellow-200 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{pedido.loja?.nome || 'Loja'}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(pedido.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                              {' - '}
                              <Badge variant="outline" className={pedido.periodo === 'manha' ? 'bg-purple-100 text-purple-800' : pedido.periodo === 'tarde' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                {pedido.periodo === 'manha' ? (language === 'pt' ? 'Manhã' : 'Morning') : pedido.periodo === 'tarde' ? (language === 'pt' ? 'Tarde' : 'Afternoon') : (language === 'pt' ? 'Dia Todo' : 'Full Day')}
                              </Badge>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {pedido.tipoApoio === 'cobertura_ferias' ? (language === 'pt' ? 'Cobertura de Férias' : 'Vacation Coverage') :
                               pedido.tipoApoio === 'substituicao_vidros' ? (language === 'pt' ? 'Substituição de Vidros' : 'Glass Replacement') :
                               (language === 'pt' ? 'Outro' : 'Other')}
                            </p>
                            {pedido.observacoes && (
                              <p className="text-sm text-gray-600 mt-1 italic">"{pedido.observacoes}"</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => {
                                setPedidoSelecionado(pedido);
                                setReprovarDialogOpen(true);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => aprovarMutation.mutate({ token, pedidoId: pedido.id })}
                              disabled={aprovarMutation.isPending}
                            >
                              {aprovarMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Registar Serviços de Hoje */}
            <div id="registar-servicos-hoje">
            <RegistarServicosHoje 
              token={token}
              volanteAuth={volanteAuth}
              language={language}
            />
            </div>

            {/* Calendário */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {language === 'pt' ? 'Calendário de Apoios' : 'Support Calendar'}
                  </CardTitle>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => {
                        const novoMes = mesSelecionado.mes === 1 ? 12 : mesSelecionado.mes - 1;
                        const novoAno = mesSelecionado.mes === 1 ? mesSelecionado.ano - 1 : mesSelecionado.ano;
                        setMesSelecionado({ mes: novoMes, ano: novoAno });
                      }}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold text-lg min-w-[160px] text-center">
                      {nomesMeses[mesSelecionado.mes - 1]} {mesSelecionado.ano}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => {
                        const novoMes = mesSelecionado.mes === 12 ? 1 : mesSelecionado.mes + 1;
                        const novoAno = mesSelecionado.mes === 12 ? mesSelecionado.ano + 1 : mesSelecionado.ano;
                        setMesSelecionado({ mes: novoMes, ano: novoAno });
                      }}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                {/* Botões de Ação */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => {
                      setNovoAgendamentoData('');
                      setNovoAgendamentoPeriodo('manha');
                      setNovoAgendamentoLojaId(null);
                      setNovoAgendamentoTipoApoio(null);
                      setNovoAgendamentoTitulo('');
                      setNovoAgendamentoDescricao('');
                      setCriarAgendamentoOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {language === 'pt' ? 'Criar Agendamento' : 'Create Appointment'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-400 text-gray-700"
                    onClick={() => {
                      setBloqueioData('');
                      setBloqueioPeriodo('dia_todo');
                      setBloqueioTipo('ferias');
                      setBloqueioMotivo('');
                      setBloquearDiaOpen(true);
                    }}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    {language === 'pt' ? 'Bloquear Dia' : 'Block Day'}
                  </Button>
                </div>
                {/* Legenda */}
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-300 rounded"></div>
                    <span>{language === 'pt' ? 'Pendente' : 'Pending'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-400 rounded"></div>
                    <span>{language === 'pt' ? 'Manhã Aprovada' : 'Morning Approved'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-400 rounded"></div>
                    <span>{language === 'pt' ? 'Tarde Aprovada' : 'Afternoon Approved'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-300 rounded"></div>
                    <span>{language === 'pt' ? 'Dia Completo' : 'Full Day'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-400 rounded"></div>
                    <span>{language === 'pt' ? 'Bloqueado' : 'Blocked'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-teal-400 rounded"></div>
                    <span>{language === 'pt' ? 'Agendamento Próprio' : 'Own Appointment'}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {diasSemana.map(dia => (
                    <div key={dia} className="text-center text-xs font-medium text-gray-500 py-2">
                      {dia}
                    </div>
                  ))}
                </div>
                {/* Grid do calendário */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendario()}
                </div>
              </CardContent>
            </Card>

            {/* Próximos Apoios Aprovados */}
            {pedidosAprovados.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Check className="h-5 w-5" />
                    {language === 'pt' ? 'Próximos Apoios' : 'Upcoming Support'} ({pedidosAprovados.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pedidosAprovados
                      .slice(0, 5)
                      .map((pedido: any) => {
                        const links = gerarLinksCalendario(pedido);
                        return (
                          <div 
                            key={pedido.id} 
                            className="bg-green-50 p-4 rounded-lg border border-green-200"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium">{pedido.loja?.nome || 'Loja'}</h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(pedido.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                                  {' - '}
                                  <Badge variant="outline" className={pedido.periodo === 'manha' ? 'bg-purple-100 text-purple-800' : pedido.periodo === 'tarde' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                    {pedido.periodo === 'manha' ? (language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)') : pedido.periodo === 'tarde' ? (language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)') : (language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9am-6pm)')}
                                  </Badge>
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {pedido.tipoApoio === 'cobertura_ferias' ? (language === 'pt' ? 'Cobertura de Férias' : 'Vacation Coverage') :
                                   pedido.tipoApoio === 'substituicao_vidros' ? (language === 'pt' ? 'Substituição de Vidros' : 'Glass Replacement') :
                                   (language === 'pt' ? 'Outro' : 'Other')}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => window.open(links.googleUrl, '_blank')}
                                  title="Google Calendar"
                                >
                                  <Calendar className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => window.open(links.outlookUrl, '_blank')}
                                  title="Outlook"
                                >
                                  <Mail className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = links.icsUrl;
                                    a.download = `apoio-${pedido.id}.ics`;
                                    a.click();
                                  }}
                                  title="Apple Calendar (ICS)"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === "resultados" && (
          <div className="space-y-6">
            {/* Seletor de Loja e Período */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="py-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <h3 className="font-medium dark:text-gray-100">{language === 'pt' ? 'Loja' : 'Store'}</h3>
                    <Select
                      value={lojaResultadosSelecionada?.toString() || ""}
                      onValueChange={(value) => {
                        setLojaResultadosSelecionada(value ? parseInt(value) : null);
                      }}
                    >
                      <SelectTrigger className="w-[250px] dark:bg-gray-700 dark:border-gray-600">
                        <SelectValue placeholder={language === 'pt' ? 'Selecionar loja' : 'Select store'} />
                      </SelectTrigger>
                      <SelectContent>
                        {volanteAuth.lojasAtribuidas
                          .sort((a, b) => a.nome.localeCompare(b.nome))
                          .map((loja) => (
                            <SelectItem key={loja.id} value={loja.id.toString()}>
                              {loja.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {lojaResultadosSelecionada && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <h3 className="font-medium dark:text-gray-100">{language === 'pt' ? 'Período' : 'Period'}</h3>
                      <FiltroMesesCheckbox
                        mesesSelecionados={mesesSelecionadosVolante}
                        onMesesChange={setMesesSelecionadosVolante}
                        placeholder={language === 'pt' ? 'Selecionar meses' : 'Select months'}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo baseado na seleção */}
            {!lojaResultadosSelecionada ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {language === 'pt' ? 'Selecione uma loja para ver os resultados' : 'Select a store to view results'}
                  </p>
                </CardContent>
              </Card>
            ) : loadingDashboardLoja ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : dashboardLojaVolante ? (
              <div className="space-y-6 bg-white dark:bg-gray-900 p-4 rounded-lg">
                {/* Label do Período */}
                {dashboardLojaVolante.periodoLabel && (
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-foreground">
                      {dashboardLojaVolante.lojaNome} - {dashboardLojaVolante.periodoLabel}
                    </h2>
                  </div>
                )}

                {/* KPIs Principais */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Serviços */}
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Wrench className="h-8 w-8 opacity-80" />
                        <div className="text-right">
                          <p className="text-2xl font-bold">{dashboardLojaVolante.resultados?.totalServicos || 0}</p>
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
                          <p className="text-2xl font-bold">{dashboardLojaVolante.resultados?.objetivoMensal || 0}</p>
                          <p className="text-xs opacity-80">{language === 'pt' ? 'Objetivo' : 'Goal'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Desvio vs Objetivo Diário */}
                  <Card className={`bg-gradient-to-br ${(() => {
                    const desvio = parseFloat(String(dashboardLojaVolante.resultados?.desvioPercentualDia || 0)) * 100;
                    if (desvio >= 20) return 'from-green-600 to-green-700';
                    if (desvio >= 10) return 'from-green-500 to-green-600';
                    if (desvio >= 0) return 'from-green-400 to-green-500';
                    if (desvio >= -10) return 'from-red-400 to-red-500';
                    if (desvio >= -20) return 'from-red-500 to-red-600';
                    return 'from-red-600 to-red-700';
                  })()} text-white`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {parseFloat(String(dashboardLojaVolante.resultados?.desvioPercentualDia || 0)) >= 0 ? (
                          <TrendingUp className="h-8 w-8 opacity-80" />
                        ) : (
                          <TrendingDown className="h-8 w-8 opacity-80" />
                        )}
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {dashboardLojaVolante.resultados?.desvioPercentualDia !== null 
                              ? `${parseFloat(String(dashboardLojaVolante.resultados?.desvioPercentualDia)) >= 0 ? '+' : ''}${(parseFloat(String(dashboardLojaVolante.resultados?.desvioPercentualDia)) * 100).toFixed(1)}%`
                              : '-'}
                          </p>
                          <p className="text-xs opacity-80">{language === 'pt' ? 'Desvio Obj. Diário' : 'Daily Goal Dev.'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Taxa Reparação */}
                  <Card className={`bg-gradient-to-br ${
                    parseFloat(String(dashboardLojaVolante.resultados?.taxaReparacao || 0)) >= 0.22 
                      ? 'from-green-500 to-green-600' 
                      : 'from-amber-500 to-amber-600'
                  } text-white`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Award className="h-8 w-8 opacity-80" />
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {dashboardLojaVolante.resultados?.taxaReparacao !== null 
                              ? `${(parseFloat(String(dashboardLojaVolante.resultados?.taxaReparacao)) * 100).toFixed(1)}%`
                              : '-'}
                          </p>
                          <p className="text-xs opacity-80">{language === 'pt' ? 'Taxa Rep.' : 'Repair Rate'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Alertas */}
                {dashboardLojaVolante.alertas && dashboardLojaVolante.alertas.length > 0 && (
                  <div className="space-y-2">
                    {dashboardLojaVolante.alertas.map((alerta: {tipo: string; mensagem: string}, idx: number) => (
                      <Card key={idx} className={`border-l-4 ${
                        alerta.tipo === 'danger' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
                        alerta.tipo === 'warning' ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20' :
                        'border-l-green-500 bg-green-50 dark:bg-green-900/20'
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
                            alerta.tipo === 'danger' ? 'text-red-700 dark:text-red-300' :
                            alerta.tipo === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                            'text-green-700 dark:text-green-300'
                          }`}>
                            {alerta.mensagem}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Vendas Complementares */}
                {dashboardLojaVolante.complementares && (() => {
                  const complementaresLabels = ['Escovas', 'Polimento', 'Tratamento', 'Outros'];
                  const complementaresData = [
                    Number(dashboardLojaVolante.complementares.escovasQtd) || 0,
                    Number(dashboardLojaVolante.complementares.polimentoQtd) || 0,
                    Number(dashboardLojaVolante.complementares.tratamentoQtd) || 0,
                    Number(dashboardLojaVolante.complementares.outrosQtd) || 0,
                  ];
                  const totalComplementares = complementaresData.reduce((a, b) => a + b, 0);
                  const complementaresColors = [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(156, 163, 175, 0.8)',
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
                        {/* Gráficos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                  legend: { display: false },
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
                                  x: { beginAtZero: true, ticks: { stepSize: 1 } },
                                },
                              }}
                            />
                          </div>
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
                                  legend: { position: 'right', labels: { boxWidth: 12, padding: 8 } },
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

                        {/* Barra de Escovas */}
                        <div className="border-t pt-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              Escovas
                            </span>
                            <span className="text-sm font-medium">
                              {dashboardLojaVolante.complementares.escovasQtd || 0} 
                              <span className={`ml-2 ${
                                parseFloat(String(dashboardLojaVolante.complementares.escovasPercent || 0)) >= 0.10 
                                  ? 'text-green-600' 
                                  : parseFloat(String(dashboardLojaVolante.complementares.escovasPercent || 0)) >= 0.075
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                              }`}>
                                ({dashboardLojaVolante.complementares.escovasPercent !== null 
                                  ? `${(parseFloat(String(dashboardLojaVolante.complementares.escovasPercent)) * 100).toFixed(1)}%`
                                  : '0%'})
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4 relative">
                            <div 
                              className={`h-4 rounded-full transition-all ${
                                parseFloat(String(dashboardLojaVolante.complementares.escovasPercent || 0)) >= 0.10 
                                  ? 'bg-green-500' 
                                  : parseFloat(String(dashboardLojaVolante.complementares.escovasPercent || 0)) >= 0.075
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(parseFloat(String(dashboardLojaVolante.complementares.escovasPercent || 0)) * 1000, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === 'pt' ? 'Objetivo: 10% | Mínimo: 7.5%' : 'Goal: 10% | Minimum: 7.5%'}
                          </p>
                        </div>

                        {/* Cards de Complementares */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Escovas</p>
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{dashboardLojaVolante.complementares.escovasQtd || 0}</p>
                          </div>
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Polimento</p>
                            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{dashboardLojaVolante.complementares.polimentoQtd || 0}</p>
                          </div>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Tratamento</p>
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">{dashboardLojaVolante.complementares.tratamentoQtd || 0}</p>
                          </div>
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Outros</p>
                            <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{dashboardLojaVolante.complementares.outrosQtd || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Comparativo com Mês Anterior */}
                {dashboardLojaVolante.comparativoMesAnterior && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {language === 'pt' ? 'Comparação com Mês Anterior' : 'Comparison with Previous Month'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">{language === 'pt' ? 'Serviços' : 'Services'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                              {Number(dashboardLojaVolante.resultados?.totalServicos || 0)}
                            </span>
                            {dashboardLojaVolante.comparativoMesAnterior.variacaoServicos !== null && (
                              <span className={`text-sm flex items-center gap-1 ${
                                dashboardLojaVolante.comparativoMesAnterior.variacaoServicos >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoServicos >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoServicos >= 0 ? '+' : ''}
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoServicos.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === 'pt' ? 'Anterior: ' : 'Previous: '}
                            {Number(dashboardLojaVolante.comparativoMesAnterior.servicosAnterior || 0)}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">{language === 'pt' ? 'Reparações' : 'Repairs'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                              {Number(dashboardLojaVolante.resultados?.totalReparacoes || 0)}
                            </span>
                            {dashboardLojaVolante.comparativoMesAnterior.variacaoReparacoes !== null && (
                              <span className={`text-sm flex items-center gap-1 ${
                                dashboardLojaVolante.comparativoMesAnterior.variacaoReparacoes >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoReparacoes >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoReparacoes >= 0 ? '+' : ''}
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoReparacoes.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === 'pt' ? 'Anterior: ' : 'Previous: '}
                            {Number(dashboardLojaVolante.comparativoMesAnterior.reparacoesAnterior || 0)}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Escovas</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                              {Number(dashboardLojaVolante.complementares?.escovasQtd || 0)}
                            </span>
                            {dashboardLojaVolante.comparativoMesAnterior.variacaoEscovas !== null && (
                              <span className={`text-sm flex items-center gap-1 ${
                                dashboardLojaVolante.comparativoMesAnterior.variacaoEscovas >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoEscovas >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoEscovas >= 0 ? '+' : ''}
                                {dashboardLojaVolante.comparativoMesAnterior.variacaoEscovas.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === 'pt' ? 'Anterior: ' : 'Previous: '}
                            {Number(dashboardLojaVolante.comparativoMesAnterior.escovasAnterior || 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Gráfico de Evolução Mensal */}
                {dashboardLojaVolante.evolucao && dashboardLojaVolante.evolucao.length > 0 && (() => {
                  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const evolucaoData = dashboardLojaVolante.evolucao.slice(-12);
                  const labels = evolucaoData.map((e: any) => `${mesesNomes[e.mes - 1]} ${String(e.ano).slice(-2)}`);
                  const servicos = evolucaoData.map((e: any) => Number(e.totalServicos) || 0);
                  const objetivos = evolucaoData.map((e: any) => Number(e.objetivoMensal) || 0);

                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          {language === 'pt' ? 'Evolução Mensal' : 'Monthly Evolution'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div style={{ height: '300px' }}>
                          <Line
                            data={{
                              labels,
                              datasets: [
                                {
                                  label: language === 'pt' ? 'Serviços' : 'Services',
                                  data: servicos,
                                  borderColor: 'rgb(59, 130, 246)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                  fill: true,
                                  tension: 0.3,
                                },
                                {
                                  label: language === 'pt' ? 'Objetivo' : 'Goal',
                                  data: objetivos,
                                  borderColor: 'rgb(168, 85, 247)',
                                  backgroundColor: 'transparent',
                                  borderDash: [5, 5],
                                  tension: 0.3,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: 'top' },
                              },
                              scales: {
                                y: { beginAtZero: true },
                              },
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {language === 'pt' ? 'Sem resultados para este período' : 'No results for this period'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Vista Histórico */}
        {activeView === "historico" && (
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Filtro por Mês */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">
                      {language === 'pt' ? 'Histórico de Apoios' : 'Support History'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMesSelecionado(prev => {
                        const novoMes = prev.mes === 1 ? 12 : prev.mes - 1;
                        const novoAno = prev.mes === 1 ? prev.ano - 1 : prev.ano;
                        return { mes: novoMes, ano: novoAno };
                      })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {nomesMeses[mesSelecionado.mes - 1]} {mesSelecionado.ano}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMesSelecionado(prev => {
                        const novoMes = prev.mes === 12 ? 1 : prev.mes + 1;
                        const novoAno = prev.mes === 12 ? prev.ano + 1 : prev.ano;
                        return { mes: novoMes, ano: novoAno };
                      })}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Apoios Realizados */}
            {loadingPedidos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              </div>
            ) : (() => {
              // Filtrar pedidos aprovados do mês selecionado
              const pedidosDoMes = pedidosAprovados.filter((p: any) => {
                const dataPedido = new Date(p.data);
                return dataPedido.getMonth() + 1 === mesSelecionado.mes && 
                       dataPedido.getFullYear() === mesSelecionado.ano;
              });
              
              // Ordenar por data (mais recente primeiro)
              const pedidosOrdenados = [...pedidosDoMes].sort((a: any, b: any) => 
                new Date(b.data).getTime() - new Date(a.data).getTime()
              );

              if (pedidosOrdenados.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {language === 'pt' ? 'Sem apoios realizados neste período' : 'No support visits in this period'}
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              // Agrupar por loja
              const apoiosPorLoja = pedidosOrdenados.reduce((acc: any, pedido: any) => {
                const lojaId = pedido.lojaId;
                if (!acc[lojaId]) {
                  acc[lojaId] = {
                    loja: pedido.loja,
                    pedidos: []
                  };
                }
                acc[lojaId].pedidos.push(pedido);
                return acc;
              }, {});

              return (
                <div className="space-y-4">
                  {/* Resumo */}
                  <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="py-4">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-orange-600">{pedidosOrdenados.length}</p>
                          <p className="text-xs text-gray-500">{language === 'pt' ? 'Total Apoios' : 'Total Support'}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-600">
                            {pedidosOrdenados.filter((p: any) => p.periodo === 'manha').length}
                          </p>
                          <p className="text-xs text-gray-500">{language === 'pt' ? 'Manhãs' : 'Mornings'}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {pedidosOrdenados.filter((p: any) => p.periodo === 'tarde').length}
                          </p>
                          <p className="text-xs text-gray-500">{language === 'pt' ? 'Tardes' : 'Afternoons'}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {pedidosOrdenados.filter((p: any) => p.periodo === 'dia_todo').length}
                          </p>
                          <p className="text-xs text-gray-500">{language === 'pt' ? 'Dias Completos' : 'Full Days'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista por Loja */}
                  {Object.values(apoiosPorLoja).map((grupo: any) => (
                    <Card key={grupo.loja?.id || 'unknown'}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Store className="h-5 w-5 text-orange-600" />
                          {grupo.loja?.nome || 'Loja'}
                          <Badge variant="outline" className="ml-auto">
                            {grupo.pedidos.length} {language === 'pt' ? 'apoio(s)' : 'support(s)'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {grupo.pedidos.map((pedido: any) => {
                            const dataPedido = new Date(pedido.data);
                            const tipoApoioTexto = pedido.tipoApoio === 'cobertura_ferias' 
                              ? (language === 'pt' ? 'Cobertura Férias' : 'Holiday Coverage')
                              : pedido.tipoApoio === 'substituicao_vidros' 
                                ? (language === 'pt' ? 'Substituição Vidros' : 'Glass Replacement')
                                : (language === 'pt' ? 'Outro' : 'Other');
                            
                            return (
                              <div 
                                key={pedido.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    pedido.periodo === 'manha' 
                                      ? 'bg-purple-100 text-purple-600' 
                                      : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    <Calendar className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {dataPedido.toLocaleDateString('pt-PT', { 
                                        weekday: 'short', 
                                        day: 'numeric', 
                                        month: 'short' 
                                      })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {pedido.periodo === 'manha' 
                                        ? (language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)')
                                        : (language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)')
                                      }
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary" className="text-xs">
                                    {tipoApoioTexto}
                                  </Badge>
                                  {pedido.observacoes && (
                                    <p className="text-xs text-gray-400 mt-1 max-w-[150px] truncate" title={pedido.observacoes}>
                                      {pedido.observacoes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Vista Dashboard */}
        {activeView === "dashboard" && (() => {
          // Filtrar pedidos pelos meses selecionados
          const pedidosFiltrados = mesesSelecionadosVolante.length === 0 ? todosAprovados : todosAprovados.filter((p: any) => {
            const dataPedido = new Date(p.data);
            const mesPedido = dataPedido.getMonth() + 1;
            const anoPedido = dataPedido.getFullYear();
            return mesesSelecionadosVolante.some(m => m.mes === mesPedido && m.ano === anoPedido);
          });
          
          // Calcular lojas únicas
          const lojasUnicas = new Set(pedidosFiltrados.map((p: any) => p.lojaId));
          
          return (
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Filtros e Botão Exportar */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <h3 className="font-medium dark:text-gray-100">{language === 'pt' ? 'Período' : 'Period'}</h3>
                    <FiltroMesesCheckbox
                      mesesSelecionados={mesesSelecionadosVolante}
                      onMesesChange={setMesesSelecionadosVolante}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (mesesSelecionadosVolante.length === 0) {
                        toast.error(language === 'pt' ? 'Selecione pelo menos um mês' : 'Select at least one month');
                        return;
                      }
                      exportarDashboardPDFMutation.mutate({ token, meses: mesesSelecionadosVolante });
                    }}
                    disabled={exportarDashboardPDFMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {exportarDashboardPDFMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {language === 'pt' ? 'Exportar PDF' : 'Export PDF'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seção de Serviços Realizados */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 dark:text-gray-100">{language === 'pt' ? 'Serviços Realizados' : 'Services Performed'}</h2>
              
              {loadingServicos ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-muted-foreground mt-2">{language === 'pt' ? 'A carregar estatísticas...' : 'Loading statistics...'}</p>
                </div>
              ) : !estatisticasServicos ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{language === 'pt' ? 'Sem dados de serviços' : 'No service data'}</p>
                </div>
              ) : (
                <>
                  {/* Cards de Estatísticas de Serviços */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-80 mb-1">{language === 'pt' ? 'Total Serviços' : 'Total Services'}</p>
                            <p className="text-3xl font-bold">{estatisticasServicos.totalServicos || 0}</p>
                          </div>
                          <Wrench className="h-10 w-10 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-80 mb-1">{language === 'pt' ? 'Substituições' : 'Replacements'}</p>
                            <p className="text-3xl font-bold">{estatisticasServicos.substituicoes || 0}</p>
                          </div>
                          <Wrench className="h-10 w-10 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-80 mb-1">{language === 'pt' ? 'Reparações' : 'Repairs'}</p>
                            <p className="text-3xl font-bold">{estatisticasServicos.reparacoes || 0}</p>
                          </div>
                          <Wrench className="h-10 w-10 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-80 mb-1">{language === 'pt' ? 'Calibragens' : 'Calibrations'}</p>
                            <p className="text-3xl font-bold">{estatisticasServicos.calibragens || 0}</p>
                          </div>
                          <Target className="h-10 w-10 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-80 mb-1">{language === 'pt' ? 'Média/Dia' : 'Avg/Day'}</p>
                            <p className="text-3xl font-bold">{estatisticasServicos.mediaPorDia?.toFixed(1) || '0.0'}</p>
                          </div>
                          <TrendingUp className="h-10 w-10 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-80 mb-1">{language === 'pt' ? 'Dias Trabalhados' : 'Days Worked'}</p>
                            <p className="text-3xl font-bold">{estatisticasServicos.diasTrabalhados || 0}</p>
                          </div>
                          <Calendar className="h-10 w-10 opacity-60" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gráfico Top 5 Lojas com Mais Serviços */}
                  {topLojasServicos && topLojasServicos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-indigo-600" />
                          {language === 'pt' ? 'Top 5 Lojas com Mais Serviços' : 'Top 5 Stores with Most Services'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div style={{ height: '300px' }}>
                          <Bar
                            data={{
                              labels: topLojasServicos.map((l: any) => l.lojaNome),
                              datasets: [
                                {
                                  label: language === 'pt' ? 'Serviços' : 'Services',
                                  data: topLojasServicos.map((l: any) => l.totalServicos),
                                  backgroundColor: 'rgba(99, 102, 241, 0.8)',
                                  borderColor: 'rgba(99, 102, 241, 1)',
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
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    stepSize: 1,
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Ranking de Lojas - Serviços Realizados */}
                  {topLojasServicos && topLojasServicos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-amber-600" />
                          {language === 'pt' ? 'Ranking de Lojas - Serviços Realizados' : 'Store Ranking - Services Performed'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {topLojasServicos.map((loja: any, index: number) => (
                            <div key={loja.lojaId} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                              <div className="flex-shrink-0 mt-1">
                                {index === 0 && <span className="text-3xl">🥇</span>}
                                {index === 1 && <span className="text-3xl">🥈</span>}
                                {index === 2 && <span className="text-3xl">🥉</span>}
                                {index > 2 && <span className="text-2xl font-bold text-gray-400">{index + 1}</span>}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg mb-2">{loja.lojaNome}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <span>{loja.totalServicos} {language === 'pt' ? 'serviços' : 'services'}</span>
                                  <span>•</span>
                                  <span>{loja.visitas} {language === 'pt' ? 'visitas' : 'visits'}</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-md font-medium text-sm">
                                  {language === 'pt' ? 'Média' : 'Avg'}: {loja.mediaPorVisita.toFixed(1)} {language === 'pt' ? 'serv/visita' : 'serv/visit'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico de Tipos de Apoio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    {language === 'pt' ? 'Tipos de Apoio' : 'Support Types'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Doughnut
                      data={{
                        labels: [
                          language === 'pt' ? 'Cobertura Férias' : 'Holiday Coverage',
                          language === 'pt' ? 'Substituição Vidros' : 'Glass Replacement',
                          language === 'pt' ? 'Outro' : 'Other'
                        ],
                        datasets: [{
                          data: [
                            pedidosFiltrados.filter((p: any) => p.tipoApoio === 'cobertura_ferias').length,
                            pedidosFiltrados.filter((p: any) => p.tipoApoio === 'substituicao_vidros').length,
                            pedidosFiltrados.filter((p: any) => p.tipoApoio === 'outro').length,
                          ],
                          backgroundColor: ['#14b8a6', '#3b82f6', '#f97316'],
                          borderWidth: 0,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Lojas Mais Apoiadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    {language === 'pt' ? 'Top 5 Lojas Mais Apoiadas' : 'Top 5 Most Supported Stores'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Bar
                      data={{                        labels: Object.values(
                          pedidosFiltrados.reduce((acc: any, p: any) => {
                            const lojaId = p.lojaId;
                            if (!acc[lojaId]) {
                              acc[lojaId] = { nome: p.loja?.nome || 'Loja', count: 0 };
                            }
                            acc[lojaId].count++;
                            return acc;
                          }, {})
                        )
                          .sort((a: any, b: any) => b.count - a.count)
                          .slice(0, 5)
                          .map((l: any) => l.nome),
                        datasets: [{
                          label: language === 'pt' ? 'Apoios' : 'Support',
                          data: Object.values(
                            pedidosFiltrados.reduce((acc: any, p: any) => {
                              const lojaId = p.lojaId;
                              if (!acc[lojaId]) {
                                acc[lojaId] = { nome: p.loja?.nome || 'Loja', count: 0 };
                              }
                              acc[lojaId].count++;
                              return acc;
                            }, {})
                          )
                            .sort((a: any, b: any) => b.count - a.count)
                            .slice(0, 5)
                            .map((l: any) => l.count),
                          backgroundColor: '#8b5cf6',
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ranking de Lojas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  {language === 'pt' ? 'Ranking de Lojas' : 'Store Ranking'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.values(
                    pedidosFiltrados.reduce((acc: any, p: any) => {
                      const lojaId = p.lojaId;
                      if (!acc[lojaId]) {
                        acc[lojaId] = { nome: p.loja?.nome || 'Loja', count: 0 };
                      }
                      acc[lojaId].count++;
                      return acc;
                    }, {})
                  )
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 10)
                    .map((loja: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </div>
                          <p className="font-medium">{loja.nome}</p>
                        </div>
                        <Badge variant="outline">{loja.count} {language === 'pt' ? 'apoios' : 'support'}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Envios de Relatórios Mensais */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {language === 'pt' ? 'Histórico de Envios de Relatórios Mensais do Volante' : 'Monthly Report Sending History - Volante'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HistoricoEnviosVolante />
              </CardContent>
            </Card>
          </div>
          );
        })()}

        {/* Vista Circulares */}
        {activeView === "circulares" && (() => {
          const { data: documentos, isLoading } = trpc.documentos.listar.useQuery();
          
          return (
            <div className="container mx-auto px-4 py-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    {language === 'pt' ? 'Circulares e Documentos' : 'Circulars and Documents'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Documentos importantes partilhados pelo gestor' : 'Important documents shared by the manager'}
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">{language === 'pt' ? 'A carregar documentos...' : 'Loading documents...'}</p>
                    </div>
                  ) : !documentos || documentos.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">{language === 'pt' ? 'Nenhum documento disponível' : 'No documents available'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documentos.map((doc: any) => (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1">{doc.titulo}</h3>
                                {doc.descricao && (
                                  <p className="text-sm text-muted-foreground mb-2">{doc.descricao}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(doc.createdAt).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US')}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.fileUrl, '_blank')}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                {language === 'pt' ? 'Abrir' : 'Open'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Vista Histórico de Serviços */}
        {activeView === "historico-servicos" && (() => {
          const [dataInicio, setDataInicio] = React.useState<string>('');
          const [dataFim, setDataFim] = React.useState<string>('');
          const [lojaFiltro, setLojaFiltro] = React.useState<number | undefined>(undefined);
          
          const { data: historico, isLoading } = trpc.portalVolante.getHistoricoServicos.useQuery({
            token: volanteAuth.token,
            dataInicio: dataInicio || undefined,
            dataFim: dataFim || undefined,
            lojaId: lojaFiltro,
          });
          
          const exportarPDF = trpc.portalVolante.exportarRelatorioMensal.useMutation({
            onSuccess: (data) => {
              const link = document.createElement('a');
              link.href = `data:application/pdf;base64,${data.pdf}`;
              link.download = data.filename;
              link.click();
              toast.success('Relatório exportado com sucesso!');
            },
            onError: () => {
              toast.error('Erro ao exportar relatório');
            },
          });
          
          const handleExportarMes = () => {
            const hoje = new Date();
            exportarPDF.mutate({
              token: volanteAuth.token,
              ano: hoje.getFullYear(),
              mes: hoje.getMonth() + 1,
            });
          };
          
          return (
            <div className="container mx-auto px-4 py-6 space-y-6">
              {/* Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-500" />
                    {language === 'pt' ? 'Filtros' : 'Filters'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {language === 'pt' ? 'Data Início' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {language === 'pt' ? 'Data Fim' : 'End Date'}
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {language === 'pt' ? 'Loja' : 'Store'}
                      </label>
                      <select
                        value={lojaFiltro || ''}
                        onChange={(e) => setLojaFiltro(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">{language === 'pt' ? 'Todas' : 'All'}</option>
                        {volanteAuth.lojas.map((loja: any) => (
                          <option key={loja.id} value={loja.id}>{loja.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDataInicio('');
                        setDataFim('');
                        setLojaFiltro(undefined);
                      }}
                    >
                      {language === 'pt' ? 'Limpar Filtros' : 'Clear Filters'}
                    </Button>
                    <Button
                      onClick={handleExportarMes}
                      disabled={exportarPDF.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'pt' ? 'Exportar Mês Atual' : 'Export Current Month'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabela de Histórico */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                    {language === 'pt' ? 'Serviços Registados' : 'Registered Services'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{language === 'pt' ? 'A carregar...' : 'Loading...'}</p>
                    </div>
                  ) : !historico || historico.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{language === 'pt' ? 'Sem serviços registados' : 'No services registered'}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold">{language === 'pt' ? 'Data' : 'Date'}</th>
                            <th className="text-left py-3 px-4 font-semibold">{language === 'pt' ? 'Loja' : 'Store'}</th>
                            <th className="text-center py-3 px-4 font-semibold">{language === 'pt' ? 'Subst. Ligeiro' : 'Light Repl.'}</th>
                            <th className="text-center py-3 px-4 font-semibold">{language === 'pt' ? 'Reparação' : 'Repair'}</th>
                            <th className="text-center py-3 px-4 font-semibold">{language === 'pt' ? 'Calibragem' : 'Calibration'}</th>
                            <th className="text-center py-3 px-4 font-semibold">{language === 'pt' ? 'Outros' : 'Others'}</th>
                            <th className="text-center py-3 px-4 font-semibold">{language === 'pt' ? 'Total' : 'Total'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historico.map((servico) => {
                            const total = servico.substituicaoLigeiro + servico.reparacao + servico.calibragem + servico.outros;
                            return (
                              <tr key={servico.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="py-3 px-4">
                                  {new Date(servico.data).toLocaleDateString('pt-PT')}
                                </td>
                                <td className="py-3 px-4">{servico.lojaNome}</td>
                                <td className="py-3 px-4 text-center">{servico.substituicaoLigeiro}</td>
                                <td className="py-3 px-4 text-center">{servico.reparacao}</td>
                                <td className="py-3 px-4 text-center">{servico.calibragem}</td>
                                <td className="py-3 px-4 text-center">{servico.outros}</td>
                                <td className="py-3 px-4 text-center font-semibold">{total}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Vista Configurações */}
        {activeView === "configuracoes" && (
          <div className="container mx-auto px-4 py-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  {language === 'pt' ? 'Notificações Telegram' : 'Telegram Notifications'}
                </CardTitle>
                <CardDescription>
                  {language === 'pt' 
                    ? 'Receba notificações no Telegram quando houver novos pedidos de apoio' 
                    : 'Receive Telegram notifications when there are new support requests'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Instruções */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    {language === 'pt' ? 'Como configurar:' : 'How to configure:'}
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                    <li>{language === 'pt' ? 'Abra o Telegram e procure por' : 'Open Telegram and search for'} <strong>@PoweringEG_bot</strong></li>
                    <li>{language === 'pt' ? 'Inicie uma conversa com o bot clicando em "Start"' : 'Start a conversation with the bot by clicking "Start"'}</li>
                    <li>{language === 'pt' ? 'O bot irá enviar-lhe o seu Chat ID' : 'The bot will send you your Chat ID'}</li>
                    <li>{language === 'pt' ? 'Cole o Chat ID no campo abaixo' : 'Paste the Chat ID in the field below'}</li>
                  </ol>
                </div>

                {/* Formulário */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegramChatId">
                      {language === 'pt' ? 'Chat ID(s) do Telegram' : 'Telegram Chat ID(s)'}
                    </Label>
                    <Input
                      id="telegramChatId"
                      placeholder={language === 'pt' ? 'Ex: 123456789, 987654321' : 'E.g.: 123456789, 987654321'}
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      {language === 'pt' 
                        ? 'Pode adicionar vários Chat IDs separados por vírgula para notificar múltiplas pessoas' 
                        : 'You can add multiple Chat IDs separated by comma to notify multiple people'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegramUsername">
                      {language === 'pt' ? 'Username do Telegram (opcional)' : 'Telegram Username (optional)'}
                    </Label>
                    <Input
                      id="telegramUsername"
                      placeholder="@username"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                    />
                  </div>
                </div>

                {/* Botão Guardar */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      configurarTelegramMutation.mutate({
                        token,
                        telegramChatId: telegramChatId || undefined,
                        telegramUsername: telegramUsername || undefined,
                      });
                    }}
                    disabled={configurarTelegramMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {configurarTelegramMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {language === 'pt' ? 'Guardar Configurações' : 'Save Settings'}
                  </Button>
                </div>

                {/* Estado Atual */}
                {telegramConfig && telegramConfig.telegramChatId && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">
                        {language === 'pt' ? 'Telegram configurado!' : 'Telegram configured!'}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {language === 'pt' 
                        ? `Irá receber notificações no(s) Chat ID(s): ${telegramConfig.telegramChatId}` 
                        : `You will receive notifications on Chat ID(s): ${telegramConfig.telegramChatId}`}
                    </p>
                    <div className="pt-2 border-t border-green-200 dark:border-green-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          testarNotificacoesMutation.mutate({ token });
                        }}
                        disabled={testarNotificacoesMutation.isPending}
                        className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/30"
                      >
                        {testarNotificacoesMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {language === 'pt' ? 'Testar Notificações' : 'Test Notifications'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Dialog de Reprovação */}
      <Dialog open={reprovarDialogOpen} onOpenChange={setReprovarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Reprovar Pedido' : 'Reject Request'}</DialogTitle>
            <DialogDescription>
              {language === 'pt' 
                ? 'Indique o motivo da reprovação (opcional)' 
                : 'Indicate the reason for rejection (optional)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pedidoSelecionado && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium">{pedidoSelecionado.loja?.nome}</p>
                <p className="text-gray-600">
                  {new Date(pedidoSelecionado.data).toLocaleDateString('pt-PT')} - {pedidoSelecionado.periodo === 'manha' ? 'Manhã' : pedidoSelecionado.periodo === 'tarde' ? 'Tarde' : 'Dia Todo'}
                </p>
              </div>
            )}
            <Textarea
              placeholder={language === 'pt' ? 'Motivo da reprovação...' : 'Reason for rejection...'}
              value={motivoReprovacao}
              onChange={(e) => setMotivoReprovacao(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReprovarDialogOpen(false);
              setMotivoReprovacao("");
              setPedidoSelecionado(null);
            }}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pedidoSelecionado) {
                  reprovarMutation.mutate({
                    token,
                    pedidoId: pedidoSelecionado.id,
                    motivo: motivoReprovacao || undefined,
                  });
                }
              }}
              disabled={reprovarMutation.isPending}
            >
              {reprovarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {language === 'pt' ? 'Reprovar' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Pedido */}
      <Dialog open={!!pedidoSelecionado && !reprovarDialogOpen} onOpenChange={(open) => !open && setPedidoSelecionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Detalhes do Pedido' : 'Request Details'}</DialogTitle>
          </DialogHeader>
          {pedidoSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{language === 'pt' ? 'Loja' : 'Store'}</p>
                  <p className="font-medium">{pedidoSelecionado.loja?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{language === 'pt' ? 'Estado' : 'Status'}</p>
                  <Badge className={
                    pedidoSelecionado.estado === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                    pedidoSelecionado.estado === 'aprovado' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {pedidoSelecionado.estado === 'pendente' ? (language === 'pt' ? 'Pendente' : 'Pending') :
                     pedidoSelecionado.estado === 'aprovado' ? (language === 'pt' ? 'Aprovado' : 'Approved') :
                     (language === 'pt' ? 'Reprovado' : 'Rejected')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{language === 'pt' ? 'Data' : 'Date'}</p>
                  <p className="font-medium">
                    {new Date(pedidoSelecionado.data).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{language === 'pt' ? 'Período' : 'Period'}</p>
                  <p className="font-medium">
                    {pedidoSelecionado.periodo === 'manha' ? (language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)') : pedidoSelecionado.periodo === 'tarde' ? (language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)') : (language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9am-6pm)')}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">{language === 'pt' ? 'Tipo de Apoio' : 'Support Type'}</p>
                  <p className="font-medium">
                    {pedidoSelecionado.tipoApoio === 'cobertura_ferias' ? (language === 'pt' ? 'Cobertura de Férias' : 'Vacation Coverage') :
                     pedidoSelecionado.tipoApoio === 'substituicao_vidros' ? (language === 'pt' ? 'Substituição de Vidros' : 'Glass Replacement') :
                     (language === 'pt' ? 'Outro' : 'Other')}
                  </p>
                </div>
                {pedidoSelecionado.observacoes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">{language === 'pt' ? 'Observações' : 'Notes'}</p>
                    <p className="font-medium">{pedidoSelecionado.observacoes}</p>
                  </div>
                )}
                {pedidoSelecionado.motivoReprovacao && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">{language === 'pt' ? 'Motivo da Reprovação' : 'Rejection Reason'}</p>
                    <p className="font-medium text-red-600">{pedidoSelecionado.motivoReprovacao}</p>
                  </div>
                )}
              </div>

              {pedidoSelecionado.estado === 'pendente' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => setReprovarDialogOpen(true)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {language === 'pt' ? 'Reprovar' : 'Reject'}
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => aprovarMutation.mutate({ token, pedidoId: pedidoSelecionado.id })}
                    disabled={aprovarMutation.isPending}
                  >
                    {aprovarMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {language === 'pt' ? 'Aprovar' : 'Approve'}
                  </Button>
                </div>
              )}

              {pedidoSelecionado.estado === 'aprovado' && (
                <div className="pt-4 border-t space-y-4">
                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditarDialogOpen(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {language === 'pt' ? 'Editar' : 'Edit'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => setAnularDialogOpen(true)}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      {language === 'pt' ? 'Anular' : 'Cancel'}
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-2">{language === 'pt' ? 'Adicionar ao Calendário' : 'Add to Calendar'}</p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const links = gerarLinksCalendario(pedidoSelecionado);
                      return (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(links.googleUrl, '_blank')}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Google
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(links.outlookUrl, '_blank')}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Outlook
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = links.icsUrl;
                              a.download = `apoio-${pedidoSelecionado.id}.ics`;
                              a.click();
                            }}
                          >
                            <AppleIcon className="h-4 w-4 mr-2" />
                            Apple
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = links.icsUrl;
                              a.download = `apoio-${pedidoSelecionado.id}.ics`;
                              a.click();
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            ICS
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Anular Pedido */}
      <Dialog open={anularDialogOpen} onOpenChange={setAnularDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Anular Pedido' : 'Cancel Request'}</DialogTitle>
            <DialogDescription>
              {language === 'pt' ? 'Tem a certeza que pretende anular este pedido aprovado?' : 'Are you sure you want to cancel this approved request?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'pt' ? 'Motivo (opcional)' : 'Reason (optional)'}</label>
              <Textarea
                value={motivoAnulacao}
                onChange={(e) => setMotivoAnulacao(e.target.value)}
                placeholder={language === 'pt' ? 'Indique o motivo da anulação...' : 'Enter the cancellation reason...'}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnularDialogOpen(false)}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                if (pedidoSelecionado) {
                  anularMutation.mutate({
                    token,
                    pedidoId: pedidoSelecionado.id,
                    motivo: motivoAnulacao || undefined,
                  });
                }
              }}
              disabled={anularMutation.isPending}
            >
              {anularMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              {language === 'pt' ? 'Anular' : 'Cancel Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Pedido */}
      <Dialog open={editarDialogOpen} onOpenChange={(open) => {
        setEditarDialogOpen(open);
        if (open && pedidoSelecionado) {
          // Preencher com dados atuais
          const dataStr = new Date(pedidoSelecionado.data).toISOString().split('T')[0];
          setEditarData(dataStr);
          setEditarPeriodo(pedidoSelecionado.periodo);
          setEditarTipoApoio(pedidoSelecionado.tipoApoio);
          setEditarObservacoes(pedidoSelecionado.observacoes || "");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'pt' ? 'Editar Pedido' : 'Edit Request'}</DialogTitle>
            <DialogDescription>
              {language === 'pt' ? 'Altere os detalhes do pedido de apoio' : 'Change the support request details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'pt' ? 'Data' : 'Date'}</label>
              <Input
                type="date"
                value={editarData}
                onChange={(e) => setEditarData(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'pt' ? 'Período' : 'Period'}</label>
              <Select value={editarPeriodo} onValueChange={(v) => setEditarPeriodo(v as 'manha' | 'tarde' | 'dia_todo')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">{language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)'}</SelectItem>
                  <SelectItem value="tarde">{language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)'}</SelectItem>
                  <SelectItem value="dia_todo">{language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9am-6pm)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'pt' ? 'Tipo de Apoio' : 'Support Type'}</label>
              <Select value={editarTipoApoio} onValueChange={(v) => setEditarTipoApoio(v as 'cobertura_ferias' | 'substituicao_vidros' | 'outro')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cobertura_ferias">{language === 'pt' ? 'Cobertura de Férias' : 'Vacation Coverage'}</SelectItem>
                  <SelectItem value="substituicao_vidros">{language === 'pt' ? 'Substituição de Vidros' : 'Glass Replacement'}</SelectItem>
                  <SelectItem value="outro">{language === 'pt' ? 'Outro' : 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'pt' ? 'Observações' : 'Notes'}</label>
              <Textarea
                value={editarObservacoes}
                onChange={(e) => setEditarObservacoes(e.target.value)}
                placeholder={language === 'pt' ? 'Observações adicionais...' : 'Additional notes...'}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarDialogOpen(false)}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                if (pedidoSelecionado) {
                  editarMutation.mutate({
                    token,
                    pedidoId: pedidoSelecionado.id,
                    data: editarData,
                    periodo: editarPeriodo,
                    tipoApoio: editarTipoApoio,
                    observacoes: editarObservacoes,
                  });
                }
              }}
              disabled={editarMutation.isPending}
            >
              {editarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              {language === 'pt' ? 'Guardar' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Dia */}
      <Dialog open={diaDetalheOpen} onOpenChange={setDiaDetalheOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              {language === 'pt' ? 'Atividades do Dia' : 'Day Activities'}
            </DialogTitle>
            <DialogDescription>
              {diaDetalheSelecionado.data && new Date(diaDetalheSelecionado.data + 'T12:00:00').toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {diaDetalheSelecionado.pedidos.filter((p: any) => p.estado !== 'reprovado' && p.estado !== 'anulado' && p.estado !== 'cancelado').map((pedido: any, idx: number) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${
                  pedido.estado === 'pendente' ? 'bg-yellow-50 border-yellow-200' :
                  pedido.estado === 'aprovado' ? 'bg-green-50 border-green-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">{pedido.loja?.nome || 'Loja'}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    pedido.estado === 'pendente' ? 'bg-yellow-200 text-yellow-800' :
                    pedido.estado === 'aprovado' ? 'bg-green-200 text-green-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {pedido.estado === 'pendente' ? (language === 'pt' ? 'Pendente' : 'Pending') :
                     pedido.estado === 'aprovado' ? (language === 'pt' ? 'Aprovado' : 'Approved') :
                     (language === 'pt' ? 'Rejeitado' : 'Rejected')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">{language === 'pt' ? 'Período:' : 'Period:'}</span>
                    <span className={`ml-1 font-medium ${
                      pedido.periodo === 'manha' ? 'text-purple-600' :
                      pedido.periodo === 'tarde' ? 'text-blue-600' :
                      'text-green-600'
                    }`}>
                      {pedido.periodo === 'manha' ? (language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9h-13h)') :
                       pedido.periodo === 'tarde' ? (language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (14h-18h)') :
                       (language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9h-18h)')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{language === 'pt' ? 'Tipo:' : 'Type:'}</span>
                    <span className="ml-1 font-medium text-gray-700">
                      {pedido.tipoApoio === 'cobertura_ferias' ? (language === 'pt' ? 'Cobertura de férias' : 'Holiday coverage') :
                       pedido.tipoApoio === 'substituicao_vidros' ? (language === 'pt' ? 'Substituição de vidros' : 'Glass replacement') :
                       (language === 'pt' ? 'Outro' : 'Other')}
                    </span>
                  </div>
                </div>
                {pedido.observacoes && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">{language === 'pt' ? 'Obs:' : 'Notes:'}</span>
                    <span className="ml-1 text-gray-700">{pedido.observacoes}</span>
                  </div>
                )}
                {pedido.estado === 'pendente' && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 flex-1"
                      onClick={() => {
                        setPedidoSelecionado(pedido);
                        setDiaDetalheOpen(false);
                        aprovarMutation.mutate({ token, pedidoId: pedido.id });
                      }}
                      disabled={aprovarMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {language === 'pt' ? 'Aprovar' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setPedidoSelecionado(pedido);
                        setDiaDetalheOpen(false);
                        setReprovarDialogOpen(true);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {language === 'pt' ? 'Reprovar' : 'Reject'}
                    </Button>
                  </div>
                )}
                {pedido.estado === 'aprovado' && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setPedidoSelecionado(pedido);
                        setEditarData(new Date(pedido.data).toISOString().split('T')[0]);
                        setEditarPeriodo(pedido.periodo);
                        setDiaDetalheOpen(false);
                        setEditarDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      {language === 'pt' ? 'Editar' : 'Edit'}
                    </Button>
                    {(() => {
                      const links = gerarLinksCalendario(pedido);
                      return (
                        <>
                          <a
                            href={links.googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                            title="Google Calendar"
                          >
                            <Calendar className="h-4 w-4" />
                          </a>
                          <a
                            href={links.outlookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                            title="Outlook"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                          <a
                            href={links.icsUrl}
                            download={`apoio-${pedido.id}.ics`}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                            title="Download ICS"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
            
            {/* Agendamentos do dia */}
            {diaDetalheSelecionado.agendamentos && diaDetalheSelecionado.agendamentos.length > 0 && (
              <>
                <div className="border-t pt-3 mt-3">
                  <h4 className="text-sm font-semibold text-teal-700 mb-2 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {language === 'pt' ? 'Agendamentos' : 'Appointments'}
                  </h4>
                </div>
                {diaDetalheSelecionado.agendamentos.map((agendamento: any, idx: number) => (
                  <div 
                    key={`ag-${idx}`}
                    className="p-3 rounded-lg border bg-teal-50 border-teal-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">
                        {agendamento.loja?.nome || agendamento.descricao || (language === 'pt' ? 'Agendamento Pessoal' : 'Personal Appointment')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-teal-200 text-teal-800">
                        {language === 'pt' ? 'Agendamento' : 'Appointment'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">{language === 'pt' ? 'Período:' : 'Period:'}</span>
                        <span className={`ml-1 font-medium ${
                          agendamento.agendamento_volante_periodo === 'manha' ? 'text-purple-600' :
                          agendamento.agendamento_volante_periodo === 'tarde' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {agendamento.agendamento_volante_periodo === 'manha' ? (language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9h-13h)') :
                           agendamento.agendamento_volante_periodo === 'tarde' ? (language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (14h-18h)') :
                           (language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9h-18h)')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">{language === 'pt' ? 'Tipo:' : 'Type:'}</span>
                        <span className="ml-1 font-medium text-gray-700">
                          {agendamento.agendamento_volante_tipo ? (
                            agendamento.agendamento_volante_tipo === 'cobertura_ferias' ? (language === 'pt' ? 'Cobertura de férias' : 'Holiday coverage') :
                            agendamento.agendamento_volante_tipo === 'substituicao_vidros' ? (language === 'pt' ? 'Substituição de vidros' : 'Glass replacement') :
                            (language === 'pt' ? 'Outro' : 'Other')
                          ) : (language === 'pt' ? 'Pessoal' : 'Personal')}
                        </span>
                      </div>
                    </div>
                    {agendamento.descricao && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">{language === 'pt' ? 'Obs:' : 'Notes:'}</span>
                        <span className="ml-1 text-gray-700">{agendamento.descricao}</span>
                      </div>
                    )}
                    {/* Botões de editar e apagar */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setAgendamentoSelecionado(agendamento);
                          setEditarAgendamentoData(new Date(agendamento.data).toISOString().split('T')[0]);
                          setEditarAgendamentoPeriodo(agendamento.agendamento_volante_periodo);
                          setEditarAgendamentoLojaId(agendamento.lojaId);
                          setEditarAgendamentoTipoApoio(agendamento.agendamento_volante_tipo);
                          setEditarAgendamentoTitulo(agendamento.titulo || '');
                          setEditarAgendamentoDescricao(agendamento.descricao || '');
                          setDiaDetalheOpen(false);
                          setEditarAgendamentoOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {language === 'pt' ? 'Editar' : 'Edit'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          if (confirm(language === 'pt' ? 'Tem a certeza que quer eliminar este agendamento?' : 'Are you sure you want to delete this appointment?')) {
                            eliminarAgendamentoMutation.mutate({
                              token,
                              agendamentoId: agendamento.id,
                            });
                          }
                        }}
                        disabled={eliminarAgendamentoMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {language === 'pt' ? 'Apagar' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {/* Bloqueios do dia */}
            {diaDetalheSelecionado.bloqueios && diaDetalheSelecionado.bloqueios.length > 0 && (
              <>
                <div className="border-t pt-3 mt-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <X className="h-4 w-4" />
                    {language === 'pt' ? 'Bloqueios' : 'Blocks'}
                  </h4>
                </div>
                {diaDetalheSelecionado.bloqueios.map((bloqueio: any, idx: number) => (
                  <div 
                    key={`bl-${idx}`}
                    className="p-3 rounded-lg border bg-gray-100 border-gray-300"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800">
                        {bloqueio.motivo || (language === 'pt' ? 'Bloqueado' : 'Blocked')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-300 text-gray-700">
                        {language === 'pt' ? 'Bloqueio' : 'Block'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">{language === 'pt' ? 'Período:' : 'Period:'}</span>
                      <span className="ml-1 font-medium text-gray-700">
                        {bloqueio.periodo === 'manha' ? (language === 'pt' ? 'Manhã' : 'Morning') :
                         bloqueio.periodo === 'tarde' ? (language === 'pt' ? 'Tarde' : 'Afternoon') :
                         (language === 'pt' ? 'Dia Todo' : 'Full Day')}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {/* Mensagem quando não há atividades */}
            {diaDetalheSelecionado.pedidos.filter((p: any) => p.estado !== 'reprovado' && p.estado !== 'anulado' && p.estado !== 'cancelado').length === 0 && 
             (!diaDetalheSelecionado.agendamentos || diaDetalheSelecionado.agendamentos.length === 0) && 
             (!diaDetalheSelecionado.bloqueios || diaDetalheSelecionado.bloqueios.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{language === 'pt' ? 'Nenhuma atividade para este dia' : 'No activities for this day'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiaDetalheOpen(false)}>
              {language === 'pt' ? 'Fechar' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criar Agendamento */}
      <Dialog open={criarAgendamentoOpen} onOpenChange={setCriarAgendamentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-600" />
              {language === 'pt' ? 'Criar Agendamento' : 'Create Appointment'}
            </DialogTitle>
            <DialogDescription>
              {language === 'pt' ? 'Crie um novo agendamento para uma loja ou compromisso pessoal.' : 'Create a new appointment for a store or personal commitment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Seletor de Loja ou Pessoal */}
            <div>
              <Label>{language === 'pt' ? 'Para quem?' : 'For whom?'}</Label>
              <Select
                value={novoAgendamentoLojaId?.toString() || 'pessoal'}
                onValueChange={(value) => {
                  if (value === 'pessoal') {
                    setNovoAgendamentoLojaId(null);
                    setNovoAgendamentoTipoApoio(null);
                  } else {
                    setNovoAgendamentoLojaId(parseInt(value));
                    setNovoAgendamentoTipoApoio('cobertura_ferias');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'pt' ? 'Selecionar...' : 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-teal-600" />
                      {language === 'pt' ? 'Volante (Pessoal)' : 'Driver (Personal)'}
                    </div>
                  </SelectItem>
                  {volanteAuth.lojasAtribuidas
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((loja) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-600" />
                          {loja.nome}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div>
              <Label>{language === 'pt' ? 'Data' : 'Date'}</Label>
              <Input
                type="date"
                value={novoAgendamentoData}
                onChange={(e) => setNovoAgendamentoData(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Período */}
            <div>
              <Label>{language === 'pt' ? 'Período' : 'Period'}</Label>
              <Select
                value={novoAgendamentoPeriodo}
                onValueChange={(value) => setNovoAgendamentoPeriodo(value as 'manha' | 'tarde' | 'dia_todo')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-purple-400 rounded"></span>
                      {language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="tarde">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-400 rounded"></span>
                      {language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="dia_todo">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-400 rounded"></span>
                      {language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9am-6pm)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Apoio (apenas para lojas) */}
            {novoAgendamentoLojaId && (
              <div>
                <Label>{language === 'pt' ? 'Tipo de Apoio' : 'Support Type'}</Label>
                <Select
                  value={novoAgendamentoTipoApoio || 'cobertura_ferias'}
                  onValueChange={(value) => setNovoAgendamentoTipoApoio(value as 'cobertura_ferias' | 'substituicao_vidros' | 'outro')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cobertura_ferias">
                      {language === 'pt' ? 'Cobertura de Férias' : 'Vacation Coverage'}
                    </SelectItem>
                    <SelectItem value="substituicao_vidros">
                      {language === 'pt' ? 'Substituição de Vidros' : 'Glass Replacement'}
                    </SelectItem>
                    <SelectItem value="outro">
                      {language === 'pt' ? 'Outro' : 'Other'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Título (apenas para pessoal) */}
            {!novoAgendamentoLojaId && (
              <div>
                <Label>{language === 'pt' ? 'Título' : 'Title'}</Label>
                <Input
                  value={novoAgendamentoTitulo}
                  onChange={(e) => setNovoAgendamentoTitulo(e.target.value)}
                  placeholder={language === 'pt' ? 'Ex: Reunião, Formação...' : 'Ex: Meeting, Training...'}
                />
              </div>
            )}

            {/* Descrição */}
            <div>
              <Label>{language === 'pt' ? 'Observações' : 'Notes'}</Label>
              <Textarea
                value={novoAgendamentoDescricao}
                onChange={(e) => setNovoAgendamentoDescricao(e.target.value)}
                placeholder={language === 'pt' ? 'Detalhes adicionais...' : 'Additional details...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCriarAgendamentoOpen(false)}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                if (!novoAgendamentoData) {
                  toast.error(language === 'pt' ? 'Selecione uma data' : 'Select a date');
                  return;
                }
                criarAgendamentoMutation.mutate({
                  token,
                  lojaId: novoAgendamentoLojaId,
                  data: novoAgendamentoData,
                  periodo: novoAgendamentoPeriodo,
                  tipoApoio: novoAgendamentoLojaId ? novoAgendamentoTipoApoio : null,
                  titulo: !novoAgendamentoLojaId ? novoAgendamentoTitulo : undefined,
                  descricao: novoAgendamentoDescricao || undefined,
                });
              }}
              disabled={criarAgendamentoMutation.isPending}
            >
              {criarAgendamentoMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {language === 'pt' ? 'Criar' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Agendamento */}
      <Dialog open={editarAgendamentoOpen} onOpenChange={setEditarAgendamentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-teal-600" />
              {language === 'pt' ? 'Editar Agendamento' : 'Edit Appointment'}
            </DialogTitle>
            <DialogDescription>
              {language === 'pt' ? 'Altere os detalhes do agendamento.' : 'Change the appointment details.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Seletor de Loja ou Pessoal */}
            <div>
              <Label>{language === 'pt' ? 'Para quem?' : 'For whom?'}</Label>
              <Select
                value={editarAgendamentoLojaId?.toString() || 'pessoal'}
                onValueChange={(value) => {
                  if (value === 'pessoal') {
                    setEditarAgendamentoLojaId(null);
                    setEditarAgendamentoTipoApoio(null);
                  } else {
                    setEditarAgendamentoLojaId(parseInt(value));
                    setEditarAgendamentoTipoApoio('cobertura_ferias');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'pt' ? 'Selecionar...' : 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-teal-600" />
                      {language === 'pt' ? 'Volante (Pessoal)' : 'Driver (Personal)'}
                    </div>
                  </SelectItem>
                  {volanteAuth.lojasAtribuidas
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((loja) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-600" />
                          {loja.nome}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div>
              <Label>{language === 'pt' ? 'Data' : 'Date'}</Label>
              <Input
                type="date"
                value={editarAgendamentoData}
                onChange={(e) => setEditarAgendamentoData(e.target.value)}
              />
            </div>

            {/* Período */}
            <div>
              <Label>{language === 'pt' ? 'Período' : 'Period'}</Label>
              <Select
                value={editarAgendamentoPeriodo}
                onValueChange={(value) => setEditarAgendamentoPeriodo(value as 'manha' | 'tarde' | 'dia_todo')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-purple-400 rounded"></span>
                      {language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="tarde">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-400 rounded"></span>
                      {language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="dia_todo">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-400 rounded"></span>
                      {language === 'pt' ? 'Dia Todo (9h-18h)' : 'Full Day (9am-6pm)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Apoio (apenas para lojas) */}
            {editarAgendamentoLojaId && (
              <div>
                <Label>{language === 'pt' ? 'Tipo de Apoio' : 'Support Type'}</Label>
                <Select
                  value={editarAgendamentoTipoApoio || 'cobertura_ferias'}
                  onValueChange={(value) => setEditarAgendamentoTipoApoio(value as 'cobertura_ferias' | 'substituicao_vidros' | 'outro')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cobertura_ferias">
                      {language === 'pt' ? 'Cobertura de Férias' : 'Vacation Coverage'}
                    </SelectItem>
                    <SelectItem value="substituicao_vidros">
                      {language === 'pt' ? 'Substituição de Vidros' : 'Glass Replacement'}
                    </SelectItem>
                    <SelectItem value="outro">
                      {language === 'pt' ? 'Outro' : 'Other'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Título (apenas para pessoal) */}
            {!editarAgendamentoLojaId && (
              <div>
                <Label>{language === 'pt' ? 'Título' : 'Title'}</Label>
                <Input
                  value={editarAgendamentoTitulo}
                  onChange={(e) => setEditarAgendamentoTitulo(e.target.value)}
                  placeholder={language === 'pt' ? 'Ex: Reunião, Formação...' : 'Ex: Meeting, Training...'}
                />
              </div>
            )}

            {/* Descrição */}
            <div>
              <Label>{language === 'pt' ? 'Observações' : 'Notes'}</Label>
              <Textarea
                value={editarAgendamentoDescricao}
                onChange={(e) => setEditarAgendamentoDescricao(e.target.value)}
                placeholder={language === 'pt' ? 'Detalhes adicionais...' : 'Additional details...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditarAgendamentoOpen(false)}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                if (!editarAgendamentoData) {
                  toast.error(language === 'pt' ? 'Selecione uma data' : 'Select a date');
                  return;
                }
                if (!agendamentoSelecionado) return;
                editarAgendamentoMutation.mutate({
                  token,
                  agendamentoId: agendamentoSelecionado.id,
                  lojaId: editarAgendamentoLojaId,
                  data: editarAgendamentoData,
                  periodo: editarAgendamentoPeriodo,
                  tipoApoio: editarAgendamentoLojaId ? editarAgendamentoTipoApoio : null,
                  titulo: !editarAgendamentoLojaId ? editarAgendamentoTitulo : undefined,
                  descricao: editarAgendamentoDescricao || undefined,
                });
              }}
              disabled={editarAgendamentoMutation.isPending}
            >
              {editarAgendamentoMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Pencil className="h-4 w-4 mr-1" />
              )}
              {language === 'pt' ? 'Guardar' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Bloquear Dia */}
      <Dialog open={bloquearDiaOpen} onOpenChange={setBloquearDiaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-gray-600" />
              {language === 'pt' ? 'Bloquear Dia' : 'Block Day'}
            </DialogTitle>
            <DialogDescription>
              {language === 'pt' ? 'Bloqueie um dia para férias, faltas, formações ou outros motivos.' : 'Block a day for vacations, absences, training or other reasons.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Data */}
            <div>
              <Label>{language === 'pt' ? 'Data' : 'Date'}</Label>
              <Input
                type="date"
                value={bloqueioData}
                onChange={(e) => setBloqueioData(e.target.value)}
              />
            </div>

            {/* Período */}
            <div>
              <Label>{language === 'pt' ? 'Período' : 'Period'}</Label>
              <Select
                value={bloqueioPeriodo}
                onValueChange={(value) => setBloqueioPeriodo(value as 'manha' | 'tarde' | 'dia_todo')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">
                    {language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9am-1pm)'}
                  </SelectItem>
                  <SelectItem value="tarde">
                    {language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (2pm-6pm)'}
                  </SelectItem>
                  <SelectItem value="dia_todo">
                    {language === 'pt' ? 'Dia Todo' : 'Full Day'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Bloqueio */}
            <div>
              <Label>{language === 'pt' ? 'Motivo' : 'Reason'}</Label>
              <Select
                value={bloqueioTipo}
                onValueChange={(value) => setBloqueioTipo(value as 'ferias' | 'falta' | 'formacao' | 'pessoal' | 'outro')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ferias">
                    <div className="flex items-center gap-2">
                      <span>🏖️</span>
                      {language === 'pt' ? 'Férias' : 'Vacation'}
                    </div>
                  </SelectItem>
                  <SelectItem value="falta">
                    <div className="flex items-center gap-2">
                      <span>🩺</span>
                      {language === 'pt' ? 'Falta' : 'Absence'}
                    </div>
                  </SelectItem>
                  <SelectItem value="formacao">
                    <div className="flex items-center gap-2">
                      <span>📚</span>
                      {language === 'pt' ? 'Formação' : 'Training'}
                    </div>
                  </SelectItem>
                  <SelectItem value="pessoal">
                    <div className="flex items-center gap-2">
                      <span>👤</span>
                      {language === 'pt' ? 'Pessoal' : 'Personal'}
                    </div>
                  </SelectItem>
                  <SelectItem value="outro">
                    <div className="flex items-center gap-2">
                      <span>📝</span>
                      {language === 'pt' ? 'Outro' : 'Other'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div>
              <Label>{language === 'pt' ? 'Descrição (opcional)' : 'Description (optional)'}</Label>
              <Textarea
                value={bloqueioMotivo}
                onChange={(e) => setBloqueioMotivo(e.target.value)}
                placeholder={language === 'pt' ? 'Detalhes adicionais...' : 'Additional details...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBloquearDiaOpen(false)}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              variant="secondary"
              className="bg-gray-600 hover:bg-gray-700 text-white"
              onClick={() => {
                if (!bloqueioData) {
                  toast.error(language === 'pt' ? 'Selecione uma data' : 'Select a date');
                  return;
                }
                criarBloqueioMutation.mutate({
                  token,
                  data: bloqueioData,
                  periodo: bloqueioPeriodo,
                  tipo: bloqueioTipo,
                  motivo: bloqueioMotivo || undefined,
                });
              }}
              disabled={criarBloqueioMutation.isPending}
            >
              {criarBloqueioMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Ban className="h-4 w-4 mr-1" />
              )}
              {language === 'pt' ? 'Bloquear' : 'Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ==================== REGISTAR SERVIÇOS DE HOJE ====================
function RegistarServicosHoje({
  token,
  volanteAuth,
  language,
}: {
  token: string;
  volanteAuth: VolanteAuth;
  language: 'pt' | 'en';
}) {
  const [registarDialogOpen, setRegistarDialogOpen] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState<{ id: number; nome: string } | null>(null);
  const [substituicaoLigeiro, setSubstituicaoLigeiro] = useState(0);
  const [reparacao, setReparacao] = useState(0);
  const [calibragem, setCalibragem] = useState(0);
  const [outros, setOutros] = useState(0);

  // Data de hoje no formato YYYY-MM-DD
  const hoje = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Buscar agendamentos de hoje
  const { data: estadoMes, refetch: refetchEstadoMes } = trpc.pedidosApoio.estadoCompletoMes.useQuery(
    {
      token,
      ano: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
    },
    { enabled: !!token }
  );

  // Buscar serviços já registados hoje
  const { data: servicosHoje, refetch: refetchServicos } = trpc.portalVolante.getServicosDia.useQuery(
    { token, data: hoje },
    { enabled: !!token }
  );

  // Mutation para registar serviços
  const registarMutation = trpc.portalVolante.registarServicos.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? 'Serviços registados com sucesso!' : 'Services registered successfully!');
      setRegistarDialogOpen(false);
      refetchServicos();
      // Reset form
      setSubstituicaoLigeiro(0);
      setReparacao(0);
      setCalibragem(0);
      setOutros(0);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filtrar agendamentos e pedidos aprovados de hoje
  const agendamentosHoje = useMemo(() => {
    if (!estadoMes) return [];
    const estadoDia = estadoMes[hoje];
    
    // Combinar agendamentos próprios e pedidos aprovados
    const agendamentos = estadoDia?.agendamentos || [];
    const pedidosAprovados = (estadoDia?.pedidos || []).filter((p: any) => p.estado === 'aprovado');
    
    // Mapear pedidos aprovados para formato de agendamento
    const pedidosMapeados = pedidosAprovados.map((p: any) => ({
      id: `pedido-${p.id}`,
      lojaId: p.lojaId,
      loja: p.loja,
      agendamento_volante_periodo: p.periodo,
      periodo: p.periodo,
    }));
    
    return [...agendamentos, ...pedidosMapeados];
  }, [estadoMes, hoje]);

  // Verificar se já tem serviços registados para uma loja
  const jaRegistado = (lojaId: number) => {
    return servicosHoje?.some((s: any) => s.lojaId === lojaId);
  };

  // Lista de todas as lojas disponíveis para o seletor (ordenadas alfabeticamente)
  const todasAsLojas = useMemo(() => {
    const lojas = (volanteAuth.lojasAtribuidas || []).slice().sort((a, b) => a.nome.localeCompare(b.nome));
    return lojas;
  }, [volanteAuth.lojasAtribuidas]);

  // Abrir modal com dados existentes se já registou
  const abrirModal = (loja: { id: number; nome: string }) => {
    setLojaSelecionada(loja);
    const servicoExistente = servicosHoje?.find((s: any) => s.lojaId === loja.id);
    if (servicoExistente) {
      setSubstituicaoLigeiro(servicoExistente.substituicaoLigeiro || 0);
      setReparacao(servicoExistente.reparacao || 0);
      setCalibragem(servicoExistente.calibragem || 0);
      setOutros(servicoExistente.outros || 0);
    } else {
      setSubstituicaoLigeiro(0);
      setReparacao(0);
      setCalibragem(0);
      setOutros(0);
    }
    setRegistarDialogOpen(true);
  };

  // Quando muda a loja no seletor do modal, carregar dados existentes se houver
  const handleLojaChange = (lojaIdStr: string) => {
    if (lojaIdStr === '0') {
      setLojaSelecionada({ id: 0, nome: language === 'pt' ? 'Outros (Loja externa)' : 'Others (External store)' });
      const outrosServico = servicosHoje?.find((s: any) => s.lojaId === null);
      if (outrosServico) {
        setSubstituicaoLigeiro(outrosServico.substituicaoLigeiro || 0);
        setReparacao(outrosServico.reparacao || 0);
        setCalibragem(outrosServico.calibragem || 0);
        setOutros(outrosServico.outros || 0);
      } else {
        setSubstituicaoLigeiro(0);
        setReparacao(0);
        setCalibragem(0);
        setOutros(0);
      }
    } else {
      const lojaId = parseInt(lojaIdStr);
      const loja = todasAsLojas.find(l => l.id === lojaId);
      if (loja) {
        setLojaSelecionada(loja);
        const servicoExistente = servicosHoje?.find((s: any) => s.lojaId === lojaId);
        if (servicoExistente) {
          setSubstituicaoLigeiro(servicoExistente.substituicaoLigeiro || 0);
          setReparacao(servicoExistente.reparacao || 0);
          setCalibragem(servicoExistente.calibragem || 0);
          setOutros(servicoExistente.outros || 0);
        } else {
          setSubstituicaoLigeiro(0);
          setReparacao(0);
          setCalibragem(0);
          setOutros(0);
        }
      }
    }
  };

  const totalServicos = substituicaoLigeiro + reparacao + calibragem + outros;

  // Serviços registados em lojas NÃO agendadas (excluindo Outros/null)
  const lojasNaoAgendadasComServicos = useMemo(() => {
    if (!servicosHoje) return [];
    const agendadasIds = new Set(agendamentosHoje.map((a: any) => a.lojaId));
    return servicosHoje
      .filter((s: any) => s.lojaId !== null && !agendadasIds.has(s.lojaId))
      .map((s: any) => {
        const loja = todasAsLojas.find(l => l.id === s.lojaId);
        return {
          ...s,
          lojaNome: loja?.nome || `Loja #${s.lojaId}`,
          total: (s.substituicaoLigeiro || 0) + (s.reparacao || 0) + (s.calibragem || 0) + (s.outros || 0),
        };
      });
  }, [servicosHoje, agendamentosHoje, todasAsLojas]);

  // Verificar se já registou em "Outros (Loja externa)"
  const outrosRegistado = servicosHoje?.some((s: any) => s.lojaId === null);
  const outrosServico = servicosHoje?.find((s: any) => s.lojaId === null);
  const totalOutros = outrosServico 
    ? (outrosServico.substituicaoLigeiro + outrosServico.reparacao + outrosServico.calibragem + outrosServico.outros)
    : 0;

  const abrirModalOutros = () => {
    setLojaSelecionada({ id: 0, nome: language === 'pt' ? 'Outros (Loja externa)' : 'Others (External store)' });
    if (outrosServico) {
      setSubstituicaoLigeiro(outrosServico.substituicaoLigeiro || 0);
      setReparacao(outrosServico.reparacao || 0);
      setCalibragem(outrosServico.calibragem || 0);
      setOutros(outrosServico.outros || 0);
    } else {
      setSubstituicaoLigeiro(0);
      setReparacao(0);
      setCalibragem(0);
      setOutros(0);
    }
    setRegistarDialogOpen(true);
  };

  return (
    <>
      <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Wrench className="h-5 w-5" />
            {language === 'pt' ? 'Registar Serviços de Hoje' : 'Register Today\'s Services'}
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            {agendamentosHoje.length > 0 
              ? (language === 'pt' 
                ? `${agendamentosHoje.length} ${agendamentosHoje.length === 1 ? 'loja agendada' : 'lojas agendadas'} para hoje`
                : `${agendamentosHoje.length} ${agendamentosHoje.length === 1 ? 'store scheduled' : 'stores scheduled'} for today`)
              : (language === 'pt' ? 'Sem agendamentos para hoje' : 'No schedules for today')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agendamentosHoje.map((agendamento: any) => {
              const loja = { id: agendamento.lojaId, nome: agendamento.loja?.nome || 'Loja' };
              const registado = jaRegistado(loja.id);
              const servicoExistente = servicosHoje?.find((s: any) => s.lojaId === loja.id);
              const totalLoja = servicoExistente 
                ? (servicoExistente.substituicaoLigeiro + servicoExistente.reparacao + servicoExistente.calibragem + servicoExistente.outros)
                : 0;

              return (
                <div 
                  key={agendamento.id} 
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{loja.nome}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {agendamento.agendamento_volante_periodo === 'manha' 
                          ? (language === 'pt' ? 'Manhã (9h-13h)' : 'Morning (9h-13h)')
                          : agendamento.agendamento_volante_periodo === 'tarde'
                            ? (language === 'pt' ? 'Tarde (14h-18h)' : 'Afternoon (14h-18h)')
                            : (language === 'pt' ? 'Dia Todo' : 'Full Day')}
                      </p>
                      {registado && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {language === 'pt' ? 'Registado' : 'Registered'}
                          </Badge>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {totalLoja} {language === 'pt' ? 'serviços' : 'services'}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={registado ? "outline" : "default"}
                      className={registado ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}
                      onClick={() => abrirModal(loja)}
                    >
                      {registado ? (
                        <>
                          <Pencil className="h-4 w-4 mr-1" />
                          {language === 'pt' ? 'Editar' : 'Edit'}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          {language === 'pt' ? 'Registar' : 'Register'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Lojas não agendadas com serviços registados */}
            {lojasNaoAgendadasComServicos.map((servico: any) => {
              const loja = { id: servico.lojaId, nome: servico.lojaNome };
              return (
                <div 
                  key={`extra-${servico.lojaId}`} 
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-dashed border-purple-300 dark:border-purple-700 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-700 dark:text-purple-300">{loja.nome}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {language === 'pt' ? 'Loja não agendada' : 'Unscheduled store'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {language === 'pt' ? 'Registado' : 'Registered'}
                        </Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {servico.total} {language === 'pt' ? 'serviços' : 'services'}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-300 text-purple-700"
                      onClick={() => abrirModal(loja)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      {language === 'pt' ? 'Editar' : 'Edit'}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Opção Outros (Loja externa) */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-dashed border-orange-300 dark:border-orange-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-orange-700 dark:text-orange-300">
                    {language === 'pt' ? 'Outros (Loja externa)' : 'Others (External store)'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'pt' ? 'Serviços em lojas não agendadas' : 'Services at unscheduled stores'}
                  </p>
                  {outrosRegistado && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {language === 'pt' ? 'Registado' : 'Registered'}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {totalOutros} {language === 'pt' ? 'serviços' : 'services'}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={outrosRegistado ? "outline" : "default"}
                  className={outrosRegistado ? "border-orange-300 text-orange-700" : "bg-orange-500 hover:bg-orange-600 text-white"}
                  onClick={abrirModalOutros}
                >
                  {outrosRegistado ? (
                    <>
                      <Pencil className="h-4 w-4 mr-1" />
                      {language === 'pt' ? 'Editar' : 'Edit'}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      {language === 'pt' ? 'Registar' : 'Register'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Registo */}
      <Dialog open={registarDialogOpen} onOpenChange={setRegistarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Registar Serviços' : 'Register Services'}
            </DialogTitle>
            <DialogDescription>
              {new Date().toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Seletor de Loja - editável */}
            <div className="space-y-2">
              <Label>
                {language === 'pt' ? 'Loja' : 'Store'}
              </Label>
              <Select 
                value={lojaSelecionada ? lojaSelecionada.id.toString() : '0'} 
                onValueChange={handleLojaChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <span className="text-orange-600 font-medium">
                      {language === 'pt' ? 'Outros (Loja externa)' : 'Others (External store)'}
                    </span>
                  </SelectItem>
                  {todasAsLojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id.toString()}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {language === 'pt' 
                  ? 'Pode alterar a loja se necessário' 
                  : 'You can change the store if needed'}
              </p>
            </div>

            {/* Substituição Ligeiro */}
            <div className="space-y-2">
              <Label htmlFor="substituicao">
                {language === 'pt' ? 'Substituição Ligeiro' : 'Light Vehicle Replacement'}
              </Label>
              <Select 
                value={substituicaoLigeiro.toString()} 
                onValueChange={(v) => setSubstituicaoLigeiro(parseInt(v))}
              >
                <SelectTrigger id="substituicao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => i).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reparação */}
            <div className="space-y-2">
              <Label htmlFor="reparacao">
                {language === 'pt' ? 'Reparação' : 'Repair'}
              </Label>
              <Select 
                value={reparacao.toString()} 
                onValueChange={(v) => setReparacao(parseInt(v))}
              >
                <SelectTrigger id="reparacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => i).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calibragem */}
            <div className="space-y-2">
              <Label htmlFor="calibragem">
                {language === 'pt' ? 'Calibragem' : 'Calibration'}
              </Label>
              <Select 
                value={calibragem.toString()} 
                onValueChange={(v) => setCalibragem(parseInt(v))}
              >
                <SelectTrigger id="calibragem">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => i).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Outros */}
            <div className="space-y-2">
              <Label htmlFor="outros">
                {language === 'pt' ? 'Outros' : 'Others'}
              </Label>
              <Select 
                value={outros.toString()} 
                onValueChange={(v) => setOutros(parseInt(v))}
              >
                <SelectTrigger id="outros">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => i).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resumo */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{language === 'pt' ? 'Total de Serviços:' : 'Total Services:'}</span>
                <span className="text-lg text-blue-600 dark:text-blue-400">{totalServicos}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRegistarDialogOpen(false)}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (!lojaSelecionada) return;
                registarMutation.mutate({
                  token,
                  lojaId: lojaSelecionada.id === 0 ? null : lojaSelecionada.id,
                  data: hoje,
                  substituicaoLigeiro,
                  reparacao,
                  calibragem,
                  outros,
                });
              }}
              disabled={registarMutation.isPending}
            >
              {registarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              {language === 'pt' ? 'Guardar' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
