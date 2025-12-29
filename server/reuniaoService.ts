import { invokeLLM } from "./_core/llm";

/**
 * Gera resumo estruturado de uma reunião usando IA
 * Retorna: resumo compacto, tópicos principais, ações a tomar
 */
export async function gerarResumoReuniaoComIA(
  conteudo: string,
  tipoReuniao: "gestores" | "lojas"
): Promise<{
  resumo: string;
  topicos: string[];
  acoes: Array<{ descricao: string; prioridade: "alta" | "media" | "baixa" }>;
}> {
  const prompt = `Analisa o seguinte conteúdo de uma reunião ${tipoReuniao === "gestores" ? "de gestores" : "de loja"} e gera:

1. **Resumo Compacto**: Um parágrafo breve (máximo 3 frases) resumindo os pontos principais
2. **Tópicos Principais**: Lista de 3-5 tópicos discutidos
3. **Ações a Tomar**: Lista de ações concretas identificadas, com prioridade (alta/media/baixa)

Conteúdo da Reunião:
${conteudo}

Responde em formato JSON com esta estrutura:
{
  "resumo": "texto do resumo",
  "topicos": ["tópico 1", "tópico 2", ...],
  "acoes": [
    {"descricao": "ação 1", "prioridade": "alta"},
    {"descricao": "ação 2", "prioridade": "media"}
  ]
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "És um assistente especializado em análise de reuniões operacionais. Gera resumos concisos e identifica ações práticas.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "resumo_reuniao",
        strict: true,
        schema: {
          type: "object",
          properties: {
            resumo: {
              type: "string",
              description: "Resumo compacto da reunião em 2-3 frases",
            },
            topicos: {
              type: "array",
              items: { type: "string" },
              description: "Lista de 3-5 tópicos principais discutidos",
            },
            acoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  descricao: {
                    type: "string",
                    description: "Descrição clara da ação a tomar",
                  },
                  prioridade: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description: "Nível de prioridade da ação",
                  },
                },
                required: ["descricao", "prioridade"],
                additionalProperties: false,
              },
              description: "Lista de ações identificadas",
            },
          },
          required: ["resumo", "topicos", "acoes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Falha ao gerar resumo da reunião");
  }

  return JSON.parse(content);
}

/**
 * Gera mini resumo da última reunião de uma loja
 * Usado para mostrar contexto ao iniciar nova reunião
 */
export async function gerarMiniResumoReuniaoAnterior(
  reuniaoAnterior: {
    data: Date;
    conteudo: string;
    resumoIA: string | null;
  } | null
): Promise<string | null> {
  if (!reuniaoAnterior) {
    return null;
  }

  // Se já tem resumo IA, usar esse
  if (reuniaoAnterior.resumoIA) {
    const resumo = JSON.parse(reuniaoAnterior.resumoIA);
    return `**Última Reunião:** ${new Date(reuniaoAnterior.data).toLocaleDateString("pt-PT")}

**Resumo:** ${resumo.resumo}

**Pendentes da reunião anterior:** ${resumo.acoes.length > 0 ? resumo.acoes.map((a: any) => `\n- ${a.descricao}`).join("") : "Nenhum"}`;
  }

  // Se não tem resumo, criar um mini resumo do conteúdo
  return `**Última Reunião:** ${new Date(reuniaoAnterior.data).toLocaleDateString("pt-PT")}

**Conteúdo:** ${reuniaoAnterior.conteudo.substring(0, 200)}${reuniaoAnterior.conteudo.length > 200 ? "..." : ""}`;
}
