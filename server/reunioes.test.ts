import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Sistema de Reuniões Operacionais', () => {
  it('deve ter endpoints de reuniões de gestores', () => {
    expect(appRouter.reunioesGestores).toBeDefined();
    expect(appRouter.reunioesGestores.criar).toBeDefined();
    expect(appRouter.reunioesGestores.editar).toBeDefined();
    expect(appRouter.reunioesGestores.listar).toBeDefined();
    expect(appRouter.reunioesGestores.getById).toBeDefined();
    expect(appRouter.reunioesGestores.atribuirAcoes).toBeDefined();
  });

  it('deve ter endpoints de reuniões de lojas', () => {
    expect(appRouter.reunioesLojas).toBeDefined();
    expect(appRouter.reunioesLojas.criar).toBeDefined();
    expect(appRouter.reunioesLojas.editar).toBeDefined();
    expect(appRouter.reunioesLojas.listar).toBeDefined();
    expect(appRouter.reunioesLojas.getById).toBeDefined();
    expect(appRouter.reunioesLojas.getMiniResumo).toBeDefined();
    expect(appRouter.reunioesLojas.atribuirAcoes).toBeDefined();
  });

  it('deve ter procedures de criação definidas', () => {
    const procedureGestores = appRouter.reunioesGestores.criar;
    const procedureLojas = appRouter.reunioesLojas.criar;
    expect(procedureGestores).toBeDefined();
    expect(procedureLojas).toBeDefined();
  });

  it('deve ter serviço de geração de resumo com IA', async () => {
    const { gerarResumoReuniaoComIA } = await import('./reuniaoService');
    expect(gerarResumoReuniaoComIA).toBeDefined();
    expect(typeof gerarResumoReuniaoComIA).toBe('function');
  });

  it('deve ter serviço de mini resumo de reunião anterior', async () => {
    const { gerarMiniResumoReuniaoAnterior } = await import('./reuniaoService');
    expect(gerarMiniResumoReuniaoAnterior).toBeDefined();
    expect(typeof gerarMiniResumoReuniaoAnterior).toBe('function');
  });

  it('deve ter funções CRUD no db.ts', async () => {
    const db = await import('./db');
    
    // Reuniões de Gestores
    expect(db.createReuniaoGestores).toBeDefined();
    expect(db.updateReuniaoGestores).toBeDefined();
    expect(db.getHistoricoReuniõesGestores).toBeDefined();
    expect(db.getReuniaoGestoresById).toBeDefined();
    
    // Reuniões de Lojas
    expect(db.createReuniaoLojas).toBeDefined();
    expect(db.updateReuniaoLojas).toBeDefined();
    expect(db.getHistoricoReuniõesLojas).toBeDefined();
    expect(db.getReuniaoLojasById).toBeDefined();
    expect(db.getUltimaReuniaoLoja).toBeDefined();
    
    // Ações
    expect(db.createAcaoReuniao).toBeDefined();
    expect(db.getAcoesReuniao).toBeDefined();
    expect(db.updateAcaoReuniao).toBeDefined();
  });
});
