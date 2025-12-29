import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Ver totais mensais
  const [totais] = await connection.execute('SELECT id, mes, ano, totalServicos, objetivoMensal, taxaReparacao, qtdReparacoes FROM totais_mensais');
  console.log('Totais Mensais:');
  totais.forEach(row => {
    console.log(`ID: ${row.id}, Mes: ${row.mes}, Ano: ${row.ano}`);
    console.log(`  Total Servicos: ${row.totalServicos}`);
    console.log(`  Objetivo Mensal: ${row.objetivoMensal}`);
    console.log(`  Taxa Reparacao: ${row.taxaReparacao}`);
    console.log(`  Qtd Reparacoes: ${row.qtdReparacoes}`);
  });
  
  await connection.end();
}

main().catch(console.error);
