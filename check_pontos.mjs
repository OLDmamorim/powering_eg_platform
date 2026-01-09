import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar pontos positivos/negativos em relatórios completos
const [pontosCompletos] = await connection.execute(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN pontosPositivos IS NOT NULL AND pontosPositivos != '' THEN 1 ELSE 0 END) as com_positivos,
    SUM(CASE WHEN pontosNegativos IS NOT NULL AND pontosNegativos != '' THEN 1 ELSE 0 END) as com_negativos
  FROM relatorios_completos 
  WHERE YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
`);
console.log('Relatórios Completos Dezembro 2025:');
console.log(`  Total: ${pontosCompletos[0].total}`);
console.log(`  Com pontos positivos: ${pontosCompletos[0].com_positivos}`);
console.log(`  Com pontos negativos: ${pontosCompletos[0].com_negativos}`);

// Ver alguns exemplos
const [exemplos] = await connection.execute(`
  SELECT id, lojaId, pontosPositivos, pontosNegativos
  FROM relatorios_completos 
  WHERE YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
  AND (pontosPositivos IS NOT NULL OR pontosNegativos IS NOT NULL)
  LIMIT 3
`);
console.log('\nExemplos de pontos:');
exemplos.forEach(e => {
  console.log(`  Relatório ${e.id} (Loja ${e.lojaId}):`);
  if (e.pontosPositivos) console.log(`    Positivos: ${e.pontosPositivos.substring(0, 100)}...`);
  if (e.pontosNegativos) console.log(`    Negativos: ${e.pontosNegativos.substring(0, 100)}...`);
});

await connection.end();
