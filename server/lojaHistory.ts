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
    escovasQtdTotal: number;
    polimentoTotal: number;
    polimentoQtdTotal: number;
    tendenciaVendas: 'subida' | 'descida' | 'estavel';
  };
  // Dados para gráficos de evolução mensal
  dadosMensais?: {
    resultados: Array<{ mes: string; servicos: number; objetivo: number; taxaReparacao: number }>;
    vendas: Array<{ mes: string; total: number; escovas: number; escovasQtd: number; polimento: number; polimentoQtd: number; escovasPercent: number }>;
    pendentes: Array<{ mes: string; criados: number; resolvidos: number }>;
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
  recomendacoesTexto?: string;
}

type PeriodoFiltro = 'mes_atual' | 'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior';

export interface MesSelecionado {
  mes: number; // 1-12
  ano: number;
}

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Calcula período a partir de array de meses selecionados
 */
export function calcularPeriodoMultiplosMeses(meses: MesSelecionado[]): { dataInicio: Date; dataFim: Date; label: string } {
  if (!meses || meses.length === 0) {
    // Fallback para mês anterior
    const agora = new Date();
    return {
      dataInicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
      dataFim: new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59),
      label: 'Mês Anterior'
    };
  }
  
  // Ordenar meses
  const ordenados = [...meses].sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.mes - b.mes;
  });
  
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  
  const dataInicio = new Date(primeiro.ano, primeiro.mes - 1, 1);
  const dataFim = new Date(ultimo.ano, ultimo.mes, 0, 23, 59, 59); // Último dia do mês
  
  // Gerar label
  let label: string;
  if (meses.length === 1) {
    label = `${NOMES_MESES[primeiro.mes - 1]} ${primeiro.ano}`;
  } else if (meses.length <= 3) {
    label = ordenados.map(m => `${NOMES_MESES[m.mes - 1].substring(0, 3)} ${m.ano}`).join(", ");
  } else {
    // Verificar se são consecutivos
    let consecutivos = true;
    for (let i = 1; i < ordenados.length; i++) {
      const prev = ordenados[i - 1];
      const curr = ordenados[i];
      const prevDate = new Date(prev.ano, prev.mes - 1);
      const currDate = new Date(curr.ano, curr.mes - 1);
      const diffMeses = (currDate.getFullYear() - prevDate.getFullYear()) * 12 + (currDate.getMonth() - prevDate.getMonth());
      if (diffMeses !== 1) {
        consecutivos = false;
        break;
      }
    }
    
    if (consecutivos) {
      label = `${NOMES_MESES[primeiro.mes - 1].substring(0, 3)} ${primeiro.ano} a ${NOMES_MESES[ultimo.mes - 1].substring(0, 3)} ${ultimo.ano}`;
    } else {
      label = `${meses.length} meses selecionados`;
    }
  }
  
  return { dataInicio, dataFim, label };
}

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
 * Gera histórico inteligente da loja baseado em múltiplos meses selecionados
 */
export async function generateLojaHistoryMultiplosMeses(
  lojaId: number,
  mesesSelecionados: MesSelecionado[]
): Promise<LojaHistoryResult> {
  const { dataInicio, dataFim, label } = calcularPeriodoMultiplosMeses(mesesSelecionados);
  return generateLojaHistoryInterno(lojaId, dataInicio, dataFim, label);
}

/**
 * Gera histórico inteligente da loja baseado em todos os dados operacionais
 */
export async function generateLojaHistory(
  lojaId: number,
  periodo: PeriodoFiltro = 'mes_anterior'
): Promise<LojaHistoryResult> {
  const { dataInicio, dataFim, label } = calcularPeriodo(periodo);
  return generateLojaHistoryInterno(lojaId, dataInicio, dataFim, label);
}

/**
 * Função interna que gera o histórico
 */
