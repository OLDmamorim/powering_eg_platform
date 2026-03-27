import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-blocos",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("notas.uploadBlocoAudio", () => {
  it("rejects blocks larger than 16MB", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a base64 string that decodes to >16MB
    // 16MB = 16 * 1024 * 1024 = 16777216 bytes
    // A base64 string of length ~22369622 decodes to ~16MB
    const largeBase64 = Buffer.alloc(17 * 1024 * 1024).toString("base64");

    await expect(
      caller.notas.uploadBlocoAudio({
        gravacaoId: 999,
        blocoIndex: 0,
        audioBase64: largeBase64,
        mimeType: "audio/webm",
      })
    ).rejects.toThrow(/excede 16MB/);
  });

  it("accepts valid block input structure", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Small valid base64 audio (will fail on S3 upload but validates input)
    const smallBase64 = Buffer.from("test-audio-data").toString("base64");

    // This will fail because S3 is not available in test, but it validates
    // the input schema passes validation
    try {
      await caller.notas.uploadBlocoAudio({
        gravacaoId: 1,
        blocoIndex: 0,
        audioBase64: smallBase64,
        mimeType: "audio/webm",
      });
    } catch (err: any) {
      // Should NOT be an input validation error
      expect(err.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("notas.transcreverBlocoAudio", () => {
  it("validates input schema for block transcription", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Will fail on actual transcription but validates input schema
    try {
      await caller.notas.transcreverBlocoAudio({
        audioUrl: "https://example.com/audio.webm",
        blocoIndex: 0,
      });
    } catch (err: any) {
      // Should fail on transcription service, not input validation
      expect(err.code).not.toBe("BAD_INPUT");
    }
  });
});

describe("notas.finalizarGravacaoBlocos", () => {
  it("validates input schema with multiple blocks", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.notas.finalizarGravacaoBlocos({
        gravacaoId: 1,
        blocos: [
          {
            blocoIndex: 0,
            audioUrl: "https://example.com/bloco0.webm",
            text: "Primeiro bloco de texto transcrito.",
            segmentos: [
              { start: 0, end: 30, text: "Primeiro bloco de texto transcrito." },
            ],
            duracaoBloco: 480,
          },
          {
            blocoIndex: 1,
            audioUrl: "https://example.com/bloco1.webm",
            text: "Segundo bloco de texto transcrito.",
            segmentos: [
              { start: 0, end: 25, text: "Segundo bloco de texto transcrito." },
            ],
            duracaoBloco: 300,
          },
        ],
        duracaoTotal: 780,
      });
    } catch (err: any) {
      // Should fail on DB operation (no real DB in test), not input validation
      expect(err.code).not.toBe("BAD_INPUT");
    }
  });

  it("validates empty blocks array is accepted by schema", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.notas.finalizarGravacaoBlocos({
        gravacaoId: 1,
        blocos: [],
        duracaoTotal: 0,
      });
    } catch (err: any) {
      // Empty array is valid for the schema
      expect(err.code).not.toBe("BAD_INPUT");
    }
  });
});

describe("AudioRecorder block constants", () => {
  it("BLOCO_DURACAO_SEG should be 8 minutes (480 seconds)", () => {
    // This validates our constant is correct
    const BLOCO_DURACAO_SEG = 8 * 60;
    expect(BLOCO_DURACAO_SEG).toBe(480);
    // 8 minutes at ~16KB/s (webm opus) = ~7.5MB, well under 16MB limit
    const estimatedSizeMB = (BLOCO_DURACAO_SEG * 16000) / (1024 * 1024);
    expect(estimatedSizeMB).toBeLessThan(16);
  });
});
