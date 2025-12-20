import { invokeLLM } from "./_core/llm";
import * as db from "./db";

interface ResumoGlobal {
  resumoExecutivo: string;
  pontosPositivos: string[];
  pontosNegativos: string[];
  acoesRecomendadas: string[];
  insights: string[];
  estatisticas: {
    totalVisitas: number;
    pendentesAtivos: number;
    lojasVisitadas: number;
    taxaResolucao: number;
    visitasPorMes?: any[];
    pendentesPorCategoria?: any[];
    distribuicaoPorLoja?: any[];
  };
}

export async function gerarResumoGlobal(gestorId: number): Promise<ResumoGlobal> {
  try {
    // Buscar dados do mês atual (calendário)
    const agora = new Date();
    const dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);

    // Buscar relatórios livres do mês atual (apenas do gestor)
    const relatoriosLivres = await db.getRelatoriosLivresByGestorId(gestorId);
    const relatoriosLivresRecentes = relatoriosLivres.filter((r: any) => {
      const dataVisita = new Date(r.dataVisita);
      return dataVisita >= dataInicio && dataVisita <= dataFim;
    });

    // Buscar relatórios completos do mês atual (apenas do gestor)
    const relatoriosCompletos = await db.getRelatoriosCompletosByGestorId(gestorId);
    const relatoriosCompletosRecentes = relatoriosCompletos.filter((r: any) => {
      const dataVisita = new Date(r.dataVisita);
      return dataVisita >= dataInicio && dataVisita <= dataFim;
    });

    // Buscar pendentes (apenas do gestor)
    const pendentes = await db.getPendentesByGestorId(gestorId);
    const pendentesAtivos = pendentes.filter((p: any) => !p.resolvido);

    // Calcular estatísticas
    const totalVisitas = relatoriosLivresRecentes.length + relatoriosCompletosRecentes.length;
    const lojasUnicas = new Set([
      ...relatoriosLivresRecentes.map((r: any) => r.lojaId),
      ...relatoriosCompletosRecentes.map((r: any) => r.lojasIds?.[0]).filter(Boolean)
    ]);
    const lojasVisitadas = lojasUnicas.size;

    // Taxa de resolução de pendentes
    const pendentesResolvidos = pendentes.filter((p: any) => p.status === 'resolvido').length;
    const taxaResolucao = pendentes.length > 0 
      ? Math.round((pendentesResolvidos / pendentes.length) * 100) 
      : 0;

    // Preparar contexto para IA
    const contexto = `
Análise de Relatórios de Visitas - Mês Atual

ESTATÍSTICAS:
- Total de visitas: ${totalVisitas}
- Relatórios livres: ${relatoriosLivresRecentes.length}
- Relatórios completos: ${relatoriosCompletosRecentes.length}
- Lojas visitadas: ${lojasVisitadas}
- Pendentes ativos: ${pendentesAtivos.length}
- Taxa de resolução de pendentes: ${taxaResolucao}%

RELATÓRIOS LIVRES (amostra):
${relatoriosLivresRecentes.slice(0, 10).map((r: any) => `
- Loja: ${r.loja?.nome || 'N/A'}
  Data: ${new Date(r.dataVisita).toLocaleDateString('pt-PT')}
  Descrição: ${r.descricao?.substring(0, 200) || 'Sem descrição'}
`).join('\n')}

RELATÓRIOS COMPLETOS (amostra):
${relatoriosCompletosRecentes.slice(0, 10).map((r: any) => `
- Lojas: ${r.lojasNomes || 'N/A'}
  Data: ${new Date(r.dataVisita).toLocaleDateString('pt-PT')}
  Pontos Positivos: ${r.pontosPositivos?.substring(0, 150) || 'N/A'}
  Pontos Negativos: ${r.pontosNegativos?.substring(0, 150) || 'N/A'}
`).join('\n')}

PENDENTES ATIVOS (amostra):
${pendentesAtivos.slice(0, 15).map((p: any) => `
- ${p.descricao} (Loja: ${p.loja?.nome || 'N/A'}, Categoria: ${p.categoria?.nome || 'N/A'})
`).join('\n')}
`;

    // Gerar análise com IA
    const prompt = `Você é um analista de operações especializado em gestão de lojas e supervisão de equipas.

Analise os dados fornecidos e gere um resumo executivo profissional em português europeu.

${contexto}

Forneça a análise no seguinte formato JSON:
{
  "resumoExecutivo": "Parágrafo de 3-4 frases resumindo a situação geral",
  "pontosPositivos": ["ponto 1", "ponto 2", "ponto 3"],
  "pontosNegativos": ["ponto 1", "ponto 2", "ponto 3"],
  "acoesRecomendadas": ["ação 1", "ação 2", "ação 3"],
  "insights": ["insight 1", "insight 2", "insight 3"]
}

Seja específico, objetivo e baseie-se nos dados fornecidos.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um analista de operações especializado. Responda sempre em JSON válido." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resumo_global",
          strict: true,
          schema: {
            type: "object",
            properties: {
              resumoExecutivo: { type: "string" },
              pontosPositivos: { 
                type: "array",
                items: { type: "string" }
              },
              pontosNegativos: { 
                type: "array",
                items: { type: "string" }
              },
              acoesRecomendadas: { 
                type: "array",
                items: { type: "string" }
              },
              insights: { 
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["resumoExecutivo", "pontosPositivos", "pontosNegativos", "acoesRecomendadas", "insights"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    const analise = JSON.parse(typeof content === 'string' ? content : "{}");

    return {
      resumoExecutivo: analise.resumoExecutivo || "Análise não disponível",
      pontosPositivos: analise.pontosPositivos || [],
      pontosNegativos: analise.pontosNegativos || [],
      acoesRecomendadas: analise.acoesRecomendadas || [],
      insights: analise.insights || [],
      estatisticas: {
        totalVisitas,
        pendentesAtivos: pendentesAtivos.length,
        lojasVisitadas,
        taxaResolucao,
      }
    };

  } catch (error) {
    console.error("Erro ao gerar resumo global:", error);
    
    // Retornar resumo básico em caso de erro
    return {
      resumoExecutivo: "Erro ao gerar análise automática. Por favor, tente novamente.",
      pontosPositivos: [],
      pontosNegativos: [],
      acoesRecomendadas: [],
      insights: [],
      estatisticas: {
        totalVisitas: 0,
        pendentesAtivos: 0,
        lojasVisitadas: 0,
        taxaResolucao: 0,
      }
    };
  }
}
