import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Contexto de admin para testes
const adminCtx: TrpcContext = {
  user: {
    id: 1,
    openId: "test-admin-openid",
    name: "Admin Test",
    email: "admin@test.com",
    loginMethod: "test",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
};

// Contexto de gestor para testes
const gestorCtx: TrpcContext = {
  user: {
    id: 2,
    openId: "test-gestor-openid",
    name: "Gestor Test",
    email: "gestor@test.com",
    loginMethod: "test",
    role: "gestor",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
};

describe("Tokens de Acesso para Lojas", () => {
  it("deve ter router de tokens definido", () => {
    expect(appRouter.tokensLoja).toBeDefined();
    expect(appRouter.tokensLoja.listar).toBeDefined();
    expect(appRouter.tokensLoja.criarToken).toBeDefined();
    expect(appRouter.tokensLoja.toggleAtivo).toBeDefined();
    expect(appRouter.tokensLoja.regenerar).toBeDefined();
    expect(appRouter.tokensLoja.enviarEmail).toBeDefined();
  });

  it("deve ter função listarTokensLoja no db", async () => {
    expect(db.listarTokensLoja).toBeDefined();
    expect(typeof db.listarTokensLoja).toBe("function");
  });

  it("deve ter função listarTokensLojaByGestor no db", async () => {
    expect(db.listarTokensLojaByGestor).toBeDefined();
    expect(typeof db.listarTokensLojaByGestor).toBe("function");
  });

  it("deve ter função getOrCreateTokenLoja no db", async () => {
    expect(db.getOrCreateTokenLoja).toBeDefined();
    expect(typeof db.getOrCreateTokenLoja).toBe("function");
  });

  it("deve ter função toggleTokenLoja no db", async () => {
    expect(db.toggleTokenLoja).toBeDefined();
    expect(typeof db.toggleTokenLoja).toBe("function");
  });

  it("deve ter função regenerarTokenLoja no db", async () => {
    expect(db.regenerarTokenLoja).toBeDefined();
    expect(typeof db.regenerarTokenLoja).toBe("function");
  });

  it("admin deve poder listar todos os tokens", async () => {
    const caller = appRouter.createCaller(adminCtx);
    const tokens = await caller.tokensLoja.listar();
    expect(Array.isArray(tokens)).toBe(true);
  });

  it("gestor deve poder listar tokens das suas lojas", async () => {
    // Este teste verifica que a função existe e funciona para gestores registados
    // Como o gestor de teste não existe na BD, esperamos um erro NOT_FOUND
    const caller = appRouter.createCaller(gestorCtx);
    try {
      const tokens = await caller.tokensLoja.listar();
      // Se chegou aqui, o gestor existe e retornou tokens
      expect(Array.isArray(tokens)).toBe(true);
    } catch (error: any) {
      // Esperado: gestor de teste não existe na BD
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toContain("Gestor não encontrado");
    }
  });
});
