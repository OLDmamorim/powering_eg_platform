import { invokeLLM } from "./_core/llm";
import * as db from "./db";

interface RelatorioAnalise {
  lojaId: number;
  lojaNome: string;
  dataVisita: Date;
  tipo: "livre" | "completo";
  conteudo: string;
  pontosPositivosRelatorio?: string;
  pontosNegativosRelatorio?: string;
}

// Interfaces para rankings detalhados
interface RankingLoja {
  posicao: number;
  lojaId: number;
  lojaNome: string;
  zona?: string | null;
  valor: number;
  valorSecundario?: number;
  valorTerciario?: number;
  tendencia?: 'subida' | 'descida' | 'estavel';
}

interface AnaliseZona {
  zona: string;
  totalLojas: number;
  somaServicos: number;
  somaObjetivos: number;
  mediaDesvio: number;
  mediaTaxaReparacao: number;
  lojasAcimaObjetivo: number;
  taxaCumprimento: number;
  melhorLoja: string;
  melhorLojaDesvio: number;
  piorLoja: string;
  piorLojaDesvio: number;
}

interface AnaliseIA {
  lojaMaisVisitada: { nome: string; visitas: number } | null;
  lojaMenosVisitada: { nome: string; visitas: number } | null;
  frequenciaVisitas: { [loja: string]: number };
  pontosPositivos: string[];
  pontosNegativos: string[];
  sugestoes: string[];
  resumo: string;
  analisePontosDestacados: {
    positivos: string[];
    negativos: string[];
    tendencias: string;
  };
  analiseResultados?: {
    resumoPerformance: string;
    lojasDestaque: string[];
    lojasAtencao: string[];
    tendenciasServicos: string;
    recomendacoes: string[];
    analiseQuantitativa?: {
      taxaCumprimentoObjetivo: number;
      desvioMedioRede: number;
      taxaReparacaoMedia: number;
      servicosTotais: number;
      objetivoTotal: number;
      variacao: number;
    };
    rankingDetalhado?: Array<{
      posicao: number;
      loja: string;
      servicos: number;
      objetivo: number;
      desvio: number;
      taxaReparacao: number;
      tendencia: 'subida' | 'descida' | 'estavel';
      variacaoVsAnterior: number;
    }>;
    analiseZonas?: AnaliseZona[];
    alertasPerformance?: string[];
  };
  comparacaoLojas?: {
    melhorLoja: { nome: string; servicos: number; desvio: number; taxaReparacao?: number; objetivo?: number } | null;
    piorLoja: { nome: string; servicos: number; desvio: number; taxaReparacao?: number; objetivo?: number } | null;
    maiorEvolucao: { nome: string; variacao: number; servicosAtuais?: number; servicosAnteriores?: number } | null;
    menorEvolucao: { nome: string; variacao: number; servicosAtuais?: number; servicosAnteriores?: number } | null;
    totalLojas: number;
    lojasAcimaMedia: number;
    lojasAbaixoMedia: number;
    mediaServicos: number;
    mediaTaxaReparacao: number;
  };
  dadosGraficos?: {
    rankingServicos: Array<{ lojaId?: number; loja: string; zona?: string | null; servicos: number; desvio: number; objetivo?: number; taxaReparacao?: number }>;
    evolucaoMensal: Array<{ mes: string; servicos: number; objetivo: number }>;
    distribuicaoDesvios: Array<{ faixa: string; count: number }>;
  };
  // NOVOS CAMPOS - Análise Avançada v6.5
  rankingsDetalhados?: {
    taxaReparacao: {
      top5: Array<{ posicao: number; lojaNome: string; zona?: string | null; taxaReparacao: number; qtdReparacoes: number; qtdParaBrisas: number; totalServicos: number }>;
      bottom5: Array<{ posicao: number; lojaNome: string; zona?: string | null; taxaReparacao: number; qtdReparacoes: number; qtdParaBrisas: number; totalServicos: number }>;
    };
    cumprimentoObjetivo: {
      top5: Array<{ posicao: number; lojaNome: string; zona?: string | null; totalServicos: number; objetivoMensal: number; desvioPercentualMes: number; taxaReparacao: number }>;
      bottom5: Array<{ posicao: number; lojaNome: string; zona?: string | null; totalServicos: number; objetivoMensal: number; desvioPercentualMes: number; taxaReparacao: number }>;
    };
    vendasComplementares: {
      top5: Array<{ posicao: number; lojaNome: string; totalVendas: number; escovasVendas: number; escovasPercent: number; polimentoVendas: number }>;
      bottom5: Array<{ posicao: number; lojaNome: string; totalVendas: number; escovasVendas: number; escovasPercent: number }>;
    };
    crescimento: {
      top5: Array<{ posicao: number; lojaNome: string; zona?: string | null; totalServicos: number; servicosAnterior: number; crescimento: number }>;
      bottom5: Array<{ posicao: number; lojaNome: string; zona?: string | null; totalServicos: number; servicosAnterior: number; crescimento: number }>;
    };
  };
  analiseZonasDetalhada?: AnaliseZona[];
  estatisticasComplementares?: {
    totalLojas: number;
    lojasComVendas: number;
    lojasSemVendas: number;
    somaVendas: number;
    somaEscovas: number;
    totalEscovasQtd: number;
    mediaEscovasPercent: number;
    percentLojasComEscovas: number;
  };
  insightsIA?: {
    resumoExecutivo: string;
    analisePerformance: string;
    analiseVendasComplementares: string;
    analiseTendencias: string;
    recomendacoesEstrategicas: string[];
    alertasCriticos: string[];
  };
  // Novos campos para relatórios detalhados
  relatoriosPorLoja?: Array<{
    lojaId: number;
    lojaNome: string;
    totalRelatorios: number;
    relatoriosLivres: number;
    relatoriosCompletos: number;
  }>;
  resumoConteudoRelatorios?: string;
}

/**
 * Gera relatório automático com análise de IA - VERSÃO AVANÇADA v6.5
 * @param periodo - Período de análise
 * @param gestorId - ID do gestor (opcional, para filtrar por gestor)
 * @param lojasIds - IDs das lojas a incluir (opcional, para filtrar por zona ou gestor)
 */
