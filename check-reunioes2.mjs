import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [rows] = await connection.execute(`
    SELECT id, lojaId, temasDiscutidos, decisoesTomadas, planosAcao, observacoes, participantes, estado, dataEnvio 
    FROM reunioes_quinzenais 
    ORDER BY id DESC 
    LIMIT 5
  `);
  
  console.log('=== ÚLTIMAS 5 REUNIÕES QUINZENAIS ===\n');
  
  for (const row of rows) {
    console.log(`ID: ${row.id}`);
    console.log(`Loja ID: ${row.lojaId}`);
    console.log(`Estado: ${row.estado}`);
    console.log(`Temas Discutidos: ${row.temasDiscutidos ? row.temasDiscutidos.substring(0, 100) + '...' : '(vazio)'}`);
    console.log(`Decisões Tomadas: ${row.decisoesTomadas ? row.decisoesTomadas.substring(0, 100) + '...' : '(vazio)'}`);
    console.log(`Planos de Ação: ${row.planosAcao ? row.planosAcao.substring(0, 100) + '...' : '(vazio)'}`);
    console.log(`Observações: ${row.observacoes ? row.observacoes.substring(0, 100) + '...' : '(vazio)'}`);
    console.log(`Participantes: ${row.participantes || '(vazio)'}`);
    console.log(`Data Envio: ${row.dataEnvio || '(não enviado)'}`);
    console.log('-----------------------------------\n');
  }
  
  await connection.end();
}

main().catch(console.error);
