import { invokeLLM } from "./_core/llm";
import * as db from "./db";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Processa pergunta do chatbot para o Portal da Loja
 * Tem acesso a dados nacionais mas foca na loja específica
 */
export async function processarPerguntaPortalLoja(
  pergunta: string,
  historico: ChatMessage[] = [],
  lojaId: number,
  lojaNome: string
): Promise<{ resposta: string; dados?: any }> {
  try {
    // 1. Obter contexto completo da plataforma
    const contexto = await obterContextoPlataformaNacional();
    
    // 2. Obter dados específicos da loja
    const dadosLoja = await obterDadosLoja(lojaId);
    
    // 3. Construir prompt do sistema
    const systemPrompt = `És o Assistente IA da plataforma PoweringEG para o Portal da Loja.

🏪 LOJA ATUAL: ${lojaNome} (ID: ${lojaId})

=== REGRA FUNDAMENTAL ===
⚠️ ATENÇÃO: Quando perguntam sobre PENDENTES, TAREFAS, ALERTAS ou qualquer informação operacional, APENAS podes responder com dados da loja ${lojaNome}.
NUNCA reveles informação de pendentes, tarefas ou alertas de outras lojas, zonas ou dados nacionais.
Se perguntarem "quantos pendentes tem a zona X" ou "quantos pendentes há no país", responde APENAS com os pendentes da loja ${lojaNome}.

=== DADOS QUE PODES CONSULTAR ===
📊 DADOS NACIONAIS (APENAS para comparação de RESULTADOS e RANKINGS):
- Total de lojas na rede
- Rankings de serviços, reparações, vendas complementares
- Médias nacionais de performance (serviços, taxas de reparação, escovas)
- Posição da loja ${lojaNome} nos rankings

📋 DADOS DA LOJA ${lojaNome} (informação completa):
- Pendentes ativos e resolvidos (APENAS desta loja)
- Tarefas To-Do (APENAS desta loja)
- Alertas ativos (APENAS desta loja)
- Relatórios (livres e completos)
- Reuniões realizadas
- Resultados mensais e vendas complementares
- Histórico de visitas de gestores

=== COMO RESPONDER ===
- Quando perguntam sobre "pendentes", "tarefas", "alertas" → APENAS dados da loja ${lojaNome}
- Quando perguntam sobre "a loja", "aqui", "nós", "nossos resultados" → Dados da loja ${lojaNome}
- Quando perguntam "como estamos comparados com outras lojas" → Usa rankings de RESULTADOS (serviços, vendas), NÃO pendentes
- Quando perguntam "qual a melhor loja" → Usa rankings de RESULTADOS (serviços, vendas)
- Quando perguntam sobre "zona", "região", "nacional" em relação a pendentes/tarefas → Responde APENAS com dados da loja ${lojaNome}

=== EXEMPLOS ===
- "Quantos pendentes temos?" → Responder com pendentes da loja ${lojaNome}
- "Quantos pendentes tem a zona Minho?" → Responder APENAS com pendentes da loja ${lojaNome} (não tens acesso a outras lojas)
- "Como está a nossa performance?" → Analisar resultados da loja ${lojaNome}
- "Estamos acima ou abaixo da média?" → Comparar RESULTADOS (serviços, vendas) da loja ${lojaNome} com média nacional
- "Qual a loja com mais vendas?" → Usar ranking de vendas (dados nacionais de RESULTADOS)

=== DATA ATUAL ===
A data atual está indicada no contexto. Quando perguntam sobre "este mês", "mês atual", "agora", "hoje" - consulta a data atual fornecida no contexto e responde com os dados do mês corrente. NÃO perguntes qual é o mês - já sabes!

=== METAS E OBJETIVOS IMPORTANTES ===
- TAXA MÍNIMA DE ESCOVAS: 7.5% (percentagem mínima de escovas vendidas vs serviços realizados para prémio trimestral)
- TAXA MÍNIMA DE REPARAÇÃO: 22% (percentagem mínima de reparações vs para-brisas)
- Quando perguntam sobre "taxa de escovas", "percentagem de escovas", "estamos a cumprir escovas" - compara com o mínimo de 7.5%
- Quando perguntam sobre "taxa de reparação", "estamos a cumprir reparações" - compara com o mínimo de 22%
- Indica claramente se a loja está ACIMA ou ABAIXO do mínimo exigido

=== POLÍTICA DE COMISSIONAMENTO 2025 ===
**REGRA CRÍTICA - FTE (Full Time Equivalent):**
- Mínimo 35 serviços por colaborador para ter direito a QUALQUER prémio
- Se a loja NÃO cumprir o FTE mínimo, NÃO TEM DIREITO A NENHUM PRÉMIO (0€ em TODAS as categorias)
- Para calcular serviços por colaborador: Total de Serviços da Loja ÷ Número de Colaboradores

**TABELA DE SERVIÇOS MÍNIMOS (FTE):**
| Colaboradores | Serviços Mínimos Totais |
| 1 | 35 |
| 2 | 70 |
| 3 | 105 |
| 4 | 140 |

**1. COMISSÕES POR SERVIÇOS LIGEIROS (por colaborador):**
A tabela mostra o valor da comissão POR COLABORADOR. Para obter o TOTAL da loja, multiplicar pelo número de colaboradores.

| Serviços/Colab | Comissão/Colaborador |
|----------------|----------------------|
| < 35           | 0€                   |
| 35             | 25€                  |
| 36             | 28,50€               |
| 37             | 32€                  |
| 38             | 35,50€               |
| 39             | 39€                  |
| 40             | 44€                  |
| 41             | 49€                  |
| 42             | 54€                  |
| 43             | 59€                  |
| 44             | 64€                  |
| 45             | 71€                  |
| 46             | 78€                  |
| 47             | 85€                  |
| 48             | 92€                  |
| 49             | 99€                  |
| 50             | 108€                 |
| 51             | 117€                 |
| 52             | 126€                 |
| 53             | 135€                 |
| 54             | 144€                 |
| 55             | 153€                 |
| 56             | 162€                 |
| 57             | 171€                 |
| 58             | 180€                 |
| 59             | 189€                 |
| 60             | 198€                 |
| 60+            | 198€ + (n-60)*9€     |

**COMO CALCULAR COMISSÃO DE SERVIÇOS LIGEIROS:**
1. Calcular serviços por colaborador: Total Serviços ÷ Nº Colaboradores
2. Verificar se atinge o FTE mínimo (>= 35 serviços/colaborador)
3. Se sim, consultar a tabela para obter a comissão POR COLABORADOR
4. Multiplicar pelo número de colaboradores para obter a comissão TOTAL da loja

Exemplo: Loja com 2 colaboradores e 82 serviços totais:
- Serviços/colaborador: 82 ÷ 2 = 41 (cumpre FTE >= 35)
- Comissão por colaborador (tabela, 41 serv/colab): 49€
- Comissão TOTAL da loja: 49€ × 2 = 98€

**2. COMISSÕES POR SERVIÇOS PESADOS:**
- Se < 35 serviços ligeiros: 12€ por pesado (0-9) ou 18€ por pesado (10+)
- Se >= 35 serviços ligeiros: 15€ por pesado (0-9) ou 18€ por pesado (10+)

**3. CALIBRAÇÃO:** Mesmo valor dos serviços ligeiros por cada calibragem (se atingir mínimo 35 serviços).

**4. TAXA DE REPARAÇÃO (QIV) - Valor por cada reparação (APENAS SE CUMPRIR FTE):**
- < 22%: 0€
- 22% a 25%: 5€
- 25% a 30%: 10€
- 30% a 40%: 12€
- > 40%: 15€

**5. VENDAS COMPLEMENTARES (APENAS SE CUMPRIR FTE):**
- Escovas: 10% do valor faturado
- Películas: 2,5% do valor faturado
- Outros serviços (polimentos, lavagens, etc.): 30% do valor faturado

**6. CRITÉRIOS MÍNIMOS OBRIGATÓRIOS (NPS):**
- NPS >= 80% (obrigatório para receber prémio)
- Taxa de Resposta >= 7,5% (obrigatório para receber prémio)
- Se NPS < 80% OU Taxa de Resposta < 7,5% -> A LOJA NÃO TEM DIREITO A NENHUM PRÉMIO
- Os dados NPS da loja estão disponíveis no contexto. Consulta-os para responder sobre elegibilidade.

**7. PENALIZAÇÕES TRIMESTRAIS:**
Quebras e Danos em Montagem:
- < 2%: 0% penalização
- 2% a 3%: -10%
- 3% a 4%: -20%
- 4% a 5%: -30%
- > 5%: -50%

**PAGAMENTO:** Trimestral (ex: Jan-Fev-Mar pagos em Abril).

USA ESTAS REGRAS PARA FAZER CÁLCULOS DE COMISSÕES QUANDO O UTILIZADOR PERGUNTAR.

Sê prestável, claro e objetivo. Usa emojis para tornar as respostas mais amigáveis.`;

    // 4. Formatar contexto para o prompt
    const contextoFormatado = formatarContextoParaLoja(contexto, dadosLoja, lojaNome);
    
    // 5. Construir mensagens para a IA
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextoFormatado },
      ...historico.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: pergunta }
    ];
    
    // 6. Chamar a IA
    const response = await invokeLLM({ messages });
    const content = response.choices[0]?.message?.content;
    const resposta = typeof content === 'string' ? content : "Desculpa, não consegui processar a tua pergunta.";
    
    return { resposta };
  } catch (error) {
    console.error('Erro ao processar pergunta do Portal da Loja:', error);
    return {
      resposta: "Desculpa, ocorreu um erro ao processar a tua pergunta. Por favor, tenta novamente."
    };
  }
}

