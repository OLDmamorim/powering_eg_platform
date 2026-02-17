import cron from 'node-cron';
import { getVolantesSemRegistoHoje } from './db';
import { enviarLembreteRegistoServicos } from './telegramService';
import { enviarRelatoriosMensaisVolante } from './relatorioMensalVolante';

/**
 * Configura os cron jobs do sistema
 */
export function setupScheduler() {
  // Lembrete diário às 18:00 Lisboa (UTC+0 no inverno, UTC+1 no verão)
  // Usando UTC porque o timezone do node-cron não está a funcionar corretamente
  // 18:00 Lisboa = 18:00 UTC (inverno) ou 17:00 UTC (verão)
  cron.schedule('0 18 * * *', async () => {
    const agora = new Date();
    const horaLisboa = agora.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' });
    console.log(`[CRON] Executando lembrete diário de registo de serviços - Hora Lisboa: ${horaLisboa}`);
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
          console.log(`[CRON] Volante ${volante.volanteNome} não tem Telegram configurado`);
          continue;
        }

        // Construir URL do portal do volante com token
        const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
        const portalUrl = volante.token 
          ? `${baseUrl}/portal-loja?token=${volante.token}`
          : baseUrl;
        
        const resultado = await enviarLembreteRegistoServicos(
          volante.telegramChatId,
          {
            volanteNome: volante.volanteNome,
            lojasNaoRegistadas: volante.lojasNaoRegistadas,
            portalUrl
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
  });

  // Relatório mensal do volante - dia 20 de cada mês às 09:00 Lisboa (UTC+0)
  // 09:00 Lisboa = 09:00 UTC (inverno) ou 08:00 UTC (verão)
  cron.schedule('0 9 20 * *', async () => {
    const agora = new Date();
    const horaLisboa = agora.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' });
    console.log(`[CRON] Executando envio de relatórios mensais do volante - Hora Lisboa: ${horaLisboa}`);
    try {
      await enviarRelatoriosMensaisVolante();
      console.log('[CRON] Relatórios mensais enviados com sucesso');
    } catch (error) {
      console.error('[CRON] Erro ao enviar relatórios mensais:', error);
    }
  });

  console.log('[SCHEDULER] Cron jobs configurados:');
  console.log('  - Lembrete diário de serviços: 18:00 UTC (= 18:00 Lisboa no inverno, 19:00 Lisboa no verão)');
  console.log('  - Relatório mensal do volante: 09:00 UTC dia 20 (= 09:00 Lisboa no inverno, 10:00 Lisboa no verão)');
}
