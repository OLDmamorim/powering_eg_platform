import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * Gera um plano de visitas semanal para um gestor
 */
export async function gerarPlanoVisitasSemanal(gestorId: number): Promise<{
  visitasSugeridas: Array<{
    lojaId: number;
    lojaNome: string;
    diaSugerido: string;
    motivo: string;
    prioridade: 'alta' | 'media' | 'baixa';
  }>;
} | null> {
  try {
    const dados = await db.getDadosParaPlanoVisitas(gestorId);
    
    if (dados.lojas.length === 0) {
      return null;
    }
    
    // Preparar dados das lojas para a IA
    const lojasInfo = dados.lojas.map(loja => {
      const ultimaVisita = dados.ultimasVisitas.get(loja.id);
      const diasSemVisita = ultimaVisita 
        ? Math.floor((Date.now() - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      return {
        id: loja.id,
        nome: loja.nome,
        diasSemVisita,
        pendentesAtivos: dados.pendentes.get(loja.id) || 0,
        alertasAtivos: dados.alertas.get(loja.id) || 0,
      };
    });
    
    // Calcular próxima semana
    const hoje = new Date();
    const proximaSegunda = new Date(hoje);
    const diasAteSegunda = (8 - hoje.getDay()) % 7 || 7;
    proximaSegunda.setDate(hoje.getDate() + diasAteSegunda);
    
    const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    
    const prompt = `Cria um plano de visitas para a próxima semana (${proximaSegunda.toLocaleDateString('pt-PT')} a ${new Date(proximaSegunda.getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')}).

LOJAS DO GESTOR:
${JSON.stringify(lojasInfo, null, 2)}

REGRAS:
1. Priorizar lojas com mais dias sem visita (>14 dias = urgente)
2. Priorizar lojas com pendentes ativos
3. Priorizar lojas com alertas ativos
4. Distribuir visitas ao longo da semana (máximo 2-3 por dia)
5. Não é obrigatório visitar todas as lojas
6. Dias disponíveis: Segunda, Terça, Quarta, Quinta, Sexta

Para cada visita sugerida, indica:
- lojaId: ID da loja
- diaSugerido: dia da semana em português
- motivo: razão da visita (ex: "Sem visita há 20 dias", "3 pendentes ativos")
- prioridade: "alta" (urgente), "media" (importante), "baixa" (rotina)

Responde APENAS com JSON válido:
{
  "visitasSugeridas": [
    {
      "lojaId": 1,
      "diaSugerido": "Segunda",
      "motivo": "Sem visita há 15 dias, 2 pendentes ativos",
      "prioridade": "alta"
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "És um gestor de operações que otimiza rotas e prioriza visitas. Respondes sempre em JSON válido em português de Portugal." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "plano_visitas_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              visitasSugeridas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    lojaId: { type: "integer" },
                    diaSugerido: { type: "string" },
                    motivo: { type: "string" },
                    prioridade: { type: "string", enum: ["alta", "media", "baixa"] }
                  },
                  required: ["lojaId", "diaSugerido", "motivo", "prioridade"],
                  additionalProperties: false
                }
              }
            },
            required: ["visitasSugeridas"],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }
    
    const resultado = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    
    // Enriquecer com nomes das lojas
    const visitasEnriquecidas = resultado.visitasSugeridas.map((v: any) => {
      const loja = dados.lojas.find(l => l.id === v.lojaId);
      return {
        ...v,
        lojaNome: loja?.nome || 'Loja Desconhecida'
      };
    });
    
    return { visitasSugeridas: visitasEnriquecidas };
    
  } catch (error) {
    console.error('[PlanoVisitasService] Erro ao gerar plano:', error);
    return null;
  }
}

/**
 * Gera e guarda planos de visitas para todos os gestores
 * Deve ser executado às sextas-feiras
 */
export async function gerarPlanosSemanaisParaTodosGestores(): Promise<number> {
  try {
    const gestores = await db.getAllGestores();
    let planosGerados = 0;
    
    // Calcular datas da próxima semana
    const hoje = new Date();
    const diasAteSegunda = (8 - hoje.getDay()) % 7 || 7;
    const proximaSegunda = new Date(hoje);
    proximaSegunda.setDate(hoje.getDate() + diasAteSegunda);
    proximaSegunda.setHours(0, 0, 0, 0);
    
    const proximoDomingo = new Date(proximaSegunda);
    proximoDomingo.setDate(proximaSegunda.getDate() + 6);
    proximoDomingo.setHours(23, 59, 59, 999);
    
    for (const gestor of gestores) {
      // Verificar se já existe plano para esta semana
      const planoExistente = await db.getPlanoVisitasProximaSemana(gestor.id);
      if (planoExistente) {
        continue; // Já existe plano, não gerar novo
      }
      
      // Gerar plano
      const plano = await gerarPlanoVisitasSemanal(gestor.id);
      
      if (plano && plano.visitasSugeridas.length > 0) {
        await db.criarPlanoVisitas({
          gestorId: gestor.id,
          semanaInicio: proximaSegunda,
          semanaFim: proximoDomingo,
          visitasSugeridas: plano.visitasSugeridas,
        });
        planosGerados++;
        
        // Registar atividade
        await db.registarAtividade({
          gestorId: gestor.id,
          tipo: 'gestor_criado', // Usar tipo existente para plano
          descricao: `Plano de visitas gerado para a semana de ${proximaSegunda.toLocaleDateString('pt-PT')}`,
          metadata: { visitasSugeridas: plano.visitasSugeridas.length },
        });
      }
    }
    
    // Notificar admin
    if (planosGerados > 0) {
      await notifyOwner({
        title: '📅 Planos de Visitas Gerados',
        content: `Foram gerados ${planosGerados} planos de visitas para a próxima semana.`,
      });
    }
    
    return planosGerados;
    
  } catch (error) {
    console.error('[PlanoVisitasService] Erro ao gerar planos semanais:', error);
    return 0;
  }
}

/**
 * Verifica se hoje é sexta-feira e gera planos
 */
export async function verificarEGerarPlanosSexta(): Promise<boolean> {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  
  // 5 = Sexta-feira
  if (diaSemana === 5) {
    const planosGerados = await gerarPlanosSemanaisParaTodosGestores();
    return planosGerados > 0;
  }
  
  return false;
}
