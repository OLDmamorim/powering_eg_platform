import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";

export interface TranscriptionResult {
  text: string;
  language: string;
}

export async function transcribeAndProcess(audioUrl: string, language?: string): Promise<TranscriptionResult> {
  console.log('[transcribeAndProcess] Iniciando processamento...');
  console.log('[transcribeAndProcess] audioUrl:', audioUrl);
  console.log('[transcribeAndProcess] language:', language);
  
  // Transcrever áudio
  const transcription = await transcribeAudio({
    audioUrl,
    language: language || 'pt',
    prompt: 'Transcrição de relatório de supervisão de loja'
  });

  // Verificar se é erro
  if ('error' in transcription) {
    console.error('[transcribeAndProcess] Erro na transcrição:', transcription);
    // Incluir detalhes do erro na mensagem
    const errorMessage = transcription.details 
      ? `${transcription.error}: ${transcription.details}`
      : transcription.error;
    throw new Error(errorMessage);
  }
  
  console.log('[transcribeAndProcess] Transcrição bem-sucedida, tamanho do texto:', transcription.text.length);

  return {
    text: transcription.text,
    language: transcription.language
  };
}

export interface ProcessedRelatorioLivre {
  descricao: string;
  categoria: string;
  estadoAcompanhamento: string;
  pendentes: string[];
}

export async function processTranscriptionRelatorioLivre(transcription: string): Promise<ProcessedRelatorioLivre> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `És um assistente que processa transcrições de relatórios de supervisão de lojas.
        
Deves extrair e estruturar a informação da transcrição num formato JSON com:
- descricao: resumo claro e profissional da visita (2-3 frases)
- categoria: uma de ["Supervisão Geral", "Problema Técnico", "Formação", "Auditoria", "Manutenção", "Outro"]
- estadoAcompanhamento: um de ["Em Progresso", "Concluído", "Pendente", "Requer Atenção"]
- pendentes: array de strings com items que precisam ser resolvidos (máx 5)

Se a transcrição não mencionar pendentes, retorna array vazio.
Se não conseguires identificar categoria, usa "Supervisão Geral".
Se não conseguires identificar estado, usa "Em Progresso".`
      },
      {
        role: "user",
        content: `Transcrição do relatório:\n\n${transcription}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "relatorio_livre",
        strict: true,
        schema: {
          type: "object",
          properties: {
            descricao: { type: "string", description: "Resumo profissional da visita" },
            categoria: { 
              type: "string", 
              enum: ["Supervisão Geral", "Problema Técnico", "Formação", "Auditoria", "Manutenção", "Outro"],
              description: "Categoria do relatório"
            },
            estadoAcompanhamento: {
              type: "string",
              enum: ["Em Progresso", "Concluído", "Pendente", "Requer Atenção"],
              description: "Estado atual do acompanhamento"
            },
            pendentes: {
              type: "array",
              items: { type: "string" },
              description: "Lista de items pendentes identificados"
            }
          },
          required: ["descricao", "categoria", "estadoAcompanhamento", "pendentes"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Erro ao processar transcrição");
  }

  return JSON.parse(content);
}

export interface ProcessedRelatorioCompleto {
  resumoSupervisao: string;
  categoria: string;
  estadoAcompanhamento: string;
  pontosPositivos: string[];
  pontosNegativos: string[];
  sugestoesMelhoria: string;
  pendentes: string[];
}

export async function processTranscriptionRelatorioCompleto(transcription: string): Promise<ProcessedRelatorioCompleto> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `És um assistente que processa transcrições de relatórios completos de supervisão de lojas.
        
Deves extrair e estruturar a informação da transcrição num formato JSON com:
- resumoSupervisao: resumo executivo da visita (3-4 frases)
- categoria: uma de ["Supervisão Geral", "Problema Técnico", "Formação", "Auditoria", "Manutenção", "Outro"]
- estadoAcompanhamento: um de ["Em Progresso", "Concluído", "Pendente", "Requer Atenção"]
- pontosPositivos: array de strings com aspectos positivos identificados (máx 5)
- pontosNegativos: array de strings com aspectos negativos identificados (máx 5)
- sugestoesMelhoria: texto com sugestões de melhoria (2-3 frases)
- pendentes: array de strings com items que precisam ser resolvidos (máx 5)

Se alguma informação não for mencionada, usa arrays vazios ou texto genérico apropriado.`
      },
      {
        role: "user",
        content: `Transcrição do relatório:\n\n${transcription}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "relatorio_completo",
        strict: true,
        schema: {
          type: "object",
          properties: {
            resumoSupervisao: { type: "string", description: "Resumo executivo da visita" },
            categoria: { 
              type: "string", 
              enum: ["Supervisão Geral", "Problema Técnico", "Formação", "Auditoria", "Manutenção", "Outro"],
              description: "Categoria do relatório"
            },
            estadoAcompanhamento: {
              type: "string",
              enum: ["Em Progresso", "Concluído", "Pendente", "Requer Atenção"],
              description: "Estado atual do acompanhamento"
            },
            pontosPositivos: {
              type: "array",
              items: { type: "string" },
              description: "Pontos positivos identificados"
            },
            pontosNegativos: {
              type: "array",
              items: { type: "string" },
              description: "Pontos negativos identificados"
            },
            sugestoesMelhoria: { type: "string", description: "Sugestões de melhoria" },
            pendentes: {
              type: "array",
              items: { type: "string" },
              description: "Items pendentes identificados"
            }
          },
          required: ["resumoSupervisao", "categoria", "estadoAcompanhamento", "pontosPositivos", "pontosNegativos", "sugestoesMelhoria", "pendentes"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Erro ao processar transcrição");
  }

  return JSON.parse(content);
}
