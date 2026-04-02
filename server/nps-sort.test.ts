import { describe, it, expect } from 'vitest';

/**
 * Testa a lógica de ordenação do ranking NPS - Elegibilidade para Prémio
 * Reproduz a função de sort usada em ResultadosDashboard.tsx
 */

interface NpsRankingItem {
  lojaId: number;
  lojaNome: string;
  zona: string;
  nps: number | null;
  taxaResposta: number | null;
  npsAnual: number | null;
  elegivelPremio: boolean;
}

function sortNpsRanking(items: NpsRankingItem[]): NpsRankingItem[] {
  return [...items].sort((a, b) => {
    // Elegíveis primeiro, depois inelegíveis
    if (a.elegivelPremio && !b.elegivelPremio) return -1;
    if (!a.elegivelPremio && b.elegivelPremio) return 1;
    // Dentro de cada grupo: NPS Mês desc (arredondar a 4 casas para evitar problemas de float)
    const aNpsMes = Math.round((a.nps ?? 0) * 10000);
    const bNpsMes = Math.round((b.nps ?? 0) * 10000);
    if (bNpsMes !== aNpsMes) return bNpsMes - aNpsMes;
    // Desempate 1: NPS Anual desc (quem tem valor > quem não tem)
    const aNpsAnual = Math.round((a.npsAnual ?? -1) * 10000);
    const bNpsAnual = Math.round((b.npsAnual ?? -1) * 10000);
    if (bNpsAnual !== aNpsAnual) return bNpsAnual - aNpsAnual;
    // Desempate 2: Taxa de Resposta desc
    const aTaxa = Math.round((a.taxaResposta ?? 0) * 10000);
    const bTaxa = Math.round((b.taxaResposta ?? 0) * 10000);
    return bTaxa - aTaxa;
  });
}

