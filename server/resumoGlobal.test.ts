import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('Resumo Global', () => {

  it('deve gerar resumo global e retornar estrutura válida', async () => {
    // Testar a função diretamente sem middleware
    const { gerarResumoGlobal } = await import('./resumoGlobalService');
    const resumo = await gerarResumoGlobal(1);

    expect(resumo).toBeDefined();
    expect(resumo.resumoExecutivo).toBeDefined();
    expect(typeof resumo.resumoExecutivo).toBe('string');
    expect(resumo.pontosPositivos).toBeInstanceOf(Array);
    expect(resumo.pontosNegativos).toBeInstanceOf(Array);
    expect(resumo.acoesRecomendadas).toBeInstanceOf(Array);
    expect(resumo.insights).toBeInstanceOf(Array);
    expect(resumo.estatisticas).toBeDefined();
    expect(typeof resumo.estatisticas.totalVisitas).toBe('number');
    expect(typeof resumo.estatisticas.pendentesAtivos).toBe('number');
    expect(typeof resumo.estatisticas.lojasVisitadas).toBe('number');
    expect(typeof resumo.estatisticas.taxaResolucao).toBe('number');
    expect(resumo.estatisticas.taxaResolucao).toBeGreaterThanOrEqual(0);
    expect(resumo.estatisticas.taxaResolucao).toBeLessThanOrEqual(100);
  }, 30000); // 30 segundos timeout para chamada IA

  it('deve rejeitar acesso de não-gestor', async () => {
    const ctx: TrpcContext = {
      user: {
        id: 999,
        openId: 'test-non-gestor',
        name: 'Non Gestor',
        email: 'non-gestor@test.com',
        role: 'user', // não é gestor
      },
    };

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.resumoGlobal.gerar()).rejects.toThrow();
  });
});
