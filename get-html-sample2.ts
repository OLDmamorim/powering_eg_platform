import { getDb } from './server/db';
import { relatoriosAnaliseLoja } from './drizzle/schema';
import { desc } from 'drizzle-orm';
import * as fs from 'fs';

async function main() {
  const db = await getDb();
  
  const relatorios = await db.select()
    .from(relatoriosAnaliseLoja)
    .orderBy(desc(relatoriosAnaliseLoja.id))
    .limit(1);
  
  if (relatorios.length === 0) {
    console.log('Nenhum relatório encontrado');
    return;
  }
  
  const html = relatorios[0].conteudoRelatorio;
  
  // Procurar por tabela de status
  console.log('=== PROCURANDO TABELA DE STATUS ===');
  
  // Padrão 1: h3 com QUANTIDADE
  const match1 = html.match(/QUANTIDADE DE PROCESSOS/i);
  console.log('Padrão "QUANTIDADE DE PROCESSOS":', match1 ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
  
  // Padrão 2: StatusQuantidade
  const match2 = html.match(/StatusQuantidade/i);
  console.log('Padrão "StatusQuantidade":', match2 ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
  
  // Padrão 3: Procurar tabela com Status e Quantidade
  const match3 = html.match(/<table[\s\S]*?Status[\s\S]*?Quantidade[\s\S]*?<\/table>/i);
  console.log('Tabela com Status/Quantidade:', match3 ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
  
  // Salvar HTML para análise
  fs.writeFileSync('/tmp/relatorio-html-sample2.html', html);
  console.log('\nHTML salvo em /tmp/relatorio-html-sample2.html');
  
  // Mostrar últimos 2000 caracteres do HTML (onde a tabela de status normalmente está)
  console.log('\n=== ÚLTIMOS 2000 CARACTERES DO HTML ===');
  console.log(html.slice(-2000));
}

main().catch(console.error);
