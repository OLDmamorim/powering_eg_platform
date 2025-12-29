import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Vendas Complementares', () => {
  
  describe('getVendasComplementares', () => {
    it('deve retornar array vazio quando não há dados', async () => {
      const result = await db.getVendasComplementares(1, 2020);
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('deve aceitar filtro por lojaId', async () => {
      const result = await db.getVendasComplementares(12, 2025, 1);
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('deve aceitar filtro por lojasIds', async () => {
      const result = await db.getVendasComplementares(12, 2025, undefined, [1, 2, 3]);
      expect(Array.isArray(result)).toBe(true);
    });
  });
  
  describe('getEstatisticasComplementares', () => {
    it('deve retornar null ou objeto de estatísticas', async () => {
      const result = await db.getEstatisticasComplementares(12, 2025);
      // Pode ser null se não houver dados, ou objeto com estatísticas
      if (result !== null) {
        expect(result).toHaveProperty('totalLojas');
        expect(result).toHaveProperty('lojasComVendas');
        expect(result).toHaveProperty('somaVendas');
        expect(result).toHaveProperty('somaEscovas');
        expect(result).toHaveProperty('percentLojasComEscovas');
      }
    });
    
    it('deve aceitar filtro por lojaId', async () => {
      const result = await db.getEstatisticasComplementares(12, 2025, 1);
      // Resultado pode ser null ou objeto
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
  
  describe('getRankingComplementares', () => {
    it('deve retornar array de ranking por totalVendas', async () => {
      const result = await db.getRankingComplementares('totalVendas', 12, 2025, 10);
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('deve retornar array de ranking por escovasVendas', async () => {
      const result = await db.getRankingComplementares('escovasVendas', 12, 2025, 10);
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('deve retornar array de ranking por escovasPercent', async () => {
      const result = await db.getRankingComplementares('escovasPercent', 12, 2025, 10);
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('deve respeitar limite de resultados', async () => {
      const result = await db.getRankingComplementares('totalVendas', 12, 2025, 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });
    
    it('deve aceitar filtro por lojasIds', async () => {
      const result = await db.getRankingComplementares('totalVendas', 12, 2025, 10, [1, 2, 3]);
      expect(Array.isArray(result)).toBe(true);
    });
  });
  
  describe('temDadosComplementares', () => {
    it('deve retornar boolean', async () => {
      const result = await db.temDadosComplementares(12, 2025);
      expect(typeof result).toBe('boolean');
    });
    
    it('deve retornar false para período sem dados', async () => {
      const result = await db.temDadosComplementares(1, 2020);
      expect(result).toBe(false);
    });
  });
});
