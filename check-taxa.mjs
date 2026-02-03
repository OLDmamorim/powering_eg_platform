import { createConnection } from 'mysql2/promise';

const conn = await createConnection({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

const [rows] = await conn.execute(`
  SELECT AVG(taxaReparacao) as mediaTaxaRep, 
         COUNT(*) as totalLojas, 
         SUM(CASE WHEN taxaReparacao > 0 THEN 1 ELSE 0 END) as lojasComTaxa
  FROM resultados_mensais 
  WHERE mes = 1 AND ano = 2026
`);

console.log('Resultado:', rows[0]);
await conn.end();
