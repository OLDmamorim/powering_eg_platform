import { describe, it, expect, vi } from 'vitest';

// Test the PDF text parsing logic without needing actual DB
describe('PDF NPS Processor - Parsing Logic', () => {
  // Simulated PDF text output (based on real NPS02.2026.pdf)
  const samplePdfText = `NPS - Net Promoter Score | Análise Geral
Qtd Reviews
2026 |2026 Total
Jan |Fev |Mar |Abr |Mai |Jun |Jul |Ago |Set |Out |Nov |Dez
0 |8 |7 |15
10 |522 |559 |1 081
TOTAL |677 |740 |1 417
NPS |88,3% 84,5% |86,3%
-- 1 of 7 --
NPS - Net Promoter Score | Análise por Loja
Rótulos de Coluna
NPS |% Respostas
2026 |2026 Total |2026 |2026 Total
Loja |jan |fev |jan |fev
ABRANTES |100,0% |100,0% 100,0% |18,5% |8,3% 13,1%
BARCELOS |100,0% |86,7% 89,5% |6,3% |20,8% 14,0%
FAMALICÃO |100,0% |78,3% 80,0% |1,4% |18,1% 9,4%
AMARANTE |100,0% 100,0% |11,8% 5,7%
-- 2 of 7 --
NPS - Net Promoter Score | Análise por Gestor de Zona/Loja`;

  it('should detect months from header line', () => {
    const headerLine = 'Loja |jan |fev';
    const mesesMap: Record<string, number> = {
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3,
      'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7,
      'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
    };
    
    const meses: number[] = [];
    const lower = headerLine.toLowerCase();
    for (const [nome, idx] of Object.entries(mesesMap)) {
      const regex = new RegExp(`\\b${nome}\\b`, 'i');
      if (regex.test(lower)) {
        meses.push(idx);
      }
    }
    
    expect(meses.sort((a, b) => a - b)).toEqual([0, 1]); // jan=0, fev=1
  });

  it('should detect months for full year header', () => {
    const headerLine = 'Loja |jan |fev |mar |abr |mai |jun |jul |ago |set |out |nov |dez';
    const mesesMap: Record<string, number> = {
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3,
      'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7,
      'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
    };
    
    const meses: number[] = [];
    const lower = headerLine.toLowerCase();
    for (const [nome, idx] of Object.entries(mesesMap)) {
      const regex = new RegExp(`\\b${nome}\\b`, 'i');
      if (regex.test(lower)) {
        meses.push(idx);
      }
    }
    
    expect(meses.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('should extract percentage values from a line', () => {
    const line = 'ABRANTES |100,0% |100,0% 100,0% |18,5% |8,3% 13,1%';
    const matches = line.match(/-?\d+[.,]\d+%/g) || [];
    
    expect(matches).toEqual(['100,0%', '100,0%', '100,0%', '18,5%', '8,3%', '13,1%']);
  });

  it('should extract loja name from a line', () => {
    const line = 'ABRANTES |100,0% |100,0% 100,0% |18,5% |8,3% 13,1%';
    const firstPercMatch = line.match(/-?\d+[.,]\d+%/);
    const lojaNome = line.substring(0, firstPercMatch!.index!).replace(/\|/g, '').trim();
    
    expect(lojaNome).toBe('ABRANTES');
  });

  it('should extract loja name with spaces and hyphens', () => {
    const line = 'BRAGA - MINHO CENTER |100,0% |90,9% 95,0% |10,5% |12,9% 11,7%';
    const firstPercMatch = line.match(/-?\d+[.,]\d+%/);
    const lojaNome = line.substring(0, firstPercMatch!.index!).replace(/\|/g, '').trim();
    
    expect(lojaNome).toBe('BRAGA - MINHO CENTER');
  });

  it('should parse percentage value correctly', () => {
    const parsePercentValue = (val: string): number | null => {
      if (!val || val.trim() === '') return null;
      const str = val.trim().replace('%', '').replace(',', '.');
      const num = parseFloat(str);
      if (isNaN(num)) return null;
      return num / 100;
    };

    expect(parsePercentValue('100,0%')).toBeCloseTo(1.0);
    expect(parsePercentValue('86,7%')).toBeCloseTo(0.867);
    expect(parsePercentValue('-100,0%')).toBeCloseTo(-1.0);
    expect(parsePercentValue('0,0%')).toBeCloseTo(0.0);
    expect(parsePercentValue('42,9%')).toBeCloseTo(0.429);
    expect(parsePercentValue('')).toBeNull();
  });

  it('should handle line with missing months (only fev data)', () => {
    // AMARANTE only has fev data, no jan
    const line = 'AMARANTE |100,0% 100,0% |11,8% 5,7%';
    const matches = line.match(/-?\d+[.,]\d+%/g) || [];
    
    // Should have 4 values: NPS fev, NPS total, taxa fev, taxa total
    expect(matches.length).toBe(4);
    expect(matches).toEqual(['100,0%', '100,0%', '11,8%', '5,7%']);
  });

  it('should handle negative NPS values', () => {
    const line = 'RIO MAIOR |-100,0% |-100,0% -100,0% |1,6% |1,6% 1,6%';
    const matches = line.match(/-?\d+[.,]\d+%/g) || [];
    
    expect(matches.length).toBe(6);
    expect(matches[0]).toBe('-100,0%');
    expect(matches[1]).toBe('-100,0%');
    expect(matches[2]).toBe('-100,0%');
  });

  it('should correctly identify section boundaries', () => {
    const lines = samplePdfText.split('\n').filter(l => l.trim());
    
    // Find "Análise por Loja" section
    const lojaSection = lines.findIndex(l => l.includes('Análise por Loja'));
    expect(lojaSection).toBeGreaterThan(-1);
    
    // Find "Análise por Gestor" section (end boundary)
    const gestorSection = lines.findIndex(l => l.includes('Análise por Gestor'));
    expect(gestorSection).toBeGreaterThan(lojaSection);
  });

  it('should skip page separators and headers', () => {
    const skipLines = [
      '-- 2 of 7 --',
      'NPS - Net Promoter Score | Análise por Loja',
      'Rótulos de Coluna',
      'NPS |% Respostas',
      '2026 |2026 Total |2026 |2026 Total',
    ];
    
    for (const line of skipLines) {
      const shouldSkip = line.startsWith('--') || 
        line.includes('Rótulos de Coluna') || 
        line.includes('NPS |% Respostas') ||
        line.includes('2026 |2026 Total') ||
        line.includes('Análise por Gestor') ||
        line.includes('Análise por Loja');
      
      expect(shouldSkip).toBe(true);
    }
  });

  it('should normalize loja names for matching', () => {
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        .trim()
        .replace(/\u00A0/g, ' ')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, ' - ');
    };

    expect(normalizeName('FAMALICÃO')).toBe('famalicão');
    expect(normalizeName('BRAGA - MINHO CENTER')).toBe('braga - minho center');
    expect(normalizeName('VIANA DO CASTELO')).toBe('viana do castelo');
    expect(normalizeName('  PAÇOS DE FERREIRA  ')).toBe('paços de ferreira');
  });

  it('should correctly distribute values for complete line (2 months)', () => {
    // ABRANTES |100,0% |100,0% 100,0% |18,5% |8,3% 13,1%
    // Expected: NPS jan=100%, NPS fev=100%, NPS total=100%, Taxa jan=18.5%, Taxa fev=8.3%, Taxa total=13.1%
    const values = ['100,0%', '100,0%', '100,0%', '18,5%', '8,3%', '13,1%'];
    const numMeses = 2; // jan, fev
    const valoresEsperadosCompleto = (numMeses + 1) * 2; // 6
    
    expect(values.length).toBe(valoresEsperadosCompleto);
    
    // First numMeses values = NPS per month
    // Next 1 value = NPS total
    // Next numMeses values = Taxa per month
    // Last 1 value = Taxa total
    const npsJan = values[0]; // 100,0%
    const npsFev = values[1]; // 100,0%
    const npsTotal = values[2]; // 100,0%
    const taxaJan = values[3]; // 18,5%
    const taxaFev = values[4]; // 8,3%
    const taxaTotal = values[5]; // 13,1%
    
    expect(npsJan).toBe('100,0%');
    expect(npsFev).toBe('100,0%');
    expect(npsTotal).toBe('100,0%');
    expect(taxaJan).toBe('18,5%');
    expect(taxaFev).toBe('8,3%');
    expect(taxaTotal).toBe('13,1%');
  });
});
