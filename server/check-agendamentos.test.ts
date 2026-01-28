import { describe, it } from 'vitest';
import { getDb } from './db';
import { agendamentosVolante, volantes, tokensVolante } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

describe('Verificar Agendamentos na BD', () => {
  it('deve listar todos os agendamentos', async () => {
    const db = await getDb();
    if (!db) {
      console.log('Erro: não foi possível conectar à BD');
      return;
    }
    
    const agendamentos = await db
      .select({
        id: agendamentosVolante.id,
        volanteId: agendamentosVolante.volanteId,
        lojaId: agendamentosVolante.lojaId,
        data: agendamentosVolante.data,
        periodo: agendamentosVolante.agendamento_volante_periodo,
        titulo: agendamentosVolante.titulo,
        createdAt: agendamentosVolante.createdAt,
      })
      .from(agendamentosVolante)
      .orderBy(desc(agendamentosVolante.createdAt))
      .limit(15);
    
    console.log('\\n=== AGENDAMENTOS NA BD ===');
    console.log('Total encontrados:', agendamentos.length);
    for (const a of agendamentos) {
      console.log(`ID: ${a.id} | Volante: ${a.volanteId} | Loja: ${a.lojaId || 'Pessoal'} | Data: ${a.data?.toISOString().split('T')[0]} | Período: ${a.periodo} | Título: ${a.titulo || '-'}`);
    }
  });

  it('deve listar todos os volantes e seus tokens', async () => {
    const db = await getDb();
    if (!db) {
      console.log('Erro: não foi possível conectar à BD');
      return;
    }
    
    const volantesList = await db
      .select({
        id: volantes.id,
        nome: volantes.nome,
        email: volantes.email,
      })
      .from(volantes)
      .limit(10);
    
    console.log('\\n=== VOLANTES ===');
    for (const v of volantesList) {
      console.log(`ID: ${v.id} | Nome: ${v.nome} | Email: ${v.email}`);
      
      // Buscar tokens deste volante
      const tokens = await db
        .select()
        .from(tokensVolante)
        .where(eq(tokensVolante.volanteId, v.id));
      
      for (const t of tokens) {
        console.log(`  Token: ${t.token.substring(0, 30)}... | Ativo: ${t.ativo}`);
      }
    }
  });
});
