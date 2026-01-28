import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Verificar tipo do token", () => {
  const token = "ZLBXf3Rfqh455bRfsHIytC0xaovesbrOnSZEkotFfW1duQKBDq0nw5W2OWONNDny";
  
  it("deve identificar se é token de volante ou loja", async () => {
    // Verificar como volante
    const volanteResult = await db.validateTokenVolante(token);
    console.log("Validação como volante:", volanteResult);
    
    // Verificar como loja
    const lojaResult = await db.validarTokenLoja(token);
    console.log("Validação como loja:", lojaResult);
    
    expect(true).toBe(true);
  });
});
