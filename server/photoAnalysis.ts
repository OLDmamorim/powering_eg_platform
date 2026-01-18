import { invokeLLM } from "./_core/llm";

export interface PhotoAnalysisResult {
  description: string;
  problemsDetected: string[];
  suggestedPendentes: string[];
  severity: "low" | "medium" | "high";
}

/**
 * Analisa uma foto usando Vision API (GPT-4 Vision) para identificar problemas
 * e gerar pendentes automaticamente
 */
export async function analyzePhoto(imageUrl: string): Promise<PhotoAnalysisResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `És um assistente especializado em análise de inspeções de lojas Express Glass.
Analisa fotos de lojas e identifica problemas relacionados com:
- Vidros rachados ou danificados
- Desorganização do espaço
- Sinalética danificada ou em falta
- Problemas de limpeza
- Equipamentos danificados
- Problemas de segurança (EPIs, extintores, etc.)
- Estado geral das instalações

Sê específico e objetivo nas tuas observações.

IMPORTANTE: Gera NO MÁXIMO 2 pendentes por foto. Prioriza os problemas mais críticos ou urgentes.
Se identificares mais de 2 problemas, agrupa-os ou seleciona apenas os 2 mais importantes.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analisa esta foto de uma loja Express Glass e identifica problemas visíveis. Gera pendentes específicos se necessário."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "photo_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Descrição breve do que está visível na foto (máx 100 caracteres)"
              },
              problemsDetected: {
                type: "array",
                description: "Lista de problemas identificados na foto",
                items: {
                  type: "string"
                }
              },
              suggestedPendentes: {
                type: "array",
                description: "Lista de pendentes sugeridos baseados nos problemas (MÁXIMO 2 pendentes - priorizar os mais críticos)",
                items: {
                  type: "string"
                }
              },
              severity: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Gravidade geral dos problemas: low (cosmético), medium (requer atenção), high (urgente/segurança)"
              }
            },
            required: ["description", "problemsDetected", "suggestedPendentes", "severity"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da API de análise de fotos");
    }

    // Content deve ser string quando usamos response_format
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr) as PhotoAnalysisResult;
    
    // Garantir máximo de 2 pendentes por foto (segurança adicional)
    if (result.suggestedPendentes && result.suggestedPendentes.length > 2) {
      result.suggestedPendentes = result.suggestedPendentes.slice(0, 2);
    }
    
    return result;

  } catch (error) {
    console.error("Erro ao analisar foto:", error);
    throw new Error("Falha na análise da foto. Tente novamente.");
  }
}

/**
 * Analisa múltiplas fotos em paralelo
 */
export async function analyzePhotos(imageUrls: string[]): Promise<PhotoAnalysisResult[]> {
  const analyses = await Promise.all(
    imageUrls.map(url => analyzePhoto(url))
  );
  return analyses;
}
