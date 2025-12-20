import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

describe("Admin - Visualização de Lojas", () => {
  let adminCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let gestorCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let loja1Id: number;
  let loja2Id: number;
  let loja3Id: number;

  beforeAll(async () => {
    // Criar admin
    const admin = await db.createGestor("Admin Lojas Test", "admin.lojas@test.com");
    await db.promoteGestorToAdmin(admin.id);

    // Criar gestor normal
    const gestor = await db.createGestor("Gestor Lojas Test", "gestor.lojas@test.com");

    // Criar 3 lojas
    const loja1 = await db.createLoja({
      nome: "Loja Test 1",
      email: "loja1@test.com",
    });
    loja1Id = loja1.id;

    const loja2 = await db.createLoja({
      nome: "Loja Test 2",
      email: "loja2@test.com",
    });
    loja2Id = loja2.id;

    const loja3 = await db.createLoja({
      nome: "Loja Test 3",
      email: "loja3@test.com",
    });
    loja3Id = loja3.id;

    // Associar apenas loja1 ao gestor normal
    await db.associateGestorLoja(gestor.id, loja1Id);

    // Criar contexto de admin
    adminCtx = {
      user: {
        id: admin.userId,
        openId: `admin-lojas-${Date.now()}`,
        name: "Admin Lojas Test",
        email: "admin.lojas@test.com",
        role: "admin",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: admin.id,
        userId: admin.userId,
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
        id: gestor.userId,
        openId: `gestor-lojas-${Date.now()}`,
        name: "Gestor Lojas Test",
        email: "gestor.lojas@test.com",
        role: "gestor",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: gestor.id,
        userId: gestor.userId,
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

  it("Admin vê todas as lojas através de getByGestor", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    
    const lojas = await adminCaller.lojas.getByGestor();
    
    // Admin deve ver TODAS as lojas (pelo menos as 3 criadas neste teste)
    expect(lojas.length).toBeGreaterThanOrEqual(3);
    
    // Verificar se as 3 lojas criadas estão presentes
    const lojasIds = lojas.map(l => l.id);
    expect(lojasIds).toContain(loja1Id);
    expect(lojasIds).toContain(loja2Id);
    expect(lojasIds).toContain(loja3Id);
  });

  it("Gestor vê apenas suas lojas através de getByGestor", async () => {
    const gestorCaller = appRouter.createCaller(gestorCtx);
    
    const lojas = await gestorCaller.lojas.getByGestor();
    
    // Gestor deve ver apenas 1 loja (a que foi associada a ele)
    expect(lojas.length).toBe(1);
    expect(lojas[0].id).toBe(loja1Id);
    expect(lojas[0].nome).toBe("Loja Test 1");
  });

  it("Admin pode criar relatório para qualquer loja", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    
    // Admin cria relatório para loja2 (não associada a nenhum gestor)
    const relatorio = await adminCaller.relatoriosLivres.create({
      lojasIds: [loja2Id],
      dataVisita: new Date(),
      descricao: "Relatório admin para loja não associada",
      comentarioAdmin: "Teste de criação para qualquer loja",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeGreaterThan(0);
  });
});
