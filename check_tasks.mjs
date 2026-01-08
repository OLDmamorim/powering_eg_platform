import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection({
  uri: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Verificar tarefas pendentes
const [tasks] = await connection.execute(`
  SELECT 
    t.id,
    t.titulo,
    t.estado,
    t.vistoGestor,
    t.atribuidoUserId,
    t.criadoPorId,
    u.name as atribuidoNome,
    creator.name as criadoPorNome
  FROM todos t
  LEFT JOIN users u ON t.atribuidoUserId = u.id
  LEFT JOIN users creator ON t.criadoPorId = creator.id
  WHERE t.estado IN ('pendente', 'em_progresso')
  ORDER BY t.createdAt DESC
  LIMIT 15
`);

console.log('Tarefas pendentes:');
console.table(tasks);

// Verificar utilizador Marco Amorim
const [marcoUser] = await connection.execute(`
  SELECT id, name, role FROM users WHERE name LIKE '%Marco%'
`);
console.log('\nUtilizador Marco:', marcoUser);

if (marcoUser.length > 0) {
  const userId = marcoUser[0].id;
  const [count] = await connection.execute(`
    SELECT COUNT(*) as count
    FROM todos
    WHERE atribuidoUserId = ?
      AND criadoPorId != ?
      AND (vistoGestor = false OR vistoGestor IS NULL)
      AND estado IN ('pendente', 'em_progresso')
  `, [userId, userId]);
  console.log('\nContagem de tarefas para Marco:', count[0].count);
  
  // Ver tarefas específicas
  const [marcoTasks] = await connection.execute(`
    SELECT id, titulo, estado, vistoGestor, criadoPorId
    FROM todos
    WHERE atribuidoUserId = ?
      AND estado IN ('pendente', 'em_progresso')
  `, [userId]);
  console.log('\nTarefas atribuídas ao Marco:');
  console.table(marcoTasks);
}

await connection.end();
