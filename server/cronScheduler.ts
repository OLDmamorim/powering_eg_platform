/**
 * Agendador de tarefas cron
 * Executa tarefas automatizadas em horários específicos
 */

import cron from 'node-cron';
import { notificarVolantesServicos } from './cron/notificarVolantesServicos';

/**
 * Inicializar todos os cron jobs
 */
export function initCronJobs() {
  console.log('[Cron] Inicializando agendamentos...');
  
  // Notificar volantes diariamente às 18:00 (horário de Portugal)
  // Formato: segundo minuto hora dia mês dia-da-semana
  cron.schedule('0 0 18 * * *', async () => {
    console.log('[Cron] Executando: Notificar volantes sobre serviços');
    try {
      await notificarVolantesServicos();
    } catch (error) {
      console.error('[Cron] Erro ao executar notificação de volantes:', error);
    }
  }, {
    timezone: 'Europe/Lisbon'
  });
  
  console.log('[Cron] Agendamentos configurados:');
  console.log('  - Notificação volantes: Diariamente às 18:00 (Europe/Lisbon)');
}
