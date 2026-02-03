import * as db from './db';
import { sendEmail } from './emailService';

/**
 * Serviço de lembrete automático para envio de relação de colaboradores para RH
 * Deve ser executado diariamente via cron job
 */

// Verifica se hoje é dia 20 do mês
export function isDia20(): boolean {
  const hoje = new Date();
  return hoje.getDate() === 20;
}

// Gera o HTML do email de lembrete
function gerarHTMLLembrete(gestorNome: string, mes: string): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #059669; }
    .content { padding: 20px 0; }
    .alert-box { background: #fef3c7; border: 1px solid #f59e0b; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .alert-title { font-weight: bold; color: #92400e; font-size: 18px; margin-bottom: 10px; }
    .cta-button { display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
      <h2 style="margin: 15px 0 5px 0; color: #059669; font-size: 18px;">Lembrete - Relacao de Colaboradores</h2>
    </div>
    
    <div class="content">
      <p>Ola ${gestorNome},</p>
      
      <div class="alert-box">
        <div class="alert-title">📋 Lembrete Mensal</div>
        <p>Hoje e dia <strong>20 de ${mes}</strong>. E altura de enviar a relacao de colaboradores para os Recursos Humanos.</p>
        <p>Por favor, aceda a plataforma PoweringEG e envie a relacao atualizada das suas lojas.</p>
      </div>
      
      <p>Este lembrete e enviado automaticamente no dia 20 de cada mes para garantir que a relacao de colaboradores e enviada atempadamente.</p>
      
      <p>Com os melhores cumprimentos,<br>
      <strong>PoweringEG Platform</strong></p>
    </div>
    
    <div class="footer">
      Este email foi enviado automaticamente atraves da plataforma PoweringEG.<br>
      ExpressGlass - Especialistas em Vidro Automovel
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Envia lembrete para todos os gestores que ainda não enviaram a relação este mês
 */
export async function enviarLembretesRH(): Promise<{ enviados: number; erros: number }> {
  // Verificar se é dia 20
  if (!isDia20()) {
    console.log('[LembreteRH] Hoje não é dia 20, ignorando...');
    return { enviados: 0, erros: 0 };
  }

  console.log('[LembreteRH] Iniciando envio de lembretes...');
  
  // Obter todos os gestores
  const gestores = await db.getAllGestores();
  
  if (!gestores || gestores.length === 0) {
    console.log('[LembreteRH] Nenhum gestor encontrado');
    return { enviados: 0, erros: 0 };
  }

  // Obter mês atual em português
  const mesAtual = new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  
  let enviados = 0;
  let erros = 0;

  for (const gestor of gestores) {
    // Verificar se o gestor tem email
    if (!gestor.email) {
      console.log(`[LembreteRH] Gestor ${gestor.nome} não tem email configurado`);
      continue;
    }

    // Verificar se já enviou este mês (usando a função existente)
    const gestorCompleto = await db.getGestorByUserId(gestor.userId);
    if (gestorCompleto?.lastEnvioRH) {
      const ultimoEnvio = new Date(gestorCompleto.lastEnvioRH);
      const agora = new Date();
      
      // Se enviou no mesmo mês e ano, não enviar lembrete
      if (ultimoEnvio.getMonth() === agora.getMonth() && 
          ultimoEnvio.getFullYear() === agora.getFullYear()) {
        console.log(`[LembreteRH] Gestor ${gestor.nome} já enviou este mês, ignorando...`);
        continue;
      }
    }

    // Gerar e enviar email de lembrete
    const html = gerarHTMLLembrete(gestor.nome || 'Gestor', mesAtual);
    
    try {
      const enviado = await sendEmail({
        to: gestor.email,
        subject: `🔔 Lembrete: Enviar Relação de Colaboradores - ${mesAtual}`,
        html
      });

      if (enviado) {
        enviados++;
        console.log(`[LembreteRH] Lembrete enviado para ${gestor.nome} (${gestor.email})`);
      } else {
        erros++;
        console.error(`[LembreteRH] Falha ao enviar lembrete para ${gestor.nome}`);
      }
    } catch (error) {
      erros++;
      console.error(`[LembreteRH] Erro ao enviar lembrete para ${gestor.nome}:`, error);
    }
  }

  console.log(`[LembreteRH] Concluído: ${enviados} enviados, ${erros} erros`);
  return { enviados, erros };
}
