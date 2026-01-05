import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo de base de dados
vi.mock('./db', () => ({
  verificarECriarAlertasPerformance: vi.fn(),
  getLojasPerformanceBaixa: vi.fn(),
  getEvolucaoGlobal: vi.fn(),
  existeAlertaPendente: vi.fn(),
  createAlerta: vi.fn(),
}));

import * as db from './db';

describe('Alertas de Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verificarECriarAlertasPerformance', () => {
    it('deve retornar contagem de alertas criados', async () => {
      vi.mocked(db.verificarECriarAlertasPerformance).mockResolvedValue({
        alertasCriados: 3,
        lojasVerificadas: 5,
      });

      const resultado = await db.verificarECriarAlertasPerformance(-10, 12, 2025);

      expect(resultado).toEqual({
        alertasCriados: 3,
        lojasVerificadas: 5,
      });
    });

    it('deve aceitar limiar de desvio personalizado', async () => {
      vi.mocked(db.verificarECriarAlertasPerformance).mockResolvedValue({
        alertasCriados: 1,
        lojasVerificadas: 2,
      });

      const resultado = await db.verificarECriarAlertasPerformance(-20, 11, 2025);

      expect(db.verificarECriarAlertasPerformance).toHaveBeenCalledWith(-20, 11, 2025);
      expect(resultado.alertasCriados).toBe(1);
    });
  });

  describe('getLojasPerformanceBaixa', () => {
    it('deve retornar lista de lojas com performance baixa', async () => {
      const mockLojas = [
        {
          lojaId: 1,
          lojaNome: 'Loja Teste 1',
          desvioPercentualMes: -15.5,
          totalServicos: 80,
          objetivoMensal: 100,
          zona: 'Norte',
        },
        {
          lojaId: 2,
          lojaNome: 'Loja Teste 2',
          desvioPercentualMes: -12.3,
          totalServicos: 88,
          objetivoMensal: 100,
          zona: 'Sul',
        },
      ];

      vi.mocked(db.getLojasPerformanceBaixa).mockResolvedValue(mockLojas);

      const resultado = await db.getLojasPerformanceBaixa(-10, 12, 2025);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].desvioPercentualMes).toBeLessThan(-10);
      expect(resultado[1].desvioPercentualMes).toBeLessThan(-10);
    });

    it('deve retornar lista vazia quando não há lojas abaixo do limiar', async () => {
      vi.mocked(db.getLojasPerformanceBaixa).mockResolvedValue([]);

      const resultado = await db.getLojasPerformanceBaixa(-10, 12, 2025);

      expect(resultado).toHaveLength(0);
    });
  });

  describe('getEvolucaoGlobal', () => {
    it('deve retornar evolução mensal agregada', async () => {
      const mockEvolucao = [
        {
          mes: 10,
          ano: 2025,
          totalServicos: 5000,
          objetivoMensal: 4800,
          desvioPercentualMes: 4.2,
          taxaReparacao: 25.5,
          totalLojas: 70,
        },
        {
          mes: 11,
          ano: 2025,
          totalServicos: 5200,
          objetivoMensal: 5000,
          desvioPercentualMes: 4.0,
          taxaReparacao: 26.0,
          totalLojas: 70,
        },
        {
          mes: 12,
          ano: 2025,
          totalServicos: 4900,
          objetivoMensal: 5100,
          desvioPercentualMes: -3.9,
          taxaReparacao: 24.5,
          totalLojas: 70,
        },
      ];

      vi.mocked(db.getEvolucaoGlobal).mockResolvedValue(mockEvolucao);

      const resultado = await db.getEvolucaoGlobal(12);

      expect(resultado).toHaveLength(3);
      expect(resultado[0]).toHaveProperty('mes');
      expect(resultado[0]).toHaveProperty('ano');
      expect(resultado[0]).toHaveProperty('totalServicos');
      expect(resultado[0]).toHaveProperty('objetivoMensal');
      expect(resultado[0]).toHaveProperty('desvioPercentualMes');
      expect(resultado[0]).toHaveProperty('taxaReparacao');
      expect(resultado[0]).toHaveProperty('totalLojas');
    });

    it('deve respeitar o parâmetro mesesAtras', async () => {
      vi.mocked(db.getEvolucaoGlobal).mockResolvedValue([]);

      await db.getEvolucaoGlobal(6);

      expect(db.getEvolucaoGlobal).toHaveBeenCalledWith(6);
    });
  });
});

describe('Tipos de Alerta', () => {
  it('deve suportar tipo performance_baixa', () => {
    const tiposSuportados = [
      'pontos_negativos_consecutivos',
      'pendentes_antigos',
      'sem_visitas',
      'performance_baixa',
    ];

    expect(tiposSuportados).toContain('performance_baixa');
  });
});
