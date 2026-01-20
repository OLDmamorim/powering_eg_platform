import { getDb } from './server/db';
import { todos, lojas, gestorLojas, gestores, users } from './drizzle/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('DB not available');
    return;
  }
  
  // Encontrar tarefas criadas por lojas mas atribuídas ao admin (userId=1)
  console.log('\n=== TAREFAS CRIADAS POR LOJAS ATRIBUÍDAS AO ADMIN ===');
  const wrongTasks = await db
    .select({
      id: todos.id,
      titulo: todos.titulo,
      criadoPorLojaId: todos.criadoPorLojaId,
      atribuidoUserId: todos.atribuidoUserId,
      estado: todos.estado,
      lojaNome: lojas.nome,
    })
    .from(todos)
    .leftJoin(lojas, eq(todos.criadoPorLojaId, lojas.id))
    .where(and(
      isNotNull(todos.criadoPorLojaId),
      eq(todos.atribuidoUserId, 1)
    ));
  
  console.log(`Tarefas com atribuição errada: ${wrongTasks.length}`);
  
  for (const t of wrongTasks) {
    // Encontrar o gestor correto da loja
    const gestorCorreto = await db
      .select({
        userId: gestores.userId,
        nome: users.name,
        email: users.email,
      })
      .from(gestorLojas)
      .innerJoin(gestores, eq(gestorLojas.gestorId, gestores.id))
      .innerJoin(users, eq(gestores.userId, users.id))
      .where(eq(gestorLojas.lojaId, t.criadoPorLojaId!))
      .limit(1);
    
    console.log(`\nTarefa ${t.id}: "${t.titulo?.substring(0, 40)}..."`);
    console.log(`  Loja: ${t.lojaNome} (ID: ${t.criadoPorLojaId})`);
    console.log(`  Atribuído a: User ID ${t.atribuidoUserId} (ADMIN - ERRADO)`);
    if (gestorCorreto[0]) {
      console.log(`  Gestor correto: User ID ${gestorCorreto[0].userId} (${gestorCorreto[0].nome} - ${gestorCorreto[0].email})`);
    } else {
      console.log(`  Gestor correto: NÃO ENCONTRADO`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
