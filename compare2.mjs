import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Ambos na tabela colaboradores
console.log("=== COLABORADORES (Hugo vs Diogo) ===");
const both = await db.execute(sql`SELECT id, nome, lojaId, tipo, funcao, ativo FROM colaboradores WHERE id IN (60016, 60021)`);
console.log(JSON.stringify(both[0], null, 2));

// Verificar mapa de férias
console.log("\n=== MAPA FERIAS (Hugo e Diogo) ===");
const mapa = await db.execute(sql`SELECT mf.id, mf.colaboradorId, mf.lojaId, mf.ano, c.nome FROM mapa_ferias mf JOIN colaboradores c ON mf.colaboradorId = c.id WHERE mf.colaboradorId IN (60016, 60021)`);
console.log(JSON.stringify(mapa[0], null, 2));

// Verificar fixados
console.log("\n=== FIXADOS (colaboradores fixados em lojas) ===");
const fixados = await db.execute(sql`SELECT cf.*, c.nome FROM colaboradores_fixados cf JOIN colaboradores c ON cf.colaboradorId = c.id WHERE cf.colaboradorId IN (60016, 60021)`);
console.log(JSON.stringify(fixados[0], null, 2));

// Listar tabelas disponíveis
console.log("\n=== TABELAS NA BD ===");
const tables = await db.execute(sql`SHOW TABLES`);
const tableNames = tables[0].map(t => Object.values(t)[0]).filter(t => t.includes('colab') || t.includes('fixa') || t.includes('mapa') || t.includes('destaque'));
console.log(JSON.stringify(tableNames, null, 2));

await connection.end();
process.exit(0);