export async function gerarRelatorioComIA(
  periodo: string, // Agora aceita períodos personalizados como "meses_10/2025, 11/2025"
  gestorId?: number,
  lojasIds?: number[],
  dataInicioParam?: Date,
  dataFimParam?: Date
): Promise<AnaliseIA> {
  // Buscar relatórios do período
  const dataInicio = dataInicioParam || calcularDataInicio(periodo);
  const dataFim = dataFimParam || calcularDataFim(periodo);

  let relatoriosLivresFiltrados: any[];
  let relatoriosCompletosFiltrados: any[];
  
  if (gestorId) {
    relatoriosLivresFiltrados = await db.getRelatoriosLivresByGestorId(gestorId);
    relatoriosCompletosFiltrados = await db.getRelatoriosCompletosByGestorId(gestorId);
  } else {
    relatoriosLivresFiltrados = await db.getAllRelatoriosLivres();
    relatoriosCompletosFiltrados = await db.getAllRelatoriosCompletos();
  }
  
  // Filtrar por lojas específicas se fornecidas
  if (lojasIds && lojasIds.length > 0) {
    relatoriosLivresFiltrados = relatoriosLivresFiltrados.filter((r: any) => lojasIds.includes(r.lojaId));
    relatoriosCompletosFiltrados = relatoriosCompletosFiltrados.filter((r: any) => lojasIds.includes(r.lojaId));
  }
  
  // Filtrar por período
  relatoriosLivresFiltrados = relatoriosLivresFiltrados.filter((r: any) => {
    const dataVisita = new Date(r.dataVisita);
    return dataVisita >= dataInicio && dataVisita <= dataFim;
  });
  
  relatoriosCompletosFiltrados = relatoriosCompletosFiltrados.filter((r: any) => {
    const dataVisita = new Date(r.dataVisita);
    return dataVisita >= dataInicio && dataVisita <= dataFim;
  });

  const todosRelatorios: RelatorioAnalise[] = [
    ...relatoriosLivresFiltrados.map((r: any) => ({
      lojaId: r.lojaId,
      lojaNome: r.loja?.nome || "Loja desconhecida",
      dataVisita: new Date(r.dataVisita),
      tipo: "livre" as const,
      conteudo: r.descricao || "",
      pontosPositivosRelatorio: r.pontosPositivosDestacar,
      pontosNegativosRelatorio: r.pontosNegativosDestacar,
    })),
    ...relatoriosCompletosFiltrados.map((r: any) => ({
      lojaId: r.lojaId,
      lojaNome: r.loja?.nome || "Loja desconhecida",
      dataVisita: new Date(r.dataVisita),
      tipo: "completo" as const,
      conteudo: `EPIs: ${r.episFardamento || "N/A"}, Kit 1ºs Socorros: ${r.kitPrimeirosSocorros || "N/A"}, Consumíveis: ${r.consumiveis || "N/A"}, Espaço Físico: ${r.espacoFisico || "N/A"}, Reclamações: ${r.reclamacoes || "N/A"}, Vendas Complementares: ${r.vendasComplementares || "N/A"}, Fichas de Serviço: ${r.fichasServico || "N/A"}, Documentação: ${r.documentacaoObrigatoria || "N/A"}, Reunião Quinzenal: ${r.reuniaoQuinzenal || "N/A"}, Resumo: ${r.resumoColaboradores || "N/A"}`,
      pontosPositivosRelatorio: r.pontosPositivosDestacar,
      pontosNegativosRelatorio: r.pontosNegativosDestacar,
    })),
  ];

  const frequenciaVisitas: { [loja: string]: number } = {};
  todosRelatorios.forEach((r) => {
    frequenciaVisitas[r.lojaNome] = (frequenciaVisitas[r.lojaNome] || 0) + 1;
  });

  const lojasOrdenadas = Object.entries(frequenciaVisitas).sort(
    (a, b) => b[1] - a[1]
  );
  const lojaMaisVisitada = lojasOrdenadas.length > 0
    ? { nome: lojasOrdenadas[0][0], visitas: lojasOrdenadas[0][1] }
    : null;
  const lojaMenosVisitada = lojasOrdenadas.length > 0
    ? {
        nome: lojasOrdenadas[lojasOrdenadas.length - 1][0],
        visitas: lojasOrdenadas[lojasOrdenadas.length - 1][1],
      }
    : null;

  const pontosPositivosRelatados: string[] = [];
  const pontosNegativosRelatados: string[] = [];
  
  relatoriosCompletosFiltrados.forEach((r: any) => {
    if (r.pontosPositivos && r.pontosPositivos.trim()) {
      pontosPositivosRelatados.push(`[${r.loja?.nome || 'Loja'}] ${r.pontosPositivos}`);
    }
    if (r.pontosNegativos && r.pontosNegativos.trim()) {
      pontosNegativosRelatados.push(`[${r.loja?.nome || 'Loja'}] ${r.pontosNegativos}`);
    }
  });

  // ========== BUSCAR DADOS AVANÇADOS v6.5 ==========
  const agora = new Date();
  
  // Calcular lista de meses a buscar baseado no período
  const mesesParaBuscar: Array<{ mes: number; ano: number }> = [];
  
  if (periodo === 'mes_anterior') {
    let mesAnterior = agora.getMonth();
    let anoAnterior = agora.getFullYear();
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anoAnterior = agora.getFullYear() - 1;
    }
    mesesParaBuscar.push({ mes: mesAnterior, ano: anoAnterior });
  } else if (periodo === 'mes_atual') {
    mesesParaBuscar.push({ mes: agora.getMonth() + 1, ano: agora.getFullYear() });
  } else if (periodo === 'trimestre_anterior') {
    // Trimestre anterior completo (Q1=Jan-Mar, Q2=Abr-Jun, Q3=Jul-Set, Q4=Out-Dez)
    const mesAtual = agora.getMonth();
    const trimestreAtual = Math.floor(mesAtual / 3);
    const trimestreAnterior = trimestreAtual === 0 ? 3 : trimestreAtual - 1;
    const anoTrimestre = trimestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
    const mesInicioTrimestre = trimestreAnterior * 3 + 1;
    for (let i = 0; i < 3; i++) {
      mesesParaBuscar.push({ mes: mesInicioTrimestre + i, ano: anoTrimestre });
    }
  } else if (periodo === 'semestre_anterior') {
    // Semestre anterior completo (S1=Jan-Jun, S2=Jul-Dez)
    const mesAtual = agora.getMonth();
    const semestreAtual = mesAtual < 6 ? 0 : 1;
    const semestreAnterior = semestreAtual === 0 ? 1 : 0;
    const anoSemestre = semestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
    const mesInicioSemestre = semestreAnterior * 6 + 1;
    for (let i = 0; i < 6; i++) {
      mesesParaBuscar.push({ mes: mesInicioSemestre + i, ano: anoSemestre });
    }
  } else if (periodo === 'ano_anterior') {
    // Ano anterior completo (Jan-Dez)
    const anoAnterior = agora.getFullYear() - 1;
    for (let i = 1; i <= 12; i++) {
      mesesParaBuscar.push({ mes: i, ano: anoAnterior });
    }
  } else {
    // Fallback para mês atual
    mesesParaBuscar.push({ mes: agora.getMonth() + 1, ano: agora.getFullYear() });
  }
  
  console.log(`[RelatoriosIA] Período: ${periodo}, Meses a buscar:`, mesesParaBuscar);
  
  // Buscar dados analíticos avançados
  let dadosAvancados: any = null;
  let rankingLojas: any[] = [];
  let comparacaoLojas: any = null;
  let statsResultados: any = null;
  
  try {
    // Buscar e agregar dados de todos os meses do período
    const todosRankings: any[] = [];
    let somaServicos = 0;
    let somaObjetivos = 0;
    let somaReparacoes = 0;
    let contLojas = 0;
    let somaDesvio = 0;
    let somaTaxaReparacao = 0;
    let lojasAcimaObjetivo = 0;
    
    // Mapa para agregar dados por loja
    const lojaAgregado = new Map<number, {
      lojaId: number;
      lojaNome: string;
      zona: string | null;
      totalServicos: number;
      objetivoMensal: number;
      qtdReparacoes: number;
      qtdParaBrisas: number;
      mesesContados: number;
    }>();
    
    for (const { mes, ano } of mesesParaBuscar) {
      const dadosMes = await db.getDadosAnaliseAvancada(mes, ano, lojasIds);
      const rankingMes = await db.getRankingLojas('totalServicos', mes, ano, 100, lojasIds) || [];
      
      // Agregar estatísticas
      if (dadosMes?.estatisticas) {
        const stats = dadosMes.estatisticas;
        somaServicos += stats.somaServicos || 0;
        somaObjetivos += stats.somaObjetivos || 0;
        somaReparacoes += stats.somaReparacoes || 0;
        if (stats.totalLojas > 0) {
          contLojas += stats.totalLojas;
          somaDesvio += (stats.mediaDesvioPercentual || 0) * stats.totalLojas;
          somaTaxaReparacao += (stats.mediaTaxaReparacao || 0) * stats.totalLojas;
          lojasAcimaObjetivo += stats.lojasAcimaObjetivo || 0;
        }
      }
      
      // Agregar dados por loja
      for (const loja of rankingMes) {
        const existing = lojaAgregado.get(loja.lojaId);
        if (existing) {
          existing.totalServicos += loja.totalServicos || 0;
          existing.objetivoMensal += loja.objetivoMensal || 0;
          existing.mesesContados++;
        } else {
          lojaAgregado.set(loja.lojaId, {
            lojaId: loja.lojaId,
            lojaNome: loja.lojaNome,
            zona: loja.zona,
            totalServicos: loja.totalServicos || 0,
            objetivoMensal: loja.objetivoMensal || 0,
            qtdReparacoes: 0,
            qtdParaBrisas: 0,
            mesesContados: 1,
          });
        }
      }
    }
    
    // Calcular estatísticas agregadas
    const totalLojasUnicas = lojaAgregado.size;
    statsResultados = {
      totalLojas: totalLojasUnicas,
      somaServicos,
      somaObjetivos,
      mediaDesvioPercentual: contLojas > 0 ? somaDesvio / contLojas : 0,
      mediaTaxaReparacao: contLojas > 0 ? somaTaxaReparacao / contLojas : 0,
      somaReparacoes,
      lojasAcimaObjetivo: Math.round(lojasAcimaObjetivo / mesesParaBuscar.length),
    };
    
    // Converter mapa para array e calcular desvio agregado
    rankingLojas = Array.from(lojaAgregado.values()).map(loja => {
      const desvio = loja.objetivoMensal > 0 
        ? (loja.totalServicos - loja.objetivoMensal) / loja.objetivoMensal 
        : 0;
      return {
        lojaId: loja.lojaId,
        lojaNome: loja.lojaNome,
        zona: loja.zona,
        totalServicos: loja.totalServicos,
        objetivoMensal: loja.objetivoMensal,
        desvioPercentualMes: desvio,
        valor: loja.totalServicos,
      };
    }).sort((a, b) => b.totalServicos - a.totalServicos);
    
    // Usar o primeiro mês para buscar rankings detalhados (para manter compatibilidade)
    const primeiroMes = mesesParaBuscar[0];
    dadosAvancados = await db.getDadosAnaliseAvancada(primeiroMes.mes, primeiroMes.ano, lojasIds);
    // Sobrescrever estatísticas com as agregadas
    if (dadosAvancados) {
      dadosAvancados.estatisticas = statsResultados;
    }
    
    // Calcular evolução para comparação
    if (rankingLojas.length > 0) {
      const evolucoes = await Promise.all(
        rankingLojas.slice(0, 20).map(async (loja: any) => {
          try {
            const evolucao = await db.getEvolucaoMensal(loja.lojaId, 2);
            if (evolucao && evolucao.length >= 2) {
              const atual = evolucao[evolucao.length - 1]?.totalServicos || 0;
              const anterior = evolucao[evolucao.length - 2]?.totalServicos || 0;
              const variacao = anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0;
              return { ...loja, variacao, servicosAtuais: atual, servicosAnteriores: anterior };
            }
            return { ...loja, variacao: 0 };
          } catch {
            return { ...loja, variacao: 0 };
          }
        })
      );
      
      const ordenadosPorVariacao = evolucoes.filter(e => e.variacao !== 0).sort((a, b) => b.variacao - a.variacao);
      comparacaoLojas = {
        melhorLoja: rankingLojas[0],
        piorLoja: rankingLojas[rankingLojas.length - 1],
        maiorEvolucao: ordenadosPorVariacao[0] || null,
        menorEvolucao: ordenadosPorVariacao[ordenadosPorVariacao.length - 1] || null,
        totalLojas: rankingLojas.length,
        lojasAcimaMedia: rankingLojas.filter((l: any) => (l.desvioPercentualMes || 0) >= 0).length,
      };
    }
  } catch (error) {
    console.log('[RelatoriosIA] Erro ao buscar dados avançados:', error);
  }

  // ========== PREPARAR TEXTO PARA IA ==========
  const relatoriosTexto = todosRelatorios
    .map(
      (r) =>
        `[${r.dataVisita.toLocaleDateString("pt-PT")}] ${r.lojaNome} (${r.tipo}):\n${r.conteudo}`
    )
    .join("\n\n");

  const pontosDestacadosTexto = `
PONTOS POSITIVOS DESTACADOS PELOS GESTORES:
${pontosPositivosRelatados.length > 0 ? pontosPositivosRelatados.join('\n') : 'Nenhum ponto positivo registado neste período.'}

PONTOS NEGATIVOS DESTACADOS PELOS GESTORES:
${pontosNegativosRelatados.length > 0 ? pontosNegativosRelatados.join('\n') : 'Nenhum ponto negativo registado neste período.'}
`;

  // Preparar texto com TODOS os dados avançados
  let dadosAvancadosTexto = '';
  
  if (dadosAvancados && statsResultados) {
    const { somaServicos, somaObjetivos, mediaDesvioPercentual, mediaTaxaReparacao, lojasAcimaObjetivo, totalLojas } = statsResultados;
    const taxaCumprimento = totalLojas > 0 ? ((lojasAcimaObjetivo || 0) / totalLojas * 100).toFixed(1) : 0;
    const lojasAbaixoObjetivo = (totalLojas || 0) - (lojasAcimaObjetivo || 0);
    
    dadosAvancadosTexto = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ANÁLISE QUANTITATIVA COMPLETA - ${periodo.toUpperCase()}                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══ MÉTRICAS GLOBAIS DA REDE ═══
• Total de Serviços Realizados: ${somaServicos || 0}
• Objetivo Mensal Total: ${somaObjetivos || 0}
• Desvio Médio vs Objetivo: ${mediaDesvioPercentual >= 0 ? '+' : ''}${(mediaDesvioPercentual * 100)?.toFixed(2) || 0}%
• Taxa de Reparação Média: ${(mediaTaxaReparacao * 100)?.toFixed(2) || 0}%
• Total de Lojas Analisadas: ${totalLojas || 0}

═══ CUMPRIMENTO DE OBJETIVOS ═══
• Lojas ACIMA do objetivo: ${lojasAcimaObjetivo || 0} (${taxaCumprimento}%)
• Lojas ABAIXO do objetivo: ${lojasAbaixoObjetivo} (${(100 - parseFloat(taxaCumprimento as string)).toFixed(1)}%)

`;

    // Rankings de Taxa de Reparação
    if (dadosAvancados.rankings?.taxaReparacao) {
      dadosAvancadosTexto += `
═══ TOP 5 - MELHOR TAXA DE REPARAÇÃO ═══
`;
      dadosAvancados.rankings.taxaReparacao.top5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Taxa: ${(l.taxaReparacao * 100).toFixed(2)}% | Reparações: ${l.qtdReparacoes} | Para-brisas: ${l.qtdParaBrisas} | Zona: ${l.zona || 'N/A'}
`;
      });
      
      dadosAvancadosTexto += `
═══ BOTTOM 5 - PIOR TAXA DE REPARAÇÃO ═══
`;
      dadosAvancados.rankings.taxaReparacao.bottom5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Taxa: ${(l.taxaReparacao * 100).toFixed(2)}% | Reparações: ${l.qtdReparacoes} | Para-brisas: ${l.qtdParaBrisas} | Zona: ${l.zona || 'N/A'}
