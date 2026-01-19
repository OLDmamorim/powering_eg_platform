import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

// Helper para converter ArrayBuffer para Base64
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    isLoading: true,
    error: null,
  });

  const { data: vapidData } = trpc.push.getVapidPublicKey.useQuery();
  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  // Verificar suporte e estado atual
  useEffect(() => {
    const checkSupport = async () => {
      // Verificar se o browser suporta push notifications
      const isSupported = 'serviceWorker' in navigator && 
                          'PushManager' in window && 
                          'Notification' in window;
      
      if (!isSupported) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          permission: 'unsupported',
          isLoading: false,
        }));
        return;
      }

      const permission = Notification.permission;
      
      // Verificar se já existe uma subscrição
      let isSubscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch (error) {
        console.error('[Push] Erro ao verificar subscrição:', error);
      }

      setState(prev => ({
        ...prev,
        isSupported: true,
        isSubscribed,
        permission,
        isLoading: false,
      }));
    };

    checkSupport();
  }, []);

  // Converter chave VAPID de base64url para Uint8Array
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array<ArrayBuffer> => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // Subscrever para notificações
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !vapidData?.publicKey) {
      setState(prev => ({ ...prev, error: 'Push notifications não suportadas' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Pedir permissão
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          isLoading: false,
          error: 'Permissão negada para notificações',
        }));
        return false;
      }

      // Obter service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Criar subscrição
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      // Extrair chaves
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      if (!p256dh || !auth) {
        throw new Error('Falha ao obter chaves de subscrição');
      }

      // Enviar para o servidor
      await subscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(p256dh),
        auth: arrayBufferToBase64(auth),
        userAgent: navigator.userAgent,
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
      }));

      console.log('[Push] Subscrito com sucesso');
      return true;
    } catch (error: any) {
      console.error('[Push] Erro ao subscrever:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao ativar notificações',
      }));
      return false;
    }
  }, [state.isSupported, vapidData?.publicKey, subscribeMutation, urlBase64ToUint8Array]);

  // Cancelar subscrição
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Remover do servidor
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
        
        // Cancelar localmente
        await subscription.unsubscribe();
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      console.log('[Push] Subscrição cancelada');
      return true;
    } catch (error: any) {
      console.error('[Push] Erro ao cancelar subscrição:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao desativar notificações',
      }));
      return false;
    }
  }, [unsubscribeMutation]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

/**
 * Hook para Portal da Loja (sem autenticação OAuth)
 */
export function usePushNotificationsLoja(token: string | null) {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    isLoading: true,
    error: null,
  });

  const { data: vapidData } = trpc.push.getVapidPublicKey.useQuery();
  const subscribeMutation = trpc.pushPortalLoja.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushPortalLoja.unsubscribe.useMutation();

  // Verificar suporte e estado atual
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 
                          'PushManager' in window && 
                          'Notification' in window;
      
      if (!isSupported) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          permission: 'unsupported',
          isLoading: false,
        }));
        return;
      }

      const permission = Notification.permission;
      
      let isSubscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch (error) {
        console.error('[Push] Erro ao verificar subscrição:', error);
      }

      setState(prev => ({
        ...prev,
        isSupported: true,
        isSubscribed,
        permission,
        isLoading: false,
      }));
    };

    checkSupport();
  }, []);

  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array<ArrayBuffer> => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !vapidData?.publicKey || !token) {
      setState(prev => ({ ...prev, error: 'Push notifications não suportadas ou token inválido' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          isLoading: false,
          error: 'Permissão negada para notificações',
        }));
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      if (!p256dh || !auth) {
        throw new Error('Falha ao obter chaves de subscrição');
      }

      await subscribeMutation.mutateAsync({
        token,
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(p256dh),
        auth: arrayBufferToBase64(auth),
        userAgent: navigator.userAgent,
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
      }));

      console.log('[Push] Loja subscrita com sucesso');
      return true;
    } catch (error: any) {
      console.error('[Push] Erro ao subscrever loja:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao ativar notificações',
      }));
      return false;
    }
  }, [state.isSupported, vapidData?.publicKey, token, subscribeMutation, urlBase64ToUint8Array]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await unsubscribeMutation.mutateAsync({
          token,
          endpoint: subscription.endpoint,
        });
        
        await subscription.unsubscribe();
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      console.log('[Push] Subscrição da loja cancelada');
      return true;
    } catch (error: any) {
      console.error('[Push] Erro ao cancelar subscrição da loja:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao desativar notificações',
      }));
      return false;
    }
  }, [token, unsubscribeMutation]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
