import { getDb } from './server/db';
import { gestorLojas, gestores, lojas, users } from './drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('DB not available');
    return;
  }
  
  // Encontrar lojas com múltiplas associações
  console.log('\n=== LOJAS COM MÚLTIPLAS ASSOCIAÇÕES ===');
  const duplicates = await db
    .select({
      lojaId: gestorLojas.lojaId,
      count: sql<number>`COUNT(*)`,
    })
    .from(gestorLojas)
    .groupBy(gestorLojas.lojaId)
    .having(sql`COUNT(*) > 1`);
  
  console.log(`Lojas com múltiplas associações: ${duplicates.length}`);
  
  for (const d of duplicates) {
    // Buscar detalhes de cada loja duplicada
    const details = await db
      .select({
        lojaId: gestorLojas.lojaId,
        lojaNome: lojas.nome,
        gestorId: gestorLojas.gestorId,
        userId: gestores.userId,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(gestorLojas)
      .innerJoin(lojas, eq(gestorLojas.lojaId, lojas.id))
      .innerJoin(gestores, eq(gestorLojas.gestorId, gestores.id))
      .innerJoin(users, eq(gestores.userId, users.id))
      .where(eq(gestorLojas.lojaId, d.lojaId));
    
    console.log(`\nLoja ${d.lojaId} (${details[0]?.lojaNome}): ${d.count} associações`);
    for (const det of details) {
      const isAdmin = det.userRole === 'admin' ? ' [ADMIN - REMOVER]' : ' [GESTOR - MANTER]';
      console.log(`  - Gestor ${det.gestorId}: ${det.userName} (${det.userEmail}) - Role: ${det.userRole}${isAdmin}`);
    }
  }
  
  // Identificar gestor 1380001 (admin duplicado)
  console.log('\n=== GESTOR 1380001 (ADMIN DUPLICADO) ===');
  const adminGestor = await db
    .select({
      lojaId: gestorLojas.lojaId,
      lojaNome: lojas.nome,
    })
    .from(gestorLojas)
    .innerJoin(lojas, eq(gestorLojas.lojaId, lojas.id))
    .where(eq(gestorLojas.gestorId, 1380001));
  
  console.log(`Lojas associadas ao gestor admin 1380001: ${adminGestor.length}`);
  for (const l of adminGestor) {
    console.log(`  - ${l.lojaId}: ${l.lojaNome}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
