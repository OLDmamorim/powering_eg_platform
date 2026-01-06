import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar relatórios livres por gestor
const [relLivres] = await connection.execute(`
  SELECT g.id as gestorId, u.name as gestorNome, COUNT(rl.id) as totalRelatoriosLivres
  FROM gestores g 
  INNER JOIN users u ON g.userId = u.id 
  LEFT JOIN relatorios_livres rl ON rl.gestorId = g.id
  WHERE u.role = 'gestor'
  GROUP BY g.id, u.name
  ORDER BY u.name
`);

console.log('Relatórios Livres por Gestor:');
relLivres.forEach(r => console.log(`  - ${r.gestorNome}: ${r.totalRelatoriosLivres} relatórios livres`));

// Verificar relatórios completos por gestor
const [relCompletos] = await connection.execute(`
  SELECT g.id as gestorId, u.name as gestorNome, COUNT(rc.id) as totalRelatoriosCompletos
  FROM gestores g 
  INNER JOIN users u ON g.userId = u.id 
  LEFT JOIN relatorios_completos rc ON rc.gestorId = g.id
  WHERE u.role = 'gestor'
  GROUP BY g.id, u.name
  ORDER BY u.name
`);

console.log('\nRelatórios Completos por Gestor:');
relCompletos.forEach(r => console.log(`  - ${r.gestorNome}: ${r.totalRelatoriosCompletos} relatórios completos`));

await connection.end();
