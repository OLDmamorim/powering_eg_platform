import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Verificar Volante 2', () => {
  it('deve verificar agendamentos do volante 2 em janeiro 2026', async () => {
    const agendamentos = await db.getAgendamentosVolanteByMonth(2, 2026, 1);
    console.log('\\n=== AGENDAMENTOS VOLANTE 2 - JAN 2026 ===');
    console.log('Total:', agendamentos.length);
    for (const a of agendamentos) {
      console.log(`ID: ${a.id} | Data: ${a.data?.toISOString().split('T')[0]} | Período: ${a.agendamento_volante_periodo} | Loja: ${a.loja?.nome || 'Pessoal'}`);
    }
    expect(agendamentos.length).toBeGreaterThan(0);
  });

  it('deve verificar estado completo do mês para volante 2', async () => {
    const estadoMes = await db.getEstadoCompletoDoMes(2, 2026, 1);
    console.log('\\n=== ESTADO DO MÊS VOLANTE 2 - JAN 2026 ===');
    console.log('Dias com dados:', estadoMes.size);
    
    for (const [data, estado] of estadoMes) {
      if (estado.agendamentos.length > 0 || estado.pedidos.length > 0 || estado.bloqueios.length > 0) {
        console.log(`${data}: ${estado.estado}`);
        console.log(`  Agendamentos: ${estado.agendamentos.length}`);
        console.log(`  Pedidos: ${estado.pedidos.length}`);
        console.log(`  Bloqueios: ${estado.bloqueios.length}`);
      }
    }
  });

  it('deve validar o token do volante 2', async () => {
    const token = 'ZLBXf3Rfqh455bRfsHIytC0xaovesb';
    // Nota: o token pode estar truncado, vou buscar o token completo
    
    // Primeiro, buscar o token completo
    const { getDb } = await import('./db');
    const dbConn = await getDb();
    if (!dbConn) return;
    
    const { tokensVolante } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');
    
    const tokens = await dbConn
      .select()
      .from(tokensVolante)
      .where(eq(tokensVolante.volanteId, 2));
    
    if (tokens.length > 0) {
      const tokenCompleto = tokens[0].token;
      console.log('\\n=== TOKEN VOLANTE 2 ===');
      console.log('Token completo:', tokenCompleto);
      
      const tokenData = await db.validateTokenVolante(tokenCompleto);
      console.log('Token válido:', tokenData ? 'Sim' : 'Não');
      console.log('Volante:', tokenData?.volante?.nome);
    }
  });
});
