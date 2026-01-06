import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { gestores, users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });
  const db = drizzle(connection);
  
  const result = await db
    .select({
      id: gestores.id,
      userId: gestores.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(gestores)
    .innerJoin(users, eq(gestores.userId, users.id))
    .where(eq(users.role, 'gestor'));
    
  console.log('Gestores com role=gestor:');
  result.forEach(r => console.log(`  ID: ${r.id}, Nome: ${r.userName}, Email: ${r.userEmail}`));
  console.log(`\nTotal: ${result.length} gestores`);
  
  await connection.end();
}

main().catch(console.error);
