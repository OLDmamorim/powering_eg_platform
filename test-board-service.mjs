// Teste direto do serviço de relatório board
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar todos os gestores com role='gestor'
const [gestores] = await connection.execute(`
  SELECT g.id, g.userId, u.name as userName, u.email as userEmail, u.role as userRole
  FROM gestores g
  INNER JOIN users u ON g.userId = u.id
  WHERE u.role = 'gestor'
  ORDER BY u.name
`);

console.log('=== Gestores que DEVEM aparecer no Relatório Board ===');
for (const g of gestores) {
  // Buscar lojas de cada gestor
  const [lojas] = await connection.execute(`
    SELECT l.id, l.nome
    FROM lojas l
    INNER JOIN gestor_lojas gl ON gl.lojaId = l.id
    WHERE gl.gestorId = ?
  `, [g.id]);
  
  // Buscar relatórios livres
  const [relLivres] = await connection.execute(`
    SELECT COUNT(*) as count FROM relatorios_livres WHERE gestorId = ?
  `, [g.id]);
  
  // Buscar relatórios completos
  const [relCompletos] = await connection.execute(`
    SELECT COUNT(*) as count FROM relatorios_completos WHERE gestorId = ?
  `, [g.id]);
  
  console.log(`\n${g.userName} (ID: ${g.id}):`);
  console.log(`  - Lojas: ${lojas.length}`);
  console.log(`  - Relatórios Livres: ${relLivres[0].count}`);
  console.log(`  - Relatórios Completos: ${relCompletos[0].count}`);
}

await connection.end();
