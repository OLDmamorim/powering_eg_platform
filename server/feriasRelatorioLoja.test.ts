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

describe('feriasRelatorioLojaService — Dias Pedidos e % por Período', () => {
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
    expect(result.analiseColaboradores.map(c => c.nome)).not.toContain('Ana Ferreira');
  });

  it('deve usar totalPedidos (approved + not_approved) como base de análise', async () => {
    // Criar colaborador com dias not_approved que DEVEM ser contados
    const colabMisto = [{
      nome: 'MISTO',
      loja: 'TESTE',
      gestor: 'Marco',
      dias: {
        '2-1': 'approved', '2-2': 'approved', '2-3': 'approved', '2-4': 'approved', '2-5': 'approved',
        '7-1': 'not_approved', '7-2': 'not_approved', '7-3': 'not_approved', '7-4': 'not_approved', '7-5': 'not_approved',
        '7-6': 'not_approved', '7-7': 'not_approved', '7-8': 'not_approved', '7-9': 'not_approved', '7-10': 'not_approved',
        '10-1': 'approved', '10-2': 'approved', '10-3': 'approved', '10-4': 'approved', '10-5': 'approved',
        '12-1': 'approved', '12-2': 'approved',
      },
      totalAprovados: 12, totalNaoAprovados: 10, totalFeriados: 0, totalFaltas: 0,
    }];

    const result = await gerarRelatorioLoja(colabMisto, 'TESTE', 2026);
    const analise = result.analiseColaboradores[0];
    
    // Total = 5 + 10 + 5 + 2 = 22 (inclui not_approved!)
    expect(analise.totalPedidos).toBe(22);
    expect(analise.diasP1).toBe(5);
    expect(analise.diasP2).toBe(10);
    expect(analise.diasP3).toBe(5);
    expect(analise.diasP4).toBe(2);
  });

  it('deve calcular % por período correctamente', async () => {
    const colabSimples = [{
      nome: 'PCT',
      loja: 'TESTE2',
      gestor: 'Marco',
      dias: {
        '2-1': 'approved', '2-2': 'approved', '2-3': 'approved', '2-4': 'approved', '2-5': 'approved',
        '7-1': 'approved', '7-2': 'approved', '7-3': 'approved', '7-4': 'approved', '7-5': 'approved',
        '7-6': 'approved', '7-7': 'approved', '7-8': 'approved', '7-9': 'approved', '7-10': 'approved',
        '10-1': 'approved', '10-2': 'approved', '10-3': 'approved', '10-4': 'approved', '10-5': 'approved',
        '12-1': 'approved', '12-2': 'approved',
      },
      totalAprovados: 22, totalNaoAprovados: 0, totalFeriados: 0, totalFaltas: 0,
    }];

    const result = await gerarRelatorioLoja(colabSimples, 'TESTE2', 2026);
    const a = result.analiseColaboradores[0];
    
    expect(a.pctP1).toBe(23);  // 5/22 ≈ 23%
    expect(a.pctP2).toBe(45);  // 10/22 ≈ 45%
    expect(a.pctP3).toBe(23);  // 5/22 ≈ 23%
    expect(a.pctP4).toBe(9);   // 2/22 ≈ 9%
    expect(a.gravidade).toBe('conforme');
    expect(a.corP1).toBe('green');
    expect(a.corP2).toBe('green');
  });

  it('deve detectar excesso no 2.º período (>10 dias) e marcar vermelho', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    // João tem 14 dias em Jun-Set (12 em Jun + 2 em Jul)
    const joao = result.analiseColaboradores.find(c => c.nome === 'João Silva');
    expect(joao).toBeDefined();
    expect(joao!.diasP2).toBeGreaterThan(10);
    expect(joao!.corP2).toBe('red');
    expect(joao!.problemas.some(p => p.includes('EXCEDE'))).toBe(true);
    
    // Maria tem 17 dias em Jun-Set
    const maria = result.analiseColaboradores.find(c => c.nome === 'Maria Santos');
    expect(maria).toBeDefined();
    expect(maria!.diasP2).toBeGreaterThan(10);
    expect(maria!.corP2).toBe('red');
  });

  it('deve detectar déficit no 1.º período (<5 dias)', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    // João tem apenas 3 dias em Jan-Mai
    const joao = result.analiseColaboradores.find(c => c.nome === 'João Silva');
    expect(joao).toBeDefined();
    expect(joao!.diasP1).toBeLessThan(5);
    expect(joao!.corP1).not.toBe('green');
    expect(joao!.problemas.some(p => p.includes('1.º período'))).toBe(true);
    
    // Maria tem 0 dias em Jan-Mai
    const maria = result.analiseColaboradores.find(c => c.nome === 'Maria Santos');
    expect(maria).toBeDefined();
    expect(maria!.diasP1).toBe(0);
    expect(maria!.corP1).toBe('red');
  });

  it('deve identificar colaborador sem férias pedidas como crítico', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    const pedro = result.analiseColaboradores.find(c => c.nome === 'Pedro Costa');
    expect(pedro).toBeDefined();
    expect(pedro!.totalPedidos).toBe(0);
    expect(pedro!.gravidade).toBe('critico');
    expect(pedro!.problemas.some(p => p.includes('SEM FÉRIAS'))).toBe(true);
  });

  it('deve detectar excesso em Dezembro (>5 dias)', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    const maria = result.analiseColaboradores.find(c => c.nome === 'Maria Santos');
    expect(maria).toBeDefined();
    expect(maria!.diasP4).toBe(5);
    // 5 dias em Dez → yellow (>3 mas ≤5)
    expect(maria!.corP4).toBe('yellow');
  });

  it('deve detectar sobreposições entre colegas (approved + not_approved)', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    // João e Maria ambos têm dias em 7-1 e 7-2
    expect(result.sobreposicoes.length).toBeGreaterThan(0);
    const sobreposicao = result.sobreposicoes.find(s => 
      s.colaboradores.includes('João Silva') && s.colaboradores.includes('Maria Santos')
    );
    expect(sobreposicao).toBeDefined();
    expect(result.resumo.totalSobreposicoes).toBeGreaterThan(0);
  });

  it('deve calcular resumo com novos campos (comExcessoP2, comDeficitP1)', async () => {
    const result = await gerarRelatorioLoja(mockColaboradores, 'FAMALICÃO', 2026);
    
    expect(result.resumo.semFeriasPedidas).toBe(1); // Pedro
    expect(result.resumo.comExcessoP2).toBeGreaterThanOrEqual(1); // João e/ou Maria
    expect(result.resumo.comDeficitP1).toBeGreaterThanOrEqual(1); // João e Maria
    expect(result.resumo.conformes + result.resumo.comAvisos + result.resumo.criticos).toBe(3);
    expect(result.resumo.totalDiasPedidos).toBe(44); // 22 + 22 + 0
    expect(result.resumo.mediaDiasPedidos).toBeCloseTo(14.7, 0);
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

  it('deve ignorar dias com status diferente de approved/not_approved', async () => {
    const colabComFeriados = [{
      nome: 'COM FERIADOS',
      loja: 'VIANA',
      gestor: 'Marco',
      dias: {
        '2-1': 'approved', '2-2': 'approved', '2-3': 'approved', '2-4': 'approved', '2-5': 'approved',
        '3-1': 'holiday', '5-1': 'holiday', // NÃO devem contar
        '7-1': 'not_approved', '7-2': 'not_approved', '7-3': 'not_approved',
        '7-4': 'not_approved', '7-5': 'not_approved', '7-6': 'not_approved',
        '7-7': 'not_approved', '7-8': 'not_approved', '7-9': 'not_approved', '7-10': 'not_approved',
        '9-15': 'absence', // NÃO deve contar
        '10-1': 'approved', '10-2': 'approved', '10-3': 'approved', '10-4': 'approved', '10-5': 'approved',
        '12-1': 'approved', '12-2': 'approved',
      },
      totalAprovados: 12, totalNaoAprovados: 10, totalFeriados: 2, totalFaltas: 1,
    }];

    const result = await gerarRelatorioLoja(colabComFeriados, 'VIANA', 2026);
    const a = result.analiseColaboradores[0];
    
    // Apenas approved + not_approved = 22
    expect(a.totalPedidos).toBe(22);
    expect(a.diasP1).toBe(5);
    expect(a.diasP2).toBe(10);
    expect(a.diasP3).toBe(5);
    expect(a.diasP4).toBe(2);
  });
});
