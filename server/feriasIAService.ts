import { invokeLLM } from "./_core/llm";

// Procedimento Interno N.º 8 — Férias Ano 2026 (17.12.2025)
const PROCEDIMENTO_FERIAS = `
=== PROCEDIMENTO INTERNO N.º 8 — FÉRIAS ANO 2026 (ExpressGlass) ===

1. ÂMBITO: Orientação sobre direito geral de férias, regras e procedimentos de marcação e aprovação.
Agendamento no Portal do Colaborador – ID, pelo próprio colaborador. Períodos validados apenas quando aprovados pelo Responsável Hierárquico.

2. PRINCÍPIOS GERAIS:
- Direito a férias remuneradas em cada ano civil, vence a 1 de janeiro.
- No ano de admissão, direito vence após 6 meses completos de contrato.
- Direito a férias é irrenunciável.
- Férias podem ser interrompidas por: Doença, Licença Parental, Exigências imperiosas da empresa.

3. DURAÇÃO: 22 dias úteis por ano.
- Ano de admissão: 2 dias úteis por mês completo, até máximo 20 dias.
- Admissão entre dia 01 e dia 15 do mês: +1 dia adicional (máx. 20).

4. ANO GOZO: Gozadas no ano civil em que vencem. Por acordo, até 30 de abril do ano seguinte.

5. REGRAS INTERNAS:

5.1 TODOS OS COLABORADORES:
- Dias de férias de 2025 por gozar: obrigatório agendar e gozar até 30 de abril 2026.
- Não marcação nos prazos: empresa pode marcar.
- DATA-LIMITE PARA MARCAÇÃO: 28 de Fevereiro de 2026.

5.4 LOJAS, SERVIÇOS MÓVEIS, GESTORES DE ZONA (REGRAS CRÍTICAS):
- Responsáveis de lojas NÃO podem tirar férias na última semana do ano.
- Máximo 1 colaborador de férias por loja em cada momento (salvaguardar funcionamento).
- PARÂMETROS DE MARCAÇÃO POR PERÍODO:
  * 1 Jan – 30 Mai: mínimo 5 dias obrigatórios (além dos dias de 2024/2025 por gozar)
  * 1 Jun – 15 Set: MÁXIMO 10 dias úteis por colaborador
  * 16 Set – 30 Nov: agendar períodos pretendidos livremente
  * 1 Dez – 31 Dez: mínimo de dias possível
- BENEFÍCIO: quem NÃO marcar férias de 1 Abr a 30 Set tem prioridade na validação + escolha de 1 dia extra OU voucher ODISSEIAS 100€.

6. REMARCAÇÃO PELA EMPRESA:
- Dias em desacordo nos meses Jun-Set serão remarcados.
- Critérios: 1º) Períodos gozados em anos anteriores; 2º) Antiguidade.

9. SUBSÍDIO DE FÉRIAS:
- IMPORTANTE: Subsídio apenas processado se colaborador agendar os 22 dias de férias úteis.
- Processado no mês anterior ao do maior período de férias agendadas.
`;

interface ColaboradorFerias {
  nome: string;
  loja: string;
  gestor: string;
  dias: Record<string, string>; // "M-D" -> status
  totalAprovados: number;
  totalNaoAprovados: number;
  totalFeriados: number;
  totalFaltas: number;
}

