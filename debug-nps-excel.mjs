import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const fileBuffer = readFileSync('/home/ubuntu/upload/NPS2026.xlsx');
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

console.log('=== Sheet Names ===');
console.log(workbook.SheetNames);

// Procurar folha "Por Loja"
const porLojaSheet = workbook.SheetNames.find(name => 
  name.trim().toLowerCase() === 'por loja'
);

console.log('\n=== Folha encontrada ===', porLojaSheet);

if (porLojaSheet) {
  const worksheet = workbook.Sheets[porLojaSheet];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('\n=== Primeiras 20 linhas (coluna B / índice 1) ===');
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i];
    const colB = row ? row[1] : undefined;
    const colBStr = String(colB || '').trim();
    const colBLower = colBStr.toLowerCase();
    const isLoja = colBLower === 'loja';
    console.log(`Linha ${i} (Excel ${i+1}): colB=[${colB}] type=${typeof colB} str="${colBStr}" lower="${colBLower}" isLoja=${isLoja}`);
    
    // Mostrar também os char codes para detectar caracteres invisíveis
    if (colBStr.length > 0 && colBStr.length < 20) {
      const charCodes = [...colBStr].map(c => c.charCodeAt(0));
      console.log(`  charCodes: [${charCodes.join(', ')}]`);
    }
  }
  
  console.log('\n=== Linha 12 completa (índice 11) ===');
  if (data[11]) {
    data[11].forEach((cell, idx) => {
      if (cell !== undefined && cell !== null && cell !== '') {
        console.log(`  Col ${idx}: "${cell}" (type: ${typeof cell})`);
      }
    });
  }
  
  console.log('\n=== Linha 13 (primeira linha de dados, índice 12) ===');
  if (data[12]) {
    data[12].forEach((cell, idx) => {
      if (cell !== undefined && cell !== null && cell !== '') {
        console.log(`  Col ${idx}: "${cell}" (type: ${typeof cell})`);
      }
    });
  }
} else {
  console.log('Folha "Por Loja" NÃO encontrada!');
  console.log('Nomes disponíveis:');
  workbook.SheetNames.forEach(name => {
    const charCodes = [...name].map(c => c.charCodeAt(0));
    console.log(`  "${name}" charCodes: [${charCodes.join(', ')}]`);
  });
}
