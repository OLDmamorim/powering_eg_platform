import { getDb } from './server/db';
import { relatoriosAnaliseLoja } from './drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const relatorios = await db.select().from(relatoriosAnaliseLoja).orderBy(desc(relatoriosAnaliseLoja.createdAt)).limit(1);
  
  if (relatorios.length === 0) {
    console.log('Nenhum relatório encontrado');
    return;
  }
  
  const html = relatorios[0].conteudoRelatorio;
  
  console.log('=== TESTANDO EXTRAÇÃO DE STATUS ===');
  
  // Método 1: Procurar tabela de status explícita
  const tabelaMatch = html.match(/<h3[^>]*>QUANTIDADE DE PROCESSOS[^<]*<\/h3>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
  
  const statusCount: Record<string, number> = {};
  
  if (tabelaMatch) {
    console.log('Tabela encontrada!');
    const tabelaHTML = tabelaMatch[1];
    const trMatches = tabelaHTML.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    
    if (trMatches) {
      console.log('Número de linhas: ' + trMatches.length);
      
      for (const tr of trMatches) {
        // Ignorar linha de cabeçalho
        if (tr.includes('<th')) {
          console.log('Ignorando linha de cabeçalho');
          continue;
        }
        
        // Extrair conteúdo das células td
        const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (tdMatches && tdMatches.length >= 2) {
          // Remover tags HTML e extrair texto
          const status = tdMatches[0].replace(/<[^>]+>/g, '').trim();
          const quantidadeStr = tdMatches[1].replace(/<[^>]+>/g, '').trim();
          const quantidade = parseInt(quantidadeStr, 10);
          
          console.log('Status: "' + status + '", Quantidade: ' + quantidade);
          
          if (status && !isNaN(quantidade) && quantidade > 0) {
            statusCount[status] = quantidade;
          }
        }
      }
    }
  } else {
    console.log('Tabela NÃO encontrada!');
  }
  
  console.log('=== STATUS COUNT FINAL ===');
  console.log(statusCount);
  console.log('Número de entradas: ' + Object.keys(statusCount).length);
  
  process.exit(0);
}

main().catch(console.error);
