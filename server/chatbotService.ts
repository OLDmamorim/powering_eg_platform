import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Calcula comparação de vendas complementares entre períodos
 */
function calcularComparacaoVendas(vendasComplementares: any[]): any {
  if (!vendasComplementares || vendasComplementares.length === 0) {
    return null;
  }
  
  // Agrupar por período
  const vendasPorPeriodo: Record<string, any[]> = {};
  vendasComplementares.forEach(v => {
    const chave = `${v.mes}-${v.ano}`;
    if (!vendasPorPeriodo[chave]) {
      vendasPorPeriodo[chave] = [];
    }
    vendasPorPeriodo[chave].push(v);
  });
  
  // Ordenar períodos
  const periodosOrdenados = Object.keys(vendasPorPeriodo).sort((a, b) => {
    const [mesA, anoA] = a.split('-').map(Number);
    const [mesB, anoB] = b.split('-').map(Number);
    if (anoB !== anoA) return anoB - anoA;
    return mesB - mesA;
  });
  
  if (periodosOrdenados.length < 2) {
    return { periodos: periodosOrdenados.length, comparacoes: [] };
  }
  
  // Calcular totais por período
  const totaisPorPeriodo: Record<string, {
    totalVendas: number;
    totalEscovas: number;
    totalPolimento: number;
    totalPeliculas: number;
    totalLavagens: number;
  }> = {};
  
  periodosOrdenados.forEach(periodo => {
    const vendas = vendasPorPeriodo[periodo];
    totaisPorPeriodo[periodo] = {
      totalVendas: vendas.reduce((acc, v) => acc + (parseFloat(v.totalVendas) || 0), 0),
      totalEscovas: vendas.reduce((acc, v) => acc + (parseInt(v.escovasQtd) || 0), 0),
      totalPolimento: vendas.reduce((acc, v) => acc + (parseInt(v.polimentoQtd) || 0), 0),
      totalPeliculas: vendas.reduce((acc, v) => acc + (parseFloat(v.peliculaVendas) || 0), 0),
      totalLavagens: vendas.reduce((acc, v) => acc + (parseInt(v.lavagensTotal) || 0), 0)
    };
  });
  
  // Calcular variações entre períodos consecutivos
  const comparacoes: any[] = [];
  for (let i = 0; i < periodosOrdenados.length - 1; i++) {
    const periodoAtual = periodosOrdenados[i];
    const periodoAnterior = periodosOrdenados[i + 1];
    const atual = totaisPorPeriodo[periodoAtual];
    const anterior = totaisPorPeriodo[periodoAnterior];
    
    const calcVariacao = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return ((atual - anterior) / anterior) * 100;
    };
    
    comparacoes.push({
      periodoAtual,
      periodoAnterior,
      variacaoVendas: calcVariacao(atual.totalVendas, anterior.totalVendas).toFixed(1),
      variacaoEscovas: calcVariacao(atual.totalEscovas, anterior.totalEscovas).toFixed(1),
      variacaoPolimento: calcVariacao(atual.totalPolimento, anterior.totalPolimento).toFixed(1),
      variacaoPeliculas: calcVariacao(atual.totalPeliculas, anterior.totalPeliculas).toFixed(1),
      variacaoLavagens: calcVariacao(atual.totalLavagens, anterior.totalLavagens).toFixed(1),
      totaisAtual: atual,
      totaisAnterior: anterior
    });
  }
  
  // Calcular comparação por loja entre períodos
  const comparacoesPorLoja: any[] = [];
  if (periodosOrdenados.length >= 2) {
    const periodoAtual = periodosOrdenados[0];
    const periodoAnterior = periodosOrdenados[1];
    const vendasAtual = vendasPorPeriodo[periodoAtual];
    const vendasAnterior = vendasPorPeriodo[periodoAnterior];
    
    // Criar mapa de vendas anteriores por loja
    const vendasAnteriorPorLoja: Record<string, any> = {};
    vendasAnterior.forEach(v => {
      vendasAnteriorPorLoja[v.lojaNome] = v;
    });
    
    vendasAtual.forEach(vAtual => {
      const vAnterior = vendasAnteriorPorLoja[vAtual.lojaNome];
      if (vAnterior) {
        const totalAtual = parseFloat(vAtual.totalVendas) || 0;
        const totalAnterior = parseFloat(vAnterior.totalVendas) || 0;
        const variacao = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior * 100) : (totalAtual > 0 ? 100 : 0);
        
        comparacoesPorLoja.push({
          lojaNome: vAtual.lojaNome,
          totalAtual,
          totalAnterior,
          variacao: variacao.toFixed(1),
          tendencia: variacao > 0 ? 'subida' : variacao < 0 ? 'descida' : 'estavel'
        });
      }
    });
    
    // Ordenar por variação (maior primeiro)
    comparacoesPorLoja.sort((a, b) => parseFloat(b.variacao) - parseFloat(a.variacao));
  }
  
  return {
    periodos: periodosOrdenados.length,
    totaisPorPeriodo,
    comparacoes,
    comparacoesPorLoja
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ContextoPlataforma {
  lojas: any[];
  gestores: any[];
  gestorLojas: any[]; // Associação gestor-loja
  pendentes: any[];
  relatoriosLivres: any[];
  relatoriosCompletos: any[];
  alertas: any[];
  ocorrencias: any[];
  todos: any[];
  reunioesGestores: any[];
  reunioesLojas: any[];
  resultadosMensais: any[];
  vendasComplementares: any[]; // Vendas complementares por período
  historicoVisitasPorGestor: any[]; // Histórico de visitas por gestor
  comparacaoVendas: any; // Comparação de vendas entre períodos
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
  
  // Obter associação gestor-loja para cada gestor
  const gestorLojas: any[] = [];
  for (const gestor of gestores) {
    const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
    gestorLojas.push({
      gestorId: gestor.id,
      gestorNome: gestor.user?.name || 'Desconhecido',
      lojas: lojasDoGestor.map(l => ({ id: l.id, nome: l.nome }))
    });
  }
  
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
  
  // Vendas complementares - carregar todos os períodos disponíveis
  const vendasComplementares: any[] = [];
  for (const periodo of periodosParaCarregar) {
    try {
      const vendasPeriodo = await db.getVendasComplementares(periodo.mes, periodo.ano);
      vendasComplementares.push(...vendasPeriodo);
    } catch (e) {
      // Ignorar erros de períodos sem dados
    }
  }
  
  // Estatísticas gerais
  const estatisticasGerais = await db.getEstatisticasPeriodo(mesAtual, anoAtual);
  
  // Histórico de visitas por gestor - agrupa relatórios por gestor e loja
  const historicoVisitasPorGestor: any[] = [];
  for (const gestor of gestores) {
    const visitasGestor: any = {
      gestorId: gestor.id,
      gestorNome: gestor.user?.name || 'Desconhecido',
      visitasPorLoja: [] as any[]
    };
    
    // Agrupar relatórios livres por loja
    const relatoriosLivresGestor = relatoriosLivres.filter(r => r.gestorId === gestor.id);
    const relatoriosCompletosGestor = relatoriosCompletos.filter(r => r.gestorId === gestor.id);
    
    // Criar mapa de visitas por loja
    const visitasPorLoja: Record<number, { lojaNome: string; visitas: any[] }> = {};
    
    relatoriosLivresGestor.forEach(r => {
      if (!visitasPorLoja[r.lojaId]) {
        visitasPorLoja[r.lojaId] = { lojaNome: r.loja?.nome || 'Desconhecida', visitas: [] };
      }
      visitasPorLoja[r.lojaId].visitas.push({
        tipo: 'livre',
        data: r.dataVisita,
        descricao: r.descricao?.substring(0, 100)
      });
    });
    
    relatoriosCompletosGestor.forEach(r => {
      if (!visitasPorLoja[r.lojaId]) {
        visitasPorLoja[r.lojaId] = { lojaNome: r.loja?.nome || 'Desconhecida', visitas: [] };
      }
      visitasPorLoja[r.lojaId].visitas.push({
        tipo: 'completo',
        data: r.dataVisita,
        descricao: r.pontosPositivos?.substring(0, 100) || r.pontosNegativos?.substring(0, 100) || 'Relatório completo'
      });
    });
    
    // Ordenar visitas por data (mais recente primeiro)
    Object.entries(visitasPorLoja).forEach(([lojaId, dados]) => {
      dados.visitas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      visitasGestor.visitasPorLoja.push({
        lojaId: parseInt(lojaId),
        lojaNome: dados.lojaNome,
        ultimaVisita: dados.visitas[0]?.data,
        totalVisitas: dados.visitas.length,
        visitas: dados.visitas.slice(0, 5) // Últimas 5 visitas
      });
    });
    
    historicoVisitasPorGestor.push(visitasGestor);
  }
  
  // Comparação de vendas entre períodos
  const comparacaoVendas = calcularComparacaoVendas(vendasComplementares);
  
  return {
    lojas,
    gestores,
    gestorLojas,
    pendentes,
    relatoriosLivres,
    relatoriosCompletos,
    alertas,
    ocorrencias,
    todos,
    reunioesGestores,
    reunioesLojas,
    resultadosMensais,
    vendasComplementares,
    historicoVisitasPorGestor,
    comparacaoVendas,
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
    texto += `- ${g.user?.name || 'Desconhecido'} (${g.user?.email || 'N/A'})${g.user?.role === 'admin' ? ' [Admin]' : ''}\n`;
  });
  texto += '\n';
  
  // Associação Gestor-Loja
  texto += `🔗 ASSOCIAÇÃO GESTOR-LOJA:\n`;
  contexto.gestorLojas.forEach(gl => {
    if (gl.lojas && gl.lojas.length > 0) {
      const nomesLojas = gl.lojas.map((l: any) => l.nome).join(', ');
      texto += `- ${gl.gestorNome}: ${gl.lojas.length} lojas (${nomesLojas})\n`;
    } else {
      texto += `- ${gl.gestorNome}: sem lojas atribuídas\n`;
    }
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
  
  // Vendas Complementares - Agrupadas por período
  if (contexto.vendasComplementares && contexto.vendasComplementares.length > 0) {
    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Agrupar vendas por período (mês/ano)
    const vendasPorPeriodo: Record<string, any[]> = {};
    contexto.vendasComplementares.forEach(v => {
      const chave = `${v.mes}-${v.ano}`;
      if (!vendasPorPeriodo[chave]) {
        vendasPorPeriodo[chave] = [];
      }
      vendasPorPeriodo[chave].push(v);
    });
    
    // Ordenar períodos do mais recente para o mais antigo
    const periodosOrdenados = Object.keys(vendasPorPeriodo).sort((a, b) => {
      const [mesA, anoA] = a.split('-').map(Number);
      const [mesB, anoB] = b.split('-').map(Number);
      if (anoB !== anoA) return anoB - anoA;
      return mesB - mesA;
    });
    
    texto += `💰 VENDAS COMPLEMENTARES (${periodosOrdenados.length} períodos, ${contexto.vendasComplementares.length} registos):\n\n`;
    
    // Mostrar cada período com suas lojas
    periodosOrdenados.slice(0, 6).forEach(periodo => { // Limitar a 6 períodos para não sobrecarregar
      const [mes, ano] = periodo.split('-').map(Number);
      const vendas = vendasPorPeriodo[periodo];
      const mesNome = mesesNomes[mes - 1];
      
      texto += `=== ${mesNome} ${ano} (${vendas.length} lojas) ===\n`;
      vendas.forEach(v => {
        const totalVendas = v.totalVendas ? parseFloat(v.totalVendas).toFixed(2) : '0.00';
        const escovasVendas = v.escovasVendas ? parseFloat(v.escovasVendas).toFixed(2) : '0.00';
        const escovasQtd = v.escovasQtd || 0;
        const escovasPercent = v.escovasPercent ? (parseFloat(v.escovasPercent) * 100).toFixed(1) : '0.0';
        const polimentoVendas = v.polimentoVendas ? parseFloat(v.polimentoVendas).toFixed(2) : '0.00';
        const polimentoQtd = v.polimentoQtd || 0;
        const peliculaVendas = v.peliculaVendas ? parseFloat(v.peliculaVendas).toFixed(2) : '0.00';
        const lavagensTotal = v.lavagensTotal || 0;
        
        texto += `- ${v.lojaNome}: Total €${totalVendas} | Escovas: ${escovasQtd} (€${escovasVendas}, ${escovasPercent}%) | Polimento: ${polimentoQtd} (€${polimentoVendas}) | Películas: €${peliculaVendas} | Lavagens: ${lavagensTotal}\n`;
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
  
  // Histórico de Visitas por Gestor
  if (contexto.historicoVisitasPorGestor && contexto.historicoVisitasPorGestor.length > 0) {
    texto += `📅 HISTÓRICO DE VISITAS POR GESTOR:\n\n`;
    contexto.historicoVisitasPorGestor.forEach(gestor => {
      if (gestor.visitasPorLoja && gestor.visitasPorLoja.length > 0) {
        texto += `=== ${gestor.gestorNome} ===\n`;
        gestor.visitasPorLoja.forEach((loja: any) => {
          const ultimaVisita = loja.ultimaVisita ? new Date(loja.ultimaVisita).toLocaleDateString('pt-PT') : 'Nunca';
          texto += `- ${loja.lojaNome}: Última visita em ${ultimaVisita} (${loja.totalVisitas} visitas total)\n`;
        });
        texto += '\n';
      }
    });
  }
  
  // Comparação de Vendas Complementares entre Períodos
  if (contexto.comparacaoVendas && contexto.comparacaoVendas.comparacoes && contexto.comparacaoVendas.comparacoes.length > 0) {
    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    texto += `📊 COMPARAÇÃO DE VENDAS COMPLEMENTARES ENTRE PERÍODOS:\n\n`;
    
    contexto.comparacaoVendas.comparacoes.forEach((comp: any) => {
      const [mesAtual, anoAtual] = comp.periodoAtual.split('-').map(Number);
      const [mesAnterior, anoAnterior] = comp.periodoAnterior.split('-').map(Number);
      const nomeAtual = `${mesesNomes[mesAtual - 1]} ${anoAtual}`;
      const nomeAnterior = `${mesesNomes[mesAnterior - 1]} ${anoAnterior}`;
      
      texto += `=== ${nomeAtual} vs ${nomeAnterior} ===\n`;
      texto += `- Vendas Totais: €${comp.totaisAtual.totalVendas.toFixed(2)} vs €${comp.totaisAnterior.totalVendas.toFixed(2)} (${comp.variacaoVendas}%)\n`;
      texto += `- Escovas: ${comp.totaisAtual.totalEscovas} vs ${comp.totaisAnterior.totalEscovas} (${comp.variacaoEscovas}%)\n`;
      texto += `- Polimento: ${comp.totaisAtual.totalPolimento} vs ${comp.totaisAnterior.totalPolimento} (${comp.variacaoPolimento}%)\n`;
      texto += `- Películas: €${comp.totaisAtual.totalPeliculas.toFixed(2)} vs €${comp.totaisAnterior.totalPeliculas.toFixed(2)} (${comp.variacaoPeliculas}%)\n`;
      texto += `- Lavagens: ${comp.totaisAtual.totalLavagens} vs ${comp.totaisAnterior.totalLavagens} (${comp.variacaoLavagens}%)\n`;
      texto += '\n';
    });
    
    // Comparação por loja (top 5 melhores e piores)
    if (contexto.comparacaoVendas.comparacoesPorLoja && contexto.comparacaoVendas.comparacoesPorLoja.length > 0) {
      const lojas = contexto.comparacaoVendas.comparacoesPorLoja;
      
      texto += `TOP 5 LOJAS COM MAIOR CRESCIMENTO:\n`;
      lojas.slice(0, 5).forEach((l: any) => {
        const seta = parseFloat(l.variacao) > 0 ? '↑' : parseFloat(l.variacao) < 0 ? '↓' : '→';
        texto += `- ${l.lojaNome}: ${seta} ${l.variacao}% (€${l.totalAnterior.toFixed(2)} → €${l.totalAtual.toFixed(2)})\n`;
      });
      texto += '\n';
      
      const lojasNegativas = lojas.filter((l: any) => parseFloat(l.variacao) < 0);
      if (lojasNegativas.length > 0) {
        texto += `LOJAS COM MAIOR QUEDA:\n`;
        lojasNegativas.slice(-5).reverse().forEach((l: any) => {
          texto += `- ${l.lojaNome}: ↓ ${l.variacao}% (€${l.totalAnterior.toFixed(2)} → €${l.totalAtual.toFixed(2)})\n`;
        });
        texto += '\n';
      }
    }
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
Tens DUAS funções principais:

=== FUNÇÃO 1: CONSULTA DE DADOS ===
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
- HISTÓRICO DE VISITAS POR GESTOR: Podes responder a perguntas como "Quando foi a última visita do gestor X à loja Y?" ou "Quantas visitas fez o gestor X este mês?"
- COMPARAÇÃO DE VENDAS ENTRE PERÍODOS: Podes analisar a evolução das vendas complementares entre meses, identificar tendências de crescimento ou queda, e comparar performance entre lojas

=== FUNÇÃO 2: ASSISTENTE DE NAVEGAÇÃO E AJUDA ===
Ajudas os utilizadores a usar a plataforma, explicando onde encontrar funcionalidades e como realizar tarefas.

📍 ESTRUTURA DA PLATAFORMA:

🔹 MENU LATERAL (sempre visível à esquerda):
- Dashboard: Página inicial com estatísticas, gráficos e dicas da IA
- Lojas: Gestão de todas as lojas (criar, editar, ver detalhes)
- Gestores: Gestão de gestores (criar, editar, associar lojas)
- Relatórios: Ver todos os relatórios criados (livres e completos)
- Pendentes: Lista de tarefas pendentes por resolver
- Relatórios IA: Relatórios automáticos gerados pela IA (diário, semanal, mensal, trimestral)
- Histórico: Histórico de pontos positivos e negativos por loja
- Alertas: Dashboard de alertas automáticos
- Ocorrências: Gestão de ocorrências estruturais
- Reuniões: Registo de reuniões (gestores e lojas)
- Resultados: Resultados mensais e vendas complementares
- To-Do: Lista de tarefas a fazer
- Configurações: Configurações de alertas e preferências

📝 COMO CRIAR UM RELATÓRIO LIVRE:
1. Ir ao menu "Relatórios" no menu lateral
2. Clicar no botão "Novo Relatório" (canto superior direito)
3. Selecionar "Relatório Livre"
4. Escolher a loja no dropdown
5. A data/hora é preenchida automaticamente
6. Escrever a descrição do que foi observado
7. Adicionar pendentes se necessário
8. Opcionalmente, adicionar fotos
9. Clicar em "Guardar"

📋 COMO CRIAR UM RELATÓRIO COMPLETO:
1. Ir ao menu "Relatórios" no menu lateral
2. Clicar no botão "Novo Relatório" (canto superior direito)
3. Selecionar "Relatório Completo"
4. Escolher a loja
5. Preencher as várias secções:
   - EPIs e Fardamento
   - Kit 1ºs Socorros
   - Consumíveis
   - Espaço Físico
   - Reclamações
   - Vendas Complementares
   - Fichas de Serviço
   - Documentação Obrigatória
   - Reunião Quinzenal
   - Pontos Positivos/Negativos a Destacar
   - Resumo e Colaboradores
6. Adicionar pendentes se necessário
7. Clicar em "Guardar"

🏪 COMO ADICIONAR UMA LOJA:
1. Ir ao menu "Lojas" no menu lateral
2. Clicar no botão "Nova Loja" (canto superior direito)
3. Preencher: Nome da loja e Email (opcional)
4. Clicar em "Guardar"

👤 COMO ADICIONAR UM GESTOR:
1. Ir ao menu "Gestores" no menu lateral
2. Clicar no botão "Novo Gestor" (canto superior direito)
3. Preencher: Nome e Email
4. Clicar em "Guardar"
5. Depois de criado, pode associar lojas ao gestor

🔗 COMO ASSOCIAR LOJAS A UM GESTOR:
1. Ir ao menu "Gestores"
2. Clicar no gestor pretendido para ver detalhes
3. Na secção "Lojas Associadas", clicar em "Associar Loja"
4. Selecionar a(s) loja(s) pretendida(s)
5. Confirmar

✅ COMO RESOLVER UM PENDENTE:
1. Ir ao menu "Pendentes" no menu lateral
2. Encontrar o pendente na lista (pode filtrar por loja)
3. Clicar no botão "Resolver" ou no ícone de check
4. Confirmar a resolução

📊 COMO VER RELATÓRIOS DA IA:
1. Ir ao menu "Relatórios IA" no menu lateral
2. Escolher o tipo: Diário, Semanal, Mensal ou Trimestral
3. Os relatórios são gerados automaticamente com análises e sugestões
4. Pode exportar para PDF clicando no botão de download

🚨 COMO VER E GERIR ALERTAS:
1. Ir ao menu "Alertas" no menu lateral
2. Ver lista de alertas pendentes e resolvidos
3. Clicar num alerta para ver detalhes
4. Marcar como resolvido quando aplicável

📈 COMO VER RESULTADOS MENSAIS:
1. Ir ao menu "Resultados" no menu lateral
2. Selecionar o mês e ano pretendido
3. Ver estatísticas por loja: serviços, objetivos, desvios
4. Ver vendas complementares por loja

⚙️ CONFIGURAÇÕES:
1. Ir ao menu "Configurações" no menu lateral
2. Ajustar threshold de alertas (número de pontos negativos consecutivos)
3. Guardar alterações

🔍 FILTROS E PESQUISA:
- Na maioria das páginas, existe uma barra de filtros no topo
- Pode filtrar por: loja, gestor, data, estado (visto/não visto)
- Use o toggle "Apenas não vistos" para ver apenas itens novos

⌨️ ATALHOS DE TECLADO:
- D: Ir para Dashboard
- L: Ir para Lojas
- G: Ir para Gestores
- R: Ir para Relatórios
- P: Ir para Pendentes
- I: Ir para Relatórios IA
- H: Ir para Histórico
- A: Ir para Alertas

🌙 MODO ESCURO/CLARO:
- Clicar no ícone de sol/lua no canto inferior direito
- A preferência é guardada automaticamente

📧 ENVIAR RELATÓRIO POR EMAIL:
1. Abrir um relatório (clicar para expandir)
2. Clicar no botão "Enviar por Email"
3. O relatório é enviado para o email da loja

📥 EXPORTAR PARA PDF:
1. Na lista de relatórios, selecionar o(s) relatório(s)
2. Clicar no botão "Exportar PDF"
3. O PDF é gerado e descarregado automaticamente

=== INSTRUÇÕES GERAIS ===
1. Responde sempre em português europeu
2. Sê conciso mas completo nas respostas
3. Usa dados concretos quando disponíveis
4. Se não tiveres dados suficientes, indica isso claramente
5. Podes fazer cálculos e análises com base nos dados
6. Mantém um tom profissional mas amigável
7. Se a pergunta for ambígua, pede esclarecimento
8. Não inventes dados - usa apenas o que está disponível
9. Para perguntas sobre histórico de visitas, consulta a secção "HISTÓRICO DE VISITAS POR GESTOR"
10. Para perguntas sobre evolução de vendas, consulta a secção "COMPARAÇÃO DE VENDAS COMPLEMENTARES ENTRE PERÍODOS"
11. Quando o utilizador perguntar COMO fazer algo ou ONDE encontrar algo, usa a secção "ASSISTENTE DE NAVEGAÇÃO E AJUDA" para guiá-lo passo a passo
12. Sê proativo em sugerir funcionalidades relacionadas que possam ser úteis

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
export async function getSugestoesPergunta(language: string = 'pt'): Promise<string[]> {
  try {
    const pendentes = await db.getAllPendentes();
    const pendentesAtivos = pendentes.filter(p => !p.resolvido).length;
    
    const alertas = await db.getAllAlertas();
    const alertasPendentes = alertas.filter(a => a.estado === 'pendente').length;
    
    const ocorrencias = await db.getAllOcorrenciasEstruturais();
    const ocorrenciasAbertas = ocorrencias.filter(o => o.estado !== 'resolvido').length;
    
    if (language === 'en') {
      return [
        "How many stores do we have on the platform?",
        `What are the ${pendentesAtivos} active pending items?`,
        "Which store has the most reports this month?",
        `There are ${alertasPendentes} pending alerts. What are they?`,
        "Which managers made the most visits this week?",
        `We have ${ocorrenciasAbertas} open structural occurrences. Can you list them?`,
        "What is the overall performance summary this month?",
        "Which To-Do tasks are pending?",
        "When was the last managers meeting?",
        "Which stores have not been visited recently?",
        "When was the last visit of each manager to each store?",
        "How did complementary sales evolve this month vs last month?",
        "Which stores had the highest sales growth?",
        "Which manager visited the most stores this month?",
      ];
    }
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
      "Quando foi a última visita de cada gestor a cada loja?",
      "Como evoluíram as vendas complementares este mês vs o anterior?",
      "Quais lojas tiveram maior crescimento nas vendas?",
      "Qual gestor visitou mais lojas este mês?",
    ];
  } catch (error) {
    if (language === 'en') {
      return [
        "How many stores do we have on the platform?",
        "What are the active pending items?",
        "What is the overall performance summary?",
        "Which alerts are pending?",
        "Which To-Do tasks need attention?",
      ];
    }
    return [
      "Quantas lojas temos na plataforma?",
      "Quais são os pendentes ativos?",
      "Qual o resumo geral da performance?",
      "Quais alertas estão pendentes?",
      "Quais tarefas To-Do precisam de atenção?",
    ];
  }
}
