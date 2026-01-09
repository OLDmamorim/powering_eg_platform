import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const gestorId = 30001;

// Verificar meses dos relatórios livres
const [livresMeses] = await connection.execute(`
  SELECT 
    YEAR(dataVisita) as ano,
    MONTH(dataVisita) as mes,
    COUNT(*) as total
  FROM relatorios_livres 
  WHERE gestorId = ?
  GROUP BY YEAR(dataVisita), MONTH(dataVisita)
  ORDER BY ano DESC, mes DESC
`, [gestorId]);

console.log('Relatórios Livres do Gestor 30001 por mês:');
livresMeses.forEach(m => console.log(`  ${m.ano}-${String(m.mes).padStart(2,'0')}: ${m.total}`));

// Verificar meses dos relatórios completos
const [completosMeses] = await connection.execute(`
  SELECT 
    YEAR(dataVisita) as ano,
    MONTH(dataVisita) as mes,
    COUNT(*) as total
  FROM relatorios_completos 
  WHERE gestorId = ?
  GROUP BY YEAR(dataVisita), MONTH(dataVisita)
  ORDER BY ano DESC, mes DESC
`, [gestorId]);

console.log('\nRelatórios Completos do Gestor 30001 por mês:');
completosMeses.forEach(m => console.log(`  ${m.ano}-${String(m.mes).padStart(2,'0')}: ${m.total}`));

await connection.end();
