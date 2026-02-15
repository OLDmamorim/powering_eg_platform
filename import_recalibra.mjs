import mysql from 'mysql2/promise';
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./recalibra_notion_data.json', 'utf-8'));

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const unidadeId = 30002; // Recalibra Minho
  
  // Extract unique localidades and marcas
  const localidades = [...new Set(data.map(d => d.localidade).filter(l => l && l !== 'Outro'))];
  const marcas = [...new Set(data.map(d => d.marca).filter(m => m && m.trim() !== ''))];
  
  console.log(`Localidades únicas: ${localidades.length}`, localidades);
  console.log(`Marcas únicas: ${marcas.length}`, marcas);
  
  // Insert localidades
  for (const loc of localidades) {
    try {
      await conn.query('INSERT IGNORE INTO localidades_recalibra (nome) VALUES (?)', [loc]);
    } catch (e) {
      console.log(`Localidade já existe: ${loc}`);
    }
  }
  console.log(`✅ ${localidades.length} localidades importadas`);
  
  // Insert marcas
  for (const marca of marcas) {
    try {
      await conn.query('INSERT IGNORE INTO marcas_recalibra (nome) VALUES (?)', [marca]);
    } catch (e) {
      console.log(`Marca já existe: ${marca}`);
    }
  }
  console.log(`✅ ${marcas.length} marcas importadas`);
  
  // Map localidade names to lojaIds based on loja names
  // Get all lojas for this gestor
  const [lojas] = await conn.query(
    'SELECT l.id, l.nome FROM gestor_lojas gl JOIN lojas l ON gl.lojaId = l.id WHERE gl.gestorId = 30001'
  );
  console.log('Lojas disponíveis:', lojas.map(l => `${l.id}: ${l.nome}`));
  
  // Use first loja as default for imported data (since Notion data doesn't have lojaId)
  const defaultLojaId = lojas[0]?.id || 60001;
  
  // Check existing calibragens to avoid duplicates
  const [existing] = await conn.query('SELECT matricula, data FROM calibragens WHERE unidadeId = ?', [unidadeId]);
  const existingSet = new Set(existing.map(e => `${e.matricula}-${e.data}`));
  
  let imported = 0;
  let skipped = 0;
  
  for (const item of data) {
    const matricula = item.matricula.toUpperCase();
    const key = `${matricula}-${item.data}`;
    
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }
    
    try {
      await conn.query(
        `INSERT INTO calibragens (unidadeId, lojaId, data, marca, matricula, tipologiaViatura, tipoCalibragem, localidade) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          unidadeId,
          defaultLojaId, // Default loja since Notion data doesn't specify
          item.data,
          item.marca || null,
          matricula,
          item.tipologiaViatura || 'LIGEIRO',
          item.tipoCalibragem,
          item.localidade || null,
        ]
      );
      imported++;
    } catch (e) {
      console.error(`Erro ao importar ${matricula}: ${e.message}`);
    }
  }
  
  console.log(`\n✅ Importação concluída!`);
  console.log(`   Importados: ${imported}`);
  console.log(`   Ignorados (duplicados): ${skipped}`);
  console.log(`   Total no ficheiro: ${data.length}`);
  
  // Verify
  const [count] = await conn.query('SELECT COUNT(*) as total FROM calibragens WHERE unidadeId = ?', [unidadeId]);
  console.log(`   Total na base de dados: ${count[0].total}`);
  
  const [locCount] = await conn.query('SELECT COUNT(*) as total FROM localidades_recalibra');
  console.log(`   Localidades na BD: ${locCount[0].total}`);
  
  const [marcaCount] = await conn.query('SELECT COUNT(*) as total FROM marcas_recalibra');
  console.log(`   Marcas na BD: ${marcaCount[0].total}`);
  
  await conn.end();
}

main().catch(console.error);
