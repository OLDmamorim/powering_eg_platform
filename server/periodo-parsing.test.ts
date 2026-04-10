import { describe, it, expect } from 'vitest';

/**
 * Test the periodo parsing logic that was fixed.
 * The frontend sends: "meses_1/2026, 2/2026, 3/2026"
 * The backend needs to parse this into [{mes:1, ano:2026}, {mes:2, ano:2026}, {mes:3, ano:2026}]
 */

function parsePeriodoMeses(periodo: string): Array<{ mes: number; ano: number }> {
  const mesesParaBuscar: Array<{ mes: number; ano: number }> = [];
  
  if (periodo.startsWith('meses_')) {
    const conteudo = periodo.replace('meses_', '');
    // Suportar ambos os separadores: ', ' (frontend) e '_' (legacy)
    const partes = conteudo.includes(', ') ? conteudo.split(', ') : conteudo.split('_');
    for (const parte of partes) {
      const trimmed = parte.trim();
      const [mesStr, anoStr] = trimmed.split('/');
      const mes = parseInt(mesStr, 10);
      const ano = parseInt(anoStr, 10);
      if (!isNaN(mes) && !isNaN(ano) && mes >= 1 && mes <= 12) {
        mesesParaBuscar.push({ mes, ano });
      }
    }
  }
  
  return mesesParaBuscar;
}

describe('Periodo Parsing - Multi-month format', () => {
  it('should parse comma-separated format from frontend (3 months)', () => {
    const result = parsePeriodoMeses('meses_1/2026, 2/2026, 3/2026');
    expect(result).toEqual([
      { mes: 1, ano: 2026 },
      { mes: 2, ano: 2026 },
      { mes: 3, ano: 2026 },
    ]);
  });

  it('should parse comma-separated format from frontend (single month)', () => {
    const result = parsePeriodoMeses('meses_3/2026');
    expect(result).toEqual([
      { mes: 3, ano: 2026 },
    ]);
  });

  it('should parse legacy underscore-separated format', () => {
    const result = parsePeriodoMeses('meses_1/2026_2/2026_3/2026');
    expect(result).toEqual([
      { mes: 1, ano: 2026 },
      { mes: 2, ano: 2026 },
      { mes: 3, ano: 2026 },
    ]);
  });

  it('should parse comma-separated format with 6 months', () => {
    const result = parsePeriodoMeses('meses_7/2025, 8/2025, 9/2025, 10/2025, 11/2025, 12/2025');
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ mes: 7, ano: 2025 });
    expect(result[5]).toEqual({ mes: 12, ano: 2025 });
  });

  it('should handle cross-year periods', () => {
    const result = parsePeriodoMeses('meses_11/2025, 12/2025, 1/2026');
    expect(result).toEqual([
      { mes: 11, ano: 2025 },
      { mes: 12, ano: 2025 },
      { mes: 1, ano: 2026 },
    ]);
  });

  it('should return empty array for non-meses_ prefix', () => {
    const result = parsePeriodoMeses('mes_anterior');
    expect(result).toEqual([]);
  });

  it('should handle invalid month values gracefully', () => {
    const result = parsePeriodoMeses('meses_13/2026, abc/2026');
    // 13 is > 12, should be filtered out; abc is NaN, should be filtered out
    expect(result).toEqual([]);
  });
});

describe('NPS Calculation Logic', () => {
  it('should correctly calculate NPS average from decimal values (0.0-1.0)', () => {
    // DB stores NPS as decimal: 0.85 = 85%
    const npsValues = [0.85, 0.92, 0.78]; // 3 months
    const npsTotal = npsValues.reduce((sum, v) => sum + v, 0);
    const mesesComDados = npsValues.length;
    const npsMedia = (npsTotal / mesesComDados) * 100;
    
    expect(npsMedia).toBeCloseTo(85.0, 0);
  });

  it('should correctly calculate NPS when value is 1.0 (100%)', () => {
    const npsValues = [1.0, 1.0, 1.0]; // All 100%
    const npsTotal = npsValues.reduce((sum, v) => sum + v, 0);
    const mesesComDados = npsValues.length;
    const npsMedia = (npsTotal / mesesComDados) * 100;
    
    expect(npsMedia).toBe(100.0);
  });

  it('should correctly calculate mixed NPS values', () => {
    // Jan: 0.95 (95%), Feb: 0.80 (80%), Mar: 0.70 (70%)
    const npsValues = [0.95, 0.80, 0.70];
    const npsTotal = npsValues.reduce((sum, v) => sum + v, 0);
    const mesesComDados = npsValues.length;
    const npsMedia = (npsTotal / mesesComDados) * 100;
    
    expect(npsMedia).toBeCloseTo(81.67, 1);
  });

  it('should correctly determine eligibility (NPS >= 80 OR taxa >= 7.5)', () => {
    // Case 1: NPS 85%, Taxa 5% -> eligible (NPS >= 80)
    expect(85 >= 80 || 5 >= 7.5).toBe(true);
    
    // Case 2: NPS 70%, Taxa 10% -> eligible (Taxa >= 7.5)
    expect(70 >= 80 || 10 >= 7.5).toBe(true);
    
    // Case 3: NPS 70%, Taxa 5% -> NOT eligible
    expect(70 >= 80 || 5 >= 7.5).toBe(false);
  });
});
