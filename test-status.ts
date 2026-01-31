// Testar a extração de status
const html = `
<td>FS 201 // 24-GP-49: ORÇAMENTO (178 dias aberto)</td>
<td>FS 275 // 29-MS-81: AUTORIZADO (91 dias aberto)</td>
<td>FS 277 // BQ-86-ED: AUTORIZADO (87 dias aberto)</td>
<td>FS 278 // BQ-86-ED: Consulta / Orçamento (87 dias aberto)</td>
<td>FS 34 // BH-93-QO: RECUSADO (13 dias aberto)</td>
<td>FS 45 // 40-25-NE: Devolve Vidro e Encerra! (6 dias aberto)</td>
`;

// Padrão: "FS XX // YY-ZZ-AA: STATUS" ou "FS XX // YY-ZZ-AA: STATUS (N dias)"
const fichaRegex = /FS\s*\d+\s*\/\/\s*[\w-]+:\s*([^(<\n]+)/gi;
let match;
const statusCount: Record<string, number> = {};

while ((match = fichaRegex.exec(html)) !== null) {
  let status = match[1].trim();
  console.log('Match encontrado:', status);
  
  // Normalizar
  const statusLower = status.toLowerCase();
  let statusNormalizado = status;
  
  if (statusLower.includes('autorizado')) statusNormalizado = 'AUTORIZADO';
  else if (statusLower.includes('recusado')) statusNormalizado = 'RECUSADO';
  else if (statusLower.includes('orçamento') || statusLower.includes('orcamento')) statusNormalizado = 'ORÇAMENTO';
  else if (statusLower.includes('consulta')) statusNormalizado = 'Consulta / Orçamento';
  else if (statusLower.includes('devolve')) statusNormalizado = 'Devolve Vidro e Encerra!';
  
  statusCount[statusNormalizado] = (statusCount[statusNormalizado] || 0) + 1;
}

console.log('\n=== STATUS COUNT ===');
console.log(statusCount);
