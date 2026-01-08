import { invokeLLM } from "./_core/llm";
import * as db from "./db";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface QueryParams {
  lojaId?: number;
  lojaNome?: string;
  mes?: number;
  ano?: number;
  metrica?: string;
  tipoConsulta?: "servicos" | "reparacoes" | "objetivo" | "desvio" | "taxa" | "comparacao" | "ranking" | "evolucao" | "geral";
}

const MESES_PT: { [key: string]: number } = {
  "janeiro": 1, "jan": 1,
  "fevereiro": 2, "fev": 2,
  "março": 3, "mar": 3,
  "abril": 4, "abr": 4,
  "maio": 5, "mai": 5,
  "junho": 6, "jun": 6,
  "julho": 7, "jul": 7,
  "agosto": 8, "ago": 8,
  "setembro": 9, "set": 9,
  "outubro": 10, "out": 10,
  "novembro": 11, "nov": 11,
  "dezembro": 12, "dez": 12,
};

/**
 * Processa uma pergunta do utilizador sobre dados de resultados
 */
export async function processarPergunta(
  pergunta: string,
  historico: ChatMessage[] = [],
  userId: number,
  userRole: string
): Promise<{ resposta: string; dados?: any }> {
  try {
    // 1. Obter lista de lojas para contexto
    const lojas = await db.getAllLojas();
    const lojasNomes = lojas.map(l => l.nome).join(", ");
    
    // 2. Obter períodos disponíveis
    const periodos = await db.getPeriodosDisponiveis();
    const periodosStr = periodos.map(p => `${p.mes}/${p.ano}`).join(", ");
    
    // 3. Usar IA para interpretar a pergunta e extrair parâmetros
    const interpretacaoPrompt = `Analisa a seguinte pergunta sobre dados de lojas e extrai os parâmetros relevantes.

Lojas disponíveis: ${lojasNomes}
Períodos com dados: ${periodosStr}

Pergunta do utilizador: "${pergunta}"

Extrai os seguintes parâmetros em formato JSON:
{
  "lojaNome": "nome da loja mencionada ou null",
  "mes": número do mês (1-12) ou null,
  "ano": ano (ex: 2025) ou null,
  "tipoConsulta": "servicos" | "reparacoes" | "objetivo" | "desvio" | "taxa" | "comparacao" | "ranking" | "evolucao" | "geral",
  "metrica": "totalServicos" | "taxaReparacao" | "desvioPercentualMes" | "objetivoMensal" | "qtdReparacoes" | null,
  "perguntaEntendida": true/false,
  "resumoPergunta": "resumo curto do que o utilizador quer saber"
}

Se o mês for mencionado por nome (ex: "agosto"), converte para número.
Se o ano não for mencionado, assume o ano atual (2025).
Se a loja não for encontrada exatamente, tenta encontrar a mais parecida.

Responde APENAS com o JSON, sem texto adicional.`;

    const interpretacaoResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "És um assistente que interpreta perguntas sobre dados de lojas. Respondes sempre em JSON válido.",
        },
        { role: "user", content: interpretacaoPrompt },
      ],
    });

    let params: QueryParams & { perguntaEntendida: boolean; resumoPergunta: string };
    try {
      const content = interpretacaoResponse.choices[0].message.content;
      const jsonStr = typeof content === 'string' ? content : '';
      // Limpar possíveis caracteres extras
      const cleanJson = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      params = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Erro ao parsear interpretação:", e);
      return {
        resposta: "Desculpe, não consegui entender a sua pergunta. Pode reformular? Por exemplo: 'Quantos serviços fez a loja Viana em Agosto de 2025?'"
      };
    }

    if (!params.perguntaEntendida) {
      return {
        resposta: "Não consegui entender completamente a sua pergunta. Pode ser mais específico? Por exemplo:\n- 'Quantos serviços fez Viana em Agosto?'\n- 'Qual a taxa de reparação de Braga em Julho?'\n- 'Quais as 5 melhores lojas em serviços?'"
      };
    }

    // 4. Encontrar a loja pelo nome (se especificada)
    let lojaId: number | undefined;
    if (params.lojaNome) {
      const lojaEncontrada = lojas.find(l => 
        l.nome.toLowerCase().includes(params.lojaNome!.toLowerCase()) ||
        params.lojaNome!.toLowerCase().includes(l.nome.toLowerCase())
      );
      if (lojaEncontrada) {
        lojaId = lojaEncontrada.id;
        params.lojaNome = lojaEncontrada.nome;
      }
    }

    // 5. Definir período padrão se não especificado
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    const mes = params.mes || mesAtual;
    const ano = params.ano || anoAtual;

    // 6. Buscar dados relevantes com base no tipo de consulta
    let dados: any = null;
    let contextoResposta = "";

    switch (params.tipoConsulta) {
      case "servicos":
      case "reparacoes":
      case "objetivo":
      case "desvio":
      case "taxa":
      case "geral":
        if (lojaId) {
          // Consulta específica de uma loja
          const resultados = await db.getResultadosMensais({ mes, ano, lojaId }, { id: userId, role: userRole } as any);
          if (resultados && resultados.length > 0) {
            dados = resultados[0];
            contextoResposta = `Dados da loja ${params.lojaNome} em ${mes}/${ano}:
- Total de Serviços: ${dados.totalServicos || 'N/A'}
- Objetivo Mensal: ${dados.objetivoMensal || 'N/A'}
- Desvio vs Objetivo: ${dados.desvioPercentualMes ? (parseFloat(dados.desvioPercentualMes) * 100).toFixed(1) + '%' : 'N/A'}
- Taxa de Reparação: ${dados.taxaReparacao ? (parseFloat(dados.taxaReparacao) * 100).toFixed(1) + '%' : 'N/A'}
- Quantidade de Reparações: ${dados.qtdReparacoes || 'N/A'}
- Serviços por Colaborador: ${dados.servicosPorColaborador || 'N/A'}
- Número de Colaboradores: ${dados.numColaboradores || 'N/A'}`;
          } else {
            contextoResposta = `Não foram encontrados dados para a loja ${params.lojaNome} no período ${mes}/${ano}.`;
          }
        } else {
          // Estatísticas gerais
          const stats = await db.getEstatisticasPeriodo(mes, ano);
          if (stats) {
            dados = stats;
            contextoResposta = `Estatísticas gerais da rede em ${mes}/${ano}:
- Total de Lojas: ${stats.totalLojas || 0}
- Soma de Serviços: ${stats.somaServicos || 0}
- Soma de Objetivos: ${stats.somaObjetivos || 0}
- Média de Desvio: ${stats.mediaDesvioPercentual ? (stats.mediaDesvioPercentual * 100).toFixed(1) + '%' : 'N/A'}
- Média Taxa Reparação: ${stats.mediaTaxaReparacao ? (stats.mediaTaxaReparacao * 100).toFixed(1) + '%' : 'N/A'}
- Lojas Acima do Objetivo: ${stats.lojasAcimaObjetivo || 0}`;
          }
        }
        break;

      case "ranking":
        const metrica = params.metrica || 'totalServicos';
        const ranking = await db.getRankingLojas(metrica as any, mes, ano, 10);
        if (ranking && ranking.length > 0) {
          dados = ranking;
          contextoResposta = `Ranking de lojas por ${metrica} em ${mes}/${ano}:\n`;
          ranking.forEach((r, i) => {
            contextoResposta += `${i + 1}. ${r.lojaNome}: ${r.valor || 'N/A'}\n`;
          });
        }
        break;

      case "evolucao":
        if (lojaId) {
          const evolucao = await db.getEvolucaoMensal(lojaId, 6);
          if (evolucao && evolucao.length > 0) {
            dados = evolucao;
            contextoResposta = `Evolução da loja ${params.lojaNome} nos últimos meses:\n`;
            evolucao.forEach(e => {
              contextoResposta += `${e.mes}/${e.ano}: ${e.totalServicos} serviços (objetivo: ${e.objetivoMensal})\n`;
            });
          }
        } else {
          const evolucaoGlobal = await db.getEvolucaoGlobal(6);
          if (evolucaoGlobal && evolucaoGlobal.length > 0) {
            dados = evolucaoGlobal;
            contextoResposta = `Evolução global da rede nos últimos meses:\n`;
            evolucaoGlobal.forEach(e => {
              contextoResposta += `${e.mes}/${e.ano}: ${e.totalServicos} serviços\n`;
            });
          }
        }
        break;

      case "comparacao":
        // Para comparação, precisamos de mais contexto
        const todasLojas = await db.getResultadosMensais({ mes, ano }, { id: userId, role: userRole } as any);
        if (todasLojas && todasLojas.length > 0) {
          dados = todasLojas;
          contextoResposta = `Dados de todas as lojas em ${mes}/${ano} para comparação:\n`;
          todasLojas.slice(0, 10).forEach(l => {
            contextoResposta += `- ${l.lojaNome}: ${l.totalServicos} serviços\n`;
          });
        }
        break;

      default:
        // Tentar buscar dados gerais
        const statsGerais = await db.getEstatisticasPeriodo(mes, ano);
        if (statsGerais) {
          dados = statsGerais;
          contextoResposta = `Estatísticas gerais em ${mes}/${ano}: ${statsGerais.somaServicos} serviços totais, ${statsGerais.totalLojas} lojas.`;
        }
    }

    // 7. Gerar resposta natural com IA
    const respostaPrompt = `Com base nos seguintes dados, responde à pergunta do utilizador de forma clara e natural em português europeu.

Pergunta original: "${pergunta}"
Resumo da pergunta: ${params.resumoPergunta}

Dados encontrados:
${contextoResposta}

Instruções:
- Responde de forma direta e concisa
- Usa números e percentagens quando relevante
- Se os dados não existirem, informa educadamente
- Mantém um tom profissional mas amigável
- Se apropriado, oferece informação adicional relevante
- Não uses formatação markdown complexa, apenas texto simples`;

    const respostaResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "És um assistente de dados especializado em análise de performance de lojas. Respondes sempre em português europeu, de forma clara e útil.",
        },
        ...historico.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: respostaPrompt },
      ],
    });

    const resposta = respostaResponse.choices[0].message.content;
    
    return {
      resposta: typeof resposta === 'string' ? resposta : "Desculpe, ocorreu um erro ao gerar a resposta.",
      dados
    };

  } catch (error) {
    console.error("Erro no chatbot:", error);
    return {
      resposta: "Desculpe, ocorreu um erro ao processar a sua pergunta. Por favor, tente novamente."
    };
  }
}

/**
 * Obtém sugestões de perguntas baseadas nos dados disponíveis
 */
export async function getSugestoesPergunta(): Promise<string[]> {
  const periodos = await db.getPeriodosDisponiveis();
  const ultimoPeriodo = periodos[0];
  
  if (!ultimoPeriodo) {
    return [
      "Quais lojas têm dados disponíveis?",
      "Qual o período mais recente com dados?",
    ];
  }

  const mesNome = Object.entries(MESES_PT).find(([_, v]) => v === ultimoPeriodo.mes)?.[0] || ultimoPeriodo.mes;
  
  return [
    `Quantos serviços foram feitos em ${mesNome} de ${ultimoPeriodo.ano}?`,
    `Qual a loja com mais serviços em ${mesNome}?`,
    `Qual a taxa de reparação média da rede?`,
    `Quais lojas estão abaixo do objetivo?`,
    `Como está a evolução de serviços nos últimos meses?`,
    `Qual a loja com melhor taxa de reparação?`,
  ];
}
