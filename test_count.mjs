import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const connection = await mysql.createConnection({
  uri: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Contar tarefas criadas por lojas para Marco (nova lógica)
const userId = 420030;
const [count] = await connection.execute(`
  SELECT COUNT(*) as count
  FROM todos
  WHERE atribuidoUserId = ?
    AND criadoPorLojaId IS NOT NULL
    AND estado IN ('pendente', 'em_progresso')
`, [userId]);
console.log('Nova contagem de tarefas criadas por lojas para Marco:', count[0].count);

await connection.end();
