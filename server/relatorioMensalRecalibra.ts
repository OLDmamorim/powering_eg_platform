import * as db from "./db";
import { sendEmail } from "./emailService";
import { gerarHTMLRelatorioMensalRecalibra, gerarHTMLRelatorioMensalRecalibraGestor } from "./emailService";

/**
 * Envia relatórios mensais de calibragens do Recalibra
 * - Para unidades: resumo individual de calibragens realizadas
 * - Para gestores: resumo consolidado de todas as unidades da zona
 * Executa automaticamente no dia 20 de cada mês
 */
export async function enviarRelatoriosMensaisRecalibra() {
  console.log('[Relatório Mensal Recalibra] Iniciando envio de relatórios...');
  
  try {
    // Calcular mês anterior (o relatório do dia 20 refere-se ao mês anterior)
    const hoje = new Date();
    const mesAnterior = hoje.getMonth(); // 0-11 (Janeiro = 0)
    const anoAnterior = mesAnterior === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    const mesRelatorio = mesAnterior === 0 ? 12 : mesAnterior;
    
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = mesesNomes[mesRelatorio - 1];
    
    // Calcular primeiro e último dia do mês anterior
    const primeiroDia = `${anoAnterior}-${String(mesRelatorio).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anoAnterior, mesRelatorio, 0).toISOString().split('T')[0];
    
    // Obter todas as unidades Recalibra ativas
    const unidades = await db.getAllUnidadesRecalibra();
    
    if (!unidades || unidades.length === 0) {
      console.log('[Relatório Mensal Recalibra] Nenhuma unidade encontrada');
      return;
    }
    
    let emailsEnviadosUnidades = 0;
    let emailsEnviadosGestores = 0;
    let erros = 0;
    
    // Mapa para agrupar calibragens por gestor
    const calibragensPorGestor = new Map<number, Array<{
      unidadeNome: string;
      unidadeId: number;
      totais: {
        dinamicas: number;
        estaticas: number;
        core: number;
        ligeiros: number;
        pesados: number;
        geral: number;
        diasAtivos: number;
      };
    }>>();
    
    // Para cada unidade, processar calibragens
    for (const unidade of unidades) {
      try {
        // Obter calibragens da unidade no mês anterior
        const calibragens = await db.getHistoricoCalibragens(
          unidade.id,
          primeiroDia,
          ultimoDia
        );
        
        if (!calibragens || calibragens.length === 0) {
          console.log(`[Relatório Mensal Recalibra] Unidade ${unidade.nome} não tem calibragens em ${mesRelatorio}/${anoAnterior}`);
          continue;
        }
        
        // Calcular totais
        const totalDinamicas = calibragens.filter(c => c.tipoCalibragem === 'DINÂMICA').length;
        const totalEstaticas = calibragens.filter(c => c.tipoCalibragem === 'ESTÁTICA').length;
        const totalCore = calibragens.filter(c => c.tipoCalibragem === 'CORE').length;
        const totalLigeiros = calibragens.filter(c => c.tipologiaViatura === 'LIGEIRO').length;
        const totalPesados = calibragens.filter(c => c.tipologiaViatura === 'PESADO').length;
        const totalGeral = calibragens.length;
        
        // Contar dias ativos (dias únicos com calibragens)
        const diasUnicos = new Set(calibragens.map(c => c.data));
        const diasAtivos = diasUnicos.size;
        
        // Gerar HTML do relatório
        const htmlRelatorio = gerarHTMLRelatorioMensalRecalibra({
          unidadeNome: unidade.nome,
          mes: mesRelatorio,
          ano: anoAnterior,
          calibragens: calibragens.map(c => ({
            data: c.data,
            marca: c.marca,
            matricula: c.matricula,
            tipologiaViatura: c.tipologiaViatura,
            tipoCalibragem: c.tipoCalibragem,
            localidade: c.localidade,
            lojaNome: c.loja?.nome,
          })),
          totalDinamicas,
          totalEstaticas,
          totalCore,
          totalLigeiros,
          totalPesados,
          totalGeral,
          diasAtivos,
        });
        
        // Enviar email para a unidade (se tiver email)
        if (unidade.email) {
          const enviado = await sendEmail({
            to: unidade.email,
            subject: `Relatório Mensal - Calibragens ${unidade.nome} - ${mesNome} ${anoAnterior}`,
            html: htmlRelatorio,
          });
          
          if (enviado) {
            console.log(`[Relatório Mensal Recalibra] Email enviado para unidade ${unidade.nome} (${unidade.email})`);
            emailsEnviadosUnidades++;
          } else {
            console.error(`[Relatório Mensal Recalibra] Erro ao enviar email para unidade ${unidade.nome}`);
            erros++;
          }
          
          // Aguardar 1 segundo entre emails
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Obter gestor da unidade para agrupar dados
        const gestor = await db.getGestorById(unidade.gestorId);
        if (gestor) {
          if (!calibragensPorGestor.has(gestor.id)) {
            calibragensPorGestor.set(gestor.id, []);
          }
          
          calibragensPorGestor.get(gestor.id)!.push({
            unidadeNome: unidade.nome,
            unidadeId: unidade.id,
            totais: {
              dinamicas: totalDinamicas,
              estaticas: totalEstaticas,
              core: totalCore,
              ligeiros: totalLigeiros,
              pesados: totalPesados,
              geral: totalGeral,
              diasAtivos,
            },
          });
        }
        
      } catch (error) {
        console.error(`[Relatório Mensal Recalibra] Erro ao processar unidade ${unidade.nome}:`, error);
        erros++;
      }
    }
    
    // Enviar relatórios consolidados para gestores
    for (const [gestorId, dadosUnidades] of calibragensPorGestor.entries()) {
      try {
        const gestor = await db.getGestorById(gestorId);
        if (!gestor || !gestor.user?.email) {
          console.log(`[Relatório Mensal Recalibra] Gestor ${gestorId} não encontrado ou sem email`);
          continue;
        }
        
        // Gerar HTML do relatório consolidado para gestor
        const htmlGestor = gerarHTMLRelatorioMensalRecalibraGestor({
          gestorNome: gestor.user.name || 'Gestor',
          mes: mesRelatorio,
          ano: anoAnterior,
          unidades: dadosUnidades,
        });
        
        const enviado = await sendEmail({
          to: gestor.user.email,
          subject: `Relatório Mensal Consolidado - Calibragens Recalibra - ${mesNome} ${anoAnterior}`,
          html: htmlGestor,
        });
        
        if (enviado) {
          console.log(`[Relatório Mensal Recalibra] Email consolidado enviado para gestor ${gestor.user.name} (${gestor.user.email})`);
          emailsEnviadosGestores++;
        } else {
          console.error(`[Relatório Mensal Recalibra] Erro ao enviar email para gestor ${gestor.user.name}`);
          erros++;
        }
        
        // Aguardar 1 segundo entre emails
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Relatório Mensal Recalibra] Erro ao processar gestor ${gestorId}:`, error);
        erros++;
      }
    }
    
    console.log(`[Relatório Mensal Recalibra] Processo concluído:`);
    console.log(`  - Emails para unidades: ${emailsEnviadosUnidades}`);
    console.log(`  - Emails para gestores: ${emailsEnviadosGestores}`);
    console.log(`  - Erros: ${erros}`);
    
  } catch (error) {
    console.error('[Relatório Mensal Recalibra] Erro geral:', error);
  }
}
