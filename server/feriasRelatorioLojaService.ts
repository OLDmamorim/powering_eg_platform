import { invokeLLM } from "./_core/llm";

// Procedimento Interno N.º 8 — Regras de Férias
const REGRAS_FERIAS = `
=== PROCEDIMENTO INTERNO N.º 8 — FÉRIAS ANO 2026 (ExpressGlass) ===

REGRAS CRÍTICAS PARA LOJAS:
- Total: 22 dias úteis por ano (obrigatório para processamento do subsídio de férias)
- 1.º Período (1 Jan – 31 Mai): mínimo 5 dias obrigatórios (~23% dos 22 dias)
- 2.º Período (1 Jun – 15 Set): MÁXIMO 10 dias úteis por colaborador (~45% dos 22 dias)
- 3.º Período (16 Set – 30 Nov): agendar períodos pretendidos livremente
- 4.º Período (1 Dez – 31 Dez): mínimo de dias possível (ideal: 0-3 dias)
- Máximo 1 colaborador de férias por loja em cada momento
- Responsáveis de lojas NÃO podem tirar férias na última semana do ano
- BENEFÍCIO: quem NÃO marcar férias de 1 Abr a 30 Set tem prioridade + 1 dia extra OU voucher 100€
`;

interface ColabFerias {
  nome: string;
  loja: string;
  gestor: string;
  dias: Record<string, string>; // "M-D" -> status
  totalAprovados: number;
  totalNaoAprovados: number;
  totalFeriados: number;
  totalFaltas: number;
}

export interface AnaliseColaborador {
  nome: string;
  totalPedidos: number; // TODOS os dias pedidos (aprovados + não aprovados)
  diasP1: number; // 1.º período: Jan-Mai
  diasP2: number; // 2.º período: Jun-Set
  diasP3: number; // 3.º período: Out-Nov
  diasP4: number; // 4.º período: Dez
  pctP1: number; // % no 1.º período
  pctP2: number; // % no 2.º período
  pctP3: number; // % no 3.º período
  pctP4: number; // % no 4.º período
  corP1: 'green' | 'yellow' | 'red'; // cor baseada em regra
  corP2: 'green' | 'yellow' | 'red';
  corP3: 'green' | 'yellow' | 'red';
  corP4: 'green' | 'yellow' | 'red';
  problemas: string[];
  sugestoes: string[];
  gravidade: 'conforme' | 'aviso' | 'critico';
}

export interface SobreposicaoDia {
  data: string; // "D/M"
  colaboradores: string[];
}

export interface RelatorioLoja {
  loja: string;
  totalColaboradores: number;
  analiseColaboradores: AnaliseColaborador[];
  sobreposicoes: SobreposicaoDia[];
  resumo: {
    conformes: number;
    comAvisos: number;
    criticos: number;
    totalDiasPedidos: number;
    mediaDiasPedidos: number;
    semFeriasPedidas: number;
    comExcessoP2: number; // com excesso no 2.º período
    comDeficitP1: number; // com déficit no 1.º período
    totalSobreposicoes: number;
  };
  recomendacoesIA: string;
}

/**
 * Analisa um colaborador com base nos dias PEDIDOS (aprovados + não aprovados).
 * Calcula a distribuição % por período e detecta violações do regulamento.
 */
