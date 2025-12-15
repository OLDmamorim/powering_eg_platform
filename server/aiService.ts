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
}

/**
 * Gera relatório automático com análise de IA
 */
export async function gerarRelatorioComIA(
  periodo: "diario" | "semanal" | "mensal" | "trimestral",
  gestorId?: number
): Promise<AnaliseIA> {
  // Buscar relatórios do período
  const dataInicio = calcularDataInicio(periodo);
  const relatoriosLivres = gestorId
    ? await db.getRelatoriosLivresByGestorId(gestorId)
    : await db.getAllRelatoriosLivres();
  const relatoriosCompletos = gestorId
    ? await db.getRelatoriosCompletosByGestorId(gestorId)
    : await db.getAllRelatoriosCompletos();

  // Filtrar por período
  const relatoriosLivresFiltrados = relatoriosLivres.filter(
    (r) => new Date(r.dataVisita) >= dataInicio
  );
  const relatoriosCompletosFiltrados = relatoriosCompletos.filter(
    (r) => new Date(r.dataVisita) >= dataInicio
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

  const prompt = `Analisa os seguintes relatórios de supervisão de lojas da Express Glass do período ${periodo}:

${relatoriosTexto}

${pontosDestacadosTexto}

Com base nestes relatórios e nos pontos destacados pelos gestores, identifica:
1. 3-5 pontos positivos principais (aspetos bem executados, melhorias observadas)
2. 3-5 pontos negativos principais (problemas recorrentes, áreas de preocupação)
3. 3-5 sugestões práticas para melhorar a operação
4. Análise específica dos pontos positivos e negativos destacados pelos gestores, identificando padrões e tendências

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
            },
            required: ["pontosPositivos", "pontosNegativos", "sugestoes", "resumo", "analisePontosDestacados"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analise = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

    return {
      lojaMaisVisitada,
      lojaMenosVisitada,
      frequenciaVisitas,
      pontosPositivos: analise.pontosPositivos,
      pontosNegativos: analise.pontosNegativos,
      sugestoes: analise.sugestoes,
      resumo: analise.resumo,
      analisePontosDestacados: analise.analisePontosDestacados,
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
    };
  }
}

function calcularDataInicio(
  periodo: "diario" | "semanal" | "mensal" | "trimestral"
): Date {
  const agora = new Date();
  switch (periodo) {
    case "diario":
      return new Date(agora.setDate(agora.getDate() - 1));
    case "semanal":
      return new Date(agora.setDate(agora.getDate() - 7));
    case "mensal":
      return new Date(agora.setMonth(agora.getMonth() - 1));
    case "trimestral":
      return new Date(agora.setMonth(agora.getMonth() - 3));
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

  const prompt = `És um assistente de gestão da plataforma PoweringEG (supervisão de lojas Express Glass).
  
Dados atuais do dashboard:
- Total de lojas: ${totalLojas}
- Total de gestores: ${totalGestores}
- Relatórios livres este mês: ${relatoriosLivresMes}
- Relatórios completos este mês: ${relatoriosCompletosMes}
- Pendentes ativos: ${pendentesAtivos}
- Alertas pendentes: ${alertasPendentes}
- Utilizador: ${userName} (${isAdmin ? 'Administrador' : 'Gestor'})

Gera UMA ÚNICA frase curta (máximo 15 palavras) e motivadora/útil para mostrar no dashboard.
A frase deve ser:
- Personalizada com base nos dados (ex: se há pendentes, sugerir resolvê-los; se há alertas, chamar atenção)
- Em português europeu
- Positiva e encorajadora
- Prática e acionável quando possível

Exemplos de estilo:
- "Tens 3 pendentes por resolver. Que tal começar por aí?"
- "Excelente! Todas as lojas foram visitadas esta semana."
- "Há 2 alertas que precisam da tua atenção."
- "Bom trabalho! Os relatórios estão em dia."

Responde APENAS com a frase, sem aspas nem formatação extra.`;

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
    
    // Fallback com dicas estáticas baseadas nos dados
    if (pendentesAtivos > 0) {
      return `Tens ${pendentesAtivos} pendente${pendentesAtivos > 1 ? 's' : ''} por resolver. Vamos a isso!`;
    }
    if (alertasPendentes > 0) {
      return `Atenção: ${alertasPendentes} alerta${alertasPendentes > 1 ? 's' : ''} a aguardar revisão.`;
    }
    if (totalRelatorios === 0) {
      return "Ainda não há relatórios este mês. Altura de fazer uma visita!";
    }
    return "Tudo em ordem! Continua o bom trabalho.";
  }
}