/**
 * Processa pergunta do chatbot para o Portal do Volante
 * Tem acesso completo a dados nacionais
 */
export async function processarPerguntaPortalVolante(
  pergunta: string,
  historico: ChatMessage[] = [],
  volanteNome: string,
  lojasAtribuidas: Array<{ id: number; nome: string }>
): Promise<{ resposta: string; dados?: any }> {
  try {
    // 1. Obter contexto completo da plataforma
    const contexto = await obterContextoPlataformaNacional();
    
    // 2. Construir prompt do sistema
    const lojasNomes = lojasAtribuidas.map(l => l.nome).join(', ');
    const systemPrompt = `És o Assistente IA da plataforma PoweringEG para o Portal do Volante.

🚗 VOLANTE: ${volanteNome}
🏪 LOJAS ATRIBUÍDAS: ${lojasNomes}

Tens acesso COMPLETO a todos os dados da plataforma (dados nacionais) para apoiar o volante nas suas funções de suporte às lojas.

=== DADOS QUE PODES CONSULTAR ===
📊 DADOS NACIONAIS:
- Todas as lojas da rede
- Todos os pendentes, relatórios e alertas
- Estatísticas gerais e comparações
- Resultados mensais de todas as lojas
- Histórico de visitas e reuniões
- Pedidos de apoio e agendamentos

📋 FOCO PRINCIPAL:
Embora tenhas acesso a todos os dados, o teu foco deve ser ajudar o volante ${volanteNome} com as lojas atribuídas: ${lojasNomes}

=== COMO RESPONDER ===
- Fornece informação clara e objetiva sobre qualquer loja da rede
- Prioriza informação sobre as lojas atribuídas ao volante
- Ajuda a planear rotas e priorizar visitas
- Identifica lojas que precisam de apoio urgente
- Compara performance entre lojas

=== EXEMPLOS ===
- "Que lojas precisam de apoio hoje?" → Analisar pendentes e alertas urgentes
- "Como está a loja X?" → Fornecer resumo completo da loja X
- "Qual a melhor rota para visitar as lojas?" → Sugerir ordem de visitas
- "Que lojas têm mais pendentes?" → Ranking de lojas por pendentes

=== DATA ATUAL ===
A data atual está indicada no contexto. Quando perguntam sobre "este mês", "mês atual", "agora", "hoje" - consulta a data atual fornecida no contexto e responde com os dados do mês corrente. NÃO perguntes qual é o mês - já sabes!

=== METAS E OBJETIVOS IMPORTANTES ===
- TAXA MÍNIMA DE ESCOVAS: 7.5% (percentagem mínima de escovas vendidas vs serviços realizados para prémio trimestral)
- TAXA MÍNIMA DE REPARAÇÃO: 22% (percentagem mínima de reparações vs para-brisas)
- Quando perguntam sobre "taxa de escovas", "percentagem de escovas", "estamos a cumprir escovas" - compara com o mínimo de 7.5%
- Quando perguntam sobre "taxa de reparação", "estamos a cumprir reparações" - compara com o mínimo de 22%
- Indica claramente se a loja está ACIMA ou ABAIXO do mínimo exigido

Sê prestável, claro e objetivo. Usa emojis para tornar as respostas mais amigáveis.`;

    // 3. Formatar contexto para o prompt
    const contextoFormatado = formatarContextoParaVolante(contexto, lojasAtribuidas);
    
    // 4. Construir mensagens para a IA
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextoFormatado },
      ...historico.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: pergunta }
    ];
    
    // 5. Chamar a IA
    const response = await invokeLLM({ messages });
    const content = response.choices[0]?.message?.content;
    const resposta = typeof content === 'string' ? content : "Desculpa, não consegui processar a tua pergunta.";
    
    return { resposta };
  } catch (error) {
    console.error('Erro ao processar pergunta do Portal do Volante:', error);
    return {
      resposta: "Desculpa, ocorreu um erro ao processar a tua pergunta. Por favor, tenta novamente."
    };
  }
}

