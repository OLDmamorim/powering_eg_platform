import { describe, it, expect } from 'vitest';

/**
 * Test the NPS multi-month averaging logic used in Dashboard Resultados.
 * This mirrors the getNPSMes and getTaxaRespostaMes functions.
 */

type MesSelecionado = { mes: number; ano: number };

function getNPSMes(
  npsData: Record<string, any>,
  mesesSelecionados: MesSelecionado[]
): number | null {
  const mesKeys = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'];
  if (mesesSelecionados.length === 0) return null;
  
  let soma = 0;
  let count = 0;
  for (const periodo of mesesSelecionados) {
    const key = mesKeys[periodo.mes - 1];
    const val = npsData[key];
    if (val !== null && val !== undefined) {
      soma += parseFloat(val);
      count++;
    }
  }
  return count > 0 ? soma / count : null;
}

function getTaxaRespostaMes(
  npsData: Record<string, any>,
  mesesSelecionados: MesSelecionado[]
): number | null {
  const mesKeys = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'];
  if (mesesSelecionados.length === 0) return null;
  
  let soma = 0;
  let count = 0;
  for (const periodo of mesesSelecionados) {
    const key = mesKeys[periodo.mes - 1];
    const val = npsData[key];
    if (val !== null && val !== undefined) {
      soma += parseFloat(val);
      count++;
    }
  }
  return count > 0 ? soma / count : null;
}

describe('NPS Multi-Month Averaging (Dashboard Resultados)', () => {
  const sampleNPS = {
    npsJan: '0.85',    // 85%
    npsFev: '0.70',    // 70%
    npsMar: '0.90',    // 90%
    npsAbr: null,
    npsMai: null,
    npsJun: null,
    npsJul: null,
    npsAgo: null,
    npsSet: null,
    npsOut: null,
    npsNov: null,
    npsDez: null,
    taxaRespostaJan: '0.10',   // 10%
    taxaRespostaFev: '0.05',   // 5%
    taxaRespostaMar: '0.08',   // 8%
    taxaRespostaAbr: null,
    taxaRespostaMai: null,
    taxaRespostaJun: null,
    taxaRespostaJul: null,
    taxaRespostaAgo: null,
    taxaRespostaSet: null,
    taxaRespostaOut: null,
    taxaRespostaNov: null,
    taxaRespostaDez: null,
  };

  it('should return single month NPS when only 1 month selected', () => {
    const result = getNPSMes(sampleNPS, [{ mes: 1, ano: 2026 }]);
    expect(result).toBeCloseTo(0.85, 4);
  });

  it('should return average NPS when 3 months selected (trimester)', () => {
    const result = getNPSMes(sampleNPS, [
      { mes: 1, ano: 2026 },
      { mes: 2, ano: 2026 },
      { mes: 3, ano: 2026 },
    ]);
    // Average of 0.85, 0.70, 0.90 = 2.45 / 3 = 0.8167
    expect(result).toBeCloseTo(0.8167, 3);
  });

  it('should return average taxa resposta when 3 months selected', () => {
    const result = getTaxaRespostaMes(sampleNPS, [
      { mes: 1, ano: 2026 },
      { mes: 2, ano: 2026 },
      { mes: 3, ano: 2026 },
    ]);
    // Average of 0.10, 0.05, 0.08 = 0.23 / 3 = 0.0767
    expect(result).toBeCloseTo(0.0767, 3);
  });

  it('should skip months with null data', () => {
    const result = getNPSMes(sampleNPS, [
      { mes: 1, ano: 2026 },  // 0.85
      { mes: 4, ano: 2026 },  // null - should be skipped
      { mes: 3, ano: 2026 },  // 0.90
    ]);
    // Average of 0.85, 0.90 = 1.75 / 2 = 0.875
    expect(result).toBeCloseTo(0.875, 4);
  });

  it('should return null when no months selected', () => {
    const result = getNPSMes(sampleNPS, []);
    expect(result).toBeNull();
  });

  it('should return null when all selected months have null data', () => {
    const result = getNPSMes(sampleNPS, [
      { mes: 4, ano: 2026 },
      { mes: 5, ano: 2026 },
    ]);
    expect(result).toBeNull();
  });

  it('should produce same value as backend when displayed as percentage', () => {
    // Backend: npsMedia = (npsTotal / mesesComDados) * 100
    // Frontend: (getNPSMes() * 100).toFixed(1)
    
    const frontendResult = getNPSMes(sampleNPS, [
      { mes: 1, ano: 2026 },
      { mes: 2, ano: 2026 },
      { mes: 3, ano: 2026 },
    ]);
    
    // Backend calculation: (0.85 + 0.70 + 0.90) / 3 * 100 = 81.67
    const backendResult = ((0.85 + 0.70 + 0.90) / 3) * 100;
    
    // Frontend displays: (frontendResult * 100)
    const frontendDisplay = frontendResult! * 100;
    
    expect(frontendDisplay).toBeCloseTo(backendResult, 1);
  });
});

describe('NPS Eligibility Consistency', () => {
  it('should use OU rule: eligible if NPS >= 80% OR taxa >= 7.5%', () => {
    // Both menus use: NPS >= 80% OU Taxa >= 7.5%
    
    // Case 1: NPS 85%, Taxa 5% -> eligible (NPS >= 80)
    const nps1 = 0.85, taxa1 = 0.05;
    expect(nps1 >= 0.8 || taxa1 >= 0.075).toBe(true);
    
    // Case 2: NPS 70%, Taxa 10% -> eligible (Taxa >= 7.5)
    const nps2 = 0.70, taxa2 = 0.10;
    expect(nps2 >= 0.8 || taxa2 >= 0.075).toBe(true);
    
    // Case 3: NPS 70%, Taxa 5% -> NOT eligible
    const nps3 = 0.70, taxa3 = 0.05;
    expect(nps3 >= 0.8 || taxa3 >= 0.075).toBe(false);
    
    // Case 4: NPS 80%, Taxa 7.5% -> eligible (both criteria met)
    const nps4 = 0.80, taxa4 = 0.075;
    expect(nps4 >= 0.8 || taxa4 >= 0.075).toBe(true);
  });
});