`;
      });
    }

    // Rankings de Cumprimento de Objetivo
    if (dadosAvancados.rankings?.cumprimentoObjetivo) {
      dadosAvancadosTexto += `
═══ TOP 5 - MELHOR CUMPRIMENTO DE OBJETIVO ═══
`;
      dadosAvancados.rankings.cumprimentoObjetivo.top5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Desvio: ${l.desvioPercentualMes >= 0 ? '+' : ''}${(l.desvioPercentualMes * 100).toFixed(2)}% | Serviços: ${l.totalServicos}/${l.objetivoMensal} | Taxa Rep: ${(l.taxaReparacao * 100).toFixed(2)}% | Zona: ${l.zona || 'N/A'}
`;
      });
      
      dadosAvancadosTexto += `
═══ BOTTOM 5 - PIOR CUMPRIMENTO DE OBJETIVO ═══
`;
      dadosAvancados.rankings.cumprimentoObjetivo.bottom5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Desvio: ${l.desvioPercentualMes >= 0 ? '+' : ''}${(l.desvioPercentualMes * 100).toFixed(2)}% | Serviços: ${l.totalServicos}/${l.objetivoMensal} | Taxa Rep: ${(l.taxaReparacao * 100).toFixed(2)}% | Zona: ${l.zona || 'N/A'}
`;
      });
    }

    // Rankings de Vendas Complementares
    if (dadosAvancados.rankings?.vendasComplementares) {
      dadosAvancadosTexto += `
═══ TOP 5 - MELHORES VENDAS COMPLEMENTARES ═══
`;
      dadosAvancados.rankings.vendasComplementares.top5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Total: €${l.totalVendas?.toFixed(2) || 0} | Escovas: €${l.escovasVendas?.toFixed(2) || 0} (${(l.escovasPercent * 100).toFixed(1)}%) | Polimento: €${l.polimentoVendas?.toFixed(2) || 0}
`;
      });
      
      dadosAvancadosTexto += `
═══ BOTTOM 5 - PIORES VENDAS COMPLEMENTARES ═══
`;
      dadosAvancados.rankings.vendasComplementares.bottom5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Total: €${l.totalVendas?.toFixed(2) || 0} | Escovas: €${l.escovasVendas?.toFixed(2) || 0}
`;
      });
    }

    // Rankings de Crescimento
    if (dadosAvancados.rankings?.crescimento) {
      dadosAvancadosTexto += `
═══ TOP 5 - MAIOR CRESCIMENTO vs MÊS ANTERIOR ═══
`;
      dadosAvancados.rankings.crescimento.top5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Crescimento: +${l.crescimento.toFixed(2)}% | De ${l.servicosAnterior} para ${l.totalServicos} serviços | Zona: ${l.zona || 'N/A'}
`;
      });
      
      dadosAvancadosTexto += `
═══ BOTTOM 5 - MAIOR DECRÉSCIMO vs MÊS ANTERIOR ═══
`;
      dadosAvancados.rankings.crescimento.bottom5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Decréscimo: ${l.crescimento.toFixed(2)}% | De ${l.servicosAnterior} para ${l.totalServicos} serviços | Zona: ${l.zona || 'N/A'}
`;
      });
    }

    // Análise por Zona
    if (dadosAvancados.analiseZonas && dadosAvancados.analiseZonas.length > 0) {
      dadosAvancadosTexto += `
═══ ANÁLISE POR ZONA ═══
`;
      dadosAvancados.analiseZonas.forEach((z: any) => {
        dadosAvancadosTexto += `
▸ ${z.zona}
  • Lojas: ${z.totalLojas} | Acima Obj: ${z.lojasAcimaObjetivo} (${z.taxaCumprimento.toFixed(1)}%)
  • Serviços: ${z.somaServicos}/${z.somaObjetivos} | Desvio Médio: ${z.mediaDesvio >= 0 ? '+' : ''}${(z.mediaDesvio * 100).toFixed(2)}%
  • Taxa Reparação Média: ${(z.mediaTaxaReparacao * 100).toFixed(2)}%
  • Melhor: ${z.melhorLoja} (${z.melhorLojaDesvio >= 0 ? '+' : ''}${(z.melhorLojaDesvio * 100).toFixed(2)}%)
  • Pior: ${z.piorLoja} (${z.piorLojaDesvio >= 0 ? '+' : ''}${(z.piorLojaDesvio * 100).toFixed(2)}%)
`;
      });
    }

    // Estatísticas de Vendas Complementares
    if (dadosAvancados.estatisticasComplementares) {
      const ec = dadosAvancados.estatisticasComplementares;
      dadosAvancadosTexto += `
═══ RESUMO VENDAS COMPLEMENTARES ═══
• Total Vendas: €${ec.somaVendas?.toFixed(2) || 0}
• Lojas com Vendas: ${ec.lojasComVendas}/${ec.totalLojas} (${((ec.lojasComVendas / ec.totalLojas) * 100).toFixed(1)}%)
• Total Escovas: ${ec.totalEscovasQtd} unidades (€${ec.somaEscovas?.toFixed(2) || 0})
• Média % Escovas/Serviços: ${(ec.mediaEscovasPercent * 100).toFixed(2)}%
`;
    }
  }

  // ========== PROMPT MELHORADO PARA IA ==========
  const prompt = `És um ANALISTA DE DADOS SÉNIOR especializado em performance de redes de retalho automóvel. 
Analisa os dados quantitativos da rede Express Glass para o período ${periodo}.

${dadosAvancadosTexto}

CONTEXTO ADICIONAL DOS RELATÓRIOS DE SUPERVISÃO:
${relatoriosTexto ? relatoriosTexto.substring(0, 1500) : 'Sem relatórios de supervisão disponíveis.'}

${pontosDestacadosTexto}

═══════════════════════════════════════════════════════════════════════════════
                           INSTRUÇÕES DE ANÁLISE
═══════════════════════════════════════════════════════════════════════════════

Produz uma ANÁLISE EXECUTIVA PROFISSIONAL com os seguintes componentes:

1. RESUMO EXECUTIVO (resumoExecutivo):
   - Parágrafo de 3-4 frases com visão geral da performance
   - Incluir: taxa de cumprimento, desvio médio, comparação com período anterior
   - Tom: direto, factual, orientado para decisão

2. ANÁLISE DE PERFORMANCE (analisePerformance):
   - Identificar padrões de sucesso nas lojas TOP
   - Analisar causas prováveis dos resultados negativos
   - Correlacionar taxa de reparação com volume de serviços
   - Identificar zonas/regiões com melhor e pior desempenho

3. ANÁLISE DE VENDAS COMPLEMENTARES (analiseVendasComplementares):
   - Avaliar penetração de escovas e outros produtos
   - Identificar oportunidades de cross-selling
   - Comparar performance entre lojas

4. ANÁLISE DE TENDÊNCIAS (analiseTendencias):
   - Lojas em crescimento vs decréscimo
   - Padrões de sazonalidade
   - Evolução da rede como um todo

5. RECOMENDAÇÕES ESTRATÉGICAS (recomendacoesEstrategicas):
   - 5-7 ações concretas e específicas
   - Priorizar por impacto potencial
   - Incluir responsável sugerido (gestor/admin/loja)

6. ALERTAS CRÍTICOS (alertasCriticos):
   - Situações que requerem ação imediata
   - Lojas em risco de performance crítica
   - Tendências preocupantes

7. LOJAS EM DESTAQUE (lojasDestaque):
   - Formato: "[Nome Loja] (+X% vs obj, Y serviços, taxa rep Z%)"
   - Mínimo 3, máximo 5 lojas

8. LOJAS QUE PRECISAM ATENÇÃO (lojasAtencao):
   - Formato: "[Nome Loja] (X% vs obj, Y serviços, taxa rep Z%)"
   - Mínimo 3, máximo 5 lojas

