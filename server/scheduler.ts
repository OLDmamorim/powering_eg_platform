import cron from 'node-cron';
import { getVolantesSemRegistoHoje } from './db';
import { enviarLembreteRegistoServicos } from './telegramService';

/**
 * Configura os cron jobs do sistema
 */
export function setupScheduler() {
  // Lembrete diário às 18:00 para volantes registarem serviços
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON] Executando lembrete diário de registo de serviços às 18:00');
    try {
      const volantesPendentes = await getVolantesSemRegistoHoje();
      
      if (volantesPendentes.length === 0) {
        console.log('[CRON] Nenhum volante com agendamentos pendentes de registo');
        return;
      }

      console.log(`[CRON] Enviando lembretes para ${volantesPendentes.length} volante(s)`);
      
      let sucessos = 0;
      for (const volante of volantesPendentes) {
        if (!volante.telegramChatId) {
          console.log(`[CRON] Volante ${volante.nome} não tem Telegram configurado`);
          continue;
        }

        const resultado = await enviarLembreteRegistoServicos(
          volante.telegramChatId,
          {
            volanteNome: volante.nome,
            lojasNaoRegistadas: volante.lojasNaoRegistadas,
          }
        );

        if (resultado) {
          sucessos++;
        }
      }

      console.log(`[CRON] Lembretes enviados: ${sucessos}/${volantesPendentes.length}`);
    } catch (error) {
      console.error('[CRON] Erro ao enviar lembretes:', error);
    }
  }, {
    timezone: 'Europe/Lisbon' // Timezone de Portugal
  });

  console.log('[SCHEDULER] Cron jobs configurados:');
  console.log('  - Lembrete diário de serviços: 18:00 (Europe/Lisbon)');
}
