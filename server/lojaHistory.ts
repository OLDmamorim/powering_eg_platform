import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export interface LojaHistoryResult {
  resumoGeral: string;
  periodoAnalisado: string;
  metricas: {
    totalRelatoriosLivres: number;
    totalRelatoriosCompletos: number;
    totalPendentes: number;
    pendentesResolvidos: number;
    taxaResolucao: number;
    totalOcorrencias: number;
  };
  analiseResultados?: {
    totalServicos: number;
    objetivoTotal: number;
    desvioMedio: number;
    taxaReparacaoMedia: number;
    tendenciaServicos: 'subida' | 'descida' | 'estavel';
    melhorMes: string;
    piorMes: string;
  };
  analiseComercial?: {
    totalVendasComplementares: number;
    mediaVendasMensal: number;
    escovasTotal: number;
    polimentoTotal: number;
    tendenciaVendas: 'subida' | 'descida' | 'estavel';
  };
  evolucao: {
    periodo: string;
    descricao: string;
  }[];
  problemasRecorrentes: {
    problema: string;
    frequencia: string;
    gravidade: "baixa" | "média" | "alta";
    categoria: string;
  }[];
  pontosFortes: string[];
  tendencias: string[];
  alertasOperacionais: {
    tipo: string;
    descricao: string;
    urgencia: "baixa" | "média" | "alta";
  }[];
  recomendacoes: {
    prioridade: "alta" | "média" | "baixa";
    recomendacao: string;
    justificativa: string;
    categoria: string;
  }[];
}

type PeriodoFiltro = 'mes_atual' | 'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior';

function calcularPeriodo(filtro: PeriodoFiltro): { dataInicio: Date; dataFim: Date; label: string } {
  const agora = new Date();
  let dataInicio: Date;
  let dataFim: Date;
  let label: string;

  switch (filtro) {
    case 'mes_atual':
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
      dataFim = agora;
      label = `${agora.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })} (em curso)`;
      break;
    case 'mes_anterior':
      dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      dataFim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);
      label = dataInicio.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
      break;
    case 'trimestre_anterior': {
      const mesAtual = agora.getMonth();
      const trimestreAtual = Math.floor(mesAtual / 3);
      const trimestreAnterior = trimestreAtual === 0 ? 3 : trimestreAtual - 1;
      const anoTrimestre = trimestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
      dataInicio = new Date(anoTrimestre, trimestreAnterior * 3, 1);
      dataFim = new Date(anoTrimestre, (trimestreAnterior + 1) * 3, 0, 23, 59, 59);
      const trimestres = ['Q1 (Jan-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Set)', 'Q4 (Out-Dez)'];
      label = `${trimestres[trimestreAnterior]} ${anoTrimestre}`;
      break;
    }
    case 'semestre_anterior': {
      const mesAtual = agora.getMonth();
      const semestreAtual = mesAtual < 6 ? 0 : 1;
      const semestreAnterior = semestreAtual === 0 ? 1 : 0;
      const anoSemestre = semestreAtual === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
      dataInicio = new Date(anoSemestre, semestreAnterior * 6, 1);
      dataFim = new Date(anoSemestre, (semestreAnterior + 1) * 6, 0, 23, 59, 59);
      label = `${semestreAnterior === 0 ? '1º Semestre' : '2º Semestre'} ${anoSemestre}`;
      break;
    }
    case 'ano_anterior':
      dataInicio = new Date(agora.getFullYear() - 1, 0, 1);
      dataFim = new Date(agora.getFullYear() - 1, 11, 31, 23, 59, 59);
      label = `Ano ${agora.getFullYear() - 1}`;
      break;
    default:
      dataInicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      dataFim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);
      label = 'Mês Anterior';
  }

  return { dataInicio, dataFim, label };
}

/**
 * Gera histórico inteligente da loja baseado em todos os dados operacionais
 */
