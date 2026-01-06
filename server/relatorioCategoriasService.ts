import * as db from "./db";
import { invokeLLM } from "./_core/llm";

interface DadosGraficos {
  distribuicaoStatus: Array<{
    categoria: string;
    acompanhar: number;
    emTratamento: number;
    tratado: number;
  }>;
  taxaResolucao: Array<{
    categoria: string;
    taxa: number;
  }>;
  topCategoriasCriticas: Array<{
    categoria: string;
    total: number;
  }>;
  // Novos dados para ocorrências estruturais
  ocorrenciasPorImpacto?: Array<{
    impacto: string;
    count: number;
  }>;
  ocorrenciasPorTema?: Array<{
    tema: string;
    count: number;
  }>;
}

export async function gerarRelatorioIACategorias(userId: number): Promise<{
  relatorio: string;
  dadosGraficos: DadosGraficos;
}> {
  // Obter todos os relatórios agrupados por categoria
  const relatoriosPorCategoria = await db.getRelatoriosPorCategoria();
  const estatisticas = await db.getEstatisticasCategorias();
  
  // Obter ocorrências estruturais para análise
  const { ocorrencias: ocorrenciasEstruturais, estatisticas: estatOcorrencias } = await db.getOcorrenciasParaRelatorioIA();

  // Preparar dados para a IA
  const dadosParaIA = relatoriosPorCategoria.map((cat) => {
    const contadores = {
      total: cat.relatorios.length,
      acompanhar: cat.relatorios.filter((r) => r.estadoAcompanhamento === "acompanhar").length,
      em_tratamento: cat.relatorios.filter((r) => r.estadoAcompanhamento === "em_tratamento").length,
      tratado: cat.relatorios.filter((r) => r.estadoAcompanhamento === "tratado").length,
    };

    return {
      categoria: cat.categoria,
      contadores,
      taxaResolucao: contadores.total > 0 
        ? Math.round((contadores.tratado / contadores.total) * 100) 
        : 0,
      relatorios: cat.relatorios.map((r) => ({
        tipo: r.tipo,
        loja: r.lojaNome,
        gestor: r.gestorNome,
        data: r.dataVisita,
        estado: r.estadoAcompanhamento,
        descricao: r.descricao,
      })),
    };
  });
  
  // Preparar dados de ocorrências para a IA
  const dadosOcorrencias = ocorrenciasEstruturais.map(oc => ({
    tema: oc.tema,
    descricao: oc.descricao,
    abrangencia: oc.abrangencia,
    zonaAfetada: oc.zonaAfetada,
    impacto: oc.impacto,
    estado: oc.estado,
    reportadoPor: oc.gestorNome,
    data: oc.criadoEm,
    sugestaoAcao: oc.sugestaoAcao
  }));

  // Prompt para a IA (atualizado com ocorrências)
  const prompt = `Você é um analista executivo especializado em gestão de redes de lojas. Analise os dados de relatórios organizados por categoria E as ocorrências estruturais reportadas, gerando um relatório estruturado para apresentação em reunião de board.

**DADOS DE RELATÓRIOS POR CATEGORIA:**
${JSON.stringify(dadosParaIA, null, 2)}

**ESTATÍSTICAS GLOBAIS DE RELATÓRIOS:**
- Total de categorias: ${estatisticas.totalCategorias}
- Total de relatórios: ${estatisticas.totalRelatoriosCategorizados}
- Pendentes a acompanhar: ${estatisticas.porEstado.acompanhar}
- Em tratamento: ${estatisticas.porEstado.emTratamento}
- Tratados: ${estatisticas.porEstado.tratado}

**OCORRÊNCIAS ESTRUTURAIS (últimos 30 dias):**
${JSON.stringify(dadosOcorrencias, null, 2)}

**ESTATÍSTICAS DE OCORRÊNCIAS ESTRUTURAIS:**
- Total de ocorrências: ${estatOcorrencias.total}
- Por Impacto:
  - Crítico: ${estatOcorrencias.porImpacto.critico}
  - Alto: ${estatOcorrencias.porImpacto.alto}
  - Médio: ${estatOcorrencias.porImpacto.medio}
  - Baixo: ${estatOcorrencias.porImpacto.baixo}
- Por Abrangência:
  - Nacional: ${estatOcorrencias.porAbrangencia.nacional}
  - Regional: ${estatOcorrencias.porAbrangencia.regional}
  - Zona: ${estatOcorrencias.porAbrangencia.zona}
- Por Estado:
  - Reportado: ${estatOcorrencias.porEstado.reportado}
  - Em Análise: ${estatOcorrencias.porEstado.emAnalise}
  - Em Resolução: ${estatOcorrencias.porEstado.emResolucao}
  - Resolvido: ${estatOcorrencias.porEstado.resolvido}
- Temas Mais Frequentes: ${estatOcorrencias.temasMaisFrequentes.map(t => `${t.tema} (${t.count})`).join(', ') || 'Nenhum'}

**CATEGORIAS COM STATUS "A ACOMPANHAR" (PRIORITÁRIAS PARA DISCUSSÃO NO BOARD):**
${JSON.stringify(
  dadosParaIA
    .filter(cat => cat.contadores.acompanhar > 0)
    .map(cat => ({
      categoria: cat.categoria,
      totalAAcompanhar: cat.contadores.acompanhar,
      relatoriosAAcompanhar: cat.relatorios
        .filter(r => r.estado === 'acompanhar')
        .map(r => ({
          loja: r.loja,
          gestor: r.gestor,
          data: r.data,
          descricao: r.descricao
        }))
    })),
  null, 2
)}

**INSTRUÇÕES:**
Gere um relatório executivo em Markdown com a seguinte estrutura:

# Relatório Executivo por Categorias e Ocorrências Estruturais
*Gerado em: [data atual]*

## 🚨 ASSUNTOS PRIORITÁRIOS PARA DISCUSSÃO NO BOARD
**IMPORTANTE: Esta secção deve ser a primeira e mais destacada do relatório.**

Liste aqui TODAS as categorias que têm relatórios com status "A Acompanhar" (não resolvidos).
Para cada categoria:
- **Nome da Categoria**
- Número de relatórios a acompanhar
- Lista dos assuntos/problemas específicos que precisam de discussão
- Lojas afetadas
- Recomendação de ação urgente

**NOTA:** Categorias com status "Em Tratamento" ou "Tratado" NÃO devem aparecer nesta secção prioritária.

## 📊 Resumo Executivo
- Visão geral da situação atual (relatórios + ocorrências)
- Principais destaques (3-4 pontos)
- Indicadores-chave
- **Alertas de Ocorrências Críticas** (se houver)

## 🏷️ Análise por Categoria

Para cada categoria, forneça:
### [Nome da Categoria]
- **Total de Relatórios:** X
- **Status:**
  - A Acompanhar: X (X%)
  - Em Tratamento: X (X%)
  - Tratados: X (X%)
- **Taxa de Resolução:** X%
- **Tendência:** [Aumentou/Diminuiu/Estável] vs período anterior (se possível inferir)
- **Principais Problemas Identificados:** (3-5 pontos)
- **Lojas/Zonas Mais Afetadas:** (se houver padrão)

## 🚨 Análise de Ocorrências Estruturais

### Visão Geral
- Total de ocorrências no período
- Distribuição por impacto e abrangência
- Taxa de resolução de ocorrências

### Ocorrências Críticas e de Alto Impacto
Para cada ocorrência crítica/alta:
- **Tema:** [Nome]
- **Abrangência:** [Nacional/Regional/Zona]
- **Descrição resumida**
- **Status atual**
- **Recomendação de ação**

### Padrões Identificados nas Ocorrências
- Temas recorrentes e suas causas prováveis
- Zonas/regiões mais afetadas
- Correlação com problemas identificados nos relatórios de lojas
- Tendências emergentes

### Ações Preventivas Sugeridas
- Medidas para evitar recorrência dos problemas estruturais
- Melhorias de processo recomendadas
- Investimentos necessários

## 🎯 Categorias e Ocorrências Críticas
Liste as 3-5 categorias/temas que requerem atenção prioritária, justificando:
- Por que é crítica (volume, baixa taxa resolução, recorrência)
- Impacto no negócio
- Urgência

## 📈 Tendências e Padrões
- Problemas recorrentes em múltiplas lojas
- Categorias com melhoria significativa
- Categorias com deterioração
- Padrões geográficos ou por gestor (se identificáveis)
- **Correlação entre ocorrências estruturais e problemas nas lojas**

## 💡 Recomendações Prioritárias para Board
Liste 5-7 ações concretas priorizadas por impacto:
1. **[Ação]:** Descrição, justificativa, impacto esperado
2. ...

## 📋 Próximos Passos
- Ações imediatas (próximos 7 dias)
- Ações de curto prazo (próximo mês)
- Investimentos/mudanças estruturais recomendadas

## 📊 KPIs Sugeridos para Acompanhamento
- Indicadores específicos por categoria crítica
- Indicadores para ocorrências estruturais
- Metas mensuráveis

---

**IMPORTANTE:**
- Use dados reais dos relatórios e ocorrências fornecidos
- Seja específico e quantitativo
- Foque em insights acionáveis
- Linguagem executiva e objetiva
- Destaque padrões e tendências
- Priorize por impacto no negócio
- **Identifique correlações entre ocorrências estruturais e problemas nas lojas**
- **Sugira ações preventivas baseadas nos padrões identificados**`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você é um analista executivo especializado em gestão de redes de lojas. Gera relatórios estruturados e acionáveis para reuniões de board, incluindo análise de ocorrências estruturais e padrões preventivos.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0].message.content;
  const relatorio = typeof content === 'string' ? content : "Erro ao gerar relatório";
  
  // Preparar dados para gráficos (incluindo ocorrências)
  const dadosGraficos: DadosGraficos = {
    distribuicaoStatus: dadosParaIA.map(cat => ({
      categoria: cat.categoria,
      acompanhar: cat.contadores.acompanhar,
      emTratamento: cat.contadores.em_tratamento,
      tratado: cat.contadores.tratado,
    })),
    taxaResolucao: dadosParaIA
      .map(cat => ({
        categoria: cat.categoria,
        taxa: cat.taxaResolucao,
      }))
      .sort((a, b) => a.taxa - b.taxa), // Ordenar por taxa crescente
    topCategoriasCriticas: dadosParaIA
      .map(cat => ({
        categoria: cat.categoria,
        total: cat.contadores.total,
      }))
      .sort((a, b) => b.total - a.total) // Ordenar por total decrescente
      .slice(0, 5), // Top 5
    // Dados de ocorrências para gráficos
    ocorrenciasPorImpacto: [
      { impacto: 'Crítico', count: estatOcorrencias.porImpacto.critico },
      { impacto: 'Alto', count: estatOcorrencias.porImpacto.alto },
      { impacto: 'Médio', count: estatOcorrencias.porImpacto.medio },
      { impacto: 'Baixo', count: estatOcorrencias.porImpacto.baixo },
    ].filter(item => item.count > 0),
    ocorrenciasPorTema: estatOcorrencias.temasMaisFrequentes,
  };
  
  // Salvar relatório no histórico
  await db.salvarRelatorioIACategoria({
    conteudo: relatorio,
    geradoPor: userId,
    versao: '6.4',
  });
  
  return { relatorio, dadosGraficos };
}
