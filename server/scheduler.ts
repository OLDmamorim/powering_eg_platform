import cron from 'node-cron';
import { getVolantesSemRegistoHoje } from './db';
import { enviarLembreteRegistoServicos } from './telegramService';
import { enviarRelatoriosMensaisVolante } from './relatorioMensalVolante';
import { enviarRelatoriosMensaisRecalibra } from './relatorioMensalRecalibra';

/**
 * Executa o lembrete diário de registo de serviços para volantes
 * Pode ser chamado pelo cron job ou manualmente via endpoint admin
 */
export async function executarLembreteVolantes(): Promise<{
  total: number;
  enviados: number;
  erros: string[];
  detalhes: string[];
}> {
  const agora = new Date();
  const horaLisboa = agora.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
  const resultado = { total: 0, enviados: 0, erros: [] as string[], detalhes: [] as string[] };
  
  console.log(`[CRON-LEMBRETE] ========================================`);
  console.log(`[CRON-LEMBRETE] Executando lembrete diário - ${horaLisboa}`);
  console.log(`[CRON-LEMBRETE] ========================================`);
  
  try {
    const volantesPendentes = await getVolantesSemRegistoHoje();
    resultado.total = volantesPendentes.length;
    
    console.log(`[CRON-LEMBRETE] Volantes com agendamentos pendentes: ${volantesPendentes.length}`);
    
    if (volantesPendentes.length === 0) {
      resultado.detalhes.push('Nenhum volante com agendamentos pendentes de registo hoje');
      console.log('[CRON-LEMBRETE] Nenhum volante com agendamentos pendentes de registo');
      return resultado;
    }

    for (const volante of volantesPendentes) {
      console.log(`[CRON-LEMBRETE] Processando: ${volante.volanteNome} - ${volante.lojasNaoRegistadas.length} loja(s) pendente(s)`);
      
      if (!volante.telegramChatId) {
        const msg = `Volante ${volante.volanteNome} não tem Telegram configurado`;
        console.log(`[CRON-LEMBRETE] SKIP: ${msg}`);
        resultado.erros.push(msg);
        continue;
      }

      // Construir URL do portal do volante com token
      const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
      const portalUrl = volante.token 
        ? `${baseUrl}/portal-loja?token=${volante.token}`
        : baseUrl;
      
      try {
        const enviado = await enviarLembreteRegistoServicos(
          volante.telegramChatId,
          {
            volanteNome: volante.volanteNome,
            lojasNaoRegistadas: volante.lojasNaoRegistadas,
            portalUrl
          }
        );

        if (enviado) {
          resultado.enviados++;
          const lojas = volante.lojasNaoRegistadas.map((l: any) => l.lojaNome).join(', ');
          resultado.detalhes.push(`${volante.volanteNome}: lembrete enviado (${lojas})`);
          console.log(`[CRON-LEMBRETE] OK: ${volante.volanteNome} - lembrete enviado`);
        } else {
          resultado.erros.push(`${volante.volanteNome}: falha no envio Telegram`);
          console.log(`[CRON-LEMBRETE] FALHA: ${volante.volanteNome} - envio Telegram falhou`);
        }
      } catch (err: any) {
        resultado.erros.push(`${volante.volanteNome}: ${err.message}`);
        console.error(`[CRON-LEMBRETE] ERRO: ${volante.volanteNome}:`, err.message);
      }
    }

    console.log(`[CRON-LEMBRETE] Resultado: ${resultado.enviados}/${resultado.total} enviados`);
  } catch (error: any) {
    resultado.erros.push(`Erro geral: ${error.message}`);
    console.error('[CRON-LEMBRETE] Erro geral:', error);
  }
  
  return resultado;
}

/**
 * Configura os cron jobs do sistema
 */
export function setupScheduler() {
  console.log('[SCHEDULER] ========================================');
  console.log('[SCHEDULER] Inicializando cron jobs...');
  console.log('[SCHEDULER] Hora actual UTC:', new Date().toISOString());
  console.log('[SCHEDULER] Hora actual Lisboa:', new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }));
  console.log('[SCHEDULER] ========================================');

  // Lembrete diário às 18:00 Lisboa (hora local)
  // Formato: segundo minuto hora dia mês dia-semana
  // Apenas dias úteis (segunda a sexta: 1-5)
  // IMPORTANTE: timezone Europe/Lisbon para garantir hora correcta
  const lembreteTask = cron.schedule('0 0 18 * * 1-5', async () => {
    await executarLembreteVolantes();
  }, {
    timezone: 'Europe/Lisbon'
  });

  console.log('[SCHEDULER] Cron lembrete diário configurado: 18:00 Lisboa, Seg-Sex');
  console.log('[SCHEDULER] Lembrete task timezone:', (lembreteTask as any).timezone || 'default');

  // Relatórios mensais - dia 20 de cada mês às 09:00 Lisboa
  // IMPORTANTE: timezone Europe/Lisbon para garantir hora correcta
  const relatoriosTask = cron.schedule('0 0 9 20 * *', async () => {
    const agora = new Date();
    const horaLisboa = agora.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
    console.log(`[CRON-RELATORIOS] Executando envio de relatórios mensais - ${horaLisboa}`);
    try {
      // Enviar relatórios do volante
      await enviarRelatoriosMensaisVolante();
      console.log('[CRON-RELATORIOS] Relatórios mensais do volante enviados com sucesso');
      
      // Aguardar 2 segundos entre os dois sistemas
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Enviar relatórios do Recalibra
      await enviarRelatoriosMensaisRecalibra();
      console.log('[CRON-RELATORIOS] Relatórios mensais do Recalibra enviados com sucesso');
    } catch (error) {
      console.error('[CRON-RELATORIOS] Erro ao enviar relatórios mensais:', error);
    }
  }, {
    timezone: 'Europe/Lisbon'
  });

  console.log('[SCHEDULER] Cron relatórios mensais configurado: 09:00 Lisboa, dia 20');
  console.log('[SCHEDULER] Relatórios task timezone:', (relatoriosTask as any).timezone || 'default');
  console.log('[SCHEDULER] ========================================');
  console.log('[SCHEDULER] Todos os cron jobs configurados com sucesso!');
  console.log('[SCHEDULER] ========================================');
}
