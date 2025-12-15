import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Ver todos os users com este email
const [users] = await conn.execute(`
  SELECT id, name, email, role, openId, createdAt
  FROM users 
  WHERE email LIKE '%expressglass%'
  ORDER BY createdAt
`);

console.log('Users com email expressglass:');
console.table(users);

// Ver qual user está associado ao gestor
const [gestorUser] = await conn.execute(`
  SELECT g.id as gestor_id, g.userId, u.id as user_id, u.name, u.email, u.openId
  FROM gestores g
  JOIN users u ON g.userId = u.id
  WHERE u.email = 'expressglassminho@gmail.com'
`);

console.log('\nGestor associado:');
console.table(gestorUser);

await conn.end();
