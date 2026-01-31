import { getDb } from './server/db';
import { relatoriosAnaliseLoja } from './drizzle/schema';
import { desc } from 'drizzle-orm';
import * as fs from 'fs';

async function main() {
  const db = await getDb();
  const relatorios = await db.select().from(relatoriosAnaliseLoja).orderBy(desc(relatoriosAnaliseLoja.createdAt)).limit(1);
  
  if (relatorios.length === 0) {
    console.log('Nenhum relatório encontrado');
    return;
  }
  
  const html = relatorios[0].conteudoRelatorio;
  
  // Salvar HTML para análise
  fs.writeFileSync('/tmp/relatorio-html-full.html', html);
  console.log('HTML salvo em /tmp/relatorio-html-full.html');
  
  // Procurar a tabela de status
  console.log('=== PROCURANDO TABELA DE STATUS ===');
  
  // Procurar por "QUANTIDADE DE PROCESSOS"
  const tabelaMatch = html.match(/<h3[^>]*>QUANTIDADE DE PROCESSOS[^<]*<\/h3>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
  
  if (tabelaMatch) {
    console.log('Tabela encontrada!');
    console.log('Conteúdo da tabela:');
    console.log(tabelaMatch[1].substring(0, 1000));
    
    // Extrair linhas da tabela
    const trMatches = tabelaMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (trMatches) {
      console.log('Número de linhas: ' + trMatches.length);
      for (let i = 0; i < Math.min(5, trMatches.length); i++) {
        console.log('Linha ' + i + ': ' + trMatches[i].substring(0, 200));
      }
    }
  } else {
    console.log('Tabela NÃO encontrada!');
    
    // Mostrar contexto onde "QUANTIDADE" aparece
    const idx = html.indexOf('QUANTIDADE');
    if (idx >= 0) {
      console.log('Contexto onde QUANTIDADE aparece:');
      console.log(html.substring(idx, idx + 500));
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
