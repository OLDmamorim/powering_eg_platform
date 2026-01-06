import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Ver todos os temas
const temas = await db.select().from(schema.temasOcorrencias);
console.log('=== TEMAS DE OCORRÊNCIAS ===');
console.log(JSON.stringify(temas, null, 2));

// Contar ocorrências por tema
const ocorrencias = await db.select().from(schema.ocorrenciasEstruturais);
console.log('\n=== TOTAL OCORRÊNCIAS ===');
console.log('Total:', ocorrencias.length);

// Agrupar por temaId
const porTema = {};
for (const o of ocorrencias) {
  porTema[o.temaId] = (porTema[o.temaId] || 0) + 1;
}
console.log('\n=== OCORRÊNCIAS POR TEMA ===');
console.log(JSON.stringify(porTema, null, 2));

// Ver algumas ocorrências
console.log('\n=== PRIMEIRAS 5 OCORRÊNCIAS ===');
for (const o of ocorrencias.slice(0, 5)) {
  console.log(`ID: ${o.id}, TemaId: ${o.temaId}, Descricao: ${o.descricao?.substring(0, 50)}...`);
}

await connection.end();