Responde em formato JSON:
{
  "pontosPositivos": ["aspeto positivo 1", ...],
  "pontosNegativos": ["aspeto negativo 1", ...],
  "sugestoes": ["sugestão 1", ...],
  "resumo": "Resumo geral",
  "analisePontosDestacados": {
    "positivos": ["análise 1", ...],
    "negativos": ["análise 1", ...],
    "tendencias": "Tendências observadas"
  },
  "analiseResultados": {
    "resumoPerformance": "Resumo quantitativo",
    "lojasDestaque": ["[Loja X] (+Y% vs obj, Z serviços, taxa rep W%)", ...],
    "lojasAtencao": ["[Loja A] (B% vs obj, C serviços, taxa rep D%)", ...],
    "tendenciasServicos": "Análise de tendências",
    "recomendacoes": ["recomendação 1", ...]
  },
  "insightsIA": {
    "resumoExecutivo": "Parágrafo executivo",
    "analisePerformance": "Análise detalhada de performance",
    "analiseVendasComplementares": "Análise de vendas complementares",
    "analiseTendencias": "Análise de tendências",
    "recomendacoesEstrategicas": ["recomendação estratégica 1", ...],
    "alertasCriticos": ["alerta 1", ...]
  }
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `És um analista de dados sénior com 15 anos de experiência em redes de retalho automóvel.
A tua análise deve ser:
- QUANTITATIVA: baseada em números e métricas concretas
- PROFISSIONAL: tom executivo, direto e orientado para ação
- ESTRATÉGICA: identificar padrões e oportunidades
- ESPECÍFICA: evitar generalizações, usar dados concretos
- ACIONÁVEL: cada insight deve ter uma ação associada

Respondes sempre em português europeu e em formato JSON válido.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analise_relatorios_avancada",
          strict: true,
          schema: {
            type: "object",
            properties: {
              pontosPositivos: {
                type: "array",
                items: { type: "string" },
              },
              pontosNegativos: {
                type: "array",
                items: { type: "string" },
              },
              sugestoes: {
                type: "array",
                items: { type: "string" },
              },
              resumo: {
                type: "string",
              },
              analisePontosDestacados: {
                type: "object",
                properties: {
                  positivos: { type: "array", items: { type: "string" } },
                  negativos: { type: "array", items: { type: "string" } },
                  tendencias: { type: "string" },
                },
                required: ["positivos", "negativos", "tendencias"],
                additionalProperties: false,
              },
              analiseResultados: {
                type: "object",
                properties: {
                  resumoPerformance: { type: "string" },
                  lojasDestaque: { type: "array", items: { type: "string" } },
                  lojasAtencao: { type: "array", items: { type: "string" } },
                  tendenciasServicos: { type: "string" },
                  recomendacoes: { type: "array", items: { type: "string" } },
                },
                required: ["resumoPerformance", "lojasDestaque", "lojasAtencao", "tendenciasServicos", "recomendacoes"],
                additionalProperties: false,
              },
              insightsIA: {
                type: "object",
                properties: {
                  resumoExecutivo: { type: "string" },
                  analisePerformance: { type: "string" },
                  analiseVendasComplementares: { type: "string" },
                  analiseTendencias: { type: "string" },
                  recomendacoesEstrategicas: { type: "array", items: { type: "string" } },
                  alertasCriticos: { type: "array", items: { type: "string" } },
                },
                required: ["resumoExecutivo", "analisePerformance", "analiseVendasComplementares", "analiseTendencias", "recomendacoesEstrategicas", "alertasCriticos"],
                additionalProperties: false,
              },
            },
            required: ["pontosPositivos", "pontosNegativos", "sugestoes", "resumo", "analisePontosDestacados", "analiseResultados", "insightsIA"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analise = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

    // Calcular médias
    const mediaServicos = rankingLojas.length > 0 
      ? rankingLojas.reduce((sum: number, l: any) => sum + (l.totalServicos || 0), 0) / rankingLojas.length 
      : 0;
    const mediaTaxaReparacao = rankingLojas.length > 0 
      ? rankingLojas.reduce((sum: number, l: any) => sum + (l.taxaReparacao || 0), 0) / rankingLojas.length 
      : 0;
    const lojasAbaixoMedia = comparacaoLojas ? (comparacaoLojas.totalLojas || 0) - (comparacaoLojas.lojasAcimaMedia || 0) : 0;
    
    const comparacaoLojasFormatada = comparacaoLojas ? {
      melhorLoja: comparacaoLojas.melhorLoja ? {
        nome: comparacaoLojas.melhorLoja.lojaNome,
        servicos: comparacaoLojas.melhorLoja.totalServicos,
        desvio: comparacaoLojas.melhorLoja.desvioPercentualMes || 0,
        taxaReparacao: comparacaoLojas.melhorLoja.taxaReparacao || 0,
        objetivo: comparacaoLojas.melhorLoja.objetivoMensal || 0,
      } : null,
      piorLoja: comparacaoLojas.piorLoja ? {
        nome: comparacaoLojas.piorLoja.lojaNome,
        servicos: comparacaoLojas.piorLoja.totalServicos,
        desvio: comparacaoLojas.piorLoja.desvioPercentualMes || 0,
        taxaReparacao: comparacaoLojas.piorLoja.taxaReparacao || 0,
        objetivo: comparacaoLojas.piorLoja.objetivoMensal || 0,
      } : null,
      maiorEvolucao: comparacaoLojas.maiorEvolucao ? {
        nome: comparacaoLojas.maiorEvolucao.lojaNome,
        variacao: comparacaoLojas.maiorEvolucao.variacao || 0,
        servicosAtuais: comparacaoLojas.maiorEvolucao.servicosAtuais || 0,
        servicosAnteriores: comparacaoLojas.maiorEvolucao.servicosAnteriores || 0,
      } : null,
      menorEvolucao: comparacaoLojas.menorEvolucao ? {
        nome: comparacaoLojas.menorEvolucao.lojaNome,
        variacao: comparacaoLojas.menorEvolucao.variacao || 0,
        servicosAtuais: comparacaoLojas.menorEvolucao.servicosAtuais || 0,
        servicosAnteriores: comparacaoLojas.menorEvolucao.servicosAnteriores || 0,
      } : null,
      totalLojas: comparacaoLojas.totalLojas || 0,
      lojasAcimaMedia: comparacaoLojas.lojasAcimaMedia || 0,
      lojasAbaixoMedia: lojasAbaixoMedia,
      mediaServicos: Math.round(mediaServicos),
      mediaTaxaReparacao: parseFloat(mediaTaxaReparacao.toFixed(4)),
    } : undefined;
    
    // Distribuição de desvios
    const distribuicaoDesvios: Array<{ faixa: string; count: number }> = [];
    if (rankingLojas.length > 0) {
      const faixas = [
        { min: -Infinity, max: -20, label: '< -20%' },
        { min: -20, max: -10, label: '-20% a -10%' },
        { min: -10, max: 0, label: '-10% a 0%' },
        { min: 0, max: 10, label: '0% a +10%' },
        { min: 10, max: 20, label: '+10% a +20%' },
        { min: 20, max: Infinity, label: '> +20%' },
      ];
      faixas.forEach(faixa => {
        const count = rankingLojas.filter((l: any) => {
          const desvio = (l.desvioPercentualMes || 0) * 100;
          return desvio > faixa.min && desvio <= faixa.max;
        }).length;
        distribuicaoDesvios.push({ faixa: faixa.label, count });
      });
    }
    
    const dadosGraficos = rankingLojas.length > 0 ? {
      // Incluir TODAS as lojas para permitir filtragem no frontend
      rankingServicos: rankingLojas.map((l: any) => ({
        lojaId: l.lojaId,
        loja: l.lojaNome,
        zona: l.zona || null,
        servicos: l.totalServicos,
        desvio: l.desvioPercentualMes || 0,
        objetivo: l.objetivoMensal || 0,
        taxaReparacao: l.taxaReparacao || 0,
      })),
      evolucaoMensal: [] as Array<{ mes: string; servicos: number; objetivo: number }>,
      distribuicaoDesvios: distribuicaoDesvios,
    } : undefined;

    // Formatar rankings detalhados
    const rankingsDetalhados = dadosAvancados?.rankings ? {
      taxaReparacao: {
        top5: dadosAvancados.rankings.taxaReparacao.top5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
        bottom5: dadosAvancados.rankings.taxaReparacao.bottom5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
      },
      cumprimentoObjetivo: {
        top5: dadosAvancados.rankings.cumprimentoObjetivo.top5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
        bottom5: dadosAvancados.rankings.cumprimentoObjetivo.bottom5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
      },
      vendasComplementares: {
        top5: dadosAvancados.rankings.vendasComplementares.top5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
        bottom5: dadosAvancados.rankings.vendasComplementares.bottom5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
      },
      crescimento: {
        top5: dadosAvancados.rankings.crescimento.top5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
        bottom5: dadosAvancados.rankings.crescimento.bottom5.map((l: any, i: number) => ({ posicao: i + 1, ...l })),
      },
    } : undefined;
    
    return {
      lojaMaisVisitada,
      lojaMenosVisitada,
      frequenciaVisitas,
      pontosPositivos: analise.pontosPositivos,
      pontosNegativos: analise.pontosNegativos,
      sugestoes: analise.sugestoes,
      resumo: analise.resumo,
      analisePontosDestacados: analise.analisePontosDestacados,
      analiseResultados: analise.analiseResultados,
      comparacaoLojas: comparacaoLojasFormatada,
      dadosGraficos,
      // Novos campos v6.5
      rankingsDetalhados,
      analiseZonasDetalhada: dadosAvancados?.analiseZonas || [],
      estatisticasComplementares: dadosAvancados?.estatisticasComplementares || undefined,
      insightsIA: analise.insightsIA,
    };
  } catch (error) {
    console.error("Erro ao gerar análise com IA:", error);
    return {
      lojaMaisVisitada,
      lojaMenosVisitada,
      frequenciaVisitas,
      pontosPositivos: ["Análise de IA temporariamente indisponível"],
      pontosNegativos: ["Análise de IA temporariamente indisponível"],
      sugestoes: ["Análise de IA temporariamente indisponível"],
      resumo: `Período ${periodo}: ${todosRelatorios.length} relatórios analisados.`,
      analisePontosDestacados: {
        positivos: ["Análise de IA temporariamente indisponível"],
        negativos: ["Análise de IA temporariamente indisponível"],
        tendencias: "Análise de IA temporariamente indisponível",
      },
      analiseResultados: {
        resumoPerformance: "Análise de IA temporariamente indisponível",
        lojasDestaque: [],
        lojasAtencao: [],
        tendenciasServicos: "Análise de IA temporariamente indisponível",
        recomendacoes: [],
      },
    };
  }
}

function calcularDataInicio(
  periodo: string
): Date {
  const agora = new Date();
  switch (periodo) {
    case "diario":
      return new Date(agora.setDate(agora.getDate() - 1));
    case "semanal":
      return new Date(agora.setDate(agora.getDate() - 7));
    case "mensal":
    case "mes_atual":
      return new Date(agora.getFullYear(), agora.getMonth(), 1);
    case "mes_anterior":
      return new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    case "trimestre_anterior": {
      // Trimestre anterior completo (Q1=Jan-Mar, Q2=Abr-Jun, Q3=Jul-Set, Q4=Out-Dez)
      const mesAtual = agora.getMonth();
      const trimestreAtual = Math.floor(mesAtual / 3);
      const trimestreAnterior = trimestreAtual === 0 ? 3 : trimestreAtual - 1;
      const anoTrimestre = trimestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
      return new Date(anoTrimestre, trimestreAnterior * 3, 1);
    }
    case "semestre_anterior": {
      // Semestre anterior completo (S1=Jan-Jun, S2=Jul-Dez)
      const mesAtual = agora.getMonth();
      const semestreAtual = mesAtual < 6 ? 0 : 1;
      const semestreAnterior = semestreAtual === 0 ? 1 : 0;
      const anoSemestre = semestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
      return new Date(anoSemestre, semestreAnterior * 6, 1);
    }
    case "ano_anterior":
      return new Date(agora.getFullYear() - 1, 0, 1);
    case "trimestral":
      return new Date(agora.setMonth(agora.getMonth() - 3));
    case "semestral":
      return new Date(agora.setMonth(agora.getMonth() - 6));
    case "anual":
      return new Date(agora.getFullYear(), 0, 1);
    default:
      // Para períodos personalizados, retornar início do mês atual
      return new Date(agora.getFullYear(), agora.getMonth(), 1);
  }
}

function calcularDataFim(
  periodo: string
): Date {
  const agora = new Date();
  switch (periodo) {
    case "mes_anterior":
      return new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);
    case "trimestre_anterior": {
      // Último dia do trimestre anterior
      const mesAtual = agora.getMonth();
      const trimestreAtual = Math.floor(mesAtual / 3);
      const trimestreAnterior = trimestreAtual === 0 ? 3 : trimestreAtual - 1;
      const anoTrimestre = trimestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
      const ultimoMesTrimestre = (trimestreAnterior + 1) * 3;
      return new Date(anoTrimestre, ultimoMesTrimestre, 0, 23, 59, 59);
    }
    case "semestre_anterior": {
      // Último dia do semestre anterior
      const mesAtual = agora.getMonth();
      const semestreAtual = mesAtual < 6 ? 0 : 1;
      const anoSemestre = semestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
      const ultimoMesSemestre = semestreAtual === 0 ? 12 : 6;
      return new Date(anoSemestre, ultimoMesSemestre, 0, 23, 59, 59);
    }
    case "ano_anterior":
      return new Date(agora.getFullYear() - 1, 11, 31, 23, 59, 59);
    default:
      return agora;
  }
}


/**
 * Gera uma dica personalizada para o dashboard baseada nos dados atuais
 */
export async function gerarDicaDashboard(contexto: {
  totalLojas: number;
  totalGestores: number;
  relatoriosLivresMes: number;
  relatoriosCompletosMes: number;
  pendentesAtivos: number;
  alertasPendentes: number;
  userName: string;
  userRole: string;
}): Promise<string> {
  const { totalLojas, totalGestores, relatoriosLivresMes, relatoriosCompletosMes, pendentesAtivos, alertasPendentes, userName, userRole } = contexto;
  
  // Prompt diferente para admin vs gestor
  const isAdmin = userRole === 'admin';
  
  const prompt = isAdmin 
    ? `Gera uma dica curta e útil (máximo 2 frases) para um administrador de uma rede de lojas Express Glass.

Dados atuais:
- Total de lojas: ${totalLojas}
- Total de gestores: ${totalGestores}
- Relatórios livres este mês: ${relatoriosLivresMes}
- Relatórios completos este mês: ${relatoriosCompletosMes}
- Pendentes ativos: ${pendentesAtivos}
- Alertas pendentes: ${alertasPendentes}

A dica deve ser:
- Baseada nos dados acima
- Acionável e específica
- Focada em melhorar a gestão da rede
- Em português europeu

Exemplos de boas dicas:
- "Com ${pendentesAtivos} pendentes ativos, considere priorizar a resolução dos mais antigos para manter a eficiência operacional."
- "Os ${relatoriosLivresMes} relatórios livres este mês indicam boa atividade. Verifique se todas as lojas estão a ser visitadas regularmente."

Responde apenas com a dica, sem aspas nem formatação adicional.`
    : `Gera uma dica motivacional e prática (máximo 2 frases) para ${userName}, um gestor de lojas Express Glass.

A dica deve ser:
- Motivacional mas prática
- Focada em boas práticas de gestão de lojas
- Variada (não repetir sempre os mesmos temas)
- Em português europeu

Exemplos de boas dicas:
- "Uma visita bem documentada hoje pode prevenir problemas amanhã. Dedique tempo a registar observações detalhadas."
- "Pequenos gestos de reconhecimento às equipas das lojas fazem grande diferença na motivação e resultados."
- "Aproveite as visitas para identificar oportunidades de melhoria nos processos de atendimento."

Responde apenas com a dica, sem aspas nem formatação adicional.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "És um assistente especializado em gestão de redes de retalho automóvel. Geras dicas curtas, práticas e motivacionais." },
        { role: "user", content: prompt }
      ],
    });

    const content = response.choices[0].message.content;
    const dica = (typeof content === 'string' ? content.trim() : '') || '';
    return dica || (isAdmin 
      ? 'Verifique os pendentes ativos e priorize os mais urgentes.'
      : 'Mantenha contacto regular com as suas equipas de loja.');
  } catch (error) {
    console.error('Erro ao gerar dica:', error);
    return isAdmin 
      ? 'Verifique os pendentes ativos e priorize os mais urgentes.'
      : 'Mantenha contacto regular com as suas equipas de loja.';
  }
}


