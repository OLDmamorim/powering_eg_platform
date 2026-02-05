import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('=== Estados dos Tópicos ===');
  const [estados] = await connection.execute(`
    SELECT estado, COUNT(*) as total 
    FROM topicos_reuniao_gestores 
    GROUP BY estado
  `);
  console.table(estados);
  
  console.log('\n=== Tópicos Pendentes ===');
  const [pendentes] = await connection.execute(`
    SELECT id, titulo, estado, reuniaoId, createdAt 
    FROM topicos_reuniao_gestores 
    WHERE estado = 'pendente'
    ORDER BY createdAt DESC
  `);
  console.table(pendentes);
  
  console.log('\n=== Tópicos com Reunião Associada ===');
  const [comReuniao] = await connection.execute(`
    SELECT t.id, t.titulo, t.estado, t.reuniaoId, r.data as dataReuniao
    FROM topicos_reuniao_gestores t 
    LEFT JOIN reunioes_gestores r ON t.reuniaoId = r.id 
    WHERE t.reuniaoId IS NOT NULL
    ORDER BY r.data DESC
  `);
  console.table(comReuniao);
  
  await connection.end();
}

main().catch(console.error);
