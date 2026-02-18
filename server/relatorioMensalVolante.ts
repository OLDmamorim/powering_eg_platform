import * as db from "./db";
import { sendEmail, gerarHTMLRelatorioMensalVolante } from "./emailService";

/**
 * Envia relatórios mensais de atividade do volante
 * - Para lojas: resumo individual de serviços realizados naquela loja
 * - Para gestores: resumo consolidado de todas as lojas da zona
 * Executa automaticamente no dia 20 de cada mês
 */
export async function enviarRelatoriosMensaisVolante() {
  console.log('[Relatório Mensal Volante] Iniciando envio de relatórios...');
  
  try {
    // Calcular mês anterior (o relatório do dia 20 refere-se ao mês anterior)
    const hoje = new Date();
    const mesAnterior = hoje.getMonth(); // 0-11 (Janeiro = 0)
    const anoAnterior = mesAnterior === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    const mesRelatorio = mesAnterior === 0 ? 12 : mesAnterior;
    
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = mesesNomes[mesRelatorio - 1];
    
    // Obter todos os volantes ativos
    const volantes = await db.getAllVolantes();
    
    if (!volantes || volantes.length === 0) {
      console.log('[Relatório Mensal Volante] Nenhum volante encontrado');
      return;
    }
    
    let emailsEnviadosLojas = 0;
    let emailsEnviadosGestores = 0;
    let erros = 0;
    
    // Mapa para agrupar serviços por gestor
    const servicosPorGestor = new Map<number, Array<{
      lojaNome: string;
      lojaId: number;
      volanteNome: string;
      servicos: any[];
      totais: {
        substituicaoLigeiro: number;
        reparacao: number;
        calibragem: number;
        outros: number;
        geral: number;
        diasAtivos: number;
      };
    }>>();
    
    // Para cada volante, processar suas lojas
    for (const volante of volantes) {
      try {
        // Obter serviços do volante no mês anterior
        const servicos = await db.getServicosVolantePorMes(volante.id, mesRelatorio, anoAnterior);
        
        if (!servicos || servicos.length === 0) {
          console.log(`[Relatório Mensal Volante] Volante ${volante.nome} não tem serviços em ${mesRelatorio}/${anoAnterior}`);
          continue;
        }
        
        // Agrupar serviços por loja
        const servicosPorLoja = new Map<number | null, typeof servicos>();
        servicos.forEach(s => {
          const lojaId = s.lojaId;
          if (!servicosPorLoja.has(lojaId)) {
            servicosPorLoja.set(lojaId, []);
          }
          servicosPorLoja.get(lojaId)!.push(s);
        });
        
        // Para cada loja, gerar e enviar relatório
        for (const [lojaId, servicosLoja] of servicosPorLoja.entries()) {
          try {
            // Ignorar "Outros (Loja externa)" - lojaId null
            if (lojaId === null) {
              console.log(`[Relatório Mensal Volante] Ignorando "Outros (Loja externa)" para volante ${volante.nome}`);
              continue;
            }
            
            // Obter dados da loja
            const loja = await db.getLojaById(lojaId);
            if (!loja) {
              console.log(`[Relatório Mensal Volante] Loja ${lojaId} não encontrada`);
              continue;
            }
            
            // Calcular totais
            const totalSubstituicaoLigeiro = servicosLoja.reduce((acc, s) => acc + (s.substituicaoLigeiro || 0), 0);
            const totalReparacao = servicosLoja.reduce((acc, s) => acc + (s.reparacao || 0), 0);
            const totalCalibragem = servicosLoja.reduce((acc, s) => acc + (s.calibragem || 0), 0);
            const totalOutros = servicosLoja.reduce((acc, s) => acc + (s.outros || 0), 0);
            const totalGeral = totalSubstituicaoLigeiro + totalReparacao + totalCalibragem + totalOutros;
            const diasAtivos = servicosLoja.length;
            
            // Gerar HTML do relatório
            const htmlRelatorio = gerarHTMLRelatorioMensalVolante({
              lojaNome: loja.nome,
              volanteNome: volante.nome,
              mes: mesRelatorio,
              ano: anoAnterior,
              servicos: servicosLoja.map(s => ({
                data: s.data,
                substituicaoLigeiro: s.substituicaoLigeiro || 0,
                reparacao: s.reparacao || 0,
                calibragem: s.calibragem || 0,
                outros: s.outros || 0,
              })),
              totalSubstituicaoLigeiro,
              totalReparacao,
              totalCalibragem,
              totalOutros,
              totalGeral,
              diasAtivos,
            });
            
            // Enviar email para a loja (se tiver email)
            if (loja.email) {
              const enviado = await sendEmail({
                to: loja.email,
                subject: `Relatório Mensal - Atividade do Volante ${volante.nome} - ${mesNome} ${anoAnterior}`,
                html: htmlRelatorio,
              });
              
              if (enviado) {
                console.log(`[Relatório Mensal Volante] Email enviado para loja ${loja.nome} (${loja.email})`);
                emailsEnviadosLojas++;
              } else {
                console.error(`[Relatório Mensal Volante] Erro ao enviar email para loja ${loja.nome}`);
                erros++;
              }
              
              // Aguardar 1 segundo entre emails
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Obter gestores da loja para agrupar dados
            const gestoresLoja = await db.getGestoresByLojaId(lojaId);
            for (const gestor of gestoresLoja) {
              if (!servicosPorGestor.has(gestor.id)) {
                servicosPorGestor.set(gestor.id, []);
              }
              
              servicosPorGestor.get(gestor.id)!.push({
                lojaNome: loja.nome,
                lojaId: loja.id,
                volanteNome: volante.nome,
                servicos: servicosLoja,
                totais: {
                  substituicaoLigeiro: totalSubstituicaoLigeiro,
                  reparacao: totalReparacao,
                  calibragem: totalCalibragem,
                  outros: totalOutros,
                  geral: totalGeral,
                  diasAtivos,
                },
              });
            }
            
          } catch (error) {
            console.error(`[Relatório Mensal Volante] Erro ao processar loja ${lojaId}:`, error);
            erros++;
          }
        }
        
      } catch (error) {
        console.error(`[Relatório Mensal Volante] Erro ao processar volante ${volante.nome}:`, error);
        erros++;
      }
    }
    
    // Enviar relatórios consolidados para gestores
    for (const [gestorId, dadosLojas] of servicosPorGestor.entries()) {
      try {
        const gestor = await db.getGestorById(gestorId);
        if (!gestor || !gestor.user?.email) {
          console.log(`[Relatório Mensal Volante] Gestor ${gestorId} não encontrado ou sem email`);
          continue;
        }
        
        // Gerar HTML do relatório consolidado para gestor
        const htmlGestor = gerarHTMLRelatorioMensalVolanteGestor({
          gestorNome: gestor.user.name || 'Gestor',
          mes: mesRelatorio,
          ano: anoAnterior,
          lojas: dadosLojas,
        });
        
        const enviado = await sendEmail({
          to: gestor.user.email,
          subject: `Relatório Mensal Consolidado - Atividade dos Volantes - ${mesNome} ${anoAnterior}`,
          html: htmlGestor,
        });
        
        if (enviado) {
          console.log(`[Relatório Mensal Volante] Email consolidado enviado para gestor ${gestor.user.name} (${gestor.user.email})`);
          emailsEnviadosGestores++;
        } else {
          console.error(`[Relatório Mensal Volante] Erro ao enviar email para gestor ${gestor.user.name}`);
          erros++;
        }
        
        // Aguardar 1 segundo entre emails
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Relatório Mensal Volante] Erro ao processar gestor ${gestorId}:`, error);
        erros++;
      }
    }
    
    console.log(`[Relatório Mensal Volante] Processo concluído:`);
    console.log(`  - Emails para lojas: ${emailsEnviadosLojas}`);
    console.log(`  - Emails para gestores: ${emailsEnviadosGestores}`);
    console.log(`  - Erros: ${erros}`);
    
    // Guardar log do envio no histórico
    try {
      await db.criarHistoricoEnvioRelatorio({
        tipo: 'volante',
        mesReferencia: mesRelatorio,
        anoReferencia: anoAnterior,
        dataEnvio: new Date(),
        emailsEnviadosUnidades: emailsEnviadosLojas,
        emailsEnviadosGestores: emailsEnviadosGestores,
        emailsErro: erros,
        detalhes: {
          mesNome,
          totalVolantes: volantes.length,
        },
      });
      console.log('[Relatório Mensal Volante] Histórico de envio registado com sucesso');
    } catch (error) {
      console.error('[Relatório Mensal Volante] Erro ao registar histórico:', error);
    }
    
  } catch (error) {
    console.error('[Relatório Mensal Volante] Erro geral:', error);
  }
}

/**
 * Gera HTML do relatório consolidado para gestor
 */
function gerarHTMLRelatorioMensalVolanteGestor(dados: {
  gestorNome: string;
  mes: number;
  ano: number;
  lojas: Array<{
    lojaNome: string;
    lojaId: number;
    volanteNome: string;
    servicos: any[];
    totais: {
      substituicaoLigeiro: number;
      reparacao: number;
      calibragem: number;
      outros: number;
      geral: number;
      diasAtivos: number;
    };
  }>;
}): string {
  const { gestorNome, mes, ano, lojas } = dados;
  
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = mesesNomes[mes - 1];
  
  // Calcular totais gerais
  const totaisGerais = lojas.reduce((acc, loja) => ({
    substituicaoLigeiro: acc.substituicaoLigeiro + loja.totais.substituicaoLigeiro,
    reparacao: acc.reparacao + loja.totais.reparacao,
    calibragem: acc.calibragem + loja.totais.calibragem,
    outros: acc.outros + loja.totais.outros,
    geral: acc.geral + loja.totais.geral,
  }), { substituicaoLigeiro: 0, reparacao: 0, calibragem: 0, outros: 0, geral: 0 });
  
  // Ordenar lojas por total de serviços (maior primeiro)
  const lojasOrdenadas = [...lojas].sort((a, b) => b.totais.geral - a.totais.geral);
  
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #10b981; }
    .title { font-size: 20px; margin-top: 10px; color: #059669; }
    .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 120px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #10b981; }
    .summary-card.highlight { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left-color: #059669; }
    .summary-number { font-size: 32px; font-weight: bold; color: #059669; margin-bottom: 5px; }
    .summary-label { font-size: 13px; color: #6b7280; text-transform: uppercase; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: bold; color: #059669; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .table th { background: #10b981; color: white; padding: 12px; text-align: left; font-weight: bold; font-size: 14px; }
    .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .table tr:last-child td { border-bottom: none; }
    .table tr:hover { background: #f9fafb; }
    .total-row { background: #d1fae5 !important; font-weight: bold; }
    .loja-nome { font-weight: bold; color: #059669; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663088836799/YrkmGCRDVqYgFnZO.png" alt="ExpressGlass" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
    <div class="logo">PoweringEG Platform 2.0</div>
    <div class="title">Relatório Mensal Consolidado - Atividade dos Volantes</div>
    <div class="subtitle">Resumo por Zona</div>
  </div>
  
  <div class="info-box">
    <div class="info-row"><span class="info-label">Gestor:</span> ${gestorNome}</div>
    <div class="info-row"><span class="info-label">Período:</span> ${mesNome} de ${ano}</div>
    <div class="info-row"><span class="info-label">Lojas com Atividade:</span> ${lojas.length} ${lojas.length === 1 ? 'loja' : 'lojas'}</div>
  </div>

  <div class="section">
    <div class="section-title">📊 Resumo Total da Zona</div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.substituicaoLigeiro}</div>
        <div class="summary-label">Substituições Ligeiro</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.reparacao}</div>
        <div class="summary-label">Reparações</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.calibragem}</div>
        <div class="summary-label">Calibragens</div>
      </div>
      <div class="summary-card">
        <div class="summary-number">${totaisGerais.outros}</div>
        <div class="summary-label">Outros Serviços</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-number">${totaisGerais.geral}</div>
        <div class="summary-label">Total Geral</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🏪 Detalhes por Loja</div>
    <table class="table">
      <thead>
        <tr>
          <th>Loja</th>
          <th>Volante</th>
          <th style="text-align: center;">Dias Ativos</th>
          <th style="text-align: center;">Subst. Ligeiro</th>
          <th style="text-align: center;">Reparações</th>
          <th style="text-align: center;">Calibragens</th>
          <th style="text-align: center;">Outros</th>
          <th style="text-align: center;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lojasOrdenadas.map(loja => `
        <tr>
          <td class="loja-nome">${loja.lojaNome}</td>
          <td>${loja.volanteNome}</td>
          <td style="text-align: center;">${loja.totais.diasAtivos}</td>
          <td style="text-align: center;">${loja.totais.substituicaoLigeiro}</td>
          <td style="text-align: center;">${loja.totais.reparacao}</td>
          <td style="text-align: center;">${loja.totais.calibragem}</td>
          <td style="text-align: center;">${loja.totais.outros}</td>
          <td style="text-align: center;"><strong>${loja.totais.geral}</strong></td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2"><strong>TOTAL ZONA</strong></td>
          <td style="text-align: center;"><strong>-</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.substituicaoLigeiro}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.reparacao}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.calibragem}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.outros}</strong></td>
          <td style="text-align: center;"><strong>${totaisGerais.geral}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

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
