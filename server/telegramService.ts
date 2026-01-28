/**
 * Serviço de notificações via Telegram
 * Envia mensagens para volantes quando há novos pedidos de apoio
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

/**
 * Envia uma mensagem para um chat específico do Telegram
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] Bot token não configurado');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('[Telegram] Erro ao enviar mensagem:', data.description);
      return false;
    }

    console.log('[Telegram] Mensagem enviada com sucesso para:', chatId);
    return true;
  } catch (error) {
    console.error('[Telegram] Erro ao enviar mensagem:', error);
    return false;
  }
}

/**
 * Envia uma mensagem para múltiplos chats do Telegram
 * Os Chat IDs podem ser separados por vírgula
 */
export async function sendTelegramMessageToMultiple(
  chatIds: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ success: number; failed: number }> {
  // Separar os IDs por vírgula e limpar espaços
  const ids = chatIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
  
  let success = 0;
  let failed = 0;
  
  for (const chatId of ids) {
    const result = await sendTelegramMessage(chatId, message, parseMode);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  return { success, failed };
}

/**
 * Formata e envia notificação de novo pedido de apoio
 * Suporta múltiplos Chat IDs separados por vírgula
 */
export async function notificarNovoPedidoApoio(
  chatIds: string,
  pedido: {
    lojaNome: string;
    data: Date;
    periodo: 'manha' | 'tarde' | 'dia_todo';
    tipoApoio: string;
    observacoes?: string;
    portalUrl?: string;
  }
): Promise<boolean> {
  const dataFormatada = new Date(pedido.data).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const periodoTexto = pedido.periodo === 'manha' 
    ? 'Manhã (9h-13h)' 
    : pedido.periodo === 'tarde' 
      ? 'Tarde (14h-18h)' 
      : 'Dia Todo (9h-18h)';
  
  const tipoApoioTexto = {
    cobertura_ferias: 'Cobertura de Férias',
    substituicao_vidros: 'Substituição de Vidros',
    outro: 'Outro',
  }[pedido.tipoApoio] || pedido.tipoApoio;

  // URL do portal do volante
  const baseUrl = process.env.VITE_APP_URL || 'https://poweringeg-3c9mozlh.manus.space';
  const portalLink = pedido.portalUrl || baseUrl;

  const message = `
🔔 <b>Novo Pedido de Apoio</b>

🏪 <b>Loja:</b> ${pedido.lojaNome}
📅 <b>Data:</b> ${dataFormatada}
⏰ <b>Período:</b> ${periodoTexto}
🔧 <b>Tipo:</b> ${tipoApoioTexto}
${pedido.observacoes ? `📝 <b>Observações:</b> ${pedido.observacoes}` : ''}

<i>Aceda ao portal para aprovar ou reprovar este pedido.</i>

🔗 <a href="${portalLink}">Abrir Portal do Volante</a>
  `.trim();

  const result = await sendTelegramMessageToMultiple(chatIds, message);
  return result.success > 0;
}

/**
 * Formata e envia notificação de pedido aprovado (para a loja)
 * Suporta múltiplos Chat IDs separados por vírgula
 */
export async function notificarPedidoAprovado(
  chatIds: string,
  pedido: {
    lojaNome: string;
    volanteNome: string;
    data: Date;
    periodo: 'manha' | 'tarde';
    tipoApoio: string;
  }
): Promise<boolean> {
  const dataFormatada = new Date(pedido.data).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const periodoTexto = pedido.periodo === 'manha' ? 'Manhã (9h-13h)' : 'Tarde (14h-18h)';

  const message = `
✅ <b>Pedido de Apoio Aprovado</b>

🏪 <b>Loja:</b> ${pedido.lojaNome}
👤 <b>Volante:</b> ${pedido.volanteNome}
📅 <b>Data:</b> ${dataFormatada}
⏰ <b>Período:</b> ${periodoTexto}

<i>O apoio foi confirmado!</i>
  `.trim();

  const result = await sendTelegramMessageToMultiple(chatIds, message);
  return result.success > 0;
}

/**
 * Formata e envia notificação de pedido anulado
 * Suporta múltiplos Chat IDs separados por vírgula
 */
export async function notificarPedidoAnulado(
  chatIds: string,
  pedido: {
    lojaNome: string;
    data: Date;
    periodo: 'manha' | 'tarde';
    motivo?: string;
  }
): Promise<boolean> {
  const dataFormatada = new Date(pedido.data).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const periodoTexto = pedido.periodo === 'manha' ? 'Manhã (9h-13h)' : 'Tarde (14h-18h)';

  const message = `
❌ <b>Pedido de Apoio Anulado</b>

🏪 <b>Loja:</b> ${pedido.lojaNome}
📅 <b>Data:</b> ${dataFormatada}
⏰ <b>Período:</b> ${periodoTexto}
${pedido.motivo ? `📝 <b>Motivo:</b> ${pedido.motivo}` : ''}

<i>Este apoio foi cancelado.</i>
  `.trim();

  const result = await sendTelegramMessageToMultiple(chatIds, message);
  return result.success > 0;
}

/**
 * Formata e envia notificação de pedido editado
 * Suporta múltiplos Chat IDs separados por vírgula
 */
export async function notificarPedidoEditado(
  chatIds: string,
  pedido: {
    lojaNome: string;
    dataAnterior: Date;
    dataNova: Date;
    periodoAnterior: 'manha' | 'tarde';
    periodoNovo: 'manha' | 'tarde';
  }
): Promise<boolean> {
  const dataAnteriorFormatada = new Date(pedido.dataAnterior).toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  
  const dataNovaFormatada = new Date(pedido.dataNova).toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const periodoAnteriorTexto = pedido.periodoAnterior === 'manha' ? 'Manhã' : 'Tarde';
  const periodoNovoTexto = pedido.periodoNovo === 'manha' ? 'Manhã' : 'Tarde';

  const message = `
✏️ <b>Pedido de Apoio Alterado</b>

🏪 <b>Loja:</b> ${pedido.lojaNome}

<b>Antes:</b> ${dataAnteriorFormatada} - ${periodoAnteriorTexto}
<b>Agora:</b> ${dataNovaFormatada} - ${periodoNovoTexto}

<i>Por favor verifique a sua agenda.</i>
  `.trim();

  const result = await sendTelegramMessageToMultiple(chatIds, message);
  return result.success > 0;
}

/**
 * Verifica se o bot está configurado e funcional
 */
export async function verificarBotTelegram(): Promise<{
  ok: boolean;
  botName?: string;
  error?: string;
}> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'Bot token não configurado' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return { ok: false, error: data.description };
    }

    return { ok: true, botName: data.result.username };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}


