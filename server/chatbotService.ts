import { invokeLLM } from "./_core/llm";
import * as db from "./db";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ContextoPlataforma {
  lojas: any[];
  gestores: any[];
  pendentes: any[];
  relatoriosLivres: any[];
  relatoriosCompletos: any[];
  alertas: any[];
  ocorrencias: any[];
  todos: any[];
  reunioesGestores: any[];
  reunioesLojas: any[];
  resultadosMensais: any[];
  estatisticasGerais: any;
}

/**
 * Obtém todo o contexto da plataforma para o chatbot
 */
async function obterContextoPlataforma(userId: number, userRole: string): Promise<ContextoPlataforma> {
  const isAdmin = userRole === 'admin';
  
  // Obter dados base
  const lojas = await db.getAllLojas();
  const gestores = await db.getAllGestores();
  
  // Pendentes
  const pendentes = await db.getAllPendentes();
  
  // Relatórios
  const relatoriosLivres = await db.getAllRelatoriosLivres();
  const relatoriosCompletos = await db.getAllRelatoriosCompletos();
  
  // Alertas
  const alertas = await db.getAllAlertas();
  
  // Ocorrências estruturais
  const ocorrencias = await db.getAllOcorrenciasEstruturais();
  
  // Tarefas To-Do
  const todos = await db.getAllTodos();
  
  // Reuniões
  const reunioesGestores = await db.getHistoricoReuniõesGestores();
  const reunioesLojas = await db.getHistoricoReuniõesLojas();
  
  // Resultados mensais - carregar TODOS os períodos disponíveis para permitir consultas históricas
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();
  
  // Obter todos os períodos disponíveis
  const periodosDisponiveis = await db.getPeriodosDisponiveis();
  
  // Carregar resultados de todos os períodos (até 12 meses de histórico)
  const resultadosMensais: any[] = [];
  const periodosParaCarregar = periodosDisponiveis.slice(0, 12); // Últimos 12 meses
  
  // IMPORTANTE: O chatbot precisa de acesso a TODAS as lojas da rede para responder
  // a perguntas sobre qualquer loja, independentemente do gestor logado.
  // Por isso, usamos role 'admin' para carregar todos os resultados.
  for (const periodo of periodosParaCarregar) {
    const resultadosPeriodo = await db.getResultadosMensais(
      { mes: periodo.mes, ano: periodo.ano }, 
      { id: userId, role: 'admin' } as any
    );
    resultadosMensais.push(...resultadosPeriodo);
  }
  
  // Estatísticas gerais
  const estatisticasGerais = await db.getEstatisticasPeriodo(mesAtual, anoAtual);
  
  return {
    lojas,
    gestores,
    pendentes,
    relatoriosLivres,
    relatoriosCompletos,
    alertas,
    ocorrencias,
    todos,
    reunioesGestores,
    reunioesLojas,
    resultadosMensais,
    estatisticasGerais
  };
}

/**
 * Formata o contexto para o prompt da IA
 */