function analisarColaborador(c: ColabFerias): AnaliseColaborador {
  let diasP1 = 0, diasP2 = 0, diasP3 = 0, diasP4 = 0;

  // Contar TODOS os dias pedidos (approved + not_approved) — NÃO filtrar por estado
  Object.entries(c.dias).forEach(([key, status]) => {
    if (status !== 'approved' && status !== 'not_approved') return;
    const [mStr] = key.split('-');
    const m = parseInt(mStr);

    if (m >= 1 && m <= 5) diasP1++;
    else if (m >= 6 && m <= 9) diasP2++; // Jun-Set (simplificado para meses completos)
    else if (m >= 10 && m <= 11) diasP3++;
    else if (m === 12) diasP4++;
  });

  const totalPedidos = diasP1 + diasP2 + diasP3 + diasP4;

  // Calcular % de distribuição
  const pctP1 = totalPedidos > 0 ? Math.round((diasP1 / totalPedidos) * 100) : 0;
  const pctP2 = totalPedidos > 0 ? Math.round((diasP2 / totalPedidos) * 100) : 0;
  const pctP3 = totalPedidos > 0 ? Math.round((diasP3 / totalPedidos) * 100) : 0;
  const pctP4 = totalPedidos > 0 ? Math.round((diasP4 / totalPedidos) * 100) : 0;

  const problemas: string[] = [];
  const sugestoes: string[] = [];

  // === REGRAS DE COR E PROBLEMAS ===

  // 1.º Período (Jan-Mai): mínimo 5 dias (~23%)
  let corP1: 'green' | 'yellow' | 'red' = 'green';
  if (totalPedidos > 0 && diasP1 < 5) {
    const faltam = 5 - diasP1;
    corP1 = diasP1 < 3 ? 'red' : 'yellow';
    problemas.push(`1.º período: apenas ${diasP1} dias (${pctP1}%) — mínimo obrigatório: 5 dias`);
    sugestoes.push(`Redistribuir ${faltam} dia(s) de outro período para Jan-Mai`);
  }

  // 2.º Período (Jun-Set): máximo 10 dias (~45%)
  let corP2: 'green' | 'yellow' | 'red' = 'green';
  if (diasP2 > 10) {
    const excesso = diasP2 - 10;
    corP2 = 'red';
    problemas.push(`2.º período: ${diasP2} dias (${pctP2}%) — EXCEDE máximo de 10 dias (+${excesso})`);
    sugestoes.push(`Retirar ${excesso} dia(s) de Jun-Set e redistribuir para 1.º ou 3.º período`);
  } else if (pctP2 > 45 && totalPedidos >= 15) {
    corP2 = 'yellow';
    problemas.push(`2.º período: ${diasP2} dias (${pctP2}%) — concentração elevada (regulamento: máx. ~45%)`);
    sugestoes.push(`Considerar mover alguns dias de Jun-Set para melhor distribuição`);
  }

  // 3.º Período (Out-Nov): livre, mas alertar se 0 dias com total >= 15
  let corP3: 'green' | 'yellow' | 'red' = 'green';
  if (totalPedidos >= 15 && diasP3 === 0 && diasP1 < 12) {
    corP3 = 'yellow';
    problemas.push(`3.º período: 0 dias (${pctP3}%) — distribuição pouco homogénea`);
    sugestoes.push(`Considerar colocar alguns dias em Out-Nov para melhor equilíbrio`);
  }

  // 4.º Período (Dez): mínimo possível (ideal 0-3)
  let corP4: 'green' | 'yellow' | 'red' = 'green';
  if (diasP4 > 5) {
    corP4 = 'red';
    problemas.push(`4.º período: ${diasP4} dias (${pctP4}%) — excesso em Dezembro (ideal: 0-3 dias)`);
    sugestoes.push(`Retirar ${diasP4 - 3} dia(s) de Dezembro e redistribuir`);
  } else if (diasP4 > 3) {
    corP4 = 'yellow';
    problemas.push(`4.º período: ${diasP4} dias (${pctP4}%) — acima do ideal para Dezembro`);
    sugestoes.push(`Considerar mover ${diasP4 - 3} dia(s) de Dezembro para outro período`);
  }

  // Sem férias pedidas
  if (totalPedidos === 0) {
    problemas.push('SEM FÉRIAS PEDIDAS — data-limite era 28 de Fevereiro');
    sugestoes.push('Pedir urgentemente os 22 dias: distribuir ≥5 dias no 1.º período, ≤10 no 2.º, restantes no 3.º');
  }

  // Total insuficiente
  if (totalPedidos > 0 && totalPedidos < 22) {
    const faltam = 22 - totalPedidos;
    problemas.push(`Apenas ${totalPedidos} dias pedidos de 22 — faltam ${faltam} dias`);
    sugestoes.push(`Pedir mais ${faltam} dias, distribuindo pelos períodos com menos concentração`);
  }

  // Gravidade geral
  let gravidade: 'conforme' | 'aviso' | 'critico' = 'conforme';
  if (problemas.length === 0) {
    gravidade = 'conforme';
  } else if (
    problemas.some(p =>
      p.includes('SEM FÉRIAS') ||
      p.includes('EXCEDE') ||
      (p.includes('4.º período') && p.includes('excesso'))
    )
  ) {
    gravidade = 'critico';
  } else {
    gravidade = 'aviso';
  }

  return {
    nome: c.nome,
    totalPedidos,
    diasP1, diasP2, diasP3, diasP4,
    pctP1, pctP2, pctP3, pctP4,
    corP1, corP2, corP3, corP4,
    problemas,
    sugestoes,
    gravidade,
  };
}

