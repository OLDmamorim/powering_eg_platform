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

Tens acesso a TODOS os dados da plataforma (dados nacionais) para análise e comparação, mas as tuas respostas devem focar-se principalmente nos dados da loja ${lojaNome}.

=== DADOS QUE PODES CONSULTAR ===
📊 DADOS NACIONAIS (para comparação):
- Total de lojas na rede
- Estatísticas gerais de todas as lojas
- Rankings e comparações entre lojas
- Médias nacionais de performance

📋 DADOS DA LOJA ${lojaNome}:
- Pendentes ativos e resolvidos
- Relatórios (livres e completos)
- Reuniões realizadas
- Resultados mensais e vendas complementares
- Alertas ativos
- Tarefas To-Do
- Histórico de visitas de gestores

=== COMO RESPONDER ===
- Quando perguntam sobre "a loja", "aqui", "nós", "nossos resultados" → Foca nos dados da loja ${lojaNome}
- Quando perguntam "como estamos comparados com outras lojas" → Usa dados nacionais para comparação
- Quando perguntam "qual a melhor loja" → Usa dados nacionais
- Sempre que relevante, compara a performance da loja com a média nacional

=== EXEMPLOS ===
- "Quantos pendentes temos?" → Responder com pendentes da loja ${lojaNome}
- "Como está a nossa performance?" → Analisar resultados da loja ${lojaNome}
- "Estamos acima ou abaixo da média?" → Comparar loja ${lojaNome} com média nacional
- "Qual a loja com mais vendas?" → Usar dados nacionais para responder

