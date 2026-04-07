import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Restaurar gestorId do Diogo Ferreira para 30001 (Marco Amorim)
console.log("=== ANTES ===");
const antes = await db.execute(sql`SELECT id, nome, gestorId, tipo FROM colaboradores WHERE id = 60016`);
console.log(JSON.stringify(antes[0], null, 2));

await db.execute(sql`UPDATE colaboradores SET gestorId = 30001 WHERE id = 60016`);

console.log("\n=== DEPOIS ===");
const depois = await db.execute(sql`SELECT id, nome, gestorId, tipo FROM colaboradores WHERE id = 60016`);
console.log(JSON.stringify(depois[0], null, 2));

await connection.end();
process.exit(0);
