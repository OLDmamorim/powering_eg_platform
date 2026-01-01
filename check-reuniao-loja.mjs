import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Buscar a reunião mais recente com dados da loja
  const [rows] = await connection.execute(`
    SELECT r.*, l.nome as lojaNome, l.email as lojaEmail
    FROM reunioes_quinzenais r
    LEFT JOIN lojas l ON r.lojaId = l.id
    ORDER BY r.id DESC 
    LIMIT 1
  `);
  
  console.log('=== ÚLTIMA REUNIÃO QUINZENAL ===\n');
  
  if (rows.length > 0) {
    const row = rows[0];
    console.log(`ID: ${row.id}`);
    console.log(`Loja: ${row.lojaNome} (ID: ${row.lojaId})`);
    console.log(`Email Loja: ${row.lojaEmail}`);
    console.log(`Data Reunião: ${row.dataReuniao}`);
    console.log(`Estado: ${row.estado}`);
    console.log(`Participantes: ${row.participantes}`);
    console.log(`Temas Discutidos: ${row.temasDiscutidos || '(vazio)'}`);
    console.log(`Decisões Tomadas: ${row.decisoesTomadas || '(vazio)'}`);
    console.log(`Planos de Ação: ${row.planosAcao || '(vazio)'}`);
    console.log(`Análise Resultados: ${row.analiseResultados || '(vazio)'}`);
    console.log(`Observações: ${row.observacoes || '(vazio)'}`);
    console.log(`Data Envio: ${row.dataEnvio || '(não enviado)'}`);
    console.log(`Email Enviado Para: ${row.emailEnviadoPara || '(não enviado)'}`);
    console.log(`Feedback Gestor: ${row.feedbackGestor || '(sem feedback)'}`);
    console.log(`Criado Em: ${row.createdAt}`);
    console.log(`Atualizado Em: ${row.updatedAt}`);
  } else {
    console.log('Nenhuma reunião encontrada.');
  }
  
  await connection.end();
}

main().catch(console.error);
