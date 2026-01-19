import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Store,
  Loader2,
  LogOut,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Verificar se há sessão de loja ativa
const getLojaSession = () => {
  try {
    const lojaAuth = localStorage.getItem('lojaAuth');
    if (lojaAuth) {
      const parsed = JSON.parse(lojaAuth);
      if (parsed.token && parsed.lojaId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao verificar sessão de loja:', e);
  }
  return null;
};

export default function MenuInicial() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [lojaSession, setLojaSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Verificar sessões
    const loja = getLojaSession();
    setLojaSession(loja);
    setChecking(false);
    
    // Capturar evento de instalação PWA
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      toast.success('A app já está instalada e a correr!');
      return;
    }
    
    if (!deferredPrompt) {
      toast.info(
        'Para instalar: Toque nos 3 pontos (menu) > "Adicionar ao Ecrã Inicial" ou "Instalar aplicação"',
        { duration: 6000 }
      );
      return;
    }
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_installed', 'true');
        toast.success('App instalada com sucesso!');
      } else {
        toast.info('Instalação cancelada. Pode instalar mais tarde.');
      }
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      toast.error('Erro ao instalar. Tente pelo menu do browser.');
    }
    setDeferredPrompt(null);
  };

  // Se está a carregar, mostrar loading
  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">A verificar sessão...</p>
        </div>
      </div>
    );
  }

  // Se é utilizador de loja (sem sessão de gestor), redirecionar para Portal da Loja
  if (lojaSession && !user) {
    setLocation('/portal-loja');
    return null;
  }

  // Se não tem sessão nenhuma, mostrar opções de login
  if (!user && !lojaSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-4">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <img 
            src="/poweringeg-ai-icon-192.png" 
            alt="PoweringEG" 
            className="h-20 w-20 mx-auto mb-4 rounded-2xl shadow-lg"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">PoweringEG</h1>
          <p className="text-gray-600">Selecione o tipo de acesso</p>
        </div>

        {/* Cards de Login */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
          {/* Card Gestor/Admin */}
          <Card 
            className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white border-2 border-transparent hover:border-purple-400"
            onClick={() => setLocation('/login')}
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="h-10 w-10 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Gestor / Admin</h2>
              <p className="text-gray-500 text-sm">Acesso ao Dashboard, Chatbot IA e Portal do Gestor</p>
            </div>
          </Card>

          {/* Card Loja */}
          <Card 
            className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white border-2 border-transparent hover:border-green-400"
            onClick={() => setLocation('/portal-loja')}
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Loja</h2>
              <p className="text-gray-500 text-sm">Acesso ao Portal da Loja com resultados e tarefas</p>
            </div>
          </Card>
        </div>

        {/* Rodapé */}
        <p className="text-gray-400 text-xs mt-8">
          PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
        </p>
      </div>
    );
  }

  // Se é Gestor/Admin, mostrar menu com 3 cards
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img 
            src="/poweringeg-ai-icon-192.png" 
            alt="PoweringEG" 
            className="h-12 w-12 rounded-xl shadow-md"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800">PoweringEG</h1>
            <p className="text-sm text-gray-500">Olá, {user?.name || 'Utilizador'}</p>
          </div>
        </div>
<div className="flex items-center gap-2">
          {/* Botão Instalar - apenas mobile */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleInstallPWA}
            className="md:hidden bg-white text-green-700 border-green-300 hover:bg-green-50 flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            <span className="text-xs">Instalar</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/login')}
            className="text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Título */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">O que pretende fazer?</h2>
        <p className="text-gray-600">Selecione uma opção para continuar</p>
      </div>

      {/* Cards Selecionáveis */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {/* Card Dashboard */}
          <Card 
            className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white border-2 border-transparent hover:border-blue-400 group"
            onClick={() => setLocation('/dashboard')}
          >
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <LayoutDashboard className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Dashboard</h2>
              <p className="text-gray-500 text-sm">Painel de gestão completo com todas as funcionalidades</p>
            </div>
          </Card>

          {/* Card Chatbot IA */}
          <Card 
            className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white border-2 border-transparent hover:border-purple-400 group"
            onClick={() => setLocation('/assistente-ia')}
          >
            <div className="text-center">
              <div className="w-24 h-24 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                <MessageSquare className="h-12 w-12 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Chatbot IA</h2>
              <p className="text-gray-500 text-sm">Assistente inteligente para consultas rápidas</p>
            </div>
          </Card>

          {/* Card Portal do Gestor */}
          <Card 
            className="p-8 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white border-2 border-transparent hover:border-green-400 group"
            onClick={() => setLocation('/portal-gestor')}
          >
            <div className="text-center">
              <div className="w-24 h-24 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <FileText className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Portal do Gestor</h2>
              <p className="text-gray-500 text-sm">Relatórios, análises e gestão de lojas</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Rodapé */}
      <p className="text-gray-400 text-xs text-center mt-6">
        PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
      </p>
    </div>
  );
}
