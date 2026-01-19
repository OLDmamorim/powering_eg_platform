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
    periodo: 'manha' | 'tarde';
    tipoApoio: string;
    observacoes?: string;
  }
): Promise<boolean> {
  const dataFormatada = new Date(pedido.data).toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const periodoTexto = pedido.periodo === 'manha' ? 'Manhã (9h-13h)' : 'Tarde (14h-18h)';
  
  const tipoApoioTexto = {
    cobertura_ferias: 'Cobertura de Férias',
    substituicao_vidros: 'Substituição de Vidros',
    outro: 'Outro',
  }[pedido.tipoApoio] || pedido.tipoApoio;

  const message = `
🔔 <b>Novo Pedido de Apoio</b>

🏪 <b>Loja:</b> ${pedido.lojaNome}
📅 <b>Data:</b> ${dataFormatada}
⏰ <b>Período:</b> ${periodoTexto}
🔧 <b>Tipo:</b> ${tipoApoioTexto}
${pedido.observacoes ? `📝 <b>Observações:</b> ${pedido.observacoes}` : ''}

<i>Aceda ao portal para aprovar ou reprovar este pedido.</i>
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
