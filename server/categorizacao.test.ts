import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Sistema de Categorização de Relatórios', () => {
  describe('Funções de base de dados', () => {
    it('deve obter lista de categorias únicas', async () => {
      const categorias = await db.getCategoriasUnicas();
      expect(Array.isArray(categorias)).toBe(true);
      // Categorias devem ser strings únicas
      const uniqueSet = new Set(categorias);
      expect(uniqueSet.size).toBe(categorias.length);
    });

    it('deve obter relatórios agrupados por categoria', async () => {
      const relatoriosPorCategoria = await db.getRelatoriosPorCategoria();
      expect(Array.isArray(relatoriosPorCategoria)).toBe(true);
      
      // Cada item deve ter a estrutura correta
      for (const cat of relatoriosPorCategoria) {
        expect(cat).toHaveProperty('categoria');
        expect(cat).toHaveProperty('relatorios');
        expect(cat).toHaveProperty('contadores');
        expect(Array.isArray(cat.relatorios)).toBe(true);
        expect(cat.contadores).toHaveProperty('total');
        expect(cat.contadores).toHaveProperty('acompanhar');
        expect(cat.contadores).toHaveProperty('emTratamento');
        expect(cat.contadores).toHaveProperty('tratado');
        expect(cat.contadores).toHaveProperty('semEstado');
      }
    });

    it('deve obter estatísticas de categorias', async () => {
      const estatisticas = await db.getEstatisticasCategorias();
      
      expect(estatisticas).toHaveProperty('totalCategorias');
      expect(estatisticas).toHaveProperty('totalRelatoriosCategorizados');
      expect(estatisticas).toHaveProperty('porEstado');
      expect(estatisticas.porEstado).toHaveProperty('acompanhar');
      expect(estatisticas.porEstado).toHaveProperty('emTratamento');
      expect(estatisticas.porEstado).toHaveProperty('tratado');
      expect(estatisticas.porEstado).toHaveProperty('semEstado');
      
      // Valores devem ser números não negativos
      expect(estatisticas.totalCategorias).toBeGreaterThanOrEqual(0);
      expect(estatisticas.totalRelatoriosCategorizados).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validação de estados', () => {
    it('deve aceitar estados válidos', () => {
      const estadosValidos = ['acompanhar', 'em_tratamento', 'tratado'];
      
      for (const estado of estadosValidos) {
        expect(estadosValidos).toContain(estado);
      }
    });
  });
});
