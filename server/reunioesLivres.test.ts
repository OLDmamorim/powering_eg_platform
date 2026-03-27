import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// Mock the db module
vi.mock("./db", () => {
  const tiposStore: any[] = [];
  const reunioesStore: any[] = [];
  let tipoIdCounter = 1;
  let reuniaoIdCounter = 1;

  return {
    // All other exports as passthrough
    listarReuniaoTipos: vi.fn(async (userId: number) => {
      return tiposStore.filter((t) => t.userId === userId);
    }),
    criarReuniaoTipo: vi.fn(async (data: any) => {
      const tipo = { id: tipoIdCounter++, ...data, createdAt: new Date() };
      tiposStore.push(tipo);
      return tipo;
    }),
    eliminarReuniaoTipo: vi.fn(async (id: number, userId: number) => {
      const idx = tiposStore.findIndex((t) => t.id === id && t.userId === userId);
      if (idx >= 0) tiposStore.splice(idx, 1);
    }),
    listarReunioesLivres: vi.fn(async (userId: number, filtros?: any) => {
      let result = reunioesStore.filter((r) => r.userId === userId);
      if (filtros?.tipoId) result = result.filter((r) => r.tipoId === filtros.tipoId);
      if (filtros?.estado) result = result.filter((r) => r.estado === filtros.estado);
      if (filtros?.pesquisa) {
        const termo = filtros.pesquisa.toLowerCase();
        result = result.filter(
          (r) =>
            r.titulo.toLowerCase().includes(termo) ||
            (r.temas && r.temas.toLowerCase().includes(termo))
        );
      }
      return result;
    }),
    getReuniaoLivre: vi.fn(async (id: number, userId: number) => {
      return reunioesStore.find((r) => r.id === id && r.userId === userId) || null;
    }),
    criarReuniaoLivre: vi.fn(async (data: any) => {
      const reuniao = {
        id: reuniaoIdCounter++,
        ...data,
        estado: data.estado || "rascunho",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reunioesStore.push(reuniao);
      return reuniao;
    }),
    atualizarReuniaoLivre: vi.fn(async (id: number, userId: number, data: any) => {
      const reuniao = reunioesStore.find((r) => r.id === id && r.userId === userId);
      if (reuniao) {
        Object.assign(reuniao, data);
      }
    }),
    eliminarReuniaoLivre: vi.fn(async (id: number, userId: number) => {
      const idx = reunioesStore.findIndex((r) => r.id === id && r.userId === userId);
      if (idx >= 0) reunioesStore.splice(idx, 1);
    }),
  };
});

describe("reunioesLivres router", () => {
  describe("tipos/tags de reunião", () => {
    it("cria um tipo de reunião", async () => {
      const ctx = createAuthContext(100);
      const caller = appRouter.createCaller(ctx);

      const tipo = await caller.reunioesLivres.criarTipo({
        nome: "Reunião Semanal",
        cor: "#6366f1",
      });

      expect(tipo).toBeDefined();
      expect(tipo.nome).toBe("Reunião Semanal");
      expect(tipo.cor).toBe("#6366f1");
    });

    it("lista tipos de reunião do utilizador", async () => {
      const ctx = createAuthContext(100);
      const caller = appRouter.createCaller(ctx);

      const tipos = await caller.reunioesLivres.listarTipos();
      expect(Array.isArray(tipos)).toBe(true);
    });

    it("elimina um tipo de reunião", async () => {
      const ctx = createAuthContext(101);
      const caller = appRouter.createCaller(ctx);

      const tipo = await caller.reunioesLivres.criarTipo({
        nome: "Para Eliminar",
        cor: "#ef4444",
      });

      const result = await caller.reunioesLivres.eliminarTipo({ id: tipo.id });
      expect(result).toEqual({ success: true });
    });
  });

  describe("CRUD de reuniões", () => {
    it("cria uma reunião com dados completos", async () => {
      const ctx = createAuthContext(200);
      const caller = appRouter.createCaller(ctx);

      const reuniao = await caller.reunioesLivres.criar({
        titulo: "Reunião de Equipa",
        data: "2026-03-27",
        hora: "10:00",
        local: "Sala de reuniões",
        presencas: JSON.stringify(["Marco", "João", "Ana"]),
        temas: "Resultados do mês\nPlano de ação",
        conclusoes: "Aumentar visitas semanais",
        observacoes: "Próxima reunião dia 3 de abril",
        estado: "concluida",
      });

      expect(reuniao).toBeDefined();
      expect(reuniao.titulo).toBe("Reunião de Equipa");
      expect(reuniao.data).toBe("2026-03-27");
      expect(reuniao.hora).toBe("10:00");
      expect(reuniao.local).toBe("Sala de reuniões");
      expect(reuniao.estado).toBe("concluida");
    });

    it("cria uma reunião mínima (só título e data)", async () => {
      const ctx = createAuthContext(200);
      const caller = appRouter.createCaller(ctx);

      const reuniao = await caller.reunioesLivres.criar({
        titulo: "Reunião Rápida",
        data: "2026-04-01",
      });

      expect(reuniao.titulo).toBe("Reunião Rápida");
      expect(reuniao.estado).toBe("rascunho");
    });

    it("lista reuniões do utilizador", async () => {
      const ctx = createAuthContext(200);
      const caller = appRouter.createCaller(ctx);

      const reunioes = await caller.reunioesLivres.listar({});
      expect(Array.isArray(reunioes)).toBe(true);
      expect(reunioes.length).toBeGreaterThanOrEqual(2);
    });

    it("filtra reuniões por estado", async () => {
      const ctx = createAuthContext(200);
      const caller = appRouter.createCaller(ctx);

      const concluidas = await caller.reunioesLivres.listar({ estado: "concluida" });
      expect(concluidas.every((r: any) => r.estado === "concluida")).toBe(true);
    });

    it("pesquisa reuniões por texto", async () => {
      const ctx = createAuthContext(200);
      const caller = appRouter.createCaller(ctx);

      const resultados = await caller.reunioesLivres.listar({ pesquisa: "Equipa" });
      expect(resultados.length).toBeGreaterThanOrEqual(1);
      expect(resultados[0].titulo).toContain("Equipa");
    });

    it("obtém reunião por ID", async () => {
      const ctx = createAuthContext(200);
      const caller = appRouter.createCaller(ctx);

      // Listar para obter um ID
      const reunioes = await caller.reunioesLivres.listar({});
      if (reunioes.length > 0) {
        const reuniao = await caller.reunioesLivres.getById({ id: reunioes[0].id });
        expect(reuniao).toBeDefined();
        expect(reuniao?.titulo).toBe(reunioes[0].titulo);
      }
    });

    it("atualiza uma reunião", async () => {
      const ctx = createAuthContext(300);
      const caller = appRouter.createCaller(ctx);

      const reuniao = await caller.reunioesLivres.criar({
        titulo: "Original",
        data: "2026-05-01",
      });

      const result = await caller.reunioesLivres.atualizar({
        id: reuniao.id,
        titulo: "Atualizado",
        estado: "concluida",
        conclusoes: "Novas conclusões",
      });

      expect(result).toEqual({ success: true });
    });

    it("elimina uma reunião", async () => {
      const ctx = createAuthContext(400);
      const caller = appRouter.createCaller(ctx);

      const reuniao = await caller.reunioesLivres.criar({
        titulo: "Para Eliminar",
        data: "2026-06-01",
      });

      const result = await caller.reunioesLivres.eliminar({ id: reuniao.id });
      expect(result).toEqual({ success: true });

      // Verificar que foi eliminada
      const reuniaoEliminada = await caller.reunioesLivres.getById({ id: reuniao.id });
      expect(reuniaoEliminada).toBeNull();
    });

    it("rejeita criação sem título", async () => {
      const ctx = createAuthContext(200);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.reunioesLivres.criar({
          titulo: "",
          data: "2026-03-27",
        })
      ).rejects.toThrow();
    });
  });
});