function analisarDadosParaPrompt(colaboradores: ColaboradorFerias[], ano: number): string {
  const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  
  // Estatísticas gerais
  const total = colaboradores.length;
  const semFerias = colaboradores.filter(c => c.totalAprovados === 0 && c.totalNaoAprovados === 0).length;
  const semAprovados = colaboradores.filter(c => c.totalAprovados === 0).length;
  const totalAprovados = colaboradores.reduce((s, c) => s + c.totalAprovados, 0);
  const totalNaoAprovados = colaboradores.reduce((s, c) => s + c.totalNaoAprovados, 0);
  
  // Análise por período regulamentar
  const periodos = {
    janMai: { min: 1, max: 5, label: '1 Jan – 30 Mai', regra: 'mínimo 5 dias' },
    junSet: { min: 6, max: 9, label: '1 Jun – 15 Set', regra: 'máximo 10 dias' },
    setNov: { min: 9, max: 11, label: '16 Set – 30 Nov', regra: 'livre' },
    dez: { min: 12, max: 12, label: '1 Dez – 31 Dez', regra: 'mínimo possível' },
  };
  
  // Contar dias por colaborador por período
  const colabAnalise: string[] = [];
  const violacoes: string[] = [];
  
  // Por loja: contar sobreposições
  const lojaDias: Record<string, Record<string, string[]>> = {}; // loja -> "M-D" -> [nomes]
  
  colaboradores.forEach(c => {
    let diasJanMai = 0, diasJunSet15 = 0, diasDez = 0;
    
    Object.entries(c.dias).forEach(([key, status]) => {
      if (status !== 'approved') return;
      const [mStr, dStr] = key.split('-');
      const m = parseInt(mStr);
      const d = parseInt(dStr);
      
      // Contar por período
      if (m >= 1 && m <= 5) diasJanMai++;
      if ((m >= 6 && m <= 8) || (m === 9 && d <= 15)) diasJunSet15++;
      if (m === 12) diasDez++;
      
      // Sobreposições por loja
      if (!lojaDias[c.loja]) lojaDias[c.loja] = {};
      if (!lojaDias[c.loja][key]) lojaDias[c.loja][key] = [];
      lojaDias[c.loja][key].push(c.nome);
    });
    
    // Verificar violações
    if (diasJanMai < 5 && c.totalAprovados > 0) {
      violacoes.push(`${c.nome} (${c.loja}): apenas ${diasJanMai} dias aprovados Jan-Mai (mínimo 5 obrigatórios)`);
    }
    if (diasJunSet15 > 10) {
      violacoes.push(`${c.nome} (${c.loja}): ${diasJunSet15} dias aprovados Jun-15Set (MÁXIMO 10 permitidos)`);
    }
    if (diasDez > 5) {
      violacoes.push(`${c.nome} (${c.loja}): ${diasDez} dias em Dezembro (regra: mínimo possível)`);
    }
    if (c.totalAprovados < 22 && c.totalAprovados > 0) {
      violacoes.push(`${c.nome} (${c.loja}): apenas ${c.totalAprovados} dias aprovados de 22 (subsídio de férias em risco)`);
    }
    if (c.totalAprovados === 0 && c.totalNaoAprovados === 0) {
      violacoes.push(`${c.nome} (${c.loja}): SEM FÉRIAS MARCADAS (data-limite era 28 de Fevereiro)`);
    }
  });
  
  // Sobreposições por loja (mais de 1 colaborador no mesmo dia)
  const sobreposicoes: string[] = [];
  Object.entries(lojaDias).forEach(([loja, dias]) => {
    Object.entries(dias).forEach(([key, nomes]) => {
      if (nomes.length > 1) {
        const [m, d] = key.split('-');
        sobreposicoes.push(`${loja}: ${nomes.join(' e ')} em ${d}/${m} (regra: máx. 1 colaborador por momento)`);
      }
    });
  });
  
  // Resumo por loja
  const lojaResumo: Record<string, { total: number; aprov: number; sem: number }> = {};
  colaboradores.forEach(c => {
    if (!lojaResumo[c.loja]) lojaResumo[c.loja] = { total: 0, aprov: 0, sem: 0 };
    lojaResumo[c.loja].total++;
    lojaResumo[c.loja].aprov += c.totalAprovados;
    if (c.totalAprovados === 0 && c.totalNaoAprovados === 0) lojaResumo[c.loja].sem++;
  });
  
  // Distribuição mensal
  const mensal: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) mensal[m] = 0;
  colaboradores.forEach(c => {
    Object.entries(c.dias).forEach(([key, status]) => {
      if (status === 'approved') {
        const m = parseInt(key.split('-')[0]);
        mensal[m]++;
      }
    });
  });
  
  let prompt = `=== DADOS DE FÉRIAS ${ano} ===\n`;
  prompt += `Total colaboradores: ${total}\n`;
  prompt += `Sem férias marcadas: ${semFerias}\n`;
  prompt += `Sem dias aprovados: ${semAprovados}\n`;
  prompt += `Total dias aprovados: ${totalAprovados}\n`;
  prompt += `Total dias não aprovados: ${totalNaoAprovados}\n\n`;
  
  prompt += `=== DISTRIBUIÇÃO MENSAL (dias aprovados) ===\n`;
  for (let m = 1; m <= 12; m++) {
    prompt += `${MONTHS_FULL[m-1]}: ${mensal[m]} dias\n`;
  }
  
  prompt += `\n=== VIOLAÇÕES DETETADAS (${violacoes.length}) ===\n`;
  violacoes.slice(0, 50).forEach(v => { prompt += `- ${v}\n`; });
  if (violacoes.length > 50) prompt += `... e mais ${violacoes.length - 50} violações\n`;
  
  prompt += `\n=== SOBREPOSIÇÕES POR LOJA (${sobreposicoes.length} dias com >1 colaborador) ===\n`;
  // Agrupar sobreposições por loja
  const sobrePorLoja: Record<string, number> = {};
  sobreposicoes.forEach(s => {
    const loja = s.split(':')[0];
    sobrePorLoja[loja] = (sobrePorLoja[loja] || 0) + 1;
  });
  Object.entries(sobrePorLoja).sort((a,b) => b[1] - a[1]).slice(0, 20).forEach(([loja, count]) => {
    prompt += `- ${loja}: ${count} dias com sobreposição\n`;
  });
  
  prompt += `\n=== RESUMO POR LOJA ===\n`;
  Object.entries(lojaResumo).sort(([a],[b]) => a.localeCompare(b)).forEach(([loja, r]) => {
    prompt += `${loja}: ${r.total} colab, ${r.aprov} dias aprov${r.sem > 0 ? `, ${r.sem} sem férias` : ''}\n`;
  });
  
  return prompt;
}

