import { getDb } from './server/_core/db';
import { todos, lojas, gestorLojas } from './drizzle/schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('Erro ao conectar à BD');
    return;
  }
  
  // Obter lojas do gestor 30001
  const lojasGestor = await db
    .select({ lojaId: gestorLojas.lojaId })
    .from(gestorLojas)
    .where(eq(gestorLojas.gestorId, 30001));
  
  const lojasIds = lojasGestor.map(l => l.lojaId);
  console.log('Lojas do gestor:', lojasIds.length);
  
  // Contar tarefas por estado
  const result = await db.execute(sql`
    SELECT 
      estado, 
      COUNT(*) as total,
      SUM(CASE WHEN isInterna = 1 THEN 1 ELSE 0 END) as internas,
      SUM(CASE WHEN isInterna = 0 OR isInterna IS NULL THEN 1 ELSE 0 END) as nao_internas
    FROM todos 
    WHERE atribuidoUserId = 420030 
       OR criadoPorLojaId IN (${sql.raw(lojasIds.join(','))})
    GROUP BY estado
  `);
  
  console.log('\n=== Tarefas por estado ===');
  console.log(result.rows);
  
  // Listar tarefas pendentes
  const pendentes = await db.execute(sql`
    SELECT t.id, t.titulo, t.estado, t.isInterna, t.atribuidoUserId, t.criadoPorLojaId, l.nome as lojaNome
    FROM todos t
    LEFT JOIN lojas l ON t.criadoPorLojaId = l.id
    WHERE t.estado = 'pendente'
      AND (t.atribuidoUserId = 420030 OR t.criadoPorLojaId IN (${sql.raw(lojasIds.join(','))}))
    ORDER BY t.createdAt DESC
  `);
  
  console.log('\n=== Tarefas Pendentes ===');
  for (const t of pendentes.rows as any[]) {
    console.log(`ID: ${t.id}, Título: ${t.titulo}, Interna: ${t.isInterna}, Loja: ${t.lojaNome}`);
  }
  
  // Contar tarefas "paraMim" (não internas, criadas pelas lojas do gestor)
  const paraMim = await db.execute(sql`
    SELECT COUNT(*) as total
    FROM todos 
    WHERE (isInterna = 0 OR isInterna IS NULL)
      AND criadoPorLojaId IN (${sql.raw(lojasIds.join(','))})
      AND estado IN ('pendente', 'em_progresso')
  `);
  
  console.log('\n=== Tarefas "Para Mim" (não internas, das minhas lojas, pendentes/em_progresso) ===');
  console.log(paraMim.rows);
  
  process.exit(0);
}

main();
