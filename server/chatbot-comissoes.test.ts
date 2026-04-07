import { describe, it, expect } from 'vitest';

/**
 * Testes para verificar que o chatbot tem os dados necessários para calcular comissões.
 * Testa a lógica de formatação de dados que é usada no chatbotService.ts
 */

describe('Chatbot - Formatação de dados para cálculo de comissões', () => {
  // Simular a lógica de formatação dos resultados pessoais do gestor
  function formatarResultadosPessoais(resultadosMensais: any[]): string {
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const resultadosPorPeriodo: Record<string, any[]> = {};
    resultadosMensais.forEach(r => {
      const chave = `${r.mes}-${r.ano}`;
      if (!resultadosPorPeriodo[chave]) resultadosPorPeriodo[chave] = [];
      resultadosPorPeriodo[chave].push(r);
    });
    
    const periodosOrdenados = Object.keys(resultadosPorPeriodo).sort((a, b) => {
      const [mesA, anoA] = a.split('-').map(Number);
      const [mesB, anoB] = b.split('-').map(Number);
      if (anoB !== anoA) return anoB - anoA;
      return mesB - mesA;
    });
    
    let texto = `📊 PERFORMANCE DAS MINHAS LOJAS (${periodosOrdenados.length} meses disponíveis, dados para cálculo de comissões):\n\n`;
    
    periodosOrdenados.forEach(periodo => {
      const [mes, ano] = periodo.split('-').map(Number);
      const resultados = resultadosPorPeriodo[periodo];
      const mesNome = mesesNomes[mes - 1];
      
      texto += `=== ${mesNome} ${ano} ===\n`;
      resultados.forEach(r => {
        const numColab = r.numColaboradores || 0;
        const totalServ = r.totalServicos || 0;
        const servPorColab = numColab > 0 ? (totalServ / numColab).toFixed(1) : 'N/A';
        const cumpreFTE = numColab > 0 && (totalServ / numColab) >= 35;
        const taxaRep = r.taxaReparacao != null
          ? (typeof r.taxaReparacao === 'number' ? r.taxaReparacao * 100 : parseFloat(r.taxaReparacao) * 100).toFixed(1) + '%'
          : 'N/A';
        texto += `- ${r.lojaNome}: ${totalServ} serviços, ${numColab} colaboradores, serv/colab: ${servPorColab} (FTE: ${cumpreFTE ? '✅ Cumpre ≥35' : '❌ NÃO cumpre <35'}), taxa reparação: ${taxaRep}, reparações: ${r.qtdReparacoes || 0}\n`;
      });
      texto += '\n';
    });
    
    return texto;
  }

  it('deve incluir numColaboradores e FTE na formatação dos resultados', () => {
    const resultados = [
      { mes: 1, ano: 2026, lojaNome: 'Braga - minho center', totalServicos: 86, numColaboradores: 3, taxaReparacao: '0.3019', qtdReparacoes: 16, lojaId: 1 },
      { mes: 2, ano: 2026, lojaNome: 'Braga - minho center', totalServicos: 85, numColaboradores: 3, taxaReparacao: '0.3400', qtdReparacoes: 17, lojaId: 1 },
      { mes: 3, ano: 2026, lojaNome: 'Braga - minho center', totalServicos: 123, numColaboradores: 1, taxaReparacao: '0.3293', qtdReparacoes: 27, lojaId: 1 },
    ];

    const texto = formatarResultadosPessoais(resultados);
    
    // Deve conter numColaboradores
    expect(texto).toContain('3 colaboradores');
    expect(texto).toContain('1 colaboradores');
    
    // Deve conter serv/colab calculado correctamente
    expect(texto).toContain('serv/colab: 28.7'); // 86/3 = 28.67
    expect(texto).toContain('serv/colab: 28.3'); // 85/3 = 28.33
    expect(texto).toContain('serv/colab: 123.0'); // 123/1 = 123
    
    // Deve indicar FTE correctamente
    expect(texto).toContain('❌ NÃO cumpre <35'); // Jan e Fev (28.7 e 28.3 < 35)
    expect(texto).toContain('✅ Cumpre ≥35'); // Mar (123 >= 35)
  });

  it('deve mostrar todos os meses disponíveis (não apenas o último)', () => {
    const resultados = [
      { mes: 1, ano: 2026, lojaNome: 'Loja A', totalServicos: 50, numColaboradores: 1, taxaReparacao: '0.30', qtdReparacoes: 10, lojaId: 1 },
      { mes: 2, ano: 2026, lojaNome: 'Loja A', totalServicos: 60, numColaboradores: 1, taxaReparacao: '0.35', qtdReparacoes: 12, lojaId: 1 },
      { mes: 3, ano: 2026, lojaNome: 'Loja A', totalServicos: 70, numColaboradores: 1, taxaReparacao: '0.40', qtdReparacoes: 15, lojaId: 1 },
    ];

    const texto = formatarResultadosPessoais(resultados);
    
    // Deve conter os 3 meses
    expect(texto).toContain('Janeiro 2026');
    expect(texto).toContain('Fevereiro 2026');
    expect(texto).toContain('Março 2026');
    expect(texto).toContain('3 meses disponíveis');
  });

  it('deve calcular FTE correctamente para diferentes cenários', () => {
    // Cenário: loja com 2 colaboradores e 82 serviços = 41 serv/colab (cumpre FTE)
    const resultados = [
      { mes: 1, ano: 2026, lojaNome: 'Loja B', totalServicos: 82, numColaboradores: 2, taxaReparacao: '0.30', qtdReparacoes: 10, lojaId: 2 },
    ];

    const texto = formatarResultadosPessoais(resultados);
    
    expect(texto).toContain('serv/colab: 41.0');
    expect(texto).toContain('✅ Cumpre ≥35');
  });

  it('deve tratar numColaboradores 0 como N/A', () => {
    const resultados = [
      { mes: 4, ano: 2026, lojaNome: 'Loja C', totalServicos: 7, numColaboradores: 0, taxaReparacao: '0.00', qtdReparacoes: 0, lojaId: 3 },
    ];

    const texto = formatarResultadosPessoais(resultados);
    
    expect(texto).toContain('0 colaboradores');
    expect(texto).toContain('serv/colab: N/A');
    expect(texto).toContain('❌ NÃO cumpre <35');
  });

  // Simular formatação de vendas complementares pessoais
  function formatarVendasPessoais(vendas: any[]): string {
    const mesesVC = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const vendasPorPeriodo: Record<string, any[]> = {};
    vendas.forEach(v => {
      const chave = `${v.mes}-${v.ano}`;
      if (!vendasPorPeriodo[chave]) vendasPorPeriodo[chave] = [];
      vendasPorPeriodo[chave].push(v);
    });
    
    let texto = `💰 VENDAS COMPLEMENTARES DAS MINHAS LOJAS:\n\n`;
    Object.entries(vendasPorPeriodo).forEach(([periodo, vendas]) => {
      const [mes, ano] = periodo.split('-').map(Number);
      texto += `=== ${mesesVC[mes - 1]} ${ano} ===\n`;
      vendas.forEach(v => {
        const escovasVendas = v.escovasVendas ? parseFloat(v.escovasVendas).toFixed(2) : '0.00';
        const peliculaVendas = v.peliculaVendas ? parseFloat(v.peliculaVendas).toFixed(2) : '0.00';
        texto += `- ${v.lojaNome}: Escovas: €${escovasVendas} (comissão 10%: €${(parseFloat(escovasVendas) * 0.10).toFixed(2)}) | Películas: €${peliculaVendas} (comissão 2.5%: €${(parseFloat(peliculaVendas) * 0.025).toFixed(2)})\n`;
      });
    });
    
    return texto;
  }

  it('deve incluir comissões pré-calculadas nas vendas complementares', () => {
    const vendas = [
      { mes: 1, ano: 2026, lojaNome: 'Braga - minho center', escovasVendas: '454.07', peliculaVendas: '0.00', lojaId: 1 },
    ];

    const texto = formatarVendasPessoais(vendas);
    
    // Deve conter valor de escovas
    expect(texto).toContain('€454.07');
    // Deve conter comissão 10% pré-calculada
    expect(texto).toContain('comissão 10%: €45.41'); // 454.07 * 0.10 = 45.407
    // Deve conter películas
    expect(texto).toContain('€0.00');
  });

  it('deve ordenar períodos do mais recente para o mais antigo', () => {
    const resultados = [
      { mes: 1, ano: 2026, lojaNome: 'Loja A', totalServicos: 50, numColaboradores: 1, taxaReparacao: '0.30', qtdReparacoes: 10, lojaId: 1 },
      { mes: 3, ano: 2026, lojaNome: 'Loja A', totalServicos: 70, numColaboradores: 1, taxaReparacao: '0.40', qtdReparacoes: 15, lojaId: 1 },
      { mes: 2, ano: 2026, lojaNome: 'Loja A', totalServicos: 60, numColaboradores: 1, taxaReparacao: '0.35', qtdReparacoes: 12, lojaId: 1 },
    ];

    const texto = formatarResultadosPessoais(resultados);
    
    // Março deve aparecer antes de Fevereiro, que deve aparecer antes de Janeiro
    const posMarco = texto.indexOf('Março 2026');
    const posFev = texto.indexOf('Fevereiro 2026');
    const posJan = texto.indexOf('Janeiro 2026');
    
    expect(posMarco).toBeLessThan(posFev);
    expect(posFev).toBeLessThan(posJan);
  });
});
