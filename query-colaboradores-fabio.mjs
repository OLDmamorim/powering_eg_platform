import * as db from './server/db.js';

try {
  // Primeiro, encontrar o ID do Fábio Dias
  const gestores = await db.getAllGestores();
  const fabio = gestores.find(g => g.nome.toLowerCase().includes('fabio') || g.nome.toLowerCase().includes('fábio'));
  
  if (!fabio) {
    console.log('❌ Gestor Fábio Dias não encontrado');
    process.exit(1);
  }
  
  console.log(`✅ Gestor encontrado: ${fabio.nome} (ID: ${fabio.id})`);
  console.log('');
  
  // Obter todos os colaboradores
  const colaboradores = await db.getAllColaboradores();
  
  // Filtrar colaboradores do Fábio
  const colaboradoresFabio = colaboradores.filter(c => c.gestorId === fabio.id);
  
  console.log(`📊 Total de colaboradores: ${colaboradoresFabio.length}`);
  console.log('');
  
  if (colaboradoresFabio.length > 0) {
    console.log('📋 Lista de Colaboradores:');
    console.log('─'.repeat(80));
    
    // Agrupar por tipo
    const porTipo = {
      loja: colaboradoresFabio.filter(c => c.tipo === 'loja'),
      volante: colaboradoresFabio.filter(c => c.tipo === 'volante'),
      recalbra: colaboradoresFabio.filter(c => c.tipo === 'recalbra')
    };
    
    if (porTipo.loja.length > 0) {
      console.log('');
      console.log(`🏪 EM LOJAS (${porTipo.loja.length}):`);
      for (const c of porTipo.loja) {
        console.log(`   • ${c.nome} - ${c.lojaNome || 'Loja não especificada'}`);
      }
    }
    
    if (porTipo.volante.length > 0) {
      console.log('');
      console.log(`🚗 VOLANTES (${porTipo.volante.length}):`);
      for (const c of porTipo.volante) {
        console.log(`   • ${c.nome}`);
      }
    }
    
    if (porTipo.recalbra.length > 0) {
      console.log('');
      console.log(`🔧 RECALBRA (${porTipo.recalbra.length}):`);
      for (const c of porTipo.recalbra) {
        console.log(`   • ${c.nome}`);
      }
    }
    
    console.log('');
    console.log('─'.repeat(80));
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
