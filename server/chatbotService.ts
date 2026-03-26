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
  dadosNPS: any[]; // Dados NPS de todas as lojas
  // Novos campos para contexto pessoal
  gestorAtual?: {
    id: number;
    nome: string;
    userId: number;
    lojasAssociadas: any[];
  };
  contextoPessoal?: {
    meusPendentes: any[];
    meusRelatoriosLivres: any[];
    meusRelatoriosCompletos: any[];
    minhasLojas: any[];
    meusAlertas: any[];
    minhasOcorrencias: any[];
    meusTodos: any[];
    minhasVendasComplementares: any[];
    meusResultadosMensais: any[];
    meusNPS: any[]; // NPS das lojas do gestor
  };
}

/**
 * Deteta se a pergunta é pessoal (sobre os dados do próprio utilizador)
 */
function isPerguntaPessoal(pergunta: string): boolean {
  const perguntaLower = pergunta.toLowerCase();
  
  // Padrões que indicam pergunta pessoal
  const padroesPessoais = [
    // Pronomes possessivos
    'meu', 'meus', 'minha', 'minhas',
    // Verbos na primeira pessoa
    'tenho', 'fiz', 'criei', 'visitei', 'resolvi', 'fui',
    // Expressões pessoais
    'eu tenho', 'eu fiz', 'quantos tenho', 'quantas tenho',
    'os meus', 'as minhas', 'das minhas', 'dos meus',
    'para mim', 'sobre mim', 'de mim',
    // Perguntas diretas pessoais
    'quantos pendentes tenho',
    'quantos relatórios fiz',
    'quais são os meus',
    'quais as minhas',
    'minhas lojas',
    'meus pendentes',
    'meus relatórios',
    'meus alertas',
    'minhas visitas',
    'minhas tarefas',
    'meu desempenho',
    'minha performance',
    // Expressões de posse
    'que me pertencem',
    'que são meus',
    'que são minhas',
    'atribuídos a mim',
    'atribuídas a mim',
    'associados a mim',
    'associadas a mim',
  ];
  
  return padroesPessoais.some(padrao => perguntaLower.includes(padrao));
}

/**
 * Obtém todo o contexto da plataforma para o chatbot
 * Agora inclui contexto pessoal filtrado para o gestor logado
 */
