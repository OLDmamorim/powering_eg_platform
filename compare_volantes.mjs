import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Hugo Silva na tabela colaboradores
console.log("=== HUGO SILVA - COLABORADORES ===");
const hugo = await db.execute(sql`SELECT id, nome, lojaId, tipo, ativo FROM colaboradores WHERE nome LIKE '%Hugo%Silva%'`);
console.log(JSON.stringify(hugo[0], null, 2));

// Diogo Ferreira na tabela colaboradores
console.log("\n=== DIOGO FERREIRA - COLABORADORES ===");
const diogo = await db.execute(sql`SELECT id, nome, lojaId, tipo, ativo FROM colaboradores WHERE nome LIKE '%Diogo%Ferreira%'`);
console.log(JSON.stringify(diogo[0], null, 2));

// Hugo Silva na tabela colaboradores_destaque
console.log("\n=== HUGO SILVA - DESTAQUE ===");
const hugoDestaque = await db.execute(sql`SELECT * FROM colaboradores_destaque WHERE colaboradorId IN (SELECT id FROM colaboradores WHERE nome LIKE '%Hugo%Silva%')`);
console.log(JSON.stringify(hugoDestaque[0], null, 2));

// Diogo Ferreira na tabela colaboradores_destaque
console.log("\n=== DIOGO FERREIRA - DESTAQUE ===");
const diogoDestaque = await db.execute(sql`SELECT * FROM colaboradores_destaque WHERE colaboradorId IN (SELECT id FROM colaboradores WHERE nome LIKE '%Diogo%Ferreira%')`);
console.log(JSON.stringify(diogoDestaque[0], null, 2));

// Verificar se Hugo tem lojaId ou se é "Zona do Gestor"
console.log("\n=== HUGO SILVA - LOJA ===");
const hugoLoja = await db.execute(sql`SELECT c.id, c.nome, c.lojaId, c.tipo, l.nome as lojaNome FROM colaboradores c LEFT JOIN lojas l ON c.lojaId = l.id WHERE c.nome LIKE '%Hugo%Silva%'`);
console.log(JSON.stringify(hugoLoja[0], null, 2));

// Verificar Diogo Ferreira loja
console.log("\n=== DIOGO FERREIRA - LOJA ===");
const diogoLoja = await db.execute(sql`SELECT c.id, c.nome, c.lojaId, c.tipo, l.nome as lojaNome FROM colaboradores c LEFT JOIN lojas l ON c.lojaId = l.id WHERE c.nome LIKE '%Diogo%Ferreira%'`);
console.log(JSON.stringify(diogoLoja[0], null, 2));

await connection.end();
process.exit(0);
