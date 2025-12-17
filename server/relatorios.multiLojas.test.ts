import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';
import type { TrpcContext } from './_core/context';

describe('Relatórios com Múltiplas Lojas', () => {
  let gestorCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let gestorId: number;
  let userId: number;
  let lojaId1: number;
  let lojaId2: number;
  let lojaId3: number;

  beforeAll(async () => {
    // Criar gestor
    const gestor = await db.createGestor(
      'Gestor Multi-Lojas Test',
      'gestor.multilojas@test.com'
    );
    gestorId = gestor.id;
    userId = gestor.userId;

    // Criar 3 lojas
    const loja1 = await db.createLoja({
      nome: 'Loja Multi 1',
      email: 'loja1@test.com',
    });
    const loja2 = await db.createLoja({
      nome: 'Loja Multi 2',
      email: 'loja2@test.com',
    });
    const loja3 = await db.createLoja({
      nome: 'Loja Multi 3',
      email: 'loja3@test.com',
    });
    lojaId1 = loja1.id;
    lojaId2 = loja2.id;
    lojaId3 = loja3.id;

    // Associar lojas ao gestor
    await db.associateGestorLoja(gestorId, lojaId1);
    await db.associateGestorLoja(gestorId, lojaId2);
    await db.associateGestorLoja(gestorId, lojaId3);

    // Criar contexto de gestor
    gestorCtx = {
      user: {
        id: userId,
        openId: `pending-${Date.now()}`,
        name: 'Gestor Multi-Lojas Test',
        email: 'gestor.multilojas@test.com',
        role: 'gestor',
        loginMethod: 'manus',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: gestorId,
        userId: userId,
      },
      req: {
        protocol: 'https',
        headers: {},
      } as TrpcContext['req'],
      res: {
        clearCookie: () => {},
      } as TrpcContext['res'],
    };
  });

  it('deve criar relatório livre com múltiplas lojas', async () => {
    const caller = appRouter.createCaller(gestorCtx);
    const relatorio = await caller.relatoriosLivres.create({
      lojasIds: [lojaId1, lojaId2, lojaId3],
      dataVisita: new Date(),
      descricao: 'Relatório para 3 lojas simultaneamente',
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeTypeOf('number');
    expect(relatorio.lojaId).toBe(lojaId1); // Primeira loja para compatibilidade
    expect(relatorio.lojasIds).toBeDefined();
    
    // Verificar que lojasIds contém as 3 lojas
    const lojasArray = JSON.parse(relatorio.lojasIds!);
    expect(lojasArray).toHaveLength(3);
    expect(lojasArray).toContain(lojaId1);
    expect(lojasArray).toContain(lojaId2);
    expect(lojasArray).toContain(lojaId3);
  });

  it('deve criar relatório completo com múltiplas lojas', async () => {
    const caller = appRouter.createCaller(gestorCtx);
    const relatorio = await caller.relatoriosCompletos.create({
      lojasIds: [lojaId1, lojaId2],
      dataVisita: new Date(),
      resumoSupervisao: 'Supervisão de 2 lojas',
      pontosPositivos: 'Ambas as lojas estão bem organizadas',
      pontosNegativos: 'Necessário melhorar atendimento',
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeTypeOf('number');
    expect(relatorio.lojaId).toBe(lojaId1); // Primeira loja para compatibilidade
    expect(relatorio.lojasIds).toBeDefined();
    
    // Verificar que lojasIds contém as 2 lojas
    const lojasArray = JSON.parse(relatorio.lojasIds!);
    expect(lojasArray).toHaveLength(2);
    expect(lojasArray).toContain(lojaId1);
    expect(lojasArray).toContain(lojaId2);
  });

  it('deve criar relatório com apenas 1 loja (compatibilidade)', async () => {
    const caller = appRouter.createCaller(gestorCtx);
    const relatorio = await caller.relatoriosLivres.create({
      lojasIds: [lojaId1],
      dataVisita: new Date(),
      descricao: 'Relatório para 1 loja apenas',
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.lojaId).toBe(lojaId1);
    expect(relatorio.lojasIds).toBeDefined();
    
    const lojasArray = JSON.parse(relatorio.lojasIds!);
    expect(lojasArray).toHaveLength(1);
    expect(lojasArray[0]).toBe(lojaId1);
  });

  it('deve rejeitar criação sem lojas selecionadas', async () => {
    const caller = appRouter.createCaller(gestorCtx);
    await expect(
      caller.relatoriosLivres.create({
        lojasIds: [],
        dataVisita: new Date(),
        descricao: 'Relatório sem lojas',
      })
    ).rejects.toThrow();
  });

  it('deve manter compatibilidade com lojaId para queries existentes', async () => {
    const caller = appRouter.createCaller(gestorCtx);
    // Criar relatório com 2 lojas
    const relatorio = await caller.relatoriosLivres.create({
      lojasIds: [lojaId1, lojaId2],
      dataVisita: new Date(),
      descricao: 'Teste de compatibilidade lojaId',
    });

    // Verificar que lojaId está definido (primeira loja)
    expect(relatorio.lojaId).toBe(lojaId1);
    
    // Verificar que lojasIds contém todas as lojas
    const lojasArray = JSON.parse(relatorio.lojasIds!);
    expect(lojasArray).toHaveLength(2);
    expect(lojasArray).toContain(lojaId1);
    expect(lojasArray).toContain(lojaId2);
  });

  afterAll(async () => {
    // Cleanup não necessário pois o banco de dados de teste é limpo automaticamente
  });
});