export async function gerarRecomendacoesFerias(
  colaboradores: ColaboradorFerias[],
  ano: number,
  gestorNome?: string
): Promise<string> {
  const dadosAnalise = analisarDadosParaPrompt(colaboradores, ano);
  
  const contextoGestor = gestorNome 
    ? `Este relatório é para o gestor de zona **${gestorNome}** e abrange apenas os colaboradores e lojas da sua zona.`
    : 'Este relatório abrange todos os colaboradores a nível nacional.';

  const systemPrompt = `És um especialista em Recursos Humanos da ExpressGlass, responsável por analisar o mapa de férias e gerar recomendações com base no Procedimento Interno N.º 8.

${contextoGestor}

${PROCEDIMENTO_FERIAS}

INSTRUÇÕES PARA O RELATÓRIO:
1. Analisa os dados de férias fornecidos e cruza com as regras do procedimento.
2. Gera um relatório estruturado em Markdown com as seguintes secções:

## 📋 Resumo Executivo
Breve resumo do estado geral das férias.

## 🚨 Violações Críticas
Lista de situações que violam diretamente o regulamento (com nome do colaborador e loja).

## ⚠️ Alertas e Avisos
Situações que requerem atenção mas não são violações diretas.

## 📊 Análise por Período
Verificação do cumprimento dos parâmetros por período (Jan-Mai, Jun-Set, Set-Nov, Dez).

## 🏪 Análise por Loja
Lojas com situações problemáticas (sobreposições, colaboradores sem férias, etc.).

## 💰 Impacto no Subsídio de Férias
Colaboradores que podem perder o subsídio por não terem 22 dias agendados.

## ✅ Recomendações de Ação
Lista priorizada de ações a tomar, com responsável sugerido.

REGRAS:
- Sê específico: menciona nomes, lojas e números concretos.
- Prioriza as violações mais graves primeiro.
- Usa linguagem profissional em português europeu.
- Não inventes dados — usa apenas o que é fornecido.
- Quando há sobreposições (>1 colaborador de férias na mesma loja no mesmo dia), destaca como violação.
- Verifica se todos os colaboradores têm pelo menos 22 dias agendados (para subsídio).
- Verifica se o período Jun-15Set não excede 10 dias por colaborador.
- Verifica se Jan-Mai tem pelo menos 5 dias por colaborador.`;

  const tituloRelatorio = gestorNome 
    ? `Analisa os seguintes dados de férias do ano ${ano} para a zona do gestor ${gestorNome}. Foca-te apenas nas lojas e colaboradores desta zona.`
    : `Analisa os seguintes dados de férias do ano ${ano} e gera o relatório de recomendações.`;
  const userPrompt = `${tituloRelatorio}\n\n${dadosAnalise}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const resposta = response.choices[0].message.content;
  return typeof resposta === 'string' ? resposta : 'Erro ao gerar recomendações.';
}

// Exportar o procedimento para uso no chatbot
export const PROCEDIMENTO_FERIAS_TEXTO = PROCEDIMENTO_FERIAS;