/**
 * Interface para mensagem recebida do Telegram
 */
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

/**
 * Processa uma mensagem recebida do webhook do Telegram
 * Responde ao comando /start com o Chat ID do utilizador
 */
export async function processarWebhookTelegram(update: TelegramUpdate): Promise<boolean> {
  if (!update.message || !update.message.text) {
    return false;
  }

  const chatId = update.message.chat.id.toString();
  const text = update.message.text.trim();
  const firstName = update.message.from.first_name || '';
  const username = update.message.from.username || '';

  // Comando /start - responder com o Chat ID
  if (text === '/start' || text.startsWith('/start ')) {
    const mensagem = `
👋 <b>Olá${firstName ? ` ${firstName}` : ''}!</b>

Bem-vindo ao bot de notificações da <b>PoweringEG</b>.

📱 <b>O seu Chat ID é:</b>
<code>${chatId}</code>

<i>Copie este número e cole no campo "Chat ID do Telegram" nas configurações do portal do volante para receber notificações de novos pedidos de apoio.</i>

${username ? `\n👤 Username: @${username}` : ''}
    `.trim();

    return sendTelegramMessage(chatId, mensagem);
  }

  // Comando /help - mostrar ajuda
  if (text === '/help') {
    const mensagem = `
ℹ️ <b>Ajuda - PoweringEG Bot</b>

Este bot envia notificações automáticas quando:
• Uma loja cria um novo pedido de apoio
• Um pedido é aprovado ou anulado
• Um agendamento é alterado

<b>Comandos disponíveis:</b>
/start - Obter o seu Chat ID
/help - Mostrar esta ajuda
/status - Verificar estado do bot

<b>Como configurar:</b>
1. Use /start para obter o seu Chat ID
2. Aceda ao portal do volante
3. Vá a Configurações
4. Cole o Chat ID no campo apropriado
5. Guarde as configurações

<i>Pode adicionar múltiplos Chat IDs separados por vírgula para notificar várias pessoas.</i>
    `.trim();

    return sendTelegramMessage(chatId, mensagem);
  }

  // Comando /status - verificar estado
  if (text === '/status') {
    const mensagem = `
✅ <b>Bot Ativo</b>

O bot está a funcionar corretamente e pronto para enviar notificações.

📱 <b>O seu Chat ID:</b> <code>${chatId}</code>
    `.trim();

    return sendTelegramMessage(chatId, mensagem);
  }

  // Mensagem não reconhecida
  const mensagem = `
❓ Comando não reconhecido.

Use /help para ver os comandos disponíveis.
  `.trim();

  return sendTelegramMessage(chatId, mensagem);
}

