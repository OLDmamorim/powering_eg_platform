import { sendEmail } from "./emailService";
import { gerarHTMLRelatorioMensalRecalibra, gerarHTMLRelatorioMensalRecalibraGestor } from "./emailService";

/**
 * Script de teste para enviar emails de exemplo dos relatórios mensais do Recalibra
 * Envia para o email do owner (Marco Amorim)
 */

// Dados de exemplo para email de unidade
const dadosExemploUnidade = {
  unidadeNome: "Recalibra Porto",
  mes: 1, // Janeiro
  ano: 2026,
  calibragens: [
    { data: "2026-01-28", marca: "BMW", matricula: "AB-12-CD", tipologiaViatura: "LIGEIRO", tipoCalibragem: "DINÂMICA", localidade: "Porto", lojaNome: "Barcelos" },
    { data: "2026-01-28", marca: "Mercedes", matricula: "EF-34-GH", tipologiaViatura: "LIGEIRO", tipoCalibragem: "ESTÁTICA", localidade: "Porto", lojaNome: "Braga" },
    { data: "2026-01-27", marca: "Audi", matricula: "IJ-56-KL", tipologiaViatura: "LIGEIRO", tipoCalibragem: "DINÂMICA", localidade: "Maia", lojaNome: "Barcelos" },
    { data: "2026-01-27", marca: "Volkswagen", matricula: "MN-78-OP", tipologiaViatura: "PESADO", tipoCalibragem: "CORE", localidade: "Matosinhos", lojaNome: undefined },
    { data: "2026-01-24", marca: "Peugeot", matricula: "QR-90-ST", tipologiaViatura: "LIGEIRO", tipoCalibragem: "DINÂMICA", localidade: "Porto", lojaNome: "Viana do Castelo" },
    { data: "2026-01-24", marca: "Renault", matricula: "UV-12-WX", tipologiaViatura: "LIGEIRO", tipoCalibragem: "ESTÁTICA", localidade: "Gaia", lojaNome: "Braga" },
    { data: "2026-01-23", marca: "Ford", matricula: "YZ-34-AB", tipologiaViatura: "PESADO", tipoCalibragem: "CORE", localidade: "Porto", lojaNome: undefined },
    { data: "2026-01-23", marca: "Opel", matricula: "CD-56-EF", tipologiaViatura: "LIGEIRO", tipoCalibragem: "DINÂMICA", localidade: "Maia", lojaNome: "Barcelos" },
    { data: "2026-01-21", marca: "Seat", matricula: "GH-78-IJ", tipologiaViatura: "LIGEIRO", tipoCalibragem: "ESTÁTICA", localidade: "Porto", lojaNome: "Braga" },
    { data: "2026-01-21", marca: "Skoda", matricula: "KL-90-MN", tipologiaViatura: "LIGEIRO", tipoCalibragem: "DINÂMICA", localidade: "Matosinhos", lojaNome: "Viana do Castelo" },
    { data: "2026-01-20", marca: "Volvo", matricula: "OP-12-QR", tipologiaViatura: "PESADO", tipoCalibragem: "CORE", localidade: "Porto", lojaNome: undefined },
    { data: "2026-01-20", marca: "Nissan", matricula: "ST-34-UV", tipologiaViatura: "LIGEIRO", tipoCalibragem: "DINÂMICA", localidade: "Gaia", lojaNome: "Barcelos" },
  ],
  totalDinamicas: 6,
  totalEstaticas: 3,
  totalCore: 3,
  totalLigeiros: 9,
  totalPesados: 3,
  totalGeral: 12,
  diasAtivos: 6,
};

// Dados de exemplo para email de gestor
const dadosExemploGestor = {
  gestorNome: "Marco Amorim",
  mes: 1, // Janeiro
  ano: 2026,
  unidades: [
    {
      unidadeNome: "Recalibra Porto",
      unidadeId: 1,
      totais: {
        dinamicas: 6,
        estaticas: 3,
        core: 3,
        ligeiros: 9,
        pesados: 3,
        geral: 12,
        diasAtivos: 6,
      },
    },
    {
      unidadeNome: "Recalibra Braga",
      unidadeId: 2,
      totais: {
        dinamicas: 8,
        estaticas: 4,
        core: 2,
        ligeiros: 11,
        pesados: 3,
        geral: 14,
        diasAtivos: 7,
      },
    },
    {
      unidadeNome: "Recalibra Viana",
      unidadeId: 3,
      totais: {
        dinamicas: 4,
        estaticas: 2,
        core: 1,
        ligeiros: 6,
        pesados: 1,
        geral: 7,
        diasAtivos: 5,
      },
    },
  ],
};

async function enviarEmailsTeste() {
  console.log("\n=== ENVIO DE EMAILS DE TESTE - RECALIBRA ===\n");
  
  const emailDestino = "mamorim@expressglass.pt";
  
  console.log(`Destinatário: ${emailDestino}\n`);
  
  // 1. Enviar email tipo "unidade"
  console.log("1️⃣  Gerando email tipo UNIDADE...");
  const htmlUnidade = gerarHTMLRelatorioMensalRecalibra(dadosExemploUnidade);
  
  const resultadoUnidade = await sendEmail({
    to: emailDestino,
    subject: "[TESTE] Relatório Mensal - Calibragens Recalibra Porto - Janeiro 2026",
    html: htmlUnidade,
  });
  
  if (resultadoUnidade) {
    console.log("✅ Email tipo UNIDADE enviado com sucesso!\n");
  } else {
    console.log("❌ Erro ao enviar email tipo UNIDADE\n");
  }
  
  // Aguardar 2 segundos entre emails
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. Enviar email tipo "gestor"
  console.log("2️⃣  Gerando email tipo GESTOR...");
  const htmlGestor = gerarHTMLRelatorioMensalRecalibraGestor(dadosExemploGestor);
  
  const resultadoGestor = await sendEmail({
    to: emailDestino,
    subject: "[TESTE] Relatório Mensal Consolidado - Calibragens Recalibra - Janeiro 2026",
    html: htmlGestor,
  });
  
  if (resultadoGestor) {
    console.log("✅ Email tipo GESTOR enviado com sucesso!\n");
  } else {
    console.log("❌ Erro ao enviar email tipo GESTOR\n");
  }
  
  console.log("=== ENVIO CONCLUÍDO ===\n");
  console.log(`Total de emails enviados: ${(resultadoUnidade ? 1 : 0) + (resultadoGestor ? 1 : 0)}/2\n`);
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
