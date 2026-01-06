import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(`
  SELECT g.id as gestorId, u.name as gestorNome, COUNT(l.id) as totalLojas
  FROM gestores g 
  INNER JOIN users u ON g.userId = u.id 
  LEFT JOIN lojas l ON l.gestorId = g.id
  WHERE u.role = 'gestor'
  GROUP BY g.id, u.name
  ORDER BY u.name
`);

console.log('Gestores com role=gestor e suas lojas:');
rows.forEach(r => console.log(`  - ${r.gestorNome}: ${r.totalLojas} lojas`));

await connection.end();
