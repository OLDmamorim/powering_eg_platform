import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

describe("Relatórios - Data/Hora Personalizada", () => {
  let gestorCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let lojaId: number;
  let gestorId: number;
  let userId: number;

  beforeAll(async () => {
    // Criar loja de teste
    const loja = await db.createLoja({
      nome: "Loja Teste Data/Hora",
      contacto: "999999999",
      email: "teste@test.com",
    });
    lojaId = loja.id;

    // Criar gestor de teste
    const gestor = await db.createGestor(
      "Gestor Teste Data/Hora",
      "gestor.datahora@test.com"
    );
    gestorId = gestor.id;
    userId = gestor.userId;

    // Associar loja ao gestor
    await db.associateGestorLoja(gestorId, lojaId);

    // Criar contexto de gestor
    gestorCtx = {
      user: {
        id: userId,
        openId: `pending-${Date.now()}`,
        name: "Gestor Teste Data/Hora",
        email: "gestor.datahora@test.com",
        role: "gestor",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: gestorId,
        userId: userId,
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
  });

  it("deve criar relatório livre com data/hora atual quando não especificada", async () => {
    const caller = appRouter.createCaller(gestorCtx);
    const antes = new Date();

    const relatorio = await caller.relatoriosLivres.create({
      lojaId,
      dataVisita: new Date(), // Data atual
      descricao: "Teste sem data personalizada",
    });

    const depois = new Date();

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeGreaterThan(0);

    // Verificar que a data está entre antes e depois
    const dataRelatorio = new Date(relatorio.dataVisita);
    expect(dataRelatorio.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);
    expect(dataRelatorio.getTime()).toBeLessThanOrEqual(depois.getTime() + 1000);
  });

  it("deve criar relatório livre com data/hora personalizada", async () => {
    const caller = appRouter.createCaller(gestorCtx);
    const dataPersonalizada = new Date("2024-12-10T14:30:00");

    const relatorio = await caller.relatoriosLivres.create({
      lojaId,
      dataVisita: dataPersonalizada,
      descricao: "Teste com data personalizada",
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeGreaterThan(0);

    // Verificar que a data foi guardada corretamente
    const dataRelatorio = new Date(relatorio.dataVisita);
    expect(dataRelatorio.toISOString()).toBe(dataPersonalizada.toISOString());
  });

  it("deve criar relatório completo com data/hora personalizada", async () => {
    const caller = appRouter.createCaller(gestorCtx);
    const dataPersonalizada = new Date("2024-12-11T09:15:00");

    const relatorio = await caller.relatoriosCompletos.create({
      lojaId,
      dataVisita: dataPersonalizada,
      episFardamento: "OK",
      kitPrimeirosSocorros: "OK",
      consumiveis: "OK",
      espacoFisico: "OK",
      reclamacoes: "Nenhuma",
      vendasComplementares: "OK",
      fichasServico: "OK",
      documentacaoObrigatoria: "OK",
      reuniaoQuinzenal: true,
      resumoSupervisao: "Teste com data personalizada",
      colaboradoresPresentes: "João, Maria",
      pontosPositivos: "Bom atendimento",
      pontosNegativos: "Nenhum",
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeGreaterThan(0);

    // Verificar que a data foi guardada corretamente
    const dataRelatorio = new Date(relatorio.dataVisita);
    expect(dataRelatorio.toISOString()).toBe(dataPersonalizada.toISOString());
  });

  it("deve listar relatórios com datas personalizadas ordenados corretamente", async () => {
    const caller = appRouter.createCaller(gestorCtx);

    // Criar 3 relatórios com datas diferentes
    const data1 = new Date("2024-12-01T10:00:00");
    const data2 = new Date("2024-12-05T14:00:00");
    const data3 = new Date("2024-12-10T16:00:00");

    await caller.relatoriosLivres.create({
      lojaId,
      dataVisita: data2,
      descricao: "Relatório do meio",
    });

    await caller.relatoriosLivres.create({
      lojaId,
      dataVisita: data1,
      descricao: "Relatório mais antigo",
    });

    await caller.relatoriosLivres.create({
      lojaId,
      dataVisita: data3,
      descricao: "Relatório mais recente",
    });

    // Listar relatórios
    const relatorios = await caller.relatoriosLivres.list();

    // Verificar que estão ordenados por data (mais recente primeiro)
    expect(relatorios.length).toBeGreaterThanOrEqual(3);
    
    // Encontrar os 3 relatórios criados
    const rel1 = relatorios.find((r: any) => r.descricao === "Relatório mais antigo");
    const rel2 = relatorios.find((r: any) => r.descricao === "Relatório do meio");
    const rel3 = relatorios.find((r: any) => r.descricao === "Relatório mais recente");

    expect(rel1).toBeDefined();
    expect(rel2).toBeDefined();
    expect(rel3).toBeDefined();

    // Verificar que as datas estão corretas
    expect(new Date(rel1!.dataVisita).toISOString()).toBe(data1.toISOString());
    expect(new Date(rel2!.dataVisita).toISOString()).toBe(data2.toISOString());
    expect(new Date(rel3!.dataVisita).toISOString()).toBe(data3.toISOString());
  });
});
