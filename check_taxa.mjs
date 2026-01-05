import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, and, inArray, sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Verificar valores de taxa de reparação para dezembro 2025
const result = await db.execute(sql`
  SELECT lojaId, taxaReparacao, totalServicos, objetivoMensal, desvioPercentualMes
  FROM resultados_mensais 
  WHERE mes = 12 AND ano = 2025
  LIMIT 20
`);

console.log('Dados de dezembro 2025:');
console.log(result[0]);

// Calcular média da taxa de reparação
const avgResult = await db.execute(sql`
  SELECT 
    AVG(taxaReparacao) as mediaTaxa,
    COUNT(*) as totalLojas
  FROM resultados_mensais 
  WHERE mes = 12 AND ano = 2025
`);

console.log('\nMédia da taxa de reparação:');
console.log(avgResult[0]);

// Verificar se há lojas do gestor Marco Amorim (preciso do gestorId dele)
const gestorResult = await db.execute(sql`
  SELECT g.id as gestorId, u.name, u.email
  FROM gestores g
  JOIN users u ON g.userId = u.id
  WHERE u.email LIKE '%mamorim%' OR u.name LIKE '%Marco%'
`);

console.log('\nGestor Marco Amorim:');
console.log(gestorResult[0]);

if (gestorResult[0] && gestorResult[0].length > 0) {
  const gestorId = gestorResult[0][0].gestorId;
  
  // Buscar lojas do gestor
  const lojasGestor = await db.execute(sql`
    SELECT gl.lojaId, l.nome
    FROM gestor_lojas gl
    JOIN lojas l ON gl.lojaId = l.id
    WHERE gl.gestorId = ${gestorId}
  `);
  
  console.log('\nLojas do gestor:');
  console.log(lojasGestor[0]);
  
  // Calcular média da taxa de reparação apenas para as lojas do gestor
  if (lojasGestor[0] && lojasGestor[0].length > 0) {
    const lojaIds = lojasGestor[0].map(l => l.lojaId);
    console.log('\nIDs das lojas:', lojaIds);
    
    const avgGestor = await db.execute(sql`
      SELECT 
        AVG(taxaReparacao) as mediaTaxa,
        SUM(totalServicos) as somaServicos,
        COUNT(*) as totalLojas
      FROM resultados_mensais 
      WHERE mes = 12 AND ano = 2025 AND lojaId IN (${sql.raw(lojaIds.join(','))})
    `);
    
    console.log('\nMédia da taxa de reparação (lojas do gestor):');
    console.log(avgGestor[0]);
  }
}

await connection.end();
