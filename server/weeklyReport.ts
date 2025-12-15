import { notifyOwner } from "./_core/notification";
import * as db from "./db";

/**
 * Gera e envia um resumo semanal ao owner do projeto
 * Inclui estatísticas de visitas, pendentes e alertas de pontos negativos
 */
export async function enviarResumoSemanal(): Promise<boolean> {
  try {
    // Buscar dados da última semana
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

    // Buscar todos os dados
    const lojas = await db.getAllLojas();
    const gestores = await db.getAllGestores();
    const relatoriosLivres = await db.getAllRelatoriosLivres();
    const relatoriosCompletos = await db.getAllRelatoriosCompletos();
    const pendentes = await db.getAllPendentes();

    // Buscar alertas de pontos negativos consecutivos
    const lojasComAlertas = await db.getLojasComAlertasNegativos(3);

    // Filtrar relatórios da última semana
    const relLivresSemana = relatoriosLivres.filter((r: any) => 
      new Date(r.dataVisita) >= umaSemanaAtras
    );
    const relCompletosSemana = relatoriosCompletos.filter((r: any) => 
      new Date(r.dataVisita) >= umaSemanaAtras
    );

    // Pendentes não resolvidos
    const pendentesAtivos = pendentes.filter((p: any) => !p.resolvido);
    
    // Pendentes antigos (mais de 7 dias)
    const pendentesAntigos = pendentesAtivos.filter((p: any) => {
      const dataCriacao = new Date(p.createdAt);
      return dataCriacao < umaSemanaAtras;
    });

    // Novos pendentes esta semana
    const novosPendentes = pendentes.filter((p: any) => 
      new Date(p.createdAt) >= umaSemanaAtras
    );

    // Pendentes resolvidos esta semana
    const pendentesResolvidos = pendentes.filter((p: any) => 
      p.resolvido && p.dataResolucao && new Date(p.dataResolucao) >= umaSemanaAtras
    );

    // Construir conteúdo do resumo
    const title = `📊 Resumo Semanal PoweringEG - ${new Date().toLocaleDateString('pt-PT')}`;
    
    let content = `**Resumo da Semana** (${umaSemanaAtras.toLocaleDateString('pt-PT')} - ${new Date().toLocaleDateString('pt-PT')})\n\n`;
    
    content += `📈 **Estatísticas Gerais**\n`;
    content += `• Total de Lojas: ${lojas.length}\n`;
    content += `• Total de Gestores: ${gestores.length}\n\n`;
    
    content += `📝 **Visitas esta Semana**\n`;
    content += `• Relatórios Livres: ${relLivresSemana.length}\n`;
    content += `• Relatórios Completos: ${relCompletosSemana.length}\n`;
    content += `• Total de Visitas: ${relLivresSemana.length + relCompletosSemana.length}\n\n`;
    
    content += `📋 **Pendentes**\n`;
    content += `• Pendentes Ativos: ${pendentesAtivos.length}\n`;
    content += `• Novos esta Semana: ${novosPendentes.length}\n`;
    content += `• Resolvidos esta Semana: ${pendentesResolvidos.length}\n`;
    
    if (pendentesAntigos.length > 0) {
      content += `\n⚠️ **ALERTA: ${pendentesAntigos.length} pendente(s) há mais de 7 dias!**\n`;
      pendentesAntigos.slice(0, 5).forEach((p: any) => {
        const dias = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        content += `• ${p.descricao?.substring(0, 50)}... (${dias} dias)\n`;
      });
      if (pendentesAntigos.length > 5) {
        content += `• ... e mais ${pendentesAntigos.length - 5} pendente(s)\n`;
      }
    }

    // Alertas de pontos negativos consecutivos
    if (lojasComAlertas.length > 0) {
      content += `\n🚨 **ALERTA CRÍTICO: ${lojasComAlertas.length} loja(s) com pontos negativos consecutivos!**\n`;
      content += `As seguintes lojas têm 3 ou mais relatórios consecutivos com pontos negativos:\n\n`;
      
      lojasComAlertas.forEach((alerta) => {
        content += `**${alerta.lojaNome}**\n`;
        alerta.ultimosNegativos.slice(0, 3).forEach((neg, idx) => {
          content += `  ${idx + 1}. ${neg.substring(0, 100)}${neg.length > 100 ? '...' : ''}\n`;
        });
        content += `\n`;
      });
      
      content += `⚠️ Recomenda-se ação imediata para investigar e resolver os problemas identificados.\n`;
    }

    content += `\n---\nRelatório gerado automaticamente pelo PoweringEG Platform`;

    // Enviar notificação
    const enviado = await notifyOwner({ title, content });
    
    if (enviado) {
      console.log('[WeeklyReport] Resumo semanal enviado com sucesso');
    } else {
      console.warn('[WeeklyReport] Falha ao enviar resumo semanal');
    }

    return enviado;
  } catch (error) {
    console.error('[WeeklyReport] Erro ao gerar resumo semanal:', error);
    return false;
  }
}

/**
 * Verifica alertas de pontos negativos e notifica o owner se necessário
 * Pode ser chamado após cada relatório completo ser submetido
 */
export async function verificarENotificarAlertas(lojaId: number, lojaNome: string): Promise<boolean> {
  try {
    const temAlerta = await db.checkAlertasPontosNegativos(lojaId, 3);
    
    if (temAlerta) {
      const historico = await db.getHistoricoPontosByLojaId(lojaId);
      const ultimosNegativos = historico
        .slice(0, 3)
        .map(h => h.pontosNegativos)
        .filter((n): n is string => n !== null && n.trim().length > 0);
      
      const title = `🚨 Alerta: ${lojaNome} com pontos negativos consecutivos`;
      let content = `A loja **${lojaNome}** tem 3 relatórios consecutivos com pontos negativos.\n\n`;
      content += `**Últimos pontos negativos registados:**\n`;
      ultimosNegativos.forEach((neg, idx) => {
        content += `${idx + 1}. ${neg}\n`;
      });
      content += `\n⚠️ Recomenda-se investigação imediata.`;
      
      const enviado = await notifyOwner({ title, content });
      
      if (enviado) {
        console.log(`[Alertas] Notificação de alerta enviada para loja ${lojaNome}`);
      }
      
      return enviado;
    }
    
    return false;
  } catch (error) {
    console.error('[Alertas] Erro ao verificar alertas:', error);
    return false;
  }
}
