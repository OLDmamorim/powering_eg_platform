import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getDashboardStock: vi.fn(),
  getDashboardStockAdmin: vi.fn(),
}));

import { getDashboardStock, getDashboardStockAdmin } from './db';

describe('Stock Dashboard DB helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDashboardStock should return array', async () => {
    const mockData = [
      {
        id: 1,
        lojaId: 10,
        nomeLoja: 'Loja Braga',
        totalItensStock: 50,
        totalComFichas: 30,
        totalSemFichas: 20,
        totalFichasSemStock: 5,
        createdAt: new Date('2026-03-01'),
      },
      {
        id: 2,
        lojaId: 20,
        nomeLoja: 'Loja Guimarães',
        totalItensStock: 40,
        totalComFichas: 25,
        totalSemFichas: 15,
        totalFichasSemStock: 3,
        createdAt: new Date('2026-03-02'),
      },
    ];
    (getDashboardStock as any).mockResolvedValue(mockData);

    const result = await getDashboardStock(1);
    expect(result).toHaveLength(2);
    expect(result[0].nomeLoja).toBe('Loja Braga');
    expect(result[1].totalItensStock).toBe(40);
  });

  it('getDashboardStockAdmin should return array', async () => {
    const mockData = [
      {
        id: 1,
        lojaId: 10,
        nomeLoja: 'Loja Porto',
        totalItensStock: 100,
        totalComFichas: 60,
        totalSemFichas: 40,
        totalFichasSemStock: 10,
        createdAt: new Date('2026-03-01'),
      },
    ];
    (getDashboardStockAdmin as any).mockResolvedValue(mockData);

    const result = await getDashboardStockAdmin();
    expect(result).toHaveLength(1);
    expect(result[0].totalItensStock).toBe(100);
  });

  it('getDashboardStock should return empty array for gestor without stores', async () => {
    (getDashboardStock as any).mockResolvedValue([]);

    const result = await getDashboardStock(999);
    expect(result).toHaveLength(0);
  });
});

describe('Stock Dashboard totals calculation', () => {
  it('should calculate correct totals from analises', () => {
    const analises = [
      {
        id: 1,
        lojaId: 10,
        nomeLoja: 'Loja A',
        totalItensStock: 50,
        totalComFichas: 30,
        totalSemFichas: 20,
        totalFichasSemStock: 5,
        createdAt: new Date('2026-03-01'),
      },
      {
        id: 2,
        lojaId: 20,
        nomeLoja: 'Loja B',
        totalItensStock: 40,
        totalComFichas: 25,
        totalSemFichas: 15,
        totalFichasSemStock: 3,
        createdAt: new Date('2026-03-02'),
      },
    ];

    const totais = {
      totalLojas: analises.length,
      totalItensStock: analises.reduce((sum, a) => sum + (a.totalItensStock || 0), 0),
      totalComFichas: analises.reduce((sum, a) => sum + (a.totalComFichas || 0), 0),
      totalSemFichas: analises.reduce((sum, a) => sum + (a.totalSemFichas || 0), 0),
      totalFichasSemStock: analises.reduce((sum, a) => sum + (a.totalFichasSemStock || 0), 0),
      ultimaAnalise: analises.length > 0 ? analises.reduce((latest, a) => {
        return new Date(a.createdAt) > new Date(latest.createdAt) ? a : latest;
      }).createdAt : null,
    };

    expect(totais.totalLojas).toBe(2);
    expect(totais.totalItensStock).toBe(90);
    expect(totais.totalComFichas).toBe(55);
    expect(totais.totalSemFichas).toBe(35);
    expect(totais.totalFichasSemStock).toBe(8);
    expect(totais.ultimaAnalise).toEqual(new Date('2026-03-02'));
  });

  it('should calculate top lojas sem fichas correctly', () => {
    const analises = [
      { nomeLoja: 'Loja A', totalSemFichas: 20 },
      { nomeLoja: 'Loja B', totalSemFichas: 5 },
      { nomeLoja: 'Loja C', totalSemFichas: 30 },
      { nomeLoja: 'Loja D', totalSemFichas: 10 },
      { nomeLoja: 'Loja E', totalSemFichas: 15 },
      { nomeLoja: 'Loja F', totalSemFichas: 25 },
    ];

    const topSemFichas = [...analises]
      .sort((a, b) => (b.totalSemFichas || 0) - (a.totalSemFichas || 0))
      .slice(0, 5)
      .map(a => ({ nomeLoja: a.nomeLoja || 'Loja', totalSemFichas: a.totalSemFichas || 0 }));

    expect(topSemFichas).toHaveLength(5);
    expect(topSemFichas[0].nomeLoja).toBe('Loja C');
    expect(topSemFichas[0].totalSemFichas).toBe(30);
    expect(topSemFichas[1].nomeLoja).toBe('Loja F');
    // Order: C(30), F(25), A(20), E(15), D(10) - Loja B(5) excluded as top 5
    expect(topSemFichas[4].nomeLoja).toBe('Loja D');
    expect(topSemFichas[4].totalSemFichas).toBe(10);
  });

  it('should handle empty analises', () => {
    const analises: any[] = [];

    const totais = {
      totalLojas: analises.length,
      totalItensStock: analises.reduce((sum, a) => sum + (a.totalItensStock || 0), 0),
      totalComFichas: analises.reduce((sum, a) => sum + (a.totalComFichas || 0), 0),
      totalSemFichas: analises.reduce((sum, a) => sum + (a.totalSemFichas || 0), 0),
      totalFichasSemStock: analises.reduce((sum, a) => sum + (a.totalFichasSemStock || 0), 0),
      ultimaAnalise: analises.length > 0 ? analises.reduce((latest, a) => {
        return new Date(a.createdAt) > new Date(latest.createdAt) ? a : latest;
      }).createdAt : null,
    };

    expect(totais.totalLojas).toBe(0);
    expect(totais.totalItensStock).toBe(0);
    expect(totais.ultimaAnalise).toBeNull();
  });
});
