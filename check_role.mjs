import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar utilizador
const [users] = await connection.execute("SELECT id, name, email, role FROM users WHERE email = 'mamorim@expressglass.pt'");
console.log('User mamorim@expressglass.pt:');
console.log('  ID:', users[0]?.id);
console.log('  Name:', users[0]?.name);
console.log('  Email:', users[0]?.email);
console.log('  Role:', users[0]?.role);
console.log('  Role === "gestor":', users[0]?.role === 'gestor');
console.log('  Role === "admin":', users[0]?.role === 'admin');

await connection.end();
