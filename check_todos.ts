import { getDb } from './server/db';
import { todos, lojas, gestorLojas, gestores, users } from './drizzle/schema';
import { eq, and, inArray, or, isNull, desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('DB not available');
    return;
  }
  
  // Buscar a loja Póvoa de Varzim
  console.log('\n=== LOJA PÓVOA DE VARZIM ===');
  const povoaResult = await db
    .select()
    .from(lojas)
    .where(eq(lojas.nome, 'Póvoa de Varzim'));
  
  if (povoaResult.length === 0) {
    console.log('Loja Póvoa de Varzim não encontrada');
    return;
  }
  
  const povoa = povoaResult[0];
  console.log(`ID: ${povoa.id}, Nome: ${povoa.nome}`);
  
  // Buscar tarefas criadas pela Póvoa de Varzim
  console.log('\n=== TAREFAS CRIADAS PELA PÓVOA DE VARZIM ===');
  const tarefasPovoa = await db
    .select({
      id: todos.id,
      titulo: todos.titulo,
      criadoPorLojaId: todos.criadoPorLojaId,
      atribuidoLojaId: todos.atribuidoLojaId,
      atribuidoUserId: todos.atribuidoUserId,
      estado: todos.estado,
      isInterna: todos.isInterna,
      createdAt: todos.createdAt,
    })
    .from(todos)
    .where(eq(todos.criadoPorLojaId, povoa.id))
    .orderBy(desc(todos.createdAt))
    .limit(10);
  
  console.log(`Total de tarefas criadas pela Póvoa: ${tarefasPovoa.length}`);
  for (const t of tarefasPovoa) {
    console.log(`  ID: ${t.id}, Título: ${t.titulo?.substring(0, 50)}, Estado: ${t.estado}, Interna: ${t.isInterna}, AtribuidoUserId: ${t.atribuidoUserId}, AtribuidoLojaId: ${t.atribuidoLojaId}`);
  }
  
  // Buscar o gestor Marco Amorim (mamorim@expressglass.pt)
  console.log('\n=== GESTOR MARCO AMORIM ===');
  const gestorResult = await db
    .select({
      gestorId: gestores.id,
      userId: gestores.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(users.email, 'mamorim@expressglass.pt'));
  
  if (gestorResult.length === 0) {
    console.log('Gestor Marco Amorim não encontrado');
    return;
  }
  
  const gestor = gestorResult[0];
  console.log(`Gestor ID: ${gestor.gestorId}, User ID: ${gestor.userId}, Nome: ${gestor.userName}, Email: ${gestor.userEmail}`);
  
  // Buscar lojas do gestor
  console.log('\n=== LOJAS DO GESTOR ===');
  const lojasGestor = await db
    .select({ lojaId: gestorLojas.lojaId, lojaNome: lojas.nome })
    .from(gestorLojas)
    .innerJoin(lojas, eq(gestorLojas.lojaId, lojas.id))
    .where(eq(gestorLojas.gestorId, gestor.gestorId));
  
  const lojasIds = lojasGestor.map(l => l.lojaId);
  console.log(`Lojas do gestor (${lojasGestor.length}): ${lojasGestor.map(l => l.lojaNome).join(', ')}`);
  console.log(`IDs das lojas: ${lojasIds.join(', ')}`);
  
  // Verificar se a Póvoa está nas lojas do gestor
  console.log(`\nPóvoa de Varzim (ID ${povoa.id}) está nas lojas do gestor? ${lojasIds.includes(povoa.id)}`);
  
  // Simular a lógica de paraMim
  console.log('\n=== SIMULAÇÃO DE paraMim ===');
  for (const t of tarefasPovoa) {
    let paraMim = false;
    
    // 1. Atribuído diretamente ao user
    if (t.atribuidoUserId === gestor.userId) {
      paraMim = true;
      console.log(`  Tarefa ${t.id}: paraMim=true (atribuída diretamente ao user)`);
    }
    // 2. Atribuído a uma das lojas do gestor E criado por uma loja
    else if (t.atribuidoLojaId && lojasIds.includes(t.atribuidoLojaId) && t.criadoPorLojaId !== null) {
      paraMim = true;
      console.log(`  Tarefa ${t.id}: paraMim=true (atribuída a loja do gestor e criada por loja)`);
    }
    // 3. Criado por uma das lojas do gestor
    else if (t.criadoPorLojaId && lojasIds.includes(t.criadoPorLojaId)) {
      paraMim = true;
      console.log(`  Tarefa ${t.id}: paraMim=true (criada por loja do gestor)`);
    }
    else {
      console.log(`  Tarefa ${t.id}: paraMim=false`);
      console.log(`    - atribuidoUserId: ${t.atribuidoUserId} (gestor.userId: ${gestor.userId})`);
      console.log(`    - atribuidoLojaId: ${t.atribuidoLojaId} (em lojasIds: ${t.atribuidoLojaId ? lojasIds.includes(t.atribuidoLojaId) : 'N/A'})`);
      console.log(`    - criadoPorLojaId: ${t.criadoPorLojaId} (em lojasIds: ${t.criadoPorLojaId ? lojasIds.includes(t.criadoPorLojaId) : 'N/A'})`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
