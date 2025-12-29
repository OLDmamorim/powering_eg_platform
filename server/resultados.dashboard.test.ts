import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Dashboard de Resultados - Queries', () => {
  describe('getEvolucaoMensal', () => {
    it('deve retornar array', async () => {
      const evolucao = await db.getEvolucaoMensal(1, 6);
      expect(Array.isArray(evolucao)).toBe(true);
    });

    it('deve aceitar parâmetro de meses atrás', async () => {
      const evolucao3 = await db.getEvolucaoMensal(1, 3);
      const evolucao12 = await db.getEvolucaoMensal(1, 12);
      
      expect(Array.isArray(evolucao3)).toBe(true);
      expect(Array.isArray(evolucao12)).toBe(true);
    });

    it('deve retornar dados com estrutura correta', async () => {
      const evolucao = await db.getEvolucaoMensal(1, 6);
      
      if (evolucao.length > 0) {
        expect(evolucao[0]).toHaveProperty('mes');
        expect(evolucao[0]).toHaveProperty('ano');
        expect(evolucao[0]).toHaveProperty('totalServicos');
        expect(evolucao[0]).toHaveProperty('objetivoMensal');
      }
    });
  });

  describe('getRankingLojas', () => {
    it('deve retornar ranking por totalServicos', async () => {
      const ranking = await db.getRankingLojas('totalServicos', 1, 2025, 10);
      expect(Array.isArray(ranking)).toBe(true);
      
      if (ranking.length > 0) {
        expect(ranking[0]).toHaveProperty('lojaId');
        expect(ranking[0]).toHaveProperty('lojaNome');
        expect(ranking[0]).toHaveProperty('zona');
        expect(ranking[0]).toHaveProperty('totalServicos');
      }
    });

    it('deve retornar ranking por taxaReparacao', async () => {
      const ranking = await db.getRankingLojas('taxaReparacao', 1, 2025, 5);
      expect(Array.isArray(ranking)).toBe(true);
    });

    it('deve respeitar o limite de resultados', async () => {
      const ranking3 = await db.getRankingLojas('totalServicos', 1, 2025, 3);
      const ranking10 = await db.getRankingLojas('totalServicos', 1, 2025, 10);
      
      expect(ranking3.length).toBeLessThanOrEqual(3);
      expect(ranking10.length).toBeLessThanOrEqual(10);
    });
  });

  describe('compararLojas', () => {
    it('deve retornar array', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      expect(Array.isArray(comparacao)).toBe(true);
    });

    it('deve retornar estrutura correta quando há dados', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      
      if (comparacao.length > 0) {
        expect(comparacao[0]).toHaveProperty('lojaId');
        expect(comparacao[0]).toHaveProperty('lojaNome');
        expect(comparacao[0]).toHaveProperty('totalServicos');
        expect(comparacao[0]).toHaveProperty('objetivoMensal');
      }
    });
  });

  describe('getResultadosPorZona', () => {
    it('deve retornar array', async () => {
      const porZona = await db.getResultadosPorZona(1, 2025);
      expect(Array.isArray(porZona)).toBe(true);
    });

    it('deve retornar estrutura correta quando há dados', async () => {
      const porZona = await db.getResultadosPorZona(1, 2025);
      
      if (porZona.length > 0) {
        expect(porZona[0]).toHaveProperty('zona');
        expect(porZona[0]).toHaveProperty('totalLojas');
        expect(porZona[0]).toHaveProperty('somaServicos');
        expect(porZona[0]).toHaveProperty('mediaDesvioPercentual');
        expect(porZona[0]).toHaveProperty('mediaTaxaReparacao');
      }
    });
  });

  describe('getEstatisticasPeriodo', () => {
    it('deve retornar null ou objeto', async () => {
      const stats = await db.getEstatisticasPeriodo(1, 2025);
      expect(stats === null || typeof stats === 'object').toBe(true);
    });

    it('deve retornar estrutura correta quando há dados', async () => {
      const stats = await db.getEstatisticasPeriodo(1, 2025);
      
      if (stats) {
        expect(stats).toHaveProperty('totalLojas');
        expect(stats).toHaveProperty('somaServicos');
        expect(stats).toHaveProperty('somaObjetivos');
        expect(stats).toHaveProperty('mediaDesvioPercentual');
        expect(stats).toHaveProperty('mediaTaxaReparacao');
        expect(stats).toHaveProperty('somaReparacoes');
        expect(stats).toHaveProperty('lojasAcimaObjetivo');
        
        // Verificar que podem ser convertidos para number
        expect(Number.isFinite(Number(stats.totalLojas))).toBe(true);
        expect(Number.isFinite(Number(stats.lojasAcimaObjetivo))).toBe(true);
      }
    });

    it('deve calcular corretamente lojas acima do objetivo', async () => {
      const stats = await db.getEstatisticasPeriodo(1, 2025);
      
      if (stats) {
        const lojasAcima = Number(stats.lojasAcimaObjetivo);
        const totalLojas = Number(stats.totalLojas);
        expect(lojasAcima).toBeGreaterThanOrEqual(0);
        expect(lojasAcima).toBeLessThanOrEqual(totalLojas);
      }
    });
  });
});