function formatarContextoParaPrompt(contexto: ContextoPlataforma): string {
  const agora = new Date();
  const dataAtual = agora.toLocaleDateString('pt-PT');
  
  let texto = `=== DADOS DA PLATAFORMA POWERINGEG (${dataAtual}) ===\n\n`;
  
  // Lojas
  texto += `📍 LOJAS (${contexto.lojas.length} total):\n`;
  contexto.lojas.slice(0, 30).forEach(l => {
    texto += `- ${l.nome}${l.email ? ` (${l.email})` : ''}\n`;
  });
  if (contexto.lojas.length > 30) texto += `... e mais ${contexto.lojas.length - 30} lojas\n`;
  texto += '\n';
  
  // Gestores
  texto += `👥 GESTORES (${contexto.gestores.length} total):\n`;
  contexto.gestores.forEach(g => {
    texto += `- ${g.nome || g.userName} (${g.email || g.userEmail})${g.role === 'admin' ? ' [Admin]' : ''}\n`;
  });
  texto += '\n';
  
  // Pendentes
  const pendentesAtivos = contexto.pendentes.filter(p => !p.resolvido);
  texto += `⏳ PENDENTES (${pendentesAtivos.length} ativos de ${contexto.pendentes.length} total):\n`;
  pendentesAtivos.slice(0, 15).forEach(p => {
    texto += `- [${p.loja?.nome || 'Loja desconhecida'}] ${p.descricao?.substring(0, 80)}${p.descricao?.length > 80 ? '...' : ''}\n`;
  });
  if (pendentesAtivos.length > 15) texto += `... e mais ${pendentesAtivos.length - 15} pendentes\n`;
  texto += '\n';
  
  // Relatórios Livres (últimos 10)
  texto += `📝 RELATÓRIOS LIVRES (${contexto.relatoriosLivres.length} total, últimos 10):\n`;
  contexto.relatoriosLivres.slice(0, 10).forEach(r => {
    const data = r.dataVisita ? new Date(r.dataVisita).toLocaleDateString('pt-PT') : 'N/A';
    texto += `- [${data}] ${r.loja?.nome || 'N/A'} por ${r.gestor?.nome || 'N/A'}: ${r.descricao?.substring(0, 60)}${r.descricao?.length > 60 ? '...' : ''}\n`;
  });
  texto += '\n';
  
  // Relatórios Completos (últimos 10)
  texto += `📋 RELATÓRIOS COMPLETOS (${contexto.relatoriosCompletos.length} total, últimos 10):\n`;
  contexto.relatoriosCompletos.slice(0, 10).forEach(r => {
    const data = r.dataVisita ? new Date(r.dataVisita).toLocaleDateString('pt-PT') : 'N/A';
    const positivos = r.pontosPositivos ? 'com pontos positivos' : '';
    const negativos = r.pontosNegativos ? 'com pontos negativos' : '';
    texto += `- [${data}] ${r.loja?.nome || 'N/A'} por ${r.gestor?.nome || 'N/A'} ${positivos} ${negativos}\n`;
  });
  texto += '\n';
  
  // Alertas
  const alertasPendentes = contexto.alertas.filter(a => a.estado === 'pendente');
  texto += `🚨 ALERTAS (${alertasPendentes.length} pendentes de ${contexto.alertas.length} total):\n`;
  alertasPendentes.slice(0, 10).forEach(a => {
    texto += `- [${a.tipo}] ${a.lojaNome}: ${a.descricao?.substring(0, 60)}${a.descricao?.length > 60 ? '...' : ''}\n`;
  });
  texto += '\n';
  
  // Ocorrências Estruturais
  const ocorrenciasAbertas = contexto.ocorrencias.filter(o => o.estado !== 'resolvido');
  texto += `🔧 OCORRÊNCIAS ESTRUTURAIS (${ocorrenciasAbertas.length} abertas de ${contexto.ocorrencias.length} total):\n`;
  ocorrenciasAbertas.slice(0, 10).forEach(o => {
    texto += `- [${o.estado}] ${o.lojaNome || 'N/A'} - ${o.temaNome || 'Sem tema'}: ${o.descricao?.substring(0, 50)}${o.descricao?.length > 50 ? '...' : ''}\n`;
  });
  texto += '\n';
  
  // Tarefas To-Do
  const todosPendentes = contexto.todos.filter(t => t.estado === 'pendente' || t.estado === 'em_progresso');
  texto += `✅ TAREFAS TO-DO (${todosPendentes.length} pendentes de ${contexto.todos.length} total):\n`;
  todosPendentes.slice(0, 10).forEach(t => {
    const prioridade = t.prioridade === 'alta' ? '🔴' : t.prioridade === 'media' ? '🟡' : '🟢';
    texto += `- ${prioridade} [${t.estado}] ${t.titulo} - ${t.lojaNome || 'N/A'}\n`;
  });
  texto += '\n';
  
  // Reuniões de Gestores (últimas 5)
  texto += `🤝 REUNIÕES DE GESTORES (últimas 5 de ${contexto.reunioesGestores.length} total):\n`;
  contexto.reunioesGestores.slice(0, 5).forEach(r => {
    const data = r.dataReuniao ? new Date(r.dataReuniao).toLocaleDateString('pt-PT') : 'N/A';
    texto += `- [${data}] ${r.titulo || 'Sem título'} - ${r.participantes?.length || 0} participantes\n`;
  });
  texto += '\n';
  
  // Reuniões de Lojas (últimas 5)
  texto += `🏪 REUNIÕES DE LOJAS (últimas 5 de ${contexto.reunioesLojas.length} total):\n`;
  contexto.reunioesLojas.slice(0, 5).forEach(r => {
    const data = r.dataReuniao ? new Date(r.dataReuniao).toLocaleDateString('pt-PT') : 'N/A';
    texto += `- [${data}] ${r.lojaNome || 'N/A'}: ${r.resumo?.substring(0, 50) || 'Sem resumo'}${r.resumo?.length > 50 ? '...' : ''}\n`;
  });
  texto += '\n';
  
  // Resultados Mensais - Agrupados por período
  if (contexto.resultadosMensais && contexto.resultadosMensais.length > 0) {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Agrupar resultados por período (mês/ano)
    const resultadosPorPeriodo: Record<string, any[]> = {};
    contexto.resultadosMensais.forEach(r => {
      const chave = `${r.mes}-${r.ano}`;
      if (!resultadosPorPeriodo[chave]) {
        resultadosPorPeriodo[chave] = [];
      }
      resultadosPorPeriodo[chave].push(r);
    });
    
    // Ordenar períodos do mais recente para o mais antigo
    const periodosOrdenados = Object.keys(resultadosPorPeriodo).sort((a, b) => {
      const [mesA, anoA] = a.split('-').map(Number);
      const [mesB, anoB] = b.split('-').map(Number);
      if (anoB !== anoA) return anoB - anoA;
      return mesB - mesA;
    });
    
    texto += `📊 RESULTADOS MENSAIS (${periodosOrdenados.length} períodos disponíveis, ${contexto.resultadosMensais.length} registos):\n\n`;
    
    // Mostrar cada período com suas lojas
    periodosOrdenados.forEach(periodo => {
      const [mes, ano] = periodo.split('-').map(Number);
      const resultados = resultadosPorPeriodo[periodo];
      const mesNome = meses[mes - 1];
      
      texto += `=== ${mesNome} ${ano} (${resultados.length} lojas) ===\n`;
      resultados.forEach(r => {
        const desvio = r.desvioPercentualMes != null 
          ? (typeof r.desvioPercentualMes === 'number' ? r.desvioPercentualMes * 100 : parseFloat(r.desvioPercentualMes) * 100).toFixed(1) + '%' 
          : 'N/A';
        const taxaRep = r.taxaReparacao != null
          ? (typeof r.taxaReparacao === 'number' ? r.taxaReparacao * 100 : parseFloat(r.taxaReparacao) * 100).toFixed(1) + '%'
          : 'N/A';
        texto += `- ${r.lojaNome}: ${r.totalServicos || 0} serviços, objetivo: ${r.objetivoMensal || 'N/A'}, desvio: ${desvio}, taxa reparação: ${taxaRep}\n`;
      });
      texto += '\n';
    });
  }
  
  // Estatísticas Gerais
  if (contexto.estatisticasGerais) {
    const stats = contexto.estatisticasGerais;
    texto += `📈 ESTATÍSTICAS GERAIS DO MÊS:\n`;
    texto += `- Total de Lojas com dados: ${stats.totalLojas || 0}\n`;
    texto += `- Soma de Serviços: ${stats.somaServicos || 0}\n`;
    texto += `- Soma de Objetivos: ${stats.somaObjetivos || 0}\n`;
    texto += `- Média de Desvio: ${stats.mediaDesvioPercentual ? (stats.mediaDesvioPercentual * 100).toFixed(1) + '%' : 'N/A'}\n`;
    texto += `- Lojas Acima do Objetivo: ${stats.lojasAcimaObjetivo || 0}\n`;
    texto += '\n';
  }
  
  return texto;
}

