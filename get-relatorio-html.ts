import * as db from './server/db';

async function main() {
  try {
    // Buscar relatório de Barcelos mais recente
    const result = await db.getRelatorioAnaliseById(57);
    
    if (result) {
      console.log('=== CONTEUDO HTML ===');
      console.log(result.conteudoRelatorio?.substring(0, 8000));
    } else {
      console.log('Nenhum relatório encontrado com ID 57');
      
      // Tentar buscar qualquer relatório
      const all = await db.getRelatoriosAnaliseByAnalise(57);
      if (all && all.length > 0) {
        const barcelos = all.find(r => r.nomeLoja === 'Barcelos');
        if (barcelos) {
          console.log('=== CONTEUDO HTML (Barcelos) ===');
          console.log(barcelos.conteudoRelatorio?.substring(0, 8000));
        }
      }
    }
  } catch (err) {
    console.error('Erro:', err);
  }
  process.exit(0);
}

main();
