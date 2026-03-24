/**
 * Serviço de envio automático da relação de colaboradores para RH
 * Executado automaticamente no dia 24 de cada mês via cron job
 * Gera PDF e envia email para recursoshumanos@expressglass.pt para cada gestor
 */

import * as db from './db';
import { sendEmail } from './emailService';
import { gerarPDFRelacaoRH } from './pdfRelacaoRH';

const EMAIL_DESTINO_RH = 'recursoshumanos@expressglass.pt';

/**
 * Envia automaticamente a relação de colaboradores de TODOS os gestores para RH
 * Executado no dia 24 de cada mês
 */
export async function enviarRelacaoRHAutomatico(): Promise<{
  total: number;
  enviados: number;
  erros: string[];
  detalhes: string[];
}> {
  const agora = new Date();
  const horaLisboa = agora.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });
  const resultado = { total: 0, enviados: 0, erros: [] as string[], detalhes: [] as string[] };

  console.log(`[CRON-RH-AUTO] ========================================`);
  console.log(`[CRON-RH-AUTO] Envio automático de relação de colaboradores para RH`);
  console.log(`[CRON-RH-AUTO] Hora Lisboa: ${horaLisboa}`);
  console.log(`[CRON-RH-AUTO] ========================================`);

  try {
    // Obter todos os gestores
    const gestores = await db.getAllGestores();
    resultado.total = gestores.length;

    if (gestores.length === 0) {
      resultado.detalhes.push('Nenhum gestor encontrado');
      console.log('[CRON-RH-AUTO] Nenhum gestor encontrado');
      return resultado;
    }

    console.log(`[CRON-RH-AUTO] Gestores encontrados: ${gestores.length}`);

    const mes = agora.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
    const dataEnvio = agora.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    for (const gestor of gestores) {
      const gestorNome = gestor.nome || 'Gestor';
      console.log(`[CRON-RH-AUTO] Processando gestor: ${gestorNome} (ID: ${gestor.id})`);

      try {
        // Verificar se já enviou este mês (evitar duplicados)
        const gestorCompleto = await db.getGestorByUserId(gestor.userId);
        if (gestorCompleto?.lastEnvioRH) {
          const ultimoEnvio = new Date(gestorCompleto.lastEnvioRH);
          if (ultimoEnvio.getMonth() === agora.getMonth() &&
              ultimoEnvio.getFullYear() === agora.getFullYear()) {
            console.log(`[CRON-RH-AUTO] Gestor ${gestorNome} já enviou este mês, ignorando...`);
            resultado.detalhes.push(`${gestorNome}: já enviou este mês (ignorado)`);
            continue;
          }
        }

        // Obter lojas do gestor
        const lojasGestor = await db.getLojasByGestorId(gestor.id);

        // Obter colaboradores de cada loja
        const colaboradoresPorLoja: Array<{
          loja: { id: number; nome: string; numeroLoja?: number | null };
          colaboradores: Array<{ nome: string; codigoColaborador?: string | null; cargo: string; tipo: string }>;
        }> = [];

        for (const loja of lojasGestor) {
          const colabs = await db.getColaboradoresByLojaId(loja.id, true);
          colaboradoresPorLoja.push({
            loja: { id: loja.id, nome: loja.nome, numeroLoja: loja.numeroLoja },
            colaboradores: colabs.map(c => ({
              nome: c.nome,
              codigoColaborador: c.codigoColaborador,
              cargo: c.cargo,
              tipo: c.tipo
            }))
          });
        }

        // Obter volantes e recalibra do gestor
        const volantes = await db.getColaboradoresVolantesByGestorId(gestor.id, true);
        const todosColabs = await db.getAllColaboradoresByGestorId(gestor.id, true);
        const recalbrasList = todosColabs.filter(c => c.tipo === 'recalbra');

        const totalColaboradores = colaboradoresPorLoja.reduce((acc, l) => acc + l.colaboradores.length, 0) + volantes.length + recalbrasList.length;

        if (totalColaboradores === 0) {
          console.log(`[CRON-RH-AUTO] Gestor ${gestorNome} sem colaboradores, ignorando...`);
          resultado.detalhes.push(`${gestorNome}: sem colaboradores (ignorado)`);
          continue;
        }

        // Gerar PDF
        const pdfBuffer = await gerarPDFRelacaoRH({
          gestorNome,
          mes,
          totalColaboradores,
          colaboradoresPorLoja,
          volantes: volantes.map(v => ({
            nome: v.nome,
            codigoColaborador: v.codigoColaborador,
            cargo: v.cargo,
            tipo: v.tipo
          })),
          recalbras: recalbrasList.map(r => ({
            nome: r.nome,
            codigoColaborador: r.codigoColaborador,
            cargo: r.cargo,
            tipo: r.tipo
          }))
        });

        // Gerar HTML do email
        const totalEmLojas = colaboradoresPorLoja.reduce((acc, l) => acc + l.colaboradores.length, 0);
        const totalVolantes = volantes.length;
        const totalRecalbra = recalbrasList.length;

        const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #059669; }
    .content { padding: 20px 0; }
    .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { margin-bottom: 10px; }
    .info-label { font-weight: bold; color: #166534; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
    .attachment-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .auto-badge { display: inline-block; background: #059669; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
      <h2 style="margin: 15px 0 5px 0; color: #059669; font-size: 18px;">Relacao de Colaboradores</h2>
      <p style="margin: 5px 0 0 0; color: #6b7280;">${mesCapitalizado}</p>
      <span class="auto-badge">Envio Automatico</span>
    </div>
    
    <div class="content">
      <p>Exmos(as). Senhores(as),</p>
      
      <p>Serve o presente email para enviar a <strong>Relacao de Colaboradores</strong> referente ao mes de <strong>${mesCapitalizado}</strong>.</p>
      
      <div class="info-box">
        <div class="info-row"><span class="info-label">Gestor:</span> ${gestorNome}</div>
        <div class="info-row"><span class="info-label">Total de Colaboradores:</span> ${totalColaboradores}</div>
        <div class="info-row"><span class="info-label">Em Lojas:</span> ${totalEmLojas}</div>
        <div class="info-row"><span class="info-label">Volantes:</span> ${totalVolantes}</div>
        <div class="info-row"><span class="info-label">Recalibra:</span> ${totalRecalbra}</div>
        <div class="info-row"><span class="info-label">Data de Envio:</span> ${dataEnvio}</div>
      </div>
      
      <div class="attachment-note">
        <strong>📎 Anexo:</strong> Em anexo segue o ficheiro PDF com a relacao completa de colaboradores.
      </div>
      
      <p>Com os melhores cumprimentos,</p>
      <p><strong>${gestorNome}</strong><br>
      Gestor de Zona</p>
    </div>
    
    <div class="footer">
      Este email foi enviado automaticamente atraves da plataforma PoweringEG.<br>
      ExpressGlass - Especialistas em Vidro Automovel
    </div>
  </div>
</body>
</html>
        `;

        // Nome do ficheiro PDF
        const nomeArquivo = `Relacao_Colaboradores_${gestorNome.replace(/\s+/g, '_')}_${mesCapitalizado.replace(/\s+/g, '_')}.pdf`;

        // Enviar email para RH com PDF em anexo
        const enviado = await sendEmail({
          to: EMAIL_DESTINO_RH,
          subject: `Relação de Colaboradores - ${gestorNome} - ${mesCapitalizado}`,
          html,
          attachments: [{
            filename: nomeArquivo,
            content: pdfBuffer.toString('base64'),
            contentType: 'application/pdf'
          }]
        });

        if (enviado) {
          resultado.enviados++;
          resultado.detalhes.push(`${gestorNome}: enviado com sucesso (${totalColaboradores} colaboradores)`);
          console.log(`[CRON-RH-AUTO] OK: ${gestorNome} - ${totalColaboradores} colaboradores enviados`);

          // Registar envio no histórico
          await db.registarEnvioRH({
            gestorId: gestor.id,
            mesReferencia: mesCapitalizado,
            totalColaboradores,
            totalEmLojas,
            totalVolantes,
            totalRecalbra,
            emailDestino: EMAIL_DESTINO_RH,
            emailEnviado: true
          });

          // Registar data de envio no gestor
          await db.updateGestorEnvioRH(gestor.id);
        } else {
          resultado.erros.push(`${gestorNome}: falha no envio do email`);
          console.log(`[CRON-RH-AUTO] FALHA: ${gestorNome} - email não enviado`);
        }

        // Pausa entre envios para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err: any) {
        resultado.erros.push(`${gestorNome}: ${err.message}`);
        console.error(`[CRON-RH-AUTO] ERRO: ${gestorNome}:`, err.message);
      }
    }

    console.log(`[CRON-RH-AUTO] ========================================`);
    console.log(`[CRON-RH-AUTO] Resultado: ${resultado.enviados}/${resultado.total} enviados`);
    console.log(`[CRON-RH-AUTO] Erros: ${resultado.erros.length}`);
    console.log(`[CRON-RH-AUTO] ========================================`);
  } catch (error: any) {
    resultado.erros.push(`Erro geral: ${error.message}`);
    console.error('[CRON-RH-AUTO] Erro geral:', error);
  }

  return resultado;
}
