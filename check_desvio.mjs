import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Verificar valores de desvio percentual para dezembro 2025
const result = await db.execute(sql`
  SELECT 
    AVG(desvioPercentualMes) as mediaDesvio,
    MIN(desvioPercentualMes) as minDesvio,
    MAX(desvioPercentualMes) as maxDesvio
  FROM resultados_mensais 
  WHERE mes = 12 AND ano = 2025
`);

console.log('Desvio percentual dezembro 2025:');
console.log(result[0]);

// Verificar alguns valores individuais
const samples = await db.execute(sql`
  SELECT lojaId, desvioPercentualMes, totalServicos, objetivoMensal
  FROM resultados_mensais 
  WHERE mes = 12 AND ano = 2025
  LIMIT 5
`);

console.log('\nAmostras:');
console.log(samples[0]);

await connection.end();
