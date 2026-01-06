// Simular completamente o que o serviço faz
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Simular getAllGestores()
const [gestoresResults] = await connection.execute(`
  SELECT g.id, g.userId, u.name as userName, u.email as userEmail, u.role as userRole
  FROM gestores g
  INNER JOIN users u ON g.userId = u.id
  WHERE u.role = 'gestor'
  ORDER BY u.name
`);

const todosGestores = gestoresResults.map(r => ({
  id: r.id,
  userId: r.userId,
  user: {
    name: r.userName,
    email: r.userEmail,
    role: r.userRole
  }
}));

console.log('=== todosGestores (resultado de getAllGestores) ===');
console.log(`Total: ${todosGestores.length} gestores`);
todosGestores.forEach(g => console.log(`  - ${g.user.name} (ID: ${g.id})`));

// Simular analiseGestores
console.log('\n=== Simulação de analiseGestores ===');
for (const gestor of todosGestores) {
  // Simular getLojasByGestorId
  const [lojas] = await connection.execute(`
    SELECT l.id, l.nome
    FROM lojas l
    INNER JOIN gestor_lojas gl ON gl.lojaId = l.id
    WHERE gl.gestorId = ?
  `, [gestor.id]);
  
  console.log(`\n${gestor.user?.name || 'Desconhecido'} (ID: ${gestor.id}):`);
  console.log(`  totalLojas: ${lojas.length}`);
}

await connection.end();
