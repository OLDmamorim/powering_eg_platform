/**
 * Agendador de tarefas cron
 * Executa tarefas automatizadas em horários específicos
 */

import cron from 'node-cron';
import { notificarVolantesServicos } from './cron/notificarVolantesServicos';
import { enviarRelatoriosMensaisServicos } from './cron/enviarRelatoriosMensaisServicos';

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
  
  // Enviar relatórios mensais no último dia do mês às 23:00
  // Executa no dia 28-31 de cada mês (dependendo do mês) às 23:00
  cron.schedule('0 0 23 28-31 * *', async () => {
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    
    // Verifica se amanhã é o primeiro dia do mês (ou seja, hoje é o último dia)
    if (amanha.getDate() === 1) {
      console.log('[Cron] Executando: Enviar relatórios mensais de serviços');
      try {
        await enviarRelatoriosMensaisServicos();
      } catch (error) {
        console.error('[Cron] Erro ao enviar relatórios mensais:', error);
      }
    }
  }, {
    timezone: 'Europe/Lisbon'
  });
  
  console.log('[Cron] Agendamentos configurados:');
  console.log('  - Notificação volantes: Diariamente às 18:00 (Europe/Lisbon)');
  console.log('  - Relatórios mensais: Último dia do mês às 23:00 (Europe/Lisbon)');
}
