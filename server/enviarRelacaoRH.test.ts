import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as emailService from "./emailService";

// Mock do sendEmail para não enviar emails reais durante testes
vi.mock("./emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock do db para simular dados
vi.mock("./db", () => ({
  getGestorByUserId: vi.fn(),
  getLojasByGestorId: vi.fn(),
  getColaboradoresByLojaId: vi.fn(),
  getColaboradoresVolantesByGestorId: vi.fn(),
  getAllColaboradoresByGestorId: vi.fn(),
  updateGestorEnvioRH: vi.fn(),
}));

describe("Enviar Relação de Colaboradores para RH", () => {
  const gestorCtx: TrpcContext = {
    user: {
      id: 100,
      openId: "test-gestor",
      name: "Marco Amorim",
      email: "marco@expressglass.pt",
      role: "gestor",
      loginMethod: "oauth",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    sessionId: "test-session",
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    vi.mocked(db.getGestorByUserId).mockResolvedValue({
      id: 1,
      userId: 100,
      lastReminderDate: null,
      lastEnvioRH: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    vi.mocked(db.getLojasByGestorId).mockResolvedValue([
      { id: 1, nome: "Póvoa de Varzim", numeroLoja: 23, morada: null, telefone: null, email: null, createdAt: new Date(), updatedAt: new Date(), ativo: true },
      { id: 2, nome: "Barcelos", numeroLoja: 45, morada: null, telefone: null, email: null, createdAt: new Date(), updatedAt: new Date(), ativo: true },
    ]);
    
    vi.mocked(db.getColaboradoresByLojaId).mockImplementation(async (lojaId: number) => {
      if (lojaId === 1) {
        return [
          { id: 1, nome: "Pedro Barranco", codigoColaborador: "555", cargo: "tecnico", tipo: "loja", lojaId: 1, gestorId: null, ativo: true, createdAt: new Date(), updatedAt: new Date() },
        ];
      }
      return [
        { id: 2, nome: "João Silva", codigoColaborador: "123", cargo: "responsavel_loja", tipo: "loja", lojaId: 2, gestorId: null, ativo: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, nome: "Maria Santos", codigoColaborador: "456", cargo: "tecnico", tipo: "loja", lojaId: 2, gestorId: null, ativo: true, createdAt: new Date(), updatedAt: new Date() },
      ];
    });
    
    vi.mocked(db.getColaboradoresVolantesByGestorId).mockResolvedValue([]);
    vi.mocked(db.getAllColaboradoresByGestorId).mockResolvedValue([]);
    vi.mocked(db.updateGestorEnvioRH).mockResolvedValue(undefined);
  });

  it("deve gerar pré-visualização da relação de colaboradores", async () => {
    const caller = appRouter.createCaller(gestorCtx);
    
    const preview = await caller.colaboradores.previewRelacaoRH();
    
    expect(preview).toBeDefined();
    expect(preview.gestorNome).toBe("Marco Amorim");
    expect(preview.colaboradoresPorLoja).toHaveLength(2);
    expect(preview.totalColaboradores).toBe(3); // 1 + 2 colaboradores
    expect(preview.mes).toBeDefined();
  });

  it("deve enviar relação de colaboradores para RH com sucesso", async () => {
    const caller = appRouter.createCaller(gestorCtx);
    
    const resultado = await caller.colaboradores.enviarRelacaoRH({
      observacoes: "Teste de envio"
    });
    
    expect(resultado.success).toBe(true);
    expect(resultado.message).toContain("colaboradores enviada com sucesso");
    expect(resultado.message).toContain("recursoshumanos@expressglass.pt");
    
    // Verificar se sendEmail foi chamado
    expect(emailService.sendEmail).toHaveBeenCalled();
    
    // Verificar se a data de envio foi atualizada
    expect(db.updateGestorEnvioRH).toHaveBeenCalledWith(1);
  });

  it("deve verificar lembrete RH - antes do dia 20", async () => {
    const caller = appRouter.createCaller(gestorCtx);
    
    const lembrete = await caller.colaboradores.verificarLembreteRH();
    
    // O lembrete deve ter uma resposta válida
    expect(lembrete).toBeDefined();
    expect(typeof lembrete.mostrarLembrete).toBe('boolean');
    
    // Se estamos antes do dia 20, não deve mostrar lembrete
    const hoje = new Date();
    if (hoje.getDate() < 20) {
      expect(lembrete.mostrarLembrete).toBe(false);
    }
  });

  it("deve verificar lembrete RH - dia 20 ou posterior sem envio", async () => {
    const caller = appRouter.createCaller(gestorCtx);
    
    const lembrete = await caller.colaboradores.verificarLembreteRH();
    
    // O lembrete deve ter uma resposta válida
    expect(lembrete).toBeDefined();
    expect(typeof lembrete.mostrarLembrete).toBe('boolean');
    
    // Se estamos no dia 20 ou posterior, deve mostrar lembrete (se não enviou)
    const hoje = new Date();
    if (hoje.getDate() >= 20) {
      expect(lembrete.mostrarLembrete).toBe(true);
      expect(lembrete.diaAtual).toBeGreaterThanOrEqual(20);
    }
  });
});
