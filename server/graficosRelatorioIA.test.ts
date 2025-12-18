import { describe, it, expect } from "vitest";
import { gerarRelatorioIACategorias } from "./relatorioCategoriasService";

describe("Gráficos do Relatório IA por Categorias", () => {
  it("deve retornar dados estruturados para gráficos", async () => {
    const resultado = await gerarRelatorioIACategorias(1);

    // Verificar estrutura do retorno
    expect(resultado).toHaveProperty("relatorio");
    expect(resultado).toHaveProperty("dadosGraficos");
    expect(typeof resultado.relatorio).toBe("string");
    expect(resultado.relatorio.length).toBeGreaterThan(0);
  }, 60000);

  it("deve retornar dados de distribuição de status", async () => {
    const resultado = await gerarRelatorioIACategorias(1);

    // Verificar dados de distribuição
    expect(resultado.dadosGraficos).toHaveProperty("distribuicaoStatus");
    expect(Array.isArray(resultado.dadosGraficos.distribuicaoStatus)).toBe(true);

    // Se houver dados, verificar estrutura
    if (resultado.dadosGraficos.distribuicaoStatus.length > 0) {
      const item = resultado.dadosGraficos.distribuicaoStatus[0];
      expect(item).toHaveProperty("categoria");
      expect(item).toHaveProperty("acompanhar");
      expect(item).toHaveProperty("emTratamento");
      expect(item).toHaveProperty("tratado");
      expect(typeof item.categoria).toBe("string");
      expect(typeof item.acompanhar).toBe("number");
      expect(typeof item.emTratamento).toBe("number");
      expect(typeof item.tratado).toBe("number");
    }
  }, 60000);

  it("deve retornar dados de taxa de resolução", async () => {
    const resultado = await gerarRelatorioIACategorias(1);

    // Verificar dados de taxa de resolução
    expect(resultado.dadosGraficos).toHaveProperty("taxaResolucao");
    expect(Array.isArray(resultado.dadosGraficos.taxaResolucao)).toBe(true);

    // Se houver dados, verificar estrutura e ordenação
    if (resultado.dadosGraficos.taxaResolucao.length > 0) {
      const item = resultado.dadosGraficos.taxaResolucao[0];
      expect(item).toHaveProperty("categoria");
      expect(item).toHaveProperty("taxa");
      expect(typeof item.categoria).toBe("string");
      expect(typeof item.taxa).toBe("number");
      expect(item.taxa).toBeGreaterThanOrEqual(0);
      expect(item.taxa).toBeLessThanOrEqual(100);

      // Verificar ordenação crescente
      if (resultado.dadosGraficos.taxaResolucao.length > 1) {
        for (let i = 1; i < resultado.dadosGraficos.taxaResolucao.length; i++) {
          expect(resultado.dadosGraficos.taxaResolucao[i].taxa).toBeGreaterThanOrEqual(
            resultado.dadosGraficos.taxaResolucao[i - 1].taxa
          );
        }
      }
    }
  }, 60000);

  it("deve retornar top 5 categorias críticas", async () => {
    const resultado = await gerarRelatorioIACategorias(1);

    // Verificar dados de categorias críticas
    expect(resultado.dadosGraficos).toHaveProperty("topCategoriasCriticas");
    expect(Array.isArray(resultado.dadosGraficos.topCategoriasCriticas)).toBe(true);
    expect(resultado.dadosGraficos.topCategoriasCriticas.length).toBeLessThanOrEqual(5);

    // Se houver dados, verificar estrutura e ordenação
    if (resultado.dadosGraficos.topCategoriasCriticas.length > 0) {
      const item = resultado.dadosGraficos.topCategoriasCriticas[0];
      expect(item).toHaveProperty("categoria");
      expect(item).toHaveProperty("total");
      expect(typeof item.categoria).toBe("string");
      expect(typeof item.total).toBe("number");
      expect(item.total).toBeGreaterThan(0);

      // Verificar ordenação decrescente
      if (resultado.dadosGraficos.topCategoriasCriticas.length > 1) {
        for (let i = 1; i < resultado.dadosGraficos.topCategoriasCriticas.length; i++) {
          expect(resultado.dadosGraficos.topCategoriasCriticas[i].total).toBeLessThanOrEqual(
            resultado.dadosGraficos.topCategoriasCriticas[i - 1].total
          );
        }
      }
    }
  }, 60000);
});
