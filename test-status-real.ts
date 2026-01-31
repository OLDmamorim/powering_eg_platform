import { getDb } from './server/db';
import { relatoriosAnaliseLoja } from './drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const relatorios = await db.select().from(relatoriosAnaliseLoja).orderBy(desc(relatoriosAnaliseLoja.createdAt)).limit(1);
  
  if (relatorios.length === 0) {
    console.log('Nenhum relatório encontrado');
    return;
  }
  
  const html = relatorios[0].conteudoRelatorio;
  
  // Testar a extração de status
  console.log('=== TESTANDO EXTRAÇÃO DE STATUS ===');
  
  // Padrão: "FS XX // YY-ZZ-AA: STATUS" ou "FS XX // YY-ZZ-AA: STATUS (N dias)"
  const fichaRegex = /FS\s*\d+\s*\/\/\s*[\w-]+:\s*([^(<\n]+)/gi;
  let match;
  const statusCount: Record<string, number> = {};
  let matchCount = 0;
  
  while ((match = fichaRegex.exec(html)) !== null) {
    matchCount++;
    let status = match[1].trim();
    
    // Normalizar
    const statusLower = status.toLowerCase();
    let statusNormalizado = status;
    
    if (statusLower.includes('autorizado')) statusNormalizado = 'AUTORIZADO';
    else if (statusLower.includes('recusado')) statusNormalizado = 'RECUSADO';
    else if (statusLower.includes('anulado')) statusNormalizado = 'ANULADO';
    else if (statusLower.includes('orçamento') || statusLower.includes('orcamento')) statusNormalizado = 'ORÇAMENTO';
    else if (statusLower.includes('consulta')) statusNormalizado = 'Consulta / Orçamento';
    else if (statusLower.includes('pedido') && statusLower.includes('autoriza')) statusNormalizado = 'Pedido Autorização';
    else if (statusLower.includes('devolve')) statusNormalizado = 'Devolve Vidro e Encerra!';
    
    statusCount[statusNormalizado] = (statusCount[statusNormalizado] || 0) + 1;
    
    if (matchCount <= 5) {
      console.log('Match ' + matchCount + ': "' + status + '" -> "' + statusNormalizado + '"');
    }
  }
  
  console.log('Total de matches: ' + matchCount);
  console.log('=== STATUS COUNT ===');
  console.log(statusCount);
  
  // Mostrar uma amostra do HTML para debug
  console.log('=== AMOSTRA DO HTML (primeiros 500 chars) ===');
  console.log(html.substring(0, 500));
  
  process.exit(0);
}

main().catch(console.error);
