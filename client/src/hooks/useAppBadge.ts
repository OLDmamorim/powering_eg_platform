import { useEffect, useCallback } from 'react';

/**
 * Hook para gerir o App Badge (numerador no ícone da PWA)
 * Usa a App Badge API para mostrar contagem de notificações/tarefas
 */
export function useAppBadge() {
  // Verificar se a API está disponível
  const isSupported = 'setAppBadge' in navigator;

  // Definir o badge com um número
  const setBadge = useCallback(async (count: number) => {
    if (!isSupported) {
      console.log('App Badge API não suportada neste browser');
      return false;
    }

    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
        console.log(`Badge definido: ${count}`);
      } else {
        await (navigator as any).clearAppBadge();
        console.log('Badge limpo');
      }
      return true;
    } catch (error) {
      console.error('Erro ao definir badge:', error);
      return false;
    }
  }, [isSupported]);

  // Limpar o badge
  const clearBadge = useCallback(async () => {
    if (!isSupported) return false;

    try {
      await (navigator as any).clearAppBadge();
      console.log('Badge limpo');
      return true;
    } catch (error) {
      console.error('Erro ao limpar badge:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    setBadge,
    clearBadge
  };
}

/**
 * Função utilitária para definir o badge globalmente
 * Pode ser chamada de qualquer lugar sem precisar do hook
 */
export async function setAppBadge(count: number): Promise<boolean> {
  if (!('setAppBadge' in navigator)) {
    return false;
  }

  try {
    if (count > 0) {
      await (navigator as any).setAppBadge(count);
    } else {
      await (navigator as any).clearAppBadge();
    }
    return true;
  } catch (error) {
    console.error('Erro ao definir badge:', error);
    return false;
  }
}

/**
 * Função utilitária para limpar o badge globalmente
 */
export async function clearAppBadge(): Promise<boolean> {
  if (!('clearAppBadge' in navigator)) {
    return false;
  }

  try {
    await (navigator as any).clearAppBadge();
    return true;
  } catch (error) {
    console.error('Erro ao limpar badge:', error);
    return false;
  }
}
