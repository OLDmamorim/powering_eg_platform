import { ENV } from "./_core/env";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
};

/**
 * Envia email através do serviço Forge da Manus
 * Usa a API de notificações para enviar emails
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { to, subject, html, attachments } = payload;

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.error("[Email] Forge API não configurada");
    return false;
  }

  // Usar a API de email do Forge
  const endpoint = `${ENV.forgeApiUrl.replace(/\/$/, "")}/email.v1.EmailService/SendEmail`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        attachments: attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType,
        })),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Email] Falha ao enviar email (${response.status}): ${detail}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Email] Erro ao enviar email:", error);
    return false;
  }
}

/**
 * Gera HTML do relatório livre para PDF/email
 */
export function gerarHTMLRelatorioLivre(relatorio: {
  lojaNome: string;
  gestorNome: string;
  dataVisita: Date;
  observacoes: string;
  pendentes?: Array<{ descricao: string; resolvido: boolean }>;
}): string {
  const { lojaNome, gestorNome, dataVisita, observacoes, pendentes } = relatorio;
  
  const dataFormatada = new Date(dataVisita).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .title { font-size: 20px; margin-top: 10px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 120px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #10b981; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .observacoes { background: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
    .pendente { padding: 10px; margin-bottom: 8px; border-radius: 6px; }
    .pendente-ativo { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .pendente-resolvido { background: #d1fae5; border-left: 4px solid #10b981; text-decoration: line-through; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">PoweringEG Platform</div>
    <div class="title">Relatório de Visita</div>
  </div>
  
  <div class="info-box">
    <div class="info-row"><span class="info-label">Loja:</span> ${lojaNome}</div>
    <div class="info-row"><span class="info-label">Gestor:</span> ${gestorNome}</div>
    <div class="info-row"><span class="info-label">Data da Visita:</span> ${dataFormatada}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Observações</div>
    <div class="observacoes">${observacoes || 'Sem observações registadas.'}</div>
  </div>
  
  ${pendentes && pendentes.length > 0 ? `
  <div class="section">
    <div class="section-title">Pendentes</div>
    ${pendentes.map(p => `
      <div class="pendente ${p.resolvido ? 'pendente-resolvido' : 'pendente-ativo'}">
        ${p.descricao}
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  <div class="footer">
    Relatório gerado automaticamente pela PoweringEG Platform<br>
    ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>
  `;
}

/**
 * Gera HTML do relatório completo para PDF/email
 */
export function gerarHTMLRelatorioCompleto(relatorio: {
  lojaNome: string;
  gestorNome: string;
  dataVisita: Date;
  // Campos do relatório completo
  atendimentoCliente?: number;
  organizacaoLoja?: number;
  limpezaGeral?: number;
  stockProdutos?: number;
  apresentacaoEquipa?: number;
  observacoesGerais?: string;
  pontosPositivos?: string;
  pontosNegativos?: string;
  pendentes?: Array<{ descricao: string; resolvido: boolean }>;
}): string {
  const { 
    lojaNome, gestorNome, dataVisita,
    atendimentoCliente, organizacaoLoja, limpezaGeral, stockProdutos, apresentacaoEquipa,
    observacoesGerais, pontosPositivos, pontosNegativos, pendentes
  } = relatorio;
  
  const dataFormatada = new Date(dataVisita).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const renderScore = (score?: number) => {
    if (!score) return '<span style="color: #9ca3af;">N/A</span>';
    const color = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444';
    return `<span style="color: ${color}; font-weight: bold;">${score}/5</span>`;
  };

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .title { font-size: 20px; margin-top: 10px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 120px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #10b981; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .scores-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .score-item { background: #fff; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; }
    .score-label { font-size: 14px; color: #6b7280; }
    .score-value { font-size: 18px; margin-top: 4px; }
    .text-box { background: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
    .positive { background: #d1fae5; border-left: 4px solid #10b981; }
    .negative { background: #fee2e2; border-left: 4px solid #ef4444; }
    .pendente { padding: 10px; margin-bottom: 8px; border-radius: 6px; }
    .pendente-ativo { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .pendente-resolvido { background: #d1fae5; border-left: 4px solid #10b981; text-decoration: line-through; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">PoweringEG Platform</div>
    <div class="title">Relatório Completo de Visita</div>
  </div>
  
  <div class="info-box">
    <div class="info-row"><span class="info-label">Loja:</span> ${lojaNome}</div>
    <div class="info-row"><span class="info-label">Gestor:</span> ${gestorNome}</div>
    <div class="info-row"><span class="info-label">Data da Visita:</span> ${dataFormatada}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Avaliações</div>
    <div class="scores-grid">
      <div class="score-item">
        <div class="score-label">Atendimento ao Cliente</div>
        <div class="score-value">${renderScore(atendimentoCliente)}</div>
      </div>
      <div class="score-item">
        <div class="score-label">Organização da Loja</div>
        <div class="score-value">${renderScore(organizacaoLoja)}</div>
      </div>
      <div class="score-item">
        <div class="score-label">Limpeza Geral</div>
        <div class="score-value">${renderScore(limpezaGeral)}</div>
      </div>
      <div class="score-item">
        <div class="score-label">Stock de Produtos</div>
        <div class="score-value">${renderScore(stockProdutos)}</div>
      </div>
      <div class="score-item">
        <div class="score-label">Apresentação da Equipa</div>
        <div class="score-value">${renderScore(apresentacaoEquipa)}</div>
      </div>
    </div>
  </div>
  
  ${observacoesGerais ? `
  <div class="section">
    <div class="section-title">Observações Gerais</div>
    <div class="text-box">${observacoesGerais}</div>
  </div>
  ` : ''}
  
  ${pontosPositivos ? `
  <div class="section">
    <div class="section-title">Pontos Positivos a Destacar</div>
    <div class="text-box positive">${pontosPositivos}</div>
  </div>
  ` : ''}
  
  ${pontosNegativos ? `
  <div class="section">
    <div class="section-title">Pontos Negativos a Destacar</div>
    <div class="text-box negative">${pontosNegativos}</div>
  </div>
  ` : ''}
  
  ${pendentes && pendentes.length > 0 ? `
  <div class="section">
    <div class="section-title">Pendentes</div>
    ${pendentes.map(p => `
      <div class="pendente ${p.resolvido ? 'pendente-resolvido' : 'pendente-ativo'}">
        ${p.descricao}
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  <div class="footer">
    Relatório gerado automaticamente pela PoweringEG Platform<br>
    ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>
  `;
}
