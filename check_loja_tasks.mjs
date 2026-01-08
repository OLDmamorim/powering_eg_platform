import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const connection = await mysql.createConnection({
  uri: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Verificar tarefas criadas por lojas
const [tasks] = await connection.execute(`
  SELECT 
    t.id,
    t.titulo,
    t.estado,
    t.vistoGestor,
    t.atribuidoUserId,
    t.criadoPorId,
    t.criadoPorLojaId,
    u.name as atribuidoNome,
    l.nome as criadoPorLojaNome
  FROM todos t
  LEFT JOIN users u ON t.atribuidoUserId = u.id
  LEFT JOIN lojas l ON t.criadoPorLojaId = l.id
  WHERE t.estado IN ('pendente', 'em_progresso')
  ORDER BY t.createdAt DESC
  LIMIT 15
`);

console.log('Tarefas pendentes (com criadoPorLojaId):');
console.table(tasks);

// Contar tarefas criadas por lojas para Marco
const userId = 420030;
const [count] = await connection.execute(`
  SELECT COUNT(*) as count
  FROM todos
  WHERE atribuidoUserId = ?
    AND criadoPorLojaId IS NOT NULL
    AND (vistoGestor = false OR vistoGestor IS NULL)
    AND estado IN ('pendente', 'em_progresso')
`, [userId]);
console.log('\nContagem de tarefas CRIADAS POR LOJAS para Marco:', count[0].count);

// Todas as tarefas pendentes para Marco (independente de quem criou)
const [countAll] = await connection.execute(`
  SELECT COUNT(*) as count
  FROM todos
  WHERE atribuidoUserId = ?
    AND (vistoGestor = false OR vistoGestor IS NULL)
    AND estado IN ('pendente', 'em_progresso')
`, [userId]);
console.log('Contagem de TODAS as tarefas não vistas para Marco:', countAll[0].count);

await connection.end();
