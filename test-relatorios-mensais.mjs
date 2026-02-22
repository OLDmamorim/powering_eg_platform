#!/usr/bin/env node
/**
 * Script de teste para envio manual de relatórios mensais
 * Executa as funções directamente sem passar pelo tRPC
 */

console.log('='.repeat(80));
console.log('TESTE DE ENVIO DE RELATÓRIOS MENSAIS');
console.log('='.repeat(80));
console.log('');

// Teste 1: Relatórios Volante
console.log('📊 TESTE 1: Envio de Relatórios Mensais Volante');
console.log('-'.repeat(80));
try {
  const { enviarRelatoriosMensaisVolante } = await import('./server/relatorioMensalVolante.js');
  const resultadoVolante = await enviarRelatoriosMensaisVolante();
  console.log('✅ Resultado Volante:', JSON.stringify(resultadoVolante, null, 2));
} catch (error) {
  console.error('❌ Erro no teste Volante:', error.message);
  console.error('Stack:', error.stack);
}

console.log('');
console.log('='.repeat(80));
console.log('');

// Teste 2: Relatórios Recalibra
console.log('📊 TESTE 2: Envio de Relatórios Mensais Recalibra');
console.log('-'.repeat(80));
try {
  const { enviarRelatoriosMensaisRecalibra } = await import('./server/relatorioMensalRecalibra.js');
  const resultadoRecalibra = await enviarRelatoriosMensaisRecalibra();
  console.log('✅ Resultado Recalibra:', JSON.stringify(resultadoRecalibra, null, 2));
} catch (error) {
  console.error('❌ Erro no teste Recalibra:', error.message);
  console.error('Stack:', error.stack);
}

console.log('');
console.log('='.repeat(80));
console.log('FIM DOS TESTES');
console.log('='.repeat(80));

process.exit(0);
