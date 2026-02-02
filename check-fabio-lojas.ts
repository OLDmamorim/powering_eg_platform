import { getDb } from "./server/db";
import { users, gestores, gestorLojas, lojas, analisesFichasServico, relatoriosAnaliseLoja } from "./drizzle/schema";
import { eq, like, or, sql, desc } from "drizzle-orm";

async function checkFabioLojas() {
  const db = await getDb();
  
  // Encontrar o Fábio Dias
  const fabioUsers = await db.select({
    userId: users.id,
    userName: users.name,
    gestorId: gestores.id
  })
  .from(users)
  .leftJoin(gestores, eq(gestores.userId, users.id))
  .where(or(
    like(users.name, '%Fabio%'),
    like(users.name, '%Fábio%')
  ));
  
  console.log("Utilizadores com nome Fabio/Fábio:", fabioUsers);
  
  // Para cada gestor, contar as lojas
  for (const user of fabioUsers) {
    if (user.gestorId) {
      const lojasDoGestor = await db.select({
        lojaId: gestorLojas.lojaId,
        lojaNome: lojas.nome
      })
      .from(gestorLojas)
      .leftJoin(lojas, eq(lojas.id, gestorLojas.lojaId))
      .where(eq(gestorLojas.gestorId, user.gestorId));
      
      console.log(`\nGestor ${user.userName} (ID: ${user.gestorId}) tem ${lojasDoGestor.length} lojas:`);
      lojasDoGestor.forEach(l => console.log(`  - ${l.lojaNome} (ID: ${l.lojaId})`));
    }
  }
  
  // Contar total de lojas no sistema
  const totalLojas = await db.select({ count: sql<number>`COUNT(*)` }).from(lojas);
  console.log(`\nTotal de lojas no sistema: ${totalLojas[0].count}`);
  
  // Contar lojas na última análise
  const ultimaAnalise = await db.select({
    id: analisesFichasServico.id,
    nomeArquivo: analisesFichasServico.nomeArquivo,
    createdAt: analisesFichasServico.createdAt
  })
  .from(analisesFichasServico)
  .orderBy(desc(analisesFichasServico.createdAt))
  .limit(1);
  
  if (ultimaAnalise.length > 0) {
    const analise = ultimaAnalise[0];
    console.log(`\nÚltima análise: ${analise.nomeArquivo} (ID: ${analise.id})`);
    
    // Contar lojas analisadas
    const lojasAnalisadas = await db.select({
      lojaId: relatoriosAnaliseLoja.lojaId,
      lojaNome: lojas.nome
    })
    .from(relatoriosAnaliseLoja)
    .leftJoin(lojas, eq(lojas.id, relatoriosAnaliseLoja.lojaId))
    .where(eq(relatoriosAnaliseLoja.analiseId, analise.id));
    
    console.log(`Lojas analisadas: ${lojasAnalisadas.length}`);
    
    // Listar lojas analisadas
    const nomesLojas = lojasAnalisadas.map(l => l.lojaNome).sort();
    console.log("Lojas na análise:", nomesLojas.join(", "));
  }
  
  process.exit(0);
}

checkFabioLojas().catch(console.error);
