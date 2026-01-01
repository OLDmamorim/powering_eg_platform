import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { desc } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);
  
  const [rows] = await connection.execute(`
    SELECT id, lojaId, temasDiscutidos, decisoesTomadas, planosAcao, observacoes, participantes, enviadoEm 
    FROM reunioes_quinzenais 
    ORDER BY id DESC 
    LIMIT 5
  `);
  
  console.log('=== ÚLTIMAS 5 REUNIÕES QUINZENAIS ===\n');
  
  for (const row of rows) {
    console.log(`ID: ${row.id}`);
    console.log(`Loja ID: ${row.lojaId}`);
    console.log(`Temas Discutidos: ${row.temasDiscutidos || '(vazio)'}`);
    console.log(`Decisões Tomadas: ${row.decisoesTomadas || '(vazio)'}`);
    console.log(`Planos de Ação: ${row.planosAcao || '(vazio)'}`);
    console.log(`Observações: ${row.observacoes || '(vazio)'}`);
    console.log(`Participantes: ${row.participantes || '(vazio)'}`);
    console.log(`Enviado Em: ${row.enviadoEm || '(não enviado)'}`);
    console.log('-----------------------------------\n');
  }
  
  await connection.end();
}

main().catch(console.error);