/**
 * Obtém contexto completo da plataforma (dados nacionais)
 */
async function obterContextoPlataformaNacional(): Promise<any> {
  const lojas = await db.getAllLojas();
  const gestores = await db.getAllGestores();
  const pendentes = await db.getAllPendentes();
  const relatoriosLivres = await db.getAllRelatoriosLivres();
  const relatoriosCompletos = await db.getAllRelatoriosCompletos();
  const alertas = await db.getAllAlertas();
  const todos = await db.getAllTodos();
  const reunioesLojas = await db.getHistoricoReuniõesLojas();
  
  // Resultados mensais - últimos 3 meses
  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();
  
  const periodosDisponiveis = await db.getPeriodosDisponiveis();
  const resultadosMensais: any[] = [];
  const vendasComplementaresNacionais: any[] = [];
  const periodosParaCarregar = periodosDisponiveis; // Todos os períodos disponíveis
  
  for (const periodo of periodosParaCarregar) {
    const resultadosPeriodo = await db.getResultadosMensais(
      { mes: periodo.mes, ano: periodo.ano },
      { id: 1, role: 'admin' } as any
    );
    resultadosMensais.push(...resultadosPeriodo);
    
    // Obter vendas complementares de todas as lojas para este período
    const vendasPeriodo = await db.getVendasComplementares(periodo.mes, periodo.ano);
    if (vendasPeriodo && vendasPeriodo.length > 0) {
      vendasComplementaresNacionais.push(...vendasPeriodo.map(v => ({ ...v, periodo: `${periodo.mes}/${periodo.ano}` })));
    }
  }
  
  // NPS - Net Promoter Score (dados nacionais)
  let dadosNPS: any[] = [];
  try {
    const npsResult = await db.getNPSDadosTodasLojas(anoAtual);
    dadosNPS = npsResult || [];
    if (mesAtual <= 2) {
      const npsAnoAnterior = await db.getNPSDadosTodasLojas(anoAtual - 1);
      if (npsAnoAnterior && npsAnoAnterior.length > 0) {
        dadosNPS = [...dadosNPS, ...npsAnoAnterior];
      }
    }
  } catch (e) {
    console.error('Erro ao carregar dados NPS para chatbot portais:', e);
  }
  
  return {
    lojas,
    gestores,
    pendentes,
    relatoriosLivres,
    relatoriosCompletos,
    alertas,
    todos,
    reunioesLojas,
    resultadosMensais,
    vendasComplementaresNacionais,
    dadosNPS
  };
}

/**
 * Obtém dados específicos de uma loja
 */
async function obterDadosLoja(lojaId: number): Promise<any> {
  const loja = await db.getLojaById(lojaId);
  const pendentes = await db.getPendentesByLojaId(lojaId);
  const todosRelatoriosLivres = await db.getAllRelatoriosLivres();
  const relatoriosLivres = todosRelatoriosLivres.filter(r => r.lojaId === lojaId);
  const todosRelatoriosCompletos = await db.getAllRelatoriosCompletos();
  const relatoriosCompletos = todosRelatoriosCompletos.filter(r => r.lojaId === lojaId);
  const alertas = (await db.getAllAlertas()).filter(a => a.lojaId === lojaId);
  const todos = await db.getTodosByLojaId(lojaId);
  const todasReunioes = await db.getHistoricoReuniõesLojas();
  const reunioes = todasReunioes.filter(r => {
    // Reuniões de lojas têm lojaIds como string JSON array
    if (r.lojaIds) {
      try {
        const ids = typeof r.lojaIds === 'string' ? JSON.parse(r.lojaIds) : r.lojaIds;
        return Array.isArray(ids) && ids.includes(lojaId);
      } catch (e) {
        return false;
      }
    }
    return false;
  });
  
  // Resultados mensais da loja - todos os períodos disponíveis
  const periodosDisponiveis = await db.getPeriodosDisponiveis();
  
  const resultadosMensais: any[] = [];
  const vendasComplementares: any[] = [];
  
  for (const periodo of periodosDisponiveis) {
    try {
      const resultado = await db.getResultadosMensaisPorLoja(lojaId, periodo.mes, periodo.ano);
      if (resultado) {
        resultadosMensais.push({ ...resultado, periodo: `${periodo.mes}/${periodo.ano}` });
      }
      
      // Obter vendas complementares do mesmo período
      const vendas = await db.getVendasComplementares(periodo.mes, periodo.ano, lojaId);
      if (vendas && vendas.length > 0) {
        vendasComplementares.push({ ...vendas[0], periodo: `${periodo.mes}/${periodo.ano}` });
      }
    } catch (e) {
      // Ignorar erros de períodos sem dados
    }
  }
  
  // NPS da loja
  let npsLoja = null;
  try {
    const anoAtual = new Date().getFullYear();
    npsLoja = await db.getNPSDadosLoja(lojaId, anoAtual);
  } catch (e) {
    // Ignorar erro
  }
  
  return {
    loja,
    pendentes,
    relatoriosLivres,
    relatoriosCompletos,
    alertas,
    todos,
    reunioes,
    resultadosMensais,
    vendasComplementares,
    npsLoja
  };
}

