/**
 * Script agendado: Notificar volantes diariamente às 18:00 para confirmarem serviços
 * 
 * Este script:
 * 1. Busca todos os volantes ativos com Telegram configurado
 * 2. Envia mensagem lembrando para registar serviços do dia
 * 3. Inclui link direto para o portal do volante
 */

import * as db from '../db';
import { sendTelegramMessage } from '../telegramService';

export async function notificarVolantesServicos() {
  console.log('[Cron] Iniciando notificação diária de serviços aos volantes...');
  
  try {
    // Obter todos os volantes ativos
    const volantes = await db.getAllVolantes();
    
    if (!volantes || volantes.length === 0) {
      console.log('[Cron] Nenhum volante encontrado');
      return;
    }
    
    let notificacoesEnviadas = 0;
    let erros = 0;
    
    for (const volante of volantes) {
      // Verificar se o volante está ativo e tem Telegram configurado
      if (!volante.ativo || !volante.telegramChatId) {
        continue;
      }
      
      // Obter token do volante para gerar link
      const tokenData = await db.getTokenVolante(volante.id);
      
      if (!tokenData || !tokenData.token) {
        console.warn(`[Cron] Volante ${volante.nome} não tem token gerado`);
        continue;
      }
      
      // Construir mensagem
      const hoje = new Date().toLocaleDateString('pt-PT', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
      
      const portalUrl = `${process.env.VITE_APP_URL || 'https://poweringeg.manus.space'}/portal-volante?token=${tokenData.token}`;
      
      const mensagem = `
🔔 <b>Lembrete Diário - ${hoje}</b>

Olá ${volante.nome}! 👋

Por favor, confirma os serviços realizados hoje clicando no link abaixo:

🔗 <a href="${portalUrl}">Aceder ao Portal do Volante</a>

Regista os serviços realizados em cada loja:
• Substituição Ligeiro
• Reparação
• Calibragem
• Outros

Obrigado! 🚗✨
      `.trim();
      
      // Enviar mensagem
      const sucesso = await sendTelegramMessage(
        volante.telegramChatId,
        mensagem,
        'HTML'
      );
      
      if (sucesso) {
        notificacoesEnviadas++;
        console.log(`[Cron] Notificação enviada para ${volante.nome}`);
      } else {
        erros++;
        console.error(`[Cron] Erro ao enviar notificação para ${volante.nome}`);
      }
      
      // Pequeno delay entre mensagens para evitar rate limiting
      await new Date(Date.now() + 100).valueOf();
    }
    
    console.log(`[Cron] Notificações concluídas: ${notificacoesEnviadas} enviadas, ${erros} erros`);
    
  } catch (error) {
    console.error('[Cron] Erro ao notificar volantes:', error);
  }
}

// Se executado diretamente (para testes)
if (import.meta.url === `file://${process.argv[1]}`) {
  notificarVolantesServicos()
    .then(() => {
      console.log('[Cron] Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Cron] Erro ao executar script:', error);
      process.exit(1);
    });
}
