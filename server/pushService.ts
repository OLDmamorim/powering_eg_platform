import webpush from 'web-push';
import * as db from './db';
import { ENV } from './_core/env';

// Configurar VAPID keys
// Estas chaves são usadas para autenticar o servidor junto aos serviços de push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = 'mailto:poweringeg@expressglass.pt';

// Inicializar web-push apenas se tivermos chaves válidas
let webpushConfigured = false;
try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_PRIVATE_KEY !== 'placeholder_private_key') {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    webpushConfigured = true;
    console.log('[Push] Web Push configurado com sucesso');
  } else {
    console.log('[Push] VAPID keys não configuradas - push notifications desativadas');
  }
} catch (error) {
  console.error('[Push] Erro ao configurar web-push:', error);
}

// Exportar chave pública para o cliente
export const vapidPublicKey = VAPID_PUBLIC_KEY;

/**
 * Enviar notificação push para um utilizador
 */
export async function sendPushToUser(userId: number, notification: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}): Promise<{ success: number; failed: number }> {
  if (!webpushConfigured) {
    console.log('[Push] Notificações push não configuradas');
    return { success: 0, failed: 0 };
  }
  
  const subscriptions = await db.getPushSubscriptionsByUserId(userId);
  
  if (subscriptions.length === 0) {
    console.log(`[Push] Nenhuma subscrição encontrada para user ${userId}`);
    return { success: 0, failed: 0 };
  }
  
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || '/pwa-icon-192.png',
    badge: notification.badge || '/pwa-icon-192.png',
    tag: notification.tag || 'poweringeg-notification',
    data: { url: notification.url || '/' }
  });
  
  let success = 0;
  let failed = 0;
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }, payload);
      success++;
      console.log(`[Push] Notificação enviada para user ${userId}`);
    } catch (error: any) {
      failed++;
      console.error(`[Push] Erro ao enviar para user ${userId}:`, error.message);
      
      // Se a subscrição expirou ou foi revogada, desativar
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.deactivatePushSubscription(sub.endpoint);
        console.log(`[Push] Subscrição desativada: ${sub.endpoint.substring(0, 50)}...`);
      }
    }
  }
  
  return { success, failed };
}

/**
 * Enviar notificação push para uma loja
 */
export async function sendPushToLoja(lojaId: number, notification: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}): Promise<{ success: number; failed: number }> {
  if (!webpushConfigured) {
    console.log('[Push] Notificações push não configuradas');
    return { success: 0, failed: 0 };
  }
  
  const subscriptions = await db.getPushSubscriptionsByLojaId(lojaId);
  
  if (subscriptions.length === 0) {
    console.log(`[Push] Nenhuma subscrição encontrada para loja ${lojaId}`);
    return { success: 0, failed: 0 };
  }
  
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || '/pwa-icon-192.png',
    badge: notification.badge || '/pwa-icon-192.png',
    tag: notification.tag || 'poweringeg-notification',
    data: { url: notification.url || '/portal-loja' }
  });
  
  let success = 0;
  let failed = 0;
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }, payload);
      success++;
      console.log(`[Push] Notificação enviada para loja ${lojaId}`);
    } catch (error: any) {
      failed++;
      console.error(`[Push] Erro ao enviar para loja ${lojaId}:`, error.message);
      
      // Se a subscrição expirou ou foi revogada, desativar
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.deactivatePushSubscription(sub.endpoint);
        console.log(`[Push] Subscrição desativada: ${sub.endpoint.substring(0, 50)}...`);
      }
    }
  }
  
  return { success, failed };
}

/**
 * Notificar gestor sobre nova tarefa da loja
 */
export async function notificarGestorNovaTarefa(gestorUserId: number, lojaNome: string, tarefaTitulo: string): Promise<void> {
  await sendPushToUser(gestorUserId, {
    title: `Nova Tarefa de ${lojaNome}`,
    body: tarefaTitulo,
    tag: 'nova-tarefa-loja',
    url: '/todos'
  });
}

/**
 * Notificar loja sobre nova tarefa do gestor
 */
export async function notificarLojaNovaTarefa(lojaId: number, tarefaTitulo: string): Promise<void> {
  await sendPushToLoja(lojaId, {
    title: 'Nova Tarefa Atribuída',
    body: tarefaTitulo,
    tag: 'nova-tarefa-gestor',
    url: '/portal-loja'
  });
}

/**
 * Notificar gestor sobre resposta da loja
 */
export async function notificarGestorRespostaLoja(gestorUserId: number, lojaNome: string, tarefaTitulo: string): Promise<void> {
  await sendPushToUser(gestorUserId, {
    title: `Resposta de ${lojaNome}`,
    body: `Tarefa: ${tarefaTitulo}`,
    tag: 'resposta-loja',
    url: '/todos'
  });
}

/**
 * Notificar loja sobre resposta do gestor
 */
export async function notificarLojaRespostaGestor(lojaId: number, tarefaTitulo: string): Promise<void> {
  await sendPushToLoja(lojaId, {
    title: 'Resposta do Gestor',
    body: `Tarefa: ${tarefaTitulo}`,
    tag: 'resposta-gestor',
    url: '/portal-loja'
  });
}

/**
 * Notificar gestor sobre lembrete de envio de relação RH (dia 20)
 */
export async function notificarGestorLembreteRH(gestorUserId: number, mes: string): Promise<{ success: number; failed: number }> {
  return await sendPushToUser(gestorUserId, {
    title: '📝 Lembrete: Relação de Colaboradores',
    body: `Hoje é dia 20! Envie a relação de colaboradores de ${mes} para os RH.`,
    tag: 'lembrete-rh',
    url: '/rh'
  });
}