async function generateLojaHistoryInterno(
  lojaId: number,
  dataInicio: Date,
  dataFim: Date,
  label: string
): Promise<LojaHistoryResult> {
  try {
    
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
      const escovasQtdTotal = vendasComplementares.reduce((sum, v) => sum + (v.escovasQtd || 0), 0);
      const polimentoTotal = vendasComplementares.reduce((sum, v) => sum + (parseFloat(v.polimentoVendas) || 0), 0);
      const polimentoQtdTotal = vendasComplementares.reduce((sum, v) => sum + (v.polimentoQtd || 0), 0);
      
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
        escovasQtdTotal,
        polimentoTotal: parseFloat(polimentoTotal.toFixed(2)),
        polimentoQtdTotal,
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
        dadosMensais: { resultados: [], vendas: [], pendentes: [] },
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
          content: `És um analista especializado em análise de performance de lojas Express Glass.
Analisa APENAS a performance operacional e comercial da loja para o período especificado.

FOCA-TE EXCLUSIVAMENTE EM:
- Performance de resultados (serviços realizados, objetivos atingidos, taxas de reparação)
- Performance comercial (vendas complementares: escovas, polimento, tratamentos)
- Evolução dos indicadores de negócio ao longo do tempo
- Pendêntes operacionais e taxa de resolução
- Ocorrências estruturais reportadas
- Pontos fortes e áreas de melhoria da loja
- Tendências de vendas e serviços
- Alertas operacionais que requerem atenção
- Recomendações para melhorar a performance

IMPORTANTE: NÃO menciones relatórios de visita, número de visitas do gestor, ou qualquer referência a tarefas/responsabilidades do gestor. Esta análise é sobre a PERFORMANCE DA LOJA, não sobre a atividade do gestor.

Sê específico, objetivo e baseado em dados concretos. Categoriza os problemas e recomendações.

ALÉM DAS RECOMENDAÇÕES POR TÓPICOS, gera também um texto de recomendações em prosa (3-5 parágrafos) dirigido diretamente aos colegas da loja. Este texto deve:
- Ser escrito de forma motivadora e prática
- Usar linguagem direta e acessível (tutear os colegas)
- Explicar onde se devem focar nos próximos tempos para melhorar a performance
- Basear-se nos dados de resultados e vendas analisados
- Dar prioridade às áreas mais críticas de performance
- NÃO mencionar relatórios ou visitas do gestor
- Terminar com uma nota de encorajamento`
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
              },
              recomendacoesTexto: {
                type: "string",
                description: "Texto de recomendações em prosa (3-5 parágrafos) dirigido aos colegas da loja, explicando onde se devem focar nos próximos tempos com base na análise. Deve ser escrito de forma motivadora e prática, com linguagem direta e acessível."
              }
            },
            required: ["resumoGeral", "evolucao", "problemasRecorrentes", "pontosFortes", "tendencias", "alertasOperacionais", "recomendacoes", "recomendacoesTexto"],
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
    
    // Preparar dados mensais para gráficos
    const NOMES_MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    const dadosMensais = {
      resultados: resultadosMensais.map((r: any) => ({
        mes: `${NOMES_MESES_CURTOS[r.mes - 1]} ${r.ano}`,
        servicos: r.totalServicos || 0,
        objetivo: r.objetivoMensal || 0,
        taxaReparacao: parseFloat(((r.taxaReparacao || 0) * 100).toFixed(1)),
      })),
      vendas: vendasComplementares.map((v: any) => ({
        mes: `${NOMES_MESES_CURTOS[v.mes - 1]} ${v.ano}`,
        total: parseFloat(v.totalVendas) || 0,
        escovas: parseFloat(v.escovasVendas) || 0,
        escovasQtd: v.escovasQtd || 0,
        polimento: parseFloat(v.polimentoVendas) || 0,
        polimentoQtd: v.polimentoQtd || 0,
        escovasPercent: v.escovasPercent ? parseFloat((v.escovasPercent * 100).toFixed(2)) : 0,
      })),
      pendentes: (() => {
        // Agrupar pendentes por mês
        const porMes = new Map<string, { criados: number; resolvidos: number }>();
        pendentes.forEach((p: any) => {
          const data = new Date(p.createdAt);
          const chave = `${NOMES_MESES_CURTOS[data.getMonth()]} ${data.getFullYear()}`;
          const atual = porMes.get(chave) || { criados: 0, resolvidos: 0 };
          atual.criados++;
          if (p.resolvido) atual.resolvidos++;
          porMes.set(chave, atual);
        });
        return Array.from(porMes.entries()).map(([mes, dados]) => ({
          mes,
          criados: dados.criados,
          resolvidos: dados.resolvidos,
        }));
      })(),
    };
    
    return {
      ...iaResult,
      periodoAnalisado: label,
      metricas: dadosCompletos.metricas,
      analiseResultados: analiseResultados || undefined,
      analiseComercial: analiseComercial || undefined,
      dadosMensais,
    };

  } catch (error) {
    console.error("Erro ao gerar histórico da loja:", error);
    throw new Error("Falha ao gerar histórico da loja. Tente novamente.");
  }
}


