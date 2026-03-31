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
