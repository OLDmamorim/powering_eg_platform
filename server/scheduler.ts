import cron from 'node-cron';
import { sendTelegramMessageToMultiple } from './telegramService';
import { enviarRelatoriosMensaisVolante } from './relatorioMensalVolante';
import { enviarRelatoriosMensaisRecalibra } from './relatorioMensalRecalibra';

/**
 * Busca todos os volantes activos com Telegram configurado
 */
async function getVolantesActivosComTelegram() {
  const { getDb } = await import('./db.js');
  const { volantes, tokensVolante } = await import('../drizzle/schema.js');
  const { eq, and, isNotNull } = await import('drizzle-orm');
  
  const db = await getDb();
  if (!db) return [];
  
  const resultado = await db.select({
    id: volantes.id,
    nome: volantes.nome,
    telegramChatId: volantes.telegramChatId,
    token: tokensVolante.token,
  })
    .from(volantes)
    .leftJoin(tokensVolante, eq(volantes.id, tokensVolante.volanteId))
    .where(
      and(
        eq(volantes.ativo, true),
        isNotNull(volantes.telegramChatId)
      )
    );
  
  // Filtrar os que realmente têm telegramChatId preenchido (não vazio)
  return resultado.filter(v => v.telegramChatId && v.telegramChatId.trim() !== '');
}

/**
 * Executa o lembrete diário de registo de serviços para TODOS os volantes activos
 * Enviado todos os dias úteis às 18:00 Lisboa
 * NÃO depende de agendamentos - é um lembrete genérico para registar serviços do dia
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
  console.log(`[CRON-LEMBRETE] Lembrete diário de registo de serviços`);
  console.log(`[CRON-LEMBRETE] Hora Lisboa: ${horaLisboa}`);
  console.log(`[CRON-LEMBRETE] ========================================`);
  
  try {
    const volantesActivos = await getVolantesActivosComTelegram();
    resultado.total = volantesActivos.length;
    
    console.log(`[CRON-LEMBRETE] Volantes activos com Telegram: ${volantesActivos.length}`);
    
    if (volantesActivos.length === 0) {
      resultado.detalhes.push('Nenhum volante activo com Telegram configurado');
      console.log('[CRON-LEMBRETE] Nenhum volante activo com Telegram configurado');
      return resultado;
    }

    const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';

    for (const volante of volantesActivos) {
      console.log(`[CRON-LEMBRETE] Enviando para: ${volante.nome} (${volante.telegramChatId})`);
      
      const portalUrl = volante.token 
        ? `${baseUrl}/portal-loja?token=${volante.token}`
        : baseUrl;
      
      const mensagem = `
🔔 <b>Lembrete - Registo de Serviços</b>

Olá ${volante.nome?.trim() || 'Volante'},

Já registaste os serviços realizados hoje?

Por favor, acede ao Portal do Volante e regista os serviços antes do final do dia.

🔗 <a href="${portalUrl}">Abrir Portal do Volante</a>

<i>PoweringEG Platform 2.0</i>
      `.trim();
      
      try {
        const { sendTelegramMessageToMultiple } = await import('./telegramService.js');
        const envioResult = await sendTelegramMessageToMultiple(volante.telegramChatId!, mensagem, 'HTML');
        
        if (envioResult.success > 0) {
          resultado.enviados++;
          resultado.detalhes.push(`${volante.nome}: lembrete enviado`);
          console.log(`[CRON-LEMBRETE] OK: ${volante.nome} - enviado`);
        } else {
          resultado.erros.push(`${volante.nome}: falha no envio Telegram`);
          console.log(`[CRON-LEMBRETE] FALHA: ${volante.nome} - envio falhou`);
        }
      } catch (err: any) {
        resultado.erros.push(`${volante.nome}: ${err.message}`);
        console.error(`[CRON-LEMBRETE] ERRO: ${volante.nome}:`, err.message);
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
  console.log('[SCHEDULER] Hora UTC:', new Date().toISOString());
  console.log('[SCHEDULER] Hora Lisboa:', new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }));
  console.log('[SCHEDULER] ========================================');

  // Lembrete diário às 18:00 Lisboa
  // Enviado a TODOS os volantes activos com Telegram, TODOS os dias úteis
  // Não depende de agendamentos - é um lembrete genérico para registar serviços
  cron.schedule('0 0 18 * * 1-5', async () => {
    await executarLembreteVolantes();
  }, {
    timezone: 'Europe/Lisbon'
  });

  console.log('[SCHEDULER] Cron lembrete diário: 18:00 Lisboa, Seg-Sex (todos volantes activos)');

  // Relatórios mensais - dia 20 de cada mês às 09:00 Lisboa
  cron.schedule('0 0 9 20 * *', async () => {
    const horaLisboa = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
    console.log(`[CRON-RELATORIOS] Envio de relatórios mensais - ${horaLisboa}`);
    try {
      await enviarRelatoriosMensaisVolante();
      console.log('[CRON-RELATORIOS] Relatórios volante enviados');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await enviarRelatoriosMensaisRecalibra();
      console.log('[CRON-RELATORIOS] Relatórios Recalibra enviados');
    } catch (error) {
      console.error('[CRON-RELATORIOS] Erro:', error);
    }
  }, {
    timezone: 'Europe/Lisbon'
  });

  console.log('[SCHEDULER] Cron relatórios mensais: 09:00 Lisboa, dia 20');
  console.log('[SCHEDULER] Todos os cron jobs configurados!');
  console.log('[SCHEDULER] ========================================');
}