type TipoComparacao = 
  | 'q1_ano_anterior_vs_atual'
  | 'q2_ano_anterior_vs_atual'
  | 'q3_ano_anterior_vs_atual'
  | 'q4_ano_anterior_vs_atual'
  | 's1_ano_anterior_vs_atual'
  | 's2_ano_anterior_vs_atual'
  | 'ano_completo';

interface PeriodoComparacao {
  dataInicio: Date;
  dataFim: Date;
  label: string;
}

/**
 * Verifica se um período já começou (não é futuro)
 */
function periodoJaComecou(dataInicio: Date): boolean {
  const agora = new Date();
  return dataInicio <= agora;
}

/**
 * Calcula os períodos de comparação, ajustando para não mostrar períodos futuros.
 * Se o período atual for futuro, compara os dois últimos períodos completos.
 */
function calcularPeriodosComparacao(tipo: TipoComparacao): { periodo1: PeriodoComparacao; periodo2: PeriodoComparacao; periodoFuturo: boolean } {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const anoAnterior = anoAtual - 1;
  const anoMaisAnterior = anoAtual - 2;

  // Função auxiliar para criar período
  const criarPeriodo = (ano: number, mesInicio: number, mesFim: number, label: string): PeriodoComparacao => {
    // Ajustar último dia do mês corretamente
    const ultimoDia = new Date(ano, mesFim + 1, 0).getDate();
    return {
      dataInicio: new Date(ano, mesInicio, 1),
      dataFim: new Date(ano, mesFim, ultimoDia, 23, 59, 59),
      label
    };
  };

  switch (tipo) {
    case 'q1_ano_anterior_vs_atual': {
      const periodo2Inicio = new Date(anoAtual, 0, 1);
      const periodoFuturo = !periodoJaComecou(periodo2Inicio);
      
      if (periodoFuturo) {
        // Se Q1 atual é futuro, comparar Q1 de 2 anos atrás vs ano anterior
        return {
          periodo1: criarPeriodo(anoMaisAnterior, 0, 2, `Q1 ${anoMaisAnterior} (Jan-Mar)`),
          periodo2: criarPeriodo(anoAnterior, 0, 2, `Q1 ${anoAnterior} (Jan-Mar)`),
          periodoFuturo: true
        };
      }
      return {
        periodo1: criarPeriodo(anoAnterior, 0, 2, `Q1 ${anoAnterior} (Jan-Mar)`),
        periodo2: criarPeriodo(anoAtual, 0, 2, `Q1 ${anoAtual} (Jan-Mar)`),
        periodoFuturo: false
      };
    }
    case 'q2_ano_anterior_vs_atual': {
      const periodo2Inicio = new Date(anoAtual, 3, 1);
      const periodoFuturo = !periodoJaComecou(periodo2Inicio);
      
      if (periodoFuturo) {
        return {
          periodo1: criarPeriodo(anoMaisAnterior, 3, 5, `Q2 ${anoMaisAnterior} (Abr-Jun)`),
          periodo2: criarPeriodo(anoAnterior, 3, 5, `Q2 ${anoAnterior} (Abr-Jun)`),
          periodoFuturo: true
        };
      }
      return {
        periodo1: criarPeriodo(anoAnterior, 3, 5, `Q2 ${anoAnterior} (Abr-Jun)`),
        periodo2: criarPeriodo(anoAtual, 3, 5, `Q2 ${anoAtual} (Abr-Jun)`),
        periodoFuturo: false
      };
    }
    case 'q3_ano_anterior_vs_atual': {
      const periodo2Inicio = new Date(anoAtual, 6, 1);
      const periodoFuturo = !periodoJaComecou(periodo2Inicio);
      
      if (periodoFuturo) {
        return {
          periodo1: criarPeriodo(anoMaisAnterior, 6, 8, `Q3 ${anoMaisAnterior} (Jul-Set)`),
          periodo2: criarPeriodo(anoAnterior, 6, 8, `Q3 ${anoAnterior} (Jul-Set)`),
          periodoFuturo: true
        };
      }
      return {
        periodo1: criarPeriodo(anoAnterior, 6, 8, `Q3 ${anoAnterior} (Jul-Set)`),
        periodo2: criarPeriodo(anoAtual, 6, 8, `Q3 ${anoAtual} (Jul-Set)`),
        periodoFuturo: false
      };
    }
    case 'q4_ano_anterior_vs_atual': {
      const periodo2Inicio = new Date(anoAtual, 9, 1);
      const periodoFuturo = !periodoJaComecou(periodo2Inicio);
      
      if (periodoFuturo) {
        return {
          periodo1: criarPeriodo(anoMaisAnterior, 9, 11, `Q4 ${anoMaisAnterior} (Out-Dez)`),
          periodo2: criarPeriodo(anoAnterior, 9, 11, `Q4 ${anoAnterior} (Out-Dez)`),
          periodoFuturo: true
        };
      }
      return {
        periodo1: criarPeriodo(anoAnterior, 9, 11, `Q4 ${anoAnterior} (Out-Dez)`),
        periodo2: criarPeriodo(anoAtual, 9, 11, `Q4 ${anoAtual} (Out-Dez)`),
        periodoFuturo: false
      };
    }
    case 's1_ano_anterior_vs_atual': {
      const periodo2Inicio = new Date(anoAtual, 0, 1);
      const periodoFuturo = !periodoJaComecou(periodo2Inicio);
      
      if (periodoFuturo) {
        return {
          periodo1: criarPeriodo(anoMaisAnterior, 0, 5, `1º Semestre ${anoMaisAnterior}`),
          periodo2: criarPeriodo(anoAnterior, 0, 5, `1º Semestre ${anoAnterior}`),
          periodoFuturo: true
        };
      }
      return {
        periodo1: criarPeriodo(anoAnterior, 0, 5, `1º Semestre ${anoAnterior}`),
        periodo2: criarPeriodo(anoAtual, 0, 5, `1º Semestre ${anoAtual}`),
        periodoFuturo: false
      };
    }
    case 's2_ano_anterior_vs_atual': {
      const periodo2Inicio = new Date(anoAtual, 6, 1);
      const periodoFuturo = !periodoJaComecou(periodo2Inicio);
      
      if (periodoFuturo) {
        return {
          periodo1: criarPeriodo(anoMaisAnterior, 6, 11, `2º Semestre ${anoMaisAnterior}`),
          periodo2: criarPeriodo(anoAnterior, 6, 11, `2º Semestre ${anoAnterior}`),
          periodoFuturo: true
        };
      }
      return {
        periodo1: criarPeriodo(anoAnterior, 6, 11, `2º Semestre ${anoAnterior}`),
        periodo2: criarPeriodo(anoAtual, 6, 11, `2º Semestre ${anoAtual}`),
        periodoFuturo: false
      };
    }
    case 'ano_completo':
    default:
      // Ano completo nunca é "futuro" porque compara ano anterior completo vs ano atual até agora
      return {
        periodo1: criarPeriodo(anoAnterior, 0, 11, `Ano ${anoAnterior}`),
        periodo2: {
          dataInicio: new Date(anoAtual, 0, 1),
          dataFim: agora,
          label: `Ano ${anoAtual} (até agora)`
        },
        periodoFuturo: false
      };
  }
}