interface MesSelecionado {
  mes: number; // 1-12
  ano: number;
}

/**
 * Calcula período a partir de array de meses selecionados
 */
function calcularPeriodoMultiplosMeses(meses: MesSelecionado[]): { dataInicio: Date; dataFim: Date } {
  if (!meses || meses.length === 0) {
    const agora = new Date();
    return {
      dataInicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
      dataFim: new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59)
    };
  }
  
  const ordenados = [...meses].sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });
  
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  
  return {
    dataInicio: new Date(primeiro.ano, primeiro.mes - 1, 1),
    dataFim: new Date(ultimo.ano, ultimo.mes, 0, 23, 59, 59)
  };
}

/**
 * Gera relatório automático com análise de IA para múltiplos meses selecionados
 * VERSÃO COMPLETA - usa a mesma lógica avançada da função gerarRelatorioComIA
 */
export async function gerarRelatorioComIAMultiplosMeses(
  mesesSelecionados: MesSelecionado[],
  gestorId?: number,
  lojasIds?: number[]
): Promise<AnaliseIA> {
  const { dataInicio, dataFim } = calcularPeriodoMultiplosMeses(mesesSelecionados);
  
  // Gerar label para o período
  const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const labelMeses = mesesSelecionados.map(m => `${NOMES_MESES[m.mes - 1]} ${m.ano}`).join(", ");
  const periodoLabel = `meses_${mesesSelecionados.map(m => `${m.mes}/${m.ano}`).join('_')}`;
  
  // Buscar relatórios
  let relatoriosLivres: any[];
  let relatoriosCompletos: any[];
  
  if (gestorId) {
    relatoriosLivres = await db.getRelatoriosLivresByGestorId(gestorId);
    relatoriosCompletos = await db.getRelatoriosCompletosByGestorId(gestorId);
  } else {
    relatoriosLivres = await db.getAllRelatoriosLivres();
    relatoriosCompletos = await db.getAllRelatoriosCompletos();
  }
  
  // Filtrar por lojas específicas
  if (lojasIds && lojasIds.length > 0) {
    relatoriosLivres = relatoriosLivres.filter((r: any) => lojasIds.includes(r.lojaId));
    relatoriosCompletos = relatoriosCompletos.filter((r: any) => lojasIds.includes(r.lojaId));
  }
  
  // Filtrar por período
  relatoriosLivres = relatoriosLivres.filter((r: any) => {
    const dataVisita = new Date(r.dataVisita);
    return dataVisita >= dataInicio && dataVisita <= dataFim;
  });
  
  relatoriosCompletos = relatoriosCompletos.filter((r: any) => {
    const dataVisita = new Date(r.dataVisita);
    return dataVisita >= dataInicio && dataVisita <= dataFim;
  });

  // Preparar dados dos relatórios para análise
  const todosRelatorios: RelatorioAnalise[] = [
    ...relatoriosLivres.map((r: any) => ({
      lojaId: r.lojaId,
      lojaNome: r.loja?.nome || "Loja desconhecida",
      dataVisita: new Date(r.dataVisita),
      tipo: "livre" as const,
      conteudo: r.descricao || "",
      pontosPositivosRelatorio: r.pontosPositivosDestacar,
      pontosNegativosRelatorio: r.pontosNegativosDestacar,
    })),
    ...relatoriosCompletos.map((r: any) => ({
      lojaId: r.lojaId,
      lojaNome: r.loja?.nome || "Loja desconhecida",
      dataVisita: new Date(r.dataVisita),
      tipo: "completo" as const,
      conteudo: `EPIs: ${r.episFardamento || "N/A"}, Kit 1ºs Socorros: ${r.kitPrimeirosSocorros || "N/A"}, Consumíveis: ${r.consumiveis || "N/A"}, Espaço Físico: ${r.espacoFisico || "N/A"}, Reclamações: ${r.reclamacoes || "N/A"}, Vendas Complementares: ${r.vendasComplementares || "N/A"}, Fichas de Serviço: ${r.fichasServico || "N/A"}, Documentação: ${r.documentacaoObrigatoria || "N/A"}, Reunião Quinzenal: ${r.reuniaoQuinzenal || "N/A"}, Resumo: ${r.resumoColaboradores || "N/A"}`,
      pontosPositivosRelatorio: r.pontosPositivosDestacar,
      pontosNegativosRelatorio: r.pontosNegativosDestacar,
    })),
  ];

  // Calcular frequência de visitas
  const frequenciaVisitas: { [loja: string]: number } = {};
  todosRelatorios.forEach((r) => {
    frequenciaVisitas[r.lojaNome] = (frequenciaVisitas[r.lojaNome] || 0) + 1;
  });

  const lojasOrdenadas = Object.entries(frequenciaVisitas).sort((a, b) => b[1] - a[1]);
  const lojaMaisVisitada = lojasOrdenadas.length > 0
    ? { nome: lojasOrdenadas[0][0], visitas: lojasOrdenadas[0][1] }
    : null;
  const lojaMenosVisitada = lojasOrdenadas.length > 0
    ? { nome: lojasOrdenadas[lojasOrdenadas.length - 1][0], visitas: lojasOrdenadas[lojasOrdenadas.length - 1][1] }
    : null;

  // Extrair pontos positivos e negativos
  const pontosPositivosRelatados: string[] = [];
  const pontosNegativosRelatados: string[] = [];
  
  relatoriosCompletos.forEach((r: any) => {
    if (r.pontosPositivosDestacar && r.pontosPositivosDestacar.trim()) {
      pontosPositivosRelatados.push(`[${r.loja?.nome || 'Loja'}] ${r.pontosPositivosDestacar}`);
    }
    if (r.pontosNegativosDestacar && r.pontosNegativosDestacar.trim()) {
      pontosNegativosRelatados.push(`[${r.loja?.nome || 'Loja'}] ${r.pontosNegativosDestacar}`);
    }
  });

  // Calcular relatórios por loja
  const relatoriosPorLojaMap = new Map<number, { lojaId: number; lojaNome: string; livres: number; completos: number }>();
  
  relatoriosLivres.forEach((r: any) => {
    const existing = relatoriosPorLojaMap.get(r.lojaId);
    if (existing) {
      existing.livres++;
    } else {
      relatoriosPorLojaMap.set(r.lojaId, {
        lojaId: r.lojaId,
        lojaNome: r.loja?.nome || 'Loja desconhecida',
        livres: 1,
        completos: 0
      });
    }
  });
  
  relatoriosCompletos.forEach((r: any) => {
    const existing = relatoriosPorLojaMap.get(r.lojaId);
    if (existing) {
      existing.completos++;
    } else {
      relatoriosPorLojaMap.set(r.lojaId, {
        lojaId: r.lojaId,
        lojaNome: r.loja?.nome || 'Loja desconhecida',
        livres: 0,
        completos: 1
      });
    }
  });

  const relatoriosPorLoja = Array.from(relatoriosPorLojaMap.values())
    .map(l => ({
      lojaId: l.lojaId,
      lojaNome: l.lojaNome,
      totalRelatorios: l.livres + l.completos,
      relatoriosLivres: l.livres,
      relatoriosCompletos: l.completos
    }))
    .sort((a, b) => b.totalRelatorios - a.totalRelatorios);

  // ========== BUSCAR DADOS AVANÇADOS ==========
  let dadosAvancados: any = null;
  let rankingLojas: any[] = [];
  let comparacaoLojas: any = null;
  let statsResultados: any = null;
  
  try {
    // Buscar e agregar dados de todos os meses selecionados
    let somaServicos = 0;
    let somaObjetivos = 0;
    let somaReparacoes = 0;
    let contLojas = 0;
    let somaDesvio = 0;
    let somaTaxaReparacao = 0;
    let lojasAcimaObjetivo = 0;
    
    const lojaAgregado = new Map<number, {
      lojaId: number;
      lojaNome: string;
      zona: string | null;
      totalServicos: number;
      objetivoMensal: number;
      taxaReparacao: number;
      mesesContados: number;
    }>();
    
    for (const { mes, ano } of mesesSelecionados) {
      const dadosMes = await db.getDadosAnaliseAvancada(mes, ano, lojasIds);
      const rankingMes = await db.getRankingLojas('totalServicos', mes, ano, 100, lojasIds) || [];
      
      if (dadosMes?.estatisticas) {
        const stats = dadosMes.estatisticas;
        somaServicos += stats.somaServicos || 0;
        somaObjetivos += stats.somaObjetivos || 0;
        somaReparacoes += stats.somaReparacoes || 0;
        if (stats.totalLojas > 0) {
          contLojas += stats.totalLojas;
          somaDesvio += (stats.mediaDesvioPercentual || 0) * stats.totalLojas;
          somaTaxaReparacao += (stats.mediaTaxaReparacao || 0) * stats.totalLojas;
          lojasAcimaObjetivo += stats.lojasAcimaObjetivo || 0;
        }
      }
      
      for (const loja of rankingMes) {
        const existing = lojaAgregado.get(loja.lojaId);
        if (existing) {
          existing.totalServicos += loja.totalServicos || 0;
          existing.objetivoMensal += loja.objetivoMensal || 0;
          existing.mesesContados++;
        } else {
          lojaAgregado.set(loja.lojaId, {
            lojaId: loja.lojaId,
            lojaNome: loja.lojaNome,
            zona: loja.zona,
            totalServicos: loja.totalServicos || 0,
            objetivoMensal: loja.objetivoMensal || 0,
            taxaReparacao: loja.taxaReparacao || 0,
            mesesContados: 1,
          });
        }
      }
    }
    
    const totalLojasUnicas = lojaAgregado.size;
    statsResultados = {
      totalLojas: totalLojasUnicas,
      somaServicos,
      somaObjetivos,
      mediaDesvioPercentual: contLojas > 0 ? somaDesvio / contLojas : 0,
      mediaTaxaReparacao: contLojas > 0 ? somaTaxaReparacao / contLojas : 0,
      somaReparacoes,
      lojasAcimaObjetivo: Math.round(lojasAcimaObjetivo / mesesSelecionados.length),
    };
    
    rankingLojas = Array.from(lojaAgregado.values()).map(loja => {
      const desvio = loja.objetivoMensal > 0 
        ? (loja.totalServicos - loja.objetivoMensal) / loja.objetivoMensal 
        : 0;
      return {
        lojaId: loja.lojaId,
        lojaNome: loja.lojaNome,
        zona: loja.zona,
        totalServicos: loja.totalServicos,
        objetivoMensal: loja.objetivoMensal,
        desvioPercentualMes: desvio,
        taxaReparacao: loja.taxaReparacao,
        valor: loja.totalServicos,
      };
    }).sort((a, b) => b.totalServicos - a.totalServicos);
    
    // Buscar dados avançados do primeiro mês
    const primeiroMes = mesesSelecionados[0];
    dadosAvancados = await db.getDadosAnaliseAvancada(primeiroMes.mes, primeiroMes.ano, lojasIds);
    if (dadosAvancados) {
      dadosAvancados.estatisticas = statsResultados;
    }
    
    // Calcular comparação de lojas
    if (rankingLojas.length > 0) {
      comparacaoLojas = {
        melhorLoja: rankingLojas[0],
        piorLoja: rankingLojas[rankingLojas.length - 1],
        maiorEvolucao: null,
        menorEvolucao: null,
        totalLojas: rankingLojas.length,
        lojasAcimaMedia: rankingLojas.filter((l: any) => (l.desvioPercentualMes || 0) >= 0).length,
      };
    }
  } catch (error) {
    console.log('[RelatoriosIA] Erro ao buscar dados avançados:', error);
  }

  // ========== PREPARAR TEXTO PARA IA ==========
  const relatoriosTexto = todosRelatorios
    .slice(0, 30) // Limitar para não exceder contexto
    .map((r) => `[${r.dataVisita.toLocaleDateString("pt-PT")}] ${r.lojaNome} (${r.tipo}):\n${r.conteudo}`)
    .join("\n\n");

  const pontosDestacadosTexto = `
PONTOS POSITIVOS DESTACADOS PELOS GESTORES:
${pontosPositivosRelatados.length > 0 ? pontosPositivosRelatados.join('\n') : 'Nenhum ponto positivo registado neste período.'}

PONTOS NEGATIVOS DESTACADOS PELOS GESTORES:
${pontosNegativosRelatados.length > 0 ? pontosNegativosRelatados.join('\n') : 'Nenhum ponto negativo registado neste período.'}
`;

  // Preparar resumo de relatórios por loja
  const resumoRelatoriosPorLoja = relatoriosPorLoja.length > 0
    ? `\n═══ RELATÓRIOS POR LOJA ═══\n${relatoriosPorLoja.slice(0, 20).map(l => 
        `• ${l.lojaNome}: ${l.totalRelatorios} total (${l.relatoriosLivres} livres, ${l.relatoriosCompletos} completos)`
      ).join('\n')}`
    : '';

  // Preparar dados avançados
  let dadosAvancadosTexto = '';
  
  if (statsResultados) {
    const { somaServicos, somaObjetivos, mediaDesvioPercentual, mediaTaxaReparacao, lojasAcimaObjetivo, totalLojas } = statsResultados;
    const taxaCumprimento = totalLojas > 0 ? ((lojasAcimaObjetivo || 0) / totalLojas * 100).toFixed(1) : '0';
    const lojasAbaixoObjetivo = (totalLojas || 0) - (lojasAcimaObjetivo || 0);
    
    dadosAvancadosTexto = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ANÁLISE DO PERÍODO: ${labelMeses.toUpperCase()}                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══ RESUMO DE RELATÓRIOS ═══
• Total de Relatórios: ${todosRelatorios.length}
• Relatórios Livres: ${relatoriosLivres.length}
• Relatórios Completos: ${relatoriosCompletos.length}
• Lojas com Relatórios: ${relatoriosPorLoja.length}
${resumoRelatoriosPorLoja}

═══ MÉTRICAS DE SERVIÇOS (se disponíveis) ═══
• Total de Serviços: ${somaServicos || 'N/A'}
• Objetivo Total: ${somaObjetivos || 'N/A'}
• Desvio Médio: ${mediaDesvioPercentual ? `${(mediaDesvioPercentual * 100).toFixed(2)}%` : 'N/A'}
• Taxa de Reparação Média: ${mediaTaxaReparacao ? `${(mediaTaxaReparacao * 100).toFixed(2)}%` : 'N/A'}
• Lojas Acima do Objetivo: ${lojasAcimaObjetivo || 0} (${taxaCumprimento}%)
• Lojas Abaixo do Objetivo: ${lojasAbaixoObjetivo}
`;

    // Rankings se disponíveis
    if (dadosAvancados?.rankings?.cumprimentoObjetivo) {
      dadosAvancadosTexto += `
═══ TOP 5 - MELHOR CUMPRIMENTO DE OBJETIVO ═══
`;
      dadosAvancados.rankings.cumprimentoObjetivo.top5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Desvio: ${l.desvioPercentualMes >= 0 ? '+' : ''}${(l.desvioPercentualMes * 100).toFixed(2)}% | Serviços: ${l.totalServicos}/${l.objetivoMensal}\n`;
      });
      
      dadosAvancadosTexto += `
═══ BOTTOM 5 - PIOR CUMPRIMENTO DE OBJETIVO ═══
`;
      dadosAvancados.rankings.cumprimentoObjetivo.bottom5.forEach((l: any, i: number) => {
        dadosAvancadosTexto += `${i + 1}. ${l.lojaNome} - Desvio: ${l.desvioPercentualMes >= 0 ? '+' : ''}${(l.desvioPercentualMes * 100).toFixed(2)}% | Serviços: ${l.totalServicos}/${l.objetivoMensal}\n`;
      });
    }

    // Análise por zona
    if (dadosAvancados?.analiseZonas && dadosAvancados.analiseZonas.length > 0) {
      dadosAvancadosTexto += `
═══ ANÁLISE POR ZONA ═══
`;
      dadosAvancados.analiseZonas.forEach((z: any) => {
        dadosAvancadosTexto += `
▸ ${z.zona}
  • Lojas: ${z.totalLojas} | Acima Obj: ${z.lojasAcimaObjetivo} (${z.taxaCumprimento.toFixed(1)}%)
  • Serviços: ${z.somaServicos}/${z.somaObjetivos}
  • Melhor: ${z.melhorLoja} | Pior: ${z.piorLoja}
`;
      });
    }
  }

  // ========== PROMPT PARA IA ==========
  const prompt = `És um ANALISTA DE DADOS SÉNIOR especializado em supervisão de redes de retalho automóvel.
Analisa os dados de supervisão da rede Express Glass para o período: ${labelMeses}.

${dadosAvancadosTexto}

CONTEÚDO DOS RELATÓRIOS DE SUPERVISÃO:
${relatoriosTexto || 'Sem relatórios de supervisão disponíveis neste período.'}

${pontosDestacadosTexto}

═══════════════════════════════════════════════════════════════════════════════
                           INSTRUÇÕES DE ANÁLISE
═══════════════════════════════════════════════════════════════════════════════

Produz uma ANÁLISE EXECUTIVA PROFISSIONAL baseada nos relatórios de supervisão:

1. RESUMO EXECUTIVO: Parágrafo de 3-4 frases com visão geral do período analisado
2. PONTOS POSITIVOS: Aspetos positivos identificados nos relatórios (mínimo 3)
3. PONTOS NEGATIVOS: Problemas ou áreas de melhoria identificados (mínimo 3)
4. ANÁLISE DOS PONTOS DESTACADOS: Análise dos pontos positivos e negativos reportados pelos gestores
5. TENDÊNCIAS: Padrões observados nos relatórios
6. SUGESTÕES: Recomendações práticas baseadas na análise (mínimo 5)
7. LOJAS EM DESTAQUE: Lojas com bom desempenho
8. LOJAS QUE PRECISAM ATENÇÃO: Lojas que necessitam de acompanhamento

Responde em formato JSON válido.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `És um analista de dados sénior especializado em redes de retalho automóvel.
A tua análise deve ser:
- BASEADA NOS RELATÓRIOS: usar informação concreta dos relatórios de supervisão
- PROFISSIONAL: tom executivo e orientado para ação
- ESPECÍFICA: evitar generalizações, citar exemplos concretos
- ACIONÁVEL: cada insight deve ter uma ação associada

