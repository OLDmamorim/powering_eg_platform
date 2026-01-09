import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar utilizador
const [users] = await connection.execute("SELECT id, name, email, role FROM users WHERE email = 'mamorim@expressglass.pt'");
const user = users[0];
console.log('User mamorim@expressglass.pt:');
console.log('  ID:', user?.id);
console.log('  Role:', user?.role);

if (user) {
  // Verificar se existe gestor com este userId
  const [gestores] = await connection.execute("SELECT * FROM gestores WHERE userId = ?", [user.id]);
  console.log('\nGestor associado ao userId', user.id, ':');
  if (gestores.length > 0) {
    console.log('  Gestor ID:', gestores[0].id);
    console.log('  Nome:', gestores[0].nome);
    console.log('  Email:', gestores[0].email);
  } else {
    console.log('  NENHUM GESTOR ENCONTRADO!');
    
    // Verificar se existe gestor com o mesmo email
    const [gestoresByEmail] = await connection.execute("SELECT * FROM gestores WHERE email = ?", [user.email]);
    console.log('\nGestor com email', user.email, ':');
    if (gestoresByEmail.length > 0) {
      console.log('  Gestor ID:', gestoresByEmail[0].id);
      console.log('  Nome:', gestoresByEmail[0].nome);
      console.log('  UserId:', gestoresByEmail[0].userId);
    }
  }
}

await connection.end();
