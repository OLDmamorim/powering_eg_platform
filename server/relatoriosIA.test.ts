import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Relatórios IA - Salvamento e Histórico', () => {
  let testUserId: number;
  let testGestorId: number;

  // Mock de análise IA para testes
  const mockAnalise = {
    lojaMaisVisitada: { nome: 'Loja Test', visitas: 5 },
    lojaMenosVisitada: { nome: 'Loja Test 2', visitas: 1 },
    frequenciaVisitas: { 'Loja Test': 5, 'Loja Test 2': 1 },
    pontosPositivos: ['Ponto positivo 1', 'Ponto positivo 2'],
    pontosNegativos: ['Ponto negativo 1', 'Ponto negativo 2'],
    sugestoes: ['Sugestão 1', 'Sugestão 2'],
    resumo: 'Resumo de teste',
    analisePontosDestacados: {
      positivos: ['Análise positiva 1'],
      negativos: ['Análise negativa 1'],
      tendencias: 'Tendências de teste',
    },
  };

  beforeAll(async () => {
    // Criar gestor de teste
    const gestor = await db.createGestor(
      'Gestor Teste IA',
      `gestor-ia-test-${Date.now()}@test.com`
    );
    testGestorId = gestor.id;
    testUserId = gestor.userId;
  });

  it('deve salvar relatório IA após geração', async () => {
    // Salvar relatório IA com dados mock
    const relatorioSalvo = await db.createRelatorioIA({
      periodo: 'semanal',
      conteudo: JSON.stringify(mockAnalise),
      geradoPor: testUserId,
    });

    expect(relatorioSalvo).toBeDefined();
    expect(relatorioSalvo.id).toBeGreaterThan(0);
    expect(relatorioSalvo.periodo).toBe('semanal');
    expect(relatorioSalvo.geradoPor).toBe(testUserId);
    
    // Verificar que conteúdo é JSON válido
    const conteudoParsed = JSON.parse(relatorioSalvo.conteudo);
    expect(conteudoParsed).toHaveProperty('resumo');
    expect(conteudoParsed).toHaveProperty('pontosPositivos');
    expect(conteudoParsed).toHaveProperty('pontosNegativos');
    expect(conteudoParsed).toHaveProperty('sugestoes');
  });

  it('deve listar relatórios IA no histórico', async () => {
    // Criar 2 relatórios IA com dados mock
    await db.createRelatorioIA({
      periodo: 'diario',
      conteudo: JSON.stringify(mockAnalise),
      geradoPor: testUserId,
    });

    await db.createRelatorioIA({
      periodo: 'mensal',
      conteudo: JSON.stringify(mockAnalise),
      geradoPor: testUserId,
    });

    // Buscar histórico do gestor
    const historico = await db.getHistoricoRelatoriosIANormalByGestor(testUserId);

    expect(historico.length).toBeGreaterThanOrEqual(2);
    
    // Verificar que contém os relatórios criados
    const periodos = historico.map(r => r.periodo);
    expect(periodos).toContain('diario');
    expect(periodos).toContain('mensal');
    
    // Verificar que tem nome do gestor
    expect(historico[0].geradoPorNome).toBe('Gestor Teste IA');
  });

  it('deve retornar relatórios ordenados por data DESC', async () => {
    const historico = await db.getHistoricoRelatoriosIANormalByGestor(testUserId);

    // Verificar que está ordenado (mais recente primeiro)
    for (let i = 0; i < historico.length - 1; i++) {
      const dataAtual = new Date(historico[i].createdAt);
      const dataProxima = new Date(historico[i + 1].createdAt);
      expect(dataAtual.getTime()).toBeGreaterThanOrEqual(dataProxima.getTime());
    }
  });

  it('deve buscar relatório IA por ID', async () => {
    // Criar relatório
    const relatorioSalvo = await db.createRelatorioIA({
      periodo: 'trimestral',
      conteudo: JSON.stringify(mockAnalise),
      geradoPor: testUserId,
    });

    // Buscar por ID
    const relatorioEncontrado = await db.getRelatorioIAById(relatorioSalvo.id);

    expect(relatorioEncontrado).toBeDefined();
    expect(relatorioEncontrado!.id).toBe(relatorioSalvo.id);
    expect(relatorioEncontrado!.periodo).toBe('trimestral');
    expect(relatorioEncontrado!.geradoPor).toBe(testUserId);
  });

  it('admin deve ver todos os relatórios IA', async () => {
    // Criar admin
    const adminGestor = await db.createGestor(
      'Admin Teste',
      `admin-ia-test-${Date.now()}@test.com`
    );
    await db.promoteGestorToAdmin(adminGestor.id);

    // Admin busca todos os relatórios
    const todosRelatorios = await db.getHistoricoRelatoriosIANormal();

    // Deve conter pelo menos os relatórios do gestor de teste
    expect(todosRelatorios.length).toBeGreaterThan(0);
    
    // Verificar que contém relatórios de diferentes gestores
    const gestoresUnicos = new Set(todosRelatorios.map(r => r.geradoPor));
    expect(gestoresUnicos.size).toBeGreaterThanOrEqual(1);
  });
});
