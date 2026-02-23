import { db } from './server/db.ts';
import { relatoriosIA } from './drizzle/schema.ts';
import { desc } from 'drizzle-orm';

const result = await db.select().from(relatoriosIA).orderBy(desc(relatoriosIA.createdAt)).limit(1);
if (result.length > 0) {
  const json = JSON.parse(result[0].conteudo);
  console.log('=== Relatório ID:', result[0].id, '===');
  console.log('Período:', result[0].periodo);
  console.log('lojaMaisVisitada:', JSON.stringify(json.lojaMaisVisitada));
  console.log('lojaMenosVisitada:', JSON.stringify(json.lojaMenosVisitada));
  console.log('relatorios:', JSON.stringify(json.relatorios));
  console.log('Keys:', Object.keys(json));
} else {
  console.log('Nenhum relatório encontrado');
}
process.exit(0);
