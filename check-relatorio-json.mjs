import { getDb } from './server/db.ts';
import { relatoriosIA } from './drizzle/schema.ts';
import { desc } from 'drizzle-orm';

const db = await getDb();
const result = await db.select().from(relatoriosIA).orderBy(desc(relatoriosIA.id)).limit(3);

for (const r of result) {
  console.log(`\n=== Relatório ID: ${r.id} | Período: ${r.periodo} ===`);
  try {
    const json = JSON.parse(r.conteudo);
    console.log('Keys:', Object.keys(json));
    console.log('lojaMaisVisitada:', JSON.stringify(json.lojaMaisVisitada));
    console.log('lojaMenosVisitada:', JSON.stringify(json.lojaMenosVisitada));
    console.log('relatorios:', JSON.stringify(json.relatorios));
  } catch (e) {
    console.log('Erro ao parsear JSON:', e.message);
    console.log('Conteúdo (primeiros 300 chars):', r.conteudo.substring(0, 300));
  }
}
process.exit(0);
