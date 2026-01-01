import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Lojas from "./pages/Lojas";
import Gestores from "./pages/Gestores";
import Relatorios from "./pages/Relatorios";
import MinhasLojas from "./pages/MinhasLojas";
import RelatorioLivre from "./pages/RelatorioLivre";
import RelatorioCompleto from "./pages/RelatorioCompleto";
import MeusRelatorios from "./pages/MeusRelatorios";
import RelatoriosIA from "./pages/RelatoriosIA";
import Pendentes from "./pages/Pendentes";
import LoginNaoAutorizado from "./pages/LoginNaoAutorizado";
import HistoricoPontos from "./pages/HistoricoPontos";
import DashboardAlertas from "./pages/DashboardAlertas";
import ConfiguracoesAlertas from "./pages/ConfiguracoesAlertas";
import Categorias from "./pages/Categorias";
import PendentesAdmin from "./pages/PendentesAdmin";
import HistoricoLoja from "./pages/HistoricoLoja";
import HistoricoRelatoriosIA from "./pages/HistoricoRelatoriosIA";
import ComparacaoRelatoriosIA from "./pages/ComparacaoRelatoriosIA";
import GestaoUtilizadores from "./pages/GestaoUtilizadores";
import ReuniõesGestores from "./pages/ReuniõesGestores";
import ReuniõesLojas from "./pages/ReuniõesLojas";
import ResultadosUpload from "./pages/ResultadosUpload";
import { ResultadosDashboard } from "./pages/ResultadosDashboard";
import { ComparacaoLojas } from "./pages/ComparacaoLojas";
import PortalLoja from "./pages/PortalLoja";
import PortalLojaWidget from "./pages/PortalLojaWidget";
import ReunioesQuinzenais from "./pages/ReunioesQuinzenais";
import Todos from "./pages/Todos";
import TodoWidget from "./pages/TodoWidget";
import ResumosGlobais from "./pages/ResumosGlobais";


function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <Redirect to="/dashboard" />
      </Route>
      <Route path={"/dashboard"} component={Dashboard} />
      
      {/* Admin routes */}
      <Route path={"/lojas"} component={Lojas} />
      <Route path={"/gestores"} component={Gestores} />
      <Route path={"/utilizadores"} component={GestaoUtilizadores} />
      <Route path={"/relatorios"} component={Relatorios} />
      <Route path={"/pendentes-admin"} component={PendentesAdmin} />
      
      {/* Gestor routes */}
      <Route path={"/minhas-lojas"} component={MinhasLojas} />
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
      <Route path={"/reunioes-lojas"} component={ReuniõesLojas} />
      <Route path={"/resultados-upload"} component={ResultadosUpload} />
      <Route path={"/resultados-dashboard"} component={ResultadosDashboard} />
      <Route path={"/comparacao-lojas"} component={ComparacaoLojas} />
      
      {/* Reuniões Quinzenais */}
      <Route path={"/reunioes-quinzenais"} component={ReunioesQuinzenais} />
      
      {/* Resumos Globais */}
      <Route path={"/resumos-globais"} component={ResumosGlobais} />
      
      {/* To-Do */}
      <Route path={"/todos"} component={Todos} />
      <Route path={"/todo-widget"} component={TodoWidget} />
      
      {/* Portal da Loja (acesso público via token) */}
      <Route path={"/portal-loja"} component={PortalLoja} />
      <Route path={"/portal-loja/widget"} component={PortalLojaWidget} />
      
      <Route path={"/login-nao-autorizado"} component={LoginNaoAutorizado} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
