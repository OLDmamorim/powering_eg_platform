import { getDb } from './server/_core/db.js';
import { agendamentosVolante } from './drizzle/schema.js';
import { desc } from 'drizzle-orm';

const db = await getDb();
if (!db) {
  console.error('Failed to connect to database');
  process.exit(1);
}

const agendamentos = await db.select().from(agendamentosVolante).orderBy(desc(agendamentosVolante.createdAt)).limit(5);

console.log('Últimos 5 agendamentos:');
agendamentos.forEach((a, i) => {
  console.log(`\n${i + 1}. ID: ${a.id}`);
  console.log(`   Volante ID: ${a.volanteId}`);
  console.log(`   Loja ID: ${a.lojaId}`);
  console.log(`   Data: ${a.data}`);
  console.log(`   Período: ${a.periodo}`);
  console.log(`   Tipo: ${a.tipoApoio}`);
  console.log(`   Título: ${a.titulo}`);
  console.log(`   Descrição: ${a.descricao}`);
  console.log(`   Criado em: ${a.createdAt}`);
});

process.exit(0);
