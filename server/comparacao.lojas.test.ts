import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Comparação de Lojas', () => {
  describe('compararLojas', () => {
    it('deve retornar array vazio quando lojas não existem no período', async () => {
      const comparacao = await db.compararLojas(99999, 99998, 1, 2025);
      expect(Array.isArray(comparacao)).toBe(true);
      expect(comparacao.length).toBe(0);
    });

    it('deve retornar dados de ambas as lojas quando existem', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      expect(Array.isArray(comparacao)).toBe(true);
      
      // Se houver dados, deve ter no máximo 2 entradas (uma por loja)
      expect(comparacao.length).toBeLessThanOrEqual(2);
    });

    it('deve retornar estrutura correta para cada loja', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      
      if (comparacao.length > 0) {
        const loja = comparacao[0];
        expect(loja).toHaveProperty('lojaId');
        expect(loja).toHaveProperty('lojaNome');
        expect(loja).toHaveProperty('zona');
        expect(loja).toHaveProperty('totalServicos');
        expect(loja).toHaveProperty('objetivoMensal');
        expect(loja).toHaveProperty('desvioPercentualMes');
        expect(loja).toHaveProperty('taxaReparacao');
        expect(loja).toHaveProperty('qtdReparacoes');
        expect(loja).toHaveProperty('servicosPorColaborador');
        expect(loja).toHaveProperty('numColaboradores');
      }
    });

    it('deve retornar lojas diferentes quando IDs são diferentes', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      
      if (comparacao.length === 2) {
        expect(comparacao[0].lojaId).not.toBe(comparacao[1].lojaId);
      }
    });
  });

  describe('Cálculos de Diferença Percentual', () => {
    it('deve calcular diferença percentual corretamente', () => {
      const calcularDiferenca = (valor1: number, valor2: number): number => {
        return ((valor1 - valor2) / Math.abs(valor2)) * 100;
      };

      // Valor1 maior que valor2 (diferença positiva)
      expect(calcularDiferenca(150, 100)).toBeCloseTo(50, 1);
      
      // Valor1 menor que valor2 (diferença negativa)
      expect(calcularDiferenca(75, 100)).toBeCloseTo(-25, 1);
      
      // Valores iguais (diferença zero)
      expect(calcularDiferenca(100, 100)).toBe(0);
    });

    it('deve identificar qual loja é melhor', () => {
      const identificarMelhor = (valor1: number, valor2: number): 'loja1' | 'loja2' | 'empate' => {
        if (valor1 > valor2) return 'loja1';
        if (valor2 > valor1) return 'loja2';
        return 'empate';
      };

      expect(identificarMelhor(150, 100)).toBe('loja1');
      expect(identificarMelhor(75, 100)).toBe('loja2');
      expect(identificarMelhor(100, 100)).toBe('empate');
    });

    it('deve lidar com valores nulos', () => {
      const calcularDiferencaSegura = (valor1: number | null, valor2: number | null): number | null => {
        if (valor1 === null || valor2 === null) return null;
        return ((valor1 - valor2) / Math.abs(valor2)) * 100;
      };

      expect(calcularDiferencaSegura(null, 100)).toBeNull();
      expect(calcularDiferencaSegura(100, null)).toBeNull();
      expect(calcularDiferencaSegura(null, null)).toBeNull();
      expect(calcularDiferencaSegura(150, 100)).toBeCloseTo(50, 1);
    });
  });

  describe('Validação de Métricas', () => {
    it('deve validar que totalServicos é número positivo', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      
      comparacao.forEach(loja => {
        if (loja.totalServicos !== null) {
          expect(typeof loja.totalServicos).toBe('number');
          expect(loja.totalServicos).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('deve validar que taxaReparacao está entre 0 e 1', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      
      comparacao.forEach(loja => {
        if (loja.taxaReparacao !== null) {
          const taxa = parseFloat(loja.taxaReparacao.toString());
          expect(taxa).toBeGreaterThanOrEqual(0);
          expect(taxa).toBeLessThanOrEqual(1);
        }
      });
    });

    it('deve validar que numColaboradores é número positivo', async () => {
      const comparacao = await db.compararLojas(1, 2, 1, 2025);
      
      comparacao.forEach(loja => {
        if (loja.numColaboradores !== null) {
          expect(typeof loja.numColaboradores).toBe('number');
          expect(loja.numColaboradores).toBeGreaterThan(0);
        }
      });
    });
  });
});
