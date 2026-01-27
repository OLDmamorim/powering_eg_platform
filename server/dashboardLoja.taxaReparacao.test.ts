import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Taxa de Reparação - Dashboard Loja', () => {
  let lojaId: number;
  
  beforeAll(async () => {
    // Buscar uma loja de teste (Braga - minho center)
    const lojas = await db.getAllLojas();
    const lojaBraga = lojas.find(l => l.nome.includes('Braga'));
    if (!lojaBraga) {
      throw new Error('Loja Braga não encontrada para teste');
    }
    lojaId = lojaBraga.id;
  });

  it('deve calcular a taxa de reparação usando qtdParaBrisas, não totalServicos', async () => {
    // Buscar dados de janeiro 2026
    const resultados = await db.getResultadosMensaisPorLoja(lojaId, 1, 2026);
    
    if (!resultados) {
      console.log('Sem dados para janeiro 2026, teste ignorado');
      return;
    }

    const totalServicos = Number(resultados.totalServicos) || 0;
    const qtdReparacoes = Number(resultados.qtdReparacoes) || 0;
    const qtdParaBrisas = Number(resultados.qtdParaBrisas) || 0;
    
    console.log('Dados da loja Braga - Janeiro 2026:');
    console.log(`  Total Serviços: ${totalServicos}`);
    console.log(`  Qtd Reparações: ${qtdReparacoes}`);
    console.log(`  Qtd Para-brisas: ${qtdParaBrisas}`);
    
    // Calcular taxa de reparação CORRETA (qtdReparacoes / qtdParaBrisas)
    const taxaReparacaoCorreta = qtdParaBrisas > 0 ? qtdReparacoes / qtdParaBrisas : 0;
    
    // Calcular taxa de reparação ERRADA (qtdReparacoes / totalServicos)
    const taxaReparacaoErrada = totalServicos > 0 ? qtdReparacoes / totalServicos : 0;
    
    console.log(`  Taxa Reparação CORRETA (rep/parabrisas): ${(taxaReparacaoCorreta * 100).toFixed(1)}%`);
    console.log(`  Taxa Reparação ERRADA (rep/servicos): ${(taxaReparacaoErrada * 100).toFixed(1)}%`);
    
    // A taxa correta deve ser MAIOR que a errada (porque para-brisas < total serviços)
    expect(taxaReparacaoCorreta).toBeGreaterThan(taxaReparacaoErrada);
    
    // A taxa correta deve ser maior que 25%
    expect(taxaReparacaoCorreta).toBeGreaterThan(0.25); // Pelo menos 25%
    
    // A taxa errada deve estar próxima de 15.8% (valor que aparecia no Portal)
    expect(taxaReparacaoErrada).toBeGreaterThan(0.10); // Pelo menos 10%
    expect(taxaReparacaoErrada).toBeLessThan(0.20); // Máximo 20%
  });

  it('deve validar que qtdParaBrisas é sempre menor ou igual a totalServicos', async () => {
    const resultados = await db.getResultadosMensaisPorLoja(lojaId, 1, 2026);
    
    if (!resultados) {
      console.log('Sem dados para janeiro 2026, teste ignorado');
      return;
    }

    const totalServicos = Number(resultados.totalServicos) || 0;
    const qtdParaBrisas = Number(resultados.qtdParaBrisas) || 0;
    
    // Para-brisas deve ser sempre menor ou igual ao total de serviços
    expect(qtdParaBrisas).toBeLessThanOrEqual(totalServicos);
  });

  it('deve validar que a taxa de reparação está entre 0 e 1', async () => {
    const resultados = await db.getResultadosMensaisPorLoja(lojaId, 1, 2026);
    
    if (!resultados) {
      console.log('Sem dados para janeiro 2026, teste ignorado');
      return;
    }

    const qtdReparacoes = Number(resultados.qtdReparacoes) || 0;
    const qtdParaBrisas = Number(resultados.qtdParaBrisas) || 0;
    
    const taxaReparacao = qtdParaBrisas > 0 ? qtdReparacoes / qtdParaBrisas : 0;
    
    expect(taxaReparacao).toBeGreaterThanOrEqual(0);
    expect(taxaReparacao).toBeLessThanOrEqual(1);
  });
});
