import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar gestores com relatórios em Dezembro 2025
const [gestoresComRelatorios] = await connection.execute(`
  SELECT DISTINCT r.gestorId, g.userId, u.name, u.email,
    (SELECT COUNT(*) FROM relatorios_livres WHERE gestorId = r.gestorId AND YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12) as livres,
    (SELECT COUNT(*) FROM relatorios_completos WHERE gestorId = r.gestorId AND YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12) as completos
  FROM relatorios_livres r
  LEFT JOIN gestores g ON r.gestorId = g.id
  LEFT JOIN users u ON g.userId = u.id
  WHERE YEAR(r.dataVisita) = 2025 AND MONTH(r.dataVisita) = 12
  ORDER BY livres DESC
  LIMIT 20
`);

console.log('Gestores com relatórios em Dezembro 2025:');
gestoresComRelatorios.forEach(g => console.log(`  Gestor ${g.gestorId} (${g.name || g.email || 'null'}): ${g.livres} livres, ${g.completos} completos`));

// Verificar se há pontos positivos/negativos destacados
const [pontosDestacados] = await connection.execute(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN pontosPositivosDestacar IS NOT NULL AND pontosPositivosDestacar != '' THEN 1 ELSE 0 END) as com_positivos,
    SUM(CASE WHEN pontosNegativosDestacar IS NOT NULL AND pontosNegativosDestacar != '' THEN 1 ELSE 0 END) as com_negativos
  FROM relatorios_livres 
  WHERE YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
`);
console.log('\nPontos destacados em relatórios livres Dezembro 2025:');
console.log(`  Total: ${pontosDestacados[0].total}, Com positivos: ${pontosDestacados[0].com_positivos}, Com negativos: ${pontosDestacados[0].com_negativos}`);

// Verificar se o gestor que está logado tem relatórios
const [relatoriosPorGestor] = await connection.execute(`
  SELECT gestorId, COUNT(*) as total
  FROM relatorios_livres 
  WHERE YEAR(dataVisita) = 2025 AND MONTH(dataVisita) = 12
  GROUP BY gestorId
  HAVING total > 0
`);
console.log('\nGestores com relatórios em Dezembro 2025:', relatoriosPorGestor.length);

await connection.end();
