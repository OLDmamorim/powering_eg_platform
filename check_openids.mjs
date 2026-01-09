import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar todos os utilizadores com nome Marco Amorim ou email similar
const [users] = await connection.execute(`
  SELECT id, openId, name, email, role 
  FROM users 
  WHERE name LIKE '%Marco%' OR email LIKE '%mamorim%' OR email LIKE '%amorim%'
  ORDER BY id
`);

console.log('Utilizadores relacionados com Marco Amorim:');
console.log('='.repeat(100));
users.forEach(u => {
  console.log(`ID: ${u.id}`);
  console.log(`  OpenID: ${u.openId}`);
  console.log(`  Name: ${u.name}`);
  console.log(`  Email: ${u.email}`);
  console.log(`  Role: ${u.role}`);
  console.log('-'.repeat(50));
});

await connection.end();
