import * as db from '../db';
import { gerarPDFRelatorioGestor, gerarPDFRelatorioLoja } from '../relatorioServicosVolantePDF';
import { sendEmail } from '../emailService';

/**
 * Enviar relatórios mensais de serviços do volante
 * Executado automaticamente no último dia do mês às 23:00
 */
export async function enviarRelatoriosMensaisServicos() {
  console.log('[Relatórios Mensais] Iniciando envio de relatórios de serviços...');
  
  try {
    // Calcular mês anterior (mês de referência)
    const hoje = new Date();
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesReferencia = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;
    const dataInicio = `${mesReferencia}-01`;
    const dataFim = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0).toISOString().split('T')[0];
    
    console.log(`[Relatórios Mensais] Mês de referência: ${mesReferencia}`);
    
    // Obter todos os volantes ativos
    const volantes = await db.getAllVolantes();
    
    if (!volantes || volantes.length === 0) {
      console.log('[Relatórios Mensais] Nenhum volante encontrado');
      return;
    }
    
    for (const volante of volantes) {
      console.log(`[Relatórios Mensais] Processando volante: ${volante.nome}`);
      
      // Obter serviços do volante no mês
      const servicos = await db.getServicosVolantePorPeriodo(volante.id, dataInicio, dataFim);
      
      if (!servicos || servicos.length === 0) {
        console.log(`[Relatórios Mensais] Nenhum serviço encontrado para ${volante.nome}`);
        continue;
      }
      
      // Agrupar serviços por loja
      const servicosPorLoja = servicos.reduce((acc, s) => {
        if (!acc[s.lojaId]) {
          acc[s.lojaId] = {
            lojaId: s.lojaId,
            lojaNome: s.lojaNome || 'Desconhecida',
            substituicaoLigeiro: 0,
            reparacao: 0,
            calibragem: 0,
            outros: 0,
            total: 0,
          };
        }
        acc[s.lojaId].substituicaoLigeiro += s.substituicaoLigeiro;
        acc[s.lojaId].reparacao += s.reparacao;
        acc[s.lojaId].calibragem += s.calibragem;
        acc[s.lojaId].outros += s.outros;
        acc[s.lojaId].total += s.substituicaoLigeiro + s.reparacao + s.calibragem + s.outros;
        return acc;
      }, {} as Record<number, any>);
      
      const lojas = Object.values(servicosPorLoja);
      
      // Calcular totais gerais
      const totais = lojas.reduce((acc, loja: any) => ({
        substituicaoLigeiro: acc.substituicaoLigeiro + loja.substituicaoLigeiro,
        reparacao: acc.reparacao + loja.reparacao,
        calibragem: acc.calibragem + loja.calibragem,
        outros: acc.outros + loja.outros,
        total: acc.total + loja.total,
      }), { substituicaoLigeiro: 0, reparacao: 0, calibragem: 0, outros: 0, total: 0 });
      
      // 1. Enviar relatório para o gestor do volante
      const gestor = await db.getUserById(volante.gestorId);
      if (gestor) {
        try {
          const pdfGestor = await gerarPDFRelatorioGestor({
            mesReferencia,
            volanteNome: volante.nome,
            gestorNome: gestor.name || 'Gestor',
            totais,
            servicosPorLoja: lojas,
          });
          
          await sendEmail({
            to: gestor.email || '',
            subject: `Relatório Mensal de Serviços - ${volante.nome} - ${formatarMes(mesReferencia)}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #047857;">Relatório Mensal de Serviços do Volante</h2>
                <p>Olá <strong>${gestor.name}</strong>,</p>
                <p>Segue o relatório mensal de serviços realizados pelo volante <strong>${volante.nome}</strong> durante o mês de <strong>${formatarMes(mesReferencia)}</strong>.</p>
                <h3>Resumo:</h3>
                <ul>
                  <li>Substituição Ligeiro: <strong>${totais.substituicaoLigeiro}</strong></li>
                  <li>Reparação: <strong>${totais.reparacao}</strong></li>
                  <li>Calibragem: <strong>${totais.calibragem}</strong></li>
                  <li>Outros: <strong>${totais.outros}</strong></li>
                  <li><strong>Total Geral: ${totais.total}</strong></li>
                </ul>
                <p><a href="${pdfGestor.url}" style="display: inline-block; padding: 12px 24px; background-color: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">Descarregar Relatório Completo (PDF)</a></p>
                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center;">
                  PoweringEG Platform 2.0 - a IA ao serviço da Expressglass
                </p>
              </div>
            `,
          });
          
          // Registar envio no histórico
          await db.registarEnvioRelatorioServico({
            mesReferencia,
            tipoRelatorio: 'gestor',
            destinatarioId: gestor.id,
            destinatarioEmail: gestor.email || '',
            destinatarioNome: gestor.name || '',
            volanteId: volante.id,
            volanteNome: volante.nome,
            pdfUrl: pdfGestor.url,
            status: 'enviado',
          });
          
          console.log(`[Relatórios Mensais] Relatório enviado para gestor: ${gestor.email}`);
        } catch (error) {
          console.error(`[Relatórios Mensais] Erro ao enviar para gestor ${gestor.email}:`, error);
        }
      }
      
      // 2. Enviar relatório para cada loja
      for (const loja of lojas) {
        try {
          const lojaData = await db.getLojaById(loja.lojaId);
          if (!lojaData || !lojaData.email) {
            console.log(`[Relatórios Mensais] Loja ${loja.lojaNome} sem email configurado`);
            continue;
          }
          
          const pdfLoja = await gerarPDFRelatorioLoja({
            mesReferencia,
            volanteNome: volante.nome,
            lojaNome: loja.lojaNome,
            totais: {
              substituicaoLigeiro: loja.substituicaoLigeiro,
              reparacao: loja.reparacao,
              calibragem: loja.calibragem,
              outros: loja.outros,
              total: loja.total,
            },
          });
          
          await sendEmail({
            to: lojaData.email,
            subject: `Relatório Mensal de Serviços - ${formatarMes(mesReferencia)}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #047857;">Relatório Mensal de Serviços</h2>
                <p>Olá <strong>${loja.lojaNome}</strong>,</p>
                <p>Segue o relatório mensal de serviços realizados pelo volante <strong>${volante.nome}</strong> na vossa loja durante o mês de <strong>${formatarMes(mesReferencia)}</strong>.</p>
                <h3>Resumo:</h3>
                <ul>
                  <li>Substituição Ligeiro: <strong>${loja.substituicaoLigeiro}</strong></li>
                  <li>Reparação: <strong>${loja.reparacao}</strong></li>
                  <li>Calibragem: <strong>${loja.calibragem}</strong></li>
                  <li>Outros: <strong>${loja.outros}</strong></li>
                  <li><strong>Total: ${loja.total}</strong></li>
                </ul>
                <p><a href="${pdfLoja.url}" style="display: inline-block; padding: 12px 24px; background-color: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">Descarregar Relatório (PDF)</a></p>
                <p>Agradecemos a vossa colaboração e apoio contínuo.</p>
                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center;">
                  PoweringEG Platform 2.0 - a IA ao serviço da Expressglass
                </p>
              </div>
            `,
          });
          
          // Registar envio no histórico
          await db.registarEnvioRelatorioServico({
            mesReferencia,
            tipoRelatorio: 'loja',
            destinatarioId: loja.lojaId,
            destinatarioEmail: lojaData.email || '',
            destinatarioNome: loja.lojaNome,
            volanteId: volante.id,
            volanteNome: volante.nome,
            pdfUrl: pdfLoja.url,
            status: 'enviado',
          });
          
          console.log(`[Relatórios Mensais] Relatório enviado para loja: ${lojaData.email}`);
        } catch (error) {
          console.error(`[Relatórios Mensais] Erro ao enviar para loja ${loja.lojaNome}:`, error);
        }
      }
    }
    
    console.log('[Relatórios Mensais] Envio de relatórios concluído');
  } catch (error) {
    console.error('[Relatórios Mensais] Erro ao enviar relatórios:', error);
  }
}

/**
 * Formatar mês de YYYY-MM para "Mês de YYYY"
 */
function formatarMes(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${meses[parseInt(mes) - 1]} de ${ano}`;
}
