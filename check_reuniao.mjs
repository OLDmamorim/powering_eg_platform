import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.query(`
  SELECT id, lojaId, dataReuniao, participantes, 
         temasDiscutidos, decisoesTomadas, analiseResultados, 
         planosAcao, observacoes, estado 
  FROM reunioes_quinzenais 
  ORDER BY id DESC 
  LIMIT 5
`);

console.log('Reuniões encontradas:', rows.length);
for (const row of rows) {
  console.log('\n=== Reunião ID:', row.id, '===');
  console.log('Loja ID:', row.lojaId);
  console.log('Data:', row.dataReuniao);
  console.log('Estado:', row.estado);
  console.log('Participantes:', row.participantes);
  console.log('Temas Discutidos:', row.temasDiscutidos ? row.temasDiscutidos.substring(0, 100) + '...' : 'VAZIO');
  console.log('Decisões:', row.decisoesTomadas ? row.decisoesTomadas.substring(0, 100) + '...' : 'VAZIO');
  console.log('Análise Resultados:', row.analiseResultados ? row.analiseResultados.substring(0, 100) + '...' : 'VAZIO');
  console.log('Planos Ação:', row.planosAcao ? row.planosAcao.substring(0, 100) + '...' : 'VAZIO');
  console.log('Observações:', row.observacoes ? row.observacoes.substring(0, 100) + '...' : 'VAZIO');
}

await connection.end();
