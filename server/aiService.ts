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
    rankingServicos: Array<{ loja: string; servicos: number; desvio: number; objetivo?: number; taxaReparacao?: number }>;
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
}

/**
 * Gera relatório automático com análise de IA - VERSÃO AVANÇADA v6.5
 * @param periodo - Período de análise
 * @param gestorId - ID do gestor (opcional, para filtrar por gestor)
 * @param lojasIds - IDs das lojas a incluir (opcional, para filtrar por zona ou gestor)
 */
export async function gerarRelatorioComIA(
  periodo: "diario" | "semanal" | "mensal" | "mes_anterior" | "mes_atual" | "trimestre_anterior" | "semestre_anterior" | "ano_anterior" | "trimestral" | "semestral" | "anual",
  gestorId?: number,
  lojasIds?: number[]
): Promise<AnaliseIA> {
  // Buscar relatórios do período
  const dataInicio = calcularDataInicio(periodo);
  const dataFim = calcularDataFim(periodo);
  
  let relatoriosLivres: any[];
  let relatoriosCompletos: any[];
  
  if (gestorId) {
    relatoriosLivres = await db.getRelatoriosLivresByGestorId(gestorId);
    relatoriosCompletos = await db.getRelatoriosCompletosByGestorId(gestorId);
  } else {
    relatoriosLivres = await db.getAllRelatoriosLivres();
    relatoriosCompletos = await db.getAllRelatoriosCompletos();
  }
  
  if (lojasIds && lojasIds.length > 0) {
    relatoriosLivres = relatoriosLivres.filter(r => lojasIds.includes(r.lojaId));
    relatoriosCompletos = relatoriosCompletos.filter(r => lojasIds.includes(r.lojaId));
  }

  const relatoriosLivresFiltrados = relatoriosLivres.filter(
    (r) => {
      const data = new Date(r.dataVisita);
      return data >= dataInicio && data <= dataFim;
    }
  );
  const relatoriosCompletosFiltrados = relatoriosCompletos.filter(
    (r) => {
      const data = new Date(r.dataVisita);
      return data >= dataInicio && data <= dataFim;
    }
  );

  const todosRelatorios: RelatorioAnalise[] = [
    ...relatoriosLivresFiltrados.map((r: any) => ({
      lojaId: r.lojaId,
      lojaNome: r.loja?.nome || "Loja",
      dataVisita: new Date(r.dataVisita),
      tipo: "livre" as const,
      conteudo: r.descricao,
    })),
    ...relatoriosCompletosFiltrados.map((r: any) => ({
      lojaId: r.lojaId,
      lojaNome: r.loja?.nome || "Loja",
      dataVisita: new Date(r.dataVisita),
      tipo: "completo" as const,
      conteudo: `EPIs: ${r.episFardamento || "N/A"}\nKit 1ºs Socorros: ${r.kitPrimeirosSocorros || "N/A"}\nResumo: ${r.resumoSupervisao || "N/A"}`,
      pontosPositivosRelatorio: r.pontosPositivos || undefined,
      pontosNegativosRelatorio: r.pontosNegativos || undefined,
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
  let mesParaBuscar = agora.getMonth() + 1;
  let anoParaBuscar = agora.getFullYear();
  
  if (periodo === 'mes_anterior') {
    mesParaBuscar = agora.getMonth();
    if (mesParaBuscar === 0) {
      mesParaBuscar = 12;
      anoParaBuscar = agora.getFullYear() - 1;
    }
  }
  
  // Buscar dados analíticos avançados
  let dadosAvancados: any = null;
  let rankingLojas: any[] = [];
  let comparacaoLojas: any = null;
  let statsResultados: any = null;
  
  try {
    // Buscar dados avançados com todos os rankings
    dadosAvancados = await db.getDadosAnaliseAvancada(mesParaBuscar, anoParaBuscar, lojasIds);
    statsResultados = dadosAvancados?.estatisticas;
    
    // Buscar ranking completo para gráficos
    rankingLojas = await db.getRankingLojas('totalServicos', mesParaBuscar, anoParaBuscar, 100, lojasIds) || [];
    
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
      rankingServicos: rankingLojas.slice(0, 10).map((l: any) => ({
        loja: l.lojaNome,
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
  periodo: "diario" | "semanal" | "mensal" | "mes_anterior" | "mes_atual" | "trimestre_anterior" | "semestre_anterior" | "ano_anterior" | "trimestral" | "semestral" | "anual"
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
  }
}

function calcularDataFim(
  periodo: "diario" | "semanal" | "mensal" | "mes_anterior" | "mes_atual" | "trimestre_anterior" | "semestre_anterior" | "ano_anterior" | "trimestral" | "semestral" | "anual"
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
- Variada (não repetir sempre o mesmo tema)
- Em português europeu

Temas possíveis:
- Comunicação com equipas
- Acompanhamento de pendentes
- Visitas regulares às lojas
- Documentação e relatórios
- Motivação de equipas
- Resolução de problemas
- Organização do trabalho

Responde apenas com a dica, sem aspas nem formatação adicional.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "És um assistente especializado em gestão de redes de retalho. Geras dicas curtas, úteis e acionáveis.",
        },
        { role: "user", content: prompt },
      ],
    });

    const dica = response.choices[0].message.content;
    return typeof dica === 'string' ? dica.trim() : 'Mantenha o foco nas prioridades do dia.';
  } catch (error) {
    console.error("Erro ao gerar dica:", error);
    return isAdmin 
      ? 'Verifique os pendentes ativos e priorize os mais urgentes.'
      : 'Mantenha contacto regular com as suas equipas de loja.';
  }
}
