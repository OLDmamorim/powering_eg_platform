import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Cumprimento de Relatórios Mínimos", () => {
  let testLojaId: number;
  let testGestorId: number;

  beforeAll(async () => {
    // Criar gestor de teste
    const gestor = await db.createGestor(
      `Gestor Cumprimento ${Date.now()}`,
      `cumprimento-${Date.now()}@test.com`
    );
    testGestorId = gestor.id;

    // Criar loja de teste com mínimos definidos
    const loja = await db.createLoja({
      nome: `Loja Test Cumprimento ${Date.now()}`,
      minimoRelatoriosLivres: 2,
      minimoRelatoriosCompletos: 1,
    });
    testLojaId = loja.id;

    // Associar gestor à loja
    await db.associateGestorLoja(testGestorId, testLojaId);
  });

  it("deve contar 0 relatórios quando loja não tem relatórios este mês", async () => {
    // Criar nova loja sem relatórios
    const lojaVazia = await db.createLoja({
      nome: `Loja Vazia ${Date.now()}`,
    });

    const contagem = await db.contarRelatoriosMesAtualPorLoja(lojaVazia.id);
    
    expect(contagem.relatoriosLivres).toBe(0);
    expect(contagem.relatoriosCompletos).toBe(0);
  });

  it("deve contar relatórios livres criados este mês", async () => {
    // Criar 2 relatórios livres para a loja
    await db.createRelatorioLivre({
      gestorId: testGestorId,
      lojaId: testLojaId,
      dataVisita: new Date(),
      descricao: "Relatório livre teste 1",
    });

    await db.createRelatorioLivre({
      gestorId: testGestorId,
      lojaId: testLojaId,
      dataVisita: new Date(),
      descricao: "Relatório livre teste 2",
    });

    const contagem = await db.contarRelatoriosMesAtualPorLoja(testLojaId);
    
    expect(contagem.relatoriosLivres).toBeGreaterThanOrEqual(2);
  });

  it("deve contar relatórios completos criados este mês", async () => {
    // Criar 1 relatório completo para a loja
    await db.createRelatorioCompleto({
      gestorId: testGestorId,
      lojaId: testLojaId,
      dataVisita: new Date(),
      resumoSupervisao: "Teste supervisão",
      pontosPositivos: "Teste positivos",
      pontosNegativos: "Teste negativos",
    });

    const contagem = await db.contarRelatoriosMesAtualPorLoja(testLojaId);
    
    expect(contagem.relatoriosCompletos).toBeGreaterThanOrEqual(1);
  });

  it("deve identificar quando loja cumpre mínimos", async () => {
    const contagem = await db.contarRelatoriosMesAtualPorLoja(testLojaId);
    const loja = await db.getLojaById(testLojaId);
    
    // Verificar se cumpre mínimos
    const cumpreLivres = contagem.relatoriosLivres >= (loja?.minimoRelatoriosLivres || 0);
    const cumpreCompletos = contagem.relatoriosCompletos >= (loja?.minimoRelatoriosCompletos || 0);
    
    expect(cumpreLivres).toBe(true); // 2 >= 2
    expect(cumpreCompletos).toBe(true); // 1 >= 1
  });
});
