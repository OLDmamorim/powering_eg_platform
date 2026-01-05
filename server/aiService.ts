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
  };
  comparacaoLojas?: {
    melhorLoja: { nome: string; servicos: number; desvio: number } | null;
    piorLoja: { nome: string; servicos: number; desvio: number } | null;
    maiorEvolucao: { nome: string; variacao: number } | null;
    menorEvolucao: { nome: string; variacao: number } | null;
    totalLojas: number;
    lojasAcimaMedia: number;
  };
  dadosGraficos?: {
    rankingServicos: Array<{ loja: string; servicos: number; desvio: number }>;
    evolucaoMensal: Array<{ mes: string; servicos: number; objetivo: number }>;
  };
}

/**
 * Gera relatório automático com análise de IA
 * @param periodo - Período de análise
 * @param gestorId - ID do gestor (opcional, para filtrar por gestor)
 * @param lojasIds - IDs das lojas a incluir (opcional, para filtrar por zona ou gestor)
 */
export async function gerarRelatorioComIA(
  periodo: "diario" | "semanal" | "mensal" | "mes_anterior" | "trimestral" | "semestral" | "anual",
  gestorId?: number,
  lojasIds?: number[]
): Promise<AnaliseIA> {
  // Buscar relatórios do período
  const dataInicio = calcularDataInicio(periodo);
  const dataFim = calcularDataFim(periodo);
  
  let relatoriosLivres: any[];
  let relatoriosCompletos: any[];
  
  if (gestorId) {
    // Filtrar por gestor
    relatoriosLivres = await db.getRelatoriosLivresByGestorId(gestorId);
    relatoriosCompletos = await db.getRelatoriosCompletosByGestorId(gestorId);
  } else {
    // Buscar todos
    relatoriosLivres = await db.getAllRelatoriosLivres();
    relatoriosCompletos = await db.getAllRelatoriosCompletos();
  }
  
  // Se lojasIds fornecido, filtrar apenas por essas lojas
  if (lojasIds && lojasIds.length > 0) {
    relatoriosLivres = relatoriosLivres.filter(r => lojasIds.includes(r.lojaId));
    relatoriosCompletos = relatoriosCompletos.filter(r => lojasIds.includes(r.lojaId));
  }

  // Filtrar por período (dataInicio e dataFim)
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

  // Preparar dados para análise
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

  // Calcular frequência de visitas
  const frequenciaVisitas: { [loja: string]: number } = {};
  todosRelatorios.forEach((r) => {
    frequenciaVisitas[r.lojaNome] = (frequenciaVisitas[r.lojaNome] || 0) + 1;
  });

  // Encontrar loja mais e menos visitada
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

  // Coletar pontos positivos e negativos dos relatórios completos
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

  // Buscar dados de Resultados (Excel) para o período
  let dadosResultados: any[] = [];
  let statsResultados: any = null;
  let rankingLojas: any[] = [];
  let comparacaoLojas: any = null;
  try {
    const agora = new Date();
    let mesParaBuscar = agora.getMonth() + 1;
    let anoParaBuscar = agora.getFullYear();
    
    // Para mês anterior, buscar dados do mês passado
    if (periodo === 'mes_anterior') {
      mesParaBuscar = agora.getMonth(); // Mês anterior (0-indexed + 1 - 1)
      if (mesParaBuscar === 0) {
        mesParaBuscar = 12;
        anoParaBuscar = agora.getFullYear() - 1;
      }
    }
    
    // Determinar meses a buscar baseado no período
    const mesesAtras = periodo === 'diario' ? 1 : periodo === 'semanal' ? 1 : periodo === 'mensal' ? 1 : periodo === 'mes_anterior' ? 2 : periodo === 'trimestral' ? 3 : periodo === 'semestral' ? 6 : 12;
    
    if (gestorId) {
      // Buscar evolução agregada do gestor
      dadosResultados = await db.getEvolucaoAgregadaPorGestor(gestorId, mesesAtras);
    } else if (lojasIds && lojasIds.length > 0) {
      // Filtrar por lojas específicas (zona ou gestor)
      statsResultados = await db.getEstatisticasPeriodo(mesParaBuscar, anoParaBuscar, undefined, lojasIds);
      
      // Buscar ranking apenas das lojas filtradas
      try {
        rankingLojas = await db.getRankingLojas('totalServicos', mesParaBuscar, anoParaBuscar, 100, lojasIds) || [];
        
        // Buscar evolução para identificar maior/menor evolução
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
            lojasAcimaMedia: rankingLojas.filter((l: any) => l.desvioPercentualMes >= 0).length,
          };
        }
      } catch (rankingError) {
        console.log('[RelatoriosIA] Erro ao buscar ranking filtrado:', rankingError);
      }
    } else {
      // Para admin sem filtro, buscar stats globais do mês
      statsResultados = await db.getEstatisticasPeriodo(mesParaBuscar, anoParaBuscar);
      
      // Buscar ranking de lojas para comparações
      try {
        rankingLojas = await db.getRankingLojas('totalServicos', mesParaBuscar, anoParaBuscar, 100) || [];
        
        // Buscar evolução para identificar maior/menor evolução
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
            lojasAcimaMedia: rankingLojas.filter((l: any) => l.desvioPercentualMes >= 0).length,
          };
        }
      } catch (rankingError) {
        console.log('[RelatoriosIA] Erro ao buscar ranking:', rankingError);
      }
    }
  } catch (error) {
    console.log('[RelatoriosIA] Sem dados de resultados disponíveis:', error);
  }

  // Preparar prompt para IA
  const relatoriosTexto = todosRelatorios
    .map(
      (r) =>
        `[${r.dataVisita.toLocaleDateString("pt-PT")}] ${r.lojaNome} (${r.tipo}):\n${r.conteudo}`
    )
    .join("\n\n");

  // Preparar texto dos pontos destacados pelos gestores
  const pontosDestacadosTexto = `
PONTOS POSITIVOS DESTACADOS PELOS GESTORES:
${pontosPositivosRelatados.length > 0 ? pontosPositivosRelatados.join('\n') : 'Nenhum ponto positivo registado neste período.'}

PONTOS NEGATIVOS DESTACADOS PELOS GESTORES:
${pontosNegativosRelatados.length > 0 ? pontosNegativosRelatados.join('\n') : 'Nenhum ponto negativo registado neste período.'}
`;

  // Preparar texto dos dados de Resultados
  let resultadosTexto = '';
  if (dadosResultados.length > 0) {
    const ultimoMes = dadosResultados[dadosResultados.length - 1];
    const totalServicos = ultimoMes?.totalServicos || 0;
    const objetivoMensal = ultimoMes?.objetivoMensal || 0;
    const taxaReparacao = ultimoMes?.taxaReparacao || 0;
    const desvioPercentual = ultimoMes?.desvioPercentualMes || 0;
    
    resultadosTexto = `
DADOS DE PERFORMANCE (RESULTADOS DO EXCEL):
- Total de Serviços: ${totalServicos}
- Objetivo Mensal: ${objetivoMensal}
- Desvio vs Objetivo: ${desvioPercentual >= 0 ? '+' : ''}${desvioPercentual?.toFixed(1)}%
- Taxa de Reparação: ${taxaReparacao?.toFixed(1)}%
- Evolução últimos ${dadosResultados.length} meses disponível
`;
  } else if (statsResultados) {
    const { somaServicos, somaObjetivos, mediaDesvioPercentual, mediaTaxaReparacao, lojasAcimaObjetivo, totalLojas } = statsResultados;
    resultadosTexto = `
DADOS DE PERFORMANCE GLOBAL (RESULTADOS DO EXCEL):
- Total de Serviços (rede): ${somaServicos || 0}
- Objetivo Mensal (rede): ${somaObjetivos || 0}
- Desvio Médio vs Objetivo: ${mediaDesvioPercentual >= 0 ? '+' : ''}${mediaDesvioPercentual?.toFixed(1) || 0}%
- Taxa de Reparação Média: ${mediaTaxaReparacao?.toFixed(1) || 0}%
- Lojas acima do objetivo: ${lojasAcimaObjetivo || 0} de ${totalLojas || 0}
`;
    
    // Adicionar comparação de lojas se disponível
    if (comparacaoLojas) {
      resultadosTexto += `
COMPARAÇÃO DE LOJAS:
- Melhor Loja (mais serviços): ${comparacaoLojas.melhorLoja?.lojaNome || 'N/A'} - ${comparacaoLojas.melhorLoja?.totalServicos || 0} serviços (${comparacaoLojas.melhorLoja?.desvioPercentualMes >= 0 ? '+' : ''}${comparacaoLojas.melhorLoja?.desvioPercentualMes?.toFixed(1) || 0}% vs objetivo)
- Pior Loja (menos serviços): ${comparacaoLojas.piorLoja?.lojaNome || 'N/A'} - ${comparacaoLojas.piorLoja?.totalServicos || 0} serviços (${comparacaoLojas.piorLoja?.desvioPercentualMes >= 0 ? '+' : ''}${comparacaoLojas.piorLoja?.desvioPercentualMes?.toFixed(1) || 0}% vs objetivo)
- Maior Evolução: ${comparacaoLojas.maiorEvolucao?.lojaNome || 'N/A'} - ${comparacaoLojas.maiorEvolucao?.variacao ? '+' + comparacaoLojas.maiorEvolucao.variacao.toFixed(1) + '%' : 'N/A'} vs mês anterior
- Menor Evolução: ${comparacaoLojas.menorEvolucao?.lojaNome || 'N/A'} - ${comparacaoLojas.menorEvolucao?.variacao ? comparacaoLojas.menorEvolucao.variacao.toFixed(1) + '%' : 'N/A'} vs mês anterior
- Total de Lojas Analisadas: ${comparacaoLojas.totalLojas || 0}
- Lojas Acima da Média: ${comparacaoLojas.lojasAcimaMedia || 0}
`;
    }
  }

  const prompt = `Analisa os seguintes relatórios de supervisão de lojas da Express Glass do período ${periodo}:

${relatoriosTexto}

${pontosDestacadosTexto}
${resultadosTexto}

Com base nestes relatórios, pontos destacados e dados de performance, identifica:
1. 3-5 pontos positivos principais (aspetos bem executados, melhorias observadas)
2. 3-5 pontos negativos principais (problemas recorrentes, áreas de preocupação)
3. 3-5 sugestões práticas para melhorar a operação
4. Análise específica dos pontos positivos e negativos destacados pelos gestores, identificando padrões e tendências
5. Análise dos dados de performance (se disponíveis): resumo da performance, lojas em destaque, lojas que precisam atenção, tendências de serviços e recomendações

Responde em formato JSON com as seguintes chaves:
{
  "pontosPositivos": ["ponto 1", "ponto 2", ...],
  "pontosNegativos": ["ponto 1", "ponto 2", ...],
  "sugestoes": ["sugestão 1", "sugestão 2", ...],
  "resumo": "Um parágrafo resumindo a análise geral do período",
  "analisePontosDestacados": {
    "positivos": ["análise do ponto positivo 1", "análise do ponto positivo 2", ...],
    "negativos": ["análise do ponto negativo 1", "análise do ponto negativo 2", ...],
    "tendencias": "Descrição das tendências observadas nos pontos destacados pelos gestores"
  },
  "analiseResultados": {
    "resumoPerformance": "Resumo da performance geral baseada nos dados do Excel",
    "lojasDestaque": ["loja que se destacou positivamente", ...],
    "lojasAtencao": ["loja que precisa de atenção", ...],
    "tendenciasServicos": "Análise das tendências de serviços e objetivos",
    "recomendacoes": ["recomendação baseada nos dados", ...]
  }
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "És um assistente especializado em análise de relatórios de supervisão de lojas. Respondes sempre em português europeu e em formato JSON.",
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
              pontosPositivos: {
                type: "array",
                items: { type: "string" },
                description: "Lista de pontos positivos identificados",
              },
              pontosNegativos: {
                type: "array",
                items: { type: "string" },
                description: "Lista de pontos negativos identificados",
              },
              sugestoes: {
                type: "array",
                items: { type: "string" },
                description: "Lista de sugestões para melhoria",
              },
              resumo: {
                type: "string",
                description: "Resumo geral da análise",
              },
              analisePontosDestacados: {
                type: "object",
                properties: {
                  positivos: {
                    type: "array",
                    items: { type: "string" },
                    description: "Análise dos pontos positivos destacados pelos gestores",
                  },
                  negativos: {
                    type: "array",
                    items: { type: "string" },
                    description: "Análise dos pontos negativos destacados pelos gestores",
                  },
                  tendencias: {
                    type: "string",
                    description: "Tendências observadas nos pontos destacados",
                  },
                },
                required: ["positivos", "negativos", "tendencias"],
                additionalProperties: false,
              },
              analiseResultados: {
                type: "object",
                properties: {
                  resumoPerformance: {
                    type: "string",
                    description: "Resumo da performance geral baseada nos dados do Excel",
                  },
                  lojasDestaque: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lojas que se destacaram positivamente",
                  },
                  lojasAtencao: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lojas que precisam de atenção",
                  },
                  tendenciasServicos: {
                    type: "string",
                    description: "Análise das tendências de serviços e objetivos",
                  },
                  recomendacoes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recomendações baseadas nos dados de performance",
                  },
                },
                required: ["resumoPerformance", "lojasDestaque", "lojasAtencao", "tendenciasServicos", "recomendacoes"],
                additionalProperties: false,
              },
            },
            required: ["pontosPositivos", "pontosNegativos", "sugestoes", "resumo", "analisePontosDestacados", "analiseResultados"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analise = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

    // Preparar dados de comparação de lojas para gráficos
    const comparacaoLojasFormatada = comparacaoLojas ? {
      melhorLoja: comparacaoLojas.melhorLoja ? {
        nome: comparacaoLojas.melhorLoja.lojaNome,
        servicos: comparacaoLojas.melhorLoja.totalServicos,
        desvio: comparacaoLojas.melhorLoja.desvioPercentualMes || 0,
      } : null,
      piorLoja: comparacaoLojas.piorLoja ? {
        nome: comparacaoLojas.piorLoja.lojaNome,
        servicos: comparacaoLojas.piorLoja.totalServicos,
        desvio: comparacaoLojas.piorLoja.desvioPercentualMes || 0,
      } : null,
      maiorEvolucao: comparacaoLojas.maiorEvolucao ? {
        nome: comparacaoLojas.maiorEvolucao.lojaNome,
        variacao: comparacaoLojas.maiorEvolucao.variacao || 0,
      } : null,
      menorEvolucao: comparacaoLojas.menorEvolucao ? {
        nome: comparacaoLojas.menorEvolucao.lojaNome,
        variacao: comparacaoLojas.menorEvolucao.variacao || 0,
      } : null,
      totalLojas: comparacaoLojas.totalLojas || 0,
      lojasAcimaMedia: comparacaoLojas.lojasAcimaMedia || 0,
    } : undefined;
    
    // Preparar dados para gráficos
    const dadosGraficos = rankingLojas.length > 0 ? {
      rankingServicos: rankingLojas.slice(0, 10).map((l: any) => ({
        loja: l.lojaNome,
        servicos: l.totalServicos,
        desvio: l.desvioPercentualMes || 0,
      })),
      evolucaoMensal: [], // Pode ser preenchido com dados históricos se necessário
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
    };
  } catch (error) {
    console.error("Erro ao gerar análise com IA:", error);
    // Fallback sem IA
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
  periodo: "diario" | "semanal" | "mensal" | "mes_anterior" | "trimestral" | "semestral" | "anual"
): Date {
  const agora = new Date();
  switch (periodo) {
    case "diario":
      return new Date(agora.setDate(agora.getDate() - 1));
    case "semanal":
      return new Date(agora.setDate(agora.getDate() - 7));
    case "mensal":
      // Mês atual: desde o dia 1 do mês atual
      return new Date(agora.getFullYear(), agora.getMonth(), 1);
    case "mes_anterior":
      // Mês anterior: do dia 1 ao último dia do mês passado
      return new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    case "trimestral":
      return new Date(agora.setMonth(agora.getMonth() - 3));
    case "semestral":
      return new Date(agora.setMonth(agora.getMonth() - 6));
    case "anual":
      return new Date(agora.getFullYear(), 0, 1);
  }
}

function calcularDataFim(
  periodo: "diario" | "semanal" | "mensal" | "mes_anterior" | "trimestral" | "semestral" | "anual"
): Date {
  const agora = new Date();
  if (periodo === "mes_anterior") {
    // Último dia do mês anterior
    return new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);
  }
  // Para outros períodos, usar data atual
  return agora;
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
  const {
    totalLojas,
    totalGestores,
    relatoriosLivresMes,
    relatoriosCompletosMes,
    pendentesAtivos,
    alertasPendentes,
    userName,
    userRole
  } = contexto;

  const isAdmin = userRole === 'admin';
  const totalRelatorios = relatoriosLivresMes + relatoriosCompletosMes;

  // Prompts diferenciados por role
  const promptAdmin = `És um assistente de gestão da plataforma PoweringEG (supervisão de lojas Express Glass).
  
