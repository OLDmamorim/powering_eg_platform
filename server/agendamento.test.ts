import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Agendamentos Volante', () => {
  it('deve listar agendamentos existentes', async () => {
    // Verificar se há agendamentos na tabela
    const agendamentos = await db.getAgendamentosVolanteByMonth(1, 2026, 1);
    console.log('Agendamentos encontrados:', agendamentos.length);
    console.log('Dados:', JSON.stringify(agendamentos, null, 2));
    expect(Array.isArray(agendamentos)).toBe(true);
  });

  it('deve criar um agendamento de teste', async () => {
    const novoAgendamento = await db.criarAgendamentoVolante({
      volanteId: 1,
      lojaId: null, // compromisso pessoal
      data: new Date('2026-02-15'),
      agendamento_volante_periodo: 'manha',
      agendamento_volante_tipo: null,
      titulo: 'Teste de Agendamento',
      descricao: 'Teste criado pelo vitest',
    });
    
    console.log('Agendamento criado:', JSON.stringify(novoAgendamento, null, 2));
    
    expect(novoAgendamento).not.toBeNull();
    if (novoAgendamento) {
      expect(novoAgendamento.id).toBeGreaterThan(0);
      expect(novoAgendamento.titulo).toBe('Teste de Agendamento');
      
      // Limpar - eliminar o agendamento de teste
      await db.eliminarAgendamentoVolante(novoAgendamento.id, 1);
    }
  });

  it('deve verificar se o token do volante é válido', async () => {
    // Buscar um token de volante existente
    const tokens = await db.getTokensVolante();
    console.log('Tokens de volante:', tokens?.length || 0);
    
    if (tokens && tokens.length > 0) {
      const tokenData = await db.validateTokenVolante(tokens[0].token);
      console.log('Token válido:', tokenData ? 'Sim' : 'Não');
      console.log('Volante:', tokenData?.volante?.nome);
    }
  });
});
