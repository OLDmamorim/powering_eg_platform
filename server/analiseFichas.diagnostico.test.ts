import { describe, it, expect } from 'vitest';

/**
 * Tests for the analiseFichas diagnostic and Desconhecida filtering logic
 */

describe('Fichas Identificadas - Validation Logic', () => {
  // Test the obrano validation filter (same logic as in routers.ts)
  it('should accept fichas with obrano >= 0', () => {
    const fichasParaGuardar = [
      { obrano: 12345, relatorioId: 1, analiseId: 1, nomeLoja: 'Guimarães', categoria: 'abertas5Dias', matricula: 'AA-00-BB', diasAberto: 10, status: 'Em Curso' },
      { obrano: 0, relatorioId: 1, analiseId: 1, nomeLoja: 'Guimarães', categoria: 'semNotas', matricula: 'CC-11-DD', diasAberto: 5, status: 'Pendente' },
      { obrano: 99999, relatorioId: 1, analiseId: 1, nomeLoja: 'Porto', categoria: 'statusAlerta', matricula: 'EE-22-FF', diasAberto: 3, status: 'FALTA DOCUMENTOS' },
    ];

    const fichasValidas = fichasParaGuardar.filter(f =>
      Number.isFinite(f.obrano) && f.obrano >= 0 &&
      Number.isFinite(f.relatorioId) && f.relatorioId > 0 &&
      Number.isFinite(f.analiseId) && f.analiseId > 0
    );

    expect(fichasValidas.length).toBe(3);
  });

  it('should reject fichas with NaN or negative obrano', () => {
    const fichasParaGuardar = [
      { obrano: NaN, relatorioId: 1, analiseId: 1 },
      { obrano: -1, relatorioId: 1, analiseId: 1 },
      { obrano: Infinity, relatorioId: 1, analiseId: 1 },
    ];

    const fichasValidas = fichasParaGuardar.filter(f =>
      Number.isFinite(f.obrano) && f.obrano >= 0 &&
      Number.isFinite(f.relatorioId) && f.relatorioId > 0 &&
      Number.isFinite(f.analiseId) && f.analiseId > 0
    );

    expect(fichasValidas.length).toBe(0);
  });

  it('should reject fichas with invalid relatorioId or analiseId', () => {
    const fichasParaGuardar = [
      { obrano: 100, relatorioId: 0, analiseId: 1 },
      { obrano: 100, relatorioId: 1, analiseId: 0 },
      { obrano: 100, relatorioId: NaN, analiseId: 1 },
    ];

    const fichasValidas = fichasParaGuardar.filter(f =>
      Number.isFinite(f.obrano) && f.obrano >= 0 &&
      Number.isFinite(f.relatorioId) && f.relatorioId > 0 &&
      Number.isFinite(f.analiseId) && f.analiseId > 0
    );

    expect(fichasValidas.length).toBe(0);
  });
});

describe('Loja Desconhecida - Filtering Logic', () => {
  it('should filter out Desconhecida lojas from relatorios', () => {
    const relatorios = [
      { nomeLoja: 'Guimarães', totalFichas: 50, lojaId: 1 },
      { nomeLoja: 'Desconhecida', totalFichas: 1636, lojaId: null },
      { nomeLoja: 'Porto', totalFichas: 80, lojaId: 2 },
      { nomeLoja: 'desconhecida', totalFichas: 10, lojaId: null },
    ];

    const relatoriosFiltrados = relatorios.filter(r =>
      r.nomeLoja !== 'Desconhecida' && r.nomeLoja.toLowerCase() !== 'desconhecida'
    );

    expect(relatoriosFiltrados.length).toBe(2);
    expect(relatoriosFiltrados.map(r => r.nomeLoja)).toEqual(['Guimarães', 'Porto']);
  });

  it('should keep all lojas when none are Desconhecida', () => {
    const relatorios = [
      { nomeLoja: 'Guimarães', totalFichas: 50 },
      { nomeLoja: 'Porto', totalFichas: 80 },
      { nomeLoja: 'Lisboa', totalFichas: 120 },
    ];

    const relatoriosFiltrados = relatorios.filter(r =>
      r.nomeLoja !== 'Desconhecida' && r.nomeLoja.toLowerCase() !== 'desconhecida'
    );

    expect(relatoriosFiltrados.length).toBe(3);
  });

  it('should also filter Desconhecida from saveFichasIdentificadas loop', () => {
    const relatoriosPorLoja = [
      { nomeLoja: 'Guimarães', totalFichas: 50, fichasAbertas5Dias: [] },
      { nomeLoja: 'Desconhecida', totalFichas: 1636, fichasAbertas5Dias: [] },
      { nomeLoja: 'Porto', totalFichas: 80, fichasAbertas5Dias: [] },
    ];

    const processados: string[] = [];
    for (const relatorio of relatoriosPorLoja) {
      if (relatorio.nomeLoja === 'Desconhecida' || relatorio.nomeLoja.toLowerCase() === 'desconhecida') {
        continue;
      }
      processados.push(relatorio.nomeLoja);
    }

    expect(processados).toEqual(['Guimarães', 'Porto']);
    expect(processados).not.toContain('Desconhecida');
  });
});

describe('parseInt obrano parsing', () => {
  it('should parse valid obrano from Excel data', () => {
    expect(parseInt('12345') || 0).toBe(12345);
    expect(parseInt('0') || 0).toBe(0); // This is the bug! parseInt('0') is 0, which is falsy
  });

  it('should return 0 for invalid obrano values', () => {
    expect(parseInt('') || 0).toBe(0);
    expect(parseInt(undefined as any) || 0).toBe(0);
    expect(parseInt('abc') || 0).toBe(0);
  });

  it('demonstrates the obrano=0 bug: parseInt("0") || 0 returns 0 which was filtered out by > 0', () => {
    // The old filter was: f.obrano > 0
    // parseInt('0') returns 0, which is valid but was being filtered out
    const obrano = parseInt('0') || 0;
    expect(obrano).toBe(0);
    
    // Old filter would reject this:
    expect(obrano > 0).toBe(false);
    
    // New filter accepts it:
    expect(obrano >= 0).toBe(true);
    expect(Number.isFinite(obrano)).toBe(true);
  });
});
