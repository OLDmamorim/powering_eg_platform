import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [lojas] = await connection.execute("SELECT id, nome, email FROM lojas WHERE nome LIKE '%famalicao%' OR nome LIKE '%Famalicão%'");
  console.log('Lojas Famalicão:');
  lojas.forEach(loja => {
    console.log(`ID: ${loja.id}, Nome: ${loja.nome}, Email: ${loja.email || 'SEM EMAIL'}`);
  });
  
  await connection.end();
}

main().catch(console.error);