/**
 * Formata contexto para o Portal da Loja
 */
function formatarContextoParaLoja(contextoNacional: any, dadosLoja: any, lojaNome: string): string {
  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();
  const diaAtual = now.getDate();
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = mesesNomes[mesAtual - 1];
  
  let texto = `\n\n========================================\n`;
  texto += `📅 DATA ATUAL: ${diaAtual} de ${mesNome} de ${anoAtual}\n`;
  texto += `📆 MÊS CORRENTE: ${mesNome} ${anoAtual} (${mesAtual}/${anoAtual})\n`;
  texto += `========================================\n\n`;
  texto += `📊 CONTEXTO DA PLATAFORMA\n`;
  texto += `========================================\n\n`;
  
  // Dados nacionais resumidos (APENAS resultados e rankings, SEM pendentes/tarefas/alertas)
  texto += `🌍 DADOS NACIONAIS (apenas para rankings de resultados):\n`;
  texto += `- Total de lojas: ${contextoNacional.lojas.length}\n`;
  texto += `- Total de gestores: ${contextoNacional.gestores.length}\n`;
  // NÃO incluir pendentes, alertas ou tarefas nacionais - a loja só deve ver os seus próprios
  texto += `\n`;
  
  // Resultados mensais de TODAS as lojas (para rankings)
  // RESULTADOS MENSAIS COMPLETOS DE TODAS AS LOJAS - TODOS OS CAMPOS
  texto += `🏆 RESULTADOS MENSAIS NACIONAIS - DADOS COMPLETOS DE TODAS AS LOJAS:\n`;
  texto += `========================================\n\n`;
  
  // Agrupar resultados por período
  const resultadosPorPeriodo: { [key: string]: any[] } = {};
  contextoNacional.resultadosMensais.forEach((r: any) => {
    const periodo = `${r.mes}/${r.ano}`;
    if (!resultadosPorPeriodo[periodo]) {
      resultadosPorPeriodo[periodo] = [];
    }
    resultadosPorPeriodo[periodo].push(r);
  });
  
  // Ordenar períodos (mais recente primeiro)
  const periodosResultados = Object.keys(resultadosPorPeriodo).sort((a, b) => {
    const [mesA, anoA] = a.split('/').map(Number);
    const [mesB, anoB] = b.split('/').map(Number);
    if (anoA !== anoB) return anoB - anoA;
    return mesB - mesA;
  });
  
  for (const periodo of periodosResultados) {
    const resultadosPeriodo = resultadosPorPeriodo[periodo];
    texto += `\n📅 PERÍODO ${periodo}:\n`;
    texto += `  Total de lojas: ${resultadosPeriodo.length}\n\n`;
    
    // RANKING POR SERVIÇOS
    const rankingServicos = [...resultadosPeriodo].sort((a: any, b: any) => (b.totalServicos || 0) - (a.totalServicos || 0));
    texto += `  🏆 RANKING POR SERVIÇOS:\n`;
    rankingServicos.forEach((r: any, i: number) => {
      const desvioPercent = r.desvioPercentualDia ? `${(parseFloat(r.desvioPercentualDia) * 100).toFixed(1)}%` : 'N/A';
      texto += `    ${i + 1}º ${r.lojaNome}: ${r.totalServicos || 0} serv. (obj: ${r.objetivoMensal || 'N/A'}, desvio: ${desvioPercent})\n`;
    });
    
    // RANKING POR TAXA DE REPARAÇÃO
    const rankingTaxaReparacao = [...resultadosPeriodo].sort((a: any, b: any) => (parseFloat(b.taxaReparacao) || 0) - (parseFloat(a.taxaReparacao) || 0));
    texto += `\n  🏆 RANKING POR TAXA DE REPARAÇÃO:\n`;
    rankingTaxaReparacao.forEach((r: any, i: number) => {
      const taxa = r.taxaReparacao ? `${(parseFloat(r.taxaReparacao) * 100).toFixed(1)}%` : 'N/A';
      const qtdRep = r.qtdReparacoes || 0;
      const qtdPB = r.qtdParaBrisas || 0;
      const gap22 = r.gapReparacoes22 || 0;
      texto += `    ${i + 1}º ${r.lojaNome}: ${taxa} (${qtdRep} rep. / ${qtdPB} PB, faltam ${gap22} para 22%)\n`;
    });
    
    // RANKING POR QUANTIDADE DE REPARAÇÕES
    const rankingQtdReparacoes = [...resultadosPeriodo].sort((a: any, b: any) => (b.qtdReparacoes || 0) - (a.qtdReparacoes || 0));
    texto += `\n  🏆 RANKING POR QTD REPARAÇÕES:\n`;
    rankingQtdReparacoes.forEach((r: any, i: number) => {
      const qtdRep = r.qtdReparacoes || 0;
      const taxa = r.taxaReparacao ? `${(parseFloat(r.taxaReparacao) * 100).toFixed(1)}%` : 'N/A';
      texto += `    ${i + 1}º ${r.lojaNome}: ${qtdRep} reparações (taxa: ${taxa})\n`;
    });
    
    // RANKING POR DESVIO PERCENTUAL (cumprimento de objetivo)
    const rankingDesvio = [...resultadosPeriodo].sort((a: any, b: any) => (parseFloat(b.desvioPercentualDia) || -999) - (parseFloat(a.desvioPercentualDia) || -999));
    texto += `\n  🏆 RANKING POR CUMPRIMENTO DE OBJETIVO (desvio %):\n`;
    rankingDesvio.forEach((r: any, i: number) => {
      const desvio = r.desvioPercentualDia ? `${(parseFloat(r.desvioPercentualDia) * 100).toFixed(1)}%` : 'N/A';
      const servicos = r.totalServicos || 0;
      const objetivo = r.objetivoMensal || 'N/A';
      texto += `    ${i + 1}º ${r.lojaNome}: ${desvio} (${servicos}/${objetivo})\n`;
    });
    
    // DADOS COMPLETOS DE CADA LOJA
    texto += `\n  📊 DADOS COMPLETOS POR LOJA:\n`;
    resultadosPeriodo.forEach((r: any) => {
      texto += `\n    🏢 ${r.lojaNome}:\n`;
      texto += `      - Zona: ${r.zona || 'N/A'}\n`;
      const servicosRealizados = r.totalServicos || 0;
      const objetivoMensalNum = r.objetivoMensal || 0;
      const servicosEmFalta = Math.max(0, objetivoMensalNum - servicosRealizados);
      const hoje = new Date();
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const diasRestantes = Math.max(1, ultimoDiaMes - hoje.getDate());
      const mediaDiariaNecessaria = servicosEmFalta > 0 ? (servicosEmFalta / diasRestantes).toFixed(1) : '0';
      texto += `      - Serviços Realizados: ${servicosRealizados}\n`;
      texto += `      - Objetivo Mensal: ${objetivoMensalNum}\n`;
      texto += `      - Serviços em Falta: ${servicosEmFalta}\n`;
      texto += `      - Média Diária Necessária: ${mediaDiariaNecessaria} serviços/dia (faltam ${diasRestantes} dias)\n`;
      texto += `      - Objetivo ao Dia: ${r.objetivoDiaAtual || 'N/A'}\n`;
      texto += `      - Desvio vs Obj Dia: ${r.desvioPercentualDia ? `${(parseFloat(r.desvioPercentualDia) * 100).toFixed(1)}%` : 'N/A'}\n`;
      texto += `      - Desvio vs Obj Mês: ${r.desvioPercentualMes ? `${(parseFloat(r.desvioPercentualMes) * 100).toFixed(1)}%` : 'N/A'}\n`;
      texto += `      - Desvio Acumulado: ${r.desvioObjetivoAcumulado || 'N/A'}\n`;
      texto += `      - Nº Colaboradores: ${r.numColaboradores || 'N/A'}\n`;
      texto += `      - Serv./Colaborador: ${r.servicosPorColaborador || 'N/A'}\n`;
      texto += `      - TAXA REPARAÇÃO: ${r.taxaReparacao ? `${(parseFloat(r.taxaReparacao) * 100).toFixed(1)}%` : 'N/A'}\n`;
      texto += `      - Qtd Reparações: ${r.qtdReparacoes || 0}\n`;
      texto += `      - Qtd Para-Brisas: ${r.qtdParaBrisas || 0}\n`;
      texto += `      - Gap para 22%: ${r.gapReparacoes22 || 0} reparações\n`;
    });
    
    // Posição da loja atual neste período
    const lojaAtual = contextoNacional.lojas.find((l: any) => l.nome === lojaNome);
    if (lojaAtual) {
      const posServicos = rankingServicos.findIndex((r: any) => r.lojaId === lojaAtual.id) + 1;
      const posTaxa = rankingTaxaReparacao.findIndex((r: any) => r.lojaId === lojaAtual.id) + 1;
      const posQtdRep = rankingQtdReparacoes.findIndex((r: any) => r.lojaId === lojaAtual.id) + 1;
      const posDesvio = rankingDesvio.findIndex((r: any) => r.lojaId === lojaAtual.id) + 1;
      if (posServicos > 0 || posTaxa > 0 || posQtdRep > 0 || posDesvio > 0) {
        texto += `\n  📍 POSIÇÃO DA ${lojaNome.toUpperCase()} EM ${periodo}:\n`;
        if (posServicos > 0) texto += `    - Serviços: ${posServicos}º de ${resultadosPeriodo.length}\n`;
        if (posTaxa > 0) texto += `    - Taxa Reparação: ${posTaxa}º de ${resultadosPeriodo.length}\n`;
        if (posQtdRep > 0) texto += `    - Qtd Reparações: ${posQtdRep}º de ${resultadosPeriodo.length}\n`;
        if (posDesvio > 0) texto += `    - Cumprimento Obj: ${posDesvio}º de ${resultadosPeriodo.length}\n`;
      }
    }
  }
  texto += `\n`;
  
  // Vendas complementares de TODAS as lojas - DADOS COMPLETOS
  texto += `💰 VENDAS COMPLEMENTARES NACIONAIS - DADOS COMPLETOS DE TODAS AS LOJAS:\n`;
  texto += `========================================\n\n`;
  
  // Agrupar por período
  const vendasPorPeriodo: { [key: string]: any[] } = {};
  (contextoNacional.vendasComplementaresNacionais || []).forEach((v: any) => {
    if (!vendasPorPeriodo[v.periodo]) {
      vendasPorPeriodo[v.periodo] = [];
    }
    vendasPorPeriodo[v.periodo].push(v);
  });
  
  // Ordenar períodos (mais recente primeiro)
  const periodosOrdenados = Object.keys(vendasPorPeriodo).sort((a, b) => {
    const [mesA, anoA] = a.split('/').map(Number);
    const [mesB, anoB] = b.split('/').map(Number);
    if (anoA !== anoB) return anoB - anoA;
    return mesB - mesA;
  });
  
  for (const periodo of periodosOrdenados) {
    const vendasPeriodo = vendasPorPeriodo[periodo];
    texto += `\n📅 PERÍODO ${periodo}:\n`;
    texto += `  Total de lojas: ${vendasPeriodo.length}\n\n`;
    
    // Ranking por quantidade de escovas vendidas
    const rankingEscovasQtd = [...vendasPeriodo].sort((a: any, b: any) => (b.escovasQtd || 0) - (a.escovasQtd || 0));
    texto += `  🏆 RANKING POR ESCOVAS VENDIDAS (unidades):\n`;
    rankingEscovasQtd.forEach((v: any, i: number) => {
      const escovasQtd = v.escovasQtd || 0;
      const escovasPercent = v.escovasPercent ? `${(parseFloat(v.escovasPercent) * 100).toFixed(1)}%` : '0%';
      const escovasValor = v.escovasVendas ? `€${parseFloat(v.escovasVendas).toFixed(2)}` : '€0';
      texto += `    ${i + 1}º ${v.lojaNome}: ${escovasQtd} unid. (${escovasPercent} vs serviços, ${escovasValor})\n`;
    });
    
    // Ranking por % escovas vs serviços
    const rankingEscovasPercent = [...vendasPeriodo].sort((a: any, b: any) => (parseFloat(b.escovasPercent) || 0) - (parseFloat(a.escovasPercent) || 0));
    texto += `\n  🏆 RANKING POR % ESCOVAS VS SERVIÇOS:\n`;
    rankingEscovasPercent.forEach((v: any, i: number) => {
      const escovasPercent = v.escovasPercent ? `${(parseFloat(v.escovasPercent) * 100).toFixed(1)}%` : '0%';
      const escovasQtd = v.escovasQtd || 0;
      texto += `    ${i + 1}º ${v.lojaNome}: ${escovasPercent} (${escovasQtd} unidades)\n`;
    });
    
    // Ranking por total de vendas complementares
    const rankingVendasTotal = [...vendasPeriodo].sort((a: any, b: any) => (parseFloat(b.totalVendas) || 0) - (parseFloat(a.totalVendas) || 0));
    texto += `\n  🏆 RANKING POR TOTAL VENDAS COMPLEMENTARES (€):\n`;
    rankingVendasTotal.forEach((v: any, i: number) => {
      const total = v.totalVendas ? `€${parseFloat(v.totalVendas).toFixed(2)}` : '€0';
      const polimentoQtd = v.polimentoQtd || 0;
      const tratamentoQtd = v.tratamentoQtd || 0;
      const lavagensQtd = v.lavagensTotal || 0;
      texto += `    ${i + 1}º ${v.lojaNome}: ${total} (Polimento: ${polimentoQtd}, Tratamento: ${tratamentoQtd}, Lavagens: ${lavagensQtd})\n`;
    });
    
    // Posição da loja atual neste período
    const lojaAtual = contextoNacional.lojas.find((l: any) => l.nome === lojaNome);
    if (lojaAtual) {
      const posEscovasQtd = rankingEscovasQtd.findIndex((v: any) => v.lojaId === lojaAtual.id) + 1;
      const posEscovasPercent = rankingEscovasPercent.findIndex((v: any) => v.lojaId === lojaAtual.id) + 1;
      const posVendasTotal = rankingVendasTotal.findIndex((v: any) => v.lojaId === lojaAtual.id) + 1;
      if (posEscovasQtd > 0 || posEscovasPercent > 0 || posVendasTotal > 0) {
        texto += `\n  📍 POSIÇÃO DA ${lojaNome.toUpperCase()} EM ${periodo}:\n`;
        if (posEscovasQtd > 0) texto += `    - Escovas (qtd): ${posEscovasQtd}º de ${vendasPeriodo.length}\n`;
        if (posEscovasPercent > 0) texto += `    - Escovas (%): ${posEscovasPercent}º de ${vendasPeriodo.length}\n`;
        if (posVendasTotal > 0) texto += `    - Total vendas: ${posVendasTotal}º de ${vendasPeriodo.length}\n`;
      }
    }
  }
  texto += `\n`;
  
  // Dados da loja específica
  texto += `========================================\n`;
  texto += `🏪 DADOS DA LOJA: ${lojaNome}\n`;
  texto += `========================================\n\n`;
  
  // Informações básicas da loja
  if (dadosLoja.loja) {
    texto += `📊 INFORMAÇÕES BÁSICAS:\n`;
    texto += `- Nome: ${dadosLoja.loja.nome}\n`;
    texto += `- Zona: ${dadosLoja.loja.zona || 'N/A'}\n`;
    if (dadosLoja.loja.objetivoDiario) {
      texto += `- 🎯 OBJETIVO DIÁRIO: ${dadosLoja.loja.objetivoDiario} serviços/dia\n`;
    }
    // Informações complementares da loja
    const l = dadosLoja.loja;
    if (l.telefone) texto += `- 📞 Telefone: ${l.telefone}\n`;
    if (l.telemovel) texto += `- 📱 Telemóvel: ${l.telemovel}\n`;
    if (l.morada) {
      let moradaCompleta = l.morada;
      if (l.codigoPostal) moradaCompleta += `, ${l.codigoPostal}`;
      if (l.localidade) moradaCompleta += ` ${l.localidade}`;
      texto += `- 📍 Morada: ${moradaCompleta}\n`;
    }
    if (l.areaM2) texto += `- 📐 Área: ${l.areaM2} m²\n`;
    if (l.renda) texto += `- 💰 Renda Mensal: ${l.renda}\n`;
    if (l.senhorio) texto += `- 🏠 Senhorio: ${l.senhorio}\n`;
    if (l.contactoSenhorio) texto += `- 📞 Contacto Senhorio: ${l.contactoSenhorio}\n`;
    if (l.observacoesImovel) texto += `- 📝 Observações Imóvel: ${l.observacoesImovel}\n`;
    texto += `\n`;
  }
  
  texto += `📋 PENDENTES:\n`;
  const pendentesAtivos = dadosLoja.pendentes.filter((p: any) => !p.resolvido);
  texto += `- Total: ${dadosLoja.pendentes.length} (${pendentesAtivos.length} ativos, ${dadosLoja.pendentes.length - pendentesAtivos.length} resolvidos)\n`;
  if (pendentesAtivos.length > 0) {
    texto += `\nPendentes ativos:\n`;
    pendentesAtivos.slice(0, 5).forEach((p: any) => {
      const data = p.dataCriacao ? new Date(p.dataCriacao).toLocaleDateString('pt-PT') : 'N/A';
      texto += `  - ${p.descricao} (criado em ${data})\n`;
    });
  }
  texto += '\n';
  
  texto += `📝 RELATÓRIOS:\n`;
  texto += `- Relatórios livres: ${dadosLoja.relatoriosLivres.length}\n`;
  texto += `- Relatórios completos: ${dadosLoja.relatoriosCompletos.length}\n`;
  texto += `- Total: ${dadosLoja.relatoriosLivres.length + dadosLoja.relatoriosCompletos.length}\n\n`;
  
  texto += `🚨 ALERTAS:\n`;
  const alertasAtivos = dadosLoja.alertas.filter((a: any) => a.estado === 'pendente');
  texto += `- Alertas ativos: ${alertasAtivos.length}\n`;
  texto += `- Alertas resolvidos: ${dadosLoja.alertas.length - alertasAtivos.length}\n\n`;
  
  texto += `✅ TAREFAS TO-DO:\n`;
  const todosAtivos = dadosLoja.todos.filter((t: any) => t.estado !== 'concluido');
  texto += `- Tarefas ativas: ${todosAtivos.length}\n`;
  texto += `- Tarefas concluídas: ${dadosLoja.todos.length - todosAtivos.length}\n\n`;
  
  texto += `📊 RESULTADOS MENSAIS (todos os períodos disponíveis):\n`;
  if (dadosLoja.resultadosMensais.length > 0) {
    dadosLoja.resultadosMensais.forEach((r: any) => {
      const servicosRealizados = r.totalServicos || 0;
      const objetivoMensalNum = r.objetivoMensal || 0;
      const servicosEmFalta = Math.max(0, objetivoMensalNum - servicosRealizados);
      const hoje = new Date();
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const diasRestantes = Math.max(1, ultimoDiaMes - hoje.getDate());
      const mediaDiariaNecessaria = servicosEmFalta > 0 ? (servicosEmFalta / diasRestantes).toFixed(1) : '0';
      const desvio = r.desvioPercentualDia ? `${(parseFloat(r.desvioPercentualDia) * 100).toFixed(1)}%` : 'N/A';
      texto += `  - ${r.mes}/${r.ano}: Realizados ${servicosRealizados}, Objetivo ${objetivoMensalNum}, Em falta ${servicosEmFalta}, Média diária necessária ${mediaDiariaNecessaria} serv/dia, Desvio ${desvio}\n`;
    });
  } else {
    texto += `  - Sem dados disponíveis\n`;
  }
  
  // Vendas Complementares
  texto += `\n💰 VENDAS COMPLEMENTARES (todos os períodos disponíveis):\n`;
  if (dadosLoja.vendasComplementares && dadosLoja.vendasComplementares.length > 0) {
    dadosLoja.vendasComplementares.forEach((v: any) => {
      const total = v.totalVendas ? `€${parseFloat(v.totalVendas).toFixed(2)}` : 'N/A';
      const escovas = v.escovasVendas ? `€${parseFloat(v.escovasVendas).toFixed(2)}` : '€0';
      const escovasQtd = v.escovasQtd || 0;
      const escovasPercent = v.escovasPercent ? `${(parseFloat(v.escovasPercent) * 100).toFixed(1)}%` : 'N/A';
      const polimento = v.polimentoVendas ? `€${parseFloat(v.polimentoVendas).toFixed(2)}` : '€0';
      const polimentoQtd = v.polimentoQtd || 0;
      const tratamento = v.tratamentoVendas ? `€${parseFloat(v.tratamentoVendas).toFixed(2)}` : '€0';
      const tratamentoQtd = v.tratamentoQtd || 0;
      const lavagens = v.lavagensVendas ? `€${parseFloat(v.lavagensVendas).toFixed(2)}` : '€0';
      const lavagensQtd = v.lavagensTotal || 0;
      const peliculas = v.peliculaVendas ? `€${parseFloat(v.peliculaVendas).toFixed(2)}` : '€0';
      
      texto += `  - ${v.periodo}: Total ${total}\n`;
      texto += `    • Escovas: ${escovasQtd} unid. (${escovas}) - ${escovasPercent} vs serviços\n`;
      texto += `    • Polimento Faróis: ${polimentoQtd} unid. (${polimento})\n`;
      texto += `    • Tratamento Carroçarias: ${tratamentoQtd} unid. (${tratamento})\n`;
      texto += `    • Lavagens ECO: ${lavagensQtd} unid. (${lavagens})\n`;
      texto += `    • Películas: ${peliculas}\n`;
    });
  } else {
    texto += `  - Sem dados disponíveis\n`;
  }
  
  // NPS da Loja
  texto += `\n🌟 NPS - NET PROMOTER SCORE:\n`;
  if (dadosLoja.npsLoja) {
    const nps = dadosLoja.npsLoja;
    const mesesNPS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const camposNPS = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'];
    const camposTaxa = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'];
    
    texto += `  Regras: NPS >= 80% E Taxa de Resposta >= 7,5% para ter direito a prémio\n\n`;
    
    for (let i = 0; i < 12; i++) {
      const npsVal = nps[camposNPS[i]];
      const taxaVal = nps[camposTaxa[i]];
      if (npsVal != null) {
        const npsPercent = (parseFloat(npsVal) * 100).toFixed(1);
        const taxaPercent = taxaVal ? (parseFloat(taxaVal) * 100).toFixed(1) : 'N/A';
        const npsOk = parseFloat(npsVal) >= 0.80;
        const taxaOk = taxaVal ? parseFloat(taxaVal) >= 0.075 : false;
        const elegivel = npsOk && taxaOk;
        const status = elegivel ? '✅ Elegível para prémio' : '❌ Sem direito a prémio';
        let motivo = '';
        if (!elegivel) {
          const motivos: string[] = [];
          if (!npsOk) motivos.push(`NPS ${npsPercent}% < 80%`);
          if (!taxaOk) motivos.push(`Taxa ${taxaPercent}% < 7,5%`);
          motivo = ` (${motivos.join(', ')})`;
        }
        texto += `  ${mesesNPS[i]}: NPS ${npsPercent}% | Taxa Resp: ${taxaPercent}% | ${status}${motivo}\n`;
      }
    }
    
    if (nps.npsAnoTotal) {
      const npsAnual = (parseFloat(nps.npsAnoTotal) * 100).toFixed(1);
      const taxaAnual = nps.taxaRespostaAnoTotal ? (parseFloat(nps.taxaRespostaAnoTotal) * 100).toFixed(1) : 'N/A';
      texto += `\n  TOTAL ANO: NPS ${npsAnual}% | Taxa Resp: ${taxaAnual}%\n`;
    }
  } else {
    texto += `  - Sem dados NPS disponíveis\n`;
  }
  
  // Ranking NPS Nacional (para comparação)
  if (contextoNacional.dadosNPS && contextoNacional.dadosNPS.length > 0) {
    const mesesNPS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const camposNPS = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'];
    const camposTaxa = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'];
    
    // Encontrar o mês mais recente com dados
    let mesRecente = -1;
    for (let i = 11; i >= 0; i--) {
      const temDados = contextoNacional.dadosNPS.some((item: any) => {
        const nps = item.nps || item;
        return nps[camposNPS[i]] != null;
      });
      if (temDados) { mesRecente = i; break; }
    }
    
    if (mesRecente >= 0) {
      texto += `\n🏆 RANKING NPS NACIONAL (${mesesNPS[mesRecente]}):\n`;
      const ranking = contextoNacional.dadosNPS
        .filter((item: any) => {
          const nps = item.nps || item;
          return nps[camposNPS[mesRecente]] != null;
        })
        .map((item: any) => {
          const nps = item.nps || item;
          const loja = item.loja || { nome: 'N/A' };
          return {
            nome: loja.nome,
            nps: parseFloat(nps[camposNPS[mesRecente]]),
            taxa: nps[camposTaxa[mesRecente]] ? parseFloat(nps[camposTaxa[mesRecente]]) : 0
          };
        })
        .sort((a: any, b: any) => b.nps - a.nps);
      
      ranking.forEach((r: any, i: number) => {
        const npsOk = r.nps >= 0.80;
        const taxaOk = r.taxa >= 0.075;
        const elegivel = npsOk && taxaOk;
        const status = elegivel ? '✅' : '❌';
        const isLoja = r.nome === lojaNome ? ' ← A TUA LOJA' : '';
        texto += `  ${i + 1}º ${r.nome}: NPS ${(r.nps * 100).toFixed(1)}% | Taxa ${(r.taxa * 100).toFixed(1)}% ${status}${isLoja}\n`;
      });
    }
  }
  
  return texto;
}

