import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Ver todos os temas
const [temas] = await connection.execute('SELECT * FROM temas_ocorrencias');
console.log('=== TEMAS DE OCORRÊNCIAS ===');
console.log(JSON.stringify(temas, null, 2));

// Contar total de ocorrências
const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM ocorrencias_estruturais');
console.log('\n=== TOTAL OCORRÊNCIAS ===');
console.log('Total:', countResult[0].total);

// Contar por tema
const [porTema] = await connection.execute(`
  SELECT t.id, t.nome, COUNT(o.id) as count 
  FROM temas_ocorrencias t 
  LEFT JOIN ocorrencias_estruturais o ON t.id = o.temaId 
  GROUP BY t.id, t.nome
`);
console.log('\n=== OCORRÊNCIAS POR TEMA ===');
console.log(JSON.stringify(porTema, null, 2));

// Ver algumas ocorrências
const [ocorrencias] = await connection.execute('SELECT id, temaId, descricao FROM ocorrencias_estruturais LIMIT 5');
console.log('\n=== PRIMEIRAS 5 OCORRÊNCIAS ===');
for (const o of ocorrencias) {
  console.log(`ID: ${o.id}, TemaId: ${o.temaId}, Descricao: ${o.descricao?.substring(0, 80)}...`);
}

await connection.end();
