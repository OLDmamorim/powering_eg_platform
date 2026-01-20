import { getDb } from './server/db';
import { gestorLojas, gestores, lojas, users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('DB not available');
    return;
  }
  
  const lojaId = 60005; // Póvoa de Varzim
  
  console.log(`\n=== GESTOR DA LOJA ${lojaId} (Póvoa de Varzim) ===`);
  
  const result = await db
    .select({
      gestorId: gestores.id,
      userId: gestores.userId,
      nome: users.name,
      email: users.email,
    })
    .from(gestorLojas)
    .innerJoin(gestores, eq(gestorLojas.gestorId, gestores.id))
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(gestorLojas.lojaId, lojaId));
  
  console.log(`Resultados encontrados: ${result.length}`);
  for (const r of result) {
    console.log(`  Gestor ID: ${r.gestorId}, User ID: ${r.userId}, Nome: ${r.nome}, Email: ${r.email}`);
  }
  
  // Verificar todas as associações da Póvoa
  console.log(`\n=== TODAS AS ASSOCIAÇÕES DA LOJA ${lojaId} ===`);
  const allAssoc = await db
    .select({
      gestorId: gestorLojas.gestorId,
      lojaId: gestorLojas.lojaId,
    })
    .from(gestorLojas)
    .where(eq(gestorLojas.lojaId, lojaId));
  
  console.log(`Associações: ${allAssoc.length}`);
  for (const a of allAssoc) {
    console.log(`  GestorId: ${a.gestorId}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
