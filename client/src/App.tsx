import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DemoBanner } from "./components/DemoBanner";
import { LanguageProvider } from "./contexts/LanguageContext";

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Lazy load all pages
const MenuInicial = lazy(() => import("./pages/MenuInicial"));
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardVolante = lazy(() => import("./pages/DashboardVolante"));
const AssistenteIA = lazy(() => import("./pages/AssistenteIA"));
const Lojas = lazy(() => import("./pages/Lojas"));
const RH = lazy(() => import("./pages/RH"));
const HistoricoEnviosRelatorios = lazy(() => import("./pages/HistoricoEnviosRelatorios"));
const Gestores = lazy(() => import("./pages/Gestores"));
const GestaoUtilizadores = lazy(() => import("./pages/GestaoUtilizadores"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const PendentesAdmin = lazy(() => import("./pages/PendentesAdmin"));
const MinhasLojas = lazy(() => import("./pages/MinhasLojas"));
const RelacoesLojas = lazy(() => import("./pages/RelacoesLojas"));
const Volantes = lazy(() => import("./pages/Volantes"));
const LogAtribuicoes = lazy(() => import("./pages/LogAtribuicoes"));
const PortalGestor = lazy(() => import("./pages/PortalGestor"));
const AnaliseFichas = lazy(() => import("./pages/AnaliseFichas"));
const ControloStock = lazy(() => import("./pages/ControloStock"));
const AgendamentosGestor = lazy(() => import("./pages/AgendamentosGestor"));
const Documentos = lazy(() => import("./pages/Documentos"));
const RelatorioLivre = lazy(() => import("./pages/RelatorioLivre"));
const RelatorioCompleto = lazy(() => import("./pages/RelatorioCompleto"));
const MeusRelatorios = lazy(() => import("./pages/MeusRelatorios"));
const RelatoriosIA = lazy(() => import("./pages/RelatoriosIA"));
const HistoricoRelatoriosIA = lazy(() => import("./pages/HistoricoRelatoriosIA"));
const ComparacaoRelatoriosIA = lazy(() => import("./pages/ComparacaoRelatoriosIA"));
const HistoricoLoja = lazy(() => import("./pages/HistoricoLoja"));
const Pendentes = lazy(() => import("./pages/Pendentes"));
const HistoricoPontos = lazy(() => import("./pages/HistoricoPontos"));
const DashboardAlertas = lazy(() => import("./pages/DashboardAlertas"));
const ConfiguracoesAlertas = lazy(() => import("./pages/ConfiguracoesAlertas"));
const Categorias = lazy(() => import("./pages/Categorias"));
const ReuniõesGestores = lazy(() => import("./pages/ReunioesGestores"));
const TopicosReuniao = lazy(() => import("./pages/TopicosReuniao"));
const ReuniõesLojas = lazy(() => import("./pages/ReunioesLojas"));
const ResultadosUpload = lazy(() => import("./pages/ResultadosUpload"));
const NPSUpload = lazy(() => import("./pages/NPSUpload"));
const NPSDashboard = lazy(() => import("./pages/NPSDashboard").then(m => ({ default: m.NPSDashboard })));
const ResultadosDashboard = lazy(() => import("./pages/ResultadosDashboard").then(m => ({ default: m.ResultadosDashboard })));
const ComparacaoLojas = lazy(() => import("./pages/ComparacaoLojas").then(m => ({ default: m.ComparacaoLojas })));
const RelatorioIAResultados = lazy(() => import("./pages/RelatorioIAResultados").then(m => ({ default: m.RelatorioIAResultados })));
const RelatorioBoard = lazy(() => import("./pages/RelatorioBoard"));
const ReunioesQuinzenais = lazy(() => import("./pages/ReunioesQuinzenais"));
const ResumosGlobais = lazy(() => import("./pages/ResumosGlobais"));
const OcorrenciaEstrutural = lazy(() => import("./pages/OcorrenciaEstrutural"));
const HistoricoOcorrencias = lazy(() => import("./pages/HistoricoOcorrencias"));
const Notas = lazy(() => import("./pages/Notas"));
const RecepcaoVidros = lazy(() => import("./pages/RecepcaoVidros"));
const Todos = lazy(() => import("./pages/Todos"));
const TodoWidget = lazy(() => import("./pages/TodoWidget"));
const ProjecaoVisitasPage = lazy(() => import("./pages/ProjecaoVisitasPage"));
const AssistenteWidget = lazy(() => import("./pages/AssistenteWidget"));
const PortalLoja = lazy(() => import("./pages/PortalLoja"));
const PortalLojaWidget = lazy(() => import("./pages/PortalLojaWidget"));
const GestaoRecalibra = lazy(() => import("./pages/GestaoRecalibra"));
const PortalRecalibra = lazy(() => import("./pages/PortalRecalibra"));
const DashboardRecalibra = lazy(() => import("./pages/DashboardRecalibra"));
const Ferias = lazy(() => import("./pages/Ferias"));
const CalendarioVolantes = lazy(() => import("./pages/CalendarioVolantes"));
const DashboardVolantesGestor = lazy(() => import("./pages/DashboardVolantesGestor"));
const ReunioesLivres = lazy(() => import("./pages/ReunioesLivres"));
const ApiKeysAdmin = lazy(() => import("./pages/ApiKeysAdmin"));
const LoginNaoAutorizado = lazy(() => import("./pages/LoginNaoAutorizado"));
const NotFound = lazy(() => import("./pages/NotFound"));


// Prefetch all pages after initial load
const allImports = [
  () => import("./pages/MenuInicial"),
  () => import("./pages/Home"),
  () => import("./pages/Dashboard"),
  () => import("./pages/DashboardVolante"),
  () => import("./pages/AssistenteIA"),
  () => import("./pages/Lojas"),
  () => import("./pages/RH"),
  () => import("./pages/HistoricoEnviosRelatorios"),
  () => import("./pages/Gestores"),
  () => import("./pages/GestaoUtilizadores"),
  () => import("./pages/Relatorios"),
  () => import("./pages/PendentesAdmin"),
  () => import("./pages/MinhasLojas"),
  () => import("./pages/RelacoesLojas"),
  () => import("./pages/Volantes"),
  () => import("./pages/CalendarioVolantes"),
  () => import("./pages/DashboardVolantesGestor"),
  () => import("./pages/LogAtribuicoes"),
  () => import("./pages/PortalGestor"),
  () => import("./pages/AnaliseFichas"),
  () => import("./pages/ControloStock"),
  () => import("./pages/Documentos"),
  () => import("./pages/RelatorioLivre"),
  () => import("./pages/RelatorioCompleto"),
  () => import("./pages/MeusRelatorios"),
  () => import("./pages/RelatoriosIA"),
  () => import("./pages/HistoricoRelatoriosIA"),
  () => import("./pages/ComparacaoRelatoriosIA"),
  () => import("./pages/HistoricoLoja"),
  () => import("./pages/Pendentes"),
  () => import("./pages/HistoricoPontos"),
  () => import("./pages/DashboardAlertas"),
  () => import("./pages/ConfiguracoesAlertas"),
  () => import("./pages/Categorias"),
  () => import("./pages/Reuni\u00f5esGestores"),
  () => import("./pages/TopicosReuniao"),
  () => import("./pages/Reuni\u00f5esLojas"),
  () => import("./pages/ResultadosUpload"),
  () => import("./pages/NPSUpload"),
  () => import("./pages/NPSDashboard"),
  () => import("./pages/ResultadosDashboard"),
  () => import("./pages/ComparacaoLojas"),
  () => import("./pages/RelatorioIAResultados"),
  () => import("./pages/RelatorioBoard"),
  () => import("./pages/ReunioesQuinzenais"),
  () => import("./pages/ResumosGlobais"),
  () => import("./pages/OcorrenciaEstrutural"),
  () => import("./pages/HistoricoOcorrencias"),
  () => import("./pages/Notas"),
  () => import("./pages/RecepcaoVidros"),
  () => import("./pages/Todos"),
  () => import("./pages/TodoWidget"),
  () => import("./pages/ProjecaoVisitasPage"),
  () => import("./pages/AssistenteWidget"),
  () => import("./pages/PortalLoja"),
  () => import("./pages/PortalLojaWidget"),
  () => import("./pages/GestaoRecalibra"),
  () => import("./pages/PortalRecalibra"),
  () => import("./pages/DashboardRecalibra"),
  () => import("./pages/Ferias"),
  () => import("./pages/ApiKeysAdmin"),
];

function usePrefetchPages() {
  useEffect(() => {
    // Wait for initial page to load, then prefetch all others in background
    const timer = setTimeout(() => {
      allImports.forEach((importFn) => {
        importFn().catch(() => {}); // Silently prefetch, ignore errors
      });
    }, 1500); // Start prefetching 1.5s after mount
    return () => clearTimeout(timer);
  }, []);
}

function Router() {
  usePrefetchPages();
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={MenuInicial} />
        <Route path={"/menu"} component={MenuInicial} />
        <Route path={"/dashboard"} component={Dashboard} />
        <Route path={"/dashboard-volante"} component={DashboardVolante} />
        <Route path={"/assistente-ia"} component={AssistenteIA} />
        
        {/* Admin routes */}
        <Route path={"/lojas"} component={Lojas} />
        <Route path={"/rh"} component={RH} />
        <Route path={"/ferias"} component={Ferias} />
        <Route path={"/historico-envios-relatorios"} component={HistoricoEnviosRelatorios} />
        <Route path={"/gestores"} component={Gestores} />
        <Route path={"/utilizadores"} component={GestaoUtilizadores} />
        <Route path={"/relatorios"} component={Relatorios} />
        <Route path={"/pendentes-admin"} component={PendentesAdmin} />
        
        {/* Gestor routes */}
        <Route path={"/minhas-lojas"} component={MinhasLojas} />
        <Route path={"/relacoes-lojas"} component={RelacoesLojas} />
        <Route path={"/volantes"} component={Volantes} />
        <Route path={"/dashboard-volantes"} component={DashboardVolantesGestor} />
        <Route path={"/calendario-volantes"} component={CalendarioVolantes} />
        <Route path={"/log-atribuicoes"} component={LogAtribuicoes} />
        <Route path={"/portal-gestor"} component={PortalGestor} />
        <Route path={"/analise-fichas"} component={AnaliseFichas} />
        <Route path={"/controlo-stock"} component={ControloStock} />
        <Route path={"/agendamentos-gestor"} component={AgendamentosGestor} />
        <Route path={"/documentos"} component={Documentos} />
        <Route path={"/relatorio-livre"} component={RelatorioLivre} />
        <Route path={"/relatorio-completo"} component={RelatorioCompleto} />
        <Route path={"/meus-relatorios"} component={MeusRelatorios} />
        
        {/* Shared routes */}
        <Route path={"/relatorios-ia"} component={RelatoriosIA} />
        <Route path={"/historico-relatorios-ia"} component={HistoricoRelatoriosIA} />
        <Route path={"/comparacao-relatorios-ia"} component={ComparacaoRelatoriosIA} />
        <Route path={"/historico-loja"} component={HistoricoLoja} />
        <Route path={"/pendentes"} component={Pendentes} />
        <Route path={"/historico-pontos"} component={HistoricoPontos} />
        <Route path={"/alertas"} component={DashboardAlertas} />
        <Route path={"/configuracoes-alertas"} component={ConfiguracoesAlertas} />
        <Route path={"/categorias"} component={Categorias} />
        <Route path={"/reunioes-gestores"} component={ReuniõesGestores} />
        <Route path={"/reunioes-livres"} component={ReunioesLivres} />
        <Route path={"/topicos-reuniao"} component={TopicosReuniao} />
        <Route path={"/reunioes-lojas"} component={ReuniõesLojas} />
        <Route path={"/resultados-upload"} component={ResultadosUpload} />
        <Route path={"/nps-upload"} component={NPSUpload} />
        <Route path={"/nps-dashboard"} component={NPSDashboard} />
        <Route path={"/resultados-dashboard"} component={ResultadosDashboard} />
        <Route path={"/comparacao-lojas"} component={ComparacaoLojas} />
        <Route path={"/relatorio-ia-resultados"} component={RelatorioIAResultados} />
        <Route path={"/relatorio-board"} component={RelatorioBoard} />
        
        {/* Reuniões Quinzenais */}
        <Route path={"/reunioes-quinzenais"} component={ReunioesQuinzenais} />
        
        {/* Resumos Globais */}
        <Route path={"/resumos-globais"} component={ResumosGlobais} />
        
        {/* Ocorrências Estruturais */}
        <Route path={"/ocorrencias-estruturais/nova"} component={OcorrenciaEstrutural} />
        <Route path={"/ocorrencias-estruturais/historico"} component={HistoricoOcorrencias} />
        
        {/* Notas / Dossiers */}
        <Route path={"/notas"} component={Notas} />
        <Route path={"/recepcao-vidros"} component={RecepcaoVidros} />
        
        {/* To-Do */}
        <Route path={"/todos"} component={Todos} />
        <Route path={"/todo-widget"} component={TodoWidget} />
        
        {/* Projeção de Visitas */}
        <Route path={"/projecao-visitas"} component={ProjecaoVisitasPage} />
        
        {/* Assistente IA Widget */}
        <Route path={"/assistente-widget"} component={AssistenteWidget} />
        
        {/* Portal da Loja (acesso público via token) */}
        <Route path={"/portal-loja"} component={PortalLoja} />
        <Route path={"/portal-loja/widget"} component={PortalLojaWidget} />
        
        {/* Portal do Volante (acesso público via token) */}
        <Route path={"/portal-volante"} component={PortalLoja} />
        
        {/* API Keys (Admin) */}
        <Route path={"/api-keys"} component={ApiKeysAdmin} />
        
        {/* Recalibra */}
        <Route path={"/gestao-recalibra"} component={GestaoRecalibra} />
        <Route path={"/portal-recalibra"} component={PortalRecalibra} />
        <Route path={"/dashboard-recalibra"} component={DashboardRecalibra} />
        
        <Route path={"/login-nao-autorizado"} component={LoginNaoAutorizado} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <DemoBanner />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
