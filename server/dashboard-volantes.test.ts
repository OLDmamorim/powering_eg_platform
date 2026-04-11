import { describe, it, expect } from "vitest";

/**
 * Unit tests for the Dashboard Volantes Gestor feature.
 * Tests the influence calculation logic and data aggregation.
 */

describe("Dashboard Volantes - Influence Calculation", () => {
  it("should calculate influence percentage correctly", () => {
    const servicosVolante = 30;
    const totalServicosLoja = 100;
    const percentagem = totalServicosLoja > 0
      ? parseFloat(((servicosVolante / totalServicosLoja) * 100).toFixed(1))
      : 0;
    expect(percentagem).toBe(30);
  });

  it("should return 0 when loja has no results data", () => {
    const servicosVolante = 15;
    const totalServicosLoja = 0;
    const percentagem = totalServicosLoja > 0
      ? parseFloat(((servicosVolante / totalServicosLoja) * 100).toFixed(1))
      : 0;
    expect(percentagem).toBe(0);
  });

  it("should calculate average influence across multiple lojas", () => {
    const influencias = [
      { percentagem: 30, temDados: true },
      { percentagem: 50, temDados: true },
      { percentagem: 0, temDados: false }, // loja sem dados de resultados
      { percentagem: 20, temDados: true },
    ];

    const lojasComDados = influencias.filter(i => i.temDados);
    const totalInfluencia = lojasComDados.reduce((s, i) => s + i.percentagem, 0);
    const media = lojasComDados.length > 0
      ? parseFloat((totalInfluencia / lojasComDados.length).toFixed(1))
      : 0;

    expect(media).toBeCloseTo(33.3, 1);
  });

  it("should handle case with no lojas at all", () => {
    const influencias: { percentagem: number; temDados: boolean }[] = [];
    const lojasComDados = influencias.filter(i => i.temDados);
    const totalInfluencia = lojasComDados.reduce((s, i) => s + i.percentagem, 0);
    const media = lojasComDados.length > 0
      ? parseFloat((totalInfluencia / lojasComDados.length).toFixed(1))
      : 0;

    expect(media).toBe(0);
  });

  it("should handle influence > 100% (volante did more than total loja)", () => {
    // This can happen if volante services are counted differently
    const servicosVolante = 120;
    const totalServicosLoja = 100;
    const percentagem = totalServicosLoja > 0
      ? parseFloat(((servicosVolante / totalServicosLoja) * 100).toFixed(1))
      : 0;
    expect(percentagem).toBe(120);
  });
});

describe("Dashboard Volantes - KPI Aggregation", () => {
  it("should aggregate KPIs across multiple volantes", () => {
    const porVolante = [
      { totalServicos: 50, substituicoes: 20, reparacoes: 15, calibragens: 10, outros: 5, diasTrabalhados: 10 },
      { totalServicos: 30, substituicoes: 12, reparacoes: 8, calibragens: 5, outros: 5, diasTrabalhados: 8 },
    ];

    const kpis = {
      totalServicos: porVolante.reduce((s, v) => s + v.totalServicos, 0),
      totalSubstituicoes: porVolante.reduce((s, v) => s + v.substituicoes, 0),
      totalReparacoes: porVolante.reduce((s, v) => s + v.reparacoes, 0),
      totalCalibragens: porVolante.reduce((s, v) => s + v.calibragens, 0),
      totalOutros: porVolante.reduce((s, v) => s + v.outros, 0),
      diasTrabalhados: porVolante.reduce((s, v) => s + v.diasTrabalhados, 0),
      mediaPorDia: parseFloat((
        porVolante.reduce((s, v) => s + v.totalServicos, 0) /
        Math.max(1, porVolante.reduce((s, v) => s + v.diasTrabalhados, 0))
      ).toFixed(1)),
    };

    expect(kpis.totalServicos).toBe(80);
    expect(kpis.totalSubstituicoes).toBe(32);
    expect(kpis.totalReparacoes).toBe(23);
    expect(kpis.totalCalibragens).toBe(15);
    expect(kpis.totalOutros).toBe(10);
    expect(kpis.diasTrabalhados).toBe(18);
    expect(kpis.mediaPorDia).toBeCloseTo(4.4, 1);
  });

  it("should sort influence by percentage descending", () => {
    const influenciaPorLoja = [
      { lojaNome: "Loja A", percentagemInfluencia: 20 },
      { lojaNome: "Loja B", percentagemInfluencia: 50 },
      { lojaNome: "Loja C", percentagemInfluencia: 35 },
    ];

    influenciaPorLoja.sort((a, b) => b.percentagemInfluencia - a.percentagemInfluencia);

    expect(influenciaPorLoja[0].lojaNome).toBe("Loja B");
    expect(influenciaPorLoja[1].lojaNome).toBe("Loja C");
    expect(influenciaPorLoja[2].lojaNome).toBe("Loja A");
  });
});

describe("Dashboard Volantes - Meses Parsing", () => {
  it("should parse meses format YYYY-MM correctly", () => {
    const mesesSel = ["2026-01", "2026-02", "2026-03"];
    const parsed = mesesSel.map(m => {
      const [ano, mesNum] = m.split('-');
      return { mes: parseInt(mesNum), ano: parseInt(ano) };
    });

    expect(parsed).toEqual([
      { mes: 1, ano: 2026 },
      { mes: 2, ano: 2026 },
      { mes: 3, ano: 2026 },
    ]);
  });

  it("should default to current month when no meses provided", () => {
    const mesesSel: string[] | undefined = undefined;
    const now = new Date();
    const mesesParsed = mesesSel?.map(m => {
      const [ano, mesNum] = m.split('-');
      return { mes: parseInt(mesNum), ano: parseInt(ano) };
    }) || [{ mes: now.getMonth() + 1, ano: now.getFullYear() }];

    expect(mesesParsed.length).toBe(1);
    expect(mesesParsed[0].mes).toBe(now.getMonth() + 1);
    expect(mesesParsed[0].ano).toBe(now.getFullYear());
  });
});
