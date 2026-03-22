import nodemailer from 'nodemailer';
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
 * Envia email através do Gmail SMTP
 * Usa nodemailer com as credenciais configuradas
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { to, subject, html, attachments } = payload;

  console.log(`[Email] sendEmail chamado: to=${to}, subject=${subject?.substring(0, 50)}, attachments=${attachments ? attachments.length + ' ficheiro(s): ' + attachments.map(a => a.filename + ' (' + Math.round((a.content?.length || 0) * 0.75 / 1024) + 'KB)').join(', ') : 'NENHUM'}`);

  // Verificar se as credenciais SMTP estão configuradas
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpEmail || !smtpPassword) {
    console.error("[Email] Credenciais SMTP não configuradas");
    return false;
  }

  try {
    // Criar transporter do nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    // Preparar anexos se existirem
    const mailAttachments = attachments?.map(att => {
      const buf = Buffer.from(att.content, 'base64');
      console.log(`[Email] Anexo preparado: ${att.filename}, buffer size: ${buf.length} bytes, contentType: ${att.contentType}`);
      return {
        filename: att.filename,
        content: buf,
        contentType: att.contentType,
      };
    });

    console.log(`[Email] mailAttachments count: ${mailAttachments?.length || 0}`);

    // Enviar email
    const mailOptions: any = {
      from: `"PoweringEG Platform" <${smtpEmail}>`,
      to,
      subject,
      html,
    };
    if (mailAttachments && mailAttachments.length > 0) {
      mailOptions.attachments = mailAttachments;
    }
    console.log(`[Email] mailOptions keys: ${Object.keys(mailOptions).join(', ')}`);
    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email] Email enviado com sucesso: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[Email] Erro ao enviar email:", error);
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
  fotos?: string[];
}): string {
  const { lojaNome, gestorNome, dataVisita, observacoes, pendentes, fotos } = relatorio;
  
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
    .fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .foto-item { border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
    .foto-item img { width: 100%; height: auto; display: block; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
    <div class="logo">PoweringEG Platform 2.0</div>
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
  
  ${fotos && fotos.length > 0 ? `
  <div class="section">
    <div class="section-title">Fotos da Visita</div>
    <div class="fotos-grid">
      ${fotos.map(foto => `
        <div class="foto-item">
          <img src="${foto}" alt="Foto da visita" />
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}
  
  <div class="footer">
    Relatório enviado por <strong>${gestorNome}</strong> via PoweringEG Platform<br>
    ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>
  `;
}

/**
 * Gera HTML do relatório completo para PDF/email
 * Inclui todas as secções do formulário Zoho
 */
export function gerarHTMLRelatorioCompleto(relatorio: {
  lojaNome: string;
  gestorNome: string;
  dataVisita: Date;
  // Campos do relatório completo (secções do formulário Zoho)
  episFardamento?: string;
  kitPrimeirosSocorros?: string;
  consumiveis?: string;
  espacoFisico?: string;
  reclamacoes?: string;
  vendasComplementares?: string;
  fichasServico?: string;
  documentacaoObrigatoria?: string;
  reuniaoQuinzenal?: boolean;
  resumoSupervisao?: string;
  colaboradoresPresentes?: string;
  pontosPositivos?: string;
  pontosNegativos?: string;
  pendentes?: Array<{ descricao: string; resolvido: boolean }>;
  fotos?: string[];
}): string {
  const { 
    lojaNome, gestorNome, dataVisita,
    episFardamento, kitPrimeirosSocorros, consumiveis, espacoFisico,
    reclamacoes, vendasComplementares, fichasServico, documentacaoObrigatoria,
    reuniaoQuinzenal, resumoSupervisao, colaboradoresPresentes,
    pontosPositivos, pontosNegativos, pendentes, fotos
  } = relatorio;
  
  const dataFormatada = new Date(dataVisita).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Função para renderizar uma secção de texto
  const renderSection = (title: string, content?: string) => {
    if (!content || content.trim() === '') return '';
    return `
    <div class="section">
      <div class="section-title">${title}</div>
      <div class="text-box">${content}</div>
    </div>
    `;
  };

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.5; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .title { font-size: 20px; margin-top: 10px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 150px; }
    .section { margin-bottom: 25px; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: bold; color: #10b981; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .text-box { background: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
    .positive { background: #d1fae5; border-left: 4px solid #10b981; }
    .negative { background: #fee2e2; border-left: 4px solid #ef4444; }
    .pendente { padding: 10px; margin-bottom: 8px; border-radius: 6px; }
    .pendente-ativo { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .pendente-resolvido { background: #d1fae5; border-left: 4px solid #10b981; text-decoration: line-through; }
    .fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .foto-item { border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
    .foto-item img { width: 100%; height: auto; display: block; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .reuniao-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .reuniao-sim { background: #d1fae5; color: #059669; }
    .reuniao-nao { background: #fee2e2; color: #dc2626; }
    .divider { border: 0; border-top: 1px dashed #e5e7eb; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
    <div class="logo">PoweringEG Platform 2.0</div>
    <div class="title">Relatório Completo de Visita</div>
  </div>
  
  <div class="info-box">
    <div class="info-row"><span class="info-label">Loja:</span> ${lojaNome}</div>
    <div class="info-row"><span class="info-label">Gestor:</span> ${gestorNome}</div>
    <div class="info-row"><span class="info-label">Data da Visita:</span> ${dataFormatada}</div>
    ${colaboradoresPresentes ? `<div class="info-row"><span class="info-label">Colaboradores:</span> ${colaboradoresPresentes}</div>` : ''}
  </div>

  <!-- Resumo da Supervisão -->
  ${resumoSupervisao ? `
  <div class="section">
    <div class="section-title">📋 Resumo da Supervisão</div>
    <div class="text-box">${resumoSupervisao}</div>
  </div>
  ` : ''}

  <!-- Pontos Positivos -->
  ${pontosPositivos ? `
  <div class="section">
    <div class="section-title">✅ Pontos Positivos a Destacar</div>
    <div class="text-box positive">${pontosPositivos}</div>
  </div>
  ` : ''}
  
  <!-- Pontos Negativos -->
  ${pontosNegativos ? `
  <div class="section">
    <div class="section-title">⚠️ Pontos Negativos a Destacar</div>
    <div class="text-box negative">${pontosNegativos}</div>
  </div>
  ` : ''}

  <hr class="divider" />

  <!-- Secções do Formulário Zoho -->
  ${renderSection('👔 EPIs e Fardamento', episFardamento)}
  ${renderSection('🏥 Kit de Primeiros Socorros', kitPrimeirosSocorros)}
  ${renderSection('📦 Consumíveis', consumiveis)}
  ${renderSection('🏢 Espaço Físico', espacoFisico)}
  ${renderSection('📝 Reclamações', reclamacoes)}
  ${renderSection('💰 Vendas Complementares', vendasComplementares)}
  ${renderSection('📄 Fichas de Serviço', fichasServico)}
  ${renderSection('📚 Documentação Obrigatória', documentacaoObrigatoria)}

  <!-- Reunião Quinzenal -->
  ${reuniaoQuinzenal !== undefined ? `
  <div class="section">
    <div class="section-title">📅 Reunião Quinzenal</div>
    <span class="reuniao-badge ${reuniaoQuinzenal ? 'reuniao-sim' : 'reuniao-nao'}">
      ${reuniaoQuinzenal ? '✓ Realizada' : '✗ Não Realizada'}
    </span>
  </div>
  ` : ''}
  
  <!-- Pendentes -->
  ${pendentes && pendentes.length > 0 ? `
  <div class="section">
    <div class="section-title">⏳ Pendentes</div>
    ${pendentes.map(p => `
      <div class="pendente ${p.resolvido ? 'pendente-resolvido' : 'pendente-ativo'}">
        ${p.resolvido ? '✓' : '○'} ${p.descricao}
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  <!-- Fotos -->
  ${fotos && fotos.length > 0 ? `
  <div class="section">
    <div class="section-title">📷 Fotos da Visita</div>
    <div class="fotos-grid">
      ${fotos.map(foto => `
        <div class="foto-item">
          <img src="${foto}" alt="Foto da visita" />
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}
  
  <div class="footer">
    Relatório enviado por <strong>${gestorNome}</strong> via PoweringEG Platform<br>
    ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>
  `;
}

/**
 * Gera HTML do relatório mensal de atividade do volante para uma loja específica
 */
export function gerarHTMLRelatorioMensalVolante(dados: {
  lojaNome: string;
  volanteNome: string;
  mes: number;
  ano: number;
  servicos: Array<{
    data: string;
    substituicaoLigeiro: number;
    reparacao: number;
    calibragem: number;
    outros: number;
  }>;
  totalSubstituicaoLigeiro: number;
  totalReparacao: number;
  totalCalibragem: number;
  totalOutros: number;
  totalGeral: number;
  diasAtivos: number;
}): string {
  const { 
    lojaNome, volanteNome, mes, ano, servicos,
    totalSubstituicaoLigeiro, totalReparacao, totalCalibragem, totalOutros, totalGeral, diasAtivos
  } = dados;

  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = mesesNomes[mes - 1];

  // Ordenar serviços por data (mais recente primeiro)
  const servicosOrdenados = [...servicos].sort((a, b) => b.data.localeCompare(a.data));

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .title { font-size: 20px; margin-top: 10px; color: #1e40af; }
    .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 120px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #3b82f6; }
    .summary-card.highlight { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left-color: #1e40af; }
    .summary-number { font-size: 32px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
    .summary-label { font-size: 14px; color: #6b7280; text-transform: uppercase; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .table th { background: #3b82f6; color: white; padding: 12px; text-align: left; font-weight: bold; }
    .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .table tr:last-child td { border-bottom: none; }
    .table tr:hover { background: #f9fafb; }
    .total-row { background: #dbeafe !important; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge-success { background: #d1fae5; color: #059669; }
    .no-data { text-align: center; padding: 40px; color: #9ca3af; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
    <div class="logo">PoweringEG Platform 2.0</div>
    <div class="title">Relatório Mensal de Atividade do Volante</div>
    <div class="subtitle">Resumo de Serviços Realizados</div>
  </div>
  
  <div class="info-box">
    <div class="info-row"><span class="info-label">Loja:</span> ${lojaNome}</div>
    <div class="info-row"><span class="info-label">Volante:</span> ${volanteNome}</div>
    <div class="info-row"><span class="info-label">Período:</span> ${mesNome} de ${ano}</div>
    <div class="info-row"><span class="info-label">Dias Ativos:</span> ${diasAtivos} ${diasAtivos === 1 ? 'dia' : 'dias'}</div>
  </div>

  <div class="section">
    <div class="section-title">📊 Resumo Total do Mês</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-number">${totalSubstituicaoLigeiro}</div>
        <div class="summary-label">Substituições Ligeiro</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totalReparacao}</div>
        <div class="summary-label">Reparações</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totalCalibragem}</div>
        <div class="summary-label">Calibragens</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totalOutros}</div>
        <div class="summary-label">Outros Serviços</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-number">${totalGeral}</div>
        <div class="summary-label">Total Geral</div>
      </div>
    </div>
  </div>

  ${servicosOrdenados.length > 0 ? `
  <div class="section">
    <div class="section-title">📋 Detalhes por Dia</div>
    <table class="table">
      <thead>
        <tr>
          <th>Data</th>
          <th style="text-align: center;">Substituições Ligeiro</th>
          <th style="text-align: center;">Reparações</th>
          <th style="text-align: center;">Calibragens</th>
          <th style="text-align: center;">Outros</th>
          <th style="text-align: center;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${servicosOrdenados.map(s => {
          const dataFormatada = new Date(s.data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
          const totalDia = s.substituicaoLigeiro + s.reparacao + s.calibragem + s.outros;
          return `
          <tr>
            <td><strong>${dataFormatada}</strong></td>
            <td style="text-align: center;">${s.substituicaoLigeiro}</td>
            <td style="text-align: center;">${s.reparacao}</td>
            <td style="text-align: center;">${s.calibragem}</td>
            <td style="text-align: center;">${s.outros}</td>
            <td style="text-align: center;"><strong>${totalDia}</strong></td>
          </tr>
          `;
        }).join('')}
        <tr class="total-row">
          <td><strong>TOTAL</strong></td>
          <td style="text-align: center;"><strong>${totalSubstituicaoLigeiro}</strong></td>
          <td style="text-align: center;"><strong>${totalReparacao}</strong></td>
          <td style="text-align: center;"><strong>${totalCalibragem}</strong></td>
          <td style="text-align: center;"><strong>${totalOutros}</strong></td>
          <td style="text-align: center;"><strong>${totalGeral}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
  ` : `
  <div class="no-data">
    Não foram registados serviços neste período.
  </div>
  `}

  <div class="footer">
    <p>Relatório gerado automaticamente pela <strong>PoweringEG Platform</strong></p>
    <p>Data de geração: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
    <p style="margin-top: 10px; font-size: 11px;">
      Este email foi enviado automaticamente no dia 20 do mês.<br>
      Para mais informações, contacte a gestão da ExpressGlass.
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Gera HTML do relatório mensal de calibragens para uma unidade Recalibra específica
 */
export function gerarHTMLRelatorioMensalRecalibra(dados: {
  unidadeNome: string;
  mes: number;
  ano: number;
  calibragens: Array<{
    data: string;
    marca: string | null;
    matricula: string;
    tipologiaViatura: string;
    tipoCalibragem: string;
    localidade: string | null;
    lojaNome?: string;
  }>;
  totalDinamicas: number;
  totalEstaticas: number;
  totalCore: number;
  totalLigeiros: number;
  totalPesados: number;
  totalGeral: number;
  diasAtivos: number;
}): string {
  const { 
    unidadeNome, mes, ano, calibragens,
    totalDinamicas, totalEstaticas, totalCore,
    totalLigeiros, totalPesados, totalGeral, diasAtivos
  } = dados;

  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = mesesNomes[mes - 1];

  // Ordenar calibragens por data (mais recente primeiro)
  const calibragensOrdenadas = [...calibragens].sort((a, b) => b.data.localeCompare(a.data));

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #f59e0b; }
    .title { font-size: 20px; margin-top: 10px; color: #d97706; }
    .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 120px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #f59e0b; }
    .summary-card.highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left-color: #d97706; }
    .summary-number { font-size: 32px; font-weight: bold; color: #d97706; margin-bottom: 5px; }
    .summary-label { font-size: 13px; color: #6b7280; text-transform: uppercase; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: bold; color: #d97706; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .table th { background: #f59e0b; color: white; padding: 10px; text-align: left; font-weight: bold; font-size: 13px; }
    .table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .table tr:last-child td { border-bottom: none; }
    .table tr:hover { background: #f9fafb; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
    .badge-dinamica { background: #dbeafe; color: #1e40af; }
    .badge-estatica { background: #d1fae5; color: #059669; }
    .badge-core { background: #fef3c7; color: #d97706; }
    .badge-ligeiro { background: #e0e7ff; color: #4338ca; }
    .badge-pesado { background: #fce7f3; color: #be123c; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
    <div class="logo">PoweringEG Platform 2.0 - Recalibra</div>
    <div class="title">Relatório Mensal de Calibragens</div>
    <div class="subtitle">Resumo de Atividade</div>
  </div>
  
  <div class="info-box">
    <div class="info-row"><span class="info-label">Unidade:</span> ${unidadeNome}</div>
    <div class="info-row"><span class="info-label">Período:</span> ${mesNome} de ${ano}</div>
    <div class="info-row"><span class="info-label">Dias Ativos:</span> ${diasAtivos} ${diasAtivos === 1 ? 'dia' : 'dias'}</div>
  </div>

  <div class="section">
    <div class="section-title">📊 Resumo Total do Mês</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-number">${totalDinamicas}</div>
        <div class="summary-label">Dinâmicas</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totalEstaticas}</div>
        <div class="summary-label">Estáticas</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totalCore}</div>
        <div class="summary-label">Core</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totalLigeiros}</div>
        <div class="summary-label">Ligeiros</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totalPesados}</div>
        <div class="summary-label">Pesados</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-number">${totalGeral}</div>
        <div class="summary-label">Total Geral</div>
      </div>
    </div>
  </div>

  ${calibragensOrdenadas.length > 0 ? `
  <div class="section">
    <div class="section-title">📋 Detalhes das Calibragens</div>
    <table class="table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Matrícula</th>
          <th>Marca</th>
          <th>Tipo</th>
          <th>Tipologia</th>
          <th>Loja</th>
          <th>Localidade</th>
        </tr>
      </thead>
      <tbody>
        ${calibragensOrdenadas.map(c => {
          const dataFormatada = new Date(c.data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
          const tipoBadgeClass = c.tipoCalibragem === 'DINÂMICA' ? 'badge-dinamica' : c.tipoCalibragem === 'ESTÁTICA' ? 'badge-estatica' : 'badge-core';
          const tipologiaBadgeClass = c.tipologiaViatura === 'LIGEIRO' ? 'badge-ligeiro' : 'badge-pesado';
          return `
          <tr>
            <td><strong>${dataFormatada}</strong></td>
            <td>${c.matricula}</td>
            <td>${c.marca || '-'}</td>
            <td><span class="badge ${tipoBadgeClass}">${c.tipoCalibragem}</span></td>
            <td><span class="badge ${tipologiaBadgeClass}">${c.tipologiaViatura}</span></td>
            <td>${c.lojaNome || '-'}</td>
            <td>${c.localidade || '-'}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : `
  <div style="text-align: center; padding: 40px; color: #9ca3af; font-style: italic;">
    Não foram registadas calibragens neste período.
  </div>
  `}

  <div class="footer">
    <p>Relatório gerado automaticamente pela <strong>PoweringEG Platform</strong></p>
    <p>Data de geração: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
    <p style="margin-top: 10px; font-size: 11px;">
      PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Gera HTML do relatório consolidado de calibragens para gestor
 */
export function gerarHTMLRelatorioMensalRecalibraGestor(dados: {
  gestorNome: string;
  mes: number;
  ano: number;
  unidades: Array<{
    unidadeNome: string;
    unidadeId: number;
    totais: {
      dinamicas: number;
      estaticas: number;
      core: number;
      ligeiros: number;
      pesados: number;
      geral: number;
      diasAtivos: number;
    };
  }>;
}): string {
  const { gestorNome, mes, ano, unidades } = dados;
  
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = mesesNomes[mes - 1];
  
  // Calcular totais gerais
  const totaisGerais = unidades.reduce((acc, unidade) => ({
    dinamicas: acc.dinamicas + unidade.totais.dinamicas,
    estaticas: acc.estaticas + unidade.totais.estaticas,
    core: acc.core + unidade.totais.core,
    ligeiros: acc.ligeiros + unidade.totais.ligeiros,
    pesados: acc.pesados + unidade.totais.pesados,
    geral: acc.geral + unidade.totais.geral,
  }), { dinamicas: 0, estaticas: 0, core: 0, ligeiros: 0, pesados: 0, geral: 0 });
  
  // Ordenar unidades por total de calibragens (maior primeiro)
  const unidadesOrdenadas = [...unidades].sort((a, b) => b.totais.geral - a.totais.geral);
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #f59e0b; }
    .title { font-size: 20px; margin-top: 10px; color: #d97706; }
    .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 120px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #f59e0b; }
    .summary-card.highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left-color: #d97706; }
    .summary-number { font-size: 32px; font-weight: bold; color: #d97706; margin-bottom: 5px; }
    .summary-label { font-size: 13px; color: #6b7280; text-transform: uppercase; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: bold; color: #d97706; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .table th { background: #f59e0b; color: white; padding: 12px; text-align: left; font-weight: bold; font-size: 14px; }
    .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .table tr:last-child td { border-bottom: none; }
    .table tr:hover { background: #f9fafb; }
    .total-row { background: #fef3c7 !important; font-weight: bold; }
    .unidade-nome { font-weight: bold; color: #d97706; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
    <div class="logo">PoweringEG Platform 2.0 - Recalibra</div>
    <div class="title">Relatório Mensal Consolidado - Calibragens</div>
    <div class="subtitle">Resumo por Zona</div>
  </div>
  
  <div class="info-box">
    <div class="info-row"><span class="info-label">Gestor:</span> ${gestorNome}</div>
    <div class="info-row"><span class="info-label">Período:</span> ${mesNome} de ${ano}</div>
    <div class="info-row"><span class="info-label">Unidades com Atividade:</span> ${unidades.length} ${unidades.length === 1 ? 'unidade' : 'unidades'}</div>
  </div>

  <div class="section">
    <div class="section-title">📊 Resumo Total da Zona</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.dinamicas}</div>
        <div class="summary-label">Dinâmicas</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.estaticas}</div>
        <div class="summary-label">Estáticas</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.core}</div>
        <div class="summary-label">Core</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.ligeiros}</div>
        <div class="summary-label">Ligeiros</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.pesados}</div>
        <div class="summary-label">Pesados</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-number">${totaisGerais.geral}</div>
        <div class="summary-label">Total Geral</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔧 Detalhes por Unidade</div>
    <table class="table">
      <thead>
        <tr>
          <th>Unidade</th>
          <th style="text-align: center;">Dias Ativos</th>
          <th style="text-align: center;">Dinâmicas</th>
          <th style="text-align: center;">Estáticas</th>
          <th style="text-align: center;">Core</th>
          <th style="text-align: center;">Ligeiros</th>
          <th style="text-align: center;">Pesados</th>
          <th style="text-align: center;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${unidadesOrdenadas.map(unidade => `
        <tr>
          <td class="unidade-nome">${unidade.unidadeNome}</td>
          <td style="text-align: center;">${unidade.totais.diasAtivos}</td>
          <td style="text-align: center;">${unidade.totais.dinamicas}</td>
          <td style="text-align: center;">${unidade.totais.estaticas}</td>
          <td style="text-align: center;">${unidade.totais.core}</td>
          <td style="text-align: center;">${unidade.totais.ligeiros}</td>
          <td style="text-align: center;">${unidade.totais.pesados}</td>
          <td style="text-align: center;"><strong>${unidade.totais.geral}</strong></td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td><strong>TOTAL ZONA</strong></td>
          <td style="text-align: center;"><strong>-</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.dinamicas}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.estaticas}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.core}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.ligeiros}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.pesados}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.geral}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Relatório gerado automaticamente pela <strong>PoweringEG Platform</strong></p>
    <p>Data de geração: ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
    <p style="margin-top: 10px; font-size: 11px;">
      PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
    </p>
  </div>
</body>
</html>
  `;
}


// ========== FUNÇÕES DE EMAIL PARA PEDIDOS DE APOIO ==========

export function gerarHTMLPedidoAprovado(dados: {
  lojaNome: string;
  volanteNome: string;
  data: string;
  periodo: string;
  tipoApoio: string;
  observacoes: string | null;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: #10b981;">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: #059669;">✅ Pedido de Apoio Aprovado</div>
  </div>
  <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
    <p style="margin: 0; font-weight: bold; color: #065f46;">O seu pedido de apoio foi aprovado!</p>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Loja:</strong> ${dados.lojaNome}</p>
    <p><strong>Volante:</strong> ${dados.volanteNome}</p>
    <p><strong>Data:</strong> ${dados.data}</p>
    <p><strong>Período:</strong> ${dados.periodo}</p>
    <p><strong>Tipo de Apoio:</strong> ${dados.tipoApoio}</p>
    ${dados.observacoes ? `<p><strong>Observações:</strong> ${dados.observacoes}</p>` : ''}
  </div>
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>
  `;
}

export function gerarHTMLPedidoReprovado(dados: {
  lojaNome: string;
  volanteNome: string;
  data: string;
  periodo: string;
  tipoApoio: string;
  observacoes: string | null;
  motivo: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ef4444; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: #10b981;">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: #dc2626;">❌ Pedido de Apoio Reprovado</div>
  </div>
  <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
    <p style="margin: 0; font-weight: bold; color: #991b1b;">O seu pedido de apoio foi reprovado.</p>
    <p style="margin: 5px 0 0 0; color: #991b1b;"><strong>Motivo:</strong> ${dados.motivo}</p>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Loja:</strong> ${dados.lojaNome}</p>
    <p><strong>Volante:</strong> ${dados.volanteNome}</p>
    <p><strong>Data:</strong> ${dados.data}</p>
    <p><strong>Período:</strong> ${dados.periodo}</p>
    <p><strong>Tipo de Apoio:</strong> ${dados.tipoApoio}</p>
    ${dados.observacoes ? `<p><strong>Observações:</strong> ${dados.observacoes}</p>` : ''}
  </div>
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>
  `;
}

export function gerarHTMLPedidoAnulado(dados: {
  lojaNome: string;
  volanteNome: string;
  data: string;
  periodo: string;
  tipoApoio: string;
  motivo: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: #10b981;">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: #d97706;">⚠️ Apoio Anulado</div>
  </div>
  <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
    <p style="margin: 0; font-weight: bold; color: #92400e;">O pedido de apoio foi anulado.</p>
    <p style="margin: 5px 0 0 0; color: #92400e;"><strong>Motivo:</strong> ${dados.motivo}</p>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Loja:</strong> ${dados.lojaNome}</p>
    <p><strong>Volante:</strong> ${dados.volanteNome}</p>
    <p><strong>Data:</strong> ${dados.data}</p>
    <p><strong>Período:</strong> ${dados.periodo}</p>
    <p><strong>Tipo de Apoio:</strong> ${dados.tipoApoio}</p>
  </div>
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>
  `;
}

export function gerarHTMLPedidoEditado(dados: {
  lojaNome: string;
  volanteNome: string;
  data: string;
  periodo: string;
  tipoApoio: string;
  observacoes: string | null;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: #10b981;">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: #2563eb;">✏️ Apoio Alterado</div>
  </div>
  <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
    <p style="margin: 0; font-weight: bold; color: #1e40af;">O pedido de apoio foi alterado com os seguintes dados:</p>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Loja:</strong> ${dados.lojaNome}</p>
    <p><strong>Volante:</strong> ${dados.volanteNome}</p>
    <p><strong>Data:</strong> ${dados.data}</p>
    <p><strong>Período:</strong> ${dados.periodo}</p>
    <p><strong>Tipo de Apoio:</strong> ${dados.tipoApoio}</p>
    ${dados.observacoes ? `<p><strong>Observações:</strong> ${dados.observacoes}</p>` : ''}
  </div>
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>
  `;
}


export function gerarHTMLNovoPedidoApoio(dados: {
  volanteNome: string;
  lojaNome: string;
  data: string;
  periodo: string;
  tipoApoio: string;
  observacoes?: string | null;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: #10b981;">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: #059669;">📋 Novo Pedido de Apoio</div>
  </div>
  <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
    <p style="margin: 0; font-weight: bold; color: #065f46;">Olá ${dados.volanteNome}, tem um novo pedido de apoio!</p>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Loja:</strong> ${dados.lojaNome}</p>
    <p><strong>Data:</strong> ${dados.data}</p>
    <p><strong>Período:</strong> ${dados.periodo}</p>
    <p><strong>Tipo de Apoio:</strong> ${dados.tipoApoio}</p>
    ${dados.observacoes ? `<p><strong>Observações:</strong> ${dados.observacoes}</p>` : ''}
  </div>
  <p style="color: #6b7280;">Por favor, aceda ao portal do volante para aprovar ou rejeitar este pedido.</p>
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>
  `;
}


export function gerarHTMLOcorrenciaEstrutural(dados: {
  gestorNome: string;
  temaNome: string;
  descricao: string;
  abrangencia: string;
  zonaAfetada?: string | null;
  impacto: string;
  sugestaoAcao?: string | null;
  fotos?: string[];
  criadoEm: Date;
}): string {
  const dataFormatada = dados.criadoEm.toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const abrangenciaTexto: Record<string, string> = {
    loja: 'Loja específica',
    zona: 'Zona',
    nacional: 'Nacional',
  };

  const impactoTexto: Record<string, string> = {
    baixo: 'Baixo',
    medio: 'Médio',
    alto: 'Alto',
    critico: 'Crítico',
  };

  const fotosHTML = (dados.fotos || []).length > 0
    ? `<div style="margin-top:16px;"><strong>Fotos:</strong><br/>${(dados.fotos || []).map(url => `<img src="${url}" style="max-width:200px;margin:4px;border-radius:4px;" />`).join('')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ef4444; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: #dc2626;">⚠️ Ocorrência Estrutural</div>
  </div>
  <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
    <p style="margin: 0; font-weight: bold; color: #991b1b;">Reportado por: ${dados.gestorNome}</p>
    <p style="margin: 4px 0 0; color: #7f1d1d; font-size: 13px;">${dataFormatada}</p>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Tema:</strong> ${dados.temaNome}</p>
    <p><strong>Abrangência:</strong> ${abrangenciaTexto[dados.abrangencia] || dados.abrangencia}</p>
    ${dados.zonaAfetada ? `<p><strong>Zona Afetada:</strong> ${dados.zonaAfetada}</p>` : ''}
    <p><strong>Impacto:</strong> ${impactoTexto[dados.impacto] || dados.impacto}</p>
    <p><strong>Descrição:</strong> ${dados.descricao}</p>
    ${dados.sugestaoAcao ? `<p><strong>Sugestão de Ação:</strong> ${dados.sugestaoAcao}</p>` : ''}
  </div>
  ${fotosHTML}
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>`;
}

export function gerarHTMLNotificacaoTodo(dados: {
  tipo: 'nova' | 'reatribuida' | 'status_atualizado' | 'resposta_gestor' | 'devolvida' | 'nova_da_loja' | 'resposta_loja' | 'observacao_loja';
  titulo: string;
  descricao: string;
  prioridade: string;
  criadoPor: string;
  lojaNome: string;
  novoEstado?: string;
  comentario?: string;
  resposta?: string;
}): string {
  const tipoConfig: Record<string, { label: string; cor: string; emoji: string }> = {
    nova: { label: 'Nova Tarefa Atribuída', cor: '#3b82f6', emoji: '📋' },
    reatribuida: { label: 'Tarefa Reatribuída', cor: '#8b5cf6', emoji: '🔄' },
    status_atualizado: { label: 'Estado de Tarefa Atualizado', cor: '#f59e0b', emoji: '📊' },
    resposta_gestor: { label: 'Resposta do Gestor', cor: '#10b981', emoji: '💬' },
    devolvida: { label: 'Tarefa Devolvida', cor: '#ef4444', emoji: '↩️' },
    nova_da_loja: { label: 'Nova Tarefa da Loja', cor: '#06b6d4', emoji: '🏪' },
    resposta_loja: { label: 'Resposta da Loja', cor: '#10b981', emoji: '💬' },
    observacao_loja: { label: 'Observação da Loja', cor: '#f59e0b', emoji: '📝' },
  };

  const prioridadeTexto: Record<string, string> = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    urgente: 'Urgente',
  };

  const cfg = tipoConfig[dados.tipo] || { label: dados.tipo, cor: '#6b7280', emoji: '📋' };

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid ${cfg.cor}; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: ${cfg.cor};">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: ${cfg.cor};">${cfg.emoji} ${cfg.label}</div>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Tarefa:</strong> ${dados.titulo}</p>
    <p><strong>Loja:</strong> ${dados.lojaNome}</p>
    <p><strong>Prioridade:</strong> ${prioridadeTexto[dados.prioridade] || dados.prioridade}</p>
    ${dados.descricao ? `<p><strong>Descrição:</strong> ${dados.descricao}</p>` : ''}
    ${dados.novoEstado ? `<p><strong>Novo Estado:</strong> ${dados.novoEstado}</p>` : ''}
    ${dados.comentario ? `<p><strong>Comentário:</strong> ${dados.comentario}</p>` : ''}
    ${dados.resposta ? `<p><strong>Resposta:</strong> ${dados.resposta}</p>` : ''}
  </div>
  <p style="color: #6b7280; font-size: 13px;">Por favor, aceda ao portal para mais detalhes.</p>
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>`;
}

export function gerarHTMLReuniaoQuinzenal(dados: {
  lojaNome: string;
  dataReuniao: string | Date;
  participantes: string[];
  temasDiscutidos: string;
  decisoesTomadas: string;
  observacoes?: string;
  analiseResultados?: string;
  planosAcao?: string;
  pendentes?: any[];
}): string {
  const dataFormatada = new Date(dados.dataReuniao).toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const participantesHTML = dados.participantes.length > 0
    ? dados.participantes.map(p => `<li style="margin: 4px 0;">${p}</li>`).join('')
    : '<li style="margin: 4px 0; color: #6b7280;">Sem participantes registados</li>';

  const pendentesHTML = dados.pendentes && dados.pendentes.length > 0
    ? `<div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #92400e;">⚠️ Pendentes em aberto: ${dados.pendentes.length}</p>
        ${dados.pendentes.slice(0, 5).map((p: any) => `<p style="margin: 2px 0; font-size: 13px; color: #78350f;">• ${p.descricao || p.titulo || 'Pendente'}</p>`).join('')}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; margin: 40px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
    <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">PoweringEG</div>
    <div style="font-size: 18px; margin-top: 10px; color: #1d4ed8;">📋 Reunião Quinzenal — ${dados.lojaNome}</div>
    <div style="font-size: 14px; margin-top: 6px; color: #6b7280;">${dataFormatada}</div>
  </div>
  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p><strong>Participantes:</strong></p>
    <ul style="margin: 4px 0; padding-left: 20px;">${participantesHTML}</ul>
  </div>
  ${dados.temasDiscutidos ? `<div style="margin-bottom: 16px;"><p><strong>Temas Discutidos:</strong></p><p style="white-space: pre-wrap; color: #374151;">${dados.temasDiscutidos}</p></div>` : ''}
  ${dados.decisoesTomadas ? `<div style="margin-bottom: 16px;"><p><strong>Decisões Tomadas:</strong></p><p style="white-space: pre-wrap; color: #374151;">${dados.decisoesTomadas}</p></div>` : ''}
  ${dados.analiseResultados ? `<div style="margin-bottom: 16px;"><p><strong>Análise de Resultados:</strong></p><p style="white-space: pre-wrap; color: #374151;">${dados.analiseResultados}</p></div>` : ''}
  ${dados.planosAcao ? `<div style="margin-bottom: 16px;"><p><strong>Planos de Ação:</strong></p><p style="white-space: pre-wrap; color: #374151;">${dados.planosAcao}</p></div>` : ''}
  ${dados.observacoes ? `<div style="margin-bottom: 16px;"><p><strong>Observações:</strong></p><p style="white-space: pre-wrap; color: #374151;">${dados.observacoes}</p></div>` : ''}
  ${pendentesHTML}
  <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af;">
    PoweringEG Platform 2.0 - a IA ao serviço da ExpressGlass
  </div>
</body>
</html>`;
}
