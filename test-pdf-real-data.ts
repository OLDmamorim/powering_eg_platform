import { getDb } from './server/db';
import { relatoriosAnaliseLoja } from './drizzle/schema';
import { desc } from 'drizzle-orm';
import { gerarPDFAnaliseFichas } from './server/pdfAnaliseFichas';
import * as fs from 'fs';

async function main() {
  console.log('A obter relatório da base de dados...');
  const db = await getDb();
  const relatorios = await db.select().from(relatoriosAnaliseLoja).orderBy(desc(relatoriosAnaliseLoja.createdAt)).limit(1);
  
  if (relatorios.length === 0) {
    console.log('Nenhum relatório encontrado');
    process.exit(1);
  }
  
  const relatorio = relatorios[0];
  console.log(`Relatório encontrado: ${relatorio.nomeLoja} (#${relatorio.numeroLoja})`);
  console.log(`Total fichas: ${relatorio.totalFichas}`);
  console.log(`Fichas abertas +5 dias: ${relatorio.fichasAbertas5Dias}`);
  console.log(`Fichas sem notas: ${relatorio.fichasSemNotas}`);
  console.log(`Fichas sem email: ${relatorio.fichasSemEmailCliente}`);
  
  console.log('\nA gerar PDF...');
  const pdfBase64 = await gerarPDFAnaliseFichas({
    nomeLoja: relatorio.nomeLoja,
    numeroLoja: relatorio.numeroLoja,
    totalFichas: relatorio.totalFichas,
    fichasAbertas5Dias: relatorio.fichasAbertas5Dias,
    fichasAposAgendamento: relatorio.fichasAposAgendamento,
    fichasStatusAlerta: relatorio.fichasStatusAlerta,
    fichasSemNotas: relatorio.fichasSemNotas,
    fichasNotasAntigas: relatorio.fichasNotasAntigas,
    fichasDevolverVidro: relatorio.fichasDevolverVidro,
    fichasSemEmailCliente: relatorio.fichasSemEmailCliente,
    resumo: relatorio.resumo || '',
    conteudoRelatorio: relatorio.conteudoRelatorio,
  }, new Date());
  
  // Salvar o PDF
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  fs.writeFileSync('/tmp/test-pdf-real-data.pdf', pdfBuffer);
  console.log(`PDF salvo em /tmp/test-pdf-real-data.pdf (${pdfBuffer.length} bytes)`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
