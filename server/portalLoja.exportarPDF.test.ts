import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock do módulo db
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    validarTokenLoja: vi.fn(),
    getLojasRelacionadas: vi.fn(),
    getResultadosMensaisPorLoja: vi.fn(),
    getVendasComplementares: vi.fn(),
  };
});

// Mock do pdfService
vi.mock("./pdfService", () => ({
  gerarPDFResultados: vi.fn().mockResolvedValue(Buffer.from("PDF_CONTENT_TEST")),
}));

// Mock do LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Análise IA de teste" } }],
  }),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("todosPortalLoja.exportarPDFResultados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita token inválido", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Mock para token inválido
    vi.mocked(db.validarTokenLoja).mockResolvedValue(null);

    await expect(
      caller.todosPortalLoja.exportarPDFResultados({
        token: "TOKEN_INVALIDO",
      })
    ).rejects.toThrow("Token inválido");
  });

  it("gera PDF com sucesso para token válido", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Mock para token válido
    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: { id: 1, nome: "Loja Teste", email: "loja@teste.pt" },
    });

    // Mock para resultados
    vi.mocked(db.getResultadosMensaisPorLoja).mockResolvedValue({
      id: 1,
      lojaId: 1,
      mes: 1,
      ano: 2026,
      totalServicos: 100,
      objetivoMensal: 120,
      qtdReparacoes: 25,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock para vendas complementares
    vi.mocked(db.getVendasComplementares).mockResolvedValue([{
      id: 1,
      lojaId: 1,
      mes: 1,
      ano: 2026,
      escovasQtd: 10,
      polimentoQtd: 5,
      tratamentoQtd: 3,
      lavagensTotal: 8,
      outrosQtd: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    const result = await caller.todosPortalLoja.exportarPDFResultados({
      token: "TOKEN_VALIDO",
      meses: [{ mes: 1, ano: 2026 }],
      incluirAnaliseIA: false,
    });

    expect(result).toHaveProperty("pdf");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toContain("resultados_");
    expect(result.filename).toContain(".pdf");
    // Verificar que o PDF é uma string base64
    expect(typeof result.pdf).toBe("string");
    expect(result.pdf.length).toBeGreaterThan(0);
  });

  it("inclui análise IA quando solicitado", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Mock para token válido
    vi.mocked(db.validarTokenLoja).mockResolvedValue({
      loja: { id: 1, nome: "Loja Teste", email: "loja@teste.pt" },
    });

    // Mock para resultados
    vi.mocked(db.getResultadosMensaisPorLoja).mockResolvedValue({
      id: 1,
      lojaId: 1,
      mes: 1,
      ano: 2026,
      totalServicos: 100,
      objetivoMensal: 120,
      qtdReparacoes: 25,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock para vendas complementares
    vi.mocked(db.getVendasComplementares).mockResolvedValue([]);

    const result = await caller.todosPortalLoja.exportarPDFResultados({
      token: "TOKEN_VALIDO",
      incluirAnaliseIA: true,
    });

    expect(result).toHaveProperty("pdf");
    expect(result).toHaveProperty("filename");
  });
});
