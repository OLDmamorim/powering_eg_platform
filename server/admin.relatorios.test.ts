import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

describe("Admin criar relatórios para qualquer loja", () => {
  let adminCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let gestorCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let lojaId: number;
  let adminUserId: number;
  let adminGestorId: number;
  let gestorUserId: number;
  let gestorGestorId: number;

  beforeAll(async () => {
    // Criar admin (que também é um "gestor" na tabela para poder criar relatórios)
    const admin = await db.createGestor(
      "Admin Teste",
      "admin@test.com"
    );
    adminGestorId = admin.id;
    adminUserId = admin.userId;

    // Promover user a admin
    await db.promoteGestorToAdmin(adminGestorId);

    // Criar gestor normal
    const gestor = await db.createGestor(
      "Gestor Teste",
      "gestor@test.com"
    );
    gestorGestorId = gestor.id;
    gestorUserId = gestor.userId;

    // Criar loja de teste
    const loja = await db.createLoja({
      nome: "Loja Teste Admin",
      email: "loja@test.com",
    });
    lojaId = loja.id;

    // Associar loja ao gestor (não ao admin)
    await db.associateGestorLoja(gestorGestorId, lojaId);

    // Criar contexto de admin
    adminCtx = {
      user: {
        id: adminUserId,
        openId: `admin-${Date.now()}`,
        name: "Admin Teste",
        email: "admin@test.com",
        role: "admin",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: adminGestorId,
        userId: adminUserId,
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    // Criar contexto de gestor
    gestorCtx = {
      user: {
        id: gestorUserId,
        openId: `gestor-${Date.now()}`,
        name: "Gestor Teste",
        email: "gestor@test.com",
        role: "gestor",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: gestorGestorId,
        userId: gestorUserId,
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

  it("Admin pode criar relatório livre para qualquer loja", async () => {
    const caller = appRouter.createCaller(adminCtx);
    
    const relatorio = await caller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Relatório criado pelo admin",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.gestorId).toBe(adminGestorId);
    expect(relatorio.lojaId).toBe(lojaId);
  });

  it("Admin pode criar relatório completo para qualquer loja", async () => {
    const caller = appRouter.createCaller(adminCtx);
    
    const relatorio = await caller.relatoriosCompletos.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      episFardamento: "OK",
      kitPrimeirosSocorros: "OK",
      consumiveis: "OK",
      espacoFisico: "OK",
      reclamacoes: "Nenhuma",
      vendasComplementares: "Bom",
      fichasServico: "Completas",
      documentacaoObrigatoria: "OK",
      reuniaoQuinzenal: true,
      resumoSupervisao: "Tudo em ordem",
      colaboradoresPresentes: "João, Maria",
      pontosPositivos: "Boa organização",
      pontosNegativos: "Nenhum",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.gestorId).toBe(adminGestorId);
    expect(relatorio.lojaId).toBe(lojaId);
  });

  it("Relatórios criados por admin aparecem na lista do gestor", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    const gestorCaller = appRouter.createCaller(gestorCtx);
    
    // Admin cria relatório livre
    await adminCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Relatório admin para gestor ver",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    // Gestor lista seus relatórios (da loja associada a ele)
    const relatorios = await gestorCaller.relatoriosLivres.list({});

    // Deve incluir relatórios das lojas do gestor (incluindo os criados pelo admin)
    expect(relatorios.length).toBeGreaterThan(0);
    
    // Verificar se algum relatório foi criado por admin
    const relatorioAdmin = relatorios.find(
      (r: any) => r.gestor?.user?.role === "admin"
    );
    expect(relatorioAdmin).toBeDefined();
    expect(relatorioAdmin?.gestor?.user?.name).toBe("Admin Teste");
  });

  it("Relatórios mostram corretamente quem os criou (admin vs gestor)", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    const gestorCaller = appRouter.createCaller(gestorCtx);
    
    // Admin cria relatório
    const relatorioAdmin = await adminCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Criado por admin",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    // Gestor cria relatório
    const relatorioGestor = await gestorCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Criado por gestor",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    // Buscar relatórios completos com dados do autor (como admin vê todos)
    const todosRelatorios = await adminCaller.relatoriosLivres.list({});

    const relAdminCompleto = todosRelatorios.find(
      (r: any) => r.id === relatorioAdmin.id
    );
    const relGestorCompleto = todosRelatorios.find(
      (r: any) => r.id === relatorioGestor.id
    );

    // Verificar role do autor
    expect(relAdminCompleto?.gestor?.user?.role).toBe("admin");
    expect(relGestorCompleto?.gestor?.user?.role).toBe("gestor");

    // Verificar nome do autor
    expect(relAdminCompleto?.gestor?.user?.name).toBe("Admin Teste");
    expect(relGestorCompleto?.gestor?.user?.name).toBe("Gestor Teste");
  });
});