async function buscarDadosPeriodo(lojaId: number, dataInicio: Date, dataFim: Date) {
  // Buscar relatórios livres
  const allRelatoriosLivres = await db.getAllRelatoriosLivres();
  const relatoriosLivres = allRelatoriosLivres.filter(r => {
    const dataVisita = new Date(r.dataVisita);
    return r.lojaId === lojaId && dataVisita >= dataInicio && dataVisita <= dataFim;
  });

  // Buscar relatórios completos
  const allRelatoriosCompletos = await db.getAllRelatoriosCompletos();
  const relatoriosCompletos = allRelatoriosCompletos.filter(r => {
    const dataVisita = new Date(r.dataVisita);
    return r.lojaId === lojaId && dataVisita >= dataInicio && dataVisita <= dataFim;
  });

  // Buscar pendentes
  const todosPendentes = await db.getPendentesByLojaId(lojaId);
  const pendentes = todosPendentes.filter(p => {
    const dataCriacao = new Date(p.createdAt);
    return dataCriacao >= dataInicio && dataCriacao <= dataFim;
  });

  // Buscar resultados mensais
  let resultadosMensais: any[] = [];
  try {
    const evolucao = await db.getEvolucaoMensal(lojaId, 24);
    resultadosMensais = evolucao.filter((r: any) => {
      const dataResultado = new Date(r.ano, r.mes - 1, 1);
      return dataResultado >= dataInicio && dataResultado <= dataFim;
    });
  } catch (e) {
    console.log('[Comparacao] Sem dados de resultados mensais');
  }

  // Buscar vendas complementares
  let vendasComplementares: any[] = [];
  try {
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
        // Continuar
      }
      
      mesAtual++;
      if (mesAtual > 12) {
        mesAtual = 1;
        anoAtual++;
      }
    }
  } catch (e) {
    console.log('[Comparacao] Sem dados de vendas complementares');
  }

  // Calcular métricas
  const totalPendentes = pendentes.length;
  const pendentesResolvidos = pendentes.filter((p: any) => p.resolvido).length;
  const taxaResolucao = totalPendentes > 0 ? (pendentesResolvidos / totalPendentes) * 100 : 0;

  const totalServicos = resultadosMensais.reduce((sum, r) => sum + (r.totalServicos || 0), 0);
  const objetivoTotal = resultadosMensais.reduce((sum, r) => sum + (r.objetivoMensal || 0), 0);
  const desvioMedio = resultadosMensais.length > 0 
    ? resultadosMensais.reduce((sum, r) => sum + (r.desvioPercentualMes || 0), 0) / resultadosMensais.length 
    : 0;
  const taxaReparacaoMedia = resultadosMensais.length > 0
    ? resultadosMensais.reduce((sum, r) => sum + (r.taxaReparacao || 0), 0) / resultadosMensais.length
    : 0;

  const totalVendasComplementares = vendasComplementares.reduce((sum, v) => sum + (parseFloat(v.totalVendas) || 0), 0);
  const escovasTotal = vendasComplementares.reduce((sum, v) => sum + (parseFloat(v.escovasVendas) || 0), 0);
  const polimentoTotal = vendasComplementares.reduce((sum, v) => sum + (parseFloat(v.polimentoVendas) || 0), 0);

  return {
    relatoriosLivres: relatoriosLivres.length,
    relatoriosCompletos: relatoriosCompletos.length,
    totalVisitas: relatoriosLivres.length + relatoriosCompletos.length,
    totalPendentes,
    pendentesResolvidos,
    taxaResolucao: parseFloat(taxaResolucao.toFixed(1)),
    totalServicos,
    objetivoTotal,
    desvioMedio: parseFloat((desvioMedio * 100).toFixed(2)),
    taxaReparacaoMedia: parseFloat((taxaReparacaoMedia * 100).toFixed(2)),
    totalVendasComplementares: parseFloat(totalVendasComplementares.toFixed(2)),
    escovasTotal: parseFloat(escovasTotal.toFixed(2)),
    polimentoTotal: parseFloat(polimentoTotal.toFixed(2)),
  };
}

