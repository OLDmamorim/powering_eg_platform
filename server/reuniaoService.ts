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

/**
 * Gera PDF de uma reunião
 */
export async function gerarPDFReuniao(reuniao: any, tipo: 'gestores' | 'lojas'): Promise<Buffer> {
  // Usar biblioteca de geração de PDF (por exemplo, PDFKit ou similar)
  // Por agora, retornar um buffer vazio como placeholder
  
  const resumoIA = reuniao.resumoIA ? JSON.parse(reuniao.resumoIA) : null;
  
  let pdfContent = `REUNIÃO ${tipo.toUpperCase()}\n\n`;
  pdfContent += `Data: ${new Date(reuniao.data).toLocaleDateString('pt-PT')}\n`;
  pdfContent += `Criado por: ${reuniao.criadoPorNome}\n\n`;
  
  if (tipo === 'lojas' && reuniao.lojasNomes) {
    pdfContent += `Lojas: ${reuniao.lojasNomes.join(', ')}\n`;
    pdfContent += `Presenças: ${reuniao.presencas}\n\n`;
  } else if (tipo === 'gestores') {
    const presencas = JSON.parse(reuniao.presencas);
    pdfContent += `Presenças: ${presencas.length} gestores\n`;
    if (reuniao.outrosPresentes) {
      pdfContent += `Outros presentes: ${reuniao.outrosPresentes}\n`;
    }
    pdfContent += `\n`;
  }
  
  if (resumoIA) {
    pdfContent += `RESUMO:\n${resumoIA.resumo}\n\n`;
    
    if (resumoIA.topicos.length > 0) {
      pdfContent += `TÓPICOS PRINCIPAIS:\n`;
      resumoIA.topicos.forEach((t: string, i: number) => {
        pdfContent += `${i + 1}. ${t}\n`;
      });
      pdfContent += `\n`;
    }
    
    if (resumoIA.acoes.length > 0) {
      pdfContent += `AÇÕES IDENTIFICADAS:\n`;
      resumoIA.acoes.forEach((a: any, i: number) => {
        pdfContent += `${i + 1}. [${a.prioridade.toUpperCase()}] ${a.descricao}\n`;
      });
      pdfContent += `\n`;
    }
  }
  
  pdfContent += `CONTEÚDO COMPLETO:\n${reuniao.conteudo}\n`;
  
  // Adicionar anexos se existirem
  if (reuniao.anexos) {
    const anexos = JSON.parse(reuniao.anexos);
    if (anexos.length > 0) {
      pdfContent += `\nANEXOS (${anexos.length}):\n`;
      anexos.forEach((anexo: any, i: number) => {
        pdfContent += `${i + 1}. ${anexo.nome} (${anexo.tipo})\n`;
        pdfContent += `   URL: ${anexo.url}\n`;
      });
    }
  }
  
  // Por agora, retornar o conteúdo como texto simples em buffer
  // TODO: Implementar geração de PDF real com formatação
  return Buffer.from(pdfContent, 'utf-8');
}


/**
 * Gera relatório estruturado de uma reunião com tópicos discutidos
 */
