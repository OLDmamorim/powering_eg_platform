import { invokeLLM } from "./_core/llm";

// Procedimento Interno N.º 8 — Regras de Férias
const REGRAS_FERIAS = `
=== PROCEDIMENTO INTERNO N.º 8 — FÉRIAS ANO 2026 (ExpressGlass) ===

REGRAS CRÍTICAS PARA LOJAS:
- Total: 22 dias úteis por ano (obrigatório para processamento do subsídio de férias)
- 1 Jan – 30 Mai: mínimo 5 dias obrigatórios
- 1 Jun – 15 Set: MÁXIMO 10 dias úteis por colaborador
- 16 Set – 30 Nov: agendar períodos pretendidos livremente
- 1 Dez – 31 Dez: mínimo de dias possível (ideal: 0-3 dias)
- Máximo 1 colaborador de férias por loja em cada momento
- Responsáveis de lojas NÃO podem tirar férias na última semana do ano
- BENEFÍCIO: quem NÃO marcar férias de 1 Abr a 30 Set tem prioridade + 1 dia extra OU voucher 100€
- Subsídio de férias só é processado se colaborador agendar os 22 dias
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

interface AnaliseColaborador {
  nome: string;
  totalAprovados: number;
  totalNaoAprovados: number;
  totalMarcados: number;
  janMai: number;
  junSet: number;
  outNov: number;
  dez: number;
  problemas: string[];
  sugestoes: string[];
  corJanMai: 'green' | 'yellow' | 'red';
  corJunSet: 'green' | 'yellow' | 'red';
  corDez: 'green' | 'yellow' | 'red';
  corTotal: 'green' | 'yellow' | 'red';
  statusGeral: 'green' | 'yellow' | 'red';
}

interface SobreposicaoDia {
  data: string; // "D/M"
  colaboradores: string[];
}

interface RelatorioLoja {
  loja: string;
  totalColaboradores: number;
  analiseColaboradores: AnaliseColaborador[];
  sobreposicoes: SobreposicaoDia[];
  resumo: {
    conformes: number;
    comAvisos: number;
    criticos: number;
    totalDiasAprovados: number;
    mediaAprovados: number;
    semFeriasMarcadas: number;
    subsidioEmRisco: number;
  };
  recomendacoesIA: string;
}

function analisarColaborador(c: ColabFerias): AnaliseColaborador {
  let janMai = 0, junSet = 0, outNov = 0, dez = 0;
  
  Object.entries(c.dias).forEach(([key, status]) => {
    if (status !== 'approved') return;
    const [mStr, dStr] = key.split('-');
    const m = parseInt(mStr);
    const d = parseInt(dStr);
    
    if (m >= 1 && m <= 5) janMai++;
    else if (m >= 6 && m <= 9) junSet++; // Jun-Set (simplificado)
    else if (m >= 10 && m <= 11) outNov++;
    else if (m === 12) dez++;
  });
  
  const problemas: string[] = [];
  const sugestoes: string[] = [];
  
  // Verificar total de dias
  const totalMarcados = c.totalAprovados + c.totalNaoAprovados;
  
  // Cor por período
  let corJanMai: 'green' | 'yellow' | 'red' = 'green';
  let corJunSet: 'green' | 'yellow' | 'red' = 'green';
  let corDez: 'green' | 'yellow' | 'red' = 'green';
  let corTotal: 'green' | 'yellow' | 'red' = 'green';
  
  // Total < 22
  if (c.totalAprovados === 0 && c.totalNaoAprovados === 0) {
    problemas.push('SEM FÉRIAS MARCADAS — data-limite era 28 de Fevereiro');
    sugestoes.push('Marcar urgentemente os 22 dias: distribuir ≥5 dias em Jan-Mai, ≤10 dias em Jun-Set, restantes em Out-Nov');
    corTotal = 'red';
  } else if (c.totalAprovados < 22) {
    const faltam = 22 - c.totalAprovados;
    problemas.push(`Apenas ${c.totalAprovados} dias aprovados de 22 — subsídio de férias em risco`);
    if (c.totalNaoAprovados > 0) {
      sugestoes.push(`Aprovar os ${c.totalNaoAprovados} dias pendentes para completar os 22 dias`);
    } else {
      sugestoes.push(`Marcar mais ${faltam} dias. Sugestão: distribuir pelos períodos com menos dias`);
    }
    corTotal = c.totalAprovados >= 15 ? 'yellow' : 'red';
  }
  
  // Jan-Mai < 5
  if (janMai < 5 && c.totalAprovados > 0) {
    const faltam = 5 - janMai;
    problemas.push(`Jan-Mai: apenas ${janMai} dias (mínimo obrigatório: 5)`);
    sugestoes.push(`Mover ${faltam} dia(s) de outro período para Jan-Mai`);
    corJanMai = janMai >= 3 ? 'yellow' : 'red';
  } else if (janMai < 5 && c.totalAprovados === 0) {
    corJanMai = 'red';
  }
  
  // Jun-Set > 10
  if (junSet > 10) {
    const excesso = junSet - 10;
    problemas.push(`Jun-Set: ${junSet} dias (máximo permitido: 10) — EXCESSO DE ${excesso} DIAS`);
    sugestoes.push(`Mover ${excesso} dia(s) de Jun-Set para Jan-Mai ou Out-Nov`);
    corJunSet = junSet <= 12 ? 'yellow' : 'red';
  }
  
  // Dez > 3 (mínimo possível)
  if (dez > 3) {
    problemas.push(`Dezembro: ${dez} dias (regra: mínimo possível, ideal ≤3)`);
    sugestoes.push(`Mover ${dez - 3} dia(s) de Dezembro para Jan-Mai ou Out-Nov`);
    corDez = dez <= 5 ? 'yellow' : 'red';
  }
  
  // Distribuição muito desigual
  const totalAprov = janMai + junSet + outNov + dez;
  if (totalAprov >= 22 && outNov === 0 && janMai >= 5 && junSet <= 10) {
    problemas.push('Out-Nov: 0 dias — distribuição pouco homogénea');
    sugestoes.push('Considerar mover alguns dias para Out-Nov para melhor distribuição');
  }
  
  // Status geral
  let statusGeral: 'green' | 'yellow' | 'red' = 'green';
  if (problemas.length === 0) {
    statusGeral = 'green';
  } else if (problemas.some(p => p.includes('SEM FÉRIAS') || p.includes('EXCESSO') || p.includes('subsídio'))) {
    statusGeral = 'red';
  } else {
    statusGeral = 'yellow';
  }
  
  return {
    nome: c.nome,
    totalAprovados: c.totalAprovados,
    totalNaoAprovados: c.totalNaoAprovados,
    totalMarcados: totalMarcados,
    janMai, junSet, outNov, dez,
    problemas,
    sugestoes,
    corJanMai, corJunSet, corDez, corTotal,
    statusGeral,
  };
}

function detetarSobreposicoes(colaboradores: ColabFerias[]): SobreposicaoDia[] {
  const diasPorData: Record<string, string[]> = {};
  
  colaboradores.forEach(c => {
    Object.entries(c.dias).forEach(([key, status]) => {
      if (status !== 'approved') return;
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
  const conformes = analiseColaboradores.filter(a => a.statusGeral === 'green').length;
  const comAvisos = analiseColaboradores.filter(a => a.statusGeral === 'yellow').length;
  const criticos = analiseColaboradores.filter(a => a.statusGeral === 'red').length;
  const totalDiasAprovados = analiseColaboradores.reduce((s, a) => s + a.totalAprovados, 0);
  const mediaAprovados = colabsLoja.length > 0 ? Math.round(totalDiasAprovados / colabsLoja.length * 10) / 10 : 0;
  const semFeriasMarcadas = analiseColaboradores.filter(a => a.totalAprovados === 0 && a.totalNaoAprovados === 0).length;
  const subsidioEmRisco = analiseColaboradores.filter(a => a.totalAprovados < 22 && a.totalAprovados > 0).length;
  
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
      totalDiasAprovados,
      mediaAprovados,
      semFeriasMarcadas,
      subsidioEmRisco,
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
  texto += `Conformes: ${analises.filter(a => a.statusGeral === 'green').length}\n`;
  texto += `Com avisos: ${analises.filter(a => a.statusGeral === 'yellow').length}\n`;
  texto += `Críticos: ${analises.filter(a => a.statusGeral === 'red').length}\n\n`;
  
  texto += `=== ANÁLISE POR COLABORADOR ===\n`;
  analises.forEach(a => {
    texto += `\n--- ${a.nome} ---\n`;
    texto += `Dias aprovados: ${a.totalAprovados} | Não aprovados: ${a.totalNaoAprovados}\n`;
    texto += `Jan-Mai: ${a.janMai} | Jun-Set: ${a.junSet} | Out-Nov: ${a.outNov} | Dez: ${a.dez}\n`;
    if (a.problemas.length > 0) {
      texto += `PROBLEMAS:\n`;
      a.problemas.forEach(p => { texto += `  ⚠ ${p}\n`; });
    }
    if (a.sugestoes.length > 0) {
      texto += `SUGESTÕES INICIAIS:\n`;
      a.sugestoes.forEach(s => { texto += `  → ${s}\n`; });
    }
    if (a.problemas.length === 0) {
      texto += `✅ Conforme com o regulamento\n`;
    }
  });
  
  if (sobreposicoes.length > 0) {
    texto += `\n=== SOBREPOSIÇÕES (${sobreposicoes.length} dias) ===\n`;
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
  const systemPrompt = `És um especialista em Recursos Humanos da ExpressGlass. Estás a analisar o mapa de férias da loja ${loja} para o ano ${ano}.

