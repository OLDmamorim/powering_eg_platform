import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Gera previsões de problemas baseadas em padrões históricos
 */
export async function gerarPrevisoes(): Promise<{
  previsoes: Array<{
    lojaId: number;
    lojaNome: string;
    tipo: 'risco_pendentes' | 'padrao_negativo' | 'sem_visita_prolongada' | 'tendencia_problemas';
    descricao: string;
    probabilidade: number;
    sugestaoAcao: string;
  }>;
}> {
  try {
    const dados = await db.getDadosParaPrevisoes();
    
    if (dados.lojas.length === 0) {
      return { previsoes: [] };
    }
    
    // Preparar resumo dos dados para a IA
    const resumoLojas = dados.lojas.map(loja => {
      const relatoriosLoja = dados.relatoriosRecentes.filter(r => r.lojaId === loja.id);
      const pendentesLoja = dados.pendentesAtivos.filter(p => p.lojaId === loja.id);
      const alertasLoja = dados.alertasAtivos.filter(a => a.lojaId === loja.id);
      
      // Calcular dias desde última visita
      const ultimaVisita = relatoriosLoja.length > 0 
        ? Math.max(...relatoriosLoja.map(r => new Date(r.dataVisita || r.createdAt).getTime()))
        : null;
      const diasSemVisita = ultimaVisita 
        ? Math.floor((Date.now() - ultimaVisita) / (1000 * 60 * 60 * 24))
        : 999;
      
      // Contar pontos negativos recentes
      const pontosNegativos = relatoriosLoja
        .filter(r => r.pontosNegativos)
        .map(r => r.pontosNegativos)
        .join(' ');
      
      return {
        id: loja.id,
        nome: loja.nome,
        totalVisitas90dias: relatoriosLoja.length,
        diasSemVisita,
        pendentesAtivos: pendentesLoja.length,
        alertasAtivos: alertasLoja.length,
        temPontosNegativos: pontosNegativos.length > 0,
      };
    });
    
    const prompt = `Analisa os dados das lojas e identifica potenciais problemas futuros.

DADOS DAS LOJAS (últimos 90 dias):
${JSON.stringify(resumoLojas, null, 2)}

Para cada loja com risco identificado, gera uma previsão com:
- tipo: "risco_pendentes" (acumular pendentes), "padrao_negativo" (tendência negativa), "sem_visita_prolongada" (muito tempo sem visita), "tendencia_problemas" (padrão de problemas)
- descricao: explicação clara do risco em português
- probabilidade: 0-100 (quão provável é o problema)
- sugestaoAcao: ação recomendada em português

Critérios:
- Lojas sem visita há mais de 14 dias: risco alto
- Lojas com 3+ pendentes ativos: risco de acumular mais
- Lojas com alertas ativos: tendência de problemas
- Lojas com poucas visitas nos últimos 90 dias: risco de negligência

Responde APENAS com JSON válido no formato:
{
  "previsoes": [
    {
      "lojaId": 1,
      "tipo": "sem_visita_prolongada",
      "descricao": "Loja sem visita há 20 dias",
      "probabilidade": 85,
      "sugestaoAcao": "Agendar visita urgente"
    }
  ]
}

Se não houver riscos significativos, retorna {"previsoes": []}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "És um analista de operações de retalho especializado em identificar riscos e padrões. Respondes sempre em JSON válido." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "previsoes_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              previsoes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    lojaId: { type: "integer" },
                    tipo: { type: "string", enum: ["risco_pendentes", "padrao_negativo", "sem_visita_prolongada", "tendencia_problemas"] },
                    descricao: { type: "string" },
                    probabilidade: { type: "integer" },
                    sugestaoAcao: { type: "string" }
                  },
                  required: ["lojaId", "tipo", "descricao", "probabilidade", "sugestaoAcao"],
                  additionalProperties: false
                }
              }
            },
            required: ["previsoes"],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { previsoes: [] };
    }
    
    const resultado = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    
    // Enriquecer com nomes das lojas
    const previsoesEnriquecidas = resultado.previsoes.map((p: any) => {
      const loja = dados.lojas.find(l => l.id === p.lojaId);
      return {
        ...p,
        lojaNome: loja?.nome || 'Loja Desconhecida'
      };
    });
    
    return { previsoes: previsoesEnriquecidas };
    
  } catch (error) {
    console.error('[PrevisaoService] Erro ao gerar previsões:', error);
    return { previsoes: [] };
  }
}

/**
 * Gera e guarda previsões na base de dados
 */
export async function gerarEGuardarPrevisoes(): Promise<number> {
  const { previsoes } = await gerarPrevisoes();
  
  let count = 0;
  for (const previsao of previsoes) {
    // Verificar se já existe previsão similar ativa para esta loja
    const existentes = await db.getPrevisoesAtivas();
    const jaExiste = existentes.some(e => 
      e.lojaId === previsao.lojaId && 
      e.tipo === previsao.tipo
    );
    
    if (!jaExiste) {
      // Calcular data de validade (7 dias)
      const validaAte = new Date();
      validaAte.setDate(validaAte.getDate() + 7);
      
      await db.criarPrevisao({
        lojaId: previsao.lojaId,
        tipo: previsao.tipo,
        descricao: previsao.descricao,
        probabilidade: previsao.probabilidade,
        sugestaoAcao: previsao.sugestaoAcao,
        validaAte,
      });
      count++;
    }
  }
  
  return count;
}
