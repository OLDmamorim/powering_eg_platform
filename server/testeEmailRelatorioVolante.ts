import { sendEmail } from "./emailService";
import { gerarHTMLRelatorioMensalVolante } from "./emailService";

/**
 * Script de teste para enviar emails de exemplo dos relatórios mensais do volante
 * Envia para o email do owner (Marco Amorim)
 */

// Dados de exemplo para email de loja
const dadosExemploLoja = {
  lojaNome: "Barcelos",
  volanteNome: "João Silva",
  mes: 1, // Janeiro
  ano: 2026,
  servicos: [
    { data: "2026-01-28", substituicaoLigeiro: 3, reparacao: 2, calibragem: 1, outros: 0 },
    { data: "2026-01-27", substituicaoLigeiro: 2, reparacao: 1, calibragem: 0, outros: 1 },
    { data: "2026-01-24", substituicaoLigeiro: 4, reparacao: 3, calibragem: 2, outros: 0 },
    { data: "2026-01-23", substituicaoLigeiro: 1, reparacao: 2, calibragem: 1, outros: 1 },
    { data: "2026-01-21", substituicaoLigeiro: 3, reparacao: 1, calibragem: 0, outros: 0 },
    { data: "2026-01-20", substituicaoLigeiro: 2, reparacao: 2, calibragem: 1, outros: 1 },
    { data: "2026-01-17", substituicaoLigeiro: 5, reparacao: 2, calibragem: 1, outros: 0 },
    { data: "2026-01-16", substituicaoLigeiro: 3, reparacao: 1, calibragem: 2, outros: 1 },
    { data: "2026-01-14", substituicaoLigeiro: 2, reparacao: 3, calibragem: 0, outros: 0 },
    { data: "2026-01-13", substituicaoLigeiro: 4, reparacao: 1, calibragem: 1, outros: 1 },
  ],
  totalSubstituicaoLigeiro: 29,
  totalReparacao: 18,
  totalCalibragem: 9,
  totalOutros: 5,
  totalGeral: 61,
  diasAtivos: 10,
};

// Dados de exemplo para email de gestor
const dadosExemploGestor = {
  gestorNome: "Marco Amorim",
  mes: 1, // Janeiro
  ano: 2026,
  lojas: [
    {
      lojaNome: "Barcelos",
      lojaId: 1,
      volanteNome: "João Silva",
      servicos: [],
      totais: {
        substituicaoLigeiro: 29,
        reparacao: 18,
        calibragem: 9,
        outros: 5,
        geral: 61,
        diasAtivos: 10,
      },
    },
    {
      lojaNome: "Braga",
      lojaId: 2,
      volanteNome: "João Silva",
      servicos: [],
      totais: {
        substituicaoLigeiro: 24,
        reparacao: 15,
        calibragem: 7,
        outros: 3,
        geral: 49,
        diasAtivos: 8,
      },
    },
    {
      lojaNome: "Viana do Castelo",
      lojaId: 3,
      volanteNome: "Pedro Costa",
      servicos: [],
      totais: {
        substituicaoLigeiro: 18,
        reparacao: 12,
        calibragem: 5,
        outros: 2,
        geral: 37,
        diasAtivos: 7,
      },
    },
  ],
};

/**
 * Função auxiliar para gerar HTML do relatório consolidado para gestor
 */
function gerarHTMLRelatorioMensalVolanteGestor(dados: typeof dadosExemploGestor): string {
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

async function enviarEmailsTeste() {
  console.log("\n=== ENVIO DE EMAILS DE TESTE ===\n");
  
  const emailDestino = "mamorim@expressglass.pt";
  
  console.log(`Destinatário: ${emailDestino}\n`);
  
  // 1. Enviar email tipo "loja"
  console.log("1️⃣  Gerando email tipo LOJA...");
  const htmlLoja = gerarHTMLRelatorioMensalVolante(dadosExemploLoja);
  
  const resultadoLoja = await sendEmail({
    to: emailDestino,
    subject: "[TESTE] Relatório Mensal - Atividade do Volante João Silva - Janeiro 2026",
    html: htmlLoja,
  });
  
  if (resultadoLoja) {
    console.log("✅ Email tipo LOJA enviado com sucesso!\n");
  } else {
    console.log("❌ Erro ao enviar email tipo LOJA\n");
  }
  
  // Aguardar 2 segundos entre emails
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. Enviar email tipo "gestor"
  console.log("2️⃣  Gerando email tipo GESTOR...");
  const htmlGestor = gerarHTMLRelatorioMensalVolanteGestor(dadosExemploGestor);
  
  const resultadoGestor = await sendEmail({
    to: emailDestino,
    subject: "[TESTE] Relatório Mensal Consolidado - Atividade dos Volantes - Janeiro 2026",
    html: htmlGestor,
  });
  
  if (resultadoGestor) {
    console.log("✅ Email tipo GESTOR enviado com sucesso!\n");
  } else {
    console.log("❌ Erro ao enviar email tipo GESTOR\n");
  }
  
  console.log("=== ENVIO CONCLUÍDO ===\n");
  console.log(`Total de emails enviados: ${(resultadoLoja ? 1 : 0) + (resultadoGestor ? 1 : 0)}/2\n`);
}

// Executar automaticamente
enviarEmailsTeste()
  .then(() => {
    console.log("Script concluído");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  });
