import { getDb } from './server/db';
import { gestorLojas, gestores, lojas, users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('DB not available');
    return;
  }
  
  // Buscar todos os gestores
  console.log('\n=== GESTORES ===');
  const allGestores = await db
    .select({
      gestorId: gestores.id,
      userId: gestores.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id));
  
  for (const g of allGestores) {
    console.log(`Gestor ID: ${g.gestorId}, User ID: ${g.userId}, Nome: ${g.userName}, Email: ${g.userEmail}, Role: ${g.userRole}`);
  }
  
  // Buscar todas as associações
  console.log('\n=== ASSOCIAÇÕES GESTOR-LOJA ===');
  const allAssociations = await db
    .select({
      gestorId: gestorLojas.gestorId,
      lojaId: gestorLojas.lojaId,
      lojaNome: lojas.nome
    })
    .from(gestorLojas)
    .innerJoin(lojas, eq(gestorLojas.lojaId, lojas.id));
  
  console.log(`Total de associações: ${allAssociations.length}`);
  
  // Agrupar por gestor
  const byGestor: Record<number, string[]> = {};
  for (const a of allAssociations) {
    if (!byGestor[a.gestorId]) byGestor[a.gestorId] = [];
    byGestor[a.gestorId].push(a.lojaNome);
  }
  
  for (const [gestorId, lojasList] of Object.entries(byGestor)) {
    const gestor = allGestores.find(g => g.gestorId === parseInt(gestorId));
    console.log(`\nGestor ${gestorId} (${gestor?.userName || 'N/A'}): ${lojasList.length} lojas`);
    console.log(`  Lojas: ${lojasList.join(', ')}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
