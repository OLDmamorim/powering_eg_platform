import { describe, it, expect, vi } from 'vitest';

/**
 * Testes para a funcionalidade de pesquisa de fichas por prefixo de Eurocode
 */

describe('Pesquisa Eurocode por Prefixo', () => {
  // Simular a lógica de filtragem por prefixo (mesma lógica do db.ts)
  const mockFichas = [
    { eurocode: '8345AGSV1C', obrano: 433, matricula: 'AG-44-MS', status: 'Serviço Pronto', nomeLoja: 'Porto SM', lojaId: 180044, analiseId: 840001 },
    { eurocode: '8345AGNGY1B', obrano: 274, matricula: 'BJ-27-JR', status: 'AUTORIZADO', nomeLoja: 'Braga MC', lojaId: 180010, analiseId: 840001 },
    { eurocode: '8537ASGRT', obrano: 100, matricula: 'XX-00-YY', status: 'Consulta / Orçamento', nomeLoja: 'Viseu', lojaId: 180060, analiseId: 840001 },
    { eurocode: '5334AGN', obrano: 374, matricula: '45-10-ZB', status: 'Serviço Pronto', nomeLoja: 'Famalicão', lojaId: 60001, analiseId: 840001 },
    { eurocode: '8345AGACMVZ', obrano: 500, matricula: 'CC-55-DD', status: 'RECUSADO', nomeLoja: 'Leiria SM', lojaId: 180030, analiseId: 840001 },
  ];

  function filtrarPorPrefixo(fichas: typeof mockFichas, prefixo: string) {
    const prefixoNorm = prefixo.toUpperCase().trim();
    if (prefixoNorm.length < 2) return [];
    return fichas.filter(f => f.eurocode.toUpperCase().startsWith(prefixoNorm));
  }

  it('deve retornar fichas que começam com o prefixo "83"', () => {
    const resultado = filtrarPorPrefixo(mockFichas, '83');
    expect(resultado.length).toBe(3); // 8345AGSV1C, 8345AGNGY1B e 8345AGACMVZ
    expect(resultado.every(r => r.eurocode.startsWith('83'))).toBe(true);
  });

  it('deve retornar fichas que começam com "8345"', () => {
    const resultado = filtrarPorPrefixo(mockFichas, '8345');
    expect(resultado.length).toBe(3); // 8345AGSV1C, 8345AGNGY1B, 8345AGACMVZ
    expect(resultado.every(r => r.eurocode.startsWith('8345'))).toBe(true);
  });

  it('deve retornar fichas que começam com "85"', () => {
    const resultado = filtrarPorPrefixo(mockFichas, '85');
    expect(resultado.length).toBe(1); // 8537ASGRT
    expect(resultado[0].eurocode).toBe('8537ASGRT');
  });

  it('deve retornar vazio para prefixo com menos de 2 caracteres', () => {
    const resultado = filtrarPorPrefixo(mockFichas, '8');
    expect(resultado.length).toBe(0);
  });

  it('deve ser case-insensitive', () => {
    const resultado = filtrarPorPrefixo(mockFichas, '8345ag');
    expect(resultado.length).toBe(3);
  });

  it('deve retornar vazio para prefixo sem correspondência', () => {
    const resultado = filtrarPorPrefixo(mockFichas, '9999');
    expect(resultado.length).toBe(0);
  });

  it('deve incluir obrano, matrícula e status nos resultados', () => {
    const resultado = filtrarPorPrefixo(mockFichas, '8345AGSV');
    expect(resultado.length).toBe(1);
    expect(resultado[0]).toMatchObject({
      eurocode: '8345AGSV1C',
      obrano: 433,
      matricula: 'AG-44-MS',
      status: 'Serviço Pronto',
    });
  });

  it('deve filtrar progressivamente à medida que o prefixo cresce', () => {
    const r1 = filtrarPorPrefixo(mockFichas, '83');
    const r2 = filtrarPorPrefixo(mockFichas, '834');
    const r3 = filtrarPorPrefixo(mockFichas, '8345');
    const r4 = filtrarPorPrefixo(mockFichas, '8345AG');
    
    // Cada nível deve ter <= resultados que o anterior
    expect(r1.length).toBeGreaterThanOrEqual(r2.length);
    expect(r2.length).toBeGreaterThanOrEqual(r3.length);
    expect(r3.length).toBeGreaterThanOrEqual(r4.length);
  });

  // Testar filtragem por última análise por loja
  it('deve manter apenas registos da última análise por loja', () => {
    const fichasComDuplicados = [
      { eurocode: '8345AGSV1C', obrano: 433, matricula: 'AG-44-MS', status: 'Serviço Pronto', nomeLoja: 'Porto SM', lojaId: 180044, analiseId: 840001 },
      { eurocode: '8345AGSV1C', obrano: 400, matricula: 'AG-44-MS', status: 'AUTORIZADO', nomeLoja: 'Porto SM', lojaId: 180044, analiseId: 810001 }, // análise antiga
      { eurocode: '8345AGNGY1B', obrano: 274, matricula: 'BJ-27-JR', status: 'AUTORIZADO', nomeLoja: 'Braga MC', lojaId: 180010, analiseId: 840001 },
    ];

    // Simular filtragem por última análise (mesma lógica do db.ts)
    const ultimaAnalisePorLoja = new Map<number, number>();
    for (const row of fichasComDuplicados) {
      const key = row.lojaId;
      if (!ultimaAnalisePorLoja.has(key) || (row.analiseId > (ultimaAnalisePorLoja.get(key) || 0))) {
        ultimaAnalisePorLoja.set(key, row.analiseId);
      }
    }

    const filtrados = fichasComDuplicados.filter(row => row.analiseId === ultimaAnalisePorLoja.get(row.lojaId));
    
    expect(filtrados.length).toBe(2); // Só a análise mais recente de cada loja
    expect(filtrados.find(f => f.lojaId === 180044)?.analiseId).toBe(840001);
    expect(filtrados.find(f => f.lojaId === 180010)?.analiseId).toBe(840001);
  });
});
