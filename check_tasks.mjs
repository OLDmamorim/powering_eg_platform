import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute(`
SELECT t.id, t.titulo, t.estado, t.vistoGestor, t.criadoPorLojaId, l.nome as lojaNome, t.atribuidoUserId, u.name as atribuidoNome
FROM todos t
LEFT JOIN lojas l ON t.criadoPorLojaId = l.id
LEFT JOIN users u ON t.atribuidoUserId = u.id
WHERE t.criadoPorLojaId IS NOT NULL
ORDER BY t.createdAt DESC
LIMIT 20
`);

console.log('Tarefas criadas por lojas:');
console.table(rows);

// Verificar quantas estão com vistoGestor = 0
const [naoVistas] = await connection.execute(`
SELECT COUNT(*) as count FROM todos 
WHERE criadoPorLojaId IS NOT NULL 
AND vistoGestor = 0 
AND (estado = 'pendente' OR estado = 'em_progresso')
`);
console.log('\nTarefas NÃO vistas (vistoGestor=0):', naoVistas[0].count);

await connection.end();