async function obterContextoPlataforma(userId: number, userRole: string): Promise<ContextoPlataforma> {
  const isAdmin = userRole === 'admin';
  
  // Obter dados base - sempre carrega todos para perguntas gerais
  const lojas = await db.getAllLojas();
  const gestores = await db.getAllGestores();
  
  // Obter associação gestor-loja para cada gestor (com número de colaboradores)
  const gestorLojas: any[] = [];
  for (const gestor of gestores) {
    const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
    gestorLojas.push({
      gestorId: gestor.id,
      gestorNome: gestor.user?.name || 'Desconhecido',
      lojas: lojasDoGestor.map(l => ({ id: l.id, nome: l.nome, numColaboradores: l.numColaboradores }))
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
  
  // ========== NPS - Net Promoter Score ==========
  const anoNPS = agora.getFullYear();
  let dadosNPS: any[] = [];
  try {
    const npsResult = await db.getNPSDadosTodasLojas(anoNPS);
    dadosNPS = npsResult || [];
    // Tentar também o ano anterior se estamos no início do ano
    if (mesAtual <= 2) {
      const npsAnoAnterior = await db.getNPSDadosTodasLojas(anoNPS - 1);
      if (npsAnoAnterior && npsAnoAnterior.length > 0) {
        dadosNPS = [...dadosNPS, ...npsAnoAnterior];
      }
    }
  } catch (e) {
    console.error('Erro ao carregar dados NPS para chatbot:', e);
  }
  
  // ========== NOVO: Contexto pessoal para gestores ==========
  let gestorAtual: ContextoPlataforma['gestorAtual'] = undefined;
  let contextoPessoal: ContextoPlataforma['contextoPessoal'] = undefined;
  
  if (!isAdmin) {
    // Obter o gestor associado ao user logado
    const gestor = await db.getGestorByUserId(userId);
    
    if (gestor) {
      // Obter lojas associadas ao gestor
      const lojasDoGestor = await db.getLojasByGestorId(gestor.id);
      const lojaIdsDoGestor = lojasDoGestor.map(l => l.id);
      
      // Obter nome do gestor
      const gestorCompleto = gestores.find(g => g.id === gestor.id);
      const nomeGestor = gestorCompleto?.user?.name || 'Gestor';
      
      gestorAtual = {
        id: gestor.id,
        nome: nomeGestor,
        userId: userId,
        lojasAssociadas: lojasDoGestor
      };
      
      // Filtrar dados pessoais
      contextoPessoal = {
        meusPendentes: pendentes.filter(p => lojaIdsDoGestor.includes(p.lojaId)),
        meusRelatoriosLivres: relatoriosLivres.filter(r => r.gestorId === gestor.id),
        meusRelatoriosCompletos: relatoriosCompletos.filter(r => r.gestorId === gestor.id),
        minhasLojas: lojasDoGestor,
        meusAlertas: alertas.filter(a => lojaIdsDoGestor.includes(a.lojaId)),
        // Ocorrências estruturais podem ter lojasAfetadas como JSON string
        minhasOcorrencias: ocorrencias.filter(o => {
          if (o.gestorId === gestor.id) return true;
          // Verificar se alguma das lojas afetadas pertence ao gestor
          if (o.lojasAfetadas) {
            try {
              const lojasAfetadas = typeof o.lojasAfetadas === 'string' ? JSON.parse(o.lojasAfetadas) : o.lojasAfetadas;
              if (Array.isArray(lojasAfetadas)) {
                return lojasAfetadas.some((lojaId: number) => lojaIdsDoGestor.includes(lojaId));
              }
            } catch (e) {
              // Ignorar erro de parse
            }
          }
          return false;
        }),
        // Todos: filtrar por quem criou ou por loja atribuída
        meusTodos: todos.filter(t => t.criadoPorId === userId || lojaIdsDoGestor.includes(t.atribuidoLojaId || 0)),
        minhasVendasComplementares: vendasComplementares.filter(v => lojaIdsDoGestor.includes(v.lojaId)),
        meusResultadosMensais: resultadosMensais.filter(r => lojaIdsDoGestor.includes(r.lojaId)),
        meusNPS: dadosNPS.filter((n: any) => lojaIdsDoGestor.includes(n.nps?.lojaId || n.lojaId))
      };
    }
  }
  
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
    estatisticasGerais,
    dadosNPS,
    gestorAtual,
    contextoPessoal
  };
}

/**
 * Formata o contexto pessoal do gestor para o prompt
 */
function formatarContextoPessoal(contexto: ContextoPlataforma): string {
  if (!contexto.gestorAtual || !contexto.contextoPessoal) {
    return '';
  }
  
  const cp = contexto.contextoPessoal;
  const gestor = contexto.gestorAtual;
  
  let texto = `\n\n========================================\n`;
  texto += `👤 DADOS PESSOAIS DO GESTOR LOGADO: ${gestor.nome}\n`;
  texto += `========================================\n\n`;
  
  // Lojas associadas com número de colaboradores
  texto += `🏪 MINHAS LOJAS (${gestor.lojasAssociadas.length}):\n`;
  gestor.lojasAssociadas.forEach((l: any) => {
    const numColab = l.numColaboradores !== undefined ? l.numColaboradores : 'N/A';
    texto += `- ${l.nome} (ID: ${l.id}) - ${numColab} colaborador${numColab !== 1 ? 'es' : ''}\n`;
    // Informações complementares da loja (se existirem)
    const infoComplementar: string[] = [];
    if (l.telefone) infoComplementar.push(`Tel: ${l.telefone}`);
    if (l.telemovel) infoComplementar.push(`Tlm: ${l.telemovel}`);
    if (l.morada) {
      let moradaCompleta = l.morada;
      if (l.codigoPostal) moradaCompleta += `, ${l.codigoPostal}`;
      if (l.localidade) moradaCompleta += ` ${l.localidade}`;
      infoComplementar.push(`Morada: ${moradaCompleta}`);
    }
    if (l.areaM2) infoComplementar.push(`Área: ${l.areaM2} m²`);
    if (l.renda) infoComplementar.push(`Renda: ${l.renda}`);
    if (l.senhorio) infoComplementar.push(`Senhorio: ${l.senhorio}`);
    if (l.contactoSenhorio) infoComplementar.push(`Contacto Senhorio: ${l.contactoSenhorio}`);
    if (l.observacoesImovel) infoComplementar.push(`Obs. Imóvel: ${l.observacoesImovel}`);
    if (infoComplementar.length > 0) {
      texto += `  📍 ${infoComplementar.join(' | ')}\n`;
    }
  });
  texto += '\n';
  
  // Meus pendentes
  const pendentesAtivos = cp.meusPendentes.filter(p => !p.resolvido);
  const pendentesResolvidos = cp.meusPendentes.filter(p => p.resolvido);
  texto += `📋 MEUS PENDENTES:\n`;
  texto += `- Total: ${cp.meusPendentes.length} (${pendentesAtivos.length} ativos, ${pendentesResolvidos.length} resolvidos)\n`;
  if (pendentesAtivos.length > 0) {
    texto += `\nPendentes ativos:\n`;
    pendentesAtivos.slice(0, 10).forEach(p => {
      const loja = gestor.lojasAssociadas.find(l => l.id === p.lojaId);
      const data = p.dataCriacao ? new Date(p.dataCriacao).toLocaleDateString('pt-PT') : 'N/A';
      texto += `  - [${loja?.nome || 'N/A'}] ${p.descricao?.substring(0, 60) || 'Sem descrição'}... (${data})\n`;
    });
    if (pendentesAtivos.length > 10) {
      texto += `  ... e mais ${pendentesAtivos.length - 10} pendentes\n`;
    }
  }
  texto += '\n';
  
  // Meus relat\u00f3rios
  texto += `\ud83d\udcdd MEUS RELAT\u00d3RIOS:\n`;
  texto += `- Relat\u00f3rios Livres: ${cp.meusRelatoriosLivres.length}\n`;
  texto += `- Relat\u00f3rios Completos: ${cp.meusRelatoriosCompletos.length}\n`;
  texto += `- Total: ${cp.meusRelatoriosLivres.length + cp.meusRelatoriosCompletos.length}\n`;
  
  // Todos os relat\u00f3rios ordenados por data
  const todosRelatorios = [
    ...cp.meusRelatoriosLivres.map(r => ({ ...r, tipo: 'livre' })),
    ...cp.meusRelatoriosCompletos.map(r => ({ ...r, tipo: 'completo' }))
  ].sort((a, b) => new Date(b.dataVisita).getTime() - new Date(a.dataVisita).getTime());
  
  // Resumo mensal de lojas visitadas (para responder corretamente a perguntas sobre per\u00edodos)
  const visitasPorMes = new Map<string, Set<string>>();
  todosRelatorios.forEach(r => {
    const d = new Date(r.dataVisita);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!visitasPorMes.has(chave)) visitasPorMes.set(chave, new Set());
    visitasPorMes.get(chave)!.add(r.loja?.nome || 'N/A');
  });
  
  const NOMES_MESES_PT = ['Janeiro', 'Fevereiro', 'Mar\u00e7o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  if (visitasPorMes.size > 0) {
    texto += `\nLOJAS VISITADAS POR M\u00caS (com base nos relat\u00f3rios):\n`;
    // Ordenar por m\u00eas mais recente
    const mesesOrdenados = Array.from(visitasPorMes.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    mesesOrdenados.slice(0, 6).forEach(([chave, lojas]) => {
      const [ano, mes] = chave.split('-');
      const nomeMes = NOMES_MESES_PT[parseInt(mes) - 1];
      const lojasArray = Array.from(lojas);
      // Identificar lojas N\u00c3O visitadas neste m\u00eas
      const lojasNaoVisitadas = gestor.lojasAssociadas
        .filter((l: any) => !lojas.has(l.nome))
        .map((l: any) => l.nome);
      texto += `  ${nomeMes} ${ano}: Visitadas (${lojasArray.length}): ${lojasArray.join(', ')}\n`;
      if (lojasNaoVisitadas.length > 0) {
        texto += `    N\u00e3o visitadas (${lojasNaoVisitadas.length}): ${lojasNaoVisitadas.join(', ')}\n`;
      } else {
        texto += `    Todas as lojas foram visitadas!\n`;
      }
    });
  }
  texto += '\n';
  
  if (todosRelatorios.length > 0) {
    texto += `\u00daltimos 10 relat\u00f3rios:\n`;
    todosRelatorios.slice(0, 10).forEach(r => {
      const data = new Date(r.dataVisita).toLocaleDateString('pt-PT');
      const lojaNome = r.loja?.nome || 'N/A';
      texto += `  - [${data}] ${lojaNome} - ${r.tipo}\n`;
    });
  }
  texto += '\n';
  // Meus alertas
  const alertasPendentes = cp.meusAlertas.filter(a => a.estado === 'pendente');
  texto += `🚨 MEUS ALERTAS:\n`;
  texto += `- Total: ${cp.meusAlertas.length} (${alertasPendentes.length} pendentes)\n`;
  if (alertasPendentes.length > 0) {
    texto += `\nAlertas pendentes:\n`;
    alertasPendentes.slice(0, 5).forEach(a => {
      const loja = gestor.lojasAssociadas.find(l => l.id === a.lojaId);
      texto += `  - [${loja?.nome || 'N/A'}] ${a.tipo}: ${a.descricao?.substring(0, 50) || 'Sem descrição'}...\n`;
    });
  }
  texto += '\n';
  
  // Minhas ocorrências
  const ocorrenciasAbertas = cp.minhasOcorrencias.filter(o => o.estado !== 'resolvido');
  texto += `🔧 MINHAS OCORRÊNCIAS ESTRUTURAIS:\n`;
  texto += `- Total: ${cp.minhasOcorrencias.length} (${ocorrenciasAbertas.length} abertas)\n`;
  if (ocorrenciasAbertas.length > 0) {
    texto += `\nOcorrências abertas:\n`;
    ocorrenciasAbertas.slice(0, 5).forEach(o => {
      const loja = gestor.lojasAssociadas.find(l => l.id === o.lojaId);
      texto += `  - [${loja?.nome || 'N/A'}] ${o.descricao?.substring(0, 50) || 'Sem descrição'}...\n`;
    });
  }
  texto += '\n';
  
  // Minhas tarefas To-Do
  const todosPendentes = cp.meusTodos.filter(t => !t.concluido);
  texto += `✅ MINHAS TAREFAS TO-DO:\n`;
  texto += `- Total: ${cp.meusTodos.length} (${todosPendentes.length} pendentes)\n`;
  if (todosPendentes.length > 0) {
    texto += `\nTarefas pendentes:\n`;
    todosPendentes.slice(0, 5).forEach(t => {
      texto += `  - ${t.titulo || 'Sem título'}\n`;
    });
  }
  texto += '\n';
  
  // NPS das minhas lojas
  if (cp.meusNPS && cp.meusNPS.length > 0) {
    const mesesNPS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const camposNPS = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'];
    const camposTaxa = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'];
    
    texto += `📊 NPS DAS MINHAS LOJAS (ELEGIBILIDADE PARA PRÉMIO):\n`;
    texto += `Regras: NPS >= 80% E Taxa de Resposta >= 7,5% para ter direito a prémio\n\n`;
    
    cp.meusNPS.forEach((item: any) => {
      const nps = item.nps || item;
      const loja = item.loja || { nome: 'N/A' };
      const lojaNome = loja.nome || 'N/A';
      const ano = nps.ano || 'N/A';
      
      texto += `  🏪 ${lojaNome} (${ano}):\n`;
      
      for (let i = 0; i < 12; i++) {
        const npsVal = nps[camposNPS[i]];
        const taxaVal = nps[camposTaxa[i]];
        if (npsVal != null) {
          const npsPercent = (parseFloat(npsVal) * 100).toFixed(1);
          const taxaPercent = taxaVal ? (parseFloat(taxaVal) * 100).toFixed(1) : 'N/A';
          const npsOk = parseFloat(npsVal) >= 0.80;
          const taxaOk = taxaVal ? parseFloat(taxaVal) >= 0.075 : false;
          const elegivel = npsOk && taxaOk;
          const status = elegivel ? '✅ Elegível' : '❌ Sem prémio';
          let motivo = '';
          if (!elegivel) {
            const motivos: string[] = [];
            if (!npsOk) motivos.push(`NPS ${npsPercent}% < 80%`);
            if (!taxaOk) motivos.push(`Taxa ${taxaPercent}% < 7,5%`);
            motivo = ` (${motivos.join(', ')})`;
          }
          texto += `    ${mesesNPS[i]}: NPS ${npsPercent}% | Taxa Resp: ${taxaPercent}% | ${status}${motivo}\n`;
        }
      }
      
      // NPS e taxa anual
      if (nps.npsAnoTotal) {
        const npsAnual = (parseFloat(nps.npsAnoTotal) * 100).toFixed(1);
        const taxaAnual = nps.taxaRespostaAnoTotal ? (parseFloat(nps.taxaRespostaAnoTotal) * 100).toFixed(1) : 'N/A';
        texto += `    📊 TOTAL ANO: NPS ${npsAnual}% | Taxa Resp: ${taxaAnual}%\n`;
      }
      texto += '\n';
    });
  }
  texto += '\n';
  
  // Resumo de performance das minhas lojas
  if (cp.meusResultadosMensais.length > 0) {
    texto += `📊 PERFORMANCE DAS MINHAS LOJAS (último mês disponível):\n`;
    // Agrupar por loja e pegar o mais recente
    const resultadosPorLoja: Record<number, any> = {};
    cp.meusResultadosMensais.forEach(r => {
      if (!resultadosPorLoja[r.lojaId] || 
          (r.ano > resultadosPorLoja[r.lojaId].ano) ||
          (r.ano === resultadosPorLoja[r.lojaId].ano && r.mes > resultadosPorLoja[r.lojaId].mes)) {
        resultadosPorLoja[r.lojaId] = r;
      }
    });
    
    Object.values(resultadosPorLoja).forEach(r => {
      const desvio = r.desvioPercentualMes != null 
        ? (typeof r.desvioPercentualMes === 'number' ? r.desvioPercentualMes * 100 : parseFloat(r.desvioPercentualMes) * 100).toFixed(1) + '%' 
        : 'N/A';
      const taxaRep = r.taxaReparacao != null
        ? (typeof r.taxaReparacao === 'number' ? r.taxaReparacao * 100 : parseFloat(r.taxaReparacao) * 100).toFixed(1) + '%'
        : 'N/A';
      const qtdReparacoes = r.qtdReparacoes || 0;
      const qtdParaBrisas = r.qtdParaBrisas || 0;
      texto += `- ${r.lojaNome}: ${r.totalServicos || 0} serviços, objetivo: ${r.objetivoMensal || 'N/A'}, desvio: ${desvio}, taxa reparação: ${taxaRep}, reparações: ${qtdReparacoes}, para-brisas: ${qtdParaBrisas}\n`;
    });
    texto += '\n';
  }
  
  return texto;
}

/**
 * Formata todo o contexto da plataforma para incluir no prompt
 */
function formatarContextoParaPrompt(contexto: ContextoPlataforma): string {
  let texto = `\n\n========================================\n`;
  texto += `📊 DADOS DA PLATAFORMA (VISÃO NACIONAL/GERAL)\n`;
  texto += `========================================\n\n`;
  
  // Lojas com número de colaboradores e objetivo mensal (do período mais recente)
  texto += `🏪 LOJAS (${contexto.lojas.length}):\n`;
  
  // Criar mapa de objetivos mensais mais recentes por loja
  const objetivosPorLoja = new Map<number, number>();
  if (contexto.resultadosMensais && contexto.resultadosMensais.length > 0) {
    // Agrupar por loja e pegar o mais recente
    const resultadosPorLoja = new Map<number, any[]>();
    contexto.resultadosMensais.forEach((r: any) => {
      if (!resultadosPorLoja.has(r.lojaId)) {
        resultadosPorLoja.set(r.lojaId, []);
      }
      resultadosPorLoja.get(r.lojaId)!.push(r);
    });
    
    // Para cada loja, pegar o resultado mais recente
    resultadosPorLoja.forEach((resultados, lojaId) => {
      const maisRecente = resultados.sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano;
        return b.mes - a.mes;
      })[0];
      if (maisRecente.objetivoMensal) {
        objetivosPorLoja.set(lojaId, maisRecente.objetivoMensal);
      }
    });
  }
  
  contexto.lojas.forEach((l: any) => {
    const numColab = l.numColaboradores !== undefined ? l.numColaboradores : 'N/A';
    const objMensal = objetivosPorLoja.get(l.id);
    const objInfo = objMensal ? ` - 🎯 Obj. Mensal: ${objMensal} serviços` : '';
    texto += `- ${l.nome} (ID: ${l.id}) - ${numColab} colaborador${numColab !== 1 ? 'es' : ''}${objInfo}${l.email ? ` - Email: ${l.email}` : ''}\n`;
    // Informações complementares da loja (se existirem)
    const infoComplementar: string[] = [];
    if (l.telefone) infoComplementar.push(`Tel: ${l.telefone}`);
    if (l.telemovel) infoComplementar.push(`Tlm: ${l.telemovel}`);
    if (l.morada) {
      let moradaCompleta = l.morada;
      if (l.codigoPostal) moradaCompleta += `, ${l.codigoPostal}`;
      if (l.localidade) moradaCompleta += ` ${l.localidade}`;
      infoComplementar.push(`Morada: ${moradaCompleta}`);
    }
    if (l.areaM2) infoComplementar.push(`Área: ${l.areaM2} m²`);
    if (l.renda) infoComplementar.push(`Renda: ${l.renda}`);
    if (l.senhorio) infoComplementar.push(`Senhorio: ${l.senhorio}`);
    if (l.contactoSenhorio) infoComplementar.push(`Contacto Senhorio: ${l.contactoSenhorio}`);
    if (l.observacoesImovel) infoComplementar.push(`Obs. Imóvel: ${l.observacoesImovel}`);
    if (infoComplementar.length > 0) {
      texto += `  📍 ${infoComplementar.join(' | ')}\n`;
    }
  });
  texto += '\n';
  
  // Gestores e suas lojas (com número de colaboradores)
  texto += `👥 GESTORES E SUAS LOJAS:\n`;
  contexto.gestorLojas.forEach(g => {
    const lojas = g.lojas.map((l: any) => `${l.nome} (${l.numColaboradores || 0} colab.)`).join(', ') || 'Nenhuma';
    texto += `- ${g.gestorNome}: ${lojas}\n`;
  });
  texto += '\n';
  
  // Pendentes
  const pendentesAtivos = contexto.pendentes.filter(p => !p.resolvido);
  texto += `📋 PENDENTES (${pendentesAtivos.length} ativos de ${contexto.pendentes.length} total):\n`;
  pendentesAtivos.slice(0, 15).forEach(p => {
    const data = p.dataCriacao ? new Date(p.dataCriacao).toLocaleDateString('pt-PT') : 'N/A';
    texto += `- [${p.lojaNome || 'N/A'}] ${p.descricao?.substring(0, 60) || 'Sem descrição'}... (${data})\n`;
  });
  if (pendentesAtivos.length > 15) {
    texto += `... e mais ${pendentesAtivos.length - 15} pendentes\n`;
  }
  texto += '\n';
  
  // Relatórios Livres (últimos 20)
  texto += `📝 RELATÓRIOS LIVRES (últimos 20 de ${contexto.relatoriosLivres.length}):\n`;
  contexto.relatoriosLivres.slice(0, 20).forEach(r => {
    const data = new Date(r.dataVisita).toLocaleDateString('pt-PT');
    const gestorNome = r.gestor?.user?.name || 'N/A';
    texto += `- [${data}] ${gestorNome} → ${r.loja?.nome || 'N/A'}: ${r.descricao?.substring(0, 50) || 'Sem descrição'}...\n`;
  });
  texto += '\n';
  
  // Relatórios Completos (últimos 20)
  texto += `📋 RELATÓRIOS COMPLETOS (últimos 20 de ${contexto.relatoriosCompletos.length}):\n`;
  contexto.relatoriosCompletos.slice(0, 20).forEach(r => {
    const data = new Date(r.dataVisita).toLocaleDateString('pt-PT');
    const gestorNome = r.gestor?.user?.name || 'N/A';
    texto += `- [${data}] ${gestorNome} → ${r.loja?.nome || 'N/A'}: ${r.resumo?.substring(0, 50) || 'Sem resumo'}...\n`;
  });
  texto += '\n';
  
  // Alertas
  const alertasPendentes = contexto.alertas.filter(a => a.estado === 'pendente');
  texto += `🚨 ALERTAS (${alertasPendentes.length} pendentes de ${contexto.alertas.length} total):\n`;
  alertasPendentes.slice(0, 10).forEach(a => {
    texto += `- [${a.lojaNome || 'N/A'}] ${a.tipo}: ${a.descricao?.substring(0, 50) || 'Sem descrição'}...\n`;
  });
  texto += '\n';
  
  // Ocorrências Estruturais
  const ocorrenciasAbertas = contexto.ocorrencias.filter(o => o.estado !== 'resolvido');
  texto += `🔧 OCORRÊNCIAS ESTRUTURAIS (${ocorrenciasAbertas.length} abertas de ${contexto.ocorrencias.length} total):\n`;
  ocorrenciasAbertas.slice(0, 10).forEach(o => {
    texto += `- [${o.lojaNome || 'N/A'}] ${o.descricao?.substring(0, 50) || 'Sem descrição'}... - Estado: ${o.estado}\n`;
  });
  texto += '\n';
  
  // Tarefas To-Do
  const todosPendentes = contexto.todos.filter(t => !t.concluido);
  texto += `✅ TAREFAS TO-DO (${todosPendentes.length} pendentes de ${contexto.todos.length} total):\n`;
  todosPendentes.slice(0, 10).forEach(t => {
    texto += `- ${t.titulo || 'Sem título'} - Prioridade: ${t.prioridade || 'normal'}\n`;
  });
  texto += '\n';
  
  // Reuniões de Gestores (últimas 5)
  texto += `📅 REUNIÕES DE GESTORES (últimas 5 de ${contexto.reunioesGestores.length}):\n`;
  contexto.reunioesGestores.slice(0, 5).forEach(r => {
    const data = new Date(r.dataReuniao).toLocaleDateString('pt-PT');
    texto += `- [${data}] ${r.resumo?.substring(0, 50) || 'Sem resumo'}${r.resumo?.length > 50 ? '...' : ''}\n`;
  });
  texto += '\n';
  
  // Reuniões de Lojas (últimas 10)
  texto += `🏪 REUNIÕES DE LOJAS (últimas 10 de ${contexto.reunioesLojas.length}):\n`;
  contexto.reunioesLojas.slice(0, 10).forEach(r => {
    const data = new Date(r.dataReuniao).toLocaleDateString('pt-PT');
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
        const qtdReparacoes = r.qtdReparacoes || 0;
        const qtdParaBrisas = r.qtdParaBrisas || 0;
        const objetivoDia = r.objetivoDiaAtual != null ? parseFloat(r.objetivoDiaAtual).toFixed(1) : 'N/A';
        const desvioDia = r.desvioPercentualDia != null
          ? (typeof r.desvioPercentualDia === 'number' ? r.desvioPercentualDia * 100 : parseFloat(r.desvioPercentualDia) * 100).toFixed(1) + '%'
          : 'N/A';
        const servicosRealizados = r.totalServicos || 0;
        const objetivoMensalNum = r.objetivoMensal || 0;
        const objetivoDiaNum = r.objetivoDiaAtual != null ? parseFloat(r.objetivoDiaAtual) : 0;
        const servicosEmFalta = Math.max(0, objetivoMensalNum - servicosRealizados);
        // Calcular dias restantes do mês (assumindo que estamos no dia 17 de Fevereiro 2026, faltam 11 dias)
        const hoje = new Date();
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        const diasRestantes = Math.max(1, ultimoDiaMes - hoje.getDate());
        const mediaDiariaNecessaria = servicosEmFalta > 0 ? (servicosEmFalta / diasRestantes).toFixed(1) : '0';
        texto += `- ${r.lojaNome}: ${servicosRealizados} serviços realizados, objetivo mensal: ${objetivoMensalNum}, objetivo ao dia: ${objetivoDia}, serviços em falta: ${servicosEmFalta}, média diária necessária: ${mediaDiariaNecessaria} serviços/dia, desvio mensal: ${desvio}, desvio diário: ${desvioDia}, taxa reparação: ${taxaRep}, reparações: ${qtdReparacoes}, para-brisas: ${qtdParaBrisas}\n`;
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
  
  // ========== DADOS NPS - NET PROMOTER SCORE ==========
  if (contexto.dadosNPS && contexto.dadosNPS.length > 0) {
    const mesesNPS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const camposNPS = ['npsJan', 'npsFev', 'npsMar', 'npsAbr', 'npsMai', 'npsJun', 'npsJul', 'npsAgo', 'npsSet', 'npsOut', 'npsNov', 'npsDez'];
    const camposTaxa = ['taxaRespostaJan', 'taxaRespostaFev', 'taxaRespostaMar', 'taxaRespostaAbr', 'taxaRespostaMai', 'taxaRespostaJun', 'taxaRespostaJul', 'taxaRespostaAgo', 'taxaRespostaSet', 'taxaRespostaOut', 'taxaRespostaNov', 'taxaRespostaDez'];
    
    texto += `\n🌟 DADOS NPS - NET PROMOTER SCORE (ELEGIBILIDADE PARA PRÉMIO):\n`;
    texto += `========================================\n`;
    texto += `REGRAS DE ELEGIBILIDADE: NPS >= 80% E Taxa de Resposta >= 7,5% para ter direito a prémio\n`;
    texto += `Se NPS < 80% OU Taxa de Resposta < 7,5% -> SEM DIREITO A PRÉMIO (aplica-se a TODAS as comissões)\n\n`;
    
    // Agrupar por ano
    const npsPorAno: Record<number, any[]> = {};
    contexto.dadosNPS.forEach((item: any) => {
      const nps = item.nps || item;
      const ano = nps.ano;
      if (!npsPorAno[ano]) npsPorAno[ano] = [];
      npsPorAno[ano].push(item);
    });
    
    // Ordenar anos (mais recente primeiro)
    const anosOrdenados = Object.keys(npsPorAno).map(Number).sort((a, b) => b - a);
    
    for (const ano of anosOrdenados) {
      const items = npsPorAno[ano];
      texto += `=== ANO ${ano} (${items.length} lojas com dados NPS) ===\n\n`;
      
      // Resumo de elegibilidade por mês
      for (let mesIdx = 0; mesIdx < 12; mesIdx++) {
        const lojasComDados = items.filter((item: any) => {
          const nps = item.nps || item;
          return nps[camposNPS[mesIdx]] != null;
        });
        
        if (lojasComDados.length > 0) {
          const elegiveis = lojasComDados.filter((item: any) => {
            const nps = item.nps || item;
            const npsVal = parseFloat(nps[camposNPS[mesIdx]]);
            const taxaVal = nps[camposTaxa[mesIdx]] ? parseFloat(nps[camposTaxa[mesIdx]]) : 0;
            return npsVal >= 0.80 && taxaVal >= 0.075;
          });
          
          texto += `  📅 ${mesesNPS[mesIdx]} ${ano}: ${elegiveis.length}/${lojasComDados.length} lojas elegíveis para prémio\n`;
        }
      }
      texto += '\n';
      
      // Detalhes por loja
      items.forEach((item: any) => {
        const nps = item.nps || item;
        const loja = item.loja || { nome: 'N/A' };
        const lojaNome = loja.nome || 'N/A';
        
        texto += `  🏪 ${lojaNome}:\n`;
        
        for (let i = 0; i < 12; i++) {
          const npsVal = nps[camposNPS[i]];
          const taxaVal = nps[camposTaxa[i]];
          if (npsVal != null) {
            const npsPercent = (parseFloat(npsVal) * 100).toFixed(1);
            const taxaPercent = taxaVal ? (parseFloat(taxaVal) * 100).toFixed(1) : 'N/A';
            const npsOk = parseFloat(npsVal) >= 0.80;
            const taxaOk = taxaVal ? parseFloat(taxaVal) >= 0.075 : false;
            const elegivel = npsOk && taxaOk;
            const status = elegivel ? '✅' : '❌';
            texto += `    ${mesesNPS[i]}: NPS ${npsPercent}% | Taxa ${taxaPercent}% ${status}\n`;
          }
        }
        
        if (nps.npsAnoTotal) {
          const npsAnual = (parseFloat(nps.npsAnoTotal) * 100).toFixed(1);
          const taxaAnual = nps.taxaRespostaAnoTotal ? (parseFloat(nps.taxaRespostaAnoTotal) * 100).toFixed(1) : 'N/A';
          texto += `    TOTAL ANO: NPS ${npsAnual}% | Taxa ${taxaAnual}%\n`;
        }
        texto += '\n';
      });
    }
  }
  
  return texto;
}

/**
 * Processa uma pergunta do utilizador sobre qualquer dado da plataforma
 * Agora com suporte a contexto pessoal vs nacional
 */
export async function processarPergunta(
  pergunta: string,
  historico: ChatMessage[] = [],
  userId: number,
  userRole: string
): Promise<{ resposta: string; dados?: any }> {
  try {
    // 1. Obter todo o contexto da plataforma (incluindo contexto pessoal se for gestor)
    const contexto = await obterContextoPlataforma(userId, userRole);
    
    // 2. Detetar se é uma pergunta pessoal
    const perguntaPessoal = isPerguntaPessoal(pergunta);
    
    // 3. Formatar contexto apropriado
    const contextoNacional = formatarContextoParaPrompt(contexto);
    const contextoPessoalFormatado = formatarContextoPessoal(contexto);
    
    // 4. Construir informação sobre o utilizador atual
    let infoUtilizador = '';
    if (contexto.gestorAtual) {
      infoUtilizador = `\n\n🔐 UTILIZADOR ATUAL: ${contexto.gestorAtual.nome} (Gestor)
Lojas associadas: ${contexto.gestorAtual.lojasAssociadas.map(l => l.nome).join(', ')}`;
    } else if (userRole === 'admin') {
      infoUtilizador = `\n\n🔐 UTILIZADOR ATUAL: Administrador (acesso total)`;
    }
    
    // 5. Construir o prompt do sistema com instruções claras sobre contexto pessoal vs nacional
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
- Resultados mensais e estatísticas de performance (total de serviços, objetivos, desvios, REPARAÇÕES, para-brisas, taxa de reparação)
- Vendas complementares
- DADOS NPS (Net Promoter Score): NPS mensal por loja, taxa de resposta, elegibilidade para prémio
- HISTÓRICO DE VISITAS POR GESTOR: Podes responder a perguntas como "Quando foi a última visita do gestor X à loja Y?" ou "Quantas visitas fez o gestor X este mês?"
- COMPARAÇÃO DE VENDAS ENTRE PERÍODOS: Podes analisar a evolução das vendas complementares entre meses, identificar tendências de crescimento ou queda, e comparar performance entre lojas
- POLÍTICA DE COMISSIONAMENTO 2026: Conheces toda a política de prémios e comissões da ExpressGlass. Podes responder a perguntas sobre cálculos de comissões, regras, penalizações e fazer simulações

=== POLÍTICA DE COMISSIONAMENTO 2026 - EXPRESSGLASS ===

**ÂMBITO:** Normas de atribuição de prémios para 2026, por cumprimento de objetivos nas Lojas e Serviços Móveis.

**DESTINATÁRIOS:** Responsáveis de Loja e Serviço Móvel, Coordenadores de Serviço Móvel e Técnicos Colocadores de Vidros.
Período de carência: 2 meses para novos colaboradores.
Não aplicável a trabalhadores em regime de Trabalho Temporário.

**REGRA CRÍTICA - FTE (Full Time Equivalent) - APLICA-SE A TODO O COMISSIONAMENTO:** 
- O FTE é o critério base para QUALQUER prémio (serviços, reparações QIV, vendas complementares, etc.)
- Se a loja NÃO cumprir o FTE mínimo, NÃO TEM DIREITO A NENHUM PRÉMIO (0€ em TODAS as categorias)
- O cálculo de comissões é SEMPRE por colaborador, NÃO pelo total de serviços da loja
- Para calcular serviços por colaborador: Total de Serviços da Loja ÷ Número de Colaboradores
- Mínimo 35 serviços por colaborador para ter direito a QUALQUER prémio
- Se uma loja com 3 colaboradores fizer 82 serviços: 82 ÷ 3 = 27,3 serviços/colaborador → SEM DIREITO A NENHUM PRÉMIO (0€ em tudo: serviços, QIV, vendas)
- Se uma loja com 2 colaboradores fizer 82 serviços: 82 ÷ 2 = 41 serviços/colaborador → Com direito a todos os prémios

**TABELA DE SERVIÇOS MÍNIMOS (FTE):**
| Colaboradores | Serviços Mínimos Totais |
| 1 | 35 |
| 2 | 70 |
| 3 | 105 |
| 4 | 140 |

**1. COMISSÕES POR SERVIÇOS LIGEIROS (por colaborador):**
A tabela abaixo mostra o valor FIXO da comissão POR COLABORADOR para cada número de serviços.
IMPORTANTE: Os valores são FIXOS - consulta-se a tabela e obtém-se o valor direto.
A terceira coluna (€/serviço adicional) é APENAS INFORMATIVA de como os valores foram calculados internamente, NÃO SE APLICA ao cálculo real de comissões.
NÃO EXISTE valor adicional por serviço - o valor da comissão é o que está na tabela, ponto final.
Para calcular a comissão TOTAL da loja: consultar tabela + multiplicar pelo número de colaboradores.
A partir de 60 serviços/colaborador, o valor é SEMPRE 198€ (máximo).

| Serviços/Colab | Comissão/Colaborador | €/Serv Adicional |
|----------------|----------------------|-------------------|
| < 35           | 0€                   | 0€                |
| 35             | 25€                  | 2,5€              |
| 36             | 28,50€               | 3,5€              |
| 37             | 32€                  | 3,5€              |
| 38             | 35,50€               | 3,5€              |
| 39             | 39€                  | 3,5€              |
| 40             | 44€                  | 5€                |
| 41             | 49€                  | 5€                |
| 42             | 54€                  | 5€                |
| 43             | 59€                  | 5€                |
| 44             | 64€                  | 5€                |
| 45             | 71€                  | 7€                |
| 46             | 78€                  | 7€                |
| 47             | 85€                  | 7€                |
| 48             | 92€                  | 7€                |
| 49             | 99€                  | 7€                |
| 50             | 108€                 | 9€                |
| 51             | 117€                 | 9€                |
| 52             | 126€                 | 9€                |
| 53             | 135€                 | 9€                |
| 54             | 144€                 | 9€                |
| 55             | 153€                 | 9€                |
| 56             | 162€                 | 9€                |
| 57             | 171€                 | 9€                |
| 58             | 180€                 | 9€                |
| 59             | 189€                 | 9€                |
| 60             | 198€                 | 9€                |
| 60+            | 198€ (valor fixo)    | N/A               |

**COMO CALCULAR COMISSÃO DE SERVIÇOS LIGEIROS:**
1. Calcular serviços por colaborador: Total Serviços ÷ Nº Colaboradores
2. Verificar se atinge o FTE mínimo (>= 35 serviços/colaborador)
3. Se sim, consultar a tabela para obter a comissão POR COLABORADOR
4. Multiplicar pelo número de colaboradores para obter a comissão TOTAL da loja

Exemplo 1: Loja com 2 colaboradores e 82 serviços totais (Braga):
- Serviços/colaborador: 82 ÷ 2 = 41 (cumpre FTE >= 35)
- Comissão por colaborador (tabela, 41 serv/colab): 49€
- Comissão TOTAL da loja: 49€ × 2 = 98€

Exemplo 2: Loja com 2 colaboradores e 80 serviços totais:
- Serviços/colaborador: 80 ÷ 2 = 40 (cumpre FTE >= 35)
- Comissão por colaborador (tabela, 40 serv/colab): 44€
- Comissão TOTAL da loja: 44€ × 2 = 88€

Exemplo 3: Loja com 1 colaborador e 70 serviços totais:
- Serviços/colaborador: 70 ÷ 1 = 70 (cumpre FTE >= 35)
- Comissão por colaborador: 198€ (valor FIXO da tabela para 60+ serviços)
- Comissão TOTAL da loja: 198€ × 1 = 198€

**1.1 COMISSÕES POR SERVIÇOS PESADOS:**
- Se < 35 serviços ligeiros: 12€ por pesado (0-9) ou 18€ por pesado (10+)
- Se >= 35 serviços ligeiros: 15€ por pesado (0-9) ou 18€ por pesado (10+)

**2. CALIBRAÇÃO:** Mesmo valor dos serviços ligeiros por cada calibragem (se atingir mínimo 35 serviços).

**3. TAXA DE REPARAÇÃO (QIV) - Valor por cada reparação (APENAS SE CUMPRIR FTE):**
- < 25%: 5€
- 25% a 30%: 10€
- 30% a 40%: 12€
- > 40%: 15€
OBJETIVO: Atingir mínimo de 30% de taxa de reparação.
NOTA: Já não existe barreira mínima de 22% para prémio. Todas as lojas recebem comissão QIV independentemente da taxa.
NOTA: Se a loja não cumprir o FTE mínimo (35 serviços/colaborador), a comissão QIV é 0€.

**4. VENDAS COMPLEMENTARES (APENAS SE CUMPRIR FTE):**
- Escovas: 10% do valor faturado
- Películas: 2,5% do valor faturado (5% para Coimbra Sul)
- Outros serviços (polimentos, lavagens, etc.): 30% do valor faturado (apenas serviços, não peças)
NOTA: Se a loja não cumprir o FTE mínimo (35 serviços/colaborador), a comissão de vendas complementares é 0€.
**5. CRITÉRIOS MÍNIMOS OBRIGATÓRIOS (NPS):**
- NPS >= 80% (obrigatório para receber prémio)
- Taxa de Resposta >= 7,5% (obrigatório para receber prémio)
- Se NPS < 80% OU Taxa de Resposta < 7,5% -> A LOJA NÃO TEM DIREITO A NENHUM PRÉMIO
- Os dados NPS estão disponíveis na secção "DADOS NPS" do contexto
- Quando o utilizador perguntar sobre NPS, elegibilidade ou prémios, consulta essa secção
- Podes cruzar dados NPS com dados de serviços para calcular comissões completas

**6. PENALIZAÇÕES TRIMESTRAIS:**
Quebras e Danos em Montagem:
- < 2%: 0% penalização
- 2% a 3%: -10%
- 3% a 4%: -20%
- 4% a 5%: -30%
- > 5%: -50%

Faturas PP Pendentes:
- 0: 0% penalização
- 1 a 2: -10%
- 3 a 5: -20%
- 6 a 10: -30%
- > 10: -50%

**PAGAMENTO:** Trimestral (ex: Jan-Fev-Mar pagos em Abril).

**EXEMPLO DE CÁLCULO (1 colaborador, 45 serviços, 28% taxa reparação, 12 reparações, 5 pesados, 15 escovas a 150€):**
- Serviços por colaborador: 45 ÷ 1 = 45 (>= 35, tem direito a prémio)
- Serviços Ligeiros: 71€
- Serviços Pesados: 5 x 15€ = 75€
- Reparações (28% = 10€/rep): 12 x 10€ = 120€
- Escovas (10%): 150€ x 10% = 15€
- **TOTAL: 281€**

**EXEMPLO COM MÚLTIPLOS COLABORADORES (Braga com 3 colaboradores, 82 serviços totais):**
- Serviços por colaborador: 82 ÷ 3 = 27,3 serviços
- Como 27,3 < 35, a loja NÃO TEM DIREITO A PRÉMIO de serviços ligeiros!
- Comissão de Serviços Ligeiros: 0€

**EXEMPLO COM 2 COLABORADORES (82 serviços totais):**
- Serviços por colaborador: 82 ÷ 2 = 41 serviços
- Como 41 >= 35, tem direito a prémio
- Comissão por colaborador (tabela, 41 serv/colab): 49€
- Comissão TOTAL da loja: 49€ × 2 = **98€**

USA ESTAS REGRAS PARA FAZER CÁLCULOS DE COMISSÕES QUANDO O UTILIZADOR PERGUNTAR.

=== PROCEDIMENTO INTERNO N.º 8 — FÉRIAS ANO 2026 (ExpressGlass) ===

Conheces o regulamento completo de férias da ExpressGlass. Podes responder a perguntas sobre regras de marcação, direitos, prazos e procedimentos.

**PRINCÍPIOS GERAIS:**
- Direito a férias remuneradas em cada ano civil, vence a 1 de janeiro.
- No ano de admissão, direito vence após 6 meses completos de contrato.
- Direito a férias é irrenunciável.
- Férias podem ser interrompidas por: Doença, Licença Parental, Exigências imperiosas da empresa.

**DURAÇÃO:** 22 dias úteis por ano.
- Ano de admissão: 2 dias úteis por mês completo, até máximo 20 dias.
- Admissão entre dia 01 e dia 15 do mês: +1 dia adicional (máx. 20).

**ANO GOZO:** Gozadas no ano civil em que vencem. Por acordo, até 30 de abril do ano seguinte.

**REGRAS INTERNAS - TODOS OS COLABORADORES:**
- Dias de férias de 2025 por gozar: obrigatório agendar e gozar até 30 de abril 2026.
- DATA-LIMITE PARA MARCAÇÃO: 28 de Fevereiro de 2026.
- Não marcação nos prazos: empresa pode marcar.

**REGRAS PARA LOJAS, SERVIÇOS MÓVEIS, GESTORES DE ZONA (CRÍTICAS):**
- Responsáveis de lojas NÃO podem tirar férias na última semana do ano.
- Máximo 1 colaborador de férias por loja em cada momento.
- PARÂMETROS DE MARCAÇÃO POR PERÍODO:
  * 1 Jan – 30 Mai: mínimo 5 dias obrigatórios
  * 1 Jun – 15 Set: MÁXIMO 10 dias úteis por colaborador
  * 16 Set – 30 Nov: agendar livremente
  * 1 Dez – 31 Dez: mínimo de dias possível
- BENEFÍCIO: quem NÃO marcar férias de 1 Abr a 30 Set → prioridade na validação + 1 dia extra OU voucher ODISSEIAS 100€.

**REMARCAÇÃO PELA EMPRESA:**
- Dias em desacordo Jun-Set serão remarcados.
- Critérios: 1º) Períodos gozados em anos anteriores; 2º) Antiguidade.

**SUBSÍDIO DE FÉRIAS:**
- IMPORTANTE: Subsídio apenas processado se colaborador agendar os 22 dias de férias úteis.
- Processado no mês anterior ao do maior período de férias agendadas.
- Subsídio de alimentação descontado na totalidade no mesmo mês.

**TRABALHO TEMPORÁRIO:**
- Vínculo temporário NÃO confere direito a férias sem consulta a RH.

**ELABORAÇÃO DO MAPA:**
- Mapas elaborados até último dia útil de março.
- Afixados entre 15 de Abril e 31 de Outubro.
- Mapa definitivo enviado por RH até 15 de abril.
- Deve ser impresso, carimbado, assinado pelo gestor de zona e colaboradores, digitalizado e enviado para RH.

**CONTACTO RH:** recursoshumanos@expressglass.pt

USA ESTAS REGRAS PARA RESPONDER A PERGUNTAS SOBRE FÉRIAS.

=== IMPORTANTE: CONTEXTO PESSOAL VS NACIONAL ===
${infoUtilizador}

**REGRA CRÍTICA DE CONTEXTO:**
- Quando o utilizador usa termos como "meus", "minhas", "tenho", "fiz", "quantos tenho", etc., DEVES responder APENAS com os dados pessoais do utilizador (secção "DADOS PESSOAIS DO GESTOR LOGADO")
- Quando a pergunta é geral (ex: "quantas lojas existem", "total de pendentes", "qual a loja com mais..."), usa os dados nacionais (secção "DADOS DA PLATAFORMA")

**Exemplos:**
- "Quantos pendentes tenho?" → Responder com os pendentes das lojas do gestor logado
- "Quantos pendentes existem na plataforma?" → Responder com o total nacional
- "Quais são os meus relatórios?" → Responder com os relatórios criados pelo gestor logado
- "Quantos relatórios foram criados este mês?" → Responder com o total nacional
- "Como está a performance das minhas lojas?" → Responder apenas com as lojas do gestor
- "Qual a loja com melhor performance?" → Responder considerando todas as lojas

A pergunta atual é considerada ${perguntaPessoal ? 'PESSOAL - usa os dados pessoais do gestor' : 'GERAL/NACIONAL - usa os dados de toda a plataforma'}.

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

🏢 INFORMAÇÕES COMPLEMENTARES DAS LOJAS:
Cada loja pode ter informações complementares (facultativas): telefone, telemóvel, morada, código postal, localidade, área (m²), renda mensal, senhorio, contacto do senhorio e observações do imóvel.
Estas informações estão disponíveis nos dados de contexto de cada loja.
Quando o utilizador perguntar sobre telefone, morada, renda, senhorio, área ou qualquer informação complementar de uma loja, consulta os dados fornecidos no contexto.
Se a informação não estiver preenchida, informa que ainda não foi registada e sugere que vá à página de Lojas para a adicionar (botão de Info na tabela).

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
13. **MUITO IMPORTANTE**: Respeita sempre a distinção entre perguntas pessoais e gerais. Se a pergunta for pessoal, usa APENAS os dados pessoais do gestor.
14. Para perguntas sobre NPS, elegibilidade para prémio, ou cálculos de comissionamento que envolvam NPS, consulta a secção "DADOS NPS" no contexto
15. Quando calculares comissões, verifica SEMPRE se a loja cumpre os critérios NPS (>= 80%) e Taxa de Resposta (>= 7,5%) - se não cumprir, a comissão é 0€

${contextoPessoalFormatado}
${contextoNacional}`;

    // 6. Gerar resposta com IA
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
        totalTodos: contexto.todos.length,
        perguntaPessoal,
        gestorAtual: contexto.gestorAtual ? {
          nome: contexto.gestorAtual.nome,
          numLojas: contexto.gestorAtual.lojasAssociadas.length
        } : null
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
        // Personal questions
        "How many pending items do I have?",
        "What are my reports this month?",
        "How is the performance of my stores?",
      ];
    }
    return [
      // Perguntas gerais/nacionais
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
      // Perguntas pessoais
      "Quantos pendentes tenho?",
      "Quais são os meus relatórios este mês?",
      "Como está a performance das minhas lojas?",
      "Quantas visitas fiz esta semana?",
      // Perguntas sobre comissões
      "Qual a comissão para 45 serviços por colaborador?",
      "Se uma loja fizer 50 serviços e 15 reparações com taxa de 30%, quanto ganha?",
      "Quais são as penalizações por quebras acima de 3%?",
      "Qual o mínimo de serviços para ter direito a prémio?",
      // Perguntas sobre NPS
      "Qual o NPS das minhas lojas este mês?",
      "Quais lojas são elegíveis para prémio com base no NPS?",
      "Quais lojas têm NPS abaixo de 80%?",
      "Qual a taxa de resposta NPS das lojas da minha zona?",
    ];
  } catch (error) {
    if (language === 'en') {
      return [
        "How many stores do we have on the platform?",
        "What are the active pending items?",
        "What is the overall performance summary?",
        "Which alerts are pending?",
        "Which To-Do tasks need attention?",
        "How many pending items do I have?",
      ];
    }
    return [
      "Quantas lojas temos na plataforma?",
      "Quais são os pendentes ativos?",
      "Qual o resumo geral da performance?",
      "Quais alertas estão pendentes?",
      "Quais tarefas To-Do precisam de atenção?",
      "Quantos pendentes tenho?",
    ];
  }
}
