import { describe, it, expect } from 'vitest';
import { gerarPDFDashboardVolantesGestor, type DashboardVolantesGestorData } from './pdfDashboardVolantesGestor';

const mockData: DashboardVolantesGestorData = {
  totalVolantes: 3,
  kpis: {
    totalServicos: 150,
    totalSubstituicoes: 80,
    totalReparacoes: 40,
    totalCalibragens: 20,
    totalOutros: 10,
    diasTrabalhados: 45,
    mediaPorDia: 3.3,
    mediaInfluencia: 28.5,
  },
  porVolante: [
    {
      volanteId: 1,
      nome: 'João Silva',
      subZona: 'Minho',
      totalLojas: 5,
      totalServicos: 70,
      substituicoes: 40,
      reparacoes: 20,
      calibragens: 8,
      outros: 2,
      diasTrabalhados: 20,
      mediaPorDia: 3.5,
    },
    {
      volanteId: 2,
      nome: 'Pedro Santos',
      subZona: 'Vale do Sousa',
      totalLojas: 4,
      totalServicos: 50,
      substituicoes: 25,
      reparacoes: 15,
      calibragens: 7,
      outros: 3,
      diasTrabalhados: 15,
      mediaPorDia: 3.3,
    },
    {
      volanteId: 3,
      nome: 'Ana Costa',
      subZona: null,
      totalLojas: 3,
      totalServicos: 30,
      substituicoes: 15,
      reparacoes: 5,
      calibragens: 5,
      outros: 5,
      diasTrabalhados: 10,
      mediaPorDia: 3.0,
    },
  ],
  pedidosApoio: {
    total: 12,
    aprovados: 8,
    pendentes: 3,
    reprovados: 1,
  },
  topLojas: [
    { lojaId: 1, lojaNome: 'Braga', total: 25 },
    { lojaId: 2, lojaNome: 'Porto', total: 20 },
    { lojaId: 3, lojaNome: 'Guimarães', total: 18 },
    { lojaId: 4, lojaNome: 'Viana do Castelo', total: 15 },
    { lojaId: 5, lojaNome: 'Maia', total: 12 },
  ],
  influenciaPorLoja: [
    { lojaId: 1, lojaNome: 'Braga', servicosVolante: 25, totalServicosLoja: 80, percentagemInfluencia: 31.3 },
    { lojaId: 2, lojaNome: 'Porto', servicosVolante: 20, totalServicosLoja: 120, percentagemInfluencia: 16.7 },
    { lojaId: 3, lojaNome: 'Guimarães', servicosVolante: 18, totalServicosLoja: 30, percentagemInfluencia: 60.0 },
    { lojaId: 4, lojaNome: 'Viana do Castelo', servicosVolante: 15, totalServicosLoja: 50, percentagemInfluencia: 30.0 },
    { lojaId: 5, lojaNome: 'Maia', servicosVolante: 12, totalServicosLoja: 0, percentagemInfluencia: 0 },
  ],
  periodoLabel: 'Jan 2026, Fev 2026, Mar 2026',
};

describe('gerarPDFDashboardVolantesGestor', () => {
  it('deve gerar um buffer PDF válido', async () => {
    const pdfBuffer = await gerarPDFDashboardVolantesGestor(mockData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // Verificar magic bytes do PDF
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('deve gerar PDF com filtros ativos', async () => {
    const dataComFiltros = {
      ...mockData,
      filtroVolante: 'João Silva',
      filtroLoja: 'Braga',
    };
    const pdfBuffer = await gerarPDFDashboardVolantesGestor(dataComFiltros);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('deve gerar PDF com dados vazios', async () => {
    const dataVazia: DashboardVolantesGestorData = {
      totalVolantes: 0,
      kpis: {
        totalServicos: 0,
        totalSubstituicoes: 0,
        totalReparacoes: 0,
        totalCalibragens: 0,
        totalOutros: 0,
        diasTrabalhados: 0,
        mediaPorDia: 0,
        mediaInfluencia: 0,
      },
      porVolante: [],
      pedidosApoio: { total: 0, aprovados: 0, pendentes: 0, reprovados: 0 },
      topLojas: [],
      influenciaPorLoja: [],
      periodoLabel: 'Abr 2026',
    };
    const pdfBuffer = await gerarPDFDashboardVolantesGestor(dataVazia);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);
  });

  it('deve gerar PDF com um único volante', async () => {
    const dataSingle: DashboardVolantesGestorData = {
      ...mockData,
      totalVolantes: 1,
      porVolante: [mockData.porVolante[0]],
    };
    const pdfBuffer = await gerarPDFDashboardVolantesGestor(dataSingle);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('deve gerar PDF com muitas lojas (paginação)', async () => {
    const muitasLojas = Array.from({ length: 30 }, (_, i) => ({
      lojaId: i + 1,
      lojaNome: `Loja ${i + 1}`,
      servicosVolante: Math.floor(Math.random() * 50),
      totalServicosLoja: Math.floor(Math.random() * 200) + 50,
      percentagemInfluencia: parseFloat((Math.random() * 80).toFixed(1)),
    }));
    const dataGrande: DashboardVolantesGestorData = {
      ...mockData,
      influenciaPorLoja: muitasLojas,
    };
    const pdfBuffer = await gerarPDFDashboardVolantesGestor(dataGrande);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(2000);
  });
});