function calcularVariacao(atual: number, anterior: number): { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' } {
  const diferenca = atual - anterior;
  const percentual = anterior !== 0 ? ((atual - anterior) / anterior) * 100 : (atual > 0 ? 100 : 0);
  
  return {
    valor: diferenca,
    percentual: parseFloat(percentual.toFixed(1)),
    tipo: percentual > 1 ? 'subida' : percentual < -1 ? 'descida' : 'igual'
  };
}

export interface ComparacaoResult {
  lojaNome: string;
  tipoComparacao: string;
  periodoFuturo: boolean; // Indica se o período atual é futuro e foi ajustado
  periodo1: {
    label: string;
    dados: ReturnType<typeof buscarDadosPeriodo> extends Promise<infer T> ? T : never;
  };
  periodo2: {
    label: string;
    dados: ReturnType<typeof buscarDadosPeriodo> extends Promise<infer T> ? T : never;
  };
  variacoes: {
    visitas: { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' };
    servicos: { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' };
    pendentes: { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' };
    taxaResolucao: { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' };
    desvioMedio: { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' };
    taxaReparacao: { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' };
    vendasComplementares: { valor: number; percentual: number; tipo: 'subida' | 'descida' | 'igual' };
  };
  analiseIA: string;
}

/**
 * Compara dois períodos equivalentes de anos diferentes para uma loja
 */
export async function compararPeriodos(
  lojaId: number,
  tipoComparacao: TipoComparacao
): Promise<ComparacaoResult> {
  try {
    const loja = await db.getLojaById(lojaId);
    if (!loja) {
      throw new Error("Loja não encontrada");
    }

    const { periodo1, periodo2, periodoFuturo } = calcularPeriodosComparacao(tipoComparacao);

    // Buscar dados de ambos os períodos
    const [dados1, dados2] = await Promise.all([
      buscarDadosPeriodo(lojaId, periodo1.dataInicio, periodo1.dataFim),
      buscarDadosPeriodo(lojaId, periodo2.dataInicio, periodo2.dataFim)
    ]);

    // Calcular variações
    const variacoes = {
      visitas: calcularVariacao(dados2.totalVisitas, dados1.totalVisitas),
      servicos: calcularVariacao(dados2.totalServicos, dados1.totalServicos),
      pendentes: calcularVariacao(dados2.totalPendentes, dados1.totalPendentes),
      taxaResolucao: calcularVariacao(dados2.taxaResolucao, dados1.taxaResolucao),
      desvioMedio: calcularVariacao(dados2.desvioMedio, dados1.desvioMedio),
      taxaReparacao: calcularVariacao(dados2.taxaReparacaoMedia, dados1.taxaReparacaoMedia),
      vendasComplementares: calcularVariacao(dados2.totalVendasComplementares, dados1.totalVendasComplementares),
    };

    // Gerar análise com IA
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `És um analista especializado em comparação de performance de lojas Express Glass.
Analisa a evolução entre dois períodos equivalentes e fornece insights estratégicos.
Sê conciso mas informativo. Usa linguagem profissional em português de Portugal.`
        },
        {
          role: "user",
          content: `Compara a performance da loja "${loja.nome}" entre ${periodo1.label} e ${periodo2.label}:

PERÍODO 1 (${periodo1.label}):
- Visitas: ${dados1.totalVisitas}
- Serviços: ${dados1.totalServicos}
- Objetivo: ${dados1.objetivoTotal}
- Desvio Médio: ${dados1.desvioMedio}%
- Taxa Reparação: ${dados1.taxaReparacaoMedia}%
- Pendentes: ${dados1.totalPendentes} (${dados1.taxaResolucao}% resolvidos)
- Vendas Complementares: €${dados1.totalVendasComplementares}

PERÍODO 2 (${periodo2.label}):
- Visitas: ${dados2.totalVisitas}
- Serviços: ${dados2.totalServicos}
- Objetivo: ${dados2.objetivoTotal}
- Desvio Médio: ${dados2.desvioMedio}%
- Taxa Reparação: ${dados2.taxaReparacaoMedia}%
- Pendentes: ${dados2.totalPendentes} (${dados2.taxaResolucao}% resolvidos)
- Vendas Complementares: €${dados2.totalVendasComplementares}

VARIAÇÕES:
- Visitas: ${variacoes.visitas.percentual > 0 ? '+' : ''}${variacoes.visitas.percentual}%
- Serviços: ${variacoes.servicos.percentual > 0 ? '+' : ''}${variacoes.servicos.percentual}%
- Desvio: ${variacoes.desvioMedio.percentual > 0 ? '+' : ''}${variacoes.desvioMedio.percentual}%
- Taxa Reparação: ${variacoes.taxaReparacao.percentual > 0 ? '+' : ''}${variacoes.taxaReparacao.percentual}%
- Vendas Complementares: ${variacoes.vendasComplementares.percentual > 0 ? '+' : ''}${variacoes.vendasComplementares.percentual}%

Fornece uma análise comparativa em 3-4 parágrafos destacando:
1. Evolução geral da performance
2. Pontos de melhoria e pontos de atenção
3. Recomendações estratégicas`
        }
      ]
    });

    const analiseIA = response.choices[0]?.message?.content || 
      "Não foi possível gerar análise comparativa. Verifique os dados disponíveis.";

    return {
      lojaNome: loja.nome,
      tipoComparacao,
      periodoFuturo,
      periodo1: {
        label: periodo1.label,
        dados: dados1
      },
      periodo2: {
        label: periodo2.label,
        dados: dados2
      },
      variacoes,
      analiseIA: typeof analiseIA === 'string' ? analiseIA : JSON.stringify(analiseIA)
    };

  } catch (error) {
    console.error("Erro ao comparar períodos:", error);
    throw new Error("Falha ao comparar períodos. Tente novamente.");
  }
}
