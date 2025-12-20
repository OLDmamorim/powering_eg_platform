import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

describe("Comentários do Admin nos Relatórios", () => {
  let adminCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let gestorCtx: TrpcContext & { gestor: { id: number; userId: number } };
  let lojaId: number;
  let adminUserId: number;
  let adminGestorId: number;
  let gestorUserId: number;
  let gestorGestorId: number;

  beforeAll(async () => {
    // Criar admin
    const admin = await db.createGestor("Admin Comentarios Test", "admin.comentarios@test.com");
    adminGestorId = admin.id;
    adminUserId = admin.userId;
    await db.promoteGestorToAdmin(adminGestorId);

    // Criar gestor normal
    const gestor = await db.createGestor("Gestor Comentarios Test", "gestor.comentarios@test.com");
    gestorGestorId = gestor.id;
    gestorUserId = gestor.userId;

    // Criar loja
    const loja = await db.createLoja({
      nome: "Loja Comentarios Test",
      email: "loja.comentarios@test.com",
    });
    lojaId = loja.id;

    // Associar loja ao gestor
    await db.associateGestorLoja(gestorGestorId, lojaId);

    // Criar contexto de admin
    adminCtx = {
      user: {
        id: adminUserId,
        openId: `admin-comentarios-${Date.now()}`,
        name: "Admin Comentarios Test",
        email: "admin.comentarios@test.com",
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
        openId: `gestor-comentarios-${Date.now()}`,
        name: "Gestor Comentarios Test",
        email: "gestor.comentarios@test.com",
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

  it("Admin pode criar relatório livre com comentário", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);

    const relatorio = await adminCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Relatório livre com comentário do admin",
      comentarioAdmin: "Este é um comentário importante do admin para o gestor",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeGreaterThan(0);
    expect(relatorio.comentarioAdmin).toBe("Este é um comentário importante do admin para o gestor");
  });

  it("Admin pode criar relatório completo com comentário", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);

    const relatorio = await adminCaller.relatoriosCompletos.create({
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
      comentarioAdmin: "Parabéns pela excelente gestão da loja!",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    expect(relatorio).toBeDefined();
    expect(relatorio.id).toBeGreaterThan(0);
    expect(relatorio.comentarioAdmin).toBe("Parabéns pela excelente gestão da loja!");
  });

  it("Gestor pode ver comentário do admin no relatório livre", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    const gestorCaller = appRouter.createCaller(gestorCtx);

    // Admin cria relatório com comentário
    const relatorio = await adminCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Relatório para o gestor visualizar",
      comentarioAdmin: "Por favor, verificar o stock de vidros",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    // Gestor lista seus relatórios
    const relatorios = await gestorCaller.relatoriosLivres.list({
      apenasNaoVistos: false,
    });

    // Encontrar o relatório criado
    const relatorioEncontrado = relatorios.find(r => r.id === relatorio.id);
    
    expect(relatorioEncontrado).toBeDefined();
    expect(relatorioEncontrado?.comentarioAdmin).toBe("Por favor, verificar o stock de vidros");
  });

  it("Gestor pode ver comentário do admin no relatório completo", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);
    const gestorCaller = appRouter.createCaller(gestorCtx);

    // Admin cria relatório completo com comentário
    const relatorio = await adminCaller.relatoriosCompletos.create({
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
      pontosNegativos: "Falta de organização no armazém",
      comentarioAdmin: "Atenção especial ao armazém na próxima visita",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    // Gestor lista seus relatórios
    const relatorios = await gestorCaller.relatoriosCompletos.list({
      apenasNaoVistos: false,
    });

    // Encontrar o relatório criado
    const relatorioEncontrado = relatorios.find(r => r.id === relatorio.id);
    
    expect(relatorioEncontrado).toBeDefined();
    expect(relatorioEncontrado?.comentarioAdmin).toBe("Atenção especial ao armazém na próxima visita");
  });

  it("Comentário vazio é salvo como string vazia", async () => {
    const adminCaller = appRouter.createCaller(adminCtx);

    const relatorio = await adminCaller.relatoriosLivres.create({
      lojasIds: [lojaId],
      dataVisita: new Date(),
      descricao: "Relatório sem comentário",
      comentarioAdmin: "",
      fotos: JSON.stringify([]),
      pendentes: [],
    });

    expect(relatorio).toBeDefined();
    // String vazia é salva como string vazia (comportamento normal)
    expect(relatorio.comentarioAdmin).toBe("");
  });
});
