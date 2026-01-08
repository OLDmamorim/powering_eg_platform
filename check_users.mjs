import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const connection = await mysql.createConnection({
  uri: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Verificar utilizadores Marco
const [users] = await connection.execute(`
  SELECT id, name, role, email FROM users WHERE name LIKE '%Marco%' OR id IN (1, 420030)
`);
console.log('Utilizadores Marco:');
console.table(users);

// Verificar tarefas para cada utilizador
for (const user of users) {
  const [count] = await connection.execute(`
    SELECT COUNT(*) as count
    FROM todos
    WHERE atribuidoUserId = ?
      AND criadoPorLojaId IS NOT NULL
      AND estado IN ('pendente', 'em_progresso')
  `, [user.id]);
  console.log(`Tarefas para ${user.name} (ID: ${user.id}, role: ${user.role}):`, count[0].count);
}

await connection.end();
