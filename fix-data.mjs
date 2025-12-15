import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Corrigindo dados existentes ===\n');

// 1. Encontrar o user correto (com openId do Google) para expressglassminho@gmail.com
const [correctUser] = await conn.execute(`
  SELECT id, name, email, openId
  FROM users 
  WHERE email = 'expressglassminho@gmail.com' AND openId NOT LIKE 'pending-%'
`);

console.log('User correto (com openId Google):');
console.table(correctUser);

if (correctUser.length > 0) {
  const correctUserId = correctUser[0].id;
  
  // 2. Atualizar o gestor para apontar ao user correto
  console.log(`\nAtualizando gestor 30001 para userId ${correctUserId}...`);
  await conn.execute(`UPDATE gestores SET userId = ? WHERE id = 30001`, [correctUserId]);
  
  // 3. Eliminar o user antigo com openId pending
  console.log('Eliminando user antigo (420018) com openId pending...');
  await conn.execute(`DELETE FROM users WHERE id = 420018`);
  
  console.log('\n✅ Dados corrigidos com sucesso!');
} else {
  // Não há user com openId real, então vamos atualizar o existente
  console.log('Não há user com openId real. O gestor precisa fazer login primeiro.');
}

// Verificar resultado
const [result] = await conn.execute(`
  SELECT g.id as gestor_id, g.userId, u.name, u.email, u.openId
  FROM gestores g
  JOIN users u ON g.userId = u.id
  WHERE g.id = 30001
`);

console.log('\nGestor após correção:');
console.table(result);

await conn.end();
