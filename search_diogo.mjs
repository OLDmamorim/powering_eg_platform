import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Procurar na tabela colaboradores
console.log("=== COLABORADORES ===");
const colab = await db.execute(sql`SELECT id, nome, lojaId, tipo, ativo, createdAt FROM colaboradores WHERE nome LIKE '%Diogo%Ferreira%' OR nome LIKE '%DIOGO%FERREIRA%'`);
console.log(JSON.stringify(colab[0], null, 2));

// Procurar na tabela volantes
console.log("\n=== VOLANTES ===");
const volantes = await db.execute(sql`SELECT * FROM volantes WHERE nome LIKE '%Diogo%Ferreira%' OR nome LIKE '%DIOGO%FERREIRA%'`);
console.log(JSON.stringify(volantes[0], null, 2));

// Procurar em todas as tabelas que possam ter o nome
console.log("\n=== FERIAS (colaborador com nome Diogo) ===");
const ferias = await db.execute(sql`SELECT f.id, f.colaboradorId, f.data, f.estado, c.nome FROM ferias f JOIN colaboradores c ON f.colaboradorId = c.id WHERE c.nome LIKE '%Diogo%Ferreira%' LIMIT 10`);
console.log(JSON.stringify(ferias[0], null, 2));

// Procurar em destaque/fixados
console.log("\n=== COLABORADORES EM DESTAQUE ===");
const destaque = await db.execute(sql`SELECT * FROM colaboradores_destaque WHERE colaboradorId IN (SELECT id FROM colaboradores WHERE nome LIKE '%Diogo%Ferreira%')`);
console.log(JSON.stringify(destaque[0], null, 2));

await connection.end();
process.exit(0);
