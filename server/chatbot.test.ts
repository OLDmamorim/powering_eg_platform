import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do invokeLLM
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn(),
}));

// Mock do db
vi.mock('./db', () => ({
  getAllLojas: vi.fn(),
  getPeriodosDisponiveis: vi.fn(),
  getResultadosMensais: vi.fn(),
  getEstatisticasPeriodo: vi.fn(),
  getRankingLojas: vi.fn(),
  getEvolucaoMensal: vi.fn(),
  getEvolucaoGlobal: vi.fn(),
}));

import { processarPergunta, getSugestoesPergunta } from './chatbotService';
import { invokeLLM } from './_core/llm';
import * as db from './db';

describe('Chatbot Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(db.getAllLojas).mockResolvedValue([
      { id: 1, nome: 'Viana do Castelo', email: null, contacto: null, minimoRelatoriosLivres: 0, minimoRelatoriosCompletos: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, nome: 'Braga', email: null, contacto: null, minimoRelatoriosLivres: 0, minimoRelatoriosCompletos: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, nome: 'Porto', email: null, contacto: null, minimoRelatoriosLivres: 0, minimoRelatoriosCompletos: 0, createdAt: new Date(), updatedAt: new Date() },
    ]);
    
    vi.mocked(db.getPeriodosDisponiveis).mockResolvedValue([
      { mes: 8, ano: 2025, label: 'Agosto 2025' },
      { mes: 7, ano: 2025, label: 'Julho 2025' },
    ]);
  });

  describe('processarPergunta', () => {
    it('deve processar pergunta sobre serviços de uma loja', async () => {
      // Mock da interpretação da IA
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              lojaNome: 'Viana do Castelo',
              mes: 8,
              ano: 2025,
              tipoConsulta: 'servicos',
              metrica: 'totalServicos',
              perguntaEntendida: true,
              resumoPergunta: 'Total de serviços da loja Viana em Agosto 2025',
            }),
          },
        }],
      } as any);
      
      // Mock dos dados
      vi.mocked(db.getResultadosMensais).mockResolvedValue([{
        lojaId: 1,
        lojaNome: 'Viana do Castelo',
        totalServicos: 150,
        objetivoMensal: 140,
        desvioPercentualMes: '0.0714',
        taxaReparacao: '0.22',
        qtdReparacoes: 33,
        servicosPorColaborador: '5.0',
        numColaboradores: 3,
      }] as any);
      
      // Mock da resposta final
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'A loja Viana do Castelo realizou 150 serviços em Agosto de 2025, superando o objetivo de 140 serviços em 7.1%.',
          },
        }],
      } as any);
      
      const resultado = await processarPergunta(
        'Quantos serviços fez Viana em Agosto?',
        [],
        1,
        'admin'
      );
      
      expect(resultado.resposta).toContain('Viana');
      expect(resultado.resposta).toContain('150');
    });

    it('deve retornar erro amigável quando não entende a pergunta', async () => {
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              perguntaEntendida: false,
              resumoPergunta: '',
            }),
          },
        }],
      } as any);
      
      const resultado = await processarPergunta(
        'xyz abc 123',
        [],
        1,
        'admin'
      );
      
      expect(resultado.resposta).toContain('entender');
    });

    it('deve lidar com erros de parsing JSON', async () => {
      vi.mocked(invokeLLM).mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'isto não é JSON válido',
          },
        }],
      } as any);
      
      const resultado = await processarPergunta(
        'Quantos serviços?',
        [],
        1,
        'admin'
      );
      
      expect(resultado.resposta).toContain('reformular');
    });
  });

  describe('getSugestoesPergunta', () => {
    it('deve retornar sugestões baseadas no período mais recente', async () => {
      const sugestoes = await getSugestoesPergunta();
      
      expect(sugestoes).toBeInstanceOf(Array);
      expect(sugestoes.length).toBeGreaterThan(0);
      expect(sugestoes.some(s => s.includes('agosto') || s.includes('Agosto'))).toBe(true);
    });

    it('deve retornar sugestões genéricas quando não há períodos', async () => {
      vi.mocked(db.getPeriodosDisponiveis).mockResolvedValue([]);
      
      const sugestoes = await getSugestoesPergunta();
      
      expect(sugestoes).toBeInstanceOf(Array);
      expect(sugestoes.length).toBeGreaterThan(0);
    });
  });
});
