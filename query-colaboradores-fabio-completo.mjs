import * as db from './server/db.js';

try {
  // Encontrar o Fábio Dias
  const gestores = await db.getAllGestores();
  const fabio = gestores.find(g => g.nome.toLowerCase().includes('fabio') || g.nome.toLowerCase().includes('fábio'));
  
  if (!fabio) {
    console.log('❌ Gestor Fábio Dias não encontrado');
    process.exit(1);
  }
  
  console.log(`✅ Gestor: ${fabio.nome} (ID: ${fabio.id})`);
  console.log('');
  
  // Obter TODAS as lojas da zona do Fábio
  const lojasGestor = await db.getLojasByGestorId(fabio.id);
  console.log(`🏪 Lojas na zona: ${lojasGestor.length}`);
  
  // Obter todos os colaboradores
  const todosColaboradores = await db.getAllColaboradores();
  
  // Filtrar colaboradores:
  // 1. Volantes/Recalbra diretamente associados ao gestor
  const colaboradoresDiretos = todosColaboradores.filter(c => c.gestorId === fabio.id);
  
  // 2. Colaboradores de lojas da zona do gestor
  const idsLojasGestor = lojasGestor.map(l => l.id);
  const colaboradoresLojas = todosColaboradores.filter(c => 
    c.tipo === 'loja' && c.lojaId && idsLojasGestor.includes(c.lojaId)
  );
  
  const totalColaboradores = colaboradoresDiretos.length + colaboradoresLojas.length;
  
  console.log('');
  console.log('📊 RESUMO:');
  console.log(`   • Colaboradores diretos (Volantes/Recalbra): ${colaboradoresDiretos.length}`);
  console.log(`   • Colaboradores em lojas da zona: ${colaboradoresLojas.length}`);
  console.log(`   • TOTAL: ${totalColaboradores}`);
  console.log('');
  
  if (colaboradoresDiretos.length > 0) {
    console.log('🚗 VOLANTES/RECALBRA:');
    for (const c of colaboradoresDiretos) {
      console.log(`   • ${c.nome} (${c.tipo})`);
    }
    console.log('');
  }
  
  if (colaboradoresLojas.length > 0) {
    console.log('🏪 COLABORADORES EM LOJAS:');
    
    // Agrupar por loja
    const porLoja = {};
    for (const c of colaboradoresLojas) {
      if (!porLoja[c.lojaNome]) {
        porLoja[c.lojaNome] = [];
      }
      porLoja[c.lojaNome].push(c);
    }
    
    for (const [lojaNome, colaboradores] of Object.entries(porLoja)) {
      console.log(`   ${lojaNome} (${colaboradores.length}):`);
      for (const c of colaboradores) {
        console.log(`      • ${c.nome}`);
      }
    }
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error(error.stack);
  process.exit(1);
}
