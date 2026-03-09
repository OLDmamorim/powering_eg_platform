import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, lojaId, nomeLoja, gestorId, totalItensStock, totalComFichas, totalSemFichas, totalFichasSemStock, createdAt 
   FROM analises_stock 
   WHERE LOWER(nomeLoja) LIKE '%porto alto%' 
   ORDER BY createdAt DESC LIMIT 5`
);
console.table(rows);

// Also check the latest analysis to see the resultadoAnalise JSON structure
const [detail] = await conn.execute(
  `SELECT id, LEFT(resultadoAnalise, 500) as resultado_start 
   FROM analises_stock 
   WHERE LOWER(nomeLoja) LIKE '%porto alto%' 
   ORDER BY createdAt DESC LIMIT 1`
);
console.log('\nResultado preview:');
console.log(detail[0]?.resultado_start);

await conn.end();
