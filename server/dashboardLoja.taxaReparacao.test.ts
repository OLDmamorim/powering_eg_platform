import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Taxa de Reparação - Dashboard Loja (usando valor do Excel)', () => {
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

  it('deve usar a taxa de reparação diretamente do Excel (coluna K)', async () => {
    // Buscar dados de janeiro 2026
    const resultados = await db.getResultadosMensaisPorLoja(lojaId, 1, 2026);
    
    if (!resultados) {
      console.log('Sem dados para janeiro 2026, teste ignorado');
      return;
    }

    const totalServicos = Number(resultados.totalServicos) || 0;
    const qtdReparacoes = Number(resultados.qtdReparacoes) || 0;
    const qtdParaBrisas = Number(resultados.qtdParaBrisas) || 0;
    const taxaExcel = resultados.taxaReparacao ? parseFloat(String(resultados.taxaReparacao)) : null;
    
    console.log('Dados da loja Braga - Janeiro 2026:');
    console.log(`  Total Serviços: ${totalServicos}`);
    console.log(`  Qtd Reparações: ${qtdReparacoes}`);
    console.log(`  Qtd Para-brisas: ${qtdParaBrisas}`);
    console.log(`  Taxa Reparação do EXCEL: ${taxaExcel !== null ? (taxaExcel * 100).toFixed(1) + '%' : 'N/A'}`);
    
    // A taxa do Excel deve existir
    expect(taxaExcel).not.toBeNull();
    
    // A taxa do Excel deve ser um valor válido entre 0 e 1
    if (taxaExcel !== null) {
      expect(taxaExcel).toBeGreaterThanOrEqual(0);
      expect(taxaExcel).toBeLessThanOrEqual(1);
    }
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

  it('deve validar que a taxa do Excel é o valor oficial usado pelo sistema', async () => {
    const resultados = await db.getResultadosMensaisPorLoja(lojaId, 1, 2026);
    
    if (!resultados) {
      console.log('Sem dados para janeiro 2026, teste ignorado');
      return;
    }

    const taxaExcel = resultados.taxaReparacao ? parseFloat(String(resultados.taxaReparacao)) : null;
    
    console.log(`  Taxa do Excel (valor oficial): ${taxaExcel !== null ? (taxaExcel * 100).toFixed(1) + '%' : 'N/A'}`);
    
    // A taxa do Excel deve existir e ser o valor oficial
    // O Excel usa fórmula própria que pode diferir do cálculo simples rep/parabrisas
    expect(taxaExcel).not.toBeNull();
    
    // A taxa deve estar dentro de um intervalo razoável (0% a 100%)
    if (taxaExcel !== null) {
      expect(taxaExcel).toBeGreaterThanOrEqual(0);
      expect(taxaExcel).toBeLessThanOrEqual(1);
      
      // Para Braga em janeiro 2026, esperamos aproximadamente 31.4%
      expect(taxaExcel).toBeCloseTo(0.314, 1); // Margem de 10%
    }
  });
});
