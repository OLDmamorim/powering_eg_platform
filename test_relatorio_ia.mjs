import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const gestorId = 30001;
const dataInicio = new Date(2025, 11, 1); // Dezembro 2025
const dataFim = new Date(2025, 11, 31, 23, 59, 59);

console.log('Período:', dataInicio.toISOString(), 'a', dataFim.toISOString());

// Buscar lojas do gestor
const [lojasDoGestor] = await connection.execute(`
  SELECT lojaId FROM gestor_lojas WHERE gestorId = ?
`, [gestorId]);
const lojaIds = lojasDoGestor.map(l => l.lojaId);
console.log('Lojas do gestor:', lojaIds.length);

// Buscar relatórios livres
const [livres] = await connection.execute(`
  SELECT rl.*, l.nome as lojaNome
  FROM relatorios_livres rl
  JOIN lojas l ON rl.lojaId = l.id
  WHERE rl.lojaId IN (${lojaIds.join(',')})
  AND rl.dataVisita >= ? AND rl.dataVisita <= ?
`, [dataInicio, dataFim]);
console.log('Relatórios livres no período:', livres.length);

// Buscar relatórios completos
const [completos] = await connection.execute(`
  SELECT rc.*, l.nome as lojaNome
  FROM relatorios_completos rc
  JOIN lojas l ON rc.lojaId = l.id
  WHERE rc.lojaId IN (${lojaIds.join(',')})
  AND rc.dataVisita >= ? AND rc.dataVisita <= ?
`, [dataInicio, dataFim]);
console.log('Relatórios completos no período:', completos.length);

// Ver pontos positivos/negativos dos completos
let pontosPositivos = 0;
let pontosNegativos = 0;
completos.forEach(c => {
  if (c.pontosPositivos && c.pontosPositivos.trim()) pontosPositivos++;
  if (c.pontosNegativos && c.pontosNegativos.trim()) pontosNegativos++;
});
console.log('Completos com pontos positivos:', pontosPositivos);
console.log('Completos com pontos negativos:', pontosNegativos);

await connection.end();
