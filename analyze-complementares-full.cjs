const XLSX = require('xlsx');

const workbook = XLSX.readFile('/home/ubuntu/upload/MapaServiçosDiárioseVendasComplementares_Dezembro2025.xlsx');
const sheet = workbook.Sheets['Complementares'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Coletar todas as lojas com dados
const lojas = [];

for (let i = 10; i < data.length; i++) {
  const row = data[i];
  if (row && row.length > 20) {
    const loja = row[2];
    if (loja && typeof loja === 'string' && loja.length > 2) {
      const isZona = loja.toUpperCase().indexOf('ZONA') >= 0;
      const isTotal = loja.toUpperCase().indexOf('TOTAL') >= 0;
      const isPromotores = loja.toUpperCase().indexOf('PROMOTOR') >= 0;
      
      if (isZona === false && isTotal === false && isPromotores === false) {
        lojas.push({
          nome: loja,
          totalVendas: parseFloat(row[3]) || 0,
          escovasVendas: parseFloat(row[5]) || 0,
          escovasQtd: parseInt(row[6]) || 0,
          escovasPercent: parseFloat(row[7]) || 0,
          polimentoQtd: parseInt(row[8]) || 0,
          polimentoVendas: parseFloat(row[9]) || 0,
          tratamentoQtd: parseInt(row[10]) || 0,
          tratamentoVendas: parseFloat(row[11]) || 0,
          outrosQtd: parseInt(row[12]) || 0,
          outrosVendas: parseFloat(row[13]) || 0,
          peliculaVendas: parseFloat(row[14]) || 0,
          lavagensTotal: parseInt(row[21]) || 0,
          lavagensVendas: parseFloat(row[22]) || 0,
        });
      }
    }
  }
}

console.log('=== TOP 10 LOJAS - VENDAS COMPLEMENTARES (excl. Películas) ===');
lojas.sort((a, b) => b.totalVendas - a.totalVendas);
lojas.slice(0, 10).forEach((l, idx) => {
  console.log((idx + 1) + '.', l.nome.padEnd(35), '€', l.totalVendas.toFixed(2).padStart(8));
});

console.log('');
console.log('=== TOP 10 LOJAS - VENDAS DE ESCOVAS ===');
lojas.sort((a, b) => b.escovasVendas - a.escovasVendas);
lojas.slice(0, 10).forEach((l, idx) => {
  console.log((idx + 1) + '.', l.nome.padEnd(35), '€', l.escovasVendas.toFixed(2).padStart(8), '| Qtd:', l.escovasQtd);
});

console.log('');
console.log('=== TOP 10 LOJAS - % ESCOVAS (vs Serviços) ===');
lojas.sort((a, b) => b.escovasPercent - a.escovasPercent);
lojas.filter(l => l.escovasPercent > 0).slice(0, 10).forEach((l, idx) => {
  console.log((idx + 1) + '.', l.nome.padEnd(35), (l.escovasPercent * 100).toFixed(1).padStart(6) + '%');
});

console.log('');
console.log('=== TOP 10 LOJAS - PELÍCULAS ===');
lojas.sort((a, b) => b.peliculaVendas - a.peliculaVendas);
lojas.filter(l => l.peliculaVendas > 0).slice(0, 10).forEach((l, idx) => {
  console.log((idx + 1) + '.', l.nome.padEnd(35), '€', l.peliculaVendas.toFixed(2).padStart(10));
});

console.log('');
console.log('=== LOJAS SEM VENDAS COMPLEMENTARES (€0) ===');
const semVendas = lojas.filter(l => l.totalVendas === 0);
console.log('Total:', semVendas.length, 'lojas');
semVendas.forEach(l => console.log('-', l.nome));

console.log('');
console.log('=== ESTATÍSTICAS GERAIS ===');
const totalVendas = lojas.reduce((sum, l) => sum + l.totalVendas, 0);
const totalPeliculas = lojas.reduce((sum, l) => sum + l.peliculaVendas, 0);
const totalEscovas = lojas.reduce((sum, l) => sum + l.escovasVendas, 0);
const totalPolimento = lojas.reduce((sum, l) => sum + l.polimentoVendas, 0);
const totalTratamento = lojas.reduce((sum, l) => sum + l.tratamentoVendas, 0);
const totalLavagens = lojas.reduce((sum, l) => sum + l.lavagensVendas, 0);
const totalOutros = lojas.reduce((sum, l) => sum + l.outrosVendas, 0);

console.log('Total Vendas Complementares (excl. Películas): €', totalVendas.toFixed(2));
console.log('Total Películas: €', totalPeliculas.toFixed(2));
console.log('TOTAL GERAL: €', (totalVendas + totalPeliculas).toFixed(2));
console.log('');
console.log('Breakdown por categoria:');
console.log('  - Escovas: €', totalEscovas.toFixed(2), '(' + ((totalEscovas/totalVendas)*100).toFixed(1) + '%)');
console.log('  - Polimento Faróis: €', totalPolimento.toFixed(2), '(' + ((totalPolimento/totalVendas)*100).toFixed(1) + '%)');
console.log('  - Tratamento Carroçarias: €', totalTratamento.toFixed(2), '(' + ((totalTratamento/totalVendas)*100).toFixed(1) + '%)');
console.log('  - Outros (Lavagens, Elevadores, Colagens): €', totalOutros.toFixed(2), '(' + ((totalOutros/totalVendas)*100).toFixed(1) + '%)');
console.log('  - Lavagens ECO: €', totalLavagens.toFixed(2), '(' + ((totalLavagens/totalVendas)*100).toFixed(1) + '%)');
console.log('');
console.log('Lojas com vendas: ', lojas.filter(l => l.totalVendas > 0).length);
console.log('Lojas sem vendas: ', lojas.filter(l => l.totalVendas === 0).length);
console.log('Média por loja (com vendas): €', (totalVendas / lojas.filter(l => l.totalVendas > 0).length).toFixed(2));

// Análise de oportunidades
console.log('');
console.log('=== ANÁLISE DE OPORTUNIDADES ===');
console.log('');
console.log('Objetivo de Escovas: 30% das lojas / 5% dos serviços móveis');
const lojasComEscovas = lojas.filter(l => l.escovasQtd > 0).length;
const percentLojasComEscovas = (lojasComEscovas / lojas.length) * 100;
console.log('Lojas com vendas de escovas:', lojasComEscovas, '/', lojas.length, '(' + percentLojasComEscovas.toFixed(1) + '%)');

if (percentLojasComEscovas >= 30) {
  console.log('✓ Objetivo de 30% das lojas ATINGIDO');
} else {
  console.log('✗ Objetivo de 30% das lojas NÃO ATINGIDO (faltam', Math.ceil(lojas.length * 0.3) - lojasComEscovas, 'lojas)');
}
