import { enviarRelatoriosMensaisVolante } from './server/relatorioMensalVolante.ts';
import { enviarRelatoriosMensaisRecalibra } from './server/relatorioMensalRecalibra.ts';

console.log('[TESTE MANUAL] Iniciando envio de relatórios mensais...\n');

try {
  console.log('[TESTE MANUAL] Enviando relatórios do Volante...');
  await enviarRelatoriosMensaisVolante();
  console.log('[TESTE MANUAL] ✅ Relatórios do Volante enviados\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('[TESTE MANUAL] Enviando relatórios do Recalibra...');
  await enviarRelatoriosMensaisRecalibra();
  console.log('[TESTE MANUAL] ✅ Relatórios do Recalibra enviados\n');
  
  console.log('[TESTE MANUAL] Todos os relatórios foram enviados com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('[TESTE MANUAL] ❌ Erro ao enviar relatórios:', error);
  process.exit(1);
}
