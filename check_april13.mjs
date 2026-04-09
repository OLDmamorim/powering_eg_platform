import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check pedidos de apoio around April 12-14
console.log('=== PEDIDOS DE APOIO (12-14 Abril) ===');
const [pedidos] = await conn.execute(`
  SELECT pa.id, pa.data, pa.periodo, pa.estado, pa.tipoApoio, pa.volanteId, 
         l.nome as loja, v.nome as volante
  FROM pedidos_apoio pa
  LEFT JOIN lojas l ON pa.lojaId = l.id
  LEFT JOIN volantes v ON pa.volanteId = v.id
  WHERE pa.data BETWEEN '2026-04-11' AND '2026-04-15'
  ORDER BY pa.data
`);
pedidos.forEach(p => console.log(`  ID:${p.id} | ${p.data} | ${p.periodo} | ${p.estado} | ${p.loja} | Volante: ${p.volante}`));

// Check agendamentos around April 12-14
console.log('\n=== AGENDAMENTOS VOLANTE (12-14 Abril) ===');
const [agendamentos] = await conn.execute(`
  SELECT av.id, av.data, av.agendamento_volante_periodo as periodo, av.volanteId,
         l.nome as loja, v.nome as volante, av.titulo
  FROM agendamentos_volante av
  LEFT JOIN lojas l ON av.lojaId = l.id
  LEFT JOIN volantes v ON av.volanteId = v.id
  WHERE av.data BETWEEN '2026-04-11' AND '2026-04-15'
  ORDER BY av.data
`);
agendamentos.forEach(a => console.log(`  ID:${a.id} | ${a.data} | ${a.periodo} | ${a.loja || a.titulo} | Volante: ${a.volante}`));

// Check bloqueios around April 12-14
console.log('\n=== BLOQUEIOS VOLANTE (12-14 Abril) ===');
const [bloqueios] = await conn.execute(`
  SELECT bv.id, bv.data, bv.periodo, bv.tipo, bv.motivo, bv.volanteId,
         v.nome as volante
  FROM bloqueios_volante bv
  LEFT JOIN volantes v ON bv.volanteId = v.id
  WHERE bv.data BETWEEN '2026-04-11' AND '2026-04-15'
  ORDER BY bv.data
`);
bloqueios.forEach(b => console.log(`  ID:${b.id} | ${b.data} | ${b.periodo} | ${b.tipo} | ${b.motivo} | Volante: ${b.volante}`));

await conn.end();