/**
 * Detecta sobreposições entre colegas da mesma loja.
 * Conta TODOS os dias pedidos (aprovados + não aprovados).
 */
function detetarSobreposicoes(colaboradores: ColabFerias[]): SobreposicaoDia[] {
  const diasPorData: Record<string, string[]> = {};

  colaboradores.forEach(c => {
    Object.entries(c.dias).forEach(([key, status]) => {
      // Contar TODOS os dias pedidos, não só aprovados
      if (status !== 'approved' && status !== 'not_approved') return;
      const [m, d] = key.split('-');
      const dataKey = `${d}/${m}`;
      if (!diasPorData[dataKey]) diasPorData[dataKey] = [];
      diasPorData[dataKey].push(c.nome);
    });
  });

  return Object.entries(diasPorData)
    .filter(([_, nomes]) => nomes.length > 1)
    .map(([data, colaboradores]) => ({ data, colaboradores }))
    .sort((a, b) => {
      const [dA, mA] = a.data.split('/').map(Number);
      const [dB, mB] = b.data.split('/').map(Number);
      return mA !== mB ? mA - mB : dA - dB;
    });
}

export async function gerarRelatorioLoja(
  colaboradores: ColabFerias[],
  loja: string,
  ano: number
): Promise<RelatorioLoja> {
  // Filtrar colaboradores da loja
  const colabsLoja = colaboradores.filter(c =>
    c.loja.toUpperCase().trim() === loja.toUpperCase().trim()
  );

  if (colabsLoja.length === 0) {
    throw new Error(`Nenhum colaborador encontrado para a loja ${loja}`);
  }

  // Analisar cada colaborador
  const analiseColaboradores = colabsLoja.map(analisarColaborador);

  // Detetar sobreposições
  const sobreposicoes = detetarSobreposicoes(colabsLoja);

  // Calcular resumo
  const conformes = analiseColaboradores.filter(a => a.gravidade === 'conforme').length;
  const comAvisos = analiseColaboradores.filter(a => a.gravidade === 'aviso').length;
  const criticos = analiseColaboradores.filter(a => a.gravidade === 'critico').length;
  const totalDiasPedidos = analiseColaboradores.reduce((s, a) => s + a.totalPedidos, 0);
  const mediaDiasPedidos = colabsLoja.length > 0 ? Math.round(totalDiasPedidos / colabsLoja.length * 10) / 10 : 0;
  const semFeriasPedidas = analiseColaboradores.filter(a => a.totalPedidos === 0).length;
  const comExcessoP2 = analiseColaboradores.filter(a => a.diasP2 > 10).length;
  const comDeficitP1 = analiseColaboradores.filter(a => a.totalPedidos > 0 && a.diasP1 < 5).length;
  const totalSobreposicoes = sobreposicoes.length;

  // Gerar recomendações IA para a loja
  const dadosParaIA = prepararDadosIA(analiseColaboradores, sobreposicoes, loja, ano);
  const recomendacoesIA = await gerarRecomendacoesIALoja(dadosParaIA, loja, ano);

  return {
    loja,
    totalColaboradores: colabsLoja.length,
    analiseColaboradores,
    sobreposicoes,
    resumo: {
      conformes,
      comAvisos,
      criticos,
      totalDiasPedidos,
      mediaDiasPedidos,
      semFeriasPedidas,
      comExcessoP2,
      comDeficitP1,
      totalSobreposicoes,
    },
    recomendacoesIA,
  };
}