/**
 * Configura o webhook do Telegram para receber mensagens
 */
export async function configurarWebhookTelegram(webhookUrl: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'Bot token não configurado' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return { ok: false, error: data.description };
    }

    console.log('[Telegram] Webhook configurado com sucesso:', webhookUrl);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Remove o webhook do Telegram
 */
export async function removerWebhookTelegram(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'Bot token não configurado' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`);
    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return { ok: false, error: data.description };
    }

    console.log('[Telegram] Webhook removido com sucesso');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Obtém informações sobre o webhook atual
 */
export async function getWebhookInfo(): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
}> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'Bot token não configurado' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return { ok: false, error: data.description };
    }

    return { ok: true, url: data.result.url };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}


/**
 * Formata e envia notificação de agendamento criado pelo volante
 * Envia para a loja quando o volante agenda um apoio
 */
export async function notificarAgendamentoCriado(
  chatIds: string,
  agendamento: {
    volanteNome: string;
    lojaNome?: string;
    data: Date;
    periodo: 'manha' | 'tarde' | 'dia_todo';
    tipoApoio?: string;
    descricao?: string;
    portalUrl?: string;
  }
): Promise<boolean> {
  const dataFormatada = new Date(agendamento.data).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const periodoTexto = agendamento.periodo === 'manha' 
    ? 'Manhã (9h-13h)' 
    : agendamento.periodo === 'tarde' 
      ? 'Tarde (14h-18h)' 
      : 'Dia Todo (9h-18h)';
  
  const tipoApoioTexto = agendamento.tipoApoio ? ({
    cobertura_ferias: 'Cobertura de Férias',
    substituicao_vidros: 'Substituição de Vidros',
    outro: 'Outro',
  }[agendamento.tipoApoio] || agendamento.tipoApoio) : null;

  const message = `
📅 <b>Novo Agendamento do Volante</b>

👤 <b>Volante:</b> ${agendamento.volanteNome}
${agendamento.lojaNome ? `🏪 <b>Loja:</b> ${agendamento.lojaNome}` : ''}
📅 <b>Data:</b> ${dataFormatada}
⏰ <b>Período:</b> ${periodoTexto}
${tipoApoioTexto ? `🔧 <b>Tipo:</b> ${tipoApoioTexto}` : ''}
${agendamento.descricao ? `📝 <b>Observações:</b> ${agendamento.descricao}` : ''}

<i>O volante agendou um apoio para esta loja.</i>
${agendamento.portalUrl ? `
🔗 <a href="${agendamento.portalUrl}">Abrir Portal do Volante</a>` : ''}
  `.trim();

  const result = await sendTelegramMessageToMultiple(chatIds, message);
  return result.success > 0;
}
