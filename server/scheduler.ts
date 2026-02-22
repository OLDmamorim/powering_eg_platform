import cron from 'node-cron';
import { getVolantesSemRegistoHoje } from './db';
import { enviarLembreteRegistoServicos } from './telegramService';
import { enviarRelatoriosMensaisVolante } from './relatorioMensalVolante';
import { enviarRelatoriosMensaisRecalibra } from './relatorioMensalRecalibra';

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

  // Relatórios mensais - dia 20 de cada mês às 09:00 Lisboa (UTC+0)
  // 09:00 Lisboa = 09:00 UTC (inverno) ou 08:00 UTC (verão)
  // Envia relatórios do volante E do Recalibra
  cron.schedule('0 0 9 20 * *', async () => {
    const agora = new Date();
    const horaLisboa = agora.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' });
    console.log(`[CRON] Executando envio de relatórios mensais - Hora Lisboa: ${horaLisboa}`);
    try {
      // Enviar relatórios do volante
      await enviarRelatoriosMensaisVolante();
      console.log('[CRON] Relatórios mensais do volante enviados com sucesso');
      
      // Aguardar 2 segundos entre os dois sistemas
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Enviar relatórios do Recalibra
      await enviarRelatoriosMensaisRecalibra();
      console.log('[CRON] Relatórios mensais do Recalibra enviados com sucesso');
    } catch (error) {
      console.error('[CRON] Erro ao enviar relatórios mensais:', error);
    }
  });

  console.log('[SCHEDULER] Cron jobs configurados:');
  console.log('  - Lembrete diário de serviços: 18:00 UTC (= 18:00 Lisboa no inverno, 19:00 Lisboa no verão)');
  console.log('  - Relatórios mensais (Volante + Recalibra): 09:00 UTC dia 20 (= 09:00 Lisboa no inverno, 10:00 Lisboa no verão)');
}
