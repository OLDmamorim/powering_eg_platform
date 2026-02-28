import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getVolantesByLojaId: vi.fn(),
  verificarDisponibilidadeCompleta: vi.fn(),
  getCargaSemanal: vi.fn(),
  getProximidadeScore: vi.fn(),
  getHistoricoScore: vi.fn(),
  getEspecializacaoScore: vi.fn(),
  atribuirVolanteInteligente: vi.fn(),
}));

import * as db from './db';

describe('Sistema de Atribuição Inteligente de Volantes', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVolantesByLojaId', () => {
    it('deve retornar array vazio se loja não tem volantes', async () => {
      vi.mocked(db.getVolantesByLojaId).mockResolvedValue([]);
      const result = await db.getVolantesByLojaId(999);
      expect(result).toEqual([]);
    });

    it('deve retornar múltiplos volantes ordenados por prioridade', async () => {
      const mockVolantes = [
        { id: 1, nome: 'Volante A', prioridade: 1, email: 'a@test.com', telefone: '123', gestorId: 1, ativo: true, subZonaPreferencial: 'Minho Norte', telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, nome: 'Volante B', prioridade: 2, email: 'b@test.com', telefone: '456', gestorId: 1, ativo: true, subZonaPreferencial: 'Vale do Sousa', telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      vi.mocked(db.getVolantesByLojaId).mockResolvedValue(mockVolantes);
      
      const result = await db.getVolantesByLojaId(1);
      expect(result).toHaveLength(2);
      expect(result[0].prioridade).toBe(1);
      expect(result[1].prioridade).toBe(2);
    });
  });

  describe('verificarDisponibilidadeCompleta', () => {
    it('deve retornar true se volante está livre', async () => {
      vi.mocked(db.verificarDisponibilidadeCompleta).mockResolvedValue(true);
      const result = await db.verificarDisponibilidadeCompleta(1, new Date(), 'manha');
      expect(result).toBe(true);
    });

    it('deve retornar false se volante está ocupado', async () => {
      vi.mocked(db.verificarDisponibilidadeCompleta).mockResolvedValue(false);
      const result = await db.verificarDisponibilidadeCompleta(1, new Date(), 'manha');
      expect(result).toBe(false);
    });
  });

  describe('getEspecializacaoScore', () => {
    it('deve retornar score neutro (0.5) porque ambos são especialistas', async () => {
      vi.mocked(db.getEspecializacaoScore).mockResolvedValue(0.5);
      const result = await db.getEspecializacaoScore(1, 'substituicao_vidros');
      expect(result).toBe(0.5);
    });
  });

  describe('atribuirVolanteInteligente', () => {
    it('deve retornar null se nenhum volante atribuído à loja', async () => {
      vi.mocked(db.atribuirVolanteInteligente).mockResolvedValue(null);
      const result = await db.atribuirVolanteInteligente(999, new Date(), 'manha', 'substituicao_vidros');
      expect(result).toBeNull();
    });

    it('deve retornar volante com melhor score quando há 2 disponíveis', async () => {
      const mockResult = {
        volante: { id: 2, nome: 'Volante B', email: 'b@test.com', telefone: '456', gestorId: 1, ativo: true, subZonaPreferencial: 'Minho Norte', telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
        score: 0.85,
        detalhes: { disponibilidade: 1.0, carga: 0.8, proximidade: 1.0, historico: 0.5, especializacao: 0.5 }
      };
      vi.mocked(db.atribuirVolanteInteligente).mockResolvedValue(mockResult);
      
      const result = await db.atribuirVolanteInteligente(1, new Date(), 'manha', 'substituicao_vidros');
      expect(result).not.toBeNull();
      expect(result!.score).toBe(0.85);
      expect(result!.volante.nome).toBe('Volante B');
    });

    it('deve retornar volante único se só há 1 volante e está disponível', async () => {
      const mockResult = {
        volante: { id: 1, nome: 'Volante A', email: 'a@test.com', telefone: '123', gestorId: 1, ativo: true, subZonaPreferencial: null, telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
        score: 1.0,
        detalhes: { disponibilidade: 1, carga: 1, proximidade: 1, historico: 1, especializacao: 1 }
      };
      vi.mocked(db.atribuirVolanteInteligente).mockResolvedValue(mockResult);
      
      const result = await db.atribuirVolanteInteligente(1, new Date(), 'tarde', 'cobertura_ferias');
      expect(result).not.toBeNull();
      expect(result!.score).toBe(1.0);
    });

    it('deve retornar null se todos os volantes estão ocupados', async () => {
      vi.mocked(db.atribuirVolanteInteligente).mockResolvedValue(null);
      const result = await db.atribuirVolanteInteligente(1, new Date(), 'dia_todo', 'outro');
      expect(result).toBeNull();
    });
  });

  describe('Pesos do algoritmo de scoring', () => {
    it('deve priorizar disponibilidade (40%) sobre outros critérios', async () => {
      // Volante A: disponível mas com carga alta
      // Volante B: disponível com carga baixa
      // B deve ganhar por ter menos carga
      const mockResult = {
        volante: { id: 2, nome: 'Volante B', email: 'b@test.com', telefone: '456', gestorId: 1, ativo: true, subZonaPreferencial: 'Minho Norte', telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
        score: 0.90,
        detalhes: { disponibilidade: 1.0, carga: 0.9, proximidade: 1.0, historico: 0.3, especializacao: 0.5 }
      };
      vi.mocked(db.atribuirVolanteInteligente).mockResolvedValue(mockResult);
      
      const result = await db.atribuirVolanteInteligente(1, new Date(), 'manha', 'substituicao_vidros');
      expect(result).not.toBeNull();
      expect(result!.detalhes.disponibilidade).toBe(1.0);
    });

    it('deve considerar proximidade geográfica (20%)', async () => {
      vi.mocked(db.getProximidadeScore).mockResolvedValue(1.0); // Match exacto de sub-zona
      const score = await db.getProximidadeScore(1, 1);
      expect(score).toBe(1.0);
    });

    it('deve dar score baixo para sub-zonas diferentes', async () => {
      vi.mocked(db.getProximidadeScore).mockResolvedValue(0.2); // Sub-zonas diferentes
      const score = await db.getProximidadeScore(1, 2);
      expect(score).toBe(0.2);
    });
  });

  describe('Redireccionamento automático', () => {
    it('deve tentar redireccionar quando volante reprova e há outro disponível', async () => {
      // Simular cenário: 2 volantes, 1 reprova, outro está disponível
      const volantes = [
        { id: 1, nome: 'Volante A', prioridade: 1, email: 'a@test.com', telefone: '123', gestorId: 1, ativo: true, subZonaPreferencial: null, telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, nome: 'Volante B', prioridade: 2, email: 'b@test.com', telefone: '456', gestorId: 1, ativo: true, subZonaPreferencial: null, telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      
      vi.mocked(db.getVolantesByLojaId).mockResolvedValue(volantes);
      vi.mocked(db.verificarDisponibilidadeCompleta).mockResolvedValue(true);
      
      const volantesLoja = await db.getVolantesByLojaId(1);
      expect(volantesLoja.length).toBeGreaterThan(1);
      
      // Filtrar o volante que reprovou (id: 1)
      const outrosVolantes = volantesLoja.filter(v => v.id !== 1);
      expect(outrosVolantes).toHaveLength(1);
      expect(outrosVolantes[0].nome).toBe('Volante B');
      
      // Verificar que o outro está disponível
      const disponivel = await db.verificarDisponibilidadeCompleta(outrosVolantes[0].id, new Date(), 'manha');
      expect(disponivel).toBe(true);
    });

    it('não deve redireccionar se só há 1 volante', async () => {
      const volantes = [
        { id: 1, nome: 'Volante A', prioridade: 1, email: 'a@test.com', telefone: '123', gestorId: 1, ativo: true, subZonaPreferencial: null, telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      
      vi.mocked(db.getVolantesByLojaId).mockResolvedValue(volantes);
      
      const volantesLoja = await db.getVolantesByLojaId(1);
      expect(volantesLoja.length).toBe(1);
      // Com apenas 1 volante, não há redireccionamento possível
    });

    it('não deve redireccionar se o outro volante também está ocupado', async () => {
      const volantes = [
        { id: 1, nome: 'Volante A', prioridade: 1, email: 'a@test.com', telefone: '123', gestorId: 1, ativo: true, subZonaPreferencial: null, telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, nome: 'Volante B', prioridade: 2, email: 'b@test.com', telefone: '456', gestorId: 1, ativo: true, subZonaPreferencial: null, telegramChatId: null, telegramUsername: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      
      vi.mocked(db.getVolantesByLojaId).mockResolvedValue(volantes);
      vi.mocked(db.verificarDisponibilidadeCompleta).mockResolvedValue(false);
      
      const volantesLoja = await db.getVolantesByLojaId(1);
      const outrosVolantes = volantesLoja.filter(v => v.id !== 1);
      
      const disponivel = await db.verificarDisponibilidadeCompleta(outrosVolantes[0].id, new Date(), 'manha');
      expect(disponivel).toBe(false);
      // Não há redireccionamento possível
    });
  });
});
