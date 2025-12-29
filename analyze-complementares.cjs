const XLSX = require('xlsx');

const workbook = XLSX.readFile('/home/ubuntu/upload/MapaServiçosDiárioseVendasComplementares_Dezembro2025.xlsx');
const sheet = workbook.Sheets['Complementares'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== ANÁLISE DA FOLHA COMPLEMENTARES ===');
console.log('Total de linhas:', data.length);
console.log('');

// Mostrar estrutura dos cabeçalhos
console.log('=== CABEÇALHOS (linhas 5-10) ===');
for (let i = 4; i < 10; i++) {
  console.log('Linha', i + 1, ':', JSON.stringify(data[i]?.slice(0, 25)));
}
console.log('');

// Analisar dados das lojas
console.log('=== DADOS DAS LOJAS ===');
let totalGeral = 0;
let lojasComDados = 0;
let lojasComVendasAltas = [];
let lojasComVendasBaixas = [];

for (let i = 10; i < data.length; i++) {
  const row = data[i];
  if (row && row.length > 3) {
    const loja = row[2];
    const totalVendas = row[3];
    
    // Verificar se é uma linha de loja (não zona, não total)
    if (loja && typeof loja === 'string' && loja.length > 2) {
      const isZona = loja.toUpperCase().includes('ZONA');
      const isTotal = loja.toUpperCase().includes('TOTAL');
      const isPromotores = loja.toUpperCase().includes('PROMOTOR');
      
      if (!isZona && !isTotal && !isPromotores) {
        lojasComDados++;
        const vendas = parseFloat(totalVendas) || 0;
        totalGeral += vendas;
        
        if (vendas > 1000) {
          lojasComVendasAltas.push({ loja, vendas });
        } else if (vendas < 100 && vendas >= 0) {
          lojasComVendasBaixas.push({ loja, vendas });
        }
        
        // Mostrar primeiras 15 lojas
        if (lojasComDados <= 15) {
          console.log(
            loja.padEnd(35), 
            '| Total Vendas €:', 
            (vendas || 0).toFixed(2).padStart(10),
            '| Escovas €:', (row[5] || 0).toString().padStart(8),
            '| Qtd:', (row[6] || 0).toString().padStart(4)
          );
        }
      } else if (isZona) {
        console.log('');
        console.log('--- ' + loja + ' ---');
      }
    }
  }
}

console.log('');
console.log('=== RESUMO ===');
console.log('Total de lojas com dados:', lojasComDados);
console.log('Total geral de vendas complementares: €', totalGeral.toFixed(2));
console.log('Média por loja: €', (totalGeral / lojasComDados).toFixed(2));
console.log('');

console.log('=== TOP 10 LOJAS COM MAIS VENDAS ===');
lojasComVendasAltas.sort((a, b) => b.vendas - a.vendas);
lojasComVendasAltas.slice(0, 10).forEach((l, idx) => {
  console.log((idx + 1) + '.', l.loja.padEnd(35), '€', l.vendas.toFixed(2));
});

console.log('');
console.log('=== LOJAS COM VENDAS BAIXAS (< €100) ===');
lojasComVendasBaixas.forEach(l => {
  console.log('-', l.loja.padEnd(35), '€', l.vendas.toFixed(2));
});

// Analisar colunas específicas
console.log('');
console.log('=== ANÁLISE POR CATEGORIA ===');

let totalEscovas = 0;
let totalPolimento = 0;
let totalTratamento = 0;
let totalLavagens = 0;
let totalPeliculas = 0;

for (let i = 10; i < data.length; i++) {
  const row = data[i];
  if (row && row.length > 20) {
    const loja = row[2];
    if (loja && typeof loja === 'string' && !loja.toUpperCase().includes('ZONA') && !loja.toUpperCase().includes('TOTAL') && !loja.toUpperCase().includes('PROMOTOR')) {
      totalEscovas += parseFloat(row[5]) || 0;
      totalPolimento += parseFloat(row[9]) || 0;
      totalTratamento += parseFloat(row[11]) || 0;
      totalLavagens += parseFloat(row[22]) || 0;
      totalPeliculas += parseFloat(row[14]) || 0;
    }
  }
}

console.log('Escovas: €', totalEscovas.toFixed(2));
console.log('Polimento Faróis: €', totalPolimento.toFixed(2));
console.log('Tratamento Carroçarias: €', totalTratamento.toFixed(2));
console.log('Lavagens: €', totalLavagens.toFixed(2));
console.log('Películas: €', totalPeliculas.toFixed(2));
