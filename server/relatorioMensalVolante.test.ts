import { describe, it, expect } from "vitest";
import { enviarRelatoriosMensaisVolante } from "./relatorioMensalVolante";

describe("Relatório Mensal do Volante", () => {
  it("deve executar o envio de relatórios mensais sem erros", async () => {
    // Este teste executa a função real de envio de relatórios
    // Atenção: irá enviar emails reais se houver dados e credenciais SMTP configuradas
    
    console.log("\n=== TESTE MANUAL: Relatório Mensal do Volante ===\n");
    console.log("⚠️  ATENÇÃO: Este teste irá enviar emails reais!");
    console.log("Certifique-se de que:");
    console.log("1. As credenciais SMTP estão configuradas (SMTP_EMAIL e SMTP_PASSWORD)");
    console.log("2. Existem serviços de volante registados no mês anterior");
    console.log("3. As lojas têm emails configurados");
    console.log("4. Os gestores têm emails configurados\n");
    
    // Executar a função
    await enviarRelatoriosMensaisVolante();
    
    console.log("\n=== Teste concluído ===\n");
    
    // O teste passa se não houver exceções
    expect(true).toBe(true);
  }, 60000); // Timeout de 60 segundos para dar tempo de enviar todos os emails
});
