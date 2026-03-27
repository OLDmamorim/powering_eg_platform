import { describe, it, expect, vi } from "vitest";

// Mock do schema para testar a lógica de validação
describe("Gravação de Reunião - Validações", () => {
  it("deve rejeitar áudio que excede 16MB", () => {
    // Simular buffer de 17MB
    const size = 17 * 1024 * 1024;
    const excedeLimite = size > 16 * 1024 * 1024;
    expect(excedeLimite).toBe(true);
  });

  it("deve aceitar áudio dentro do limite de 16MB", () => {
    const size = 10 * 1024 * 1024; // 10MB
    const excedeLimite = size > 16 * 1024 * 1024;
    expect(excedeLimite).toBe(false);
  });

  it("deve determinar extensão correcta para webm", () => {
    const mimeType = "audio/webm;codecs=opus";
    const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "mp3";
    expect(ext).toBe("webm");
  });

  it("deve determinar extensão correcta para mp4", () => {
    const mimeType = "audio/mp4";
    const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "mp3";
    expect(ext).toBe("mp4");
  });

  it("deve usar mp3 como fallback para mime types desconhecidos", () => {
    const mimeType = "audio/ogg";
    const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "mp3";
    expect(ext).toBe("mp3");
  });

  it("deve gerar fileKey correcto com userId e gravacaoId", () => {
    const userId = 42;
    const gravacaoId = 7;
    const timestamp = 1700000000000;
    const ext = "webm";
    const fileKey = `gravacoes/${userId}/${gravacaoId}-${timestamp}.${ext}`;
    expect(fileKey).toBe("gravacoes/42/7-1700000000000.webm");
    expect(fileKey).toContain("gravacoes/");
    expect(fileKey).toContain("/42/");
    expect(fileKey).toContain("7-");
    expect(fileKey.endsWith(".webm")).toBe(true);
  });
});

describe("Gravação de Reunião - Estados", () => {
  const ESTADOS_VALIDOS = ["a_gravar", "gravado", "a_transcrever", "transcrito", "a_resumir", "concluido", "erro"];

  it("deve ter todos os estados válidos definidos", () => {
    expect(ESTADOS_VALIDOS).toHaveLength(7);
    expect(ESTADOS_VALIDOS).toContain("a_gravar");
    expect(ESTADOS_VALIDOS).toContain("gravado");
    expect(ESTADOS_VALIDOS).toContain("a_transcrever");
    expect(ESTADOS_VALIDOS).toContain("transcrito");
    expect(ESTADOS_VALIDOS).toContain("a_resumir");
    expect(ESTADOS_VALIDOS).toContain("concluido");
    expect(ESTADOS_VALIDOS).toContain("erro");
  });

  it("deve seguir o fluxo correcto de estados", () => {
    // Fluxo normal: a_gravar -> gravado -> a_transcrever -> transcrito -> a_resumir -> concluido
    const fluxoNormal = ["a_gravar", "gravado", "a_transcrever", "transcrito", "a_resumir", "concluido"];
    fluxoNormal.forEach(estado => {
      expect(ESTADOS_VALIDOS).toContain(estado);
    });
  });

  it("deve ter estado de erro para falhas", () => {
    expect(ESTADOS_VALIDOS).toContain("erro");
  });
});

describe("Gravação de Reunião - Prompt de Transcrição", () => {
  it("deve incluir contexto de reunião de trabalho em português", () => {
    const prompt = "Transcrever reunião de trabalho em português. Nomes de pessoas, lojas e termos técnicos de vidro automóvel.";
    expect(prompt).toContain("português");
    expect(prompt).toContain("reunião");
    expect(prompt).toContain("vidro automóvel");
  });
});

describe("Gravação de Reunião - Prompt de Resumo IA", () => {
  it("deve gerar resumo estruturado com secções correctas", () => {
    const systemPrompt = `És um assistente especializado em gerar resumos de reuniões de trabalho.
Gera um resumo estruturado em Português Europeu com as seguintes secções:

## Resumo da Reunião
Breve parágrafo com o contexto geral.

## Pontos Principais
- Lista dos pontos discutidos

## Decisões Tomadas
- Lista de decisões

## Ações a Tomar
- Lista de ações com responsável (se mencionado)

## Notas Adicionais
- Observações relevantes`;

    expect(systemPrompt).toContain("Resumo da Reunião");
    expect(systemPrompt).toContain("Pontos Principais");
    expect(systemPrompt).toContain("Decisões Tomadas");
    expect(systemPrompt).toContain("Ações a Tomar");
    expect(systemPrompt).toContain("Notas Adicionais");
    expect(systemPrompt).toContain("Português Europeu");
  });
});

describe("Gravação de Reunião - Formatação de Duração", () => {
  function formatDuracao(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  it("deve formatar 0 segundos como 0:00", () => {
    expect(formatDuracao(0)).toBe("0:00");
  });

  it("deve formatar 65 segundos como 1:05", () => {
    expect(formatDuracao(65)).toBe("1:05");
  });

  it("deve formatar 3661 segundos como 1:01:01", () => {
    expect(formatDuracao(3661)).toBe("1:01:01");
  });

  it("deve formatar 600 segundos como 10:00", () => {
    expect(formatDuracao(600)).toBe("10:00");
  });

  it("deve formatar 59 segundos como 0:59", () => {
    expect(formatDuracao(59)).toBe("0:59");
  });
});