Dados atuais do dashboard (visão ADMINISTRADOR):
- Total de lojas: ${totalLojas}
- Total de gestores: ${totalGestores}
- Relatórios livres este mês: ${relatoriosLivresMes}
- Relatórios completos este mês: ${relatoriosCompletosMes}
- Pendentes ativos: ${pendentesAtivos}
- Alertas pendentes: ${alertasPendentes}

Gera UMA ÚNICA frase curta (máximo 15 palavras) para o ADMINISTRADOR.
A frase deve ser baseada nos DADOS e RELATÓRIOS:
- Se há novos relatórios, comentar sobre eles
- Se há pendentes ou alertas, chamar atenção
- Se os dados estão bons, elogiar a equipa
- Foco em análise de dados e supervisão

Exemplos:
- "${relatoriosLivresMes} novos relatórios este mês. Revisa os pontos críticos."
- "Atenção: ${alertasPendentes} alertas pendentes requerem análise."
- "Equipa produtiva! ${totalRelatorios} relatórios já submetidos."

Responde APENAS com a frase, sem aspas.`;

  const promptGestor = `És um coach de gestão para gestores de lojas Express Glass.
  
Contexto do gestor ${userName}:
- Lojas sob sua responsabilidade: ${totalLojas}
- Relatórios livres este mês: ${relatoriosLivresMes}
- Relatórios completos este mês: ${relatoriosCompletosMes}
- Pendentes por resolver: ${pendentesAtivos}

