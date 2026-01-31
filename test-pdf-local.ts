import { gerarPDFAnaliseFichas } from './server/pdfAnaliseFichas';
import * as fs from 'fs';

async function test() {
  try {
    console.log('Iniciando teste...');
    const pdf = await gerarPDFAnaliseFichas({
      nomeLoja: 'Teste',
      numeroLoja: 1,
      totalFichas: 10,
      fichasAbertas5Dias: 2,
      fichasAposAgendamento: 1,
      fichasStatusAlerta: 0,
      fichasSemNotas: 3,
      fichasNotasAntigas: 1,
      fichasDevolverVidro: 0,
      fichasSemEmailCliente: 2,
      resumo: 'Teste resumo',
      conteudoRelatorio: '<h3>FS SEM NOTAS</h3><p>Teste</p>'
    }, new Date());
    console.log('PDF gerado com sucesso, tamanho:', pdf.length);
    
    // Salvar para verificar
    fs.writeFileSync('/tmp/test-output.pdf', Buffer.from(pdf, 'base64'));
    console.log('PDF salvo em /tmp/test-output.pdf');
  } catch (err) {
    console.error('Erro:', err);
  }
}

test();