${REGRAS_FERIAS}

INSTRUÇÕES:
Gera um relatório conciso e PRÁTICO em Markdown com sugestões CONCRETAS de redistribuição de dias de férias para cada colaborador que tem problemas. O relatório deve ser focado em AÇÕES específicas.

Estrutura obrigatória:

## 📋 Resumo da Loja
Breve estado geral (1-2 frases).

## 🔄 Plano de Redistribuição
Para CADA colaborador com problemas, indica:
- O que está mal (números concretos)
- Exactamente quantos dias mover e de/para que período
- Exemplo: "Mover 3 dias de Jun-Set para Jan-Mai (ficaria com 5 em Jan-Mai e 7 em Jun-Set)"

## ⚠️ Sobreposições a Resolver
Se houver dias com mais de 1 colaborador de férias, indica quais e sugere qual deve mover.

## 💰 Impacto no Subsídio
Colaboradores em risco de perder o subsídio de férias.

## ✅ Próximos Passos
Lista priorizada de 3-5 ações imediatas.

REGRAS:
- Sê muito específico e prático
- Usa números concretos (ex: "mover 2 dias de Agosto para Março")
- Linguagem profissional em português europeu
- Não inventes dados
- Foca-te apenas nos colaboradores com problemas
- Não faças referências a gestores ou à sua responsabilidade, foca na loja`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analisa os seguintes dados e gera o plano de redistribuição:\n\n${dados}` }
    ]
  });

  const resposta = response.choices[0].message.content;
  return typeof resposta === 'string' ? resposta : 'Erro ao gerar recomendações.';
}
