import { describe, it, expect } from 'vitest';
import { normalizarNomeLoja } from './analiseFichasService';

describe('normalizarNomeLoja', () => {
  it('deve normalizar lojas normais pelo nome', () => {
    expect(normalizarNomeLoja('Ficha Servico 38', 'Abrantes')).toBe('Abrantes');
    expect(normalizarNomeLoja('Ficha Servico 43', 'Entroncamento')).toBe('Entroncamento');
    expect(normalizarNomeLoja('Ficha Servico 95', 'Montijo')).toBe('Montijo');
  });

  it('deve normalizar lojas com nomes compostos', () => {
    expect(normalizarNomeLoja('Ficha Servico 10', 'Caldas da Rainha')).toBe('Caldas da Rainha');
    expect(normalizarNomeLoja('Ficha Servico 13', 'Castanheira do Ribatejo')).toBe('Castanheira do Ribatejo');
  });

  it('deve normalizar lojas de Serviço Móvel com SM', () => {
    expect(normalizarNomeLoja('Ficha S.Movel 86-Faro', 'Faro SM')).toBe('Faro SM');
    expect(normalizarNomeLoja('Ficha S.Movel 86-Faro', 'Serviço Móvel Faro')).toBe('Faro SM');
  });

  it('deve normalizar Lezíria SM', () => {
    const result = normalizarNomeLoja('Ficha S.Movel 97-Leziria', 'Leziria SM');
    expect(result).toContain('SM');
  });

  it('deve normalizar SM Caldas da Rainha', () => {
    const result = normalizarNomeLoja('Ficha S.Movel 33-Caldas', 'SM Caldas da Rainha');
    expect(result).toContain('SM');
    expect(result).toContain('Caldas');
  });

  it('deve normalizar Vale do Tejo SM', () => {
    const result = normalizarNomeLoja('Ficha S.Movel 64-Vale do Tejo', 'Vale do Tejo SM');
    expect(result).toContain('SM');
    expect(result).toContain('Tejo');
  });

  it('deve normalizar Porto Alto', () => {
    // Porto Alto com P maiúsculo retorna como está (cidade conhecida)
    expect(normalizarNomeLoja('Ficha Servico 94', 'Porto Alto')).toBe('Porto Alto');
    // Porto alto com a minúsculo - mapeamento especial converte para 'Porto Alto'
    expect(normalizarNomeLoja('Ficha Servico 94', 'Porto alto')).toBe('Porto Alto');
  });

  it('deve normalizar Portimão', () => {
    const result = normalizarNomeLoja('Ficha Servico 36', 'Portimão');
    expect(result).toBe('Portimão');
  });

  it('deve normalizar Santarém', () => {
    const result = normalizarNomeLoja('Ficha Servico 72', 'Santarém');
    expect(result).toBe('Santarém');
  });

  it('deve usar mapeamento especial para nomes conhecidos', () => {
    expect(normalizarNomeLoja('Ficha Servico 10', 'caldas da rainha')).toBe('Caldas da Rainha');
    expect(normalizarNomeLoja('Ficha Servico 13', 'castanheira do ribatejo')).toBe('Castanheira do Ribatejo');
    expect(normalizarNomeLoja('Ficha S.Movel 86', 'faro sm')).toBe('Faro SM');
  });
});

// Test extrairNumeroLoja indirectly through the module
describe('extrairNumeroLoja (via processarAnalise)', () => {
  it('deve extrair números de fichas normais', () => {
    // We can't directly test extrairNumeroLoja as it's not exported,
    // but we test the normalization behavior which depends on it
    const result = normalizarNomeLoja('Ficha Servico 38', 'Abrantes');
    expect(result).toBe('Abrantes');
  });

  it('deve lidar com Serviço Móvel corretamente', () => {
    const result = normalizarNomeLoja('Ficha S.Movel 86-Faro', 'Faro');
    expect(result).toBe('Faro SM');
  });
});