function prepararDadosIA(
  analises: AnaliseColaborador[],
  sobreposicoes: SobreposicaoDia[],
  loja: string,
  ano: number
): string {
  let texto = `=== RELATÓRIO LOJA: ${loja} — ANO ${ano} ===\n\n`;
  texto += `Total colaboradores: ${analises.length}\n`;
  texto += `Conformes: ${analises.filter(a => a.gravidade === 'conforme').length}\n`;
  texto += `Com avisos: ${analises.filter(a => a.gravidade === 'aviso').length}\n`;
  texto += `Críticos: ${analises.filter(a => a.gravidade === 'critico').length}\n`;
  texto += `Com excesso no 2.º período (Jun-Set >10 dias): ${analises.filter(a => a.diasP2 > 10).length}\n`;
  texto += `Com déficit no 1.º período (Jan-Mai <5 dias): ${analises.filter(a => a.totalPedidos > 0 && a.diasP1 < 5).length}\n`;
  texto += `Sobreposições (dias com >1 colega de férias): ${sobreposicoes.length}\n\n`;

  texto += `=== DISTRIBUIÇÃO POR COLABORADOR (DIAS PEDIDOS) ===\n`;
  analises.forEach(a => {
    texto += `\n--- ${a.nome} ---\n`;
    texto += `Total dias pedidos: ${a.totalPedidos}\n`;
    texto += `1.º período (Jan-Mai): ${a.diasP1} dias (${a.pctP1}%) — regra: mínimo 5 dias\n`;
    texto += `2.º período (Jun-Set): ${a.diasP2} dias (${a.pctP2}%) — regra: máximo 10 dias\n`;
    texto += `3.º período (Out-Nov): ${a.diasP3} dias (${a.pctP3}%)\n`;
    texto += `4.º período (Dez): ${a.diasP4} dias (${a.pctP4}%) — regra: mínimo possível\n`;
    if (a.problemas.length > 0) {
      texto += `PROBLEMAS:\n`;
      a.problemas.forEach(p => { texto += `  ⚠ ${p}\n`; });
    }
    if (a.problemas.length === 0) {
      texto += `✅ Conforme com o regulamento\n`;
    }
  });

  if (sobreposicoes.length > 0) {
    texto += `\n=== SOBREPOSIÇÕES NA LOJA (${sobreposicoes.length} dias) ===\n`;
    texto += `Regra: Máximo 1 colaborador de férias por loja em cada momento\n`;
    sobreposicoes.forEach(s => {
      texto += `${s.data}: ${s.colaboradores.join(' + ')}\n`;
    });
  }

  return texto;
}

async function gerarRecomendacoesIALoja(
  dados: string,
  loja: string,
  ano: number
): Promise<string> {
  const systemPrompt = `És um especialista em Recursos Humanos da ExpressGlass. Estás a analisar o mapa de férias PEDIDAS (não importa se estão aprovadas ou não) da loja ${loja} para o ano ${ano}.

${REGRAS_FERIAS}

INSTRUÇÕES:
A tua análise foca-se nos DIAS PEDIDOS e na sua DISTRIBUIÇÃO por período. Não te preocupes com o estado de aprovação.

Gera um relatório conciso e PRÁTICO em Markdown com sugestões CONCRETAS de redistribuição de dias de férias para cada colaborador que tem problemas. O relatório deve ser focado em AÇÕES específicas.

Estrutura obrigatória:

## 📋 Resumo da Loja
Breve estado geral (2-3 frases). Destaca o problema principal (ex: concentração excessiva no 2.º período).

## 🔄 Plano de Redistribuição
Para CADA colaborador com problemas, indica:
- A distribuição actual (% por período)
- Exactamente quantos dias mover e de/para que período
- Exemplo: "Retirar 3 dias de Jun-Set e colocar em Jan-Mai (ficaria com 27% no 1.º e 41% no 2.º)"

## ⚠️ Sobreposições na Loja
Se houver dias com mais de 1 colaborador de férias na mesma loja, indica quais e sugere qual deve alterar.
Isto é CRÍTICO — a regra diz que apenas 1 colaborador pode estar de férias por loja em cada momento.

## ✅ Próximos Passos
Lista priorizada de 3-5 ações imediatas.

REGRAS:
- Sê muito específico e prático
- Usa números concretos e percentagens (ex: "retirar 3 dias de Agosto, colocar em Março — ficaria com 27% no 1.º período")
- Linguagem profissional em português europeu
- Não inventes dados
- Foca-te apenas nos colaboradores com problemas de distribuição
- NÃO fales de aprovação/autorização — foca na distribuição dos dias pedidos
- Destaca a GRAVIDADE quando o 2.º período excede os 45%`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analisa os seguintes dados e gera o plano de redistribuição:\n\n${dados}` }
    ]
  });

  const resposta = response.choices[0].message.content;
  return typeof resposta === 'string' ? resposta : 'Erro ao gerar recomendações.';
}
