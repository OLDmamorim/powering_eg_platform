import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Gera sugestões de melhoria baseadas no conteúdo de um relatório
 */
export async function gerarSugestoesMelhoria(
  relatorioId: number,
  tipoRelatorio: 'livre' | 'completo',
  lojaId: number,
  gestorId: number,
  conteudoRelatorio: string
): Promise<Array<{
  sugestao: string;
  categoria: 'stock' | 'epis' | 'limpeza' | 'atendimento' | 'documentacao' | 'equipamentos' | 'geral';
  prioridade: 'baixa' | 'media' | 'alta';
}>> {
  try {
    // Obter histórico de sugestões anteriores para esta loja
    const sugestoesAnteriores = await db.getSugestoesRecentesByLoja(lojaId, 5);
    const historicoSugestoes = sugestoesAnteriores.map(s => s.sugestao).join('\n- ');
    
    // Obter informação da loja
    const loja = await db.getLojaById(lojaId);
    const lojaNome = loja?.nome || 'Loja';
    
    const prompt = `Analisa o seguinte relatório de visita à loja "${lojaNome}" e sugere melhorias concretas e acionáveis.

CONTEÚDO DO RELATÓRIO:
${conteudoRelatorio}

${historicoSugestoes ? `SUGESTÕES ANTERIORES (evita repetir):
- ${historicoSugestoes}` : ''}

Gera 1 a 3 sugestões de melhoria que sejam:
- Específicas e acionáveis
- Baseadas no conteúdo do relatório
- Diferentes das sugestões anteriores
- Em português de Portugal

Para cada sugestão, indica:
- categoria: "stock", "epis", "limpeza", "atendimento", "documentacao", "equipamentos" ou "geral"
- prioridade: "baixa", "media" ou "alta" (baseada na urgência do problema)

Responde APENAS com JSON válido no formato:
{
  "sugestoes": [
    {
      "sugestao": "Implementar checklist diário de verificação de EPIs",
      "categoria": "epis",
      "prioridade": "alta"
    }
  ]
}

Se o relatório for muito positivo sem problemas, retorna {"sugestoes": []} ou uma sugestão de manutenção.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "És um consultor de operações de retalho especializado em melhoria contínua. Dás sugestões práticas e específicas em português de Portugal." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sugestoes_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sugestoes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    sugestao: { type: "string" },
                    categoria: { type: "string", enum: ["stock", "epis", "limpeza", "atendimento", "documentacao", "equipamentos", "geral"] },
                    prioridade: { type: "string", enum: ["baixa", "media", "alta"] }
                  },
                  required: ["sugestao", "categoria", "prioridade"],
                  additionalProperties: false
                }
              }
            },
            required: ["sugestoes"],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }
    
    const resultado = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    
    // Guardar sugestões na base de dados
    for (const sugestao of resultado.sugestoes) {
      await db.criarSugestaoMelhoria({
        relatorioId,
        tipoRelatorio,
        lojaId,
        gestorId,
        sugestao: sugestao.sugestao,
        categoria: sugestao.categoria,
        prioridade: sugestao.prioridade,
      });
    }
    
    return resultado.sugestoes;
    
  } catch (error) {
    console.error('[SugestaoService] Erro ao gerar sugestões:', error);
    return [];
  }
}

/**
 * Formata o conteúdo de um relatório livre para análise
 */
export function formatarRelatorioLivre(relatorio: {
  descricao: string;
  dataVisita: Date;
}): string {
  return `Data da Visita: ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}

Descrição:
${relatorio.descricao}`;
}

/**
 * Formata o conteúdo de um relatório completo para análise
 */
export function formatarRelatorioCompleto(relatorio: {
  dataVisita: Date;
  episFardamento?: string | null;
  kitPrimeirosSocorros?: string | null;
  consumiveis?: string | null;
  espacoFisico?: string | null;
  reclamacoes?: string | null;
  vendasComplementares?: string | null;
  fichasServico?: string | null;
  documentacaoObrigatoria?: string | null;
  reuniaoQuinzenal?: boolean | null;
  resumoSupervisao?: string | null;
  colaboradoresPresentes?: string | null;
  pontosPositivos?: string | null;
  pontosNegativos?: string | null;
}): string {
  const secoes = [];
  
  secoes.push(`Data da Visita: ${new Date(relatorio.dataVisita).toLocaleDateString('pt-PT')}`);
  
  if (relatorio.episFardamento) secoes.push(`EPIs e Fardamento: ${relatorio.episFardamento}`);
  if (relatorio.kitPrimeirosSocorros) secoes.push(`Kit Primeiros Socorros: ${relatorio.kitPrimeirosSocorros}`);
  if (relatorio.consumiveis) secoes.push(`Consumíveis: ${relatorio.consumiveis}`);
  if (relatorio.espacoFisico) secoes.push(`Espaço Físico: ${relatorio.espacoFisico}`);
  if (relatorio.reclamacoes) secoes.push(`Reclamações: ${relatorio.reclamacoes}`);
  if (relatorio.vendasComplementares) secoes.push(`Vendas Complementares: ${relatorio.vendasComplementares}`);
  if (relatorio.fichasServico) secoes.push(`Fichas de Serviço: ${relatorio.fichasServico}`);
  if (relatorio.documentacaoObrigatoria) secoes.push(`Documentação Obrigatória: ${relatorio.documentacaoObrigatoria}`);
  if (relatorio.reuniaoQuinzenal !== null) secoes.push(`Reunião Quinzenal: ${relatorio.reuniaoQuinzenal ? 'Sim' : 'Não'}`);
  if (relatorio.resumoSupervisao) secoes.push(`Resumo da Supervisão: ${relatorio.resumoSupervisao}`);
  if (relatorio.colaboradoresPresentes) secoes.push(`Colaboradores Presentes: ${relatorio.colaboradoresPresentes}`);
  if (relatorio.pontosPositivos) secoes.push(`Pontos Positivos: ${relatorio.pontosPositivos}`);
  if (relatorio.pontosNegativos) secoes.push(`Pontos Negativos: ${relatorio.pontosNegativos}`);
  
  return secoes.join('\n\n');
}
