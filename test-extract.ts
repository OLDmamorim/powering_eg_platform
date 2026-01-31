import * as fs from 'fs';

const html = fs.readFileSync('/tmp/relatorio-html.html', 'utf-8');

// Testar o regex principal
const divRegex = /<div[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi;

let match;
let count = 0;
while ((match = divRegex.exec(html)) !== null) {
  count++;
  console.log(`Match ${count}:`, match[1].substring(0, 50));
}

console.log(`\nTotal de matches: ${count}`);

// Testar se encontra os h3
const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
let h3Match;
let h3Count = 0;
console.log('\n=== H3 encontrados ===');
while ((h3Match = h3Regex.exec(html)) !== null) {
  h3Count++;
  const texto = h3Match[1].replace(/<[^>]+>/g, '').trim();
  console.log(`H3 ${h3Count}: ${texto.substring(0, 60)}`);
}
