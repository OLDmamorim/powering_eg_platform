import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Buscar todos os tokens
  const [rows] = await connection.execute(`
    SELECT t.*, l.nome as lojaNome
    FROM tokens_loja t
    JOIN lojas l ON t.lojaId = l.id
    ORDER BY l.nome
    LIMIT 10
  `);
  
  console.log('=== TODOS OS TOKENS ===\n');
  console.log(`Total encontrados: ${rows.length}`);
  
  for (const row of rows) {
    console.log(`\nLoja: ${row.lojaNome}`);
    console.log(`Token: ${row.token}`);
    console.log(`Ativo: ${row.ativo}`);
  }
  
  await connection.end();
}

main().catch(console.error);
