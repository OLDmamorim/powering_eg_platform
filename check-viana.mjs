import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Buscar dados de Viana do Castelo Q4 2025
    const [rows] = await connection.execute(`
      SELECT rm.mes, rm.ano, rm.totalServicos, rm.objetivoMensal, rm.desvioPercentualMes, rm.taxaReparacao, l.nome as loja
      FROM resultados_mensais rm
      JOIN lojas l ON rm.lojaId = l.id
      WHERE LOWER(l.nome) LIKE '%viana%'
      AND rm.ano = 2025
      AND rm.mes IN (10, 11, 12)
      ORDER BY rm.mes
    `);
    
    console.log('\\n=== Dados de Viana do Castelo Q4 2025 ===\\n');
    console.log('Mês | Ano | Total Serviços | Objetivo | Desvio % | Taxa Rep | Loja');
    console.log('-'.repeat(80));
    
    let totalServicos = 0;
    let totalObjetivo = 0;
    let somaDesvio = 0;
    let somaTaxa = 0;
    let count = 0;
    
    for (const row of rows) {
      console.log(`${row.mes} | ${row.ano} | ${row.totalServicos} | ${row.objetivoMensal} | ${row.desvioPercentualMes} | ${row.taxaReparacao} | ${row.loja}`);
      totalServicos += row.totalServicos || 0;
      totalObjetivo += row.objetivoMensal || 0;
      somaDesvio += parseFloat(row.desvioPercentualMes) || 0;
      somaTaxa += parseFloat(row.taxaReparacao) || 0;
      count++;
    }
    
    console.log('-'.repeat(80));
    console.log(`\\nTOTAIS Q4:`);
    console.log(`Total Serviços: ${totalServicos}`);
    console.log(`Total Objetivo: ${totalObjetivo}`);
    console.log(`Média Desvio %: ${(somaDesvio / count * 100).toFixed(2)}%`);
    console.log(`Média Taxa Rep: ${(somaTaxa / count * 100).toFixed(2)}%`);
    
    // Verificar se há duplicados
    const [duplicates] = await connection.execute(`
      SELECT l.nome, rm.mes, rm.ano, COUNT(*) as count
      FROM resultados_mensais rm
      JOIN lojas l ON rm.lojaId = l.id
      WHERE LOWER(l.nome) LIKE '%viana%'
      AND rm.ano = 2025
      GROUP BY l.nome, rm.mes, rm.ano
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('\\n⚠️ DUPLICADOS ENCONTRADOS:');
      console.log(duplicates);
    }
    
    // Verificar todas as lojas com "viana"
    const [lojas] = await connection.execute(`
      SELECT id, nome FROM lojas WHERE LOWER(nome) LIKE '%viana%'
    `);
    
    console.log('\\n=== Lojas com "Viana" no nome ===');
    console.log(lojas);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