/**
 * Processa uma pergunta do utilizador sobre qualquer dado da plataforma
 */
export async function processarPergunta(
  pergunta: string,
  historico: ChatMessage[] = [],
  userId: number,
  userRole: string
): Promise<{ resposta: string; dados?: any }> {
  try {
    // 1. Obter todo o contexto da plataforma
    const contexto = await obterContextoPlataforma(userId, userRole);
    const contextoFormatado = formatarContextoParaPrompt(contexto);
    
    // 2. Construir o prompt do sistema
    const systemPrompt = `És o Assistente IA da plataforma PoweringEG, uma plataforma de gestão de lojas e equipas.
Tens acesso a todos os dados da plataforma e podes responder a perguntas sobre:
- Lojas e suas informações
- Gestores e suas associações
- Relatórios (livres e completos)
- Pendentes e seu estado
- Alertas ativos
- Ocorrências estruturais
- Tarefas To-Do
- Reuniões (de gestores e de lojas)
- Resultados mensais e estatísticas de performance
- Vendas complementares

Instruções:
1. Responde sempre em português europeu
2. Sê conciso mas completo nas respostas
3. Usa dados concretos quando disponíveis
4. Se não tiveres dados suficientes, indica isso claramente
5. Podes fazer cálculos e análises com base nos dados
6. Mantém um tom profissional mas amigável
7. Se a pergunta for ambígua, pede esclarecimento
8. Não inventes dados - usa apenas o que está disponível

${contextoFormatado}`;

    // 3. Gerar resposta com IA
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...historico.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: pergunta }
    ];

    const response = await invokeLLM({ messages });
    
    const resposta = response.choices[0].message.content;
    
    return {
      resposta: typeof resposta === 'string' ? resposta : "Desculpe, ocorreu um erro ao gerar a resposta.",
      dados: {
        totalLojas: contexto.lojas.length,
        totalGestores: contexto.gestores.length,
        totalPendentes: contexto.pendentes.length,
        totalRelatorios: contexto.relatoriosLivres.length + contexto.relatoriosCompletos.length,
        totalAlertas: contexto.alertas.length,
        totalOcorrencias: contexto.ocorrencias.length,
        totalTodos: contexto.todos.length
      }
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
  try {
    const pendentes = await db.getAllPendentes();
    const pendentesAtivos = pendentes.filter(p => !p.resolvido).length;
    
    const alertas = await db.getAllAlertas();
    const alertasPendentes = alertas.filter(a => a.estado === 'pendente').length;
    
    const ocorrencias = await db.getAllOcorrenciasEstruturais();
    const ocorrenciasAbertas = ocorrencias.filter(o => o.estado !== 'resolvido').length;
    
    return [
      "Quantas lojas temos na plataforma?",
      `Quais são os ${pendentesAtivos} pendentes ativos?`,
      "Qual a loja com mais relatórios este mês?",
      `Há ${alertasPendentes} alertas pendentes. Quais são?`,
      "Quais gestores fizeram mais visitas esta semana?",
      `Temos ${ocorrenciasAbertas} ocorrências estruturais abertas. Pode listar?`,
      "Qual o resumo geral da performance este mês?",
      "Quais tarefas To-Do estão pendentes?",
      "Quando foi a última reunião de gestores?",
      "Quais lojas não foram visitadas recentemente?",
    ];
  } catch (error) {
    return [
      "Quantas lojas temos na plataforma?",
      "Quais são os pendentes ativos?",
      "Qual o resumo geral da performance?",
      "Quais alertas estão pendentes?",
      "Quais tarefas To-Do precisam de atenção?",
    ];
  }
}
