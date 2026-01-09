import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar utilizador
const [users] = await connection.execute("SELECT id, name, email, role FROM users WHERE email = 'mamorim@expressglass.pt'");
console.log('User mamorim@expressglass.pt:');
console.log(users);

if (users.length > 0) {
  const userId = users[0].id;
  console.log('\nUserId:', userId);
  
  // Verificar gestor
  const [gestores] = await connection.execute("SELECT id, userId FROM gestores WHERE userId = ?", [userId]);
  console.log('\nGestor associado:');
  console.log(gestores);
  
  if (gestores.length > 0) {
    const gestorId = gestores[0].id;
    console.log('\nGestorId:', gestorId);
    
    // Verificar relatórios
    const [livres] = await connection.execute("SELECT COUNT(*) as total FROM relatorios_livres WHERE gestorId = ?", [gestorId]);
    console.log('\nTotal relatórios livres:', livres[0].total);
    
    const [completos] = await connection.execute("SELECT COUNT(*) as total FROM relatorios_completos WHERE gestorId = ?", [gestorId]);
    console.log('Total relatórios completos:', completos[0].total);
  } else {
    console.log('\n!!! PROBLEMA: Este utilizador NÃO tem um gestor associado na tabela gestores !!!');
  }
}

await connection.end();
