import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(`
  SELECT g.id, u.name, u.email, u.role 
  FROM gestores g 
  INNER JOIN users u ON g.userId = u.id 
  WHERE u.role = 'gestor'
  ORDER BY u.name
`);

console.log('Gestores com role=gestor:');
rows.forEach(r => console.log(`  - ${r.name} (${r.email})`));

await connection.end();
