import { getDb } from './server/db';
import { relatoriosAnaliseLoja } from './drizzle/schema';
import { desc, like } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  
  // Obter relatório de Paços de Ferreira
  const relatorios = await db.select()
    .from(relatoriosAnaliseLoja)
    .where(like(relatoriosAnaliseLoja.nomeLoja, '%Pa%os%'))
    .orderBy(desc(relatoriosAnaliseLoja.id))
    .limit(1);
  
  if (relatorios.length === 0) {
    console.log('Nenhum relatório encontrado para Paços de Ferreira');
    return;
  }
  
  const relatorio = relatorios[0];
  console.log('Relatório encontrado:', relatorio.nomeLoja);
  console.log('statusCount do banco:', relatorio.statusCount);
  
  // Testar extração do HTML
  const html = relatorio.conteudoRelatorio || '';
  
  // Procurar por tabela de status no HTML
  const statusTableMatch = html.match(/QUANTIDADE DE PROCESSOS[^<]*<\/h3>[\s\S]*?<table[\s\S]*?<\/table>/i);
  if (statusTableMatch) {
    console.log('\n=== TABELA DE STATUS ENCONTRADA ===');
    console.log(statusTableMatch[0].substring(0, 500));
  } else {
    console.log('\n=== TABELA DE STATUS NÃO ENCONTRADA ===');
  }
  
  // Verificar se há dados de status no HTML
  console.log('\n=== PADRÕES DE STATUS ENCONTRADOS ===');
  const statusPatterns = ['AUTORIZADO', 'RECUSADO', 'Consulta', 'Pedido', 'ORÇAMENTO'];
  for (const pattern of statusPatterns) {
    const regex = new RegExp(pattern, 'gi');
    const matches = html.match(regex);
    console.log(`${pattern}: ${matches ? matches.length : 0} ocorrências`);
  }
}

main().catch(console.error);
