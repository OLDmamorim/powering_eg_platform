import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Verificar o role do Marco Amorim
const result = await db.execute(sql`
  SELECT id, name, email, role
  FROM users 
  WHERE email LIKE '%mamorim%' OR email LIKE '%mramorim%'
`);

console.log('Utilizador Marco Amorim:');
console.log(result[0]);

await connection.end();