Respondes sempre em português europeu e em formato JSON válido.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analise_relatorios",
          strict: true,
          schema: {
            type: "object",
            properties: {
              pontosPositivos: { type: "array", items: { type: "string" } },
              pontosNegativos: { type: "array", items: { type: "string" } },
              sugestoes: { type: "array", items: { type: "string" } },
              resumo: { type: "string" },
              analisePontosDestacados: {
                type: "object",
                properties: {
                  positivos: { type: "array", items: { type: "string" } },
                  negativos: { type: "array", items: { type: "string" } },
                  tendencias: { type: "string" },
                },
                required: ["positivos", "negativos", "tendencias"],
                additionalProperties: false,
              },
              analiseResultados: {
                type: "object",
                properties: {
                  resumoPerformance: { type: "string" },
                  lojasDestaque: { type: "array", items: { type: "string" } },
                  lojasAtencao: { type: "array", items: { type: "string" } },
                  tendenciasServicos: { type: "string" },
                  recomendacoes: { type: "array", items: { type: "string" } },
                },
                required: ["resumoPerformance", "lojasDestaque", "lojasAtencao", "tendenciasServicos", "recomendacoes"],
                additionalProperties: false,
              },
              insightsIA: {
                type: "object",
                properties: {
                  resumoExecutivo: { type: "string" },
                  analisePerformance: { type: "string" },
                  analiseVendasComplementares: { type: "string" },
                  analiseTendencias: { type: "string" },
                  recomendacoesEstrategicas: { type: "array", items: { type: "string" } },
                  alertasCriticos: { type: "array", items: { type: "string" } },
                },
                required: ["resumoExecutivo", "analisePerformance", "analiseVendasComplementares", "analiseTendencias", "recomendacoesEstrategicas", "alertasCriticos"],
                additionalProperties: false,
              },
            },
            required: ["pontosPositivos", "pontosNegativos", "sugestoes", "resumo", "analisePontosDestacados", "analiseResultados", "insightsIA"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analise = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

    // Calcular dados para gráficos
    const mediaServicos = rankingLojas.length > 0 
      ? rankingLojas.reduce((sum: number, l: any) => sum + (l.totalServicos || 0), 0) / rankingLojas.length 
      : 0;
    const mediaTaxaReparacao = rankingLojas.length > 0 
      ? rankingLojas.reduce((sum: number, l: any) => sum + (l.taxaReparacao || 0), 0) / rankingLojas.length 
      : 0;
    
    const comparacaoLojasFormatada = comparacaoLojas ? {
      melhorLoja: comparacaoLojas.melhorLoja ? {
        nome: comparacaoLojas.melhorLoja.lojaNome,
        servicos: comparacaoLojas.melhorLoja.totalServicos,
        desvio: comparacaoLojas.melhorLoja.desvioPercentualMes || 0,
        taxaReparacao: comparacaoLojas.melhorLoja.taxaReparacao || 0,
        objetivo: comparacaoLojas.melhorLoja.objetivoMensal || 0,
      } : null,
      piorLoja: comparacaoLojas.piorLoja ? {
        nome: comparacaoLojas.piorLoja.lojaNome,
        servicos: comparacaoLojas.piorLoja.totalServicos,
        desvio: comparacaoLojas.piorLoja.desvioPercentualMes || 0,
        taxaReparacao: comparacaoLojas.piorLoja.taxaReparacao || 0,
        objetivo: comparacaoLojas.piorLoja.objetivoMensal || 0,
      } : null,
      maiorEvolucao: null,
      menorEvolucao: null,
      totalLojas: comparacaoLojas.totalLojas || 0,
      lojasAcimaMedia: comparacaoLojas.lojasAcimaMedia || 0,
      lojasAbaixoMedia: (comparacaoLojas.totalLojas || 0) - (comparacaoLojas.lojasAcimaMedia || 0),
      mediaServicos: Math.round(mediaServicos),
      mediaTaxaReparacao: parseFloat(mediaTaxaReparacao.toFixed(4)),
    } : undefined;

    // Distribuição de desvios
    const distribuicaoDesvios: Array<{ faixa: string; count: number }> = [];
    if (rankingLojas.length > 0) {
      const faixas = [
        { min: -Infinity, max: -20, label: '< -20%' },
        { min: -20, max: -10, label: '-20% a -10%' },
        { min: -10, max: 0, label: '-10% a 0%' },
        { min: 0, max: 10, label: '0% a +10%' },
        { min: 10, max: 20, label: '+10% a +20%' },
        { min: 20, max: Infinity, label: '> +20%' },
      ];
      faixas.forEach(faixa => {
        const count = rankingLojas.filter((l: any) => {
          const desvio = (l.desvioPercentualMes || 0) * 100;
          return desvio > faixa.min && desvio <= faixa.max;
        }).length;
        distribuicaoDesvios.push({ faixa: faixa.label, count });
      });
    }

    const dadosGraficos = rankingLojas.length > 0 ? {
      rankingServicos: rankingLojas.map((l: any) => ({
        lojaId: l.lojaId,
        loja: l.lojaNome,
        zona: l.zona || null,
        servicos: l.totalServicos,
        desvio: l.desvioPercentualMes || 0,
        objetivo: l.objetivoMensal || 0,
        taxaReparacao: l.taxaReparacao || 0,
      })),
      evolucaoMensal: [] as Array<{ mes: string; servicos: number; objetivo: number }>,
      distribuicaoDesvios: distribuicaoDesvios,
    } : undefined;

    // Formatar rankings detalhados
    const rankingsDetalhados = dadosAvancados?.rankings ? {
      taxaReparacao: {
        top5: dadosAvancados.rankings.taxaReparacao?.top5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
        bottom5: dadosAvancados.rankings.taxaReparacao?.bottom5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
      },
      cumprimentoObjetivo: {
        top5: dadosAvancados.rankings.cumprimentoObjetivo?.top5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
        bottom5: dadosAvancados.rankings.cumprimentoObjetivo?.bottom5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
      },
      vendasComplementares: {
        top5: dadosAvancados.rankings.vendasComplementares?.top5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
        bottom5: dadosAvancados.rankings.vendasComplementares?.bottom5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
      },
      crescimento: {
        top5: dadosAvancados.rankings.crescimento?.top5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
        bottom5: dadosAvancados.rankings.crescimento?.bottom5?.map((l: any, i: number) => ({ posicao: i + 1, ...l })) || [],
      },
    } : undefined;

    return {
      lojaMaisVisitada,
      lojaMenosVisitada,
      frequenciaVisitas,
      pontosPositivos: analise.pontosPositivos,
      pontosNegativos: analise.pontosNegativos,
      sugestoes: analise.sugestoes,
      resumo: analise.resumo,
      analisePontosDestacados: analise.analisePontosDestacados,
      analiseResultados: analise.analiseResultados,
      comparacaoLojas: comparacaoLojasFormatada,
      dadosGraficos,
      rankingsDetalhados,
      analiseZonasDetalhada: dadosAvancados?.analiseZonas || [],
      estatisticasComplementares: dadosAvancados?.estatisticasComplementares || undefined,
      insightsIA: analise.insightsIA,
      relatoriosPorLoja,
      resumoConteudoRelatorios: `Período: ${labelMeses}. Total de ${todosRelatorios.length} relatórios analisados (${relatoriosLivres.length} livres, ${relatoriosCompletos.length} completos) de ${relatoriosPorLoja.length} lojas.`,
    };
  } catch (error) {
    console.error("Erro ao gerar análise com IA:", error);
    
    // Retornar dados básicos mesmo sem IA
    return {
      lojaMaisVisitada,
      lojaMenosVisitada,
      frequenciaVisitas,
      pontosPositivos: pontosPositivosRelatados.slice(0, 5),
      pontosNegativos: pontosNegativosRelatados.slice(0, 5),
      sugestoes: [
        "Analise os pontos negativos recorrentes para identificar padrões",
        "Priorize visitas às lojas com menos acompanhamento",
        "Documente as boas práticas das lojas com melhor desempenho",
        "Verifique lojas sem relatórios no período",
        "Compare a evolução entre meses"
      ],
      resumo: `Período: ${labelMeses}. Total de ${todosRelatorios.length} relatórios analisados (${relatoriosLivres.length} livres, ${relatoriosCompletos.length} completos).`,
      analisePontosDestacados: {
        positivos: pontosPositivosRelatados.slice(0, 5),
        negativos: pontosNegativosRelatados.slice(0, 5),
        tendencias: pontosNegativosRelatados.length > pontosPositivosRelatados.length 
          ? "Tendência negativa - mais pontos negativos que positivos no período"
          : "Tendência positiva - mais pontos positivos que negativos no período"
      },
      analiseResultados: {
        resumoPerformance: `Foram realizados ${todosRelatorios.length} relatórios de supervisão no período selecionado.`,
        lojasDestaque: relatoriosPorLoja.slice(0, 3).map(l => `${l.lojaNome} (${l.totalRelatorios} relatórios)`),
        lojasAtencao: relatoriosPorLoja.filter(l => l.totalRelatorios === 0).slice(0, 3).map(l => l.lojaNome),
        tendenciasServicos: "Análise de tendências requer mais dados.",
        recomendacoes: ["Aumentar frequência de visitas às lojas com menos relatórios"],
      },
      relatoriosPorLoja,
      resumoConteudoRelatorios: `Período: ${labelMeses}. Total de ${todosRelatorios.length} relatórios.`,
    };
  }
}


