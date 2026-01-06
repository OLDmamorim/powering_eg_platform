import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT lojaId, taxaReparacao, totalServicos FROM resultados_mensais WHERE mes = 12 AND ano = 2025 LIMIT 10');
console.log('Valores de taxaReparacao na BD:');
rows.forEach(r => console.log(`Loja ${r.lojaId}: taxaReparacao = ${r.taxaReparacao}`));
await conn.end();
