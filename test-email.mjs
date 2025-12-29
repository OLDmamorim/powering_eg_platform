import nodemailer from 'nodemailer';

async function main() {
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;
  
  console.log('SMTP Email:', smtpEmail);
  console.log('SMTP Password:', smtpPassword ? 'DEFINIDO (' + smtpPassword.length + ' chars)' : 'NAO DEFINIDO');
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });
    
    console.log('Verificando conexão SMTP...');
    await transporter.verify();
    console.log('Conexão SMTP OK!');
    
    console.log('Enviando email de teste...');
    const info = await transporter.sendMail({
      from: `"PoweringEG Test" <${smtpEmail}>`,
      to: smtpEmail,
      subject: 'Teste de Email - ' + new Date().toISOString(),
      html: '<h1>Teste</h1><p>Este é um email de teste.</p>',
    });
    
    console.log('Email enviado com sucesso!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('ERRO:', error.message);
    console.error('Código:', error.code);
    console.error('Detalhes:', error);
  }
}

main();