Gera UMA ÚNICA frase curta (máximo 15 palavras) de MOTIVAÇÃO e DICAS DE GESTÃO.
A frase deve ser:
- Motivacional e encorajadora
- Com dicas práticas de gestão de loja
- Focada em liderança, equipa, atendimento ao cliente
- NÃO mencionar dados específicos, focar em boas práticas

Exemplos:
- "Lembra-te: uma equipa motivada é uma equipa produtiva!"
- "Hoje é um bom dia para reconhecer o esforço da tua equipa."
- "Pequenos gestos de liderança fazem grande diferença."
- "Foca no cliente e os resultados seguirão."
- "A consistência nas visitas constrói confiança."

Responde APENAS com a frase, sem aspas.`;

  const prompt = isAdmin ? promptAdmin : promptGestor;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Respondes apenas com uma frase curta em português europeu. Sem aspas, sem formatação, apenas a frase.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const dica = typeof content === 'string' ? content.trim() : "Bem-vindo ao PoweringEG Platform!";
    return dica;
  } catch (error) {
    console.error("Erro ao gerar dica com IA:", error);
    
    // Fallback com dicas estáticas diferenciadas por role
    if (isAdmin) {
      // Dicas para Admin baseadas em dados
      if (pendentesAtivos > 0) {
        return `Atenção: ${pendentesAtivos} pendente${pendentesAtivos > 1 ? 's' : ''} a aguardar resolução.`;
      }
      if (alertasPendentes > 0) {
        return `${alertasPendentes} alerta${alertasPendentes > 1 ? 's' : ''} pendente${alertasPendentes > 1 ? 's' : ''} requer${alertasPendentes > 1 ? 'em' : ''} análise.`;
      }
      if (totalRelatorios === 0) {
        return "Sem relatórios este mês. Verifica a atividade dos gestores.";
      }
      return `${totalRelatorios} relatório${totalRelatorios > 1 ? 's' : ''} este mês. Equipa a trabalhar bem!`;
    } else {
      // Dicas motivacionais para Gestores
      const dicasGestor = [
        "Uma equipa motivada é uma equipa produtiva!",
        "Pequenos gestos de liderança fazem grande diferença.",
        "Foca no cliente e os resultados seguirão.",
        "A consistência nas visitas constrói confiança.",
        "Hoje é um bom dia para reconhecer a tua equipa.",
        "Lidera pelo exemplo e inspira os outros.",
        "Cada visita é uma oportunidade de melhoria.",
        "O sucesso é construído um dia de cada vez."
      ];
      return dicasGestor[Math.floor(Math.random() * dicasGestor.length)];
    }
  }
}
