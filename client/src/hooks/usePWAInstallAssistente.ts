import { useState, useEffect, useCallback, useRef } from 'react';

// Variável global para capturar o evento beforeinstallprompt antes do React montar
let globalDeferredPrompt: any = null;
let promptCaptured = false;

// Listener global que captura o evento mesmo antes do React
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA Hook] beforeinstallprompt capturado globalmente');
    e.preventDefault();
    globalDeferredPrompt = e;
    promptCaptured = true;
  });
}

// Hook específico para instalação PWA do Assistente IA
export function usePWAInstallAssistente() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [manifestReady, setManifestReady] = useState(false);
  const setupDone = useRef(false);

  // Trocar manifest para o do Assistente IA
  const setupManifest = useCallback(() => {
    if (setupDone.current) return;
    setupDone.current = true;
    
    console.log('[PWA Hook] Configurando manifest do Assistente IA');
    
    // Remover o link do manifest atual
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }
    
    // Criar novo link com o manifest do assistente
    const newManifest = document.createElement('link');
    newManifest.rel = 'manifest';
    newManifest.href = '/manifest-assistente.json';
    document.head.appendChild(newManifest);
    
    // Atualizar theme-color
    const themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (themeColor) {
      themeColor.content = '#7c3aed';
    }
    
    // Atualizar apple-mobile-web-app-title
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
    if (appleTitle) {
      appleTitle.content = 'Assistente IA';
    }
    
    // Atualizar apple-touch-icon
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (appleIcon) {
      appleIcon.href = '/poweringeg-ai-icon-192.png';
    }
    
    // Atualizar título da página
    document.title = 'Assistente IA - PoweringEG';
    
    // Atualizar favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = '/poweringeg-ai-icon-192.png';
    }
    
    setManifestReady(true);
  }, []);

  useEffect(() => {
    // Primeiro, configurar o manifest correto
    setupManifest();
    
    // Verificar se já está instalado como standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA Hook] Já está em modo standalone');
      setIsInstalled(true);
      return;
    }

    // Verificar se está no iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // No iOS, sempre mostrar opção de instalar (via instruções manuais)
      console.log('[PWA Hook] iOS detectado - mostrando opção de instalar');
      setIsInstallable(true);
      return;
    }

    // Verificar se já temos o prompt capturado globalmente
    if (globalDeferredPrompt) {
      console.log('[PWA Hook] Usando prompt capturado globalmente');
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstallable(true);
    }

    const handler = (e: any) => {
      console.log('[PWA Hook] beforeinstallprompt capturado no handler');
      e.preventDefault();
      globalDeferredPrompt = e;
      promptCaptured = true;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    window.addEventListener('appinstalled', () => {
      console.log('[PWA Hook] App instalada!');
      setIsInstalled(true);
      setIsInstallable(false);
      globalDeferredPrompt = null;
      promptCaptured = false;
    });

    // Verificar novamente após um pequeno delay (para dar tempo ao browser)
    const checkTimer = setTimeout(() => {
      if (globalDeferredPrompt && !deferredPrompt) {
        console.log('[PWA Hook] Usando prompt capturado após delay');
        setDeferredPrompt(globalDeferredPrompt);
        setIsInstallable(true);
      } else if (!promptCaptured) {
        // Se não temos o prompt, ainda assim mostrar o botão
        // O utilizador pode instalar via menu do browser ou página dedicada
        console.log('[PWA Hook] Sem prompt - mostrando botão para página dedicada');
        setIsInstallable(true);
      }
    }, 1000);

    return () => {
      clearTimeout(checkTimer);
      window.removeEventListener('beforeinstallprompt', handler);
      
      // Restaurar manifest original ao sair
      setupDone.current = false;
      const assistenteManifest = document.querySelector('link[rel="manifest"][href="/manifest-assistente.json"]');
      if (assistenteManifest) {
        assistenteManifest.remove();
        const originalManifest = document.createElement('link');
        originalManifest.rel = 'manifest';
        originalManifest.href = '/manifest.json';
        document.head.appendChild(originalManifest);
      }
      
      // Restaurar theme-color
      const themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (themeColor) {
        themeColor.content = '#10b981';
      }
      
      // Restaurar apple-mobile-web-app-title
      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
      if (appleTitle) {
        appleTitle.content = 'Tarefas EG';
      }
      
      // Restaurar apple-touch-icon
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (appleIcon) {
        appleIcon.href = '/pwa-icon-192.png';
      }
      
      // Restaurar título
      document.title = 'PoweringEG Platform';
      
      // Restaurar favicon
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = '/favicon.png';
      }
    };
  }, [setupManifest, deferredPrompt]);

  const install = async (): Promise<boolean | 'ios' | 'redirect'> => {
    console.log('[PWA Install] Função install chamada');
    console.log('[PWA Install] deferredPrompt:', deferredPrompt);
    console.log('[PWA Install] globalDeferredPrompt:', globalDeferredPrompt);
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.log('[PWA Install] iOS detectado - retornando ios');
      return 'ios';
    }

    const promptToUse = deferredPrompt || globalDeferredPrompt;
    
    // Se não temos o prompt, redirecionar para a página dedicada do PWA
    if (!promptToUse) {
      console.log('[PWA Install] Sem prompt disponível - redirecionando para página dedicada');
      window.location.href = '/assistente-pwa.html';
      return 'redirect';
    }
    
    // Garantir que o manifest está correto antes de mostrar o prompt
    setupManifest();
    
    // Pequeno delay para garantir que o browser processou a mudança
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      console.log('[PWA Install] Chamando prompt()...');
      await promptToUse.prompt();
      console.log('[PWA Install] prompt() chamado com sucesso, aguardando userChoice...');
      
      const choiceResult = await promptToUse.userChoice;
      console.log('[PWA Install] userChoice resultado:', choiceResult);
      
      // Limpar o prompt (só pode ser usado uma vez)
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
      promptCaptured = false;
      setIsInstallable(false);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA Install] Instalação aceite!');
        setIsInstalled(true);
        return true;
      }
      
      console.log('[PWA Install] Instalação recusada pelo utilizador');
      return false;
    } catch (error: any) {
      console.error('[PWA Install] Erro na instalação:', error);
      console.error('[PWA Install] Erro mensagem:', error?.message);
      console.error('[PWA Install] Erro stack:', error?.stack);
      
      // Limpar o prompt em caso de erro
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
      promptCaptured = false;
      
      // Em caso de erro, redirecionar para página dedicada
      window.location.href = '/assistente-pwa.html';
      return 'redirect';
    }
  };

  return { isInstallable, isInstalled, install, manifestReady };
}
