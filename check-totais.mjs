import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Ver totais mensais
  const [totais] = await connection.execute('SELECT * FROM totais_mensais');
  console.log('Totais Mensais:');
  console.log(JSON.stringify(totais, null, 2));
  
  await connection.end();
}

main().catch(console.error);
