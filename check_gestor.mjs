import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Ver todos os gestores
const [gestores] = await connection.execute(`
  SELECT g.id, g.userId, u.name, u.email 
  FROM gestores g 
  LEFT JOIN users u ON g.userId = u.id
`);
console.log('Gestores:');
gestores.forEach(g => console.log(`  ID: ${g.id}, User: ${g.userId}, Nome: ${g.name || g.email}`));

// Verificar relatórios de cada gestor em Dezembro 2025
console.log('\n\nRelatórios por gestor em Dezembro 2025:');
for (const gestor of gestores) {
  const [livres] = await connection.execute(`
    SELECT COUNT(*) as total FROM relatorios_livres 
    WHERE gestorId = ? AND YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
  `, [gestor.id]);
  
  const [completos] = await connection.execute(`
    SELECT COUNT(*) as total FROM relatorios_completos 
    WHERE gestorId = ? AND YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
  `, [gestor.id]);
  
  console.log(`  Gestor ${gestor.id} (${gestor.name || gestor.email}): ${livres[0].total} livres, ${completos[0].total} completos`);
}

await connection.end();
