import { describe, it, expect } from "vitest";
import { sendEmail } from "./emailService";

describe("Email SMTP - Gmail", () => {
  it("deve enviar email de teste com sucesso", async () => {
    // Verificar se as credenciais SMTP estão configuradas
    const smtpEmail = process.env.SMTP_EMAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;

    expect(smtpEmail).toBeDefined();
    expect(smtpPassword).toBeDefined();
    expect(smtpEmail).toBe("egpowering@gmail.com");

    // Enviar email de teste para o próprio remetente
    const enviado = await sendEmail({
      to: smtpEmail!, // Enviar para si próprio como teste
      subject: "Teste de Configuração SMTP - PoweringEG Platform",
      html: `
        <h2>Teste de Email</h2>
        <p>Este é um email de teste para validar a configuração SMTP do Gmail.</p>
        <p>Se recebeu este email, a configuração está correta!</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-PT')}</p>
      `,
    });

    expect(enviado).toBe(true);
  }, 30000); // timeout de 30 segundos para envio de email
});
