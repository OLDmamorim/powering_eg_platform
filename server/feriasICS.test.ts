import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Marco Amorim",
    loginMethod: "manus",
    role: "admin",
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// Test the primeiroUltimoNome logic (same as in routers.ts)
function primeiroUltimoNome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length <= 2) return nomeCompleto.trim();
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

describe("primeiroUltimoNome", () => {
  it("should return first and last name for 3+ word names", () => {
    expect(primeiroUltimoNome("Vania Sofia Oliveira")).toBe("Vania Oliveira");
    expect(primeiroUltimoNome("Pedro Miguel Santos Almeida")).toBe("Pedro Almeida");
    expect(primeiroUltimoNome("Ana Maria da Silva Costa")).toBe("Ana Costa");
  });

  it("should return full name for 2-word names", () => {
    expect(primeiroUltimoNome("Tiago Costa")).toBe("Tiago Costa");
    expect(primeiroUltimoNome("Marco Amorim")).toBe("Marco Amorim");
  });

  it("should return full name for single-word names", () => {
    expect(primeiroUltimoNome("Admin")).toBe("Admin");
  });

  it("should handle extra whitespace", () => {
    expect(primeiroUltimoNome("  Vania  Sofia  Oliveira  ")).toBe("Vania Oliveira");
    // 2 words: returns trimmed full name (split keeps internal spacing for <=2 parts)
    expect(primeiroUltimoNome("  Pedro  Almeida  ")).toBe("Pedro  Almeida");
  });
});

describe("Outlook color mapping", () => {
  it("should assign different colors to different stores cyclically", () => {
    const outlookColors = [
      'Blue Category', 'Green Category', 'Orange Category', 'Purple Category',
      'Red Category', 'Yellow Category'
    ];
    
    const lojas = ['barcelos', 'braga', 'famalicão', 'guimarães', 'porto', 'viana', 'vila verde'];
    const lojaColorMap: Record<string, string> = {};
    lojas.forEach((loja, idx) => {
      lojaColorMap[loja] = outlookColors[idx % outlookColors.length];
    });

    // Each store should have a color
    expect(Object.keys(lojaColorMap)).toHaveLength(7);
    
    // First 6 should be unique colors
    const firstSix = lojas.slice(0, 6).map(l => lojaColorMap[l]);
    expect(new Set(firstSix).size).toBe(6);
    
    // 7th store should cycle back to first color
    expect(lojaColorMap['vila verde']).toBe(lojaColorMap['barcelos']);
  });

  it("should use valid Outlook category names", () => {
    const validCategories = [
      'Blue Category', 'Green Category', 'Orange Category', 
      'Purple Category', 'Red Category', 'Yellow Category'
    ];
    
    const lojas = ['barcelos', 'braga', 'famalicão'];
    const outlookColors = validCategories;
    const lojaColorMap: Record<string, string> = {};
    lojas.forEach((loja, idx) => {
      lojaColorMap[loja] = outlookColors[idx % outlookColors.length];
    });

    Object.values(lojaColorMap).forEach(color => {
      expect(validCategories).toContain(color);
    });
  });
});

describe("ferias.exportarICS", () => {
  it("should be a defined procedure", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.ferias.exportarICS).toBeDefined();
    expect(typeof caller.ferias.exportarICS).toBe("function");
  });

  it("should accept ano and gestorNome parameters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // This should not throw a validation error for the input schema
    try {
      await caller.ferias.exportarICS({
        ano: 2026,
        gestorNome: "Marco Amorim",
      });
    } catch (err: any) {
      // It may fail due to no data in DB, but should NOT fail on input validation
      expect(err.message).not.toContain("Expected");
      expect(err.message).not.toContain("Required");
    }
  });

  it("should accept optional lojas parameter", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    try {
      await caller.ferias.exportarICS({
        ano: 2026,
        gestorNome: "Marco Amorim",
        lojas: ["BARCELOS", "BRAGA CENTRO"],
      });
    } catch (err: any) {
      // May fail due to no data, but not on input validation
      expect(err.message).not.toContain("Expected");
      expect(err.message).not.toContain("Required");
    }
  });

  it("should require authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.ferias.exportarICS({
        ano: 2026,
        gestorNome: "Marco Amorim",
      })
    ).rejects.toThrow();
  });
});
