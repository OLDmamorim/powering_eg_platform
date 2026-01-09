import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [columns] = await connection.execute(`DESCRIBE relatorios_completos`);
console.log('Colunas de relatorios_completos:');
columns.forEach(c => console.log(`  ${c.Field} (${c.Type})`));

await connection.end();
