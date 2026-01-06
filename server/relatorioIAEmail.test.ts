import { describe, it, expect } from "vitest";
import { createTestCaller } from "./_core/testUtils";

describe("Relatório IA - Email e Filtros", () => {
  it("deve listar histórico de relatórios IA sem filtros", async () => {
    const caller = await createTestCaller({
      role: "admin",
    });

    const historico = await caller.categorizacao.getHistoricoRelatoriosIA({});
    
    expect(Array.isArray(historico)).toBe(true);
  });

  it("deve listar histórico de relatórios IA com filtro de data", async () => {
    const caller = await createTestCaller({
      role: "admin",
    });

    const hoje = new Date();
    const mesPassado = new Date(hoje);
    mesPassado.setMonth(mesPassado.getMonth() - 1);

    const historico = await caller.categorizacao.getHistoricoRelatoriosIA({
      dataInicio: mesPassado.toISOString().split('T')[0],
      dataFim: hoje.toISOString().split('T')[0],
    });
    
    expect(Array.isArray(historico)).toBe(true);
  });

  it("deve listar histórico de relatórios IA com filtro de categoria", async () => {
    const caller = await createTestCaller({
      role: "admin",
    });

    const historico = await caller.categorizacao.getHistoricoRelatoriosIA({
      categoria: "pendentes",
    });
    
    expect(Array.isArray(historico)).toBe(true);
  });

  it("deve rejeitar envio de email com relatório inexistente", async () => {
    const caller = await createTestCaller({
      role: "admin",
    });

    await expect(
      caller.categorizacao.enviarEmailRelatorioIA({
        relatorioId: 999999,
        emailDestino: "teste@exemplo.com",
      })
    ).rejects.toThrow("Relatório não encontrado");
  });
});