/**
 * Formata contexto para o Portal do Volante
 */
function formatarContextoParaVolante(contextoNacional: any, lojasAtribuidas: Array<{ id: number; nome: string }>): string {
  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();
  const diaAtual = now.getDate();
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesNome = mesesNomes[mesAtual - 1];
  
  let texto = `\n\n========================================\n`;
  texto += `📅 DATA ATUAL: ${diaAtual} de ${mesNome} de ${anoAtual}\n`;
  texto += `📆 MÊS CORRENTE: ${mesNome} ${anoAtual} (${mesAtual}/${anoAtual})\n`;
  texto += `========================================\n\n`;
  texto += `📊 CONTEXTO DA PLATAFORMA (DADOS NACIONAIS)\n`;
  texto += `========================================\n\n`;
  
  texto += `🌍 RESUMO GERAL:\n`;
  texto += `- Total de lojas: ${contextoNacional.lojas.length}\n`;
  texto += `- Total de gestores: ${contextoNacional.gestores.length}\n`;
  texto += `- Pendentes ativos: ${contextoNacional.pendentes.filter((p: any) => !p.resolvido).length}\n`;
  texto += `- Pendentes resolvidos: ${contextoNacional.pendentes.filter((p: any) => p.resolvido).length}\n`;
  texto += `- Relatórios livres: ${contextoNacional.relatoriosLivres.length}\n`;
  texto += `- Relatórios completos: ${contextoNacional.relatoriosCompletos.length}\n`;
  texto += `- Alertas ativos: ${contextoNacional.alertas.filter((a: any) => a.estado === 'pendente').length}\n`;
  texto += `- Tarefas To-Do ativas: ${contextoNacional.todos.filter((t: any) => t.estado !== 'concluido').length}\n\n`;
  
  texto += `========================================\n`;
  texto += `🏪 LOJAS ATRIBUÍDAS AO VOLANTE\n`;
  texto += `========================================\n\n`;
  
  const lojaIdsAtribuidas = lojasAtribuidas.map(l => l.id);
  
  lojasAtribuidas.forEach(lojaAtribuida => {
    const loja = contextoNacional.lojas.find((l: any) => l.id === lojaAtribuida.id);
    if (!loja) return;
    
    const pendentesLoja = contextoNacional.pendentes.filter((p: any) => p.lojaId === lojaAtribuida.id);
    const pendentesAtivos = pendentesLoja.filter((p: any) => !p.resolvido);
    const alertasLoja = contextoNacional.alertas.filter((a: any) => a.lojaId === lojaAtribuida.id && a.estado === 'pendente');
    const todosLoja = contextoNacional.todos.filter((t: any) => t.atribuidoLojaId === lojaAtribuida.id && t.estado !== 'concluido');
    
    texto += `📍 ${lojaAtribuida.nome}:\n`;
    texto += `  - Pendentes ativos: ${pendentesAtivos.length}\n`;
    texto += `  - Alertas ativos: ${alertasLoja.length}\n`;
    texto += `  - Tarefas ativas: ${todosLoja.length}\n`;
    
    if (pendentesAtivos.length > 0) {
      texto += `  - Pendentes urgentes:\n`;
      pendentesAtivos.slice(0, 3).forEach((p: any) => {
        texto += `    • ${p.descricao}\n`;
      });
    }
    texto += '\n';
  });
  
  texto += `========================================\n`;
  texto += `📊 RANKING DE LOJAS (por pendentes ativos)\n`;
  texto += `========================================\n\n`;
  
  const lojasComPendentes = contextoNacional.lojas.map((loja: any) => {
    const pendentesAtivos = contextoNacional.pendentes.filter((p: any) => p.lojaId === loja.id && !p.resolvido);
    return { nome: loja.nome, pendentes: pendentesAtivos.length };
  }).sort((a: any, b: any) => b.pendentes - a.pendentes);
  
  lojasComPendentes.slice(0, 10).forEach((loja: any, index: number) => {
    texto += `${index + 1}. ${loja.nome}: ${loja.pendentes} pendentes\n`;
  });
  
  return texto;
}
