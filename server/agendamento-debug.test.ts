import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Debug Agendamentos Volante', () => {
  it('deve verificar tokens de volante existentes', async () => {
    // Buscar todos os volantes
    const volantes = await db.listarVolantes();
    console.log('Volantes encontrados:', volantes?.length || 0);
    
    if (volantes && volantes.length > 0) {
      for (const v of volantes.slice(0, 3)) {
        console.log(`Volante: ${v.nome} (ID: ${v.id})`);
        
        // Verificar tokens deste volante
        const tokens = await db.getTokensVolanteByVolanteId(v.id);
        console.log(`  Tokens: ${tokens?.length || 0}`);
        
        if (tokens && tokens.length > 0) {
          const token = tokens[0];
          console.log(`  Token: ${token.token.substring(0, 20)}... (ativo: ${token.ativo})`);
          
          // Validar o token
          const tokenData = await db.validateTokenVolante(token.token);
          console.log(`  Token válido: ${tokenData ? 'Sim' : 'Não'}`);
        }
      }
    }
  });

  it('deve verificar agendamentos existentes na base de dados', async () => {
    // Buscar agendamentos diretamente
    const agendamentos = await db.getAgendamentosVolanteByMonth(1, 2026, 1);
    console.log('Agendamentos volante 1, Jan 2026:', agendamentos.length);
    
    const agendamentos2 = await db.getAgendamentosVolanteByMonth(1, 2026, 2);
    console.log('Agendamentos volante 1, Fev 2026:', agendamentos2.length);
    
    // Verificar estado completo do mês
    const estadoMes = await db.getEstadoCompletoDoMes(1, 2026, 1);
    console.log('Estado do mês Jan 2026:');
    for (const [data, estado] of estadoMes) {
      if (estado.agendamentos.length > 0 || estado.pedidos.length > 0 || estado.bloqueios.length > 0) {
        console.log(`  ${data}: ${estado.estado} - Agendamentos: ${estado.agendamentos.length}, Pedidos: ${estado.pedidos.length}, Bloqueios: ${estado.bloqueios.length}`);
      }
    }
  });

  it('deve testar criação e listagem de agendamento', async () => {
    // Criar um agendamento para janeiro 2026
    const novoAgendamento = await db.criarAgendamentoVolante({
      volanteId: 1,
      lojaId: null,
      data: new Date('2026-01-30'),
      agendamento_volante_periodo: 'manha',
      agendamento_volante_tipo: null,
      titulo: 'Teste Debug',
      descricao: 'Teste para debug',
    });
    
    console.log('Agendamento criado:', novoAgendamento?.id);
    
    if (novoAgendamento) {
      // Verificar se aparece na listagem
      const agendamentos = await db.getAgendamentosVolanteByMonth(1, 2026, 1);
      console.log('Agendamentos após criação:', agendamentos.length);
      
      const encontrado = agendamentos.find(a => a.id === novoAgendamento.id);
      console.log('Agendamento encontrado na listagem:', encontrado ? 'Sim' : 'Não');
      
      // Verificar estado completo do mês
      const estadoMes = await db.getEstadoCompletoDoMes(1, 2026, 1);
      const estadoDia = estadoMes.get('2026-01-30');
      console.log('Estado do dia 30/01:', estadoDia?.estado);
      console.log('Agendamentos no dia 30/01:', estadoDia?.agendamentos.length);
      
      // Limpar
      await db.eliminarAgendamentoVolante(novoAgendamento.id, 1);
      console.log('Agendamento eliminado');
    }
  });
});
