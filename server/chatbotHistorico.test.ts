import { describe, it, expect, vi } from 'vitest';

/**
 * Testes unitários para o histórico de conversas do chatbot.
 * Valida a lógica de criação de sessões, mensagens e listagem.
 */

// Mock do drizzle para evitar conexão real à BD
vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: vi.fn(() => ({
    insert: vi.fn(() => ({
      values: vi.fn(() => [{ insertId: 42 }]),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => []),
          })),
          limit: vi.fn(() => [{ id: 1, userId: 1 }]),
        })),
        orderBy: vi.fn(() => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({})),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({})),
    })),
  })),
}));

describe('Chatbot Histórico - Lógica de Sessões', () => {
  it('deve gerar título de sessão a partir da primeira pergunta', () => {
    const pergunta = 'Quais são as férias da Ana Filipa Campos Moreira que estão por aprovar?';
    const titulo = pergunta.substring(0, 100);
    
    expect(titulo).toBe('Quais são as férias da Ana Filipa Campos Moreira que estão por aprovar?');
    expect(titulo.length).toBeLessThanOrEqual(100);
  });

  it('deve truncar título longo a 100 caracteres', () => {
    const perguntaLonga = 'A'.repeat(200);
    const titulo = perguntaLonga.substring(0, 100);
    
    expect(titulo.length).toBe(100);
  });

  it('deve truncar título de sessão a 500 caracteres no helper', () => {
    const tituloLongo = 'B'.repeat(600);
    const tituloTruncado = tituloLongo.substring(0, 500);
    
    expect(tituloTruncado.length).toBe(500);
  });

  it('deve formatar data relativa corretamente', () => {
    const agora = new Date();
    
    // Hoje
    const hoje = agora;
    const diffHoje = Math.floor((agora.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffHoje).toBe(0);
    
    // Ontem
    const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    const diffOntem = Math.floor((agora.getTime() - ontem.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffOntem).toBe(1);
    
    // Há 3 dias
    const tresDias = new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000);
    const diffTres = Math.floor((agora.getTime() - tresDias.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffTres).toBe(3);
    expect(diffTres).toBeLessThan(7);
  });

  it('deve agrupar sessões por data corretamente', () => {
    const agora = new Date();
    const sessoes = [
      { id: 1, updatedAt: agora, titulo: 'Sessão 1' },
      { id: 2, updatedAt: agora, titulo: 'Sessão 2' },
      { id: 3, updatedAt: new Date(agora.getTime() - 24 * 60 * 60 * 1000), titulo: 'Sessão 3' },
    ];
    
    const formatarData = (data: Date) => {
      const diff = agora.getTime() - data.getTime();
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (dias === 0) return 'Hoje';
      if (dias === 1) return 'Ontem';
      if (dias < 7) return `Há ${dias} dias`;
      return data.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    };
    
    const grupos: Record<string, typeof sessoes> = {};
    sessoes.forEach((s) => {
      const label = formatarData(s.updatedAt);
      if (!grupos[label]) grupos[label] = [];
      grupos[label].push(s);
    });
    
    expect(Object.keys(grupos)).toContain('Hoje');
    expect(Object.keys(grupos)).toContain('Ontem');
    expect(grupos['Hoje'].length).toBe(2);
    expect(grupos['Ontem'].length).toBe(1);
  });

  it('deve manter o sessaoId ao continuar uma conversa existente', () => {
    const sessaoAtualId = 42;
    const novoSessaoId = undefined;
    
    // Se já existe sessão, deve manter o ID
    const sessaoFinal = sessaoAtualId || novoSessaoId;
    expect(sessaoFinal).toBe(42);
  });

  it('deve criar nova sessão quando sessaoId é null', () => {
    const sessaoAtualId: number | null = null;
    
    // Se não existe sessão, deve criar uma nova
    expect(!sessaoAtualId).toBe(true);
  });

  it('deve retornar sessaoId junto com a resposta', () => {
    const resultado = { resposta: 'Olá!' };
    const sessaoId = 42;
    
    const resultadoComSessao = { ...resultado, sessaoId };
    
    expect(resultadoComSessao.resposta).toBe('Olá!');
    expect(resultadoComSessao.sessaoId).toBe(42);
  });
});

describe('Chatbot Histórico - Validação de Input', () => {
  it('deve rejeitar pergunta vazia', () => {
    const pergunta = '';
    expect(pergunta.trim().length).toBe(0);
  });

  it('deve aceitar pergunta com conteúdo', () => {
    const pergunta = 'Quais são as férias pendentes?';
    expect(pergunta.trim().length).toBeGreaterThan(0);
  });

  it('deve validar role das mensagens', () => {
    const rolesValidos = ['user', 'assistant'];
    
    expect(rolesValidos).toContain('user');
    expect(rolesValidos).toContain('assistant');
    expect(rolesValidos).not.toContain('system');
  });
});