export async function gerarRelatorioReuniaoComIA(
  reuniao: any,
  topicosDiscutidos: Array<{
    id: number;
    titulo: string;
    descricao: string | null;
    gestorNome: string | null;
    resultadoDiscussao: string | null;
  }>
): Promise<{
  resumoExecutivo: string;
  topicosDiscutidos: Array<{ topicoId: number; titulo: string; resultado: string }>;
  decisoesTomadas: string;
  acoesDefinidas: Array<{ descricao: string; responsavel: string; prazo: string }>;
}> {
  const topicosTexto = topicosDiscutidos.map(t => 
    `- ${t.titulo} (proposto por ${t.gestorNome || 'Desconhecido'}): ${t.resultadoDiscussao || t.descricao || 'Sem detalhes'}`
  ).join('\n');

  const prompt = `Analisa a seguinte reunião de gestores e gera um relatório estruturado:

**Data da Reunião:** ${new Date(reuniao.data).toLocaleDateString('pt-PT')}

**Conteúdo da Reunião:**
${reuniao.conteudo}

**Tópicos Discutidos (propostos pelos gestores):**
${topicosTexto || 'Nenhum tópico específico proposto'}

Gera um relatório com:
1. **Resumo Executivo**: Parágrafo de 3-5 frases resumindo a reunião
2. **Tópicos Discutidos**: Para cada tópico, um breve resultado/conclusão
3. **Decisões Tomadas**: Texto resumindo as principais decisões
4. **Ações Definidas**: Lista de ações concretas com responsável sugerido e prazo estimado

Responde em formato JSON.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "És um assistente especializado em criar relatórios de reuniões empresariais. Gera relatórios profissionais, concisos e acionáveis.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "relatorio_reuniao",
        strict: true,
        schema: {
          type: "object",
          properties: {
            resumoExecutivo: {
              type: "string",
              description: "Resumo executivo da reunião em 3-5 frases",
            },
            topicosDiscutidos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topicoId: { type: "number" },
                  titulo: { type: "string" },
                  resultado: { type: "string" },
                },
                required: ["topicoId", "titulo", "resultado"],
                additionalProperties: false,
              },
            },
            decisoesTomadas: {
              type: "string",
              description: "Texto resumindo as principais decisões",
            },
            acoesDefinidas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  descricao: { type: "string" },
                  responsavel: { type: "string" },
                  prazo: { type: "string" },
                },
                required: ["descricao", "responsavel", "prazo"],
                additionalProperties: false,
              },
            },
          },
          required: ["resumoExecutivo", "topicosDiscutidos", "decisoesTomadas", "acoesDefinidas"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Falha ao gerar relatório da reunião");
  }

  const resultado = JSON.parse(content);
  
  // Mapear os tópicos com os IDs corretos
  resultado.topicosDiscutidos = topicosDiscutidos.map((t, index) => ({
    topicoId: t.id,
    titulo: t.titulo,
    resultado: resultado.topicosDiscutidos[index]?.resultado || t.resultadoDiscussao || 'Discutido sem conclusão específica',
  }));

  return resultado;
}

/**
 * Gera PDF do relatório de reunião
 */
export async function gerarPDFRelatorioReuniao(
  reuniao: any,
  relatorio: any,
  topicos: Array<any>
): Promise<Buffer> {
  let pdfContent = `═══════════════════════════════════════════════════════════════════
                    RELATÓRIO DE REUNIÃO DE GESTORES
═══════════════════════════════════════════════════════════════════

Data: ${new Date(reuniao.data).toLocaleDateString('pt-PT')}
Hora: ${new Date(reuniao.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}

───────────────────────────────────────────────────────────────────
                         RESUMO EXECUTIVO
───────────────────────────────────────────────────────────────────

${relatorio?.resumoExecutivo || 'Relatório não gerado'}

───────────────────────────────────────────────────────────────────
                       TÓPICOS DISCUTIDOS
───────────────────────────────────────────────────────────────────

`;

  const topicosDiscutidos = topicos.filter(t => t.estado === 'discutido');
  if (topicosDiscutidos.length > 0) {
    topicosDiscutidos.forEach((t, i) => {
      pdfContent += `${i + 1}. ${t.titulo}
   Proposto por: ${t.gestorNome || 'Desconhecido'}
   Resultado: ${t.resultadoDiscussao || 'Sem conclusão registada'}
   
`;
    });
  } else {
    pdfContent += `Nenhum tópico específico foi discutido nesta reunião.

`;
  }

  pdfContent += `───────────────────────────────────────────────────────────────────
                       DECISÕES TOMADAS
───────────────────────────────────────────────────────────────────

${relatorio?.decisoesTomadas || 'Nenhuma decisão registada'}

───────────────────────────────────────────────────────────────────
                       AÇÕES DEFINIDAS
───────────────────────────────────────────────────────────────────

`;

  if (relatorio?.acoesDefinidas) {
    const acoes = typeof relatorio.acoesDefinidas === 'string' 
      ? JSON.parse(relatorio.acoesDefinidas) 
      : relatorio.acoesDefinidas;
    
    if (acoes.length > 0) {
      acoes.forEach((a: any, i: number) => {
        pdfContent += `${i + 1}. ${a.descricao}
   Responsável: ${a.responsavel}
   Prazo: ${a.prazo}
   
`;
      });
    } else {
      pdfContent += `Nenhuma ação específica foi definida.

`;
    }
  } else {
    pdfContent += `Nenhuma ação específica foi definida.

`;
  }

  pdfContent += `───────────────────────────────────────────────────────────────────
                      CONTEÚDO COMPLETO
───────────────────────────────────────────────────────────────────

${reuniao.conteudo}

───────────────────────────────────────────────────────────────────
                      TÓPICOS NÃO DISCUTIDOS
───────────────────────────────────────────────────────────────────

`;

  const topicosNaoDiscutidos = topicos.filter(t => t.estado === 'nao_discutido');
  if (topicosNaoDiscutidos.length > 0) {
    pdfContent += `Os seguintes tópicos foram adiados para a próxima reunião:

`;
    topicosNaoDiscutidos.forEach((t, i) => {
      pdfContent += `${i + 1}. ${t.titulo} (proposto por ${t.gestorNome || 'Desconhecido'})
`;
    });
  } else {
    pdfContent += `Todos os tópicos propostos foram discutidos.
`;
  }

  pdfContent += `

═══════════════════════════════════════════════════════════════════
                    PoweringEG Platform
                    Relatório gerado automaticamente
═══════════════════════════════════════════════════════════════════
`;

  return Buffer.from(pdfContent, 'utf-8');
}

/**
 * Gera HTML do relatório para envio por email
 */
export function gerarHTMLRelatorioReuniao(
  reuniao: any,
  relatorio: any,
  topicos: Array<any>
): string {
  const topicosDiscutidos = topicos.filter(t => t.estado === 'discutido' || t.estado === 'analisado');
  const topicosNaoDiscutidos = topicos.filter(t => t.estado === 'nao_discutido' || t.estado === 'pendente');
  
  let acoesHTML = '';
  if (relatorio?.acoesDefinidas) {
    const acoes = typeof relatorio.acoesDefinidas === 'string' 
      ? JSON.parse(relatorio.acoesDefinidas) 
      : relatorio.acoesDefinidas;
    
    if (acoes.length > 0) {
      acoesHTML = acoes.map((a: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${a.descricao}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${a.responsavel}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${a.prazo}</td>
        </tr>
      `).join('');
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Relatório de Reunião de Gestores</h1>
              <p style="margin: 10px 0 0; color: #bfdbfe; font-size: 16px;">
                ${new Date(reuniao.data).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </td>
          </tr>
          
          <!-- Resumo Executivo -->
          <tr>
            <td style="padding: 25px;">
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
                📋 Resumo Executivo
              </h2>
              <p style="margin: 0; color: #4b5563; line-height: 1.6;">
                ${relatorio?.resumoExecutivo || 'Relatório não gerado'}
              </p>
            </td>
          </tr>
          
          <!-- Tópicos Discutidos -->
          <tr>
            <td style="padding: 0 25px 25px;">
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; border-bottom: 2px solid #10b981; padding-bottom: 8px;">
                ✅ Tópicos Discutidos
              </h2>
              ${topicosDiscutidos.length > 0 ? topicosDiscutidos.map(t => `
                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 15px; margin-bottom: 10px; border-radius: 0 4px 4px 0;">
                  <p style="margin: 0 0 5px; font-weight: 600; color: #1f2937;">${t.titulo}</p>
                  <p style="margin: 0 0 5px; font-size: 13px; color: #6b7280;">Proposto por: ${t.gestorNome || 'Desconhecido'}</p>
                  <p style="margin: 0; color: #4b5563; font-size: 14px;">${t.resultadoDiscussao || 'Sem conclusão registada'}</p>
                </div>
              `).join('') : '<p style="color: #6b7280;">Nenhum tópico específico foi discutido.</p>'}
            </td>
          </tr>
          
          <!-- Decisões Tomadas -->
          <tr>
            <td style="padding: 0 25px 25px;">
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
                🎯 Decisões Tomadas
              </h2>
              <p style="margin: 0; color: #4b5563; line-height: 1.6;">
                ${relatorio?.decisoesTomadas || 'Nenhuma decisão registada'}
              </p>
            </td>
          </tr>
          
          <!-- Ações Definidas -->
          ${acoesHTML ? `
          <tr>
            <td style="padding: 0 25px 25px;">
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">
                📌 Ações Definidas
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 10px; text-align: left; font-weight: 600; color: #374151;">Ação</th>
                  <th style="padding: 10px; text-align: left; font-weight: 600; color: #374151;">Responsável</th>
                  <th style="padding: 10px; text-align: left; font-weight: 600; color: #374151;">Prazo</th>
                </tr>
                ${acoesHTML}
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Tópicos Não Discutidos -->
          ${topicosNaoDiscutidos.length > 0 ? `
          <tr>
            <td style="padding: 0 25px 25px;">
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; border-bottom: 2px solid #9ca3af; padding-bottom: 8px;">
                ⏳ Adiados para Próxima Reunião
              </h2>
              ${topicosNaoDiscutidos.map(t => `
                <div style="background-color: #f9fafb; border-left: 4px solid #9ca3af; padding: 10px 15px; margin-bottom: 8px; border-radius: 0 4px 4px 0;">
                  <p style="margin: 0; color: #4b5563;">${t.titulo} <span style="color: #9ca3af; font-size: 13px;">(${t.gestorNome || 'Desconhecido'})</span></p>
                </div>
              `).join('')}
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background: #1f2937; padding: 25px; text-align: center;">
              <p style="margin: 0 0 5px; font-size: 14px; color: #ffffff; font-weight: 600;">PoweringEG Platform</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Relatório gerado automaticamente</p>
              <p style="margin: 10px 0 0; font-size: 11px; color: #6b7280;">Este email foi enviado automaticamente. Por favor não responda.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
