import { describe, it, expect, vi } from "vitest";

// Mock invokeLLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "## Resumo Executivo\nRelatório de teste gerado com sucesso." } }],
  }),
}));

import { gerarRecomendacoesFerias, PROCEDIMENTO_FERIAS_TEXTO } from "./feriasIAService";

describe("feriasIAService", () => {
  it("should export PROCEDIMENTO_FERIAS_TEXTO", () => {
    expect(PROCEDIMENTO_FERIAS_TEXTO).toBeDefined();
    expect(PROCEDIMENTO_FERIAS_TEXTO).toContain("PROCEDIMENTO INTERNO");
    expect(PROCEDIMENTO_FERIAS_TEXTO).toContain("22 dias úteis");
    expect(PROCEDIMENTO_FERIAS_TEXTO).toContain("MÁXIMO 10 dias úteis");
    expect(PROCEDIMENTO_FERIAS_TEXTO).toContain("mínimo 5 dias");
  });

  it("should generate recommendations from collaborator data", async () => {
    const colaboradores = [
      {
        nome: "João Silva",
        loja: "Braga",
        gestor: "Marco",
        dias: { "7-1": "approved", "7-2": "approved", "7-3": "approved", "7-4": "approved", "7-5": "approved" },
        totalAprovados: 5,
        totalNaoAprovados: 0,
        totalFeriados: 0,
        totalFaltas: 0,
      },
      {
        nome: "Maria Santos",
        loja: "Braga",
        gestor: "Marco",
        dias: {
          "7-1": "approved", "7-2": "approved", "7-3": "approved", "7-4": "approved", "7-5": "approved",
          "7-8": "approved", "7-9": "approved", "7-10": "approved", "7-11": "approved", "7-12": "approved",
          "7-15": "approved", "7-16": "approved",
        },
        totalAprovados: 12,
        totalNaoAprovados: 0,
        totalFeriados: 0,
        totalFaltas: 0,
      },
    ];

    const result = await gerarRecomendacoesFerias(colaboradores, 2026);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result).toContain("Resumo Executivo");
  });

  it("should detect overlapping employees in same store", async () => {
    // Both employees have approved days on 7-1 in same store
    const colaboradores = [
      {
        nome: "João Silva",
        loja: "Porto",
        gestor: "Marco",
        dias: { "7-1": "approved", "7-2": "approved" },
        totalAprovados: 2,
        totalNaoAprovados: 0,
        totalFeriados: 0,
        totalFaltas: 0,
      },
      {
        nome: "Ana Costa",
        loja: "Porto",
        gestor: "Marco",
        dias: { "7-1": "approved", "7-3": "approved" },
        totalAprovados: 2,
        totalNaoAprovados: 0,
        totalFeriados: 0,
        totalFaltas: 0,
      },
    ];

    // The function should call invokeLLM with data that includes the overlap
    const { invokeLLM } = await import("./_core/llm");
    const result = await gerarRecomendacoesFerias(colaboradores, 2026);
    
    // Verify invokeLLM was called with prompt containing overlap info
    expect(invokeLLM).toHaveBeenCalled();
    const callArgs = (invokeLLM as any).mock.calls;
    const lastCall = callArgs[callArgs.length - 1][0];
    const userMessage = lastCall.messages.find((m: any) => m.role === "user");
    expect(userMessage.content).toContain("SOBREPOSIÇÕES");
    expect(userMessage.content).toContain("Porto");
  });

  it("should handle empty collaborator list gracefully", async () => {
    const result = await gerarRecomendacoesFerias([], 2026);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });
});
