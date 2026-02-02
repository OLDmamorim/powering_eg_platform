import { getDb } from "./server/db";
import { lojas, analisesFichasServico, relatoriosAnaliseLoja } from "./drizzle/schema";
import { eq, desc, isNull, isNotNull } from "drizzle-orm";

async function checkLojasAnalise() {
  const db = await getDb();
  
  // Obter última análise
  const ultimaAnalise = await db.select()
    .from(analisesFichasServico)
    .orderBy(desc(analisesFichasServico.createdAt))
    .limit(1);
  
  if (ultimaAnalise.length === 0) {
    console.log("Nenhuma análise encontrada");
    process.exit(0);
  }
  
  const analise = ultimaAnalise[0];
  console.log(`Análise: ${analise.nomeArquivo} (ID: ${analise.id})`);
  console.log(`Total de fichas: ${analise.totalFichas}`);
  console.log(`Total de lojas: ${analise.totalLojas}`);
  
  // Obter relatórios da análise
  const relatorios = await db.select({
    id: relatoriosAnaliseLoja.id,
    lojaId: relatoriosAnaliseLoja.lojaId,
    nomeLoja: relatoriosAnaliseLoja.nomeLoja,
    totalFichas: relatoriosAnaliseLoja.totalFichas
  })
  .from(relatoriosAnaliseLoja)
  .where(eq(relatoriosAnaliseLoja.analiseId, analise.id));
  
  console.log(`\nRelatórios na análise: ${relatorios.length}`);
  
  // Separar relatórios com e sem lojaId
  const comLojaId = relatorios.filter(r => r.lojaId !== null);
  const semLojaId = relatorios.filter(r => r.lojaId === null);
  
  console.log(`\nRelatórios COM lojaId associado: ${comLojaId.length}`);
  console.log(`Relatórios SEM lojaId associado: ${semLojaId.length}`);
  
  if (semLojaId.length > 0) {
    console.log("\nLojas SEM associação (nome no Excel):");
    semLojaId.forEach(r => console.log(`  - "${r.nomeLoja}" (${r.totalFichas} fichas)`));
  }
  
  // Obter todas as lojas do sistema
  const todasLojas = await db.select({
    id: lojas.id,
    nome: lojas.nome
  }).from(lojas);
  
  console.log(`\nTotal de lojas no sistema: ${todasLojas.length}`);
  
  // Verificar quais lojas do sistema não estão na análise
  const lojasNaAnalise = new Set(comLojaId.map(r => r.lojaId));
  const lojasFora = todasLojas.filter(l => !lojasNaAnalise.has(l.id));
  
  console.log(`\nLojas do sistema que NÃO estão na análise: ${lojasFora.length}`);
  lojasFora.forEach(l => console.log(`  - ${l.nome} (ID: ${l.id})`));
  
  process.exit(0);
}

checkLojasAnalise().catch(console.error);
