import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Listar lojas de teste
const [testLojas] = await connection.execute(`
  SELECT id, nome FROM lojas 
  WHERE nome LIKE '%teste%' OR nome LIKE '%test%' OR nome LIKE '%Teste%' OR nome LIKE '%Test%'
  ORDER BY id
`);

console.log('=== LOJAS DE TESTE ===');
console.log('Total:', testLojas.length);
testLojas.forEach(l => console.log(`ID: ${l.id}, Nome: ${l.nome}`));

// Listar gestores de teste
const [testGestores] = await connection.execute(`
  SELECT g.id, u.name, u.email FROM gestores g
  JOIN users u ON g.userId = u.id
  WHERE u.name LIKE '%teste%' OR u.name LIKE '%test%' OR u.name LIKE '%Teste%' OR u.name LIKE '%Test%'
  ORDER BY g.id
`);

console.log('\n=== GESTORES DE TESTE ===');
console.log('Total:', testGestores.length);
testGestores.forEach(g => console.log(`ID: ${g.id}, Nome: ${g.name}, Email: ${g.email}`));

// Listar users de teste
const [testUsers] = await connection.execute(`
  SELECT id, name, email, role FROM users 
  WHERE name LIKE '%teste%' OR name LIKE '%test%' OR name LIKE '%Teste%' OR name LIKE '%Test%'
  ORDER BY id
`);

console.log('\n=== USERS DE TESTE ===');
console.log('Total:', testUsers.length);
testUsers.forEach(u => console.log(`ID: ${u.id}, Nome: ${u.name}, Email: ${u.email}, Role: ${u.role}`));

await connection.end();
