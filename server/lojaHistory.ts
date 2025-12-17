import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export interface LojaHistoryResult {
  resumoGeral: string;
  evolucao: {
    periodo: string;
    descricao: string;
  }[];
  problemasRecorrentes: {
    problema: string;
    frequencia: string;
    gravidade: "baixa" | "média" | "alta";
  }[];
  pontosFortes: string[];
  tendencias: string[];
  recomendacoes: {
    prioridade: "alta" | "média" | "baixa";
    recomendacao: string;
    justificativa: string;
  }[];
}

/**
 * Gera histórico inteligente da loja baseado em todos os relatórios
 */
export async function generateLojaHistory(lojaId: number): Promise<LojaHistoryResult> {
  try {
    // Buscar todos os relatórios da loja
    const allRelatoriosLivres = await db.getAllRelatoriosLivres();
    const relatoriosLivres = allRelatoriosLivres.filter(r => r.lojaId === lojaId);
    
    const allRelatoriosCompletos = await db.getAllRelatoriosCompletos();
    const relatoriosCompletos = allRelatoriosCompletos.filter(r => r.lojaId === lojaId);
    
    const pendentes = await db.getPendentesByLojaId(lojaId);
    
    if (relatoriosLivres.length === 0 && relatoriosCompletos.length === 0) {
      throw new Error("Nenhum relatório encontrado para esta loja");
    }

    // Preparar dados para a IA
    const relatoriosData = {
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
      })),
      pendentes: pendentes.map((p: any) => ({
        descricao: p.descricao,
        resolvido: p.resolvido,
        dataCriacao: p.createdAt,
        dataResolucao: p.resolvedAt,
      })),
      totalRelatorios: relatoriosLivres.length + relatoriosCompletos.length,
      totalPendentes: pendentes.length,
      pendentesResolvidos: pendentes.filter((p: any) => p.resolvido).length,
    };

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `És um analista especializado em supervisão de lojas Express Glass.
Analisa o histórico completo de relatórios de uma loja e gera insights inteligentes sobre:
- Evolução ao longo do tempo (melhoria, estagnação, deterioração)
- Problemas recorrentes que aparecem em múltiplos relatórios
- Pontos fortes consistentes da loja
- Tendências e padrões identificados
- Recomendações prioritárias baseadas nos dados

Sê específico, objetivo e baseado em dados concretos.`
        },
        {
          role: "user",
          content: `Analisa o histórico completo desta loja e gera um resumo inteligente:

${JSON.stringify(relatoriosData, null, 2)}

Identifica padrões, evolução, problemas recorrentes e gera recomendações prioritárias.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "loja_history",
          strict: true,
          schema: {
            type: "object",
            properties: {
              resumoGeral: {
                type: "string",
                description: "Resumo geral da loja em 2-3 frases (máx 200 caracteres)"
              },
              evolucao: {
                type: "array",
                description: "Evolução da loja ao longo do tempo dividida em períodos",
                items: {
                  type: "object",
                  properties: {
                    periodo: {
                      type: "string",
                      description: "Período temporal (ex: 'Últimos 3 meses', 'Início do ano')"
                    },
                    descricao: {
                      type: "string",
                      description: "Descrição da evolução nesse período"
                    }
                  },
                  required: ["periodo", "descricao"],
                  additionalProperties: false
                }
              },
              problemasRecorrentes: {
                type: "array",
                description: "Problemas que aparecem repetidamente nos relatórios",
                items: {
                  type: "object",
                  properties: {
                    problema: {
                      type: "string",
                      description: "Descrição do problema recorrente"
                    },
                    frequencia: {
                      type: "string",
                      description: "Frequência do problema (ex: 'Em 80% das visitas', 'Mensal')"
                    },
                    gravidade: {
                      type: "string",
                      enum: ["baixa", "média", "alta"],
                      description: "Gravidade do problema"
                    }
                  },
                  required: ["problema", "frequencia", "gravidade"],
                  additionalProperties: false
                }
              },
              pontosFortes: {
                type: "array",
                description: "Pontos fortes consistentes da loja",
                items: {
                  type: "string"
                }
              },
              tendencias: {
                type: "array",
                description: "Tendências identificadas (melhorias, deteriorações, padrões)",
                items: {
                  type: "string"
                }
              },
              recomendacoes: {
                type: "array",
                description: "Recomendações prioritárias baseadas na análise",
                items: {
                  type: "object",
                  properties: {
                    prioridade: {
                      type: "string",
                      enum: ["alta", "média", "baixa"],
                      description: "Prioridade da recomendação"
                    },
                    recomendacao: {
                      type: "string",
                      description: "Descrição da recomendação"
                    },
                    justificativa: {
                      type: "string",
                      description: "Justificativa baseada nos dados"
                    }
                  },
                  required: ["prioridade", "recomendacao", "justificativa"],
                  additionalProperties: false
                }
              }
            },
            required: ["resumoGeral", "evolucao", "problemasRecorrentes", "pontosFortes", "tendencias", "recomendacoes"],
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
    const result = JSON.parse(contentStr) as LojaHistoryResult;
    return result;

  } catch (error) {
    console.error("Erro ao gerar histórico da loja:", error);
    throw new Error("Falha ao gerar histórico da loja. Tente novamente.");
  }
}
