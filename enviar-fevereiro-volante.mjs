#!/usr/bin/env node
/**
 * Script para enviar manualmente relatórios do Volante de Fevereiro/2026
 */

import * as db from './server/db.js';
import { sendEmail } from './server/emailService.js';
import { gerarHTMLRelatorioMensalVolante, gerarHTMLRelatorioMensalVolanteGestor } from './server/emailService.js';

console.log('='.repeat(80));
console.log('ENVIO MANUAL: Relatórios Volante - Fevereiro 2026');
console.log('='.repeat(80));
console.log('');

try {
  // Forçar mês de Fevereiro/2026
  const mesRelatorio = 2; // Fevereiro
  const anoRelatorio = 2026;
  const mesNome = 'Fevereiro';
  
  console.log(`📅 Período: ${mesNome} ${anoRelatorio}`);
  console.log('');
  
  // Obter todos os volantes ativos
  const volantes = await db.getAllVolantes();
  
  if (!volantes || volantes.length === 0) {
    console.log('❌ Nenhum volante encontrado');
    process.exit(1);
  }
  
  console.log(`✅ Encontrados ${volantes.length} volantes`);
  console.log('');
  
  let emailsEnviadosLojas = 0;
  let emailsEnviadosGestores = 0;
  let erros = 0;
  
  // Mapa para agrupar serviços por gestor
  const servicosPorGestor = new Map();
  
  // Processar cada volante
  for (const volante of volantes) {
    console.log(`📊 Processando: ${volante.nome}`);
    
    // Obter lojas associadas
    const lojas = await db.getLojasByVolanteId(volante.id);
    
    if (!lojas || lojas.length === 0) {
      console.log(`   ⚠️  Sem lojas associadas`);
      continue;
    }
    
    console.log(`   → ${lojas.length} lojas associadas`);
    
    // Processar cada loja
    for (const loja of lojas) {
      // Obter serviços do mês
      const servicos = await db.getServicosByLojaAndMonth(loja.id, mesRelatorio, anoRelatorio);
      
      if (!servicos || servicos.length === 0) {
        console.log(`   → Loja ${loja.nome}: sem serviços em ${mesNome}/${anoRelatorio}`);
        continue;
      }
      
      console.log(`   → Loja ${loja.nome}: ${servicos.length} serviços`);
      
      // Calcular totais
      const totais = {
        substituicaoLigeiro: servicos.filter(s => s.tipoServico === 'Substituição Ligeiro').length,
        reparacao: servicos.filter(s => s.tipoServico === 'Reparação').length,
        calibragem: servicos.filter(s => s.tipoServico === 'Calibragem').length,
        outros: servicos.filter(s => !['Substituição Ligeiro', 'Reparação', 'Calibragem'].includes(s.tipoServico)).length,
        geral: servicos.length,
        diasAtivos: new Set(servicos.map(s => new Date(s.dataServico).toDateString())).size,
      };
      
      // Enviar email para a loja (se tiver email configurado)
      if (loja.email) {
        const htmlLoja = gerarHTMLRelatorioMensalVolante({
          lojaNome: loja.nome,
          volanteNome: volante.nome,
          mes: mesRelatorio,
          ano: anoRelatorio,
          servicos: servicos,
          totais: totais,
        });
        
        const enviado = await sendEmail({
          to: loja.email,
          subject: `Relatório Mensal - Volante ${volante.nome} - ${mesNome} ${anoRelatorio}`,
          html: htmlLoja,
        });
        
        if (enviado) {
          console.log(`   ✅ Email enviado para loja: ${loja.email}`);
          emailsEnviadosLojas++;
        } else {
          console.log(`   ❌ Erro ao enviar email para loja: ${loja.email}`);
          erros++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Agrupar para relatório do gestor
      if (volante.gestorId) {
        if (!servicosPorGestor.has(volante.gestorId)) {
          servicosPorGestor.set(volante.gestorId, []);
        }
        
        servicosPorGestor.get(volante.gestorId).push({
          lojaNome: loja.nome,
          lojaId: loja.id,
          volanteNome: volante.nome,
          servicos: servicos,
          totais: totais,
        });
      }
    }
  }
  
  console.log('');
  console.log('📧 Enviando relatórios consolidados para gestores...');
  console.log('');
  
  // Enviar relatórios consolidados para gestores
  for (const [gestorId, dadosLojas] of servicosPorGestor.entries()) {
    const gestor = await db.getGestorById(gestorId);
    
    if (!gestor || !gestor.email) {
      console.log(`⚠️  Gestor ${gestorId}: sem email configurado`);
      continue;
    }
    
    console.log(`👤 Gestor: ${gestor.nome} (${gestor.email})`);
    console.log(`   → ${dadosLojas.length} lojas no relatório`);
    
    const htmlGestor = gerarHTMLRelatorioMensalVolanteGestor({
      gestorNome: gestor.nome,
      mes: mesRelatorio,
      ano: anoRelatorio,
      lojas: dadosLojas,
    });
    
    const enviado = await sendEmail({
      to: gestor.email,
      subject: `Relatório Mensal Consolidado - Volante - ${mesNome} ${anoRelatorio}`,
      html: htmlGestor,
    });
    
    if (enviado) {
      console.log(`   ✅ Email consolidado enviado`);
      emailsEnviadosGestores++;
    } else {
      console.log(`   ❌ Erro ao enviar email consolidado`);
      erros++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('RESUMO DO ENVIO');
  console.log('='.repeat(80));
  console.log(`📧 Emails para lojas: ${emailsEnviadosLojas}`);
  console.log(`📧 Emails para gestores: ${emailsEnviadosGestores}`);
  console.log(`❌ Erros: ${erros}`);
  console.log('='.repeat(80));
  
  // Registar no histórico
  await db.registarEnvioRelatorio({
    tipo: 'volante',
    anoReferencia: anoRelatorio,
    mesReferencia: mesRelatorio,
    emailsEnviados: emailsEnviadosLojas + emailsEnviadosGestores,
    erros: erros,
  });
  
  console.log('✅ Histórico registado na BD');
  
  process.exit(0);
  
} catch (error) {
  console.error('');
  console.error('❌ ERRO FATAL:', error.message);
  console.error(error.stack);
  process.exit(1);
}
