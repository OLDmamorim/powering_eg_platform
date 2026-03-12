import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all analyses without batchId, ordered by createdAt
  const [rows] = await conn.query(`
    SELECT id, gestorId, createdAt 
    FROM analises_stock 
    WHERE batchId IS NULL 
    ORDER BY createdAt ASC
  `);
  
  console.log(`Found ${rows.length} analyses without batchId`);
  
  if (rows.length === 0) {
    await conn.end();
    return;
  }
  
  // Group analyses into batches: if gap between consecutive analyses is > 5 minutes, start new batch
  const GAP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const batches = [];
  let currentBatch = [rows[0]];
  
  for (let i = 1; i < rows.length; i++) {
    const prevTime = new Date(rows[i - 1].createdAt).getTime();
    const currTime = new Date(rows[i].createdAt).getTime();
    
    if (currTime - prevTime > GAP_THRESHOLD_MS) {
      batches.push(currentBatch);
      currentBatch = [rows[i]];
    } else {
      currentBatch.push(rows[i]);
    }
  }
  batches.push(currentBatch);
  
  console.log(`Identified ${batches.length} batches`);
  
  // Assign batchId to each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const firstTime = new Date(batch[0].createdAt).getTime();
    const batchId = `legacy_batch_${firstTime}_${Math.random().toString(36).slice(2, 6)}`;
    const ids = batch.map(r => r.id);
    
    console.log(`Batch ${i + 1}: ${ids.length} analyses, batchId=${batchId}, time=${batch[0].createdAt}`);
    
    // Update in chunks of 100
    for (let j = 0; j < ids.length; j += 100) {
      const chunk = ids.slice(j, j + 100);
      await conn.query(
        `UPDATE analises_stock SET batchId = ? WHERE id IN (${chunk.map(() => '?').join(',')})`,
        [batchId, ...chunk]
      );
    }
  }
  
  console.log('Done! All legacy analyses now have batchIds.');
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
