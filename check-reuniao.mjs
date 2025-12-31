import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { reunioesQuinzenais } from './drizzle/schema.ts';
import { eq, desc } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const rows = await db.select().from(reunioesQuinzenais).where(eq(reunioesQuinzenais.estado, 'enviada')).orderBy(desc(reunioesQuinzenais.id)).limit(5);

console.log('Reuniões enviadas:');
rows.forEach(r => {
  console.log('\n--- Reunião ID:', r.id, '---');
  console.log('Loja ID:', r.lojaId);
  console.log('Estado:', r.estado);
  console.log('Participantes:', r.participantes);
  console.log('Temas Discutidos:', r.temasDiscutidos || '(vazio)');
  console.log('Decisões Tomadas:', r.decisoesTomadas || '(vazio)');
  console.log('Análise Resultados:', r.analiseResultados || '(vazio)');
  console.log('Planos de Ação:', r.planosAcao || '(vazio)');
  console.log('Observações:', r.observacoes || '(vazio)');
});

await connection.end();
