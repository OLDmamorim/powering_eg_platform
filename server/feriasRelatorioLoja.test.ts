import { describe, it, expect, vi } from 'vitest';

// Mock the LLM module before importing the service
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: '## 📋 Resumo da Loja\nTeste de recomendações IA para a loja.'
      }
    }]
  })
}));

import { gerarRelatorioLoja } from './feriasRelatorioLojaService';

describe('feriasRelatorioLojaService', () => {
  const mockColaboradores = [
    {
      nome: 'João Silva',
      loja: 'FAMALICÃO',
      gestor: 'Marco Amorim',
      dias: {
        '1-5': 'approved', '1-6': 'approved', '1-7': 'approved',
        '6-10': 'approved', '6-11': 'approved', '6-12': 'approved',
        '6-13': 'approved', '6-14': 'approved', '6-15': 'approved',
        '6-16': 'approved', '6-17': 'approved', '6-18': 'approved',
        '6-19': 'approved', '6-20': 'approved', '6-21': 'approved',
        '7-1': 'approved', '7-2': 'approved',
        '10-1': 'approved', '10-2': 'approved', '10-3': 'approved',
        '10-4': 'approved', '10-5': 'approved',
      },
      totalAprovados: 22,
      totalNaoAprovados: 0,
      totalFeriados: 10,
      totalFaltas: 0,
    },
    {
      nome: 'Maria Santos',
      loja: 'FAMALICÃO',
      gestor: 'Marco Amorim',
      dias: {
        '7-1': 'approved', '7-2': 'approved', '7-3': 'approved',
        '7-4': 'approved', '7-5': 'approved', '7-6': 'approved',
        '7-7': 'approved', '7-8': 'approved', '7-9': 'approved',
        '7-10': 'approved', '7-11': 'approved', '7-12': 'approved',
        '8-1': 'approved', '8-2': 'approved', '8-3': 'approved',
        '8-4': 'approved', '8-5': 'approved',
        '12-22': 'approved', '12-23': 'approved',
        '12-24': 'approved', '12-29': 'approved', '12-30': 'approved',
      },
      totalAprovados: 22,
      totalNaoAprovados: 0,
      totalFeriados: 10,
      totalFaltas: 0,
    },
    {
      nome: 'Pedro Costa',
      loja: 'FAMALICÃO',
      gestor: 'Marco Amorim',
      dias: {},
      totalAprovados: 0,
      totalNaoAprovados: 0,
      totalFeriados: 0,
      totalFaltas: 0,
    },
    {
      nome: 'Ana Ferreira',
      loja: 'BRAGA CENTRO',
      gestor: 'Marco Amorim',
      dias: {
        '1-10': 'approved', '1-11': 'approved',
        '6-1': 'approved', '6-2': 'approved',
      },
      totalAprovados: 4,
      totalNaoAprovados: 0,
      totalFeriados: 5,
      totalFaltas: 0,
    },
  ];

  it('deve gerar relatório apenas para a loja seleccionada', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    expect(result.loja).toBe('FAMALICÃO');
    expect(result.totalColaboradores).toBe(3);
    // Não deve incluir Ana Ferreira (BRAGA CENTRO)
    expect(result.analiseColaboradores.map(c => c.nome)).not.toContain('Ana Ferreira');
  });

  it('deve identificar colaborador sem férias marcadas', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    const pedro = result.analiseColaboradores.find(c => c.nome === 'Pedro Costa');
    expect(pedro).toBeDefined();
    expect(pedro!.statusGeral).toBe('red');
    expect(pedro!.problemas.some(p => p.includes('SEM FÉRIAS MARCADAS'))).toBe(true);
  });

  it('deve identificar excesso em Jun-Set (>10 dias)', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    const joao = result.analiseColaboradores.find(c => c.nome === 'João Silva');
    expect(joao).toBeDefined();
    // João tem 13 dias em Jun-Set (meses 6 e 7)
    expect(joao!.junSet).toBeGreaterThan(10);
    expect(joao!.problemas.some(p => p.includes('Jun-Set'))).toBe(true);
    expect(joao!.corJunSet).not.toBe('green');
  });

  it('deve identificar falta de dias em Jan-Mai (<5)', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    const joao = result.analiseColaboradores.find(c => c.nome === 'João Silva');
    expect(joao).toBeDefined();
    // João tem apenas 3 dias em Jan-Mai
    expect(joao!.janMai).toBeLessThan(5);
    expect(joao!.problemas.some(p => p.includes('Jan-Mai'))).toBe(true);
  });

  it('deve identificar excesso em Dezembro', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    const maria = result.analiseColaboradores.find(c => c.nome === 'Maria Santos');
    expect(maria).toBeDefined();
    // Maria tem 5 dias em Dezembro
    expect(maria!.dez).toBeGreaterThan(3);
    expect(maria!.problemas.some(p => p.includes('Dezembro'))).toBe(true);
  });

  it('deve detectar sobreposições na mesma loja', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    // João e Maria ambos têm dias aprovados em 7-1 e 7-2
    expect(result.sobreposicoes.length).toBeGreaterThan(0);
    const sobreposicao = result.sobreposicoes.find(s => 
      s.colaboradores.includes('João Silva') && s.colaboradores.includes('Maria Santos')
    );
    expect(sobreposicao).toBeDefined();
  });

  it('deve calcular resumo correctamente', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    expect(result.resumo.totalDiasAprovados).toBe(44); // 22 + 22 + 0
    expect(result.resumo.semFeriasMarcadas).toBe(1); // Pedro
    expect(result.resumo.conformes + result.resumo.comAvisos + result.resumo.criticos).toBe(3);
  });

  it('deve gerar recomendações IA', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    expect(result.recomendacoesIA).toBeTruthy();
    expect(typeof result.recomendacoesIA).toBe('string');
    expect(result.recomendacoesIA.length).toBeGreaterThan(0);
  });

  it('deve lançar erro para loja inexistente', async () => {
    await expect(
      gerarRelatorioLoja(mockColaboradores, 'LOJA_INEXISTENTE', 2026)
    ).rejects.toThrow('Nenhum colaborador encontrado para a loja LOJA_INEXISTENTE');
  });

  it('deve identificar Maria com falta de dias em Jan-Mai e excesso em Jun-Set', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    const maria = result.analiseColaboradores.find(c => c.nome === 'Maria Santos');
    expect(maria).toBeDefined();
    // Maria tem 0 dias em Jan-Mai
    expect(maria!.janMai).toBe(0);
    expect(maria!.corJanMai).toBe('red');
    // Maria tem 17 dias em Jun-Set (12 em Jul + 5 em Ago)
    expect(maria!.junSet).toBeGreaterThan(10);
    expect(maria!.corJunSet).not.toBe('green');
  });
});
