import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('🔍 Investigando nomes na base de dados...\n');

// Buscar todos os gestores com seus users
const [allGestores] = await connection.query(`
  SELECT 
    g.id as gestorId,
    g.userId,
    u.name as userName,
    u.email as userEmail,
    u.openId as userOpenId
  FROM gestores g
  INNER JOIN users u ON g.userId = u.id
`);

console.log(`📊 Total de gestores encontrados: ${allGestores.length}\n`);

// Identificar users com nomes que parecem ser parte do email
const problemUsers = allGestores.filter(g => {
  const name = g.userName || '';
  const email = g.userEmail || '';
  const emailPrefix = email.split('@')[0];
  
  // Se o nome é exatamente o prefixo do email, é um problema
  return name === emailPrefix || name.toLowerCase() === emailPrefix.toLowerCase();
});

console.log(`❌ Users com nomes incorretos (parte do email): ${problemUsers.length}\n`);

if (problemUsers.length > 0) {
  console.log('Lista de users afetados:');
  problemUsers.forEach(u => {
    console.log(`  - ID: ${u.userId}, Nome atual: "${u.userName}", Email: ${u.userEmail}`);
  });
  
  console.log('\n⚠️  ATENÇÃO: Estes users precisam ter seus nomes corrigidos manualmente.');
  console.log('   O nome correto deve ser fornecido pelo administrador.\n');
}

// Verificar especificamente o user mamorim@expressglass.pt
const mamorimUser = allGestores.find(g => g.userEmail === 'mamorim@expressglass.pt');
if (mamorimUser) {
  console.log('📧 User mamorim@expressglass.pt encontrado:');
  console.log(`   ID: ${mamorimUser.userId}`);
  console.log(`   Nome atual: "${mamorimUser.userName}"`);
  console.log(`   Email: ${mamorimUser.userEmail}`);
  console.log(`   OpenID: ${mamorimUser.userOpenId}`);
  console.log(`   Gestor ID: ${mamorimUser.gestorId}\n`);
  
  // Verificar se há um nome "original" salvo em algum lugar
  console.log('💡 Para corrigir, execute:');
  console.log(`   UPDATE users SET name = "Nome Completo Correto" WHERE id = ${mamorimUser.userId};\n`);
}

await connection.end();
console.log('✅ Investigação concluída.');
