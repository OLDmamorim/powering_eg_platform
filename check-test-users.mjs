import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Buscar utilizadores de teste
const testUsers = await db.execute(sql`
  SELECT id, name, email, role 
  FROM users 
  WHERE name LIKE '%Gestor Teste%' OR name LIKE '%List Test%'
`);

console.log('Utilizadores de teste encontrados:');
console.log(JSON.stringify(testUsers[0], null, 2));

await connection.end();
