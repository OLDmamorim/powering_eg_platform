import { getDb } from './server/db';
import { relatoriosAnaliseLoja } from './drizzle/schema';
import { desc } from 'drizzle-orm';
import * as fs from 'fs';

async function main() {
  const db = await getDb();
  const relatorio = await db.select().from(relatoriosAnaliseLoja).orderBy(desc(relatoriosAnaliseLoja.createdAt)).limit(1);
  if (relatorio.length > 0) {
    const html = relatorio[0].conteudoRelatorio || '';
    fs.writeFileSync('/tmp/relatorio-html.html', html);
    console.log('HTML salvo em /tmp/relatorio-html.html');
    console.log('Tamanho:', html.length);
    console.log('Primeiros 3000 caracteres:');
    console.log(html.substring(0, 3000));
  } else {
    console.log('Nenhum relatório encontrado');
  }
  process.exit(0);
}
main().catch(console.error);