export async function generateLojaHistory(
  lojaId: number,
  periodo: PeriodoFiltro = 'mes_anterior'
): Promise<LojaHistoryResult> {
  try {
    const { dataInicio, dataFim, label } = calcularPeriodo(periodo);
    
    // Buscar nome da loja
    const loja = await db.getLojaById(lojaId);
    if (!loja) {
      throw new Error("Loja não encontrada");
    }

    // Buscar todos os relatórios da loja filtrados por período
    const allRelatoriosLivres = await db.getAllRelatoriosLivres();
    const relatoriosLivres = allRelatoriosLivres.filter(r => {
      const dataVisita = new Date(r.dataVisita);
      return r.lojaId === lojaId && dataVisita >= dataInicio && dataVisita <= dataFim;
    });
    
    const allRelatoriosCompletos = await db.getAllRelatoriosCompletos();
    const relatoriosCompletos = allRelatoriosCompletos.filter(r => {
      const dataVisita = new Date(r.dataVisita);
      return r.lojaId === lojaId && dataVisita >= dataInicio && dataVisita <= dataFim;
    });
    
    // Buscar pendentes da loja
    const todosPendentes = await db.getPendentesByLojaId(lojaId);
    const pendentes = todosPendentes.filter(p => {
      const dataCriacao = new Date(p.createdAt);
      return dataCriacao >= dataInicio && dataCriacao <= dataFim;
    });
    
    // Buscar ocorrências estruturais da loja
    let ocorrencias: any[] = [];
    try {
      const todasOcorrencias = await db.getAllOcorrenciasEstruturais();
      ocorrencias = todasOcorrencias.filter((o: any) => {
        const dataOcorrencia = new Date(o.dataOcorrencia);
        return o.lojaId === lojaId && dataOcorrencia >= dataInicio && dataOcorrencia <= dataFim;
      });
    } catch (e) {
      console.log('[LojaHistory] Sem dados de ocorrências estruturais');
    }
    
    // Buscar resultados mensais da loja
    let resultadosMensais: any[] = [];
    try {
      const evolucao = await db.getEvolucaoMensal(lojaId, 12);
      resultadosMensais = evolucao.filter((r: any) => {
        const dataResultado = new Date(r.ano, r.mes - 1, 1);
        return dataResultado >= dataInicio && dataResultado <= dataFim;
      });
    } catch (e) {
      console.log('[LojaHistory] Sem dados de resultados mensais');
    }
    
    // Buscar vendas complementares da loja para cada mês do período
    let vendasComplementares: any[] = [];
    try {
      // Iterar pelos meses do período
      const mesInicio = dataInicio.getMonth() + 1;
      const anoInicio = dataInicio.getFullYear();
      const mesFim = dataFim.getMonth() + 1;
      const anoFim = dataFim.getFullYear();
      
      let mesAtual = mesInicio;
      let anoAtual = anoInicio;
      
      while (anoAtual < anoFim || (anoAtual === anoFim && mesAtual <= mesFim)) {
        try {
          const vendasMes = await db.getVendasComplementares(mesAtual, anoAtual, lojaId);
          if (vendasMes && vendasMes.length > 0) {
            vendasComplementares.push(...vendasMes);
          }
        } catch (e) {
          // Continuar para o próximo mês
        }
        
        mesAtual++;
        if (mesAtual > 12) {
          mesAtual = 1;
          anoAtual++;
        }
      }
    } catch (e) {
      console.log('[LojaHistory] Sem dados de vendas complementares');
    }

    // Calcular métricas
    const totalPendentes = pendentes.length;
    const pendentesResolvidos = pendentes.filter((p: any) => p.resolvido).length;
    const taxaResolucao = totalPendentes > 0 ? (pendentesResolvidos / totalPendentes) * 100 : 0;
    
    // Calcular análise de resultados
    let analiseResultados: any = null;
    if (resultadosMensais.length > 0) {
      const totalServicos = resultadosMensais.reduce((sum, r) => sum + (r.totalServicos || 0), 0);
      const objetivoTotal = resultadosMensais.reduce((sum, r) => sum + (r.objetivoMensal || 0), 0);
      const desvioMedio = resultadosMensais.reduce((sum, r) => sum + (r.desvioPercentualMes || 0), 0) / resultadosMensais.length;
      const taxaReparacaoMedia = resultadosMensais.reduce((sum, r) => sum + (r.taxaReparacao || 0), 0) / resultadosMensais.length;
      
      // Encontrar melhor e pior mês
      const ordenadosPorServicos = [...resultadosMensais].sort((a, b) => (b.totalServicos || 0) - (a.totalServicos || 0));
      const melhorMes = ordenadosPorServicos[0];
      const piorMes = ordenadosPorServicos[ordenadosPorServicos.length - 1];
      
      // Calcular tendência
      let tendenciaServicos: 'subida' | 'descida' | 'estavel' = 'estavel';
      if (resultadosMensais.length >= 2) {
        const primeiro = resultadosMensais[0]?.totalServicos || 0;
        const ultimo = resultadosMensais[resultadosMensais.length - 1]?.totalServicos || 0;
        if (ultimo > primeiro * 1.05) tendenciaServicos = 'subida';
        else if (ultimo < primeiro * 0.95) tendenciaServicos = 'descida';
      }
      
      analiseResultados = {
        totalServicos,
        objetivoTotal,
        desvioMedio: parseFloat((desvioMedio * 100).toFixed(2)),
        taxaReparacaoMedia: parseFloat((taxaReparacaoMedia * 100).toFixed(2)),
        tendenciaServicos,
        melhorMes: melhorMes ? `${melhorMes.mes}/${melhorMes.ano} (${melhorMes.totalServicos} serviços)` : 'N/A',
        piorMes: piorMes ? `${piorMes.mes}/${piorMes.ano} (${piorMes.totalServicos} serviços)` : 'N/A',
      };
    }
    
    // Calcular análise comercial
    let analiseComercial: any = null;
    if (vendasComplementares.length > 0) {
      const totalVendasComplementares = vendasComplementares.reduce((sum, v) => sum + (parseFloat(v.totalVendas) || 0), 0);
      const escovasTotal = vendasComplementares.reduce((sum, v) => sum + (parseFloat(v.escovasVendas) || 0), 0);
      const polimentoTotal = vendasComplementares.reduce((sum, v) => sum + (parseFloat(v.polimentoVendas) || 0), 0);
      
      // Calcular tendência
      let tendenciaVendas: 'subida' | 'descida' | 'estavel' = 'estavel';
      if (vendasComplementares.length >= 2) {
        const primeiro = parseFloat(vendasComplementares[0]?.totalVendas) || 0;
        const ultimo = parseFloat(vendasComplementares[vendasComplementares.length - 1]?.totalVendas) || 0;
        if (ultimo > primeiro * 1.05) tendenciaVendas = 'subida';
        else if (ultimo < primeiro * 0.95) tendenciaVendas = 'descida';
      }
      
      analiseComercial = {
        totalVendasComplementares: parseFloat(totalVendasComplementares.toFixed(2)),
        mediaVendasMensal: parseFloat((totalVendasComplementares / vendasComplementares.length).toFixed(2)),
        escovasTotal: parseFloat(escovasTotal.toFixed(2)),
        polimentoTotal: parseFloat(polimentoTotal.toFixed(2)),
        tendenciaVendas,
      };
    }

    // Preparar dados para a IA
    const dadosCompletos = {
      loja: loja.nome,
      periodo: label,
      relatoriosLivres: relatoriosLivres.map((r: any) => ({
        data: r.dataVisita,
        descricao: r.descricao,
        categoria: r.categoria,
        estado: r.estadoAcompanhamento,
      })),
      relatoriosCompletos: relatoriosCompletos.map((r: any) => ({
        data: r.dataVisita,
        pontosPositivos: r.pontosPositivos,
        pontosNegativos: r.pontosNegativos,
        resumo: r.resumoSupervisao,
        episFardamento: r.episFardamento,
        kitPrimeirosSocorros: r.kitPrimeirosSocorros,
        consumiveis: r.consumiveis,
        espacoFisico: r.espacoFisico,
      })),
      pendentes: pendentes.map((p: any) => ({
        descricao: p.descricao,
        resolvido: p.resolvido,
        dataCriacao: p.createdAt,
        dataResolucao: p.resolvedAt,
      })),
      ocorrencias: ocorrencias.map((o: any) => ({
        tipo: o.tipo,
        descricao: o.descricao,
        estado: o.estado,
        data: o.dataOcorrencia,
      })),
      resultadosMensais: resultadosMensais.map((r: any) => ({
        mes: r.mes,
        ano: r.ano,
        totalServicos: r.totalServicos,
        objetivo: r.objetivoMensal,
        desvio: r.desvioPercentualMes,
        taxaReparacao: r.taxaReparacao,
      })),
      vendasComplementares: vendasComplementares.map((v: any) => ({
        mes: v.mes,
        ano: v.ano,
        total: v.totalVendas,
        escovas: v.escovasVendas,
        polimento: v.polimentoVendas,
      })),
      metricas: {
        totalRelatoriosLivres: relatoriosLivres.length,
        totalRelatoriosCompletos: relatoriosCompletos.length,
        totalPendentes,
        pendentesResolvidos,
        taxaResolucao: parseFloat(taxaResolucao.toFixed(1)),
        totalOcorrencias: ocorrencias.length,
      },
      analiseResultados,
      analiseComercial,
    };

    // Se não há dados suficientes, retornar resultado vazio estruturado
    if (relatoriosLivres.length === 0 && relatoriosCompletos.length === 0 && resultadosMensais.length === 0) {
      return {
        resumoGeral: `Não foram encontrados dados para a loja ${loja.nome} no período ${label}. Verifique se existem relatórios ou resultados registados para este período.`,
        periodoAnalisado: label,
        metricas: dadosCompletos.metricas,
        analiseResultados: analiseResultados || undefined,
        analiseComercial: analiseComercial || undefined,
        evolucao: [],
        problemasRecorrentes: [],
        pontosFortes: [],
        tendencias: [],
        alertasOperacionais: [],
        recomendacoes: [],
      };
    }

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `És um analista especializado em supervisão de lojas Express Glass.
Analisa o histórico completo de uma loja para o período especificado e gera insights inteligentes sobre:
- Evolução operacional ao longo do tempo
- Problemas recorrentes identificados nos relatórios e ocorrências
- Performance de resultados (serviços, objetivos, taxas)
- Performance comercial (vendas complementares)
- Pontos fortes consistentes da loja
- Tendências e padrões identificados
- Alertas operacionais que requerem atenção
- Recomendações prioritárias baseadas nos dados

Sê específico, objetivo e baseado em dados concretos. Categoriza os problemas e recomendações.`
        },
        {
          role: "user",
          content: `Analisa o histórico completo desta loja para o período ${label}:

${JSON.stringify(dadosCompletos, null, 2)}

Gera uma análise completa incluindo evolução, problemas, pontos fortes, alertas e recomendações.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "loja_history_completo",
          strict: true,
          schema: {
            type: "object",
            properties: {
              resumoGeral: {
                type: "string",
                description: "Resumo executivo da loja no período em 3-4 frases"
              },
              evolucao: {
                type: "array",
                description: "Evolução da loja ao longo do período",
                items: {
                  type: "object",
                  properties: {
                    periodo: { type: "string", description: "Período temporal" },
                    descricao: { type: "string", description: "Descrição da evolução" }
                  },
                  required: ["periodo", "descricao"],
                  additionalProperties: false
                }
              },
              problemasRecorrentes: {
                type: "array",
                description: "Problemas identificados nos relatórios e ocorrências",
                items: {
                  type: "object",
                  properties: {
                    problema: { type: "string", description: "Descrição do problema" },
                    frequencia: { type: "string", description: "Frequência do problema" },
                    gravidade: { type: "string", enum: ["baixa", "média", "alta"] },
                    categoria: { type: "string", description: "Categoria: operacional, estrutural, comercial, equipamentos, stock, etc." }
                  },
                  required: ["problema", "frequencia", "gravidade", "categoria"],
                  additionalProperties: false
                }
              },
              pontosFortes: {
                type: "array",
                description: "Pontos fortes consistentes da loja",
                items: { type: "string" }
              },
              tendencias: {
                type: "array",
                description: "Tendências identificadas",
                items: { type: "string" }
              },
              alertasOperacionais: {
                type: "array",
                description: "Alertas que requerem atenção imediata",
                items: {
                  type: "object",
                  properties: {
                    tipo: { type: "string", description: "Tipo de alerta" },
                    descricao: { type: "string", description: "Descrição do alerta" },
                    urgencia: { type: "string", enum: ["baixa", "média", "alta"] }
                  },
                  required: ["tipo", "descricao", "urgencia"],
                  additionalProperties: false
                }
              },
              recomendacoes: {
                type: "array",
                description: "Recomendações prioritárias",
                items: {
                  type: "object",
                  properties: {
                    prioridade: { type: "string", enum: ["alta", "média", "baixa"] },
                    recomendacao: { type: "string", description: "Descrição da recomendação" },
                    justificativa: { type: "string", description: "Justificativa baseada nos dados" },
                    categoria: { type: "string", description: "Categoria: operacional, comercial, formação, infraestrutura, etc." }
                  },
                  required: ["prioridade", "recomendacao", "justificativa", "categoria"],
                  additionalProperties: false
                }
              }
            },
            required: ["resumoGeral", "evolucao", "problemasRecorrentes", "pontosFortes", "tendencias", "alertasOperacionais", "recomendacoes"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da API de histórico");
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const iaResult = JSON.parse(contentStr);
    
    return {
      ...iaResult,
      periodoAnalisado: label,
      metricas: dadosCompletos.metricas,
      analiseResultados: analiseResultados || undefined,
      analiseComercial: analiseComercial || undefined,
    };

  } catch (error) {
    console.error("Erro ao gerar histórico da loja:", error);
    throw new Error("Falha ao gerar histórico da loja. Tente novamente.");
  }
}
