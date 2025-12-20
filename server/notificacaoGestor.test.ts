import { describe, it, expect, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import * as emailService from "./emailService";

// Mock do sendEmail para não enviar emails reais durante testes
vi.mock("./emailService", async () => {
  const actual = await vi.importActual("./emailService");
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue(true),
  };
});

describe("Notificação por email ao gestor quando admin cria relatório", () => {
  let adminCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let gestorCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let lojaId: number;
  let adminUserId: number;
  let adminGestorId: number;
  let gestorUserId: number;
  let gestorGestorId: number;

  beforeAll(async () => {
    // Criar admin
    const admin = await db.createGestor("Admin Email Test", "admin.email@test.com");
    adminGestorId = admin.id;
    adminUserId = admin.userId;
    await db.promoteGestorToAdmin(adminGestorId);

    // Criar gestor normal
    const gestor = await db.createGestor("Gestor Email Test", "gestor.email@test.com");
    gestorGestorId = gestor.id;
    gestorUserId = gestor.userId;

    // Criar loja
    const loja = await db.createLoja({
      nome: "Loja Email Test",
      email: "loja.email@test.com",
    });
    lojaId = loja.id;

    // Associar loja ao gestor (não ao admin)
    await db.associateGestorLoja(gestorGestorId, lojaId);

    // Criar contexto de admin
    adminCtx = {
      user: {
        id: adminUserId,
        openId: `admin-email-${Date.now()}`,
        name: "Admin Email Test",
        email: "admin.email@test.com",
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
        openId: `gestor-email-${Date.now()}`,
        name: "Gestor Email Test",
        email: "gestor.email@test.com",
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

  it("Deve enviar email ao gestor quando admin cria relatório livre", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    
    // Limpar mock antes do teste
    vi.clearAllMocks();

    // Admin cria relatório livre
    await adminCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Relatório criado por admin para testar email",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    // Aguardar um pouco para a função async executar
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verificar se sendEmail foi chamado
    expect(emailService.sendEmail).toHaveBeenCalled();
    
    // Verificar se foi enviado para o email correto
    const chamadas = vi.mocked(emailService.sendEmail).mock.calls;
    expect(chamadas.length).toBeGreaterThan(0);
    
    const primeiraChama = chamadas[0]?.[0];
    expect(primeiraChama?.to).toBe("gestor.email@test.com");
    expect(primeiraChama?.subject).toContain("Admin Email Test");
    expect(primeiraChama?.subject).toContain("Livre");
  });

  it("Deve enviar email ao gestor quando admin cria relatório completo", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    
    // Limpar mock antes do teste
    vi.clearAllMocks();

    // Admin cria relatório completo
    await adminCaller.relatoriosCompletos.create({
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

    // Aguardar um pouco para a função async executar
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verificar se sendEmail foi chamado
    expect(emailService.sendEmail).toHaveBeenCalled();
    
    // Verificar se foi enviado para o email correto
    const chamadas = vi.mocked(emailService.sendEmail).mock.calls;
    expect(chamadas.length).toBeGreaterThan(0);
    
    const primeiraChama = chamadas[0]?.[0];
    expect(primeiraChama?.to).toBe("gestor.email@test.com");
    expect(primeiraChama?.subject).toContain("Admin Email Test");
    expect(primeiraChama?.subject).toContain("Completo");
  });

  it("NÃO deve enviar email quando gestor cria seu próprio relatório", async () => {
    const gestorCaller = appRouter.createCaller(gestorCtx);
    
    // Limpar mock antes do teste
    vi.clearAllMocks();

    // Gestor cria relatório livre
    await gestorCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Relatório criado pelo próprio gestor",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verificar que sendEmail NÃO foi chamado (gestor criou, não admin)
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
