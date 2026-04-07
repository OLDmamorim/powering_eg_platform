import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Colunas da tabela colaboradores
console.log("=== COLUNAS COLABORADORES ===");
const cols = await db.execute(sql`DESCRIBE colaboradores`);
console.log(cols[0].map(c => c.Field).join(', '));

// Ambos na tabela colaboradores
console.log("\n=== COLABORADORES (Hugo vs Diogo) ===");
const both = await db.execute(sql`SELECT * FROM colaboradores WHERE id IN (60016, 60021)`);
console.log(JSON.stringify(both[0], null, 2));

// Verificar mapa de férias
console.log("\n=== MAPA FERIAS (Hugo e Diogo) ===");
try {
  const mapa = await db.execute(sql`SELECT mf.*, c.nome FROM mapa_ferias mf JOIN colaboradores c ON mf.colaboradorId = c.id WHERE mf.colaboradorId IN (60016, 60021)`);
  console.log(JSON.stringify(mapa[0], null, 2));
} catch(e) { console.log("Tabela mapa_ferias não existe"); }

// Verificar fixados
console.log("\n=== FIXADOS ===");
try {
  const fixados = await db.execute(sql`SELECT cf.*, c.nome FROM colaboradores_fixados cf JOIN colaboradores c ON cf.colaboradorId = c.id WHERE cf.colaboradorId IN (60016, 60021)`);
  console.log(JSON.stringify(fixados[0], null, 2));
} catch(e) { console.log("Tabela colaboradores_fixados não existe"); }

// Tabelas relevantes
console.log("\n=== TABELAS NA BD ===");
const tables = await db.execute(sql`SHOW TABLES`);
const allTables = tables[0].map(t => Object.values(t)[0]);
console.log(allTables.filter(t => t.includes('colab') || t.includes('fixa') || t.includes('mapa') || t.includes('destaque') || t.includes('feria')).join('\n'));

await connection.end();
process.exit(0);