// ============================================================================
// FUNÇÕES ESPECÍFICAS PARA RELATÓRIOS IA DE GESTORES
// Análise qualitativa baseada nos relatórios do próprio gestor
// ============================================================================

interface RelatorioIAGestorResult {
  filtroAplicado: string;
  tipoRelatorio: 'gestor';
  resumoGeral: string;
  pontosDestacados: {
    positivos: Array<{ loja: string; descricao: string; data: string }>;
    negativos: Array<{ loja: string; descricao: string; data: string }>;
    analise: string;
  };
  pendentes: {
    criados: Array<{ loja: string; descricao: string; data: string }>;
    resolvidos: Array<{ loja: string; descricao: string; dataResolucao: string }>;
    ativos: number;
    analise: string;
  };
  relatorios: {
    totalLivres: number;
    totalCompletos: number;
    lojasVisitadas: string[];
    resumoConteudo: string;
  };
  sugestoesGestor: string[];
  mensagemMotivacional: string;
}

/**
 * Gera relatório IA específico para gestores
 * Foca em análise qualitativa dos seus próprios relatórios, pontos destacados e pendentes
 * NÃO inclui estatísticas numéricas do país
 */
export async function gerarRelatorioIAGestor(
  periodo: string,
  gestorId: number,
  dataInicio?: Date,
  dataFim?: Date
): Promise<RelatorioIAGestorResult> {
  // Calcular datas se não fornecidas
  const inicio = dataInicio || calcularDataInicio(periodo);
  const fim = dataFim || calcularDataFim(periodo);
  
  // Buscar relatórios do gestor
  const relatoriosLivres = await db.getRelatoriosLivresByGestorId(gestorId);
  const relatoriosCompletos = await db.getRelatoriosCompletosByGestorId(gestorId);
  
  // Filtrar por período
  const livresFiltrados = relatoriosLivres.filter((r: any) => {
    const dataVisita = new Date(r.dataVisita);
    return dataVisita >= inicio && dataVisita <= fim;
  });
  
  const completosFiltrados = relatoriosCompletos.filter((r: any) => {
    const dataVisita = new Date(r.dataVisita);
    return dataVisita >= inicio && dataVisita <= fim;
  });
  
  // Buscar pendentes do gestor
  const todosPendentes = await db.getPendentesByGestorId(gestorId);
  
  // Pendentes criados no período
  const pendentesCriados = todosPendentes.filter((p: any) => {
    const dataCriacao = new Date(p.createdAt);
    return dataCriacao >= inicio && dataCriacao <= fim;
  });
  
  // Pendentes resolvidos no período
  const pendentesResolvidos = todosPendentes.filter((p: any) => {
    if (!p.resolvido || !p.dataResolucao) return false;
    const dataResolucao = new Date(p.dataResolucao);
    return dataResolucao >= inicio && dataResolucao <= fim;
  });
  
  // Pendentes ativos (não resolvidos)
  const pendentesAtivos = todosPendentes.filter((p: any) => !p.resolvido).length;
  
  // Extrair pontos destacados dos relatórios
  const pontosPositivos: Array<{ loja: string; descricao: string; data: string }> = [];
  const pontosNegativos: Array<{ loja: string; descricao: string; data: string }> = [];
  
  // Dos relatórios livres - usar descrição como conteúdo geral (não têm campos de pontos separados)
  // Os relatórios livres são adicionados como informação geral para análise
  livresFiltrados.forEach((r: any) => {
    // Relatórios livres não têm campos separados de pontos positivos/negativos
    // A descrição contém toda a informação da visita
    if (r.descricao && r.descricao.trim()) {
      // Adicionar como ponto geral para análise pela IA
      // A IA irá analisar o conteúdo e identificar pontos relevantes
    }
  });
  
  // Dos relatórios completos - usar campos pontosPositivos e pontosNegativos
  completosFiltrados.forEach((r: any) => {
    if (r.pontosPositivos && r.pontosPositivos.trim()) {
      pontosPositivos.push({
        loja: r.loja?.nome || 'Loja desconhecida',
        descricao: r.pontosPositivos,
        data: new Date(r.dataVisita).toLocaleDateString('pt-PT')
      });
    }
    if (r.pontosNegativos && r.pontosNegativos.trim()) {
      pontosNegativos.push({
        loja: r.loja?.nome || 'Loja desconhecida',
        descricao: r.pontosNegativos,
        data: new Date(r.dataVisita).toLocaleDateString('pt-PT')
      });
    }
  });
  
  // Lojas visitadas
  const lojasVisitadas = new Set<string>();
  livresFiltrados.forEach((r: any) => lojasVisitadas.add(r.loja?.nome || 'Desconhecida'));
  completosFiltrados.forEach((r: any) => lojasVisitadas.add(r.loja?.nome || 'Desconhecida'));
  
  // Preparar dados para análise IA
  const dadosParaIA = {
    periodo,
    totalRelatoriosLivres: livresFiltrados.length,
    totalRelatoriosCompletos: completosFiltrados.length,
    lojasVisitadas: Array.from(lojasVisitadas),
    pontosPositivos: pontosPositivos.map(p => `${p.loja}: ${p.descricao}`),
    pontosNegativos: pontosNegativos.map(p => `${p.loja}: ${p.descricao}`),
    pendentesCriados: pendentesCriados.length,
    pendentesResolvidos: pendentesResolvidos.length,
    pendentesAtivos,
    resumoRelatorios: livresFiltrados.slice(0, 5).map((r: any) => ({
      loja: r.loja?.nome,
      descricao: r.descricao?.substring(0, 200)
    }))
  };
  
  // Chamar IA para análise qualitativa
  let analiseIA = {
    resumoGeral: '',
    analisePontosDestacados: '',
    analisePendentes: '',
    sugestoesGestor: [] as string[],
    mensagemMotivacional: ''
  };
  
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `És um assistente de gestão para supervisores de lojas Express Glass.
Analisa os dados do gestor e fornece feedback qualitativo e construtivo.
Responde SEMPRE em português europeu.
Sê específico, menciona lojas e situações concretas quando possível.
O tom deve ser profissional mas motivador.`
        },
        {
          role: "user",
          content: `Analisa os seguintes dados do gestor no período ${periodo}:

RELATÓRIOS SUBMETIDOS:
- Relatórios Livres: ${dadosParaIA.totalRelatoriosLivres}
- Relatórios Completos: ${dadosParaIA.totalRelatoriosCompletos}
- Lojas visitadas: ${dadosParaIA.lojasVisitadas.join(', ') || 'Nenhuma'}

PONTOS POSITIVOS DESTACADOS:
${dadosParaIA.pontosPositivos.length > 0 ? dadosParaIA.pontosPositivos.join('\n') : 'Nenhum ponto positivo registado'}

PONTOS NEGATIVOS DESTACADOS:
${dadosParaIA.pontosNegativos.length > 0 ? dadosParaIA.pontosNegativos.join('\n') : 'Nenhum ponto negativo registado'}

PENDENTES:
- Criados no período: ${dadosParaIA.pendentesCriados}
- Resolvidos no período: ${dadosParaIA.pendentesResolvidos}
- Ativos (total): ${dadosParaIA.pendentesAtivos}

Fornece uma análise em formato JSON com:
{
  "resumoGeral": "Resumo geral do trabalho do gestor no período (2-3 frases)",
  "analisePontosDestacados": "Análise dos pontos positivos e negativos registados (2-3 frases)",
  "analisePendentes": "Análise da gestão de pendentes (2-3 frases)",
  "sugestoesGestor": ["Sugestão 1", "Sugestão 2", "Sugestão 3"],
  "mensagemMotivacional": "Mensagem motivacional personalizada (1-2 frases)"
}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analise_gestor",
          strict: true,
          schema: {
            type: "object",
            properties: {
              resumoGeral: { type: "string" },
              analisePontosDestacados: { type: "string" },
              analisePendentes: { type: "string" },
              sugestoesGestor: { type: "array", items: { type: "string" } },
              mensagemMotivacional: { type: "string" }
            },
            required: ["resumoGeral", "analisePontosDestacados", "analisePendentes", "sugestoesGestor", "mensagemMotivacional"],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === 'string') {
      analiseIA = JSON.parse(content);
    }
  } catch (error) {
    console.error('Erro ao gerar análise IA para gestor:', error);
    // Fallback com análise básica
    analiseIA = {
      resumoGeral: `No período selecionado, foram submetidos ${livresFiltrados.length} relatórios livres e ${completosFiltrados.length} relatórios completos, visitando ${lojasVisitadas.size} lojas.`,
      analisePontosDestacados: pontosPositivos.length > pontosNegativos.length 
        ? 'Foram registados mais pontos positivos que negativos, indicando uma tendência positiva.'
        : 'Foram identificados alguns pontos de melhoria que merecem atenção.',
      analisePendentes: pendentesResolvidos.length >= pendentesCriados.length
        ? 'Boa gestão de pendentes - foram resolvidos tantos ou mais pendentes do que os criados.'
        : 'Existem pendentes acumulados que devem ser priorizados.',
      sugestoesGestor: [
        'Continue a documentar os pontos positivos e negativos em cada visita',
        'Priorize a resolução dos pendentes mais antigos',
        'Mantenha uma frequência regular de visitas a todas as lojas'
      ],
      mensagemMotivacional: 'O seu trabalho de supervisão é fundamental para o sucesso da rede. Continue assim!'
    };
  }
  
  // Formatar pendentes para resposta
  const pendentesCriadosFormatados = pendentesCriados.map((p: any) => ({
    loja: p.loja?.nome || 'Desconhecida',
    descricao: p.descricao || '',
    data: new Date(p.createdAt).toLocaleDateString('pt-PT')
  }));
  
  const pendentesResolvidosFormatados = pendentesResolvidos.map((p: any) => ({
    loja: p.loja?.nome || 'Desconhecida',
    descricao: p.descricao || '',
    dataResolucao: new Date(p.dataResolucao).toLocaleDateString('pt-PT')
  }));
  
  return {
    filtroAplicado: 'Minhas Lojas',
    tipoRelatorio: 'gestor',
    resumoGeral: analiseIA.resumoGeral,
    pontosDestacados: {
      positivos: pontosPositivos,
      negativos: pontosNegativos,
      analise: analiseIA.analisePontosDestacados
    },
    pendentes: {
      criados: pendentesCriadosFormatados,
      resolvidos: pendentesResolvidosFormatados,
      ativos: pendentesAtivos,
      analise: analiseIA.analisePendentes
    },
    relatorios: {
      totalLivres: livresFiltrados.length,
      totalCompletos: completosFiltrados.length,
      lojasVisitadas: Array.from(lojasVisitadas),
      resumoConteudo: `${livresFiltrados.length + completosFiltrados.length} relatórios submetidos no período`
    },
    sugestoesGestor: analiseIA.sugestoesGestor,
    mensagemMotivacional: analiseIA.mensagemMotivacional
  };
}

/**
 * Gera relatório IA para gestor com múltiplos meses selecionados
 */
export async function gerarRelatorioIAGestorMultiplosMeses(
  mesesSelecionados: MesSelecionado[],
  gestorId: number
): Promise<RelatorioIAGestorResult> {
  const { dataInicio, dataFim } = calcularPeriodoMultiplosMeses(mesesSelecionados);
  
  // Gerar label para o período
  const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const labelMeses = mesesSelecionados.map(m => `${NOMES_MESES[m.mes - 1]} ${m.ano}`).join(", ");
  
  return gerarRelatorioIAGestor(labelMeses, gestorId, dataInicio, dataFim);
}
