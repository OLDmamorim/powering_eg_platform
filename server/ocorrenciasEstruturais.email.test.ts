import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import * as emailService from "./emailService";
import type { TrpcContext } from "./_core/context";

// Mock do sendEmail para não enviar emails reais durante testes
vi.mock("./emailService", async () => {
  const actual = await vi.importActual("./emailService");
  return {
    ...actual,
    sendEmail: vi.fn().mockResolvedValue(true),
  };
});

describe("Envio de Email de Ocorrências Estruturais", () => {
  let gestorCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let ocorrenciaId: number;
  let gestorId: number;
  let gestorUserId: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Criar gestor de teste
    const gestor = await db.createGestor("Gestor Ocorrencias Test", "gestor.ocorrencias@test.com");
    gestorId = gestor.id;
    gestorUserId = gestor.userId;

    gestorCtx = {
      user: {
        id: gestorUserId,
        openId: `gestor-ocorrencias-${Date.now()}`,
        name: "Gestor Ocorrencias Test",
        email: "gestor.ocorrencias@test.com",
        role: "gestor",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: gestorId,
        userId: gestorUserId,
      },
      req: {
        headers: {},
      } as TrpcContext["req"],
      res: {
        setHeader: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    // Criar uma ocorrência de teste
    const gestorCaller = appRouter.createCaller(gestorCtx);
    const ocorrencia = await gestorCaller.ocorrenciasEstruturais.criar({
      tema: "Teste Email SMTP",
      descricao: "Descrição de teste para verificar envio de email via SMTP Gmail",
      abrangencia: "nacional",
      impacto: "medio",
    });
    ocorrenciaId = ocorrencia.id;
  });

  it("Deve enviar email via SMTP Gmail para admin real (não Marco Amorim)", async () => {
    const gestorCaller = appRouter.createCaller(gestorCtx);

    // Enviar email da ocorrência
    const resultado = await gestorCaller.ocorrenciasEstruturais.enviarEmail({
      id: ocorrenciaId,
    });

    expect(resultado.success).toBe(true);
    expect(resultado.message).toContain("Email enviado com sucesso");
    
    // Verificar se sendEmail foi chamado (SMTP Gmail)
    expect(emailService.sendEmail).toHaveBeenCalled();
    
    // Verificar parâmetros do email
    const chamadas = vi.mocked(emailService.sendEmail).mock.calls;
    expect(chamadas.length).toBe(1);
    
    const emailEnviado = chamadas[0][0];
    
    // Verificar que NÃO foi enviado para Marco Amorim (admin de teste)
    expect(emailEnviado.to).not.toBe("mramorim78@gmail.com");
    
    // Verificar que foi enviado para admin real (Mauro Furtado)
    expect(emailEnviado.to).toBe("mfurtado@expressglass.pt");
    
    // Verificar assunto do email
    expect(emailEnviado.subject).toContain("Ocorrência Estrutural");
    expect(emailEnviado.subject).toContain("Teste Email SMTP");
    
    // Verificar que HTML está presente e formatado corretamente
    expect(emailEnviado.html).toContain("<!DOCTYPE html>");
    expect(emailEnviado.html).toContain("Ocorrência Estrutural");
    expect(emailEnviado.html).toContain("Gestor Ocorrencias Test");
    expect(emailEnviado.html).toContain("PoweringEG Platform");
  });

  it("Deve rejeitar envio de email de ocorrência que não pertence ao gestor", async () => {
    // Criar outro gestor
    const outroGestor = await db.createGestor("Outro Gestor Test", "outro.gestor@test.com");
    
    const outroGestorCtx: TrpcContext & { gestor: { id: number; userId: number } } = {
      user: {
        id: outroGestor.userId,
        openId: `outro-gestor-${Date.now()}`,
        name: "Outro Gestor Test",
        email: "outro.gestor@test.com",
        role: "gestor",
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      gestor: {
        id: outroGestor.id,
        userId: outroGestor.userId,
      },
      req: {
        headers: {},
      } as TrpcContext["req"],
      res: {
        setHeader: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const outroCaller = appRouter.createCaller(outroGestorCtx);

    // Tentar enviar email de ocorrência que não pertence a este gestor
    await expect(
      outroCaller.ocorrenciasEstruturais.enviarEmail({ id: ocorrenciaId })
    ).rejects.toThrow("Só pode enviar as suas próprias ocorrências");
  });

  it("Deve incluir layout profissional com logo ExpressGlass no email", async () => {
    const gestorCaller = appRouter.createCaller(gestorCtx);

    await gestorCaller.ocorrenciasEstruturais.enviarEmail({
      id: ocorrenciaId,
    });

    const chamadas = vi.mocked(emailService.sendEmail).mock.calls;
    const emailEnviado = chamadas[0][0];
    
    // Verificar elementos do layout profissional
    expect(emailEnviado.html).toContain("ExpressGlass"); // Logo
    expect(emailEnviado.html).toContain("Informações Gerais");
    expect(emailEnviado.html).toContain("Descrição");
    expect(emailEnviado.html).toContain("background"); // Estilos inline
    expect(emailEnviado.html).toContain("border-radius"); // Cantos arredondados
  });
});
