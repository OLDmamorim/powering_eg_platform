import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/powering_eg_platform/.env' });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [total] = await conn.execute('SELECT COUNT(*) as total FROM eurocodes_fichas');
console.log('Total eurocodes_fichas:', total[0].total);

const [sample] = await conn.execute('SELECT id, analiseId, lojaId, nomeLoja, obrano, matricula, eurocode, ref, marca, modelo, status, diasAberto FROM eurocodes_fichas ORDER BY id DESC LIMIT 10');
console.log('\nSample eurocodes_fichas:');
sample.forEach(r => console.log(`  Eurocode: ${r.eurocode} | Obra: ${r.obrano} | Matrícula: ${r.matricula} | Status: ${r.status} | Loja: ${r.nomeLoja}`));

const [analyses] = await conn.execute('SELECT id, lojaId, createdAt FROM analises_fichas_servico ORDER BY id DESC LIMIT 3');
console.log('\nLatest analyses:', analyses);

// Check distinct lojas
const [lojas] = await conn.execute('SELECT DISTINCT lojaId, nomeLoja FROM eurocodes_fichas WHERE lojaId IS NOT NULL ORDER BY nomeLoja');
console.log('\nLojas com eurocodes:', lojas.length);
lojas.forEach(l => console.log(`  ${l.lojaId}: ${l.nomeLoja}`));

await conn.end();
