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
}

export async function gerarRelatorioIACategorias(userId: number): Promise<{
  relatorio: string;
  dadosGraficos: DadosGraficos;
}> {
  // Obter todos os relatórios agrupados por categoria
  const relatoriosPorCategoria = await db.getRelatoriosPorCategoria();
  const estatisticas = await db.getEstatisticasCategorias();

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

  // Prompt para a IA
  const prompt = `Você é um analista executivo especializado em gestão de redes de lojas. Analise os dados de relatórios organizados por categoria e gere um relatório estruturado para apresentação em reunião de board.

**DADOS:**
${JSON.stringify(dadosParaIA, null, 2)}

**ESTATÍSTICAS GLOBAIS:**
- Total de categorias: ${estatisticas.totalCategorias}
- Total de relatórios: ${estatisticas.totalRelatoriosCategorizados}
- Pendentes a acompanhar: ${estatisticas.porEstado.acompanhar}
- Em tratamento: ${estatisticas.porEstado.emTratamento}
- Tratados: ${estatisticas.porEstado.tratado}

**INSTRUÇÕES:**
Gere um relatório executivo em Markdown com a seguinte estrutura:

# Relatório Executivo por Categorias
*Gerado em: [data atual]*

## 📊 Resumo Executivo
- Visão geral da situação atual
- Principais destaques (3-4 pontos)
- Indicadores-chave

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

## 🎯 Categorias Críticas
Liste as 3-5 categorias que requerem atenção prioritária, justificando:
- Por que é crítica (volume, baixa taxa resolução, recorrência)
- Impacto no negócio
- Urgência

## 📈 Tendências e Padrões
- Problemas recorrentes em múltiplas lojas
- Categorias com melhoria significativa
- Categorias com deterioração
- Padrões geográficos ou por gestor (se identificáveis)

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
- Metas mensuráveis

---

**IMPORTANTE:**
- Use dados reais dos relatórios fornecidos
- Seja específico e quantitativo
- Foque em insights acionáveis
- Linguagem executiva e objetiva
- Destaque padrões e tendências
- Priorize por impacto no negócio`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Você é um analista executivo especializado em gestão de redes de lojas. Gera relatórios estruturados e acionáveis para reuniões de board.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0].message.content;
  const relatorio = typeof content === 'string' ? content : "Erro ao gerar relatório";
  
  // Preparar dados para gráficos
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
  };
  
  // Salvar relatório no histórico
  await db.salvarRelatorioIACategoria({
    conteudo: relatorio,
    geradoPor: userId,
    versao: '5.10',
  });
  
  return { relatorio, dadosGraficos };
}
