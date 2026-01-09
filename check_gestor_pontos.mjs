import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Ver o gestor Marco Amorim (ID 30001)
const gestorId = 30001;

// Verificar lojas do gestor
const [lojas] = await connection.execute(`
  SELECT gl.lojaId, l.nome
  FROM gestor_lojas gl
  JOIN lojas l ON gl.lojaId = l.id
  WHERE gl.gestorId = ?
`, [gestorId]);
console.log(`Lojas do gestor ${gestorId}:`);
lojas.forEach(l => console.log(`  ${l.lojaId}: ${l.nome}`));

const lojaIds = lojas.map(l => l.lojaId);
console.log('\nLojaIds:', lojaIds);

// Verificar relatórios completos dessas lojas em Dezembro 2025
if (lojaIds.length > 0) {
  const [completos] = await connection.execute(`
    SELECT rc.id, rc.lojaId, l.nome, rc.pontosPositivos, rc.pontosNegativos
    FROM relatorios_completos rc
    JOIN lojas l ON rc.lojaId = l.id
    WHERE rc.lojaId IN (${lojaIds.join(',')})
    AND YEAR(rc.dataVisita) = 2025 AND MONTH(rc.dataVisita) = 12
    LIMIT 5
  `);
  console.log(`\nRelatórios completos das lojas do gestor em Dezembro 2025: ${completos.length}`);
  completos.forEach(c => {
    console.log(`  ${c.id} - ${c.nome}: Positivos=${c.pontosPositivos?.substring(0,50) || 'null'}`);
  });
}

await connection.end();
