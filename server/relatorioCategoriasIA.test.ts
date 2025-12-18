import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Relatório IA por Categorias", () => {
  it("deve gerar relatório IA estruturado para board", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, email: "admin@test.com", name: "Admin", role: "admin" },
    });

    const result = await caller.categorizacao.gerarRelatorioIA();

    expect(result).toBeDefined();
    expect(result.relatorio).toBeDefined();
    expect(typeof result.relatorio).toBe("string");
    expect(result.relatorio.length).toBeGreaterThan(100);
    
    // Verificar que contém estrutura esperada
    expect(result.relatorio).toContain("Relatório Executivo");
    expect(result.relatorio).toContain("Categoria");
  }, 60000); // 60 segundos timeout pois chamada IA pode demorar

  it("deve falhar se não for admin", async () => {
    const caller = appRouter.createCaller({
      user: { id: 2, email: "gestor@test.com", name: "Gestor", role: "gestor" },
    });

    await expect(caller.categorizacao.gerarRelatorioIA()).rejects.toThrow();
  });
});