describe('NPS Ranking Sort', () => {
  it('deve colocar elegíveis antes de inelegíveis', () => {
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Loja A', zona: 'Z1', nps: 0.5, taxaResposta: 0.1, npsAnual: 0.6, elegivelPremio: false },
      { lojaId: 2, lojaNome: 'Loja B', zona: 'Z1', nps: 0.85, taxaResposta: 0.1, npsAnual: 0.8, elegivelPremio: true },
    ];
    const sorted = sortNpsRanking(items);
    expect(sorted[0].lojaNome).toBe('Loja B');
    expect(sorted[1].lojaNome).toBe('Loja A');
  });

  it('deve ordenar elegíveis por NPS Mês desc', () => {
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Famalicão', zona: 'MINHO', nps: 0.892, taxaResposta: 0.227, npsAnual: 0.841, elegivelPremio: true },
      { lojaId: 2, lojaNome: 'Santarém', zona: 'LEZIRIA', nps: 0.906, taxaResposta: 0.23, npsAnual: 0.854, elegivelPremio: true },
    ];
    const sorted = sortNpsRanking(items);
    expect(sorted[0].lojaNome).toBe('Santarém');
    expect(sorted[1].lojaNome).toBe('Famalicão');
  });

  it('quando NPS Mês é igual, deve desempatar por NPS Anual desc - caso Barcelos vs Viana', () => {
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Barcelos', zona: 'MINHO', nps: 1.0, taxaResposta: 0.08, npsAnual: 0.926, elegivelPremio: true },
      { lojaId: 2, lojaNome: 'Viana do Castelo', zona: 'MINHO', nps: 1.0, taxaResposta: 0.08, npsAnual: 1.0, elegivelPremio: true },
    ];
    const sorted = sortNpsRanking(items);
    expect(sorted[0].lojaNome).toBe('Viana do Castelo');
    expect(sorted[1].lojaNome).toBe('Barcelos');
  });

  it('quando NPS Mês e NPS Anual são iguais, deve desempatar por Taxa Resposta desc', () => {
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Loja A', zona: 'Z1', nps: 0.9, taxaResposta: 0.1, npsAnual: 0.85, elegivelPremio: true },
      { lojaId: 2, lojaNome: 'Loja B', zona: 'Z1', nps: 0.9, taxaResposta: 0.15, npsAnual: 0.85, elegivelPremio: true },
    ];
    const sorted = sortNpsRanking(items);
    expect(sorted[0].lojaNome).toBe('Loja B');
    expect(sorted[1].lojaNome).toBe('Loja A');
  });

  it('deve tratar NPS Anual null correctamente (lojas com valor antes de lojas sem valor)', () => {
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Loja Sem Anual', zona: 'Z1', nps: 1.0, taxaResposta: 0.1, npsAnual: null, elegivelPremio: true },
      { lojaId: 2, lojaNome: 'Loja Com Anual', zona: 'Z1', nps: 1.0, taxaResposta: 0.1, npsAnual: 0.5, elegivelPremio: true },
    ];
    const sorted = sortNpsRanking(items);
    expect(sorted[0].lojaNome).toBe('Loja Com Anual');
    expect(sorted[1].lojaNome).toBe('Loja Sem Anual');
  });

  it('deve manter inelegíveis ordenados por NPS Mês desc', () => {
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Sacavém', zona: 'LN', nps: 1.0, taxaResposta: 0.055, npsAnual: 0.975, elegivelPremio: false },
      { lojaId: 2, lojaNome: 'Porto ZI', zona: 'GP', nps: 0.933, taxaResposta: 0.05, npsAnual: 0.83, elegivelPremio: false },
      { lojaId: 3, lojaNome: 'Leiria sm', zona: 'C', nps: 0.917, taxaResposta: 0.042, npsAnual: 1.0, elegivelPremio: false },
    ];
    const sorted = sortNpsRanking(items);
    expect(sorted[0].lojaNome).toBe('Sacavém');
    expect(sorted[1].lojaNome).toBe('Porto ZI');
    expect(sorted[2].lojaNome).toBe('Leiria sm');
  });

  it('deve lidar com precisão de float (0.1 + 0.2 !== 0.3)', () => {
    // Simular valores que podem causar problemas de float
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Loja A', zona: 'Z1', nps: 0.8500000000000001, taxaResposta: 0.1, npsAnual: 0.9, elegivelPremio: true },
      { lojaId: 2, lojaNome: 'Loja B', zona: 'Z1', nps: 0.85, taxaResposta: 0.1, npsAnual: 0.95, elegivelPremio: true },
    ];
    const sorted = sortNpsRanking(items);
    // Com Math.round, ambos devem ter o mesmo NPS Mês (8500), então desempata por NPS Anual
    expect(sorted[0].lojaNome).toBe('Loja B');
    expect(sorted[1].lojaNome).toBe('Loja A');
  });

  it('cenário completo com múltiplas lojas elegíveis e inelegíveis', () => {
    const items: NpsRankingItem[] = [
      { lojaId: 1, lojaNome: 'Barcelos', zona: 'MINHO', nps: 1.0, taxaResposta: 0.08, npsAnual: 0.926, elegivelPremio: true },
      { lojaId: 2, lojaNome: 'Viana do Castelo', zona: 'MINHO', nps: 1.0, taxaResposta: 0.09, npsAnual: 1.0, elegivelPremio: true },
      { lojaId: 3, lojaNome: 'Famalicão', zona: 'MINHO', nps: 0.892, taxaResposta: 0.227, npsAnual: 0.841, elegivelPremio: true },
      { lojaId: 4, lojaNome: 'Braga sm', zona: 'MINHO', nps: 0.0, taxaResposta: 0.0, npsAnual: 0.5, elegivelPremio: false },
      { lojaId: 5, lojaNome: 'Guimarães', zona: 'MINHO', nps: 0.75, taxaResposta: 0.05, npsAnual: 0.8, elegivelPremio: false },
    ];
    const sorted = sortNpsRanking(items);
    // Elegíveis primeiro: Viana (NPS 100%, Anual 100%) > Barcelos (NPS 100%, Anual 92.6%) > Famalicão (NPS 89.2%)
    expect(sorted[0].lojaNome).toBe('Viana do Castelo');
    expect(sorted[1].lojaNome).toBe('Barcelos');
    expect(sorted[2].lojaNome).toBe('Famalicão');
    // Inelegíveis: Guimarães (NPS 75%) > Braga sm (NPS 0%)
    expect(sorted[3].lojaNome).toBe('Guimarães');
    expect(sorted[4].lojaNome).toBe('Braga sm');
  });
});
