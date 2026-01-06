import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Simular o que a função getAllGestores faz
const [gestores] = await connection.execute(`
  SELECT g.id, g.userId, u.name as userName, u.email as userEmail, u.role as userRole
  FROM gestores g
  INNER JOIN users u ON g.userId = u.id
  WHERE u.role = 'gestor'
  ORDER BY u.name
`);

console.log('Gestores retornados por getAllGestores (role=gestor):');
gestores.forEach(g => console.log(`  - ID: ${g.id}, Nome: ${g.userName}, Role: ${g.userRole}`));
console.log(`\nTotal: ${gestores.length} gestores`);

// Verificar se há gestores com role diferente de 'gestor' que deveriam aparecer
const [todosGestores] = await connection.execute(`
  SELECT g.id, g.userId, u.name as userName, u.email as userEmail, u.role as userRole
  FROM gestores g
  INNER JOIN users u ON g.userId = u.id
  ORDER BY u.name
`);

console.log('\n\nTODOS os gestores (sem filtro de role):');
todosGestores.forEach(g => console.log(`  - ID: ${g.id}, Nome: ${g.userName}, Role: ${g.userRole}`));
console.log(`\nTotal: ${todosGestores.length} gestores`);

await connection.end();
