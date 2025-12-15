import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Ver todas as associações
const [rows] = await conn.execute(`
  SELECT gl.gestorId, gl.lojaId, g.userId, u.name as gestor_name, u.email, l.nome as loja_nome 
  FROM gestor_lojas gl 
  JOIN gestores g ON gl.gestorId = g.id 
  JOIN users u ON g.userId = u.id 
  JOIN lojas l ON gl.lojaId = l.id
`);

console.log('Associações gestor-loja:');
console.table(rows);

// Ver todos os gestores
const [gestores] = await conn.execute(`
  SELECT g.id, g.userId, u.name, u.email, u.openId
  FROM gestores g
  JOIN users u ON g.userId = u.id
`);

console.log('\nGestores:');
console.table(gestores);

await conn.end();
