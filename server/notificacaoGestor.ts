import { sendEmail } from "./emailService";
import * as db from "./db";
import { ENV } from "./_core/env";

/**
 * Notifica o gestor responsável pela loja quando admin cria relatório
 */
export async function notificarGestorRelatorioAdmin(
  relatorioId: number,
  tipoRelatorio: 'livre' | 'completo',
  lojaId: number,
  nomeAdmin: string
): Promise<boolean> {
  try {
    // Buscar informações da loja
    const loja = await db.getLojaById(lojaId);
    if (!loja) {
      console.error('[Email] Loja não encontrada:', lojaId);
      return false;
    }

    // Buscar gestores associados à loja
    const gestores = await db.getGestoresByLojaId(lojaId);
    if (!gestores || gestores.length === 0) {
      console.error('[Email] Nenhum gestor encontrado para loja:', loja.nome);
      return false;
    }

    // Enviar email para cada gestor da loja
    const resultados = await Promise.all(
      gestores.map(async (gestor) => {
        const emailGestor = gestor.user?.email;
        const nomeGestor = gestor.user?.name || 'Gestor';
        if (!emailGestor) {
          console.warn('[Email] Gestor sem email:', nomeGestor);
          return false;
        }

        const tipoTexto = tipoRelatorio === 'livre' ? 'Livre' : 'Completo';
        const subject = `Novo Relatório ${tipoTexto} criado por ${nomeAdmin}`;
        
        // URL da plataforma para visualizar o relatório
        const baseUrl = process.env.VITE_OAUTH_PORTAL_URL || 'https://app.manus.im';
        const relatorioUrl = `${baseUrl}/meus-relatorios`;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .info-box {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #667eea;
    }
    .info-box strong {
      color: #667eea;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
      font-weight: bold;
    }
    .button:hover {
      background: #764ba2;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Novo Relatório Criado</h1>
  </div>
  
  <div class="content">
    <p>Olá <strong>${nomeGestor}</strong>,</p>
    
    <p>O administrador <strong>${nomeAdmin}</strong> criou um novo relatório <strong>${tipoTexto}</strong> para a loja sob a sua responsabilidade.</p>
    
    <div class="info-box">
      <p><strong>🏪 Loja:</strong> ${loja.nome}</p>
      <p><strong>📝 Tipo de Relatório:</strong> ${tipoTexto}</p>
      <p><strong>👤 Criado por:</strong> ${nomeAdmin} (Admin)</p>
    </div>
    
    <p>Pode visualizar o relatório completo acedendo à plataforma PoweringEG:</p>
    
    <center>
      <a href="${relatorioUrl}" class="button">Ver Relatório</a>
    </center>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">
      Este relatório foi criado pelo administrador e está disponível na secção "Meus Relatórios" da plataforma.
    </p>
  </div>
  
  <div class="footer">
    <p>PoweringEG Platform - Sistema de Gestão de Relatórios</p>
    <p>Esta é uma mensagem automática, por favor não responda a este email.</p>
  </div>
</body>
</html>
        `;

        const enviado = await sendEmail({
          to: emailGestor,
          subject,
          html,
        });

        if (enviado) {
          console.log(`[Email] Notificação enviada para ${nomeGestor} (${emailGestor})`);
        } else {
          console.error(`[Email] Falha ao enviar para ${nomeGestor} (${emailGestor})`);
        }

        return enviado;
      })
    );

    // Retorna true se pelo menos um email foi enviado com sucesso
    return resultados.some(r => r === true);
  } catch (error) {
    console.error('[Email] Erro ao notificar gestor:', error);
    return false;
  }
}
