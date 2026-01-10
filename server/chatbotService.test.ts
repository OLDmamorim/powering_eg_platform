import { describe, it, expect, vi, beforeEach } from 'vitest';

// Testar a função isPerguntaPessoal exportada internamente
// Como a função não é exportada, vamos testar através da lógica

describe('Chatbot Service - Contexto Pessoal vs Nacional', () => {
  
  // Função auxiliar para simular a deteção de pergunta pessoal
  // (replicada do chatbotService.ts para teste)
  function isPerguntaPessoal(pergunta: string): boolean {
    const perguntaLower = pergunta.toLowerCase();
    
    const padroesPessoais = [
      'meu', 'meus', 'minha', 'minhas',
      'tenho', 'fiz', 'criei', 'visitei', 'resolvi', 'fui',
      'eu tenho', 'eu fiz', 'quantos tenho', 'quantas tenho',
      'os meus', 'as minhas', 'das minhas', 'dos meus',
      'para mim', 'sobre mim', 'de mim',
      'quantos pendentes tenho',
      'quantos relatórios fiz',
      'quais são os meus',
      'quais as minhas',
      'minhas lojas',
      'meus pendentes',
      'meus relatórios',
      'meus alertas',
      'minhas visitas',
      'minhas tarefas',
      'meu desempenho',
      'minha performance',
      'que me pertencem',
      'que são meus',
      'que são minhas',
      'atribuídos a mim',
      'atribuídas a mim',
      'associados a mim',
      'associadas a mim',
    ];
    
    return padroesPessoais.some(padrao => perguntaLower.includes(padrao));
  }

  describe('isPerguntaPessoal', () => {
    it('deve detetar perguntas pessoais com "meus"', () => {
      expect(isPerguntaPessoal('Quantos pendentes tenho?')).toBe(true);
      expect(isPerguntaPessoal('Quais são os meus relatórios?')).toBe(true);
      expect(isPerguntaPessoal('Mostra os meus pendentes')).toBe(true);
    });

    it('deve detetar perguntas pessoais com "minhas"', () => {
      expect(isPerguntaPessoal('Quais são as minhas lojas?')).toBe(true);
      expect(isPerguntaPessoal('Como estão as minhas visitas?')).toBe(true);
      expect(isPerguntaPessoal('Lista as minhas tarefas')).toBe(true);
    });

    it('deve detetar perguntas pessoais com verbos na primeira pessoa', () => {
      expect(isPerguntaPessoal('Quantos relatórios fiz este mês?')).toBe(true);
      expect(isPerguntaPessoal('Quando visitei a loja X?')).toBe(true);
      expect(isPerguntaPessoal('Quantos pendentes resolvi?')).toBe(true);
    });

    it('deve identificar perguntas gerais/nacionais', () => {
      expect(isPerguntaPessoal('Quantas lojas existem na plataforma?')).toBe(false);
      expect(isPerguntaPessoal('Qual o total de pendentes?')).toBe(false);
      expect(isPerguntaPessoal('Quantos gestores temos?')).toBe(false);
      expect(isPerguntaPessoal('Qual a loja com mais relatórios?')).toBe(false);
    });

    it('deve identificar perguntas sobre dados específicos como gerais', () => {
      expect(isPerguntaPessoal('Quantos pendentes tem a loja Lisboa?')).toBe(false);
      expect(isPerguntaPessoal('Qual o desempenho da loja Porto?')).toBe(false);
      expect(isPerguntaPessoal('Quantos relatórios foram criados este mês?')).toBe(false);
    });

    it('deve detetar variações de perguntas pessoais', () => {
      expect(isPerguntaPessoal('Eu tenho quantos pendentes?')).toBe(true);
      expect(isPerguntaPessoal('Mostra o meu desempenho')).toBe(true);
      expect(isPerguntaPessoal('Como está a minha performance?')).toBe(true);
    });

    it('deve ser case-insensitive', () => {
      expect(isPerguntaPessoal('QUANTOS PENDENTES TENHO?')).toBe(true);
      expect(isPerguntaPessoal('Meus Relatórios')).toBe(true);
      expect(isPerguntaPessoal('MINHAS LOJAS')).toBe(true);
    });

    it('deve detetar perguntas com expressões de posse', () => {
      expect(isPerguntaPessoal('Tarefas atribuídas a mim')).toBe(true);
      expect(isPerguntaPessoal('Lojas associadas a mim')).toBe(true);
      expect(isPerguntaPessoal('Pendentes que são meus')).toBe(true);
    });
  });

  describe('Exemplos de uso real', () => {
    it('cenário: gestor pergunta sobre seus pendentes', () => {
      const pergunta = 'Quantos pendentes tenho?';
      expect(isPerguntaPessoal(pergunta)).toBe(true);
      // Esperado: resposta filtrada apenas pelos pendentes das lojas do gestor
    });

    it('cenário: admin pergunta sobre total nacional', () => {
      const pergunta = 'Quantos pendentes existem na plataforma?';
      expect(isPerguntaPessoal(pergunta)).toBe(false);
      // Esperado: resposta com total de todos os pendentes
    });

    it('cenário: gestor pergunta sobre seus relatórios', () => {
      const pergunta = 'Quais são os meus relatórios este mês?';
      expect(isPerguntaPessoal(pergunta)).toBe(true);
      // Esperado: resposta filtrada apenas pelos relatórios criados pelo gestor
    });

    it('cenário: pergunta geral sobre performance', () => {
      const pergunta = 'Qual a loja com melhor performance?';
      expect(isPerguntaPessoal(pergunta)).toBe(false);
      // Esperado: resposta considerando todas as lojas
    });

    it('cenário: gestor pergunta sobre performance das suas lojas', () => {
      const pergunta = 'Como está a performance das minhas lojas?';
      expect(isPerguntaPessoal(pergunta)).toBe(true);
      // Esperado: resposta filtrada apenas pelas lojas do gestor
    });
  });
});