=== DATA ATUAL ===
A data atual está indicada no contexto. Quando perguntam sobre "este mês", "mês atual", "agora", "hoje" - consulta a data atual fornecida no contexto e responde com os dados do mês corrente. NÃO perguntes qual é o mês - já sabes!

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
  const periodosParaCarregar = periodosDisponiveis.slice(0, 3); // Últimos 3 meses
  
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
    vendasComplementaresNacionais
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
  
  // Resultados mensais da loja - últimos 3 meses
  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();
  
  const resultadosMensais: any[] = [];
  const vendasComplementares: any[] = [];
  
  for (let i = 0; i < 3; i++) {
    let mes = mesAtual - i;
    let ano = anoAtual;
    if (mes <= 0) {
      mes += 12;
      ano -= 1;
    }
    try {
      const resultado = await db.getResultadosMensaisPorLoja(lojaId, mes, ano);
      if (resultado) {
        resultadosMensais.push({ ...resultado, periodo: `${mes}/${ano}` });
      }
      
      // Obter vendas complementares do mesmo período
      const vendas = await db.getVendasComplementares(mes, ano, lojaId);
      if (vendas && vendas.length > 0) {
        vendasComplementares.push({ ...vendas[0], periodo: `${mes}/${ano}` });
      }
    } catch (e) {
      // Ignorar erros de períodos sem dados
    }
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
    vendasComplementares
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
  
  // Dados nacionais resumidos
  texto += `🌍 DADOS NACIONAIS:\n`;
  texto += `- Total de lojas: ${contextoNacional.lojas.length}\n`;
  texto += `- Total de gestores: ${contextoNacional.gestores.length}\n`;
  texto += `- Pendentes ativos (nacional): ${contextoNacional.pendentes.filter((p: any) => !p.resolvido).length}\n`;
  texto += `- Relatórios este mês (nacional): ${contextoNacional.relatoriosLivres.length + contextoNacional.relatoriosCompletos.length}\n`;
  texto += `- Alertas ativos (nacional): ${contextoNacional.alertas.filter((a: any) => a.estado === 'pendente').length}\n\n`;
  
  // Resultados mensais de TODAS as lojas (para rankings)
  texto += `🏆 RESULTADOS NACIONAIS (todas as lojas - mês atual ${mesAtual}/${anoAtual}):\n`;
  const resultadosMesAtual = contextoNacional.resultadosMensais.filter((r: any) => r.mes === mesAtual && r.ano === anoAtual);
  if (resultadosMesAtual.length > 0) {
    // Ordenar por total de serviços (descendente)
    const rankingServicos = [...resultadosMesAtual].sort((a: any, b: any) => (b.totalServicos || 0) - (a.totalServicos || 0));
    texto += `  Total de lojas com dados: ${resultadosMesAtual.length}\n`;
    texto += `  Top 5 por serviços:\n`;
    rankingServicos.slice(0, 5).forEach((r: any, i: number) => {
      texto += `    ${i + 1}º ${r.lojaNome}: ${r.totalServicos} serviços (obj: ${r.objetivoMensal || 'N/A'})\n`;
    });
    texto += `  Bottom 5 por serviços:\n`;
    rankingServicos.slice(-5).reverse().forEach((r: any, i: number) => {
      const pos = resultadosMesAtual.length - i;
      texto += `    ${pos}º ${r.lojaNome}: ${r.totalServicos} serviços (obj: ${r.objetivoMensal || 'N/A'})\n`;
    });
    // Encontrar posição da loja atual
    const lojaAtual = contextoNacional.lojas.find((l: any) => l.nome === lojaNome);
    if (lojaAtual) {
      const posicaoLoja = rankingServicos.findIndex((r: any) => r.lojaId === lojaAtual.id) + 1;
      if (posicaoLoja > 0) {
        texto += `  📍 Posição da ${lojaNome}: ${posicaoLoja}º lugar de ${resultadosMesAtual.length} lojas\n`;
      }
    }
  } else {
    texto += `  - Sem dados disponíveis para o mês atual\n`;
  }
  texto += `\n`;
  
  // Vendas complementares de TODAS as lojas (para rankings)
  texto += `💰 VENDAS COMPLEMENTARES NACIONAIS (todas as lojas - mês atual ${mesAtual}/${anoAtual}):\n`;
  const vendasMesAtual = (contextoNacional.vendasComplementaresNacionais || []).filter((v: any) => {
    const [mes, ano] = v.periodo.split('/').map(Number);
    return mes === mesAtual && ano === anoAtual;
  });
  if (vendasMesAtual.length > 0) {
    // Ranking por total de vendas complementares
    const rankingVendas = [...vendasMesAtual].sort((a: any, b: any) => (parseFloat(b.totalVendas) || 0) - (parseFloat(a.totalVendas) || 0));
    texto += `  Total de lojas com dados: ${vendasMesAtual.length}\n`;
    texto += `  Top 5 por vendas complementares:\n`;
    rankingVendas.slice(0, 5).forEach((v: any, i: number) => {
      const total = v.totalVendas ? `€${parseFloat(v.totalVendas).toFixed(2)}` : '€0';
      texto += `    ${i + 1}º ${v.lojaNome}: ${total}\n`;
    });
    // Ranking por % escovas
    const rankingEscovas = [...vendasMesAtual].sort((a: any, b: any) => (parseFloat(b.escovasPercent) || 0) - (parseFloat(a.escovasPercent) || 0));
    texto += `  Top 5 por % escovas vs serviços:\n`;
    rankingEscovas.slice(0, 5).forEach((v: any, i: number) => {
      const percent = v.escovasPercent ? `${(parseFloat(v.escovasPercent) * 100).toFixed(1)}%` : '0%';
      texto += `    ${i + 1}º ${v.lojaNome}: ${percent}\n`;
    });
    // Encontrar posição da loja atual
    const lojaAtual = contextoNacional.lojas.find((l: any) => l.nome === lojaNome);
    if (lojaAtual) {
      const posVendas = rankingVendas.findIndex((v: any) => v.lojaId === lojaAtual.id) + 1;
      const posEscovas = rankingEscovas.findIndex((v: any) => v.lojaId === lojaAtual.id) + 1;
      if (posVendas > 0) {
        texto += `  📍 Posição da ${lojaNome} em vendas: ${posVendas}º lugar de ${vendasMesAtual.length} lojas\n`;
      }
      if (posEscovas > 0) {
        texto += `  📍 Posição da ${lojaNome} em % escovas: ${posEscovas}º lugar de ${vendasMesAtual.length} lojas\n`;
      }
    }
  } else {
    texto += `  - Sem dados disponíveis para o mês atual\n`;
  }
  texto += `\n`;
  
  // Dados da loja específica
  texto += `========================================\n`;
  texto += `🏪 DADOS DA LOJA: ${lojaNome}\n`;
  texto += `========================================\n\n`;
  
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
  
  texto += `📊 RESULTADOS MENSAIS (últimos 3 meses):\n`;
  if (dadosLoja.resultadosMensais.length > 0) {
    dadosLoja.resultadosMensais.forEach((r: any) => {
      const objetivo = r.objetivoMensal || 'N/A';
      const realizado = r.totalServicos || 'N/A';
      const desvio = r.desvioPercentualDia ? `${(parseFloat(r.desvioPercentualDia) * 100).toFixed(1)}%` : 'N/A';
      texto += `  - ${r.mes}/${r.ano}: Objetivo ${objetivo}, Realizado ${realizado}, Desvio ${desvio}\n`;
    });
  } else {
    texto += `  - Sem dados disponíveis\n`;
  }
  
  // Vendas Complementares
  texto += `\n💰 VENDAS COMPLEMENTARES (últimos 3 meses):\n`;
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
