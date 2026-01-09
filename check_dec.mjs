import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Check December 2025 reports
const [livres] = await connection.execute(`
  SELECT COUNT(*) as total FROM relatorios_livres 
  WHERE YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
`);
console.log('Relatórios Livres Dezembro 2025:', livres[0].total);

const [completos] = await connection.execute(`
  SELECT COUNT(*) as total FROM relatorios_completos 
  WHERE YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
`);
console.log('Relatórios Completos Dezembro 2025:', completos[0].total);

// Check all months
const [months] = await connection.execute(`
  SELECT 
    YEAR(dataVisita) as ano,
    MONTH(dataVisita) as mes,
    COUNT(*) as total
  FROM relatorios_livres 
  GROUP BY YEAR(dataVisita), MONTH(dataVisita)
  ORDER BY ano DESC, mes DESC
  LIMIT 10
`);
console.log('\nRelatórios Livres por mês:');
months.forEach(m => console.log(`  ${m.ano}-${String(m.mes).padStart(2,'0')}: ${m.total}`));

await connection.end();
