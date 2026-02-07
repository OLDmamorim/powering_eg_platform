import { describe, it, expect } from 'vitest';
import { normalizarNomeLoja, processarFicheiroExcel, analisarFichas } from './analiseFichasService';

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
    expect(normalizarNomeLoja('Ficha Servico 94', 'Porto Alto')).toBe('Porto Alto');
    expect(normalizarNomeLoja('Ficha Servico 94', 'Porto alto')).toBe('Porto Alto');
  });

  it('deve normalizar Portimão', () => {
    expect(normalizarNomeLoja('Ficha Servico 36', 'Portimão')).toBe('Portimão');
  });

  it('deve normalizar Santarém', () => {
    expect(normalizarNomeLoja('Ficha Servico 72', 'Santarém')).toBe('Santarém');
  });

  it('deve usar mapeamento especial para nomes conhecidos', () => {
    expect(normalizarNomeLoja('Ficha Servico 10', 'caldas da rainha')).toBe('Caldas da Rainha');
    expect(normalizarNomeLoja('Ficha Servico 13', 'castanheira do ribatejo')).toBe('Castanheira do Ribatejo');
    expect(normalizarNomeLoja('Ficha S.Movel 86', 'faro sm')).toBe('Faro SM');
  });

  // NOVO: Teste para o caso Guimarães #7 vs Leiria SM #7
  it('deve diferenciar Guimarães (FS normal) de Leiria SM (Serviço Móvel) mesmo com mesmo número', () => {
    // "Ficha Servico 7" + "Guimarães" → Guimarães (FS normal)
    expect(normalizarNomeLoja('Ficha Servico 7', 'Guimarães')).toBe('Guimarães');
    
    // "Ficha S.Movel 7-Leiria" + "Serviço Móvel Leiria" → Leiria SM (Serviço Móvel)
    expect(normalizarNomeLoja('Ficha S.Movel 7-Leiria', 'Serviço Móvel Leiria')).toBe('Leiria SM');
    
    // São nomes diferentes, logo serão agrupados separadamente
    const nomeGuimaraes = normalizarNomeLoja('Ficha Servico 7', 'Guimarães');
    const nomeLeiria = normalizarNomeLoja('Ficha S.Movel 7-Leiria', 'Serviço Móvel Leiria');
    expect(nomeGuimaraes).not.toBe(nomeLeiria);
  });
});

describe('analisarFichas - isServicoMovel flag', () => {
  it('deve marcar relatórios SM com isServicoMovel=true e FS normais com false', () => {
    // Simular fichas para testar
    const fichaGuimaraes = {
      bostamp: '1', nmdos: 'Ficha Servico 7', loja: 'Guimarães', gestor: 'Fábio',
      coordenador: '', obrano: 1001, matricula: 'AA-00-BB', dataObra: null,
      diasAberto: 10, dataServico: null, diasExecutado: 0, horaInicio: '', horaFim: '',
      status: 'Em Curso', dataNota: null, diasNota: 0, obs: '', email: '',
      segurado: '', marca: '', modelo: '', ref: '', eurocode: '', nrFactura: 0,
      serieFactura: '', nrSinistro: '', armazem: 0, fechado: false, detalheDanos: '',
      contactoSegurado: '', nome: '',
    };
    
    const fichaLeiria = {
      ...fichaGuimaraes,
      bostamp: '2', nmdos: 'Ficha S.Movel 7-Leiria', loja: 'Serviço Móvel Leiria',
      obrano: 1002,
    };
    
    const resultado = analisarFichas([fichaGuimaraes, fichaLeiria], 'test.xlsx');
    
    // Deve ter 2 relatórios (Guimarães e Leiria SM)
    expect(resultado.relatoriosPorLoja.length).toBe(2);
    
    // Encontrar cada relatório
    const relGuimaraes = resultado.relatoriosPorLoja.find(r => r.nomeLoja === 'Guimarães');
    const relLeiria = resultado.relatoriosPorLoja.find(r => r.nomeLoja === 'Leiria SM');
    
    expect(relGuimaraes).toBeDefined();
    expect(relLeiria).toBeDefined();
    
    // Guimarães é FS normal → isServicoMovel=false, numeroLoja=7
    expect(relGuimaraes!.isServicoMovel).toBe(false);
    expect(relGuimaraes!.numeroLoja).toBe(7);
    
    // Leiria SM é Serviço Móvel → isServicoMovel=true, numeroLoja=null (não usar número de SM)
    expect(relLeiria!.isServicoMovel).toBe(true);
    expect(relLeiria!.numeroLoja).toBeNull();
  });
});
