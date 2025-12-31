import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const testUserIds = [240121, 2160129, 6450053, 6450054, 6450057, 6540184, 6540194, 6540201, 6900032];

// Verificar gestores
const gestores = await db.execute(sql`
  SELECT id, user_id FROM gestores WHERE user_id IN (${sql.raw(testUserIds.join(','))})
`);
console.log('Gestores associados:', JSON.stringify(gestores[0], null, 2));

// Verificar tarefas (todos)
const tarefas = await db.execute(sql`
  SELECT id, titulo, atribuido_a_user_id, criado_por_user_id FROM todos 
  WHERE atribuido_a_user_id IN (${sql.raw(testUserIds.join(','))})
     OR criado_por_user_id IN (${sql.raw(testUserIds.join(','))})
`);
console.log('Tarefas associadas:', JSON.stringify(tarefas[0], null, 2));

// Verificar relatórios livres
const relLivres = await db.execute(sql`
  SELECT id, gestor_id FROM relatorios_livres WHERE gestor_id IN (
    SELECT id FROM gestores WHERE user_id IN (${sql.raw(testUserIds.join(','))})
  )
`);
console.log('Relatórios livres:', JSON.stringify(relLivres[0], null, 2));

// Verificar relatórios completos
const relCompletos = await db.execute(sql`
  SELECT id, gestor_id FROM relatorios_completos WHERE gestor_id IN (
    SELECT id FROM gestores WHERE user_id IN (${sql.raw(testUserIds.join(','))})
  )
`);
console.log('Relatórios completos:', JSON.stringify(relCompletos[0], null, 2));

await connection.end();
