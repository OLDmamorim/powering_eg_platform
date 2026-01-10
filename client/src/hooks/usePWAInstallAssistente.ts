import { useState, useEffect, useCallback } from 'react';

// Hook específico para instalação PWA do Assistente IA
// Usa uma página HTML dedicada com o manifest correto para garantir instalação correta
export function usePWAInstallAssistente() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [manifestReady, setManifestReady] = useState(false);

  // Trocar manifest para o do Assistente IA
  const setupManifest = useCallback(() => {
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
      setIsInstalled(true);
      return;
    }

    // Verificar se está no iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // No iOS, sempre mostrar opção de instalar (via instruções manuais)
      setIsInstallable(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Pequeno delay para garantir que o manifest foi carregado
    const timer = setTimeout(() => {
      window.addEventListener('beforeinstallprompt', handler);
    }, 100);
    
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
      
      // Restaurar manifest original ao sair
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
  }, [setupManifest]);

  const install = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      return 'ios';
    }

    // Se não temos o prompt, redirecionar para a página dedicada do PWA
    if (!deferredPrompt) {
      // Abrir a página dedicada do PWA numa nova janela
      // Isso garante que o manifest correto é carregado desde o início
      window.location.href = '/assistente-pwa.html';
      return 'redirect';
    }
    
    // Garantir que o manifest está correto antes de mostrar o prompt
    setupManifest();
    
    // Pequeno delay para garantir que o browser processou a mudança
    await new Promise(resolve => setTimeout(resolve, 100));
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  return { isInstallable, isInstalled, install, manifestReady };
}
