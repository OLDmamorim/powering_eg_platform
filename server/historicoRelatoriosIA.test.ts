import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Histórico de Relatórios IA por Categorias', () => {
  it('deve salvar e listar relatórios IA gerados', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: 'admin', openId: 'test', name: 'Test Admin', email: 'admin@test.com' }
    });

    // Gerar relatório IA (isso salva automaticamente)
    const resultado = await caller.categorizacao.gerarRelatorioIA();
    expect(resultado.relatorio).toBeTruthy();
    expect(typeof resultado.relatorio).toBe('string');

    // Listar histórico
    const historico = await caller.categorizacao.getHistoricoRelatoriosIA();
    expect(Array.isArray(historico)).toBe(true);
    expect(historico.length).toBeGreaterThan(0);
    
    // Verificar estrutura do primeiro relatório
    const primeiroRelatorio = historico[0];
    expect(primeiroRelatorio).toHaveProperty('id');
    expect(primeiroRelatorio).toHaveProperty('conteudo');
    expect(primeiroRelatorio).toHaveProperty('geradoPor');
    expect(primeiroRelatorio).toHaveProperty('geradoPorNome');
    expect(primeiroRelatorio).toHaveProperty('createdAt');
    expect(primeiroRelatorio).toHaveProperty('versao');
  }, 60000); // 60s timeout para chamada IA

  it('deve ordenar histórico por data DESC (mais recente primeiro)', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: 'admin', openId: 'test', name: 'Test Admin', email: 'admin@test.com' }
    });

    const historico = await caller.categorizacao.getHistoricoRelatoriosIA();
    
    if (historico.length > 1) {
      for (let i = 0; i < historico.length - 1; i++) {
        const dataAtual = new Date(historico[i].createdAt).getTime();
        const dataProxima = new Date(historico[i + 1].createdAt).getTime();
        expect(dataAtual).toBeGreaterThanOrEqual(dataProxima);
      }
    }
  });
});
